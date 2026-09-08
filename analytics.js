/*
  Google Analytics 4 event layer for erwinmongui.com
  --------------------------------------------------
  Requires the gtag.js snippet in <head> (G-LKD2WCNDV1). Every event goes
  through track(), so this file is the single place to see what is sent.

  Debugging: open the site with ?ga_debug=1 to print every event to the
  console and flag it for GA4 DebugView (Admin > DebugView). ?ga_debug=0
  turns it off again. The flag is remembered in localStorage.

  Events sent (see ANALYTICS.md for the full parameter reference):
    Navigation and clicks
      nav_click, cta_click, email_click, copy_email, outbound_click,
      certificate_click, file_download, anchor_click, link_click,
      skip_link_click, menu_toggle, skills_rail_nav, button_click,
      skill_chip_click, skill_tile_click, metric_click, role_click,
      context_menu
    Reading behaviour
      scroll_depth (10/25/50/75/90/100), section_view, section_exit,
      role_view, skill_tile_view, text_select, content_copy, content_cut,
      content_paste, print_page
    Session quality
      engaged_time (10/30/60/120/300/600 s active), page_exit,
      deep_link_arrival, keyboard_navigation, exception
*/
(function () {
  'use strict';

  var win = window;
  var doc = document;
  var t0 = Date.now();

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

  var counts = { clicks: 0, copies: 0, selects: 0 };

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

  /* ---------- sections ---------- */

  var SECTION_NAMES = {
    hero: 'Introduction', about: 'About', experience: 'Experience', impact: 'Impact',
    ai: 'AI', skills: 'Skills', education: 'Education', certifications: 'Certifications',
    contact: 'Contact', nav: 'Navigation', footer: 'Footer'
  };
  function sectionName(id) { return SECTION_NAMES[id] || id; }

  function sectionOf(el) {
    if (!el || !el.closest) return 'page';
    var s = el.closest('section[id], header#nav, footer');
    if (!s) return 'page';
    if (s.tagName === 'FOOTER') return 'footer';
    return s.id || 'page';
  }

  var sections = Array.prototype.slice.call(doc.querySelectorAll('main section[id]'));
  var currentSection = sections.length ? sections[0].id : 'page';
  var seen = {};          // section id -> true once viewed
  var dwell = {};         // section id -> total seconds visible
  var visibleSince = {};  // section id -> timestamp while visible
  var paused = {};        // section ids that were visible when the tab was hidden

  /* ---------- user context ---------- */

  function mq(q) { try { return win.matchMedia(q).matches; } catch (e) { return false; } }
  if (typeof win.gtag === 'function') {
    win.gtag('set', 'user_properties', {
      reduced_motion: mq('(prefers-reduced-motion: reduce)') ? 'true' : 'false',
      color_scheme: mq('(prefers-color-scheme: dark)') ? 'dark' : 'light',
      pointer_type: mq('(pointer: coarse)') ? 'coarse' : 'fine'
    });
  }

  if (location.hash && location.hash.length > 1) {
    track('deep_link_arrival', { section_id: location.hash.slice(1), section_name: sectionName(location.hash.slice(1)) });
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

  function trackLink(a, section) {
    var href = a.getAttribute('href') || '';
    var text = clip(a.textContent || a.getAttribute('aria-label') || '');
    var isMail = /^mailto:/i.test(href);
    var isTel = /^tel:/i.test(href);
    var isHash = href.charAt(0) === '#';
    var outbound = !isMail && !isTel && !isHash && !!a.hostname && a.hostname !== location.hostname;
    var isCta = a.classList.contains('btn') || a.classList.contains('nav-cta');

    var common = { link_text: text, link_url: clip(a.href || href), section: section };
    if (isCta) common.is_cta = true;
    if (outbound) { common.outbound = true; common.link_domain = a.hostname.replace(/^www\./, ''); }

    if (a.hasAttribute('download')) {
      var file = (a.pathname || '').split('/').pop();
      return track('file_download', assign(common, {
        file_name: file,
        file_extension: (file.indexOf('.') > -1 ? file.split('.').pop() : '').toLowerCase()
      }));
    }
    if (isMail) {
      return track('email_click', assign(common, {
        method: 'mailto_link',
        email_address: href.replace(/^mailto:/i, '').split('?')[0]
      }));
    }
    if (isTel) return track('phone_click', common);
    if (a.classList.contains('skip')) return track('skip_link_click', common);
    if (a.closest('#nav-links') || a.classList.contains('brand')) {
      return track('nav_click', assign(common, {
        target_section: isHash ? href.slice(1) : '',
        nav_item: a.classList.contains('brand') ? 'brand' : text
      }));
    }
    if (section === 'certifications' && outbound) {
      return track('certificate_click', assign(common, certificateInfo(a)));
    }
    if (isCta) {
      var style = a.classList.contains('nav-cta') ? 'nav' :
        a.classList.contains('btn-primary') ? 'primary' :
        a.classList.contains('btn-ghost') ? 'ghost' :
        a.classList.contains('btn-outline') ? 'outline' : 'other';
      return track('cta_click', assign(common, {
        cta_style: style,
        target_section: isHash ? href.slice(1) : ''
      }));
    }
    if (outbound) return track('outbound_click', common);
    if (isHash) return track('anchor_click', assign(common, { target_section: href.slice(1) }));
    return track('link_click', common);
  }

  function trackButton(btn, section) {
    if (btn.id === 'copy-email') {
      return track('copy_email', {
        section: section,
        email_address: btn.getAttribute('data-email') || '',
        method: (navigator.clipboard && navigator.clipboard.writeText) ? 'clipboard' : 'mailto_fallback'
      });
    }
    if (btn.id === 'menu-btn') {
      return track('menu_toggle', { action: btn.getAttribute('aria-expanded') === 'true' ? 'close' : 'open' });
    }
    if (btn.classList.contains('rail-btn')) {
      return track('skills_rail_nav', { direction: btn.id === 'rail-prev' ? 'previous' : 'next', section: section });
    }
    return track('button_click', {
      button_id: btn.id || '',
      button_text: clip(btn.textContent || btn.getAttribute('aria-label') || ''),
      section: section
    });
  }

  function headingOf(el) {
    var h = el && el.querySelector('h3, h2');
    return h ? clip(h.textContent) : '';
  }

  doc.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var el = target.closest('a, button, .chip, .tile, .metric, .role, .edu, .ai');
    if (!el) return;
    counts.clicks++;
    var section = sectionOf(el);

    if (el.tagName === 'A') return trackLink(el, section);
    if (el.tagName === 'BUTTON') return trackButton(el, section);

    /* Non-interactive things people click anyway. Useful for spotting "dead clicks". */
    if (el.classList.contains('chip')) {
      var card = el.closest('.tile, .ai');
      return track('skill_chip_click', { chip_text: clip(el.textContent), card_title: headingOf(card), section: section });
    }
    if (el.classList.contains('tile')) {
      return track('skill_tile_click', { tile_name: headingOf(el), section: section });
    }
    if (el.classList.contains('metric')) {
      var num = el.querySelector('.metric-num');
      var label = el.querySelector('.metric-label');
      return track('metric_click', { metric_value: num ? clip(num.textContent) : '', metric_label: label ? clip(label.textContent) : '', section: section });
    }
    if (el.classList.contains('role')) {
      var co = el.querySelector('.role-company');
      var ti = el.querySelector('.role-title');
      return track('role_click', { company: co ? clip(co.textContent) : '', role_title: ti ? clip(ti.textContent) : '', section: section });
    }
    if (el.classList.contains('edu') || el.classList.contains('ai')) {
      return track('card_click', { card_title: headingOf(el), section: section });
    }
  }, true);

  doc.addEventListener('contextmenu', function (e) {
    var t = e.target;
    var link = t && t.closest ? t.closest('a') : null;
    track('context_menu', {
      section: sectionOf(t),
      target_element: t && t.tagName ? t.tagName.toLowerCase() : '',
      on_link: !!link,
      link_url: link ? clip(link.href) : ''
    });
  });

  /* ---------- scroll depth ---------- */

  var MARKS = [10, 25, 50, 75, 90, 100];
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
  function onScroll() {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(function () {
      scrollTick = false;
      var p = scrollPercent();
      if (p > maxScroll) maxScroll = p;
      for (var i = 0; i < MARKS.length; i++) {
        var m = MARKS[i];
        if (!marksFired[m] && p >= m) {
          marksFired[m] = true;
          track('scroll_depth', { percent_scrolled: m, seconds_since_load: since(), section: currentSection, section_name: sectionName(currentSection) });
        }
      }
    });
  }
  win.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- section view and dwell time ---------- */

  function closeDwell(id, sendExit) {
    if (!visibleSince[id]) return;
    var sec = (Date.now() - visibleSince[id]) / 1000;
    delete visibleSince[id];
    dwell[id] = (dwell[id] || 0) + sec;
    if (sendExit && sec >= 1) {
      track('section_exit', {
        section_id: id,
        section_name: sectionName(id),
        time_in_section_sec: Math.round(sec),
        total_time_in_section_sec: Math.round(dwell[id]),
        scroll_percent: scrollPercent()
      });
    }
  }

  var supportsIO = 'IntersectionObserver' in win;

  if (supportsIO && sections.length) {
    /* A section counts as "current" while it crosses the middle band of the viewport,
       so tall sections still register and only one section is current at a time. */
    var sectionIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var id = en.target.id;
        if (en.isIntersecting) {
          currentSection = id;
          if (doc.visibilityState !== 'hidden') visibleSince[id] = Date.now();
          else paused[id] = true;
          if (!seen[id]) {
            seen[id] = true;
            track('section_view', {
              section_id: id,
              section_name: sectionName(id),
              section_index: sections.indexOf(en.target) + 1,
              seconds_since_load: since(),
              scroll_percent: scrollPercent()
            });
          }
        } else {
          delete paused[id];
          closeDwell(id, true);
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
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
        var when = en.target.querySelector('.role-when');
        track('role_view', {
          company: co ? clip(co.textContent) : '',
          role_title: ti ? clip(ti.textContent) : '',
          role_period: when ? clip(when.textContent) : '',
          role_index: roles.indexOf(en.target) + 1,
          seconds_since_load: since()
        });
      });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
    roles.forEach(function (r) { roleIO.observe(r); });
  }

  /* ---------- skills rail tiles ---------- */

  var rail = doc.getElementById('rail');
  var skillsSection = doc.getElementById('skills');
  if (supportsIO && rail && skillsSection) {
    var tiles = Array.prototype.slice.call(rail.querySelectorAll('.tile'));
    var tileSeen = [];
    var skillsOnScreen = false;
    var tileIO = null;

    function checkTiles(entries) {
      if (!skillsOnScreen) return;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        tileIO.unobserve(en.target);
        if (tileSeen.indexOf(en.target) > -1) return;
        tileSeen.push(en.target);
        track('skill_tile_view', {
          tile_name: headingOf(en.target),
          tile_index: tiles.indexOf(en.target) + 1,
          section: 'skills'
        });
      });
    }

    var skillsIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        skillsOnScreen = en.isIntersecting;
        if (skillsOnScreen && !tileIO) {
          tileIO = new IntersectionObserver(checkTiles, { root: rail, threshold: 0.6 });
          tiles.forEach(function (t) { tileIO.observe(t); });
        } else if (skillsOnScreen && tileIO) {
          /* Re-evaluate tiles that are in view when the section scrolls back in. */
          tiles.forEach(function (t) {
            if (tileSeen.indexOf(t) > -1) return;
            tileIO.unobserve(t); tileIO.observe(t);
          });
        }
      });
    }, { threshold: 0.4 });
    skillsIO.observe(rail);
  }

  /* ---------- copy, cut, paste, selection ---------- */

  function selectionInfo() {
    var sel = win.getSelection ? win.getSelection() : null;
    var text = sel ? String(sel) : '';
    var node = sel && sel.anchorNode;
    var el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
    return { text: text.replace(/\s+/g, ' ').trim(), section: sectionOf(el) };
  }

  function clipboardHandler(name) {
    return function () {
      var info = selectionInfo();
      counts.copies++;
      track(name, {
        section: info.section,
        section_name: sectionName(info.section),
        text_length: info.text.length,
        word_count: info.text ? info.text.split(' ').length : 0,
        text_preview: clip(info.text),
        contains_email: /@/.test(info.text)
      });
    };
  }
  doc.addEventListener('copy', clipboardHandler('content_copy'));
  doc.addEventListener('cut', clipboardHandler('content_cut'));
  doc.addEventListener('paste', function (e) {
    var t = e.target;
    /* Never send the pasted content itself: it comes from the visitor's clipboard. */
    track('content_paste', {
      section: sectionOf(t),
      target_element: t && t.tagName ? t.tagName.toLowerCase() : ''
    });
  });

  var selTimer = null;
  var lastSelection = '';
  var SELECT_MIN_CHARS = 20;
  var SELECT_MAX_EVENTS = 15;
  doc.addEventListener('selectionchange', function () {
    clearTimeout(selTimer);
    selTimer = setTimeout(function () {
      var info = selectionInfo();
      if (info.text.length < SELECT_MIN_CHARS || info.text === lastSelection || counts.selects >= SELECT_MAX_EVENTS) return;
      lastSelection = info.text;
      counts.selects++;
      track('text_select', {
        section: info.section,
        section_name: sectionName(info.section),
        text_length: info.text.length,
        word_count: info.text.split(' ').length,
        text_preview: clip(info.text)
      });
    }, 900);
  });

  /* ---------- engaged time (only while the tab is visible and the visitor is not idle) ---------- */

  var activeSeconds = 0;
  var lastInput = Date.now();
  var IDLE_MS = 60000;
  var MILESTONES = [10, 30, 60, 120, 300, 600];
  var milestonesFired = {};

  ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'wheel'].forEach(function (ev) {
    doc.addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true, capture: true });
  });

  setInterval(function () {
    if (doc.visibilityState === 'hidden') return;
    if (Date.now() - lastInput > IDLE_MS) return;
    activeSeconds++;
    for (var i = 0; i < MILESTONES.length; i++) {
      var m = MILESTONES[i];
      if (!milestonesFired[m] && activeSeconds >= m) {
        milestonesFired[m] = true;
        track('engaged_time', { seconds: m, max_scroll_percent: maxScroll, section: currentSection, section_name: sectionName(currentSection) });
      }
    }
  }, 1000);

  /* ---------- page exit summary ---------- */

  var hiddenCount = 0;
  var exitSent = false;

  function pageExit(reason) {
    if (exitSent) return;
    exitSent = true;
    var currentDwell = visibleSince[currentSection] ? (Date.now() - visibleSince[currentSection]) / 1000 : 0;
    track('page_exit', {
      reason: reason,
      max_scroll_percent: maxScroll,
      active_seconds: activeSeconds,
      seconds_since_load: since(),
      sections_viewed: Object.keys(seen).length,
      exit_section: currentSection,
      exit_section_name: sectionName(currentSection),
      time_in_exit_section_sec: Math.round((dwell[currentSection] || 0) + currentDwell),
      hidden_count: hiddenCount,
      click_count: counts.clicks,
      copy_count: counts.copies,
      select_count: counts.selects
    });
  }

  doc.addEventListener('visibilitychange', function () {
    if (doc.visibilityState === 'hidden') {
      hiddenCount++;
      Object.keys(visibleSince).forEach(function (id) { paused[id] = true; closeDwell(id, false); });
      pageExit('tab_hidden');
    } else {
      Object.keys(paused).forEach(function (id) { visibleSince[id] = Date.now(); });
      paused = {};
      exitSent = false;
    }
  });
  win.addEventListener('pagehide', function () { pageExit('pagehide'); });

  /* ---------- misc signals ---------- */

  win.addEventListener('beforeprint', function () {
    track('print_page', { section: currentSection, max_scroll_percent: maxScroll });
  });

  var keyboardTracked = false;
  doc.addEventListener('keydown', function (e) {
    if (keyboardTracked || e.key !== 'Tab') return;
    keyboardTracked = true;
    track('keyboard_navigation', { section: currentSection });
  });

  win.addEventListener('error', function (e) {
    var where = (e.filename || '').split('/').pop();
    track('exception', {
      description: clip((e.message || 'Script error') + ' @ ' + where + ':' + (e.lineno || 0)),
      fatal: false
    });
  });
  win.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    track('exception', {
      description: clip('Unhandled promise rejection: ' + ((r && r.message) || r)),
      fatal: false
    });
  });
})();
