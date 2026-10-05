/**
 * Shared honeypot, page-load timestamp, and managed Turnstile widget.
 * The widget is the checkbox (managed) widget, not an invisible challenge.
 */
(function () {
  var PAGE_STARTED_AT = Date.now();
  var siteKeyPromise = null;
  var scriptPromise = null;

  function siteKeyRequest() {
    if (!siteKeyPromise) {
      siteKeyPromise = fetch('/api/turnstile/sitekey', { headers: { Accept: 'application/json' } })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data || {} };
          }).catch(function () {
            return { ok: false, data: {} };
          });
        })
        .then(function (result) {
          if (!result.ok || !result.data.siteKey) {
            throw new Error(result.data.error || 'Verification is not configured.');
          }
          return result.data.siteKey;
        })
        .catch(function (error) {
          siteKeyPromise = null;
          throw error;
        });
    }
    return siteKeyPromise;
  }

  function loadScript() {
    if (window.turnstile && window.turnstile.render) return Promise.resolve();
    if (!scriptPromise) {
      scriptPromise = new Promise(function (resolve, reject) {
        // Explicit render via the onload callback. The ready helper rejects
        // an async tag, and a script injected at runtime is async.
        window.mixxeaTurnstileOnload = function () { resolve(); };
        var script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=mixxeaTurnstileOnload';
        script.async = true;
        script.onerror = function () {
          scriptPromise = null;
          reject(new Error('Verification could not be loaded. Refresh and try again.'));
        };
        document.head.appendChild(script);
      });
    }
    return scriptPromise;
  }

  function stamp(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('[name="form_started_at"]').forEach(function (input) {
      if (!input.value) input.value = String(PAGE_STARTED_AT);
    });
  }

  function isVisible(el) {
    var node = el;
    while (node && node !== document.documentElement) {
      if (window.getComputedStyle(node).display === 'none') return false;
      node = node.parentElement;
    }
    return true;
  }

  function renderSlot(slot, siteKey) {
    if (!slot || slot.getAttribute('data-turnstile-ready') === '1') return;
    if (!window.turnstile) return;
    var id = window.turnstile.render(slot, {
      sitekey: siteKey,
      theme: 'dark',
    });
    slot._mxTurnstileId = id;
    slot.setAttribute('data-turnstile-ready', '1');
    slot.setAttribute('data-turnstile-id', String(id));
  }

  function showFallback(slot, message) {
    if (!slot || slot.querySelector('.turnstile-fallback')) return;
    var note = document.createElement('p');
    note.className = 'turnstile-fallback';
    note.textContent = message || 'Verification could not be loaded. Refresh and try again.';
    slot.appendChild(note);
  }

  function mountVisible(root) {
    stamp(document);
    var scope = root && root.querySelectorAll ? root : document;
    var slots = scope.querySelectorAll('[data-turnstile]');
    var pending = [];
    slots.forEach(function (slot) {
      if (slot.getAttribute('data-turnstile-ready') === '1') return;
      if (!isVisible(slot)) return;
      pending.push(slot);
    });
    if (!pending.length) return;
    siteKeyRequest().then(function (siteKey) {
      return loadScript().then(function () { return siteKey; });
    }).then(function (siteKey) {
      pending.forEach(function (slot) {
        if (!isVisible(slot)) return;
        renderSlot(slot, siteKey);
      });
    }).catch(function (error) {
      pending.forEach(function (slot) {
        showFallback(slot, error && error.message);
      });
    });
  }

  function tokenFor(scope) {
    var slot = scope.querySelector('[data-turnstile]');
    var id = slot && slot._mxTurnstileId != null ? slot._mxTurnstileId : (slot ? slot.getAttribute('data-turnstile-id') : null);
    if (id != null && window.turnstile && window.turnstile.getResponse) {
      var value = window.turnstile.getResponse(id);
      if (value) return value;
    }
    var input = scope.querySelector('[name="cf-turnstile-response"]');
    return input ? String(input.value || '') : '';
  }

  function collect(root) {
    var scope = root && root.querySelector ? root : document;
    stamp(scope);
    var hp = scope.querySelector('[name="company_url"]');
    var started = scope.querySelector('[name="form_started_at"]');
    var startedAt = started && started.value ? Number(started.value) : PAGE_STARTED_AT;
    return {
      company_url: hp ? String(hp.value || '') : '',
      form_started_at: startedAt,
      'cf-turnstile-response': tokenFor(scope),
    };
  }

  function reset(root) {
    var scope = root && root.querySelector ? root : document;
    var hp = scope.querySelector('[name="company_url"]');
    if (hp) hp.value = '';
    var started = scope.querySelector('[name="form_started_at"]');
    if (started) started.value = String(PAGE_STARTED_AT);
    var slot = scope.querySelector('[data-turnstile]');
    var id = slot && slot._mxTurnstileId != null ? slot._mxTurnstileId : (slot ? slot.getAttribute('data-turnstile-id') : null);
    if (id != null && window.turnstile && window.turnstile.reset) window.turnstile.reset(id);
  }

  window.MixxeaGuard = {
    startedAt: function () { return PAGE_STARTED_AT; },
    collect: collect,
    reset: reset,
    mount: mountVisible,
  };

  function boot() {
    stamp(document);
    if (document.querySelector('[data-turnstile]')) {
      loadScript().catch(function () {});
    }
    mountVisible();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('click', function () {
    window.setTimeout(function () { mountVisible(); }, 0);
  });
})();
