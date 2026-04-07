/**
 * app.js â€” Mixxea Records Frontend
 * Connects the static HTML to the Express API
 * Loaded after the main HTML via <script src="/js/app.js">
 */

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   API HELPERS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   RELEASES â€” load from API and render
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
        <button class="rc-play" onclick="playTrack(${i}, event)">â–¶</button>
        <div class="rc-cnt${i === 0 ? ' big' : ''}">
          <div class="rc-cat">${r.genre} Â· ${r.catNo}</div>
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ARTISTS â€” load roster from API
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   EVENTS â€” load from API
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
          <div class="ev-tix">${e.ticketLink ? `<a href="${e.ticketLink}" target="_blank" style="color:inherit">Get Tickets â†—</a>` : e.status === 'hold' ? 'On Hold' : 'TBA'}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.warn('Could not load events from API');
  }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   NEWS â€” load from API
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
        <div class="nc-arr">â†—</div>
      </div>
    `).join('');
  } catch (e) {
    console.warn('Could not load news from API');
  }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   NEWSLETTER FORM â€” live submit
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   CONTACT FORM â€” live submit
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DEMO SUBMIT â€” live submit with file upload
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ARTIST PORTAL â€” live auth
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function checkArtistSession() {
  try {
    const res = await API.get('/auth/artist/check');
    if (res.loggedIn) {
      const nameEl = document.querySelector('.du-name');
      if (nameEl) nameEl.textContent = res.artist.artistName;
    }
  } catch (e) {}
}

// Wire login button
document.addEventListener('DOMContentLoaded', () => {
  // Override the inline onclick for artist login
  const loginBtn = document.querySelector('#pp-login .sub-full');
  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email    = document.querySelector('#pp-login input[type=email]')?.value;
      const password = document.querySelector('#pp-login input[type=password]')?.value;
      try {
        const res = await API.post('/auth/artist/login', { email, password });
        if (res.success) {
          const nameEl = document.querySelector('.du-name');
          if (nameEl) nameEl.textContent = res.artist.artistName;
          // Switch to dashboard tab
          document.querySelectorAll('.p-tab')[3]?.click();
        } else {
          alert('Invalid credentials');
        }
      } catch (e) {
        alert(e.message || 'Login failed.');
      }
    };
  }

  const registerBtn = document.querySelector('#pp-reg .sub-full');
  if (registerBtn) {
    registerBtn.onclick = async () => {
      const section = document.getElementById('pp-reg');
      const artistName = getInputValue(section, 'input[placeholder="Your artist name"]');
      const realName = getInputValue(section, 'input[placeholder="Legal name"]');
      const email = getInputValue(section, 'input[type=email]');
      const country = section?.querySelector('select')?.value || '';
      const genre = section?.querySelectorAll('select')[1]?.value || '';
      const password = getInputValue(section, 'input[type=password]');
      const soundcloud = getInputValue(section, 'input[type=url]');

      if (!artistName || !email || !password) {
        alert('Artist name, email, and password are required.');
        return;
      }

      try {
        registerBtn.disabled = true;
        const res = await API.post('/auth/artist/register', {
          artistName,
          realName,
          email,
          country,
          genre,
          password,
          soundcloud,
        });

        if (res.success) {
          const nameEl = document.querySelector('.du-name');
          if (nameEl) nameEl.textContent = res.artist.artistName;
          document.querySelectorAll('.p-tab')[3]?.click();
        }
      } catch (e) {
        alert(e.message || 'Registration failed.');
      } finally {
        registerBtn.disabled = false;
      }
    };
  }
});

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   FILTER BUTTONS â€” wire to live API
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
document.querySelectorAll('.f-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('on'));
    this.classList.add('on');
    loadReleases(this.dataset.f || 'all');
  });
});

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   INIT â€” Load all dynamic content on page load
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    checkArtistSession()
  ]);

  setupMobileNav();
});

