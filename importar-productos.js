/**
 * Importador masivo para Ventas Pro V3
 * ======================================
 * Lee el CSV exportado de WooCommerce (Productos -> Exportar) y, por cada
 * producto/variación, sube su foto (buscándola en la carpeta de imágenes
 * que sacaste del .zip de "Export Media as ZIP") y crea el producto en
 * Ventas Pro V3 -- todo automático, sin tocar nada a mano.
 *
 * REQUISITOS:
 *   - Node.js 18 o superior (usa fetch/FormData nativos).
 *   - Instalar una sola vez: npm install csv-parse
 *
 * CÓMO USARLO (PowerShell en Windows):
 *   $env:APP_URL="http://IP-DE-TU-ORANGEPI:PUERTO"
 *   node importar-productos.js "ruta/al/csv.csv" "ruta/a/la/carpeta/de/imagenes"
 *
 * Ejemplo real:
 *   $env:APP_URL="http://192.168.0.99:3000"
 *   node importar-productos.js wc-product-export.csv ./imagenes-extraidas
 *
 * Este servidor de Ventas Pro V3 no exige login para crear productos ni
 * subir imágenes (se comprobó con una prueba directa: /api/productos
 * respondió 200 OK sin ninguna cookie de sesión), así que el script ya
 * no pide ni usa correo/clave.
 *
 * QUÉ HACE CON CADA FILA DEL CSV:
 *   - Ignora las filas "variable" (son solo el encabezado del producto
 *     variable en WooCommerce, no un producto comprable en sí).
 *   - Importa las filas "simple" y "variation" como productos individuales
 *     (cada tamaño/variación queda como su propio producto, tal como ya
 *     vienen armados en el CSV).
 *   - Si una variación no trae categoría o marca propia (es normal en
 *     WooCommerce), las hereda del producto variable "padre".
 *   - Busca la imagen de cada producto por su nombre de archivo dentro de
 *     la carpeta que le indiques (y sus subcarpetas), la sube a
 *     /api/upload, y guarda la URL que te devuelve el servidor.
 *   - Si no encuentra la imagen, crea igual el producto pero sin foto y
 *     te avisa al final en el resumen para que la subas tú después.
 *
 * Puedes correr el script varias veces mientras vas sumando más marcas al
 * CSV -- pero ojo: no revisa duplicados, así que si corres el mismo CSV
 * dos veces, crea los productos dos veces.
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const APP_URL = process.env.APP_URL;

const [, , csvPathArg, imagenesDirArg] = process.argv;

if (!APP_URL) {
  console.error('\nFalta la variable de entorno APP_URL. Usa:\n');
  console.error('  $env:APP_URL="http://IP:PUERTO"\n  node importar-productos.js csv.csv ./imagenes\n');
  process.exit(1);
}
if (!csvPathArg || !imagenesDirArg) {
  console.error('\nUso: node importar-productos.js "ruta/al/csv.csv" "ruta/a/la/carpeta/de/imagenes"\n');
  process.exit(1);
}

const csvPath = path.resolve(csvPathArg);
const imagenesDir = path.resolve(imagenesDirArg);

if (!fs.existsSync(csvPath)) { console.error('No encuentro el CSV:', csvPath); process.exit(1); }
if (!fs.existsSync(imagenesDir)) { console.error('No encuentro la carpeta de imágenes:', imagenesDir); process.exit(1); }

// ==================== Índice de archivos de imagen ====================
// Recorre la carpeta (y subcarpetas) una sola vez y arma un mapa
// "nombre-de-archivo-en-minúscula" -> "ruta completa en disco".
function indexarImagenes(dir, mapa = new Map()) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const rutaCompleta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      indexarImagenes(rutaCompleta, mapa);
    } else {
      mapa.set(entrada.name.toLowerCase(), rutaCompleta);
    }
  }
  return mapa;
}

function nombreArchivoDesdeUrl(url) {
  if (!url) return null;
  try {
    const limpio = url.split('?')[0];
    return decodeURIComponent(limpio.substring(limpio.lastIndexOf('/') + 1));
  } catch {
    return null;
  }
}

// ==================== Login ====================
// Este servidor no exige login para crear productos ni subir imágenes,
// así que simplemente seguimos sin cookie de sesión.
async function login() {
  return '';
}

// ==================== Subir una imagen ====================
async function subirImagen(cookie, rutaArchivo) {
  const buffer = fs.readFileSync(rutaArchivo);
  const nombre = path.basename(rutaArchivo);
  const form = new FormData();
  const tipo = extToMime(path.extname(nombre));
  form.append('imagen', new Blob([buffer], { type: tipo }), nombre);

  const resp = await fetch(APP_URL + '/api/upload', {
    method: 'POST',
    headers: cookie ? { Cookie: cookie } : {},
    body: form,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || ('HTTP ' + resp.status));
  return data.url; // ej: /uploads/xxxxx.webp
}

function extToMime(ext) {
  return { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }[ext.toLowerCase()] || 'application/octet-stream';
}

// ==================== Crear un producto ====================
async function crearProducto(cookie, producto) {
  const resp = await fetch(APP_URL + '/api/productos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(producto),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || ('HTTP ' + resp.status));
  return data;
}

function limpiarDescripcion(texto) {
  if (!texto) return '';
  return texto.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ==================== Programa principal ====================
async function main() {
  console.log('Leyendo CSV...');
  const registros = parse(fs.readFileSync(csvPath), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  // Datos de los productos "variable" (el encabezado del producto con
  // variaciones), para que las variaciones hereden categoría y marca.
  const infoPadres = new Map();
  for (const fila of registros) {
    if (fila['Tipo'] === 'variable') {
      infoPadres.set(fila['SKU'], { categoria: fila['Categorías'] || '', marca: fila['Marcas'] || '' });
    }
  }

  const importables = registros.filter(f => f['Tipo'] === 'simple' || f['Tipo'] === 'variation');
  console.log(`Encontrados ${importables.length} productos para importar (de ${registros.length} filas totales).`);

  console.log('Indexando imágenes en', imagenesDir, '...');
  const indiceImagenes = indexarImagenes(imagenesDir);
  console.log(`Se encontraron ${indiceImagenes.size} archivos de imagen.`);

  console.log('Conectando con', APP_URL, '...');
  const cookie = await login();
  console.log('Listo, no se requiere login en este servidor.\n');

  let creados = 0;
  let sinImagen = [];
  let errores = [];

  for (const fila of importables) {
    const nombre = (fila['Nombre'] || '').trim();
    if (!nombre) continue;

    const padre = infoPadres.get(fila['Principal']) || {};
    const categoria = fila['Categorías'] || padre.categoria || '';
    const marca = fila['Marcas'] || padre.marca || '';
    const precio = parseFloat(fila['Precio rebajado'] || fila['Precio normal'] || '0') || 0;
    const stock = parseInt(fila['Inventario'] || '0', 10) || 0;
    const sku = fila['SKU'] || '';
    const variante = fila['Valor(es) del atributo 1'] || '';
    const urlImagenPrincipal = (fila['Imágenes'] || '').split(',')[0].trim();

    let imagenFinal = '';
    const archivoNombre = nombreArchivoDesdeUrl(urlImagenPrincipal);
    if (archivoNombre) {
      const rutaLocal = indiceImagenes.get(archivoNombre.toLowerCase());
      if (rutaLocal) {
        try {
          imagenFinal = await subirImagen(cookie, rutaLocal);
        } catch (e) {
          errores.push(`${nombre}: error subiendo imagen (${e.message})`);
        }
      } else {
        sinImagen.push(`${nombre} (buscaba: ${archivoNombre})`);
      }
    } else {
      sinImagen.push(`${nombre} (el CSV no trae imagen)`);
    }

    try {
      await crearProducto(cookie, {
        nombre,
        descripcion: limpiarDescripcion(fila['Descripción corta'] || fila['Descripción'] || ''),
        precio,
        sku,
        codigo: sku,
        categoria,
        marca,
        stock,
        tipo: fila['Tipo'],
        variante,
        imagen: imagenFinal,
      });
      creados++;
      process.stdout.write(`  ✓ ${nombre}${imagenFinal ? '' : ' (sin foto)'}\n`);
    } catch (e) {
      errores.push(`${nombre}: error creando el producto (${e.message})`);
    }
  }

  console.log('\n==================== RESUMEN ====================');
  console.log(`Productos creados: ${creados}`);
  if (sinImagen.length) {
    console.log(`\nSe crearon sin foto (no se encontró el archivo) - ${sinImagen.length}:`);
    sinImagen.forEach(x => console.log('  - ' + x));
  }
  if (errores.length) {
    console.log(`\nErrores - ${errores.length}:`);
    errores.forEach(x => console.log('  - ' + x));
  }
  console.log('===================================================\n');
}

main().catch(e => { console.error('\nError fatal:', e.message); process.exit(1); });
