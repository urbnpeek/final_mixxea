/**
 * app.js — Mixxea Records Frontend
 * Connects the static HTML to the Express API
 * Loaded after the main HTML via <script src="/js/app.js">
 */

/* ─────────────────────────────────────────────────────
   API HELPERS
───────────────────────────────────────────────────── */
const API = {
  async request(path, options = {}) {
    const response = await fetch(`/api${path}`, options);
    const text = await response.text();
    let payload = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = text ? { message: text } : {};
    }

    if (!response.ok) {
      const error = new Error(payload.error || payload.message || `Request failed (${response.status})`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  },
  async get(path) {
    return this.request(path);
  },
  async post(path, data) {
    return this.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  async postForm(path, formData) {
    return this.request(path, { method: 'POST', body: formData });
  },
  async put(path, data) {
    return this.request(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  async del(path) {
    return this.request(path, { method: 'DELETE' });
  }
};

function showMessage(elementId, message, type = 'success') {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.textContent = message;
  element.style.display = 'block';
  element.style.color = type === 'error' ? 'var(--g3)' : 'var(--g1)';
  element.style.borderColor = type === 'error' ? 'rgba(255,45,107,.35)' : 'rgba(232,255,0,.3)';
}

function getInputValue(root, selector) {
  return root?.querySelector(selector)?.value?.trim() || '';
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ─────────────────────────────────────────────────────
   RELEASES — load from API and render
───────────────────────────────────────────────────── */
async function loadReleases(genre = 'all') {
  try {
    const url = genre === 'all' ? '/releases' : `/releases?genre=${genre}`;
    const releases = await API.get(url);
    const grid = document.getElementById('rel-grid-dynamic');
    if (!grid) return;

    grid.innerHTML = releases.map((r, i) => `
      <div class="r-card${i === 0 ? ' r-card-featured' : ''}" data-track="${i}">
        <div class="rc-art${i === 0 ? ' big' : ''}" style="color:rgba(232,255,0,.08)">
          ${r.artwork ? `<img src="${r.artwork}" alt="${r.title}" style="width:100%;height:100%;object-fit:cover;opacity:.4">` : r.catNo?.slice(-3) || r.title.slice(0,2).toUpperCase()}
        </div>
        <div class="rc-grad"></div>
        <div class="rc-status ${r.status === 'out' ? 's-out' : 's-pre'}">${r.status === 'out' ? 'Out Now' : r.status === 'pre' ? 'Pre-Order' : 'Coming Soon'}</div>
        <button class="rc-play" onclick="playTrack(${i}, event)">▶</button>
        <div class="rc-cnt${i === 0 ? ' big' : ''}">
          <div class="rc-cat">${r.genre} · ${r.catNo}</div>
          <div class="rc-title${i === 0 ? ' big' : ''}">${r.title.toUpperCase()}</div>
          <div class="rc-who">${r.artist}</div>
        </div>
        <div class="rc-dsp">
          ${r.beatport   ? `<a href="${r.beatport}"   target="_blank" class="dsp-link">Beatport</a>` : ''}
          ${r.spotify    ? `<a href="${r.spotify}"    target="_blank" class="dsp-link">Spotify</a>` : ''}
          ${r.apple      ? `<a href="${r.apple}"      target="_blank" class="dsp-link">Apple</a>` : ''}
          ${r.soundcloud ? `<a href="${r.soundcloud}" target="_blank" class="dsp-link">SoundCloud</a>` : ''}
          ${r.bandcamp   ? `<a href="${r.bandcamp}"   target="_blank" class="dsp-link">Bandcamp</a>` : ''}
        </div>
      </div>
    `).join('');

    // Update the Howler track list from live data
    window.TRACKS = releases.map(r => ({
      title:  r.title,
      artist: r.artist,
      art:    r.catNo?.slice(-3) || r.title.slice(0,2).toUpperCase(),
      src:    r.audioPreview || null
    }));
  } catch (e) {
    console.warn('Could not load releases from API, using static data');
  }
}

/* ─────────────────────────────────────────────────────
   ARTISTS — load roster from API
───────────────────────────────────────────────────── */
async function loadArtists() {
  try {
    const artists = await API.get('/artists');
    const track   = document.getElementById('rTrack');
    if (!track || !artists.length) return;

    const COLORS = ['rgba(232,255,0,.07)','rgba(0,200,255,.08)','rgba(255,45,107,.07)','rgba(255,184,0,.07)','rgba(232,255,0,.06)','rgba(0,200,255,.06)','rgba(255,45,107,.07)'];
    track.innerHTML = artists.map((a, i) => `
      <div class="a-tile">
        <div class="at-bg" style="color:${COLORS[i % COLORS.length]}">
          ${a.photo ? `<img src="${a.photo}" alt="${a.name}" style="width:100%;height:100%;object-fit:cover;opacity:.5">` : a.name.slice(0,2)}
        </div>
        <div class="at-ov"></div>
        <div class="at-c">
          <div class="at-genre">${a.genre}</div>
          <div class="at-name">${a.name}</div>
          <div class="at-meta"><span>${a.country} / ${a.city}</span></div>
          <div class="at-btns">
            <a href="/artists/${slugify(a.slug || a.name)}" class="at-btn at-btn-y">Profile</a>
            ${a.type !== 'label' ? `<a href="#contact" class="at-btn at-btn-g">Book</a>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.warn('Could not load artists from API');
  }
}

/* ─────────────────────────────────────────────────────
   EVENTS — load from API
───────────────────────────────────────────────────── */
async function loadEvents() {
  try {
    const events = await API.get('/events');
    const list   = document.getElementById('ev-list-dynamic');
    if (!list || !events.length) return;

    list.innerHTML = events.map(e => {
      const d = new Date(e.date);
      const dateStr = d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase();
      return `
        <div class="ev-row">
          <div class="ev-date">${dateStr.replace(' ','\n')}</div>
          <div><div class="ev-venue">${e.venue}</div><div class="ev-loc">${e.city}, ${e.country}</div></div>
          <div class="ev-artist">${e.artist}</div>
          <div class="ev-type">${e.type}</div>
          <div class="ev-tix">${e.ticketLink ? `<a href="${e.ticketLink}" target="_blank" style="color:inherit">Get Tickets ↗</a>` : e.status === 'hold' ? 'On Hold' : 'TBA'}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.warn('Could not load events from API');
  }
}

/* ─────────────────────────────────────────────────────
   NEWS — load from API
───────────────────────────────────────────────────── */
async function loadNews() {
  try {
    const news = await API.get('/news');
    const grid = document.getElementById('news-grid-dynamic');
    if (!grid || !news.length) return;

    grid.innerHTML = news.map((n, i) => `
      <div class="n-card${i === 0 ? ' n-card-featured' : ''}">
        <div class="nc-img">${n.image ? `<img src="${n.image}" alt="${n.title}" style="width:100%;height:100%;object-fit:cover">` : `<span style="font-family:var(--Anton);font-size:80px;color:rgba(232,255,0,.08)">${n.title.slice(0,2).toUpperCase()}</span>`}</div>
        <div class="nc-cat">${n.category}</div>
        <div class="nc-title">${n.title}</div>
        <div class="nc-date">${new Date(n.date || n.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</div>
        <div class="nc-arr">↗</div>
      </div>
    `).join('');
  } catch (e) {
    console.warn('Could not load news from API');
  }
}

/* ─────────────────────────────────────────────────────
   NEWSLETTER FORM — live submit
───────────────────────────────────────────────────── */
async function nlSubscribe() {
  const emailEl = document.getElementById('nl-email');
  const email   = emailEl?.value?.trim();
  if (!email || !email.includes('@')) {
    showMessage('nl-ok', 'Enter a valid email address first.', 'error');
    return;
  }

  try {
    const res = await API.post('/newsletter/subscribe', { email, source: 'homepage' });
    if (res.success) {
      showMessage('nl-ok', res.message || "You're subscribed. Welcome to Mixxea.", 'success');
      emailEl.value = '';
    }
  } catch (e) {
    showMessage('nl-ok', e.message || 'Subscription failed. Please try again.', 'error');
  }
}

/* ─────────────────────────────────────────────────────
   CONTACT FORM — live submit
───────────────────────────────────────────────────── */
async function doCt() {
  const form = {
    name:        document.querySelector('#contact input[type=text]')?.value?.trim(),
    email:       document.querySelector('#contact input[type=email]')?.value?.trim(),
    inquiryType: document.querySelector('#contact select')?.value,
    link:        document.querySelector('#contact input[type=url]')?.value?.trim(),
    message:     document.querySelector('#contact textarea')?.value?.trim(),
    newsletterOptIn: !!document.getElementById('ct-newsletter-opt-in')?.checked,
  };
  const button = document.querySelector('#contact .sub-full');

  if (!form.name || !form.email || !form.inquiryType || !form.message) {
    showMessage('ct-ok', 'Name, email, inquiry type, and message are required.', 'error');
    return;
  }

  try {
    if (button) button.disabled = true;
    await API.post('/contact', form);
    showMessage('ct-ok', 'Message received. We will be in touch soon.', 'success');
  } catch (e) {
    showMessage('ct-ok', e.message || 'Could not send your message. Please try again.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

/* ─────────────────────────────────────────────────────
   DEMO SUBMIT — live submit with file upload
───────────────────────────────────────────────────── */
async function doSub() {
  const agr = document.getElementById('agr');
  if (!agr?.checked) {
    agr.style.outline = '1px solid var(--g3)';
    showMessage('sub-ok', 'You need to accept the submission terms first.', 'error');
    return;
  }

  const section  = document.getElementById('pp-sub');
  const formData = new FormData();
  const button = section?.querySelector('.sub-full');

  // Collect fields
  const fields = {
    artistName:     section?.querySelector('input[placeholder="Stage name"]')?.value,
    trackTitle:     section?.querySelector('input[placeholder="Track name"]')?.value,
    email:          section?.querySelector('input[placeholder="your@email.com"]')?.value,
    genre:          section?.querySelector('select')?.value,
    bpm:            section?.querySelector('input[type=number]')?.value,
    notes:          section?.querySelector('textarea')?.value,
    soundcloudLink: section?.querySelector('input[type=url]')?.value,
  };

  if (!fields.trackTitle || !fields.artistName || !fields.email) {
    showMessage('sub-ok', 'Track title, artist name, and email are required.', 'error');
    return;
  }

  Object.entries(fields).forEach(([k, v]) => formData.append(k, v || ''));

  const fileInput = document.getElementById('fUp');
  if (fileInput?.files[0]) formData.append('track', fileInput.files[0]);

  try {
    if (button) button.disabled = true;
    const res = await API.postForm('/demos/submit', formData);
    if (res.success) {
      showMessage('sub-ok', "Submission received. We'll be in touch within 4–6 weeks if there's a fit.", 'success');
    }
  } catch (e) {
    showMessage('sub-ok', e.message || 'Could not submit your demo. Please try again.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

/* ─────────────────────────────────────────────────────
   ARTIST PORTAL — live auth + dashboard
───────────────────────────────────────────────────── */
let _artistSession = null;

function showPortalError(containerId, msg) {
  let el = document.getElementById(containerId);
  if (!el) {
    const parent = document.querySelector('#' + containerId.replace('-err', '') + ' .auth-wrap') ||
                   document.getElementById(containerId.replace('-err', ''));
    if (parent) {
      el = document.createElement('div');
      el.id = containerId;
      el.style.cssText = 'margin-top:10px;padding:10px 14px;border:1px solid rgba(255,45,107,.35);color:var(--g3,#ff2d6b);font-size:13px;border-radius:4px;display:none';
      parent.appendChild(el);
    }
  }
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hidePortalError(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.style.display = 'none';
}

function populateArtistDashboard(artist) {
  const nameEl = document.querySelector('.du-name');
  const roleEl = document.querySelector('.du-role');
  if (nameEl) nameEl.textContent = artist.artistName || artist.name || '';
  if (roleEl) roleEl.innerHTML = (artist.genre || 'Artist') + ' &middot; ' + (artist.country || '');

  loadArtistReleases(artist.artistName || artist.name);
  loadArtistRoyalties();
  loadArtistEvents(artist.artistName || artist.name);
}

async function loadArtistReleases(artistName) {
  try {
    const releases = await API.get('/releases');
    const mine = releases.filter(r => r.artist && r.artist.toLowerCase() === (artistName || '').toLowerCase());
    const kpi = document.querySelector('.d-kpis .kpi:first-child .kv');
    if (kpi) kpi.textContent = mine.length;
    const tbody = document.querySelector('#ds-tr tbody') || document.getElementById('ds-tr');
    if (!tbody) return;
    tbody.innerHTML = mine.length ? mine.map(r => `
      <tr>
        <td>${r.title}</td>
        <td>${r.catNo || '—'}</td>
        <td>${r.genre || '—'}</td>
        <td><span class="rc-status ${r.status === 'out' ? 's-out' : 's-pre'}" style="position:static;font-size:11px">${r.status === 'out' ? 'Out Now' : 'Pre-Order'}</span></td>
        <td>${new Date(r.releaseDate || r.createdAt || Date.now()).toLocaleDateString('en-GB')}</td>
      </tr>`).join('') : '<tr><td colspan="5" style="opacity:.4;text-align:center;padding:24px">No releases yet</td></tr>';
  } catch (e) { console.warn('loadArtistReleases:', e.message); }
}

async function loadArtistRoyalties() {
  try {
    const royalties = await API.get('/royalties/my');
    const kpi = document.querySelector('.d-kpis .kpi:nth-child(2) .kv');
    const total = Array.isArray(royalties) ? royalties.reduce((s, r) => s + (r.amount || 0), 0) : 0;
    if (kpi) kpi.textContent = '\u20AC' + total.toFixed(2);
    const tbody = document.querySelector('#ds-ry tbody') || document.getElementById('ds-ry');
    if (!tbody) return;
    tbody.innerHTML = Array.isArray(royalties) && royalties.length ? royalties.map(r => `
      <tr>
        <td>${r.period || '—'}</td>
        <td>${r.platform || '—'}</td>
        <td>${r.release || '—'}</td>
        <td style="color:var(--g1)">\u20AC${(r.amount || 0).toFixed(2)}</td>
        <td><span style="opacity:.5">${r.status || 'pending'}</span></td>
      </tr>`).join('') : '<tr><td colspan="5" style="opacity:.4;text-align:center;padding:24px">No royalty records yet</td></tr>';
  } catch (e) { console.warn('loadArtistRoyalties:', e.message); }
}

async function loadArtistEvents(artistName) {
  try {
    const events = await API.get('/events');
    const mine = events.filter(ev => ev.artist && ev.artist.toLowerCase() === (artistName || '').toLowerCase());
    const kpi = document.querySelector('.d-kpis .kpi:nth-child(3) .kv');
    if (kpi) kpi.textContent = mine.length;
    const tbody = document.querySelector('#ds-bk tbody') || document.getElementById('ds-bk');
    if (!tbody) return;
    tbody.innerHTML = mine.length ? mine.map(ev => `
      <tr>
        <td>${new Date(ev.date).toLocaleDateString('en-GB')}</td>
        <td>${ev.venue || '—'}</td>
        <td>${ev.city || '—'}, ${ev.country || ''}</td>
        <td>${ev.type || '—'}</td>
        <td style="opacity:.5">${ev.status || '—'}</td>
      </tr>`).join('') : '<tr><td colspan="5" style="opacity:.4;text-align:center;padding:24px">No bookings yet</td></tr>';
  } catch (e) { console.warn('loadArtistEvents:', e.message); }
}

async function dashSubmitTrack() {
  if (!_artistSession) return;
  const form = document.getElementById('ds-new');
  if (!form) return;
  const btn = form.querySelector('.sub-full') || form.querySelector('button[type=submit]');
  const formData = new FormData();
  const artistName = _artistSession.artistName || _artistSession.name || '';
  const trackTitle = getInputValue(form, 'input[placeholder="Track title"]') ||
                     getInputValue(form, 'input[type=text]');
  const genre = form.querySelector('select')?.value || '';
  const bpm   = getInputValue(form, 'input[type=number]');
  const notes = form.querySelector('textarea')?.value?.trim() || '';
  const file  = form.querySelector('input[type=file]')?.files?.[0];

  if (!trackTitle) {
    showPortalError('ds-new-err', 'Track title is required.'); return;
  }

  formData.append('artistName', artistName);
  formData.append('trackTitle', trackTitle);
  formData.append('email', _artistSession.email || '');
  formData.append('genre', genre);
  formData.append('bpm', bpm);
  formData.append('notes', notes);
  if (file) formData.append('track', file);

  try {
    if (btn) btn.disabled = true;
    await API.postForm('/demos/submit', formData);
    showPortalError('ds-new-err', ''); hidePortalError('ds-new-err');
    const okEl = document.getElementById('ds-new-ok') || (() => {
      const d = document.createElement('div');
      d.id = 'ds-new-ok';
      d.style.cssText = 'margin-top:10px;padding:10px 14px;border:1px solid rgba(232,255,0,.3);color:var(--g1);font-size:13px;border-radius:4px';
      form.appendChild(d); return d;
    })();
    okEl.textContent = 'Track submitted successfully.';
    form.reset();
  } catch (e) {
    showPortalError('ds-new-err', e.message || 'Submit failed. Try again.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function artistLogout() {
  try { await API.post('/auth/artist/logout', {}); } catch (e) {}
  _artistSession = null;
  const tabs = document.querySelectorAll('.p-tab');
  tabs[0]?.click();
}

async function checkArtistSession() {
  try {
    const res = await API.get('/auth/artist/check');
    if (res.loggedIn && res.artist) {
      _artistSession = res.artist;
      populateArtistDashboard(res.artist);
    }
  } catch (e) {}
}

function injectLogoutButton() {
  const sidebar = document.querySelector('.d-side');
  if (!sidebar || document.getElementById('artist-logout-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'artist-logout-btn';
  btn.textContent = 'Log Out';
  btn.style.cssText = 'margin-top:auto;width:100%;padding:10px;background:transparent;border:1px solid rgba(255,45,107,.4);color:var(--g3,#ff2d6b);cursor:pointer;font-size:13px;border-radius:4px;letter-spacing:.05em';
  btn.onclick = artistLogout;
  sidebar.appendChild(btn);
}

// Wire login + register buttons
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.querySelector('#pp-login .sub-full');
  if (loginBtn) {
    loginBtn.onclick = async (e) => {
      e.preventDefault();
      hidePortalError('login-err');
      const email    = document.querySelector('#pp-login input[type=email]')?.value?.trim();
      const password = document.querySelector('#pp-login input[type=password]')?.value;
      if (!email || !password) { showPortalError('login-err', 'Email and password are required.'); return; }
      try {
        loginBtn.disabled = true;
        const res = await API.post('/auth/artist/login', { email, password });
        if (res.success) {
          _artistSession = res.artist;
          injectLogoutButton();
          populateArtistDashboard(res.artist);
          document.querySelectorAll('.p-tab')[3]?.click();
        }
      } catch (e) {
        showPortalError('login-err', e.message || 'Invalid credentials.');
      } finally {
        loginBtn.disabled = false;
      }
    };
  }

  const registerBtn = document.querySelector('#pp-reg .sub-full');
  if (registerBtn) {
    registerBtn.onclick = async (e) => {
      e.preventDefault();
      hidePortalError('reg-err');
      const section    = document.getElementById('pp-reg');
      const artistName = getInputValue(section, 'input[placeholder="Your artist name"]');
      const realName   = getInputValue(section, 'input[placeholder="Legal name"]');
      const email      = getInputValue(section, 'input[type=email]');
      const country    = section?.querySelector('select')?.value || '';
      const genre      = section?.querySelectorAll('select')[1]?.value || '';
      const password   = getInputValue(section, 'input[type=password]');
      const soundcloud = getInputValue(section, 'input[type=url]');

      if (!artistName || !email || !password) {
        showPortalError('reg-err', 'Artist name, email, and password are required.');
        return;
      }

      try {
        registerBtn.disabled = true;
        const res = await API.post('/auth/artist/register', { artistName, realName, email, country, genre, password, soundcloud });
        if (res.success) {
          _artistSession = res.artist;
          injectLogoutButton();
          populateArtistDashboard(res.artist);
          document.querySelectorAll('.p-tab')[3]?.click();
        }
      } catch (e) {
        showPortalError('reg-err', e.message || 'Registration failed.');
      } finally {
        registerBtn.disabled = false;
      }
    };
  }

  // Wire dashboard new track submit
  const dashForm = document.getElementById('ds-new');
  if (dashForm) {
    const submitBtn = dashForm.querySelector('.sub-full') || dashForm.querySelector('button[type=submit]');
    if (submitBtn) submitBtn.onclick = (e) => { e.preventDefault(); dashSubmitTrack(); };
  }

  // Guard dashboard tab — redirect to login if not authenticated
  document.querySelectorAll('.p-tab').forEach((tab, i) => {
    if (i === 3) {
      const originalClick = tab.onclick;
      tab.addEventListener('click', (e) => {
        if (!_artistSession) {
          e.stopImmediatePropagation();
          document.querySelectorAll('.p-tab')[0]?.click();
          showPortalError('login-err', 'Please log in to access your dashboard.');
        }
      }, true);
    }
  });
});

/* ─────────────────────────────────────────────────────
   FILTER BUTTONS — wire to live API
───────────────────────────────────────────────────── */
document.querySelectorAll('.f-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('on'));
    this.classList.add('on');
    loadReleases(this.dataset.f || 'all');
  });
});

/* ─────────────────────────────────────────────────────
   INIT — Load all dynamic content on page load
───────────────────────────────────────────────────── */
function setupMobileNav() {
  const toggle = document.getElementById('nav-mobile-toggle');
  const panel = document.getElementById('nav-mobile-panel');
  if (!toggle || !panel) return;

  const closePanel = () => {
    panel.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  panel.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('click', () => {
      if (!el.classList.contains('n-admin')) closePanel();
    });
  });

  document.addEventListener('click', (event) => {
    if (!panel.classList.contains('open')) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    closePanel();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closePanel();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.allSettled([
    loadReleases(),
    loadArtists(),
    loadEvents(),
    loadNews(),
    checkArtistSession().then(() => { if (_artistSession) injectLogoutButton(); })
  ]);

  setupMobileNav();
});

