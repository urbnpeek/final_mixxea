(function () {
  var KEY = 'mx-consent';

  function read() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!saved || saved.v !== 1) return null;
      return { analytics: !!saved.analytics, marketing: !!saved.marketing };
    } catch (e) {
      return null;
    }
  }

  function write(choice) {
    var value = { v: 1, analytics: !!choice.analytics, marketing: !!choice.marketing };
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

  function button(label, className) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = className;
    el.textContent = label;
    return el;
  }

  function open(options) {
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
    var reject = button('Reject all', 'btn');
    var preferences = button('Preferences', 'btn');
    var save = button('Save', 'btn acid');
    save.hidden = prefs.hidden;
    row.appendChild(accept);
    row.appendChild(reject);
    row.appendChild(preferences);
    row.appendChild(save);
    root.appendChild(row);

    accept.addEventListener('click', function () {
      apply(write({ analytics: true, marketing: true }));
      close(root);
    });
    reject.addEventListener('click', function () {
      apply(write({ analytics: false, marketing: false }));
      close(root);
    });
    preferences.addEventListener('click', function () {
      prefs.hidden = false;
      save.hidden = false;
      preferences.hidden = true;
      var box = prefs.querySelector('[data-analytics]');
      if (box) box.focus();
    });
    save.addEventListener('click', function () {
      apply(write({
        analytics: prefs.querySelector('[data-analytics]').checked,
        marketing: prefs.querySelector('[data-marketing]').checked,
      }));
      close(root);
    });

    document.body.appendChild(root);
    accept.focus();
  }

  function boot() {
    if (!read()) open();
    document.addEventListener('click', function (event) {
      var opener = event.target.closest('[data-cookie-settings]');
      if (!opener) return;
      event.preventDefault();
      open({ preferences: true });
    });
  }

  window.addEventListener('load', function () {
    requestAnimationFrame(boot);
  });
})();
