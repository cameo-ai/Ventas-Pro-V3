/* inicio.js — Pone el botón "Ventas" centrado en Inicio, debajo del Catálogo */
(function () {
  function mover() {
    var slot = document.getElementById('ventas-home-slot');
    var b = document.getElementById('btn-ventas-rapidas');
    if (!slot || !b) return false;
    if (b.parentNode !== slot) slot.appendChild(b);
    b.style.position = 'static';
    b.style.bottom = '';
    b.style.right = '';
    b.style.padding = '16px 44px';
    b.style.fontSize = '20px';
    return true;
  }
  if (!mover()) {
    var n = 0, t = setInterval(function () { if (mover() || ++n > 40) clearInterval(t); }, 250);
  }
})();
