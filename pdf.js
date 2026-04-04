const PDFDocument = require('pdfkit');

module.exports = function generarPDF(pedido, clientes) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers = [];
    doc.on('data', d => buffers.push(d));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const clienteObj = clientes.find(c => c.nombre === pedido.cliente) || {};
    const items = pedido.items || [];
    const subtotal = items.reduce((s, it) => s + (it.precio||0)*(it.cantidad||1), 0);
    const descuento = pedido.descuento || 0;
    const base = subtotal - descuento;
    const iva = pedido.iva ? Math.round(base * 0.19) : 0;
    const total = base + iva;
    const fmt = n => '$ ' + new Intl.NumberFormat('es-CL').format(Math.round(n));
    const fecha = pedido.fecha ? pedido.fecha.split('-').reverse().join('/') : '';
    const W = 515;

    // Header
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a3a5c').text('Pro Ventas Magic', 40, 40);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Sistema de Gestión de Ventas', 40, 62);

    // Barra naranja
    doc.rect(40, 80, W, 6).fill('#f97316');

    // Info pedido y cliente
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#f97316').text('PEDIDO', 40, 100);
    doc.rect(40, 108, 1, 60).fill('#f97316');
    doc.fontSize(9).font('Helvetica').fillColor('#333');
    doc.text('Número: ' + pedido.numero, 48, 112);
    doc.text('Fecha: ' + fecha, 48, 126);
    doc.text('Estado: ' + (pedido.estado||'Pendiente'), 48, 140);
    if (pedido.pago) doc.text('Pago: ' + pedido.pago, 48, 154);

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#f97316').text('CLIENTE', 300, 100);
    doc.rect(300, 108, 1, 60).fill('#f97316');
    doc.fontSize(9).font('Helvetica').fillColor('#333');
    doc.text('Nombre: ' + (pedido.cliente||'—'), 308, 112);
    if (clienteObj.telefono) doc.text('Teléfono: ' + clienteObj.telefono, 308, 126);
    if (clienteObj.documento) doc.text('ID: ' + clienteObj.documento, 308, 140);
    if (clienteObj.direccion) doc.text('Dirección: ' + clienteObj.direccion, 308, 154, { width: 240 });

    // Tabla productos
    let y = 185;
    doc.rect(40, y, W, 20).fill('#1a3a5c');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
    doc.text('Nombre', 48, y+6);
    doc.text('Cant.', 340, y+6);
    doc.text('Valor Unit.', 390, y+6);
    doc.text('Total', 460, y+6);
    y += 20;

    items.forEach((it, i) => {
      const h = 24;
      if (i % 2 === 0) doc.rect(40, y, W, h).fill('#f8f9fa');
      doc.fontSize(9).font('Helvetica').fillColor('#222');
      doc.text(it.nombre, 48, y+7, { width: 280 });
      doc.text((it.cantidad||1)+' un', 340, y+7);
      doc.text(fmt(it.precio||0), 385, y+7);
      doc.text(fmt((it.precio||0)*(it.cantidad||1)), 455, y+7);
      y += h;
    });

    // Totales
    y += 10;
    doc.rect(40, y, W, 1).fill('#ddd');
    y += 10;
    const tx = 380;
    doc.fontSize(9).font('Helvetica').fillColor('#333');
    doc.text('Subtotal:', tx, y).text(fmt(subtotal), tx+80, y, { align: 'right', width: 75 }); y+=16;
    if (descuento) { doc.text('Descuento:', tx, y).text('- '+fmt(descuento), tx+80, y, { align: 'right', width: 75 }); y+=16; }
    if (iva) { doc.text('IVA (19%):', tx, y).text(fmt(iva), tx+80, y, { align: 'right', width: 75 }); y+=16; }
    doc.rect(tx, y, 155, 1).fill('#1a3a5c'); y+=4;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a5c');
    doc.text('Total:', tx, y).text(fmt(total), tx+80, y, { align: 'right', width: 75 });

    if (pedido.observacion) {
      y += 30;
      doc.rect(40, y, W, 1).fill('#ddd'); y+=8;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#333').text('Observación:', 40, y);
      doc.font('Helvetica').text(pedido.observacion, 40, y+14, { width: W });
    }

    doc.end();
  });
};
