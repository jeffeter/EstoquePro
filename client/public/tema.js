(function () {
  try {
    let t = localStorage.getItem('tema');
    if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
    document.documentElement.dataset.tema = t;
  } catch (e) {
  }
})();
