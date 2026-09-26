/*
  Mobile menu for the shared header on inner pages. The homepage has the same
  behaviour in its own inline script, so it does not load this file.
*/
(function () {
  var nav = document.getElementById('nav');
  var btn = document.getElementById('menu-btn');
  var links = document.getElementById('nav-links');
  if (!nav || !btn || !links) return;
  var es = document.documentElement.lang === 'es';
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? (es ? 'Cerrar menú' : 'Close menu') : (es ? 'Abrir menú' : 'Open menu'));
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();
