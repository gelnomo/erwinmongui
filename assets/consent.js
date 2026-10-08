/*
  Consent bridge for every page of erwinmongui.com.

  Google's consent message (AdSense > Privacy & messaging) asks visitors in the
  EEA, the UK and Switzerland for consent and updates Google Consent Mode for
  Analytics and AdSense by itself. This file does the two things it does not:

  - Passes the visitor's choice to Microsoft Clarity with its consent API.
    Clarity's analytics storage follows TCF purposes 1 (store information on
    the device) and 8 (measure content performance); its ad storage follows
    purposes 1, 3 and 4 (personalised advertising profiles).
  - Shows the footer's "Privacy settings" link where the message applies, and
    reopens the message when it is clicked, so visitors can change their mind.

  Outside those regions the message never appears and nothing here runs.
*/
(function () {
  'use strict';

  var win = window;
  var doc = document;

  function onConsent(tc, ok) {
    if (!ok || !tc || !tc.gdprApplies) return;
    var wrap = doc.querySelector('.foot-consent-wrap');
    if (wrap) wrap.hidden = false;
    var p = (tc.purpose && tc.purpose.consents) || {};
    if (typeof win.clarity === 'function') {
      win.clarity('consentv2', {
        analytics_Storage: p[1] && p[8] ? 'granted' : 'denied',
        ad_Storage: p[1] && p[3] && p[4] ? 'granted' : 'denied'
      });
    }
  }

  /* The consent message loads after the page has finished loading; wait up to
     30 s for its API, enough for a slow mobile connection. */
  function listen(tries) {
    if (typeof win.__tcfapi === 'function') {
      win.__tcfapi('addEventListener', 2, onConsent);
    } else if (tries < 120) {
      setTimeout(function () { listen(tries + 1); }, 250);
    }
  }
  listen(0);

  doc.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('.foot-consent') : null;
    if (!btn) return;
    win.googlefc = win.googlefc || {};
    win.googlefc.callbackQueue = win.googlefc.callbackQueue || [];
    win.googlefc.callbackQueue.push(function () { win.googlefc.showRevocationMessage(); });
  });
})();
