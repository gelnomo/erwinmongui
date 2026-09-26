/*
  Google Analytics 4 event layer for erwinmongui.com
  --------------------------------------------------
  Requires the gtag.js snippet in <head> (G-LKD2WCNDV1). The snippet also sets
  window.siteContext (content_group, content_id, site_language), which gtag
  attaches to every hit. Every event goes through track(), so this file is the
  single place to see what is sent. ANALYTICS.md has the parameter reference
  and the GA4 admin setup.

  Debugging: open the site with ?ga_debug=1 to print every event to the
  console and flag it for GA4 DebugView (Admin > DebugView). ?ga_debug=0
  turns it off again. The flag is remembered in localStorage.

  Events sent:
    Key events
      generate_lead            email or LinkedIn click (method, section)
      preferred_source_click   Google preferred sources button or link
    Navigation
      nav_click, cta_click, link_click, outbound_click, certificate_click,
      language_switch, menu_toggle
    Reading
      section_view, role_view, scroll_depth (25/50/75/100), article_read,
      content_copy, dead_click
    Session quality
      page_exit, exception
  The 404 page also sends page_not_found from its own script.
*/
(function () {
  'use strict';

  var win = window;
  var doc = document;
  var t0 = Date.now();
  var ctx = win.siteContext || {};
  var lang = (doc.documentElement.lang || 'en').slice(0, 2);

  /* ---------- helpers ---------- */

  function lsGet(k) { try { return win.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === null) win.localStorage.removeItem(k); else win.localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  if (/[?&]ga_debug=1(&|$)/.test(location.search)) lsSet('ga_debug', '1');
  if (/[?&]ga_debug=0(&|$)/.test(location.search)) lsSet('ga_debug', null);
  var DEBUG = lsGet('ga_debug') === '1';

  function since() { return Math.round((Date.now() - t0) / 1000); }

  /* GA4 caps string parameter values at 100 characters. */
  function clip(s, n) {
    s = (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim();
    n = n || 100;
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }

  var counts = { clicks: 0, copies: 0 };

  function track(name, params) {
    params = params || {};
    for (var k in params) {
      if (params[k] === undefined || params[k] === null || params[k] === '') delete params[k];
    }
    if (DEBUG) {
      params.debug_mode = true;
      try { console.debug('[ga4] ' + name, params); } catch (e) { /* ignore */ }
    }
    if (typeof win.gtag === 'function') win.gtag('event', name, params);
  }

  /* ---------- sections ----------
     The homepage has <section id> blocks. Case studies and articles have none,
     so their <h2> headings inside .prose act as sections. */

  var SECTION_NAMES = {
    hero: 'Introduction', about: 'About', experience: 'Experience', impact: 'Impact',
    ai: 'AI', skills: 'Skills', education: 'Education', certifications: 'Certifications',
    facts: 'Quick facts', contact: 'Contact', nav: 'Navigation', footer: 'Footer',
    'case-studies': 'Case studies', writing: 'Writing', casos: 'Case studies',
    'preferred-source': 'Preferred sources strip'
  };

  function slug(s) {
    return clip(s, 60).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  var sections = Array.prototype.slice.call(doc.querySelectorAll('main section[id]'));
  var headingMode = false;
  if (!sections.length) {
    sections = Array.prototype.slice.call(doc.querySelectorAll('main .prose h2'));
    headingMode = sections.length > 0;
  }
  function idOf(el) { return el.id || (headingMode ? slug(el.textContent) : ''); }
  function nameOf(el) { return headingMode ? clip(el.textContent) : (SECTION_NAMES[el.id] || el.id); }
  function sectionName(id) {
    for (var i = 0; i < sections.length; i++) if (idOf(sections[i]) === id) return nameOf(sections[i]);
    return SECTION_NAMES[id] || id;
  }

  /* Where on the page an element sits: nav, footer, a homepage section, the
     preferred sources strip, or the article heading it follows. */
  function sectionOf(el) {
    if (!el || !el.closest) return 'page';
    if (el.closest('header#nav, .nav')) return 'nav';
    if (el.closest('footer')) return 'footer';
    if (el.closest('.ps-strip')) return 'preferred-source';
    var s = el.closest('section[id]');
    if (s) return s.id;
    if (headingMode) {
      var last = '';
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) last = idOf(sections[i]);
      }
      if (last) return last;
    }
    return 'page';
  }

  var currentSection = 'page';
  var seen = {};

  /* ---------- user context ---------- */

  function mq(q) { try { return win.matchMedia(q).matches; } catch (e) { return false; } }
  if (typeof win.gtag === 'function') {
    win.gtag('set', 'user_properties', {
      reduced_motion: mq('(prefers-reduced-motion: reduce)') ? 'true' : 'false',
      color_scheme: mq('(prefers-color-scheme: dark)') ? 'dark' : 'light',
      pointer_type: mq('(pointer: coarse)') ? 'coarse' : 'fine'
    });
  }

  /* ---------- clicks (delegated, capture phase so we see state before other handlers change it) ---------- */

  function certificateInfo(a) {
    var li = a.closest('li');
    var span = li && li.querySelector('span');
    var meta = span ? span.textContent : '';
    var comma = meta.indexOf(',');
    var group = a.closest('.cert-group');
    var h3 = group && group.querySelector('h3');
    return {
      certificate_name: clip(a.textContent),
      provider: clip(comma > -1 ? meta.slice(0, comma) : meta),
      issued: clip(comma > -1 ? meta.slice(comma + 1) : ''),
      certificate_group: h3 ? clip(h3.textContent) : ''
    };
  }

  /* Card links wrap a whole teaser; their heading is the useful label. */
  function linkLabel(a) {
    var h = a.querySelector('h2, h3, h4');
    return clip(h ? h.textContent : (a.textContent || a.getAttribute('aria-label') || ''));
  }

  function trackLink(a, section) {
    var href = a.getAttribute('href') || '';
    var isMail = /^mailto:/i.test(href);
    var isHash = href.charAt(0) === '#';
    var host = (a.hostname || '').replace(/^www\./, '');
    var outbound = !isMail && !isHash && !!a.hostname && a.hostname !== location.hostname;
    var common = { link_text: linkLabel(a), section: section };

    /* Contact: the address itself is never sent. */
    if (isMail) return track('generate_lead', assign(common, { method: 'email' }));
    if (host === 'linkedin.com' && /^\/in\//.test(a.pathname)) {
      return track('generate_lead', assign(common, { method: 'linkedin', link_url: clip(a.href) }));
    }
    if (host === 'google.com' && /^\/preferences\/source/.test(a.pathname)) {
      return track('preferred_source_click', assign(common, { method: 'link' }));
    }

    common.link_url = clip(a.href || href);
    var hreflang = a.getAttribute('hreflang');
    if (a.classList.contains('nav-lang') || (hreflang && hreflang.slice(0, 2) !== lang)) {
      return track('language_switch', assign(common, { from_language: lang, to_language: (hreflang || '').slice(0, 2) }));
    }
    if (a.classList.contains('skip')) return;
    if (a.closest('#nav-links') || a.classList.contains('brand')) {
      return track('nav_click', assign(common, {
        nav_item: a.classList.contains('brand') ? 'brand' : common.link_text,
        target_section: isHash ? href.slice(1) : ''
      }));
    }
    if (section === 'certifications' && outbound) {
      return track('certificate_click', assign(common, certificateInfo(a)));
    }
    if (a.classList.contains('btn') || a.classList.contains('nav-cta')) {
      var style = a.classList.contains('nav-cta') ? 'nav' :
        a.classList.contains('btn-primary') ? 'primary' :
        a.classList.contains('btn-ghost') ? 'ghost' :
        a.classList.contains('btn-outline') ? 'outline' : 'other';
      return track('cta_click', assign(common, { cta_style: style, target_section: isHash ? href.slice(1) : '' }));
    }
    if (outbound) return track('outbound_click', assign(common, { link_domain: host }));
    return track('link_click', assign(common, { target_section: isHash ? href.slice(1) : '' }));
  }

  function headingOf(el) {
    var h = el && el.querySelector('h3, h2');
    return h ? clip(h.textContent) : '';
  }

  /* Things that look clickable but are not links. High counts mean they
     should become links or expanders. */
  function deadClickLabel(el) {
    if (el.classList.contains('chip')) return ['skill_chip', clip(el.textContent)];
    if (el.classList.contains('tile')) return ['skill_tile', headingOf(el)];
    if (el.classList.contains('metric')) {
      var num = el.querySelector('.metric-num');
      var label = el.querySelector('.metric-label');
      return ['metric', clip((num ? num.textContent : '') + ' ' + (label ? label.textContent : ''))];
    }
    if (el.classList.contains('role')) {
      var co = el.querySelector('.role-company');
      var ti = el.querySelector('.role-title');
      return ['role', clip((co ? co.textContent : '') + ' · ' + (ti ? ti.textContent : ''))];
    }
    return [el.classList.contains('edu') ? 'education' : 'ai_card', headingOf(el)];
  }

  doc.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || !target.closest) return;

    /* Google's button renders in a shadow root; the click reaches us on its host. */
    var ps = target.closest('[google-add-preferred-source-btn]');
    if (ps) {
      counts.clicks++;
      return track('preferred_source_click', { method: 'button', section: sectionOf(ps) });
    }

    var el = target.closest('a, button, .chip, .tile, .metric, .role, .edu, .ai');
    if (!el) return;
    counts.clicks++;
    var section = sectionOf(el);

    if (el.tagName === 'A') return trackLink(el, section);
    if (el.tagName === 'BUTTON') {
      if (el.id === 'menu-btn') {
        return track('menu_toggle', { action: el.getAttribute('aria-expanded') === 'true' ? 'close' : 'open' });
      }
      return;
    }
    var info = deadClickLabel(el);
    track('dead_click', { element_type: info[0], element_label: info[1], section: section });
  }, true);

  /* ---------- scroll depth ---------- */

  var MARKS = [25, 50, 75, 100];
  var marksFired = {};
  var maxScroll = 0;

  function scrollPercent() {
    var d = doc.documentElement;
    var total = Math.max(d.scrollHeight, doc.body ? doc.body.scrollHeight : 0) - win.innerHeight;
    if (total <= 0) return 100;
    var y = win.scrollY || win.pageYOffset || 0;
    return Math.max(0, Math.min(100, Math.round((y / total) * 100)));
  }

  var scrollTick = false;
  var scrolled = false;
  function onScroll() {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(function () {
      scrollTick = false;
      var p = scrollPercent();
      if (p > maxScroll) maxScroll = p;
      /* Wait for a real scroll, so short pages don't report 100% on load. */
      if (!scrolled) return;
      for (var i = 0; i < MARKS.length; i++) {
        var m = MARKS[i];
        if (!marksFired[m] && p >= m) {
          marksFired[m] = true;
          track('scroll_depth', { percent_scrolled: m, seconds_since_load: since(), section: currentSection });
        }
      }
    });
  }
  win.addEventListener('scroll', function () { scrolled = true; onScroll(); }, { passive: true });
  onScroll();

  /* ---------- section views ---------- */

  var supportsIO = 'IntersectionObserver' in win;

  if (supportsIO && sections.length) {
    /* Homepage sections count while they cross the middle band of the viewport.
       Article headings count once they reach the upper half. */
    var sectionIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = idOf(en.target);
        currentSection = id;
        if (seen[id]) return;
        seen[id] = true;
        track('section_view', {
          section_id: id,
          section_name: nameOf(en.target),
          section_index: sections.indexOf(en.target) + 1,
          seconds_since_load: since()
        });
      });
    }, { rootMargin: headingMode ? '0px 0px -50% 0px' : '-45% 0px -45% 0px', threshold: 0 });
    sections.forEach(function (s) { sectionIO.observe(s); });
  }

  /* ---------- experience roles ---------- */

  var roles = Array.prototype.slice.call(doc.querySelectorAll('.role'));
  if (supportsIO && roles.length) {
    var roleIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        roleIO.unobserve(en.target);
        var co = en.target.querySelector('.role-company');
        var ti = en.target.querySelector('.role-title');
        track('role_view', {
          company: co ? clip(co.textContent) : '',
          role_title: ti ? clip(ti.textContent) : '',
          role_index: roles.indexOf(en.target) + 1
        });
      });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
    roles.forEach(function (r) { roleIO.observe(r); });
  }

  /* ---------- copy ---------- */

  doc.addEventListener('copy', function () {
    var sel = win.getSelection ? win.getSelection() : null;
    var text = sel ? String(sel).replace(/\s+/g, ' ').trim() : '';
    var node = sel && sel.anchorNode;
    var el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
    counts.copies++;
    track('content_copy', {
      section: sectionOf(el),
      text_length: text.length,
      text_preview: clip(text)
    });
  });

  /* ---------- active time (tab visible and the visitor not idle for a minute) ---------- */

  var activeSeconds = 0;
  var lastInput = Date.now();
  var IDLE_MS = 60000;

  ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'wheel'].forEach(function (ev) {
    doc.addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true, capture: true });
  });

  setInterval(function () {
    if (doc.visibilityState === 'hidden') return;
    if (Date.now() - lastInput > IDLE_MS) return;
    activeSeconds++;
  }, 1000);

  /* ---------- article read ----------
     Sent once when a case study or article reader reaches the end of the text.
     read_type is "read" when the active time is at least 40% of the expected
     reading time (230 words a minute), otherwise "skim". */

  var prose = doc.querySelector('main .prose');
  if (supportsIO && prose && /^(Case study|Article)$/.test(ctx.content_group || '')) {
    var words = (prose.textContent || '').trim().split(/\s+/).length;
    var expected = Math.round(words / 230 * 60);
    var end = doc.createElement('span');
    end.setAttribute('aria-hidden', 'true');
    prose.appendChild(end);
    var endIO = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      endIO.disconnect();
      track('article_read', {
        read_type: activeSeconds >= expected * 0.4 ? 'read' : 'skim',
        word_count: words,
        active_seconds: activeSeconds,
        expected_seconds: expected
      });
    });
    endIO.observe(end);
  }

  /* ---------- page exit summary (once per page view) ---------- */

  var exitSent = false;
  function pageExit(reason) {
    if (exitSent) return;
    exitSent = true;
    track('page_exit', {
      reason: reason,
      max_scroll_percent: maxScroll,
      active_seconds: activeSeconds,
      sections_viewed: Object.keys(seen).length,
      exit_section: currentSection,
      exit_section_name: sectionName(currentSection),
      click_count: counts.clicks,
      copy_count: counts.copies
    });
  }
  doc.addEventListener('visibilitychange', function () {
    if (doc.visibilityState === 'hidden') pageExit('tab_hidden');
  });
  win.addEventListener('pagehide', function () { pageExit('pagehide'); });

  /* ---------- script errors on this site ----------
     Errors from other origins (ads, Clarity, Google's button) arrive as a bare
     "Script error." with no file, and we cannot fix them, so they are skipped. */

  win.addEventListener('error', function (e) {
    var file = e.filename || '';
    if (!file || file.indexOf(location.origin) !== 0) return;
    track('exception', {
      description: clip((e.message || 'Script error') + ' @ ' + file.split('/').pop() + ':' + (e.lineno || 0)),
      fatal: false
    });
  });
})();
