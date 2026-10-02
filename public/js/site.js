(function () {
  const button = document.querySelector('[data-menu]');
  const drawer = document.getElementById('drawer');
  const main = document.querySelector('main');
  const nav = document.querySelector('.site-nav');

  function trap(event) {
    if (!drawer || drawer.hidden) return;
    if (event.key === 'Escape') {
      button.click();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = drawer.querySelectorAll('a, button');
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (button && drawer) {
    button.addEventListener('click', function () {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', open ? 'false' : 'true');
      drawer.hidden = open;
      document.body.style.overflow = open ? '' : 'hidden';
      if (main) main.inert = !open;
      if (!open) {
        const link = drawer.querySelector('a');
        if (link) link.focus();
      }
    });
    document.addEventListener('keydown', trap);
  }

  let y = window.scrollY;
  if (nav) {
    window.addEventListener('scroll', function () {
      requestAnimationFrame(function () {
        nav.classList.toggle('is-hidden', window.scrollY > y && window.scrollY > 200);
        y = window.scrollY;
      });
    }, { passive: true });
  }

  document.addEventListener('click', function (event) {
    const play = event.target.closest('.embed .play');
    if (!play) return;
    const wrap = play.closest('.embed');
    const note = wrap.querySelector('.small');
    wrap.setAttribute('aria-busy', 'true');
    if (note) note.textContent = 'Loading player…';
    const frame = document.createElement('iframe');
    const src = wrap.dataset.src || '';
    frame.src = src + (wrap.dataset.embed === 'youtube' && src.indexOf('autoplay') === -1 ? '?autoplay=1' : '');
    frame.height = wrap.dataset.h || '152';
    frame.width = '100%';
    frame.loading = 'lazy';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    const title = wrap.querySelector('.t');
    frame.title = title ? title.textContent : 'Embedded player';
    frame.style.border = '0';
    frame.onload = function () { wrap.removeAttribute('aria-busy'); };
    wrap.replaceChildren(frame);
  });

  document.querySelectorAll('[data-copy]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      const url = link.getAttribute('href') || location.href;
      if (navigator.clipboard) navigator.clipboard.writeText(url);
      link.textContent = 'Copied';
    });
  });

  const form = document.querySelector('[data-newsletter]');
  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const email = form.querySelector('input[type="email"]');
      const status = document.querySelector('[data-nl-status]');
      fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email ? email.value : '', source: 'footer' }),
      }).then(function (res) {
        if (status) status.textContent = res.ok ? 'Subscribed.' : 'Could not subscribe.';
      }).catch(function () {
        if (status) status.textContent = 'Could not subscribe.';
      });
    });
  }

  if ('IntersectionObserver' in window) {
    const nodes = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, index) {
        if (!entry.isIntersecting) return;
        entry.target.style.transitionDelay = Math.min(index, 4) * 60 + 'ms';
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    nodes.forEach(function (node) { observer.observe(node); });
  }
})();
