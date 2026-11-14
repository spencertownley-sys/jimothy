// Loads the cookie notice only when the game is the top-level page. Inside the spencertownley.com
// TV iframe the portfolio already shows its own notice. A separate file because the page CSP
// does not allow inline scripts.
(function () {
  if (window.self !== window.top) return;
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'cookie-banner.css';
  document.head.appendChild(css);
  var js = document.createElement('script');
  js.src = 'cookie-banner.js';
  js.defer = true;
  js.setAttribute('data-cookie-banner', '');
  js.setAttribute('data-mode', 'notice');
  js.setAttribute('data-storage-key', 'jimothy-cookie-consent');
  js.setAttribute('data-policy-url', 'cookies/');
  document.head.appendChild(js);
})();
