(function () {
  var KEY = 'mx-consent';

  function fresh(saved) {
    if (!saved || saved.v !== 1 || typeof saved.at !== 'string') return false;
    var then = new Date(saved.at);
    if (isNaN(then.getTime())) return false;
    var limit = new Date(then.getTime());
    limit.setMonth(limit.getMonth() + 12);
    return Date.now() < limit.getTime();
  }

  function read() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!fresh(saved)) return null;
      return { analytics: !!saved.analytics, marketing: !!saved.marketing, at: saved.at };
    } catch (e) {
      return null;
    }
  }

  function write(choice) {
    var value = { v: 1, analytics: !!choice.analytics, marketing: !!choice.marketing, at: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (e) { /* private mode */ }
    return value;
  }

  function apply(choice) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: choice.analytics ? 'granted' : 'denied',
        ad_storage: choice.marketing ? 'granted' : 'denied',
        ad_user_data: choice.marketing ? 'granted' : 'denied',
        ad_personalization: choice.marketing ? 'granted' : 'denied',
      });
    }
    if (choice.analytics && typeof window.mxLoadAnalytics === 'function') window.mxLoadAnalytics();
    if (choice.marketing && typeof window.mxLoadPixel === 'function') window.mxLoadPixel();
  }

  function close(root) {
    if (root && root.parentNode) root.parentNode.removeChild(root);
  }

  function catalogueLink() {
    var links = document.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      if (/Explore the catalogue/.test(links[i].textContent || '')) return links[i];
    }
    return null;
  }

  function fitBanner(root) {
    if (!root || !root.classList.contains('is-prefs')) {
      if (root) root.style.maxHeight = '';
      return;
    }
    var cap = window.innerHeight - 24;
    var link = catalogueLink();
    var room = cap;
    if (link && window.innerWidth <= 480) {
      var rect = link.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        room = Math.min(cap, window.innerHeight - rect.bottom - 12);
      }
    }
    root.style.maxHeight = Math.max(1, room) + 'px';
  }

  function button(label, className) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = className;
    el.textContent = label;
    return el;
  }

  var onResize = null;

  function open(options) {
    if (onResize) window.removeEventListener('resize', onResize);
    var existing = document.getElementById('cookie-consent');
    if (existing) existing.parentNode.removeChild(existing);
    var root = document.createElement('div');
    root.id = 'cookie-consent';
    root.className = 'consent';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-labelledby', 'cookie-consent-title');
    root.setAttribute('aria-modal', 'false');

    var title = document.createElement('p');
    title.id = 'cookie-consent-title';
    title.innerHTML = 'We use cookies for analytics and marketing. You choose. <a href="/privacy">Privacy</a>';
    root.appendChild(title);

    var prefs = document.createElement('div');
    prefs.className = 'consent-prefs';
    prefs.hidden = !options || !options.preferences;
    prefs.innerHTML = '<label><input type="checkbox" data-analytics> Analytics</label><label><input type="checkbox" data-marketing> Marketing</label>';
    var saved = read();
    if (saved) {
      prefs.querySelector('[data-analytics]').checked = saved.analytics;
      prefs.querySelector('[data-marketing]').checked = saved.marketing;
    }
    root.appendChild(prefs);

    var row = document.createElement('div');
    row.className = 'consent-row';
    var accept = button('Accept all', 'btn acid');
    var reject = button('Reject all', 'btn acid');
    var preferences = button('Preferences', 'btn');
    var save = button('Save', 'btn acid');
    save.hidden = prefs.hidden;
    preferences.hidden = !prefs.hidden;
    if (!prefs.hidden) root.classList.add('is-prefs');
    row.appendChild(accept);
    row.appendChild(reject);
    row.appendChild(preferences);
    row.appendChild(save);
    root.appendChild(row);

    var previous = document.activeElement;
    var opener = options && options.returnFocus;
    onResize = function () { fitBanner(root); };
    function finish() {
      window.removeEventListener('resize', onResize);
      onResize = null;
      close(root);
      var target = opener || (previous && previous !== document.body && previous !== document.documentElement ? previous : null);
      if (target && target !== root && typeof target.focus === 'function' && document.contains(target)) target.focus();
    }

    accept.addEventListener('click', function () {
      apply(write({ analytics: true, marketing: true }));
      finish();
    });
    reject.addEventListener('click', function () {
      apply(write({ analytics: false, marketing: false }));
      finish();
    });
    preferences.addEventListener('click', function () {
      prefs.hidden = false;
      save.hidden = false;
      preferences.hidden = true;
      root.classList.add('is-prefs');
      fitBanner(root);
      var box = prefs.querySelector('[data-analytics]');
      if (box) box.focus();
    });
    save.addEventListener('click', function () {
      apply(write({
        analytics: prefs.querySelector('[data-analytics]').checked,
        marketing: prefs.querySelector('[data-marketing]').checked,
      }));
      finish();
    });

    document.body.appendChild(root);
    fitBanner(root);
    window.addEventListener('resize', onResize);
    if (opener) {
      root.tabIndex = -1;
      root.focus({ preventScroll: true });
    }
  }

  function boot() {
    if (!read()) open();
    document.addEventListener('click', function (event) {
      var opener = event.target.closest('[data-cookie-settings]');
      if (!opener) return;
      event.preventDefault();
      open({ preferences: true, returnFocus: opener });
    });
  }

  window.addEventListener('load', function () {
    requestAnimationFrame(boot);
  });
})();
