/* ===========================================================================
 * nav-session.js  (2026-07-21)
 *
 * Marketing pages showed "Sign in" and "Create account" even to a parent who
 * was already signed into the portal. Since v313 the session token lives in
 * localStorage, so these same-origin static pages can see it and adapt.
 *
 * Signed in  -> the two buttons collapse to a single "My portal", and every
 *               "home" affordance (breadcrumb root, logo) points at /portal
 *               instead of the marketing front page. A signed-in parent
 *               pressing Home wants their portal, not the sales site.
 * Signed out -> markup is left exactly as authored.
 *
 * The BreadcrumbList JSON-LD is deliberately NOT rewritten: it describes the
 * PUBLIC site structure for crawlers, which are always signed out. Changing it
 * per-visitor would publish a path that does not exist for anyone else.
 *
 * The 30-minute idle rule is honoured here too: a stale stamp is treated as
 * signed out, so the marketing header can never claim a session the portal
 * would refuse. Viewing a marketing page deliberately does NOT refresh the
 * activity clock - reading the FAQ is not portal activity.
 *
 * No token value is ever written to the DOM; this only reads a boolean-ish
 * "is there a live session" and swaps link text.
 * ======================================================================== */
(function () {
  var IDLE_LIMIT_MS = 30 * 60 * 1000;

  function read(k) {
    try { return localStorage.getItem(k) || sessionStorage.getItem(k); }
    catch (e) { return null; }            // storage blocked (private mode, ITP)
  }

  var token = (read('focms_token') || '').trim();
  if (!token) return;

  var last = parseInt(read('focms_last_activity') || '0', 10);
  if (last && (Date.now() - last) > IDLE_LIMIT_MS) return;   // idle = signed out

  function apply() {
    var nav = document.querySelector('body > div nav');
    if (nav) {
      var signup = nav.querySelector('a[href="/signup"]');
      if (signup && signup.parentNode) signup.parentNode.removeChild(signup);

      var portal = nav.querySelector('a[href="/portal"]');
      if (portal) portal.textContent = 'My portal';
    }

    // Breadcrumb root: "Home" means the portal for a signed-in parent.
    var crumbHome = document.querySelector('.crumbs a[href="/"]');
    if (crumbHome) {
      crumbHome.setAttribute('href', '/portal');
      crumbHome.textContent = 'My portal';
    }

    // Same for the logo, which is the other thing people click to "go home".
    var logo = document.querySelector('body > div a[href="https://outcomestar.app/"], body > div a[href="/"]');
    if (logo && logo.querySelector('img')) logo.setAttribute('href', '/portal');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
