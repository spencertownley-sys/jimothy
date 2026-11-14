/*!
 * cookie-banner.js  v1.0
 * Small bottom-of-page cookie notice / consent banner. No dependencies, no network calls.
 *
 * Two modes, chosen with data-mode on the script tag:
 *   notice   The site only uses strictly necessary cookies/storage. Shows a short notice
 *            with an OK button and a link to the cookie policy. Nothing is blocked.
 *   consent  The site has optional cookies, trackers or third-party embeds. Nothing optional
 *            loads until the visitor chooses. "Accept all" and "Reject optional" have equal
 *            weight, categories are off by default, and the choice can be changed at any time.
 *
 * Usage (put both files on the same origin as the page):
 *   <link rel="stylesheet" href="/cookie-banner.css">
 *   <script src="/cookie-banner.js" defer data-cookie-banner
 *           data-mode="notice"
 *           data-policy-url="/cookies/"
 *           data-categories="analytics,media"></script>
 *
 * Gate optional things until consent (consent mode):
 *   <script type="text/plain" data-consent="analytics" data-src="https://example.com/a.js"></script>
 *   <script type="text/plain" data-consent="analytics">inlineCode()</script>
 *   <iframe data-consent="media" data-consent-src="https://www.youtube-nocookie.com/embed/ID"></iframe>
 *   <img data-consent="media" data-consent-src="https://i.ytimg.com/vi/ID/hqdefault.jpg" alt="">
 *
 * Let visitors change their mind (required in the EU/UK; put it in the footer):
 *   <button type="button" data-cookie-settings>Cookie settings</button>
 *
 * From your own code:
 *   CookieConsent.has('analytics')            -> true / false
 *   CookieConsent.onChange(function (c) {})   -> runs now if a choice exists, and on every change
 *   CookieConsent.open()                      -> re-open the banner
 *   CookieConsent.reset()                     -> forget the choice
 *   document.addEventListener('cookieconsent', function (e) { e.detail.choices })
 */
(function () {
  'use strict';
  if (window.CookieConsent) return;

  var tag = document.currentScript || document.querySelector('script[data-cookie-banner]');
  var ds = (tag && tag.dataset) || {};
  var cfg = window.cookieBannerConfig || {};

  var MODE = (cfg.mode || ds.mode || 'notice') === 'consent' ? 'consent' : 'notice';
  var POLICY_URL = cfg.policyUrl || ds.policyUrl || '/cookies/';
  var KEY = cfg.storageKey || ds.storageKey || 'cookie-consent';
  var VERSION = String(cfg.version || ds.version || '1');
  var MAX_AGE_DAYS = Number(cfg.maxAgeDays || ds.maxAgeDays || 180);
  var CATEGORIES = (cfg.categories || (ds.categories ? ds.categories.split(',') : ['analytics']))
    .map(function (c) { return String(c).trim(); })
    .filter(Boolean);

  var LABELS = {
    analytics: ['Analytics', 'Helps us see which pages are used so we can improve the site.'],
    media: ['Embedded media', 'Loads videos, maps and fonts from other companies, which lets them see your IP address.'],
    marketing: ['Marketing', 'Lets advertising partners measure and personalise ads.'],
    preferences: ['Preferences', 'Remembers optional settings between visits.']
  };
  var TEXT = {
    region: 'Cookie notice',
    noticeBody: 'This site only uses the cookies and browser storage it needs to work. No advertising or tracking cookies.',
    consentBody: 'We use necessary cookies to run this site. With your permission we would also use optional ones.',
    gpcBody: 'Your browser sent a Global Privacy Control signal, so optional cookies are switched off.',
    details: 'Cookie policy',
    ok: 'OK',
    accept: 'Accept all',
    reject: 'Reject optional',
    choose: 'Choose',
    save: 'Save choices',
    necessary: 'Necessary',
    necessaryHelp: 'Needed for the site to work. Always on.'
  };
  var k;
  for (k in (cfg.text || {})) TEXT[k] = cfg.text[k];
  for (k in (cfg.labels || {})) LABELS[k] = cfg.labels[k];

  var GPC = navigator.globalPrivacyControl === true;
  var listeners = [];
  var root = null;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || c.v !== VERSION || c.mode !== MODE) return null;
      if (Date.now() - c.ts > MAX_AGE_DAYS * 864e5) return null;
      return c;
    } catch (e) { return null; }
  }

  function write(choices, extra) {
    var c = { v: VERSION, mode: MODE, ts: Date.now(), choices: choices };
    for (var x in (extra || {})) c[x] = extra[x];
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* private mode: choice lasts for this page only */ }
    return c;
  }

  function allChoices(value) {
    var o = {};
    CATEGORIES.forEach(function (c) { o[c] = value; });
    return o;
  }

  var current = read();

  function has(cat) {
    if (cat === 'necessary') return true;
    return !!(current && current.choices && current.choices[cat] === true);
  }

  // Turn on anything that was waiting for this visitor's permission.
  function activate() {
    var nodes = document.querySelectorAll('[data-consent]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.hasAttribute('data-consent-done') || !has(el.getAttribute('data-consent'))) continue;
      el.setAttribute('data-consent-done', '');
      if (el.tagName === 'SCRIPT') {
        var s = document.createElement('script');
        for (var j = 0; j < el.attributes.length; j++) {
          var a = el.attributes[j];
          if (a.name === 'type' || a.name === 'data-src' || a.name.indexOf('data-consent') === 0) continue;
          s.setAttribute(a.name, a.value);
        }
        if (el.getAttribute('data-src')) s.src = el.getAttribute('data-src');
        else s.text = el.text;
        el.parentNode.insertBefore(s, el.nextSibling);
      } else if (el.getAttribute('data-consent-src')) {
        el.setAttribute('src', el.getAttribute('data-consent-src'));
      }
    }
  }

  function emit() {
    var detail = { choices: (current && current.choices) || {}, mode: MODE, gpc: GPC };
    listeners.forEach(function (fn) { try { fn(detail.choices, detail); } catch (e) { /* a listener must not break the banner */ } });
    try { document.dispatchEvent(new CustomEvent('cookieconsent', { detail: detail })); } catch (e) { /* old browser */ }
  }

  function decide(choices, extra) {
    var before = current;
    current = write(choices, extra);
    close();
    activate();
    emit();
    // Scripts that already ran cannot be unloaded, so reload once when permission is taken away.
    if (before && before.choices) {
      for (var c in before.choices) {
        if (before.choices[c] === true && choices[c] !== true) { location.reload(); return; }
      }
    }
  }

  function el(name, cls, text) {
    var n = document.createElement(name);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function button(label, cls, onClick) {
    var b = el('button', 'cb-btn ' + cls, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function close() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
  }

  function open(opts) {
    close();
    opts = opts || {};
    root = el('section', 'cb cb-' + MODE);
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', TEXT.region);

    var body = el('p', 'cb-text', opts.gpcNotice ? TEXT.gpcBody : (MODE === 'consent' ? TEXT.consentBody : TEXT.noticeBody));
    body.appendChild(document.createTextNode(' '));
    var link = el('a', 'cb-link', TEXT.details);
    link.href = POLICY_URL;
    body.appendChild(link);
    root.appendChild(body);

    var actions = el('div', 'cb-actions');

    if (MODE === 'notice' || opts.gpcNotice) {
      actions.appendChild(button(TEXT.ok, 'cb-primary', function () {
        if (MODE === 'notice') decide({}, {});
        else close();
      }));
      if (opts.gpcNotice) actions.appendChild(button(TEXT.choose, 'cb-ghost', function () { open({ expanded: true }); }));
    } else {
      var panel = el('div', 'cb-panel');
      panel.id = 'cb-panel';
      panel.hidden = !opts.expanded;

      var nec = el('label', 'cb-cat');
      var necBox = el('input');
      necBox.type = 'checkbox'; necBox.checked = true; necBox.disabled = true;
      nec.appendChild(necBox);
      var necText = el('span');
      necText.appendChild(el('strong', null, TEXT.necessary));
      necText.appendChild(document.createTextNode(' ' + TEXT.necessaryHelp));
      nec.appendChild(necText);
      panel.appendChild(nec);

      var boxes = {};
      CATEGORIES.forEach(function (c) {
        var info = LABELS[c] || [c, ''];
        var row = el('label', 'cb-cat');
        var box = el('input');
        box.type = 'checkbox';
        box.checked = has(c); // off unless the visitor already said yes
        boxes[c] = box;
        row.appendChild(box);
        var t = el('span');
        t.appendChild(el('strong', null, info[0]));
        if (info[1]) t.appendChild(document.createTextNode(' ' + info[1]));
        row.appendChild(t);
        panel.appendChild(row);
      });
      panel.appendChild(button(TEXT.save, 'cb-choice', function () {
        var o = {};
        CATEGORIES.forEach(function (c) { o[c] = boxes[c].checked; });
        decide(o, { gpc: GPC });
      }));
      root.appendChild(panel);

      // Same class on both: rejecting must be as easy and as visible as accepting.
      actions.appendChild(button(TEXT.reject, 'cb-choice', function () { decide(allChoices(false), { gpc: GPC }); }));
      actions.appendChild(button(TEXT.accept, 'cb-choice', function () { decide(allChoices(true), { gpc: GPC }); }));
      var chooseBtn = button(TEXT.choose, 'cb-ghost', function () {
        panel.hidden = !panel.hidden;
        chooseBtn.setAttribute('aria-expanded', String(!panel.hidden));
      });
      chooseBtn.setAttribute('aria-controls', 'cb-panel');
      chooseBtn.setAttribute('aria-expanded', String(!!opts.expanded));
      actions.appendChild(chooseBtn);
    }

    root.appendChild(actions);
    document.body.appendChild(root);
  }

  window.CookieConsent = {
    mode: MODE,
    gpc: GPC,
    get: function () { return current ? JSON.parse(JSON.stringify(current)) : null; },
    has: has,
    open: function () { open({ expanded: MODE === 'consent' }); },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ } current = null; open(); },
    onChange: function (fn) { listeners.push(fn); if (current) fn(current.choices || {}, { choices: current.choices || {}, mode: MODE, gpc: GPC }); }
  };

  function start() {
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-cookie-settings]') : null;
      if (t) { e.preventDefault(); window.CookieConsent.open(); }
    });
    if (current) { activate(); emit(); return; }
    if (MODE === 'consent' && GPC) {
      // A Global Privacy Control signal is a valid opt-out (California, Colorado, Connecticut and others).
      current = write(allChoices(false), { gpc: true });
      emit();
      open({ gpcNotice: true });
      return;
    }
    open();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
