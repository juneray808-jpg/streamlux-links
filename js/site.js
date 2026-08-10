(function () {
  var PLAY_STORE =
    'https://play.google.com/store/apps/details?id=com.terry.streamlux.io';
  var PRIVACY_URL = '/privacy-policy.html';
  var DELETION_URL = '/account-deletion.html';
  var SUPPORT_EMAIL = 'support@streamlux.io';

  var NAV = [
    { href: '/', label: 'Home', id: 'home' },
    { href: '/about.html', label: 'About', id: 'about' },
    { href: '/creators.html', label: 'For Creators', id: 'creators' },
    { href: '/livestream.html', label: 'Livestream', id: 'livestream' },
    { href: '/contact.html', label: 'Contact', id: 'contact' },
  ];

  function navLink(item, active, mobile) {
    var cls = item.id === active ? ' active' : '';
    return (
      '<a href="' +
      item.href +
      '" class="' +
      (mobile ? '' : '') +
      cls +
      '">' +
      item.label +
      '</a>'
    );
  }

  function renderHeader(active) {
    var desktop = NAV.map(function (i) {
      return navLink(i, active, false);
    }).join('');
    var mobile = NAV.map(function (i) {
      return navLink(i, active, true);
    }).join('');
    return (
      '<header class="site-header">' +
      '<div class="header-inner">' +
      '<a href="/" class="brand"><span class="wordmark">StreamLux</span></a>' +
      '<nav class="nav-desktop" aria-label="Main">' +
      desktop +
      '<a href="' +
      PLAY_STORE +
      '" class="btn btn-primary btn-sm" style="margin-left:0.5rem">Get the app</a>' +
      '</nav>' +
      '<button type="button" class="nav-toggle" aria-label="Open menu" aria-expanded="false" id="nav-toggle">☰</button>' +
      '</div>' +
      '<nav class="nav-mobile" id="nav-mobile" aria-label="Mobile">' +
      mobile +
      '<a href="' +
      PLAY_STORE +
      '" class="btn btn-primary" style="margin-top:0.5rem">Get the app</a>' +
      '</nav>' +
      '</header>'
    );
  }

  function renderFooter() {
    return (
      '<footer class="site-footer">' +
      '<div class="container">' +
      '<div class="footer-grid">' +
      '<div class="footer-col">' +
      '<span class="wordmark">StreamLux</span>' +
      '<p>Watch, match, and connect with creators worldwide. Built for mobile-first discovery, real conversations, and a thriving creator economy — from day one.</p>' +
      '</div>' +
      '<div class="footer-col">' +
      '<h4>Platform</h4>' +
      '<a href="/about.html">About</a>' +
      '<a href="/creators.html">For Creators</a>' +
      '<a href="/livestream.html">Livestream</a>' +
      '<a href="/contact.html">Contact</a>' +
      '</div>' +
      '<div class="footer-col">' +
      '<h4>Legal</h4>' +
      '<a href="' +
      PRIVACY_URL +
      '" rel="noopener">Privacy Policy</a>' +
      '<a href="/terms.html">Terms &amp; Conditions</a>' +
      '<a href="/refund-policy.html">Refund Policy</a>' +
      '<a href="' +
      DELETION_URL +
      '" rel="noopener">Account deletion</a>' +
      '<a href="/child-safety.html">Child safety standards</a>' +
      '</div>' +
      '<div class="footer-col">' +
      '<h4>Get started</h4>' +
      '<a href="' +
      PLAY_STORE +
      '">Download on Google Play</a>' +
      '<a href="mailto:' +
      SUPPORT_EMAIL +
      '">' +
      SUPPORT_EMAIL +
      '</a>' +
      '</div>' +
      '</div>' +
      '<div class="footer-bottom">' +
      '<span>© ' +
      new Date().getFullYear() +
      ' StreamLux. All rights reserved.</span>' +
      '<span>Early access — more features shipping soon.</span>' +
      '</div>' +
      '</div>' +
      '</footer>'
    );
  }

  function initNav() {
    var toggle = document.getElementById('nav-toggle');
    var mobile = document.getElementById('nav-mobile');
    if (!toggle || !mobile) return;
    toggle.addEventListener('click', function () {
      var open = mobile.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobile.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var headerEl = document.getElementById('site-header');
  if (headerEl) {
    var active = headerEl.getAttribute('data-active') || 'home';
    headerEl.outerHTML = renderHeader(active);
    initNav();
  }

  var footerEl = document.getElementById('site-footer');
  if (footerEl) {
    footerEl.outerHTML = renderFooter();
  }
})();
