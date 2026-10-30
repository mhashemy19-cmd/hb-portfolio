/* HB Studio v3 — site.js
   Shared runtime: content loading, EN/FA with RTL, header/footer, contact panel, copy buttons,
   quote form (WhatsApp/Telegram/email), lightbox/player, and the page renderers.
   Every string and image comes from content/content.json; English also lives in the HTML for SEO. */
(function () {
  'use strict';
  var SCRIPT = document.currentScript;
  var ROOT = new URL('../../', SCRIPT ? SCRIPT.src : location.href).href; // site root, works on GitHub Pages sub-paths
  var PAGE = document.body.getAttribute('data-page') || 'home';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) document.documentElement.classList.add('reduced');

  var HB = window.HB = { root: ROOT, content: null, lang: 'en', page: PAGE, reduce: reduce, handlers: [] };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  HB.$ = $; HB.$$ = $$;

  /* ───────── helpers ───────── */
  var esc = HB.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var faDigits = HB.faDigits = function (s) { return String(s).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); };
  var numFmt = HB.numFmt = function (s) { s = String(s == null ? '' : s); return HB.lang === 'fa' ? faDigits(s) : s; };
  function get(path) {
    var o = HB.content; if (!o) return undefined;
    var parts = String(path).split('.');
    for (var i = 0; i < parts.length; i++) { if (o == null) return undefined; o = o[parts[i]]; }
    return o;
  }
  var L = HB.L = function (o) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    var v = o[HB.lang]; if (v == null || v === '') v = o.en;
    return v == null ? '' : v;
  };
  var T = HB.t = function (path) { return L(get(path)); };
  var UI = HB.ui = function (key) { var u = HB.content && HB.content.ui && HB.content.ui[key]; return u ? L(u) : (FALLBACK_UI[key] || key); };
  var FALLBACK_UI = { 'cta.quote': 'Get a quote', 'cta.copy': 'Copy', 'toast.copied': 'Copied', 'cta.close': 'Close' };
  var img = HB.img = function (p) { if (!p) return ''; if (/^(https?:|data:|blob:)/.test(p)) return p; return ROOT + String(p).replace(/^\//, ''); };
  var page = HB.pageUrl = function (name) { return ROOT + name; };
  var contact = function () { return (HB.content && HB.content.contact) || { email: 'Mhashemy54@yahoo.com', phone: '09211359942', phoneIntl: '+989211359942', whatsapp: 'https://wa.me/989211359942', telegram: 'https://t.me/+989211359942', telegramUser: 'https://t.me/hashemibros', instagram: 'https://instagram.com/hashemibros', instagramHandle: '@hashemibros' }; };
  HB.contact = contact;
  var projects = function () { return (HB.content && HB.content.projects) || []; };
  HB.projects = projects;
  HB.onLang = function (fn) { HB.handlers.push(fn); };
  HB.onReady = function (fn) { if (HB.content !== null || HB.failed) fn(); else document.addEventListener('hb:ready', fn, { once: true }); };

  /* ───────── icons ───────── */
  var IC = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6.5L20.5 7"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 3h3l1.4 4-2 1.4a11 11 0 0 0 6.6 6.6L16 13l4 1.4v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.2-4.1A8 8 0 1 1 8.3 18.9z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .7a4 4 0 0 1-2-2l.7-1-1-2z"/></svg>',
    tg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4 3 11l5.5 2L10 19l3-3.5 4.5 3.5z"/><path d="m8.5 13 8-5.5"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="m3 3 10 10M13 3 3 13"/></svg>',
    arr: '<svg class="arr" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8h12M9 3l5 5-5 5"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>'
  };
  HB.IC = IC;
  var TOOL_ICONS = {
    glass: '<svg class="ico" viewBox="0 0 60 60"><path d="M30 6 54 22 30 54 6 22z"/><path d="M6 22h48M30 6 20 22l10 32 10-32z"/></svg>',
    wave: '<svg class="ico" viewBox="0 0 60 60"><path d="M6 30h4M14 20v20M22 12v36M30 22v16M38 8v44M46 18v24M54 27v6"/></svg>',
    folder: '<svg class="ico" viewBox="0 0 60 60"><path d="M6 14h17l5 6h26v28H6z"/><path d="M6 26h48"/></svg>',
    chat: '<svg class="ico" viewBox="0 0 60 60"><path d="M8 10h44v30H26l-12 10V40H8z"/><path d="M18 22h24M18 30h14"/></svg>',
    mic: '<svg class="ico" viewBox="0 0 60 60"><rect x="22" y="6" width="16" height="28" rx="8"/><path d="M14 28a16 16 0 0 0 32 0M30 44v10M21 54h18"/></svg>',
    text: '<svg class="ico" viewBox="0 0 60 60"><rect x="6" y="12" width="48" height="36" rx="4"/><path d="M16 36h28M22 28h16"/></svg>'
  };

  /* ───────── language ───────── */
  function readLang() {
    try { var q = new URLSearchParams(location.search).get('lang'); if (q === 'fa' || q === 'en') return q; } catch (e) {}
    try { var s = localStorage.getItem('hb-lang'); if (s === 'fa' || s === 'en') return s; } catch (e) {}
    return 'en';
  }
  function applyLangAttrs() {
    var d = document.documentElement;
    d.lang = HB.lang; d.dir = HB.lang === 'fa' ? 'rtl' : 'ltr';
  }
  HB.setLang = function (l) {
    if (l === HB.lang) return;
    HB.lang = l;
    try { localStorage.setItem('hb-lang', l); } catch (e) {}
    applyLangAttrs(); renderAll();
    HB.handlers.forEach(function (fn) { try { fn(l); } catch (e) { console.warn(e); } });
    document.dispatchEvent(new CustomEvent('hb:lang', { detail: l }));
  };

  /* ───────── toast / copy ───────── */
  var toastEl, toastT;
  var toast = HB.toast = function (msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  };
  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-100px;opacity:0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      var ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
    } catch (e) { return false; }
  }
  var copyText = HB.copy = function (text, btn, msgKey) {
    var done = function () {
      toast(UI(msgKey || 'toast.copied'));
      if (btn) { var old = btn.textContent; btn.classList.add('done'); btn.textContent = '✓'; setTimeout(function () { btn.classList.remove('done'); btn.textContent = old; }, 1400); }
      return true;
    };
    var fail = function () { if (legacyCopy(text)) return done(); toast(UI('toast.copyFail')); return false; };
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(done, fail); } catch (e) {}
    return Promise.resolve(fail());
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    e.preventDefault(); copyText(b.getAttribute('data-copy'), b);
  });

  /* ───────── static binders ───────── */
  function bind(root) {
    root = root || document;
    $$('[data-t]', root).forEach(function (el) { var v = T(el.getAttribute('data-t')); if (v !== '') el.textContent = v; });
    $$('[data-ui]', root).forEach(function (el) { el.textContent = UI(el.getAttribute('data-ui')); });
    $$('[data-ui-attr]', root).forEach(function (el) {
      el.getAttribute('data-ui-attr').split(';').forEach(function (p) { var kv = p.split(':'); if (kv[1]) el.setAttribute(kv[0], UI(kv[1])); });
    });
    $$('[data-img]', root).forEach(function (el) {
      var p = get(el.getAttribute('data-img')); if (p) el.src = img(p);
      var a = el.getAttribute('data-alt'); if (a) el.alt = T(a);
    });
    $$('[data-fa-digits]', root).forEach(function (el) { el.textContent = numFmt(el.getAttribute('data-fa-digits')); });
  }
  HB.bind = bind;
  function applyMeta() {
    var c = HB.content; if (!c) return;
    var titleEl = $('meta[name="hb-title"]');
    var pageTitle = titleEl ? titleEl.content : '';
    var site = L(c.site.title);
    if (PAGE === 'project' || PAGE === 'product') return;
    document.title = pageTitle ? pageTitle.replace('{lang}', '') + ' — ' + c.site.brand : site;
    if (HB.lang === 'fa') {
      var pk = { home: 'nav.home', work: 'nav.work', studio: 'nav.studio', tools: 'nav.tools', about: 'nav.about', contact: 'nav.contact', services: 'nav.services' }[PAGE];
      document.title = (pk && PAGE !== 'home') ? UI(pk) + ' — ' + L({ en: 'Mohammad Hashemi', fa: 'محمد هاشمی' }) : site;
    }
    var md = $('meta[name="description"]'); if (md) md.content = PAGE === 'home' ? L(c.site.description) : md.content;
  }

  /* ───────── header / footer ───────── */
  var NAV = [['home', 'index.html', 'nav.home'], ['work', 'work.html', 'nav.work'], ['studio', 'studio.html', 'nav.studio'], ['services', 'services.html', 'nav.services'], ['tools', 'tools.html', 'nav.tools'], ['about', 'about.html', 'nav.about'], ['contact', 'contact.html', 'nav.contact']];
  function navLinks() {
    return NAV.map(function (n) { return '<a href="' + page(n[1]) + '"' + (n[0] === PAGE || (PAGE === 'project' && n[0] === 'work') || (PAGE === 'product' && n[0] === 'tools') ? ' aria-current="page"' : '') + '>' + esc(UI(n[2])) + '</a>'; }).join('');
  }
  function langSwitch() {
    return '<div class="lang" role="group" aria-label="' + esc(UI('label.language')) + '"><button type="button" data-lang="en" aria-pressed="' + (HB.lang === 'en') + '">EN</button><button type="button" data-lang="fa" aria-pressed="' + (HB.lang === 'fa') + '" lang="fa">فا</button></div>';
  }
  function renderChrome() {
    var h = $('#site-header');
    if (h) {
      h.innerHTML = '<a class="skip" href="#main">' + esc(UI('skip')) + '</a>' +
        '<header class="hdr"><div class="wrap"><a class="logo" href="' + page('index.html') + '" aria-label="Mohammad Hashemi — HB Studio"><i>HB</i><span>' + esc(L({ en: 'Mohammad Hashemi', fa: 'محمد هاشمی' })) + '</span></a>' +
        '<nav class="nav" aria-label="Main">' + navLinks() + '</nav>' +
        '<div class="hdr-actions">' + langSwitch() + '<button type="button" class="btn sm" data-open-panel>' + esc(UI('cta.quote')) + '</button>' +
        '<button type="button" class="burger" aria-expanded="false" aria-controls="mmenu" aria-label="' + esc(UI('label.menu')) + '"><span></span></button></div></div></header>' +
        '<div class="mmenu" id="mmenu" aria-label="Menu">' + navLinks().replace(/<a /g, '<a ').replace(/<\/a>/g, '</a>') + langSwitch() + '<button type="button" class="btn" style="margin-top:20px;align-self:flex-start" data-open-panel>' + esc(UI('cta.quote')) + '</button></div>';
    }
    var f = $('#site-footer');
    if (f) {
      var c = contact();
      f.innerHTML = '<footer class="ftr"><div class="wrap"><div class="ftr-grid"><div><a class="logo" href="' + page('index.html') + '"><i>HB</i><span>' + esc(L({ en: 'Mohammad Hashemi', fa: 'محمد هاشمی' })) + '</span></a><p>' + esc(UI('footer.line')) + '</p></div>' +
        '<div><h4>' + esc(UI('footer.nav')) + '</h4><ul>' + NAV.map(function (n) { return '<li><a href="' + page(n[1]) + '">' + esc(UI(n[2])) + '</a></li>'; }).join('') + '</ul></div>' +
        '<div><h4>' + esc(UI('footer.reach')) + '</h4><ul><li><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></li><li><a href="tel:' + esc(c.phoneIntl) + '"><span class="num">' + esc(c.phone) + '</span></a></li><li><a href="' + esc(c.whatsapp) + '" target="_blank" rel="noopener">' + esc(UI('label.whatsapp')) + '</a></li><li><a href="' + esc(c.telegram) + '" target="_blank" rel="noopener">' + esc(UI('label.telegram')) + '</a></li><li><a href="' + esc(c.instagram) + '" target="_blank" rel="noopener"><span class="num">' + esc(c.instagramHandle) + '</span></a></li></ul></div></div>' +
        '<div class="ftr-base"><span>© ' + numFmt(new Date().getFullYear()) + ' Mohammad Hashemi · HB Studio. ' + esc(UI('footer.rights')) + '</span><span>' + esc(L(c.location)) + '</span></div></div></footer>';
    }
    if (!$('.fab')) {
      var fab = document.createElement('button'); fab.type = 'button'; fab.className = 'fab'; fab.setAttribute('data-open-panel', ''); fab.innerHTML = IC.chat;
      document.body.appendChild(fab);
    }
    $('.fab').setAttribute('aria-label', UI('panel.title'));
    $('.fab').setAttribute('aria-haspopup', 'dialog');
    var pn = $('.panel');
    if (pn) { var open = pn.classList.contains('open'); buildPanel(open ? lastPanelOpts : null, true); }
  }

  /* mobile menu + language buttons (delegated) */
  function setMenu(open) {
    var b = $('.burger'), m = $('#mmenu'); if (!b || !m) return;
    b.setAttribute('aria-expanded', String(open)); m.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  document.addEventListener('click', function (e) {
    var lb = e.target.closest('[data-lang]');
    if (lb) { HB.setLang(lb.getAttribute('data-lang')); return; }
    var bg = e.target.closest('.burger');
    if (bg) { setMenu(bg.getAttribute('aria-expanded') !== 'true'); return; }
    if (e.target.closest('#mmenu a')) setMenu(false);
    var op = e.target.closest('[data-open-panel]');
    if (op) { setMenu(false); HB.openPanel(); return; }
    var nt = e.target.closest('[data-notify]');
    if (nt) { HB.openPanel({ notify: nt.getAttribute('data-notify') }); return; }
  });

  /* ───────── contact methods + panel ───────── */
  function methodsHTML() {
    var c = contact();
    var rows = [
      ['wa', 'label.whatsapp', '<a href="' + esc(c.whatsapp) + '" target="_blank" rel="noopener"><span class="num">' + esc(c.phoneIntl) + '</span></a>', c.phoneIntl],
      ['tg', 'label.telegram', '<a href="' + esc(c.telegram) + '" target="_blank" rel="noopener"><span class="num">' + esc(c.phoneIntl) + '</span></a>', c.phoneIntl],
      ['phone', 'label.phone', '<a href="tel:' + esc(c.phoneIntl) + '"><span class="num">' + esc(c.phone) + '</span></a>', c.phone],
      ['mail', 'label.email', '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>', c.email],
      ['ig', 'label.instagram', '<a href="' + esc(c.instagram) + '" target="_blank" rel="noopener"><span class="num">' + esc(c.instagramHandle) + '</span></a>', c.instagramHandle]
    ];
    return '<div class="methods">' + rows.map(function (r) {
      return '<div class="method"><span class="ic">' + IC[r[0]] + '</span><div class="mt"><small>' + esc(UI(r[1])) + '</small>' + r[2] + '</div><div class="acts"><button type="button" class="cp" data-copy="' + esc(r[3]) + '">' + esc(UI('cta.copy')) + '</button></div></div>';
    }).join('') + '</div>';
  }
  HB.methodsHTML = methodsHTML;

  var lastPanelOpts = null, panelOpener = null;
  function notifyMessage(name) { return UI('panel.notifyMsg') + name; }
  function buildPanel(opts, keepState) {
    var pn = $('.panel'), sc = $('.scrim');
    if (!pn) {
      sc = document.createElement('div'); sc.className = 'scrim';
      pn = document.createElement('aside'); pn.className = 'panel'; pn.setAttribute('role', 'dialog'); pn.setAttribute('aria-modal', 'true'); pn.setAttribute('aria-labelledby', 'panel-h');
      document.body.appendChild(sc); document.body.appendChild(pn);
      sc.addEventListener('click', function () { HB.closePanel(); });
    }
    var c = contact(), h = '';
    h += '<div class="panel-top"><div><h2 class="display" id="panel-h" style="font-size:2rem">' + esc(UI('panel.title')) + '</h2><p class="mute" style="margin-top:6px">' + esc(UI('panel.sub')) + '</p></div><button type="button" class="x" data-close-panel aria-label="' + esc(UI('cta.close')) + '">' + IC.x + '</button></div>';
    if (opts && opts.notify) {
      var msg = notifyMessage(opts.notify);
      h += '<div class="notify">' + esc(UI('panel.notifyTitle')) + ' <b>' + esc(opts.notify) + '</b></div>' +
        '<div class="row"><a class="btn sm" target="_blank" rel="noopener" href="' + esc(c.whatsapp) + '?text=' + encodeURIComponent(msg) + '">' + esc(UI('label.whatsapp')) + '</a>' +
        '<button type="button" class="btn sm ghost" data-tg-msg="' + esc(msg) + '">' + esc(UI('label.telegram')) + '</button>' +
        '<a class="btn sm ghost" href="mailto:' + esc(c.email) + '?subject=' + encodeURIComponent(opts.notify) + '&body=' + encodeURIComponent(msg) + '">' + esc(UI('label.email')) + '</a></div>' +
        '<p class="note">' + esc(UI('quote.tgNote')) + '</p>';
    }
    h += methodsHTML();
    h += '<a class="btn ghost" href="' + page('contact.html') + '#quote" data-close-panel>' + esc(UI('quote.title')) + ' ' + IC.arr + '</a>';
    pn.innerHTML = h;
    lastPanelOpts = opts || null;
    if (!keepState) {
      requestAnimationFrame(function () { pn.classList.add('open'); sc.classList.add('open'); var cl = $('.x', pn); if (cl) cl.focus(); });
    }
  }
  HB.openPanel = function (opts) {
    panelOpener = document.activeElement;
    buildPanel(opts || null);
    document.body.style.overflow = 'hidden';
  };
  HB.closePanel = function () {
    var pn = $('.panel'), sc = $('.scrim'); if (!pn) return;
    pn.classList.remove('open'); sc.classList.remove('open'); document.body.style.overflow = '';
    if (panelOpener && panelOpener.focus) { try { panelOpener.focus(); } catch (e) {} }
  };
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close-panel]')) { var onContact = PAGE === 'contact' && e.target.closest('a'); HB.closePanel(); if (onContact) { e.preventDefault(); var q = $('#quote'); if (q) q.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } }
    var tg = e.target.closest('[data-tg-msg]');
    if (tg) { copyText(tg.getAttribute('data-tg-msg'), null, 'toast.msgCopied'); window.open(contact().telegram, '_blank', 'noopener'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var pn = $('.panel.open'); if (pn) { HB.closePanel(); return; }
      var m = $('#mmenu.open'); if (m) setMenu(false);
    }
    if (e.key === 'Tab') {
      var pn2 = $('.panel.open');
      if (pn2) {
        var f = $$('a[href],button:not([disabled])', pn2).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return; var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  });

  /* ───────── lightbox / player ───────── */
  var LB = { items: [], i: 0, opener: null };
  function lbEl() {
    var el = $('.lb'); if (el) return el;
    el = document.createElement('div'); el.className = 'lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Viewer');
    el.innerHTML = '<div class="lb-top"><div class="lb-title"></div><button type="button" class="x" data-lb-close>' + IC.x + '</button></div><div class="lb-stage"></div><div><div class="lb-cap"></div><div class="lb-nav"><button type="button" class="btn sm ghost" data-lb-prev></button><span class="lb-count"></span><button type="button" class="btn sm ghost" data-lb-next></button></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-lb-close]') || e.target === el || e.target.classList.contains('lb-stage')) HB.closeLightbox();
      else if (e.target.closest('[data-lb-prev]')) lbStep(-1);
      else if (e.target.closest('[data-lb-next]')) lbStep(1);
    });
    return el;
  }
  function lbShow() {
    var el = lbEl(), it = LB.items[LB.i]; if (!it) return;
    var st = $('.lb-stage', el); st.innerHTML = '';
    if (it.video) { var v = document.createElement('video'); v.src = img(it.video); v.controls = true; v.autoplay = true; v.playsInline = true; if (it.poster) v.poster = img(it.poster); st.appendChild(v); }
    else { var im = document.createElement('img'); im.src = img(it.src); im.alt = it.title || ''; st.appendChild(im); }
    $('.lb-title', el).textContent = it.title || '';
    $('.lb-cap', el).textContent = it.caption || '';
    $('[data-lb-prev]', el).textContent = UI('cta.prev'); $('[data-lb-next]', el).textContent = UI('cta.next');
    $('[data-lb-close]', el).setAttribute('aria-label', UI('cta.close'));
    $('.lb-count', el).textContent = LB.items.length > 1 ? numFmt((LB.i + 1) + ' / ' + LB.items.length) : '';
    $('.lb-nav', el).style.display = LB.items.length > 1 ? 'flex' : 'none';
  }
  function lbStep(d) { LB.i = (LB.i + d + LB.items.length) % LB.items.length; lbShow(); }
  HB.openLightbox = function (items, i) {
    LB.items = items; LB.i = i || 0; LB.opener = document.activeElement;
    var el = lbEl(); lbShow(); el.classList.add('open'); document.body.style.overflow = 'hidden';
    $('[data-lb-close]', el).focus();
    document.dispatchEvent(new CustomEvent('hb:lightbox', { detail: true }));
  };
  HB.closeLightbox = function () {
    var el = $('.lb'); if (!el || !el.classList.contains('open')) return;
    var v = $('video', el); if (v) v.pause();
    el.classList.remove('open'); $('.lb-stage', el).innerHTML = ''; document.body.style.overflow = '';
    if (LB.opener && LB.opener.focus) { try { LB.opener.focus(); } catch (e) {} }
    document.dispatchEvent(new CustomEvent('hb:lightbox', { detail: false }));
  };
  document.addEventListener('keydown', function (e) {
    var el = $('.lb.open'); if (!el) return;
    if (e.key === 'Escape') { e.stopPropagation(); HB.closeLightbox(); }
    else if (e.key === 'ArrowRight' && !(e.target && e.target.tagName === 'VIDEO')) lbStep(document.documentElement.dir === 'rtl' ? -1 : 1);
    else if (e.key === 'ArrowLeft' && !(e.target && e.target.tagName === 'VIDEO')) lbStep(document.documentElement.dir === 'rtl' ? 1 : -1);
    else if (e.key === 'Tab') {
      var f = $$('button', el).filter(function (x) { return x.offsetParent !== null; }); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  /* ───────── quote form ───────── */
  var quoteState = {};
  HB.mountQuote = function (host, opts) {
    opts = opts || {}; if (!host) return;
    var c = HB.content, tiers = (c.services && c.services.tiers) || [];
    var types = ['commercial', 'jewelry', 'realestate', 'podcast', 'motion', 'ai', 'other'];
    var budgets = ['starter', 'mid', 'premium', 'flagship'];
    var st = quoteState;
    if (opts.tier) st.tier = opts.tier;
    function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(label) + '</option>'; }
    var h = '<form class="form" id="q-form" novalidate><div><h3 class="display">' + esc(opts.title || UI('quote.title')) + '</h3><p class="mute" style="margin-top:6px">' + esc(opts.sub || UI('quote.sub')) + '</p></div>' +
      '<div id="q-step1" class="form" style="padding:0;border:0;background:none">' +
      '<div class="form-2"><div class="fld"><label for="q-name">' + esc(UI('quote.name')) + '</label><input id="q-name" autocomplete="name" value="' + esc(st.name || '') + '" required><span class="err">' + esc(UI('quote.required')) + '</span></div>' +
      '<div class="fld"><label for="q-contact">' + esc(UI('quote.contact')) + '</label><input id="q-contact" autocomplete="email" dir="auto" value="' + esc(st.contact || '') + '" required><span class="err">' + esc(UI('quote.required')) + '</span></div></div>' +
      '<div class="form-2"><div class="fld"><label for="q-type">' + esc(UI('quote.type')) + '</label><select id="q-type">' + types.map(function (k) { return opt(k, UI('type.' + k), st.type === k); }).join('') + '</select></div>' +
      '<div class="fld"><label for="q-tier">' + esc(UI('quote.tier')) + '</label><select id="q-tier">' + opt('', UI('quote.any'), !st.tier) + tiers.map(function (t) { return opt(t.id, L(t.name), st.tier === t.id); }).join('') + '</select></div></div>' +
      '<div class="form-2"><div class="fld"><label for="q-budget">' + esc(UI('quote.budget')) + '</label><select id="q-budget">' + opt('', UI('quote.any'), !st.budget) + budgets.map(function (k) { return opt(k, UI('budget.' + k), st.budget === k); }).join('') + '</select></div>' +
      '<div class="fld"><label for="q-deadline">' + esc(UI('quote.deadline')) + '</label><input id="q-deadline" type="date" value="' + esc(st.deadline || '') + '"></div></div>' +
      '<div class="fld"><label for="q-message">' + esc(UI('quote.message')) + '</label><textarea id="q-message" dir="auto">' + esc(st.message || '') + '</textarea></div>' +
      '<div class="row"><button class="btn" type="submit">' + esc(UI('quote.review')) + ' ' + IC.arr + '</button></div></div>' +
      '<div id="q-step2" class="review" hidden><dl id="q-dl"></dl><div class="fld"><label for="q-msg">' + esc(UI('quote.copy')) + '</label><textarea id="q-msg" dir="auto" style="min-height:160px"></textarea></div>' +
      '<div class="row"><a class="btn" id="q-wa" target="_blank" rel="noopener" href="#">' + esc(UI('label.whatsapp')) + '</a><button type="button" class="btn ghost" id="q-tg">' + esc(UI('label.telegram')) + '</button><a class="btn ghost" id="q-mail" href="#">' + esc(UI('label.email')) + '</a><button type="button" class="btn ghost" id="q-copy">' + esc(UI('quote.copy')) + '</button><button type="button" class="btn ghost" id="q-back">' + esc(UI('quote.edit')) + '</button></div>' +
      '<p class="note">' + esc(UI('quote.tgNote')) + '</p></div></form>';
    host.innerHTML = h;
    var f = $('#q-form', host);
    $$('input,select,textarea', f).forEach(function (el) {
      el.addEventListener('input', function () { if (el.id.indexOf('q-msg') === 0) return; st[el.id.replace('q-', '')] = el.value; var fl = el.closest('.fld'); if (fl) fl.classList.remove('bad'); });
      el.addEventListener('change', function () { if (el.id !== 'q-msg') st[el.id.replace('q-', '')] = el.value; });
    });
    function build() {
      var rows = [['quote.name', $('#q-name', f).value.trim()], ['quote.contact', $('#q-contact', f).value.trim()], ['quote.type', UI('type.' + $('#q-type', f).value)]];
      var tv = $('#q-tier', f).value; if (tv) { var tt = tiers.filter(function (x) { return x.id === tv; })[0]; rows.push(['quote.tier', tt ? L(tt.name) : tv]); }
      var bv = $('#q-budget', f).value; if (bv) rows.push(['quote.budget', UI('budget.' + bv)]);
      var dv = $('#q-deadline', f).value; if (dv) rows.push(['quote.deadline', dv]);
      var mv = $('#q-message', f).value.trim(); if (mv) rows.push(['quote.message', mv]);
      var msg = UI('quote.hello') + '\n\n' + rows.map(function (r) { return UI(r[0]) + ': ' + r[1]; }).join('\n');
      $('#q-dl', f).innerHTML = rows.map(function (r) { return '<dt>' + esc(UI(r[0])) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
      $('#q-msg', f).value = msg; syncLinks();
    }
    function syncLinks() {
      var c = contact(), msg = $('#q-msg', f).value;
      $('#q-wa', f).href = c.whatsapp + '?text=' + encodeURIComponent(msg);
      $('#q-mail', f).href = 'mailto:' + c.email + '?subject=' + encodeURIComponent(UI('quote.title') + ' — ' + $('#q-name', f).value) + '&body=' + encodeURIComponent(msg);
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      ['#q-name', '#q-contact'].forEach(function (id) { var el = $(id, f), bad = !el.value.trim(); el.closest('.fld').classList.toggle('bad', bad); if (bad) { ok = false; } });
      if (!ok) { var firstBad = $('.fld.bad input', f); if (firstBad) firstBad.focus(); return; }
      build(); $('#q-step1', f).hidden = true; $('#q-step2', f).hidden = false; f.scrollIntoView({ block: 'nearest' }); $('#q-wa', f).focus();
    });
    $('#q-msg', f).addEventListener('input', syncLinks);
    $('#q-back', f).addEventListener('click', function () { $('#q-step2', f).hidden = true; $('#q-step1', f).hidden = false; });
    $('#q-copy', f).addEventListener('click', function (e) { copyText($('#q-msg', f).value, e.currentTarget, 'toast.msgCopied'); });
    $('#q-tg', f).addEventListener('click', function () { copyText($('#q-msg', f).value, null, 'toast.msgCopied'); window.open(contact().telegram, '_blank', 'noopener'); });
  };

  /* ───────── card templates ───────── */
  function phHTML(p) { var t = L(p.title); return '<div class="ph" aria-hidden="true"><b>' + esc(t.charAt(0)) + '</b><small>' + esc(UI('label.preview')) + '</small></div>'; }
  function catLabel(id) { var cats = (HB.content.work && HB.content.work.categories) || [], m = cats.filter(function (c) { return c.id === id; })[0]; return m ? L(m.label) : id; }
  HB.cardHTML = function (p) {
    var im = p.cover || (p.images && p.images[0]);
    return '<a class="card rv" href="' + page('project.html') + '?id=' + encodeURIComponent(p.id) + '" data-cat="' + esc(p.category) + '"><div class="thumb">' +
      (im ? '<img src="' + esc(img(im)) + '" alt="' + esc(L(p.title)) + '" loading="lazy">' : phHTML(p)) + '</div>' +
      '<div class="info"><div class="meta"><span>' + esc(catLabel(p.category)) + '</span><span>' + esc(numFmt(p.year)) + '</span></div><h3>' + esc(L(p.title)) + '</h3><p>' + esc(L(p.summary)) + '</p><span class="more">' + esc(UI('cta.view')) + ' ' + IC.arr + '</span></div></a>';
  };

  /* ───────── reveal ───────── */
  var revIO;
  function reveal(root) {
    var els = $$('.rv:not(.in)', root || document);
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    if (!revIO) revIO = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); revIO.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach(function (e) { revIO.observe(e); });
  }
  HB.reveal = reveal;

  /* ───────── page renderers ───────── */
  var R = {};
  R.home = function () {
    var c = HB.content, h = c.home;
    var st = $('#hero-stats'); if (st) st.innerHTML = h.stats.map(function (s) { return '<div class="stat"><b>' + esc(numFmt(s.value)) + '</b><span>' + esc(L(s.label)) + '</span></div>'; }).join('');
    var reel = $('#reel'); if (reel) {
      var r = h.reel, vid = r.video;
      reel.innerHTML = (r.poster ? '<img src="' + esc(img(r.poster)) + '" alt="" loading="lazy">' : '') +
        (vid ? '<button type="button" class="playbtn" data-play-reel aria-label="' + esc(UI('cta.play')) + '">' + IC.play + '</button>' : '') +
        '<div class="reel-meta"><p>' + esc(L(r.sub)) + '</p>' + (vid ? '' : '<span class="badge soon"><i></i>' + esc(UI('status.soon')) + '</span>') + '</div>';
      var pb = $('[data-play-reel]', reel); if (pb) pb.addEventListener('click', function () { HB.openLightbox([{ video: vid, poster: r.poster, title: L(r.title) }]); });
    }
    var fe = $('#featured'); if (fe) {
      var ids = h.featured.ids || [], list = ids.map(function (id) { return projects().filter(function (p) { return p.id === id; })[0]; }).filter(Boolean);
      if (!list.length) list = projects().slice(0, 4);
      fe.innerHTML = list.map(HB.cardHTML).join('');
    }
    var sh = $('#store-home'); if (sh) {
      var pl = ST.products(), bd = ST.bundle();
      sh.hidden = !pl.length;
      if (pl.length) {
        $('#store-title', sh).textContent = L(c.home.store && c.home.store.title) || UI('nav.tools');
        $('#store-sub', sh).textContent = L(c.home.store && c.home.store.sub);
        $('#store-grid', sh).innerHTML = pl.map(function (t) { var r = regionRows(t)[0]; return '<a class="tile sc-tile rv" href="' + esc(ST.url(t.id)) + '"><span class="eyebrow" style="font-size:.66rem">' + esc(L(t.kind)) + '</span><h3>' + esc(L(t.name)) + '</h3><p>' + esc(L(t.tagline) || L(t.description)) + '</p><div class="price-row solo"><span class="badge launch"><i></i>' + esc(UI('store.launch')) + '</span><span class="pv">' + r.now + r.was + '</span></div></a>'; }).join('');
        $('#store-cta', sh).innerHTML = (bd ? '<button type="button" class="btn" data-buy="bundle">' + esc(UI('store.buyBundle')) + ' ' + IC.arr + '</button>' : '') + '<a class="btn ghost" href="' + page('tools.html') + '">' + esc(UI('store.homeCta')) + '</a>' + (bd ? '<span class="save-pill">' + esc(UI('store.save')) + ' ' + esc(HB.lang === 'fa' ? ST.tomanFull(bd.saveTn) : ST.usd(bd.saveUsd)) + '</span>' : '');
      }
    }
    var sv = $('#teaser'); if (sv) sv.innerHTML = h.services.items.map(function (it, i) { return '<div class="tile rv"><div class="n">' + numFmt('0' + (i + 1)) + '</div><h3>' + esc(L(it.title)) + '</h3><p>' + esc(L(it.text)) + '</p></div>'; }).join('');
  };
  R.work = function () {
    var c = HB.content, cats = c.work.categories, present = {};
    projects().forEach(function (p) { present[p.category] = 1; });
    var f = $('#filters'), g = $('#grid'); if (!f || !g) return;
    var cur = HB.workFilter || 'all';
    f.innerHTML = '<button type="button" class="chip" data-f="all" aria-pressed="' + (cur === 'all') + '">' + esc(UI('filter.all')) + '</button>' +
      cats.filter(function (x) { return present[x.id]; }).map(function (x) { return '<button type="button" class="chip" data-f="' + esc(x.id) + '" aria-pressed="' + (cur === x.id) + '">' + esc(L(x.label)) + '</button>'; }).join('');
    function paint() {
      var list = projects().filter(function (p) { return cur === 'all' || p.category === cur; });
      g.innerHTML = list.length ? list.map(HB.cardHTML).join('') : '<p class="empty">—</p>'; reveal(g);
      $$('.chip', f).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-f') === cur)); });
    }
    f.onclick = function (e) { var b = e.target.closest('.chip'); if (!b) return; cur = HB.workFilter = b.getAttribute('data-f'); paint(); };
    paint();
  };
  R.project = function () {
    var id = new URLSearchParams(location.search).get('id'), p = projects().filter(function (x) { return x.id === id; })[0] || (id ? null : projects()[0]);
    var host = $('#project'); if (!host) return;
    if (!p) { host.innerHTML = '<div class="wrap page-head"><h1 class="display">' + esc(UI('notfound')) + '</h1><p class="lead"><a class="btn ghost" href="' + page('work.html') + '">' + esc(UI('cta.all')) + '</a></p></div>'; document.title = UI('notfound'); return; }
    document.title = L(p.title) + ' — ' + HB.content.site.brand;
    var md = $('meta[name="description"]'); if (md) md.content = L(p.summary);
    var imgs = (p.images || []).slice(), items = imgs.map(function (s) { return { src: s, title: L(p.title), caption: L(p.client) }; });
    var idx = projects().indexOf(p), nx = projects()[(idx + 1) % projects().length];
    var credits = (p.credits || []).map(function (cr) { return '<li><span>' + esc(L(cr.role)) + '</span><span>' + esc(L(cr.name)) + '</span></li>'; }).join('');
    host.innerHTML = '<section class="proj-hero"><div class="wrap"><a class="eyebrow" href="' + page('work.html') + '">' + esc(catLabel(p.category)) + '</a><h1 class="display" style="margin-top:16px">' + esc(L(p.title)) + '</h1><p class="lead" style="margin-top:18px">' + esc(L(p.summary)) + '</p>' +
      '<dl class="proj-facts"><div><dt>' + esc(UI('label.client')) + '</dt><dd>' + esc(L(p.client)) + '</dd></div><div><dt>' + esc(UI('label.year')) + '</dt><dd>' + esc(numFmt(p.year)) + '</dd></div><div><dt>' + esc(UI('label.role')) + '</dt><dd>' + esc(L(p.role)) + '</dd></div><div><dt>' + esc(UI('label.category')) + '</dt><dd>' + esc(catLabel(p.category)) + '</dd></div></dl></div></section>' +
      '<section class="wrap"><div class="proj-body"><div><h2 class="eyebrow" style="margin-bottom:18px">' + esc(UI('label.video')) + '</h2>' +
      (p.video ? '<div class="vid"><video src="' + esc(img(p.video)) + '" controls playsinline preload="metadata"' + (p.cover ? ' poster="' + esc(img(p.cover)) + '"' : '') + '></video></div>' : '<div class="vid-empty"><p>' + esc(UI('status.soon')) + '</p></div>') +
      (imgs.length ? '<h2 class="eyebrow" style="margin:36px 0 0">' + esc(UI('label.gallery')) + '</h2><div class="gallery">' + imgs.map(function (s, i) { return '<button type="button" data-g="' + i + '" aria-label="' + esc(L(p.title)) + ' ' + numFmt(i + 1) + '"><img src="' + esc(img(s)) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '') +
      '</div><div><p class="lead" style="margin-bottom:32px">' + esc(L(p.description)) + '</p>' + (credits ? '<h2 class="eyebrow" style="margin-bottom:8px">' + esc(UI('label.credits')) + '</h2><ul class="credits">' + credits + '</ul>' : '') + '</div></div>' +
      '<a class="next-proj" href="' + page('project.html') + '?id=' + encodeURIComponent(nx.id) + '"><div><span class="eyebrow">' + esc(UI('label.next')) + '</span><h3 class="display" style="margin-top:10px">' + esc(L(nx.title)) + '</h3></div>' + IC.arr + '</a></section>';
    $$('.gallery button', host).forEach(function (b) { b.addEventListener('click', function () { HB.openLightbox(items, +b.getAttribute('data-g')); }); });
  };
  R.tools = function () {
    var host = $('#tools'); if (!host) return;
    host.innerHTML = HB.content.tools.items.map(function (t) {
      var sell = ST.sellable(t);
      var actions = sell ? '<div class="tool-actions">' + buyBtns(t) + '<a class="btn ghost" href="' + esc(ST.url(t.id)) + '">' + esc(UI('store.details')) + '</a></div>' : '<button type="button" class="btn" data-notify="' + esc(L(t.name)) + '">' + esc(UI('cta.notify')) + '</button>';
      return '<article class="tool rv" id="' + esc(t.id) + '"><div class="tool-vis" style="--h:' + esc(t.hue || 38) + '">' + toolVis(t) + '</div><div class="tool-body"><div class="badges"><span class="badge ' + (t.status === 'soon' ? 'soon' : '') + '"><i></i>' + esc(UI('status.' + t.status)) + '</span></div><span class="kind">' + esc(L(t.kind)) + '</span><h3>' + (sell ? '<a href="' + esc(ST.url(t.id)) + '">' + esc(L(t.name)) + '</a>' : esc(L(t.name))) + '</h3><p>' + esc(L(t.description)) + '</p>' + (sell ? ST.priceHTML(t, { noPlans: true }) + (t.trial ? '<p class="note">' + esc(trialText(t)) + '</p>' : '') : '') + actions + '</div></article>';
    }).join('');
    var bh = $('#bundle'); if (bh) bh.innerHTML = bundleBand();
    var sh = $('#how'); if (sh) sh.innerHTML = '<div class="sec-head rv"><span class="eyebrow">' + esc(UI('nav.tools')) + '</span><h2 class="display">' + esc(UI('store.stepsTitle')) + '</h2><p class="lead">' + esc(UI('store.stepsSub')) + '</p></div>' + stepsHTML() + '<p class="note" style="margin-top:18px">' + esc(UI('store.payNote')) + '</p>';
  };
  R.services = function () {
    var host = $('#tiers'), s = HB.content.services; if (!host) return;
    var sel = new URLSearchParams(location.search).get('tier') || quoteState.tier || (location.hash.indexOf('tier-') > -1 ? location.hash.split('tier-')[1] : '');
    host.innerHTML = s.tiers.map(function (t) {
      return '<article class="tier rv' + (t.featured ? ' feat' : '') + '" id="tier-' + esc(t.id) + '">' + (t.featured ? '<span class="badge flag"><i></i>★</span>' : '') + '<span class="n">' + esc(numFmt(t.n)) + '</span><h3>' + esc(L(t.name)) + '</h3><p class="tag">' + esc(L(t.tag)) + '</p>' +
        (L(t.lead) ? '<div class="lead-in">' + esc(L(t.lead)) + '</div>' : '') + '<ul>' + t.items.map(function (i) { return '<li>' + esc(L(i)) + '</li>'; }).join('') + '</ul><button type="button" class="btn' + (t.featured ? '' : ' ghost') + '" data-choose="' + esc(t.id) + '">' + esc(UI('cta.choose')) + ' ' + IC.arr + '</button></article>';
    }).join('');
    var qh = $('#quote-host');
    function mount(tierId) { HB.mountQuote(qh, { tier: tierId, title: L(s.quoteTitle), sub: L(s.quoteSub) }); }
    mount(sel && s.tiers.some(function (t) { return t.id === sel; }) ? sel : '');
    host.onclick = function (e) {
      var b = e.target.closest('[data-choose]'); if (!b) return;
      quoteState.tier = b.getAttribute('data-choose'); mount(quoteState.tier);
      qh.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      var n = $('#q-name', qh); if (n) setTimeout(function () { n.focus({ preventScroll: true }); }, 400);
    };
  };
  R.contact = function () {
    var m = $('#methods'); if (m) m.innerHTML = methodsHTML();
    HB.mountQuote($('#quote-host'), {});
    if (location.hash === '#quote') { var q = $('#quote'); if (q) setTimeout(function () { q.scrollIntoView(); }, 60); }
  };
  R.about = function () {
    var a = HB.content.about;
    var bio = $('#bio'); if (bio) bio.innerHTML = a.bio.map(function (p) { return '<p>' + esc(L(p)) + '</p>'; }).join('');
    var sp = $('#specs'); if (sp) sp.innerHTML = a.specialities.map(function (s) { return '<span class="tag">' + esc(L(s)) + '</span>'; }).join('');
    var tl = $('#timeline'); if (tl) {
      tl.innerHTML = '<div class="tl-line" aria-hidden="true"></div>' + a.timeline.map(function (it, i) {
        return '<div class="tl-item"><div class="tl-year" data-editable="about.timeline.' + i + '.year">' + esc(numFmt(it.year)) + '</div><div class="tl-card"><h3 data-editable="about.timeline.' + i + '.title">' + esc(L(it.title)) + '</h3><p data-editable="about.timeline.' + i + '.text">' + esc(L(it.text)) + '</p></div></div>';
      }).join('');
      initTimeline(tl);
    }
    initFloat(a.software || []);
  };
  R.studio = function () { renderStudioList(); };

  /* timeline: scroll-reveal + growing line */
  var tlCleanup = null;
  function initTimeline(tl) {
    if (tlCleanup) tlCleanup();
    var items = $$('.tl-item', tl), line = $('.tl-line', tl);
    if (reduce || !('IntersectionObserver' in window)) { items.forEach(function (i) { i.classList.add('in'); }); line.style.height = '100%'; return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); } }); }, { threshold: .25, rootMargin: '0px 0px -12% 0px' });
    items.forEach(function (i) { io.observe(i); });
    var ticking = false;
    function upd() {
      ticking = false;
      var r = tl.getBoundingClientRect(), vh = window.innerHeight, p = (vh * .62 - r.top) / r.height;
      line.style.height = Math.max(0, Math.min(1, p)) * 100 + '%';
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }
    window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); upd();
    tlCleanup = function () { io.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }

  /* floating software monograms: drift, repel on hover, attract while pressed, slight parallax */
  function swSVG(s) {
    var c = s.color, id = 'g-' + s.id, shape;
    var grad = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".30"/><stop offset="1" stop-color="' + c + '" stop-opacity=".06"/></linearGradient></defs>';
    if (s.group === 'ai') shape = '<circle cx="34" cy="34" r="29" fill="#0d0d10" stroke="' + c + '" stroke-width="2"/><circle cx="34" cy="34" r="29" fill="url(#' + id + ')"/>';
    else if (s.group === '3d') shape = '<path d="M34 4 60 19v30L34 64 8 49V19z" fill="#0d0d10" stroke="' + c + '" stroke-width="2" stroke-linejoin="round"/><path d="M34 4 60 19v30L34 64 8 49V19z" fill="url(#' + id + ')"/>';
    else if (s.id === 'dr') shape = '<circle cx="34" cy="34" r="29" fill="#0d0d10" stroke="' + c + '" stroke-width="2"/><circle cx="34" cy="34" r="29" fill="url(#' + id + ')"/><circle cx="34" cy="34" r="19" fill="none" stroke="' + c + '" stroke-opacity=".5" stroke-width="1.5"/>';
    else shape = '<rect x="5" y="5" width="58" height="58" rx="14" fill="#0d0d10" stroke="' + c + '" stroke-width="2"/><rect x="5" y="5" width="58" height="58" rx="14" fill="url(#' + id + ')"/>';
    return '<svg viewBox="0 0 68 68" aria-hidden="true">' + grad + shape + '<text x="34" y="42" text-anchor="middle" font-family="Syne,Vazirmatn,sans-serif" font-weight="800" font-size="24" fill="' + c + '">' + esc(s.mono) + '</text></svg>';
  }
  var floatCleanup = null;
  function initFloat(list) {
    var wrap = $('#float'); if (!wrap) return;
    if (floatCleanup) floatCleanup();
    var hintTxt = UI('about.toolsHint');
    wrap.innerHTML = list.map(function (s) { return '<div class="sw" data-id="' + esc(s.id) + '">' + swSVG(s) + '<span>' + esc(s.name) + '</span></div>'; }).join('') +
      '<div class="sw-static">' + list.map(function (s) { return '<div class="sw static" style="position:static">' + swSVG(s) + '<span>' + esc(s.name) + '</span></div>'; }).join('') + '</div>' +
      '<div class="float-hint">' + esc(hintTxt) + '</div>';
    if (reduce) return;
    var nodes = $$('.sw:not(.static)', wrap), W = 0, H = 0, S = [], mouse = { x: -999, y: -999, in: false, down: false }, par = { x: 0, y: 0, tx: 0, ty: 0 }, raf = 0, vis = true, t0 = performance.now();
    function layout() {
      W = wrap.clientWidth; H = wrap.clientHeight;
      var n = nodes.length, cols = W < 520 ? 3 : (W < 900 ? 4 : 6), rows = Math.ceil(n / cols), cw = W / cols, rh = (H - 40) / rows;
      nodes.forEach(function (el, i) {
        var col = i % cols, row = Math.floor(i / cols), prev = S[i];
        var hx = cw * (col + .5) + ((i * 37) % 21 - 10), hy = 20 + rh * (row + .5) + ((i * 53) % 21 - 10);
        S[i] = { el: el, hx: hx, hy: hy, x: prev ? prev.x : hx, y: prev ? prev.y : hy, vx: 0, vy: 0, ph: i * 1.7, depth: .4 + (i % 4) * .22 };
      });
    }
    layout();
    function frame(now) {
      raf = requestAnimationFrame(frame); if (!vis) return;
      var t = (now - t0) / 1000;
      par.x += (par.tx - par.x) * .06; par.y += (par.ty - par.y) * .06;
      S.forEach(function (s) {
        var dx = Math.sin(t * .5 + s.ph) * 16, dy = Math.cos(t * .42 + s.ph * 1.3) * 14;
        var tx = s.hx + dx, ty = s.hy + dy;
        if (mouse.in) {
          var mx = mouse.x - (s.x + 46), my = mouse.y - (s.y + 46), d = Math.sqrt(mx * mx + my * my) || 1, R2 = 170;
          if (d < R2) { var f = (1 - d / R2); var k = mouse.down ? 1 : -1; s.vx += (mx / d) * f * 2.2 * k; s.vy += (my / d) * f * 2.2 * k; }
        }
        s.vx += (tx - s.x) * .012; s.vy += (ty - s.y) * .012; s.vx *= .9; s.vy *= .9; s.x += s.vx; s.y += s.vy;
        s.el.style.transform = 'translate3d(' + (s.x - 46 + par.x * 18 * s.depth) + 'px,' + (s.y - 46 + par.y * 14 * s.depth) + 'px,0)';
      });
    }
    function pos(e) { var r = wrap.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; par.tx = (mouse.x / r.width - .5) * 2; par.ty = (mouse.y / r.height - .5) * 2; }
    var onMove = function (e) { mouse.in = true; pos(e); }, onLeave = function () { mouse.in = false; mouse.down = false; par.tx = par.ty = 0; }, onDown = function (e) { mouse.in = true; mouse.down = true; pos(e); }, onUp = function () { mouse.down = false; };
    wrap.addEventListener('pointermove', onMove); wrap.addEventListener('pointerleave', onLeave); wrap.addEventListener('pointerdown', onDown); window.addEventListener('pointerup', onUp);
    var io = new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }); io.observe(wrap);
    window.addEventListener('resize', layout);
    raf = requestAnimationFrame(frame);
    floatCleanup = function () { cancelAnimationFrame(raf); io.disconnect(); wrap.removeEventListener('pointermove', onMove); wrap.removeEventListener('pointerleave', onLeave); wrap.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp); window.removeEventListener('resize', layout); };
  }

  /* studio fallback list view (also used when WebGL is missing) */
  function renderStudioList() {
    var host = $('#studio-list'); if (!host) return;
    host.innerHTML = '<div class="grid">' + projects().map(HB.cardHTML).join('') + '</div>'; reveal(host);
  }
  HB.renderStudioList = renderStudioList;


  /* ───────── store: prices, order sheet, product page ───────── */
  var ST = HB.store = {};
  var storeCfg = function () { return (HB.content && HB.content.tools && HB.content.tools.store) || {}; };
  ST.items = function () { return ((HB.content && HB.content.tools && HB.content.tools.items) || []); };
  ST.sellable = function (t) { return !!t && t.status === 'available' && +t.price > 0; };
  ST.products = function () { return ST.items().filter(ST.sellable); };
  ST.find = function (id) { var r = ST.items().filter(function (t) { return t.id === id; })[0]; return r || null; };
  ST.bundle = function () {
    var b = storeCfg().bundle; if (!b || !(+b.price > 0)) return null;
    var ids = (b.items || []).filter(function (id) { return ST.sellable(ST.find(id)); });
    if (ids.length < 2) return null;
    var o = {}; Object.keys(b).forEach(function (k) { o[k] = b[k]; }); o.items = ids; o.isBundle = true;
    var sT = 0, sU = 0; ids.forEach(function (id) { var p = ST.find(id); sT += +p.price; sU += +p.priceUsd; });
    o.saveTn = Math.max(0, sT - b.price); o.saveUsd = Math.max(0, sU - b.priceUsd);
    return o;
  };
  ST.get = function (id) { return id === 'bundle' ? ST.bundle() : (ST.sellable(ST.find(id)) ? ST.find(id) : null); };
  ST.toman = function (n) { var v = Number(n).toLocaleString('en-US'); if (HB.lang === 'fa') v = faDigits(v).replace(/,/g, '٬'); return v; };
  ST.tomanFull = function (n) { return ST.toman(n) + ' ' + UI('store.toman'); };
  ST.usd = function (n) { return '$' + Number(n).toLocaleString('en-US'); };
  ST.PLANS = ['1', '3', '12', 'life']; ST.plan = 'life';
  ST.planOf = function (p, plan) {
    var x = plan !== 'life' && p.plans && p.plans[plan];
    if (!x) return { tn: +p.price, usd: +p.priceUsd, wasTn: +p.regularPrice, wasUsd: +p.regularPriceUsd };
    return { tn: +x.price, usd: +x.usd, wasTn: Math.round(x.price * 1.3 / 1000) * 1000, wasUsd: Math.round(x.usd * 1.3) };
  };
  ST.saving = function (p, plan) { var sT = 0, sU = 0; (p.items || []).forEach(function (id) { var o = ST.planOf(ST.find(id), plan); sT += o.tn; sU += o.usd; }); var b = ST.planOf(p, plan); return { tn: Math.max(0, sT - b.tn), usd: Math.max(0, sU - b.usd) }; };
  ST.planLabel = function (plan) { return UI('plan.' + plan); };
  function regionRows(p, plan) {
    var o = ST.planOf(p, plan || 'life');
    var iran = { k: 'iran', label: UI('store.iran'), now: '<b>' + esc(ST.tomanFull(o.tn)) + '</b>', was: o.wasTn > o.tn ? '<s>' + esc(ST.toman(o.wasTn)) + '</s>' : '' };
    var intl = { k: 'intl', label: UI('store.intl'), now: '<b class="num">' + esc(ST.usd(o.usd)) + '</b>', was: o.wasUsd > o.usd ? '<s class="num">' + esc(ST.usd(o.wasUsd)) + '</s>' : '' };
    var rows = HB.lang === 'fa' ? [iran, intl] : [intl, iran];
    return rows.filter(function (r) { return r.k === 'iran' ? o.tn > 0 : o.usd > 0; });
  }
  function planSeg(p, plan, attr) {
    if (!(p.plans || p.isBundle)) return '';
    return '<div class="seg plan-seg" role="group" aria-label="' + esc(UI('plan.title')) + '">' + ST.PLANS.map(function (k) {
      return '<button type="button" ' + attr + '="' + k + '" aria-pressed="' + (k === plan) + '"><span>' + esc(UI('plan.' + k)) + '</span>' + (k === '12' ? '<em>' + esc(UI('plan.best')) + '</em>' : k === 'life' ? '<em class="alt">' + esc(UI('plan.lifeTag')) + '</em>' : '') + '</button>'; }).join('') + '</div>';
  }
  ST.priceHTML = function (p, opts) {
    opts = opts || {}; var plan = opts.noPlans ? 'life' : ST.plan, o = ST.planOf(p, plan);
    var rows = regionRows(p, plan).map(function (r) { return '<div class="price-row"><span class="rg">' + esc(r.label) + '</span><span class="pv">' + r.now + r.was + '</span></div>'; }).join('');
    var sv = p.isBundle ? ST.saving(p, plan) : null;
    var save = sv && (sv.tn > 0 || sv.usd > 0) ? '<div><span class="save-pill">' + esc(UI('store.save')) + ' ' + esc(ST.tomanFull(sv.tn)) + ' · <span class="num">' + esc(ST.usd(sv.usd)) + '</span></span></div>' : '';
    var from = opts.noPlans && p.plans && p.plans['1'] ? '<span class="price-lic">' + esc(UI('store.from').replace('{p}', HB.lang === 'fa' ? ST.tomanFull(p.plans['1'].price) : ST.usd(p.plans['1'].usd))) + '</span>' : '';
    return '<div class="price-box" data-pid="' + esc(p.id) + '"' + (opts.noPlans ? '' : ' data-plans="1"') + (opts.noBadge ? ' data-nobadge="1"' : '') + '>' + (opts.noBadge ? '' : '<div class="badges"><span class="badge launch"><i></i>' + esc(UI('store.launch')) + '</span></div>') + (opts.noPlans ? '' : planSeg(p, plan, 'data-plan')) + rows + '<span class="price-lic">' + esc(plan === 'life' ? UI('store.lifetime') : UI('plan.dur.' + plan)) + '</span>' + from + save + '</div>';
  };
  document.addEventListener('click', function (e) {
    var um = e.target.closest('[data-unmute]'); if (um) { var vd = um.parentNode.querySelector('video'); if (!vd) return; vd.muted = !vd.muted; if (!vd.muted) { vd.volume = 1; try { vd.play(); } catch (x) {} } um.setAttribute('aria-pressed', String(!vd.muted)); um.textContent = UI(vd.muted ? 'store.unmute' : 'store.mute'); return; }
    var b = e.target.closest('[data-plan]'); if (!b) return; ST.plan = b.getAttribute('data-plan');
    $$('.price-box[data-plans]').forEach(function (box) { var p = ST.get(box.getAttribute('data-pid')); if (!p) return; var t = document.createElement('div'); t.innerHTML = ST.priceHTML(p, { noBadge: !!box.getAttribute('data-nobadge') }); box.replaceWith(t.firstChild); });
  });
  ST.url = function (id) { return page('product.html') + '?id=' + encodeURIComponent(id); };
  function trialText(t) { return UI('store.trialNote').replace('{n}', numFmt(t.trialDays || 7)); }
  function buyBtns(p) {
    var h = '<button type="button" class="btn" data-buy="' + esc(p.id) + '">' + esc(UI(p.isBundle ? 'store.buyBundle' : 'store.buy')) + ' ' + IC.arr + '</button>';
    if (p.trial) h += '<button type="button" class="btn ghost" data-trial="' + esc(p.id) + '">' + esc(UI('store.trial')) + '</button>';
    return h;
  }

  /* order sheet: choose product, name + email, then WhatsApp / Telegram / email with a prefilled message */
  var OS = { id: '', trial: false, region: '', plan: 'life', name: '', email: '', opener: null };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function orderOptions() {
    var list = ST.products().filter(function (t) { return !OS.trial || t.trial; }).map(function (t) { return [t.id, L(t.name)]; });
    var b = !OS.trial && ST.bundle(); if (b) list.push(['bundle', L(b.name)]);
    return list;
  }
  function orderMessage() {
    var p = ST.get(OS.id); if (!p) return '';
    var intl = OS.region === 'intl', lines = [UI(OS.trial ? 'store.msg.trial' : 'store.msg.order'), ''];
    lines.push(UI('store.msg.product') + ': ' + L(p.name));
    if (p.isBundle) lines.push(UI('store.msg.bundleIncludes') + ': ' + p.items.map(function (id) { return L(ST.find(id).name); }).join(', '));
    if (OS.trial) lines.push(UI('store.msg.trialDays') + ': ' + trialText(p));
    else {
      var po = ST.planOf(p, OS.plan), bdi = function (x) { return HB.lang === 'fa' ? '\u2066' + x + '\u2069' : x; };
      lines.push(UI('store.msg.plan') + ': ' + UI('plan.' + OS.plan) + ' (' + (OS.plan === 'life' ? UI('store.lifetime') : UI('plan.dur.' + OS.plan)) + ')');
      lines.push(UI('store.msg.price') + ': ' + (intl ? bdi(ST.usd(po.usd)) : ST.tomanFull(po.tn)) + ' (' + UI('store.msg.launchPrice') + ')');
    }
    lines.push(UI('store.name') + ': ' + OS.name.trim(), UI('store.email') + ': ' + OS.email.trim(), '', UI(OS.trial ? 'store.msg.closeTrial' : 'store.msg.close'));
    return lines.join('\n');
  }
  function orderValid() { return OS.name.trim().length > 0 && EMAIL_RE.test(OS.email.trim()); }
  function sheetEls() {
    var sc = $('.sheet-scrim'), sh = $('.sheet');
    if (!sh) {
      sc = document.createElement('div'); sc.className = 'sheet-scrim';
      sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-labelledby', 'sheet-h');
      document.body.appendChild(sc); document.body.appendChild(sh);
      sc.addEventListener('click', function () { HB.closeOrder(); });
    }
    return { sc: sc, sh: sh };
  }
  function orderSummary() {
    var p = ST.get(OS.id); if (!p) return '';
    if (OS.trial) return '<div class="o-sum"><span class="t">' + esc(L(p.name)) + '</span><span class="price-lic">' + esc(trialText(p)) + '</span></div>';
    var intl = OS.region === 'intl', po = ST.planOf(p, OS.plan);
    var now = intl ? '<b class="num">' + esc(ST.usd(po.usd)) + '</b>' : '<b>' + esc(ST.tomanFull(po.tn)) + '</b>';
    var was = intl ? (po.wasUsd > po.usd ? '<s class="num">' + esc(ST.usd(po.wasUsd)) + '</s>' : '') : (po.wasTn > po.tn ? '<s>' + esc(ST.toman(po.wasTn)) + '</s>' : '');
    return '<div class="o-sum"><span class="t">' + esc(L(p.name)) + '</span><div class="price-row solo"><span class="pv">' + now + was + '</span><span class="badge launch"><i></i>' + esc(UI('store.launch')) + '</span></div><span class="price-lic">' + esc(OS.plan === 'life' ? UI('store.lifetime') : UI('plan.dur.' + OS.plan)) + '</span></div>';
  }
  function buildSheet(focus) {
    var e = sheetEls(), sh = e.sh, steps = storeCfg().steps || [];
    if (!OS.region) OS.region = HB.lang === 'fa' ? 'iran' : 'intl';
    var opts = orderOptions(); if (!opts.some(function (o) { return o[0] === OS.id; })) OS.id = opts[0] ? opts[0][0] : '';
    sh.innerHTML = '<div class="sheet-top"><div><h2 class="display" id="sheet-h">' + esc(UI(OS.trial ? 'store.trialTitle' : 'store.orderTitle')) + '</h2><p class="mute" style="margin-top:6px;font-size:.92rem">' + esc(UI('store.orderSub')) + '</p></div><button type="button" class="x" data-close-sheet aria-label="' + esc(UI('cta.close')) + '">' + IC.x + '</button></div>' +
      '<div class="fld"><label for="o-prod">' + esc(UI('store.product')) + '</label><select id="o-prod">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === OS.id ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      (OS.trial ? '' : '<div class="fld"><label id="o-reg-l">' + esc(UI('store.region')) + '</label><div class="seg" role="group" aria-labelledby="o-reg-l"><button type="button" data-region="iran" aria-pressed="' + (OS.region === 'iran') + '">' + esc(UI('store.iran')) + ' · ' + esc(UI('store.toman')) + '</button><button type="button" data-region="intl" aria-pressed="' + (OS.region === 'intl') + '">' + esc(UI('store.intl')) + ' · USD</button></div></div>') +
      (OS.trial ? '' : '<div class="fld"><label>' + esc(UI('plan.title')) + '</label>' + planSeg(ST.get(OS.id) || {}, OS.plan, 'data-oplan') + '</div>') +
      '<div id="o-sum">' + orderSummary() + '</div>' +
      '<div class="form-2"><div class="fld"><label for="o-name">' + esc(UI('store.name')) + '</label><input id="o-name" autocomplete="name" dir="auto" value="' + esc(OS.name) + '"></div><div class="fld"><label for="o-email">' + esc(UI('store.email')) + '</label><input id="o-email" type="email" inputmode="email" autocomplete="email" dir="ltr" value="' + esc(OS.email) + '"></div></div>' +
      '<span id="o-err" style="display:none;color:var(--bad);font-size:.86rem" role="alert">' + esc(UI('store.invalid')) + '</span>' +
      '<div><p class="mute" style="font:700 .7rem var(--f-ui);letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px">' + esc(UI('store.sendVia')) + '</p><div class="row"><a class="btn" id="o-wa" target="_blank" rel="noopener" href="#">' + esc(UI('label.whatsapp')) + '</a><button type="button" class="btn ghost" id="o-tg">' + esc(UI('label.telegram')) + '</button><a class="btn ghost" id="o-mail" href="#">' + esc(UI('label.email')) + '</a></div></div>' +
      '<p class="note">' + esc(UI('quote.tgNote')) + '</p><p class="note">' + esc(UI('store.payNote')) + '</p>' +
      (steps.length ? '<div class="o-steps">' + steps.map(function (st, i) { return '<span><b>' + esc(numFmt(i + 1)) + '.</b> ' + esc(L(st.title)) + '</span>'; }).join('') + '</div>' : '');
    syncSheet();
    if (focus) { var n = $('#o-name', sh); if (n) setTimeout(function () { try { n.focus({ preventScroll: true }); } catch (x) {} }, 150); }
  }
  function syncSheet() {
    var sh = $('.sheet'); if (!sh) return;
    var msg = orderMessage(), wa = $('#o-wa', sh), ml = $('#o-mail', sh);
    if (wa) wa.href = contact().whatsapp + '?text=' + encodeURIComponent(msg);
    if (ml) { var p = ST.get(OS.id); ml.href = 'mailto:' + contact().email + '?subject=' + encodeURIComponent(UI(OS.trial ? 'store.trial' : 'store.orderTitle') + ' — ' + (p ? L(p.name) : '')) + '&body=' + encodeURIComponent(msg); }
  }
  function checkOrder() {
    var ok = orderValid(), sh = $('.sheet'), er = $('#o-err', sh), n = $('#o-name', sh), m = $('#o-email', sh);
    if (er) er.style.display = ok ? 'none' : 'block';
    if (n) n.setAttribute('aria-invalid', String(!OS.name.trim()));
    if (m) m.setAttribute('aria-invalid', String(!EMAIL_RE.test(OS.email.trim())));
    if (!ok) { var f = !OS.name.trim() ? n : m; if (f) f.focus(); }
    return ok;
  }
  HB.openOrder = function (o) {
    o = o || {}; OS.opener = document.activeElement; OS.trial = !!o.trial; OS.plan = ST.plan; OS.id = o.id || OS.id || '';
    var p = ST.get(OS.id); if (OS.trial && !(p && p.trial)) OS.trial = false;
    var e = sheetEls(); buildSheet(true);
    requestAnimationFrame(function () { e.sh.classList.add('open'); e.sc.classList.add('open'); });
    document.body.style.overflow = 'hidden';
  };
  HB.closeOrder = function () {
    var sh = $('.sheet'), sc = $('.sheet-scrim'); if (!sh || !sh.classList.contains('open')) return;
    sh.classList.remove('open'); sc.classList.remove('open'); document.body.style.overflow = '';
    if (OS.opener && OS.opener.focus) { try { OS.opener.focus(); } catch (e) {} }
  };
  HB.onLang(function () { var sh = $('.sheet.open'); if (sh) buildSheet(false); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-buy]'); if (b) { e.preventDefault(); HB.openOrder({ id: b.getAttribute('data-buy') }); return; }
    var t = e.target.closest('[data-trial]'); if (t) { e.preventDefault(); HB.openOrder({ id: t.getAttribute('data-trial'), trial: true }); return; }
    if (e.target.closest('[data-close-sheet]')) { HB.closeOrder(); return; }
    var sh = e.target.closest('.sheet'); if (!sh) return;
    var op = e.target.closest('[data-oplan]');
    if (op) { OS.plan = op.getAttribute('data-oplan'); $$('[data-oplan]', sh).forEach(function (x) { x.setAttribute('aria-pressed', String(x === op)); }); $('#o-sum', sh).innerHTML = orderSummary(); syncSheet(); return; }
    var r = e.target.closest('[data-region]');
    if (r) { OS.region = r.getAttribute('data-region'); $$('[data-region]', sh).forEach(function (x) { x.setAttribute('aria-pressed', String(x === r)); }); $('#o-sum', sh).innerHTML = orderSummary(); syncSheet(); return; }
    if (e.target.closest('#o-wa') || e.target.closest('#o-mail')) { if (!checkOrder()) e.preventDefault(); return; }
    if (e.target.closest('#o-tg')) { if (!checkOrder()) return; copyText(orderMessage(), null, 'toast.msgCopied'); window.open(contact().telegramUser || contact().telegram, '_blank', 'noopener'); }
  });
  document.addEventListener('input', function (e) {
    if (!e.target.closest || !e.target.closest('.sheet')) return;
    if (e.target.id === 'o-name') OS.name = e.target.value; else if (e.target.id === 'o-email') OS.email = e.target.value; else return;
    e.target.setAttribute('aria-invalid', 'false'); syncSheet(); if (orderValid()) { var er = $('#o-err'); if (er) er.style.display = 'none'; }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'o-prod') return;
    OS.id = e.target.value; buildSheet(false); var pe = $('#o-prod'); if (pe) pe.focus();
  });
  document.addEventListener('keydown', function (e) {
    var sh = $('.sheet.open'); if (!sh) return;
    if (e.key === 'Escape') { e.stopPropagation(); HB.closeOrder(); return; }
    if (e.key === 'Tab') {
      var f = $$('a[href],button:not([disabled]),input,select', sh).filter(function (x) { return x.offsetParent !== null; }); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  function stepsHTML() {
    var steps = storeCfg().steps || []; if (!steps.length) return '';
    return '<div class="steps">' + steps.map(function (st, i) { return '<div class="step rv"><div class="n">' + esc(numFmt('0' + (i + 1))) + '</div><h3>' + esc(L(st.title)) + '</h3><p>' + esc(L(st.text)) + '</p></div>'; }).join('') + '</div>';
  }
  function bundleBand() {
    var b = ST.bundle(); if (!b) return '';
    return '<div class="bundle rv"><div><span class="badge launch"><i></i>' + esc(UI('store.launch')) + '</span><h2>' + esc(UI('store.bundleTitle')) + '</h2><p class="lead" style="font-size:1rem">' + esc(L(b.tagline)) + '</p><ul>' +
      b.items.map(function (id) { var t = ST.find(id); return '<li><a href="' + esc(ST.url(id)) + '">' + esc(L(t.name)) + '</a></li>'; }).join('') + '</ul></div>' +
      '<div class="buy">' + ST.priceHTML(b, { noBadge: true, noPlans: true }) + '<div class="tool-actions"><button type="button" class="btn" data-buy="bundle">' + esc(UI('store.buyBundle')) + ' ' + IC.arr + '</button></div></div></div>';
  }
  function toolVis(t) { return t.image ? '<img src="' + esc(img(t.image)) + '" alt="' + esc(L(t.name)) + '" loading="lazy">' : (TOOL_ICONS[t.icon] || TOOL_ICONS.glass); }

  function setMeta(sel, attr, val) { var el = $(sel); if (el) el.setAttribute(attr, val); }
  function productLD(t) {
    var url = ROOT + 'product.html?id=' + encodeURIComponent(t.id), tx = function (o) { return o && (o[HB.lang] || o.en) || ''; };
    var offers = [];
    if (+t.priceUsd > 0) offers.push({ '@type': 'Offer', price: String(t.priceUsd), priceCurrency: 'USD', availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition', url: url });
    if (+t.price > 0) offers.push({ '@type': 'Offer', price: String(Math.round(t.price * 10)), priceCurrency: 'IRR', availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition', url: url });
    return { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Product', name: tx(t.name), description: tx(t.metaDescription) || tx(t.description), sku: t.id, category: 'Software > Adobe plugin', image: [t.image ? img(t.image) : ROOT + 'content/media/portrait-1.jpg'], url: url, inLanguage: HB.lang, brand: { '@type': 'Brand', name: HB.content.site.studio || 'HB Studio' }, offers: offers },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: UI('nav.home'), item: ROOT },
        { '@type': 'ListItem', position: 2, name: UI('nav.tools'), item: ROOT + 'tools.html' },
        { '@type': 'ListItem', position: 3, name: tx(t.name), item: url }] }] };
  }
  function setLD(obj) {
    var el = $('#ld-product'); if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'ld-product'; document.head.appendChild(el); }
    el.textContent = JSON.stringify(obj);
  }
  R.product = function () {
    var host = $('#product'); if (!host) return;
    var id = new URLSearchParams(location.search).get('id'), t = id ? ST.find(id) : ST.products()[0];
    if (!t || !ST.sellable(t)) {
      host.innerHTML = '<div class="wrap page-head"><h1 class="display">' + esc(UI('store.notfound')) + '</h1><p class="lead"><a class="btn ghost" href="' + page('tools.html') + '">' + esc(UI('store.allTools')) + '</a></p></div>';
      document.title = UI('store.notfound'); var old = $('#ld-product'); if (old) old.remove(); return;
    }
    var c = HB.content, url = ROOT + 'product.html?id=' + encodeURIComponent(t.id), ttl = (L(t.metaTitle) || L(t.name)) + ' — ' + c.site.brand, desc = L(t.metaDescription) || L(t.description);
    document.title = ttl; setMeta('meta[name="description"]', 'content', desc); setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:title"]', 'content', ttl); setMeta('meta[property="og:description"]', 'content', desc); setMeta('meta[property="og:url"]', 'content', url);
    setLD(productLD(t));
    var cfg = storeCfg(), b = ST.bundle(), others = ST.products().filter(function (x) { return x.id !== t.id; });
    var demo = t.demo ? '<div class="vid demo-sq"><video src="' + esc(img(t.demo)) + '" autoplay muted loop playsinline preload="auto"' + (t.poster || t.image ? ' poster="' + esc(img(t.poster || t.image)) + '"' : '') + ' aria-label="' + esc(UI('store.demoNote')) + '"></video><button type="button" class="unmute" data-unmute aria-pressed="false">' + esc(UI('store.unmute')) + '</button><span class="demo-note">' + esc(UI('store.demoNote')) + '</span></div>' :
      '<div class="pd-poster" style="--h:' + esc(t.hue || 38) + '" role="img" aria-label="' + esc(UI('store.demoSoon')) + '">' + (TOOL_ICONS[t.icon] || TOOL_ICONS.glass) + '<div class="soon-tag"><span class="badge soon"><i></i>' + esc(UI('store.demoSoon')) + '</span></div></div>';
    var feats = (t.features || []).map(function (f, i) { return '<div class="tile rv"><div class="n">' + esc(numFmt('0' + (i + 1))) + '</div><h3>' + esc(L(f.title)) + '</h3><p>' + esc(L(f.text)) + '</p></div>'; }).join('');
    var reqs = [t.hosts].concat(cfg.requirements || []).filter(function (r) { return r && L(r); }).map(function (r) { return '<li>' + esc(L(r)) + '</li>'; }).join('');
    var inc = (cfg.includes || []).map(function (r) { return '<li>' + esc(L(r)) + '</li>'; }).join('');
    var faqs = (t.faq || []).concat(cfg.faq || []).map(function (q, i) { return '<details' + (i === 0 ? ' open' : '') + '><summary>' + esc(L(q.q)) + '</summary><p>' + esc(L(q.a)) + '</p></details>'; }).join('');
    var upsell = b ? '<div class="pbox"><h2>' + esc(UI('store.bundleTitle')) + '</h2><p class="mute" style="margin-bottom:14px">' + esc(L(b.tagline)) + '</p>' + ST.priceHTML(b, { noBadge: true, noPlans: true }) + '<div class="tool-actions" style="margin-top:16px"><button type="button" class="btn ghost" data-buy="bundle">' + esc(UI('store.buyBundle')) + '</button></div></div>' : '';
    host.innerHTML = '<section class="pd-hero"><div class="wrap"><div class="pd-grid"><div class="pd-copy"><a class="eyebrow" href="' + page('tools.html') + '">' + esc(UI('nav.tools')) + '</a>' +
      '<div class="badges"><span class="badge"><i></i>' + esc(UI('status.available')) + '</span><span class="badge soon"><i></i>' + esc(L(t.kind)) + '</span></div>' +
      '<h1 class="display">' + esc(L(t.name)) + '</h1><p class="lead">' + esc(L(t.tagline) || L(t.description)) + '</p>' + ST.priceHTML(t, { noPlans: true }) +
      '<div class="tool-actions">' + buyBtns(t) + '</div>' + (t.trial ? '<p class="note">' + esc(trialText(t)) + '</p>' : '') + '</div>' +
      '<div>' + demo + '</div></div></div></section>' +
      '<section class="wrap pd-sec"><h2 class="eyebrow">' + esc(UI('store.featuresTitle')) + '</h2><div class="pd-feats">' + feats + '</div></section>' +
      '<section class="wrap pd-sec"><div class="pd-cols"><div class="pcard"><h2>' + esc(UI('store.pricingTitle')) + '</h2>' + ST.priceHTML(t) + '<div class="tool-actions">' + buyBtns(t) + '</div><p class="note">' + esc(UI('store.payNote')) + '</p></div>' +
      '<div style="display:flex;flex-direction:column;gap:16px"><div class="pbox"><h2>' + esc(UI('store.getTitle')) + '</h2><ul class="plist">' + inc + '</ul></div><div class="pbox"><h2>' + esc(UI('store.reqTitle')) + '</h2><ul class="plist">' + reqs + '</ul></div>' + upsell + '</div></div></section>' +
      '<section class="wrap pd-sec"><h2 class="eyebrow">' + esc(UI('store.stepsTitle')) + '</h2>' + stepsHTML() + '</section>' +
      '<section class="wrap pd-sec"><h2 class="eyebrow">' + esc(UI('store.faqTitle')) + '</h2><div class="faq">' + faqs + '</div></section>' +
      (others.length ? '<section class="wrap pd-sec"><h2 class="eyebrow">' + esc(UI('store.more')) + '</h2><div class="pd-more">' + others.map(function (o) { return '<a href="' + esc(ST.url(o.id)) + '"><h3>' + esc(L(o.name)) + '</h3><p>' + esc(L(o.tagline) || L(o.description)) + '</p></a>'; }).join('') + '</div></section>' : '') +
      '<div class="wrap pd-sec" style="margin-bottom:clamp(20px,4vw,40px)"><a class="btn ghost" href="' + page('tools.html') + '">' + esc(UI('store.allTools')) + '</a></div>';
  };

  /* ───────── orchestrate ───────── */
  function renderAll() {
    applyLangAttrs();
    bind(); applyMeta(); renderChrome();
    if (R[PAGE]) R[PAGE]();
    reveal();
    // seo: keep canonical lang-neutral
  }
  HB.renderAll = renderAll;

  function intro() {
    if (reduce || !window.gsap) return;
    $$('[data-intro]').forEach(function (host) {
      var kids = Array.prototype.slice.call(host.querySelectorAll('.hero-copy > *, .page-head > *, .page-head .wrap > *')); if (!kids.length) return;
      window.gsap.from(kids, { y: 26, opacity: 0, duration: .9, stagger: .08, ease: 'power3.out', clearProps: 'transform,opacity' });
    });
    var st = $('.stage'); if (st) window.gsap.from(st, { opacity: 0, scale: .985, duration: 1.2, ease: 'power2.out', clearProps: 'transform,opacity' });
  }

  function boot() {
    HB.lang = readLang(); applyLangAttrs();
    fetch(ROOT + 'content/content.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (c) {
      HB.content = c; renderAll(); intro(); document.dispatchEvent(new CustomEvent('hb:ready'));
    }).catch(function (err) {
      HB.failed = true; HB.content = null;
      console.warn('[hb] content.json could not be loaded (' + err.message + '); showing the static English page. Serve the site over http(s).');
      HB.content = { ui: {}, contact: contact(), projects: [] }; renderChrome(); document.dispatchEvent(new CustomEvent('hb:ready'));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
