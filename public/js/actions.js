(function () {
  function lookup(name) {
    var parts = String(name || '').split('.');
    var obj = window;
    for (var i = 0; i < parts.length; i++) {
      if (!obj) return null;
      obj = obj[parts[i]];
    }
    return obj;
  }

  function argValue(value, el, event) {
    if (value === '@el') return el;
    if (value === '@event') return event;
    if (value === '@value') return el.value;
    return value;
  }

  function run(spec, el, event) {
    if (!Array.isArray(spec) || !spec.length) return;
    if (Array.isArray(spec[0])) {
      spec.forEach(function (item) { run(item, el, event); });
      return;
    }
    var fn = lookup(spec[0]);
    if (typeof fn !== 'function') return;
    var args = [];
    for (var i = 1; i < spec.length; i++) args.push(argValue(spec[i], el, event));
    fn.apply(window, args);
  }

  function onEvent(event) {
    var target = event.target;
    var el = target && target.closest ? target.closest('[data-act]') : null;
    if (!el) return;
    var kind = el.getAttribute('data-act-on') || 'click';
    if (event.type !== kind) return;
    if (el.getAttribute('data-act-prevent') === '1') event.preventDefault();
    var raw = el.getAttribute('data-act') || '';
    var spec;
    if (raw.charAt(0) === '[') {
      try { spec = JSON.parse(raw); } catch (e) { return; }
    } else {
      spec = [raw];
    }
    run(spec, el, event);
  }

  ['click', 'change', 'input', 'submit'].forEach(function (type) {
    document.addEventListener(type, onEvent);
  });

  window.mxClickId = function (id) {
    var node = document.getElementById(id);
    if (node) node.click();
  };

  window.mxCopy = function (text, message) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String(text || ''));
    }
    if (typeof window.toast === 'function' && message) window.toast(message);
  };
})();
