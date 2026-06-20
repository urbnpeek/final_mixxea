/* FreqVault DJ Pool — frontend */

const API = {
  async req(path, opts = {}) {
    const r = await fetch('/api/dj-pool' + path, opts);
    const txt = await r.text();
    const data = txt ? JSON.parse(txt) : {};
    if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
    return data;
  },
  get: (p) => API.req(p),
  post: (p, b) => API.req(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }),
  put:  (p) => API.req(p, { method: 'PUT' }),
  del:  (p) => API.req(p, { method: 'DELETE' }),
  form: (p, fd) => API.req(p, { method: 'POST', body: fd }),
};

/* ── State ──────────────────────────────────────────────────────────────── */
const S = {
  tracks: [], facets: {}, crates: [], hearts: new Set(), drops: [], labels: [],
  sub: null, view: 'grid', adminMode: false,
  queue: [], queueIdx: -1,
  zipAbort: false,
  crateSortMode: '',
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
}
function energyDots(n, cls = 'energy-dot') {
  return [1,2,3,4,5].map(i => `<span class="${cls}${i <= n ? ' on' : ''}"></span>`).join('');
}
function artInitials(t) { return `${t.artist || t.title || '?'}`.slice(0, 2).toUpperCase(); }

function toast(msg, dur = 3000) {
  const el = document.getElementById('pool-toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), dur);
}

/* ── Rendering helpers ───────────────────────────────────────────────────── */
function tagHtml(t) {
  return [
    t.is_promo     ? '<span class="tag promo">Promo</span>'     : '',
    t.is_exclusive ? '<span class="tag exclusive">Exclusive</span>' : '',
    t.is_featured  ? '<span class="tag featured">Featured</span>'  : '',
  ].join('');
}

function coverHtml(t, cls = '') {
  const img = t.cover_image ? `<img src="${esc(t.cover_image)}" alt="" loading="lazy">` : '';
  return `<div class="${cls || 'track-card-art'}">
    ${img}<span class="art-init">${esc(artInitials(t))}</span>
    <div class="play-overlay"><button onclick="Pool.play('${esc(t.id)}')" title="Play">▶</button></div>
  </div>`;
}

function heartBtn(t, cls = 'heart-btn-overlay') {
  const on = S.hearts.has(t.id) ? ' on' : '';
  return `<button class="${cls}${on}" data-hid="${esc(t.id)}" onclick="Pool.toggleHeart('${esc(t.id)}',this)" title="Like">${S.hearts.has(t.id) ? '♥' : '♡'}</button>`;
}

function trackCard(t) {
  return `<div class="track-card" data-tid="${esc(t.id)}">
    ${coverHtml(t)}
    ${heartBtn(t)}
    <div class="track-card-body">
      <div class="track-card-tags">${tagHtml(t)}</div>
      <div class="track-card-title">${esc(t.title)}</div>
      <div class="track-card-artist">${esc(t.artist)} / ${esc(t.label)}</div>
      <div class="track-card-meta">
        <span>${t.bpm || '—'} BPM</span>
        <span style="color:var(--cyan)">${esc(t.musical_key || '—')}</span>
        <span>${esc(t.genre || '—')}</span>
      </div>
      <div class="energy-dots">${energyDots(t.energy_level)}</div>
      <div class="track-card-actions">
        <button class="btn sm" onclick="Pool.play('${esc(t.id)}')">▶ Play</button>
        <button class="btn sm" onclick="Pool.addToCrate('${esc(t.id)}')">+ Crate</button>
        <button class="btn sm primary" onclick="Pool.download('${esc(t.id)}')">⬇</button>
      </div>
    </div>
  </div>`;
}

function trackRow(t) {
  const artImg = t.cover_image ? `<img src="${esc(t.cover_image)}" alt="" loading="lazy">` : '';
  return `<div class="track-row" data-tid="${esc(t.id)}">
    <div class="track-row-art">${artImg}<span class="row-init">${esc(artInitials(t))}</span></div>
    <button class="heart-btn${S.hearts.has(t.id) ? ' on' : ''}" data-hid="${esc(t.id)}" onclick="Pool.toggleHeart('${esc(t.id)}',this)" title="Like">${S.hearts.has(t.id) ? '♥' : '♡'}</button>
    <div class="track-row-info">
      <div class="track-row-title">${esc(t.title)}</div>
      <div class="track-row-artist">${esc(t.artist)} · ${esc(t.label)}</div>
    </div>
    <div class="track-row-genre">${esc(t.genre)}</div>
    <div class="track-row-bpm">${t.bpm || '—'}</div>
    <div class="track-row-key">${esc(t.musical_key || '—')}</div>
    <div class="track-row-energy">${energyDots(t.energy_level, 'energy-dot')}</div>
    <div class="track-row-actions">
      ${tagHtml(t)}
      <button class="btn icon sm" onclick="Pool.play('${esc(t.id)}')" title="Play">▶</button>
      <button class="btn icon sm" onclick="Pool.addToCrate('${esc(t.id)}')" title="Add to crate">+</button>
      <button class="btn sm primary" onclick="Pool.download('${esc(t.id)}')">⬇</button>
    </div>
  </div>`;
}

function crateTrackRow(t, crateId, idx) {
  return `<div class="crate-track-row">
    <div class="crate-track-num">${idx + 1}</div>
    <div class="crate-track-info">
      <div class="crate-track-title">${esc(t.title)}</div>
      <div class="crate-track-sub">${esc(t.artist)} · ${t.bpm || '—'} BPM · ${esc(t.musical_key || '—')}</div>
    </div>
    <div style="display:flex;gap:5px;align-items:center">
      <button class="heart-btn${S.hearts.has(t.id) ? ' on' : ''}" data-hid="${esc(t.id)}" onclick="Pool.toggleHeart('${esc(t.id)}',this)">${S.hearts.has(t.id) ? '♥' : '♡'}</button>
      <button class="btn sm" onclick="Pool.download('${esc(t.id)}')">⬇</button>
      <button class="btn sm ghost" onclick="Pool.removeCrateTrack('${esc(crateId)}','${esc(t.id)}')">✕</button>
    </div>
  </div>`;
}

/* ── Pool namespace ─────────────────────────────────────────────────────── */
const Pool = {

  /* ── Tab navigation ─────────────────────────────────────────── */
  showTab(name) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    const pane = document.getElementById('tab-' + name);
    if (pane) pane.classList.add('active');
    const btn = document.querySelector(`.nav-tab[data-tab="${name}"]`);
    if (btn) btn.classList.add('active');
    if (name === 'hearts')  Pool.renderHearts();
    if (name === 'crate')   Pool.renderCrates();
    if (name === 'drops')   Pool.renderDrops();
    if (name === 'labels')  Pool.renderLabels();
    if (name === 'library') Pool.renderLibrary();
  },

  setView(v) {
    S.view = v;
    document.getElementById('view-grid').classList.toggle('active', v === 'grid');
    document.getElementById('view-list').classList.toggle('active', v === 'list');
    Pool.renderLibrary();
  },

  /* ── Data loading ────────────────────────────────────────────── */
  async loadAll() {
    await Promise.allSettled([Pool.loadTracks(), Pool.loadHearts(), Pool.loadCrates(), Pool.loadSub()]);
    Pool.renderDashboard();
    Pool.loadSuggested();
    if (S.adminMode) Pool.loadAdminAnalytics();
  },

  async loadTracks(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const data = await API.get('/tracks' + (qs ? '?' + qs : ''));
    S.tracks  = data.tracks  || [];
    S.facets  = data.facets  || {};
    Pool.renderFacets();
    return S.tracks;
  },

  async loadHearts() {
    try {
      const { hearts } = await API.get('/hearts');
      S.hearts = new Set(hearts || []);
    } catch { S.hearts = new Set(); }
  },

  async loadCrates() {
    try { S.crates = await API.get('/crates'); }
    catch { S.crates = []; }
    if (!Array.isArray(S.crates)) S.crates = [];
  },

  async loadSub() {
    try {
      const { subscription } = await API.get('/subscription');
      S.sub = subscription || null;
    } catch { S.sub = null; }
    Pool.renderSubStatus();
  },

  async loadDrops() {
    try { S.drops = await API.get('/drops'); }
    catch { S.drops = []; }
    if (!Array.isArray(S.drops)) S.drops = [];
  },

  async loadLabels() {
    try { S.labels = await API.get('/labels'); }
    catch { S.labels = []; }
  },

  async loadSuggested() {
    try {
      const { suggested, based_on } = await API.get('/tracks/suggested');
      const label = document.getElementById('suggested-label');
      const grid  = document.getElementById('suggested-grid');
      if (label) label.textContent = based_on ? `Picked For You — ${based_on}` : 'Picked For You';
      if (grid)  grid.innerHTML = (suggested || []).length
        ? suggested.map(trackCard).join('')
        : '<div class="empty-state" style="min-width:280px">Like some tracks and we\'ll suggest more.</div>';
    } catch {}
  },

  /* ── Rendering ───────────────────────────────────────────────── */
  renderSubStatus() {
    const pill   = document.getElementById('sub-pill');
    const banner = document.getElementById('sub-banner');
    if (S.sub) {
      if (pill)   { pill.textContent = S.sub.tier; pill.classList.add('active'); }
      if (banner) banner.classList.remove('show');
    } else {
      if (pill)   { pill.textContent = 'No Plan'; pill.classList.remove('active'); }
      if (banner) banner.classList.add('show');
    }
  },

  renderFacets() {
    const genres = document.getElementById('f-genre');
    const labels = document.getElementById('f-label');
    const keys   = document.getElementById('f-key');
    if (genres) genres.innerHTML = '<option value="">All Genres</option>' + (S.facets.genres || []).map(v => `<option>${esc(v)}</option>`).join('');
    if (labels) labels.innerHTML = '<option value="">All Labels</option>' + (S.facets.labels || []).map(v => `<option>${esc(v)}</option>`).join('');
    if (keys)   keys.innerHTML   = '<option value="">All Keys</option>'   + (S.facets.keys   || []).map(v => `<option>${esc(v)}</option>`).join('');
    // Genre quick tabs
    const gtabs = document.getElementById('genre-tabs');
    if (gtabs) {
      gtabs.innerHTML = ['', ...(S.facets.genres || [])].map(g =>
        `<button class="genre-tab${g === '' ? ' active' : ''}" onclick="Pool.filterGenre('${esc(g)}')">${g || 'All'}</button>`
      ).join('');
    }
  },

  renderDashboard() {
    const newest   = [...S.tracks].sort((a, b) => new Date(b.release_date) - new Date(a.release_date)).slice(0, 6);
    const trending = [...S.tracks].sort((a, b) => (b.download_count || 0) - (a.download_count || 0)).slice(0, 6);
    const setGrid  = (id, list) => { const el = document.getElementById(id); if (el) el.innerHTML = list.length ? list.map(trackCard).join('') : '<div class="empty-state">No tracks yet.</div>'; };
    setGrid('new-week-grid', newest);
    setGrid('trending-grid', trending);
  },

  renderLibrary() {
    const grid  = document.getElementById('library-grid');
    const count = document.getElementById('library-count');
    if (!grid) return;
    const tracks = Pool.filteredTracks();
    if (count) count.textContent = `${tracks.length} track${tracks.length !== 1 ? 's' : ''}`;
    if (!tracks.length) { grid.innerHTML = '<div class="empty-state">No tracks match the current filters.</div>'; return; }
    if (S.view === 'list') {
      grid.className = 'tracks-list';
      grid.innerHTML = tracks.map(trackRow).join('');
    } else {
      grid.className = 'tracks-grid';
      grid.innerHTML = tracks.map(trackCard).join('');
    }
  },

  filteredTracks() {
    const q      = (document.getElementById('f-q')?.value      || '').toLowerCase().trim();
    const genre  = (document.getElementById('f-genre')?.value  || '').toLowerCase();
    const label  = (document.getElementById('f-label')?.value  || '').toLowerCase();
    const key    = (document.getElementById('f-key')?.value    || '').toLowerCase();
    const energy = Number(document.getElementById('f-energy')?.value || 0);
    const minBpm = Number(document.getElementById('f-bpm-min')?.value || 0);
    const maxBpm = Number(document.getElementById('f-bpm-max')?.value || 999);
    return S.tracks.filter(t => {
      if (q      && !`${t.title} ${t.artist} ${t.label}`.toLowerCase().includes(q)) return false;
      if (genre  && t.genre.toLowerCase()       !== genre)  return false;
      if (label  && t.label.toLowerCase()       !== label)  return false;
      if (key    && t.musical_key.toLowerCase() !== key)    return false;
      if (energy && t.energy_level !== energy)              return false;
      if (t.bpm  < minBpm || t.bpm > maxBpm)               return false;
      return true;
    });
  },

  filterGenre(g) {
    const sel = document.getElementById('f-genre');
    if (sel) sel.value = g;
    document.querySelectorAll('.genre-tab').forEach(b => b.classList.toggle('active', b.textContent === (g || 'All')));
    Pool.renderLibrary();
  },

  renderHearts() {
    const grid = document.getElementById('hearts-grid');
    if (!grid) return;
    const hearted = S.tracks.filter(t => S.hearts.has(t.id));
    grid.innerHTML = hearted.length ? hearted.map(trackCard).join('') : '<div class="empty-state">Heart tracks in the library to see them here.</div>';
  },

  renderCrates(sortMode = S.crateSortMode) {
    S.crateSortMode = sortMode;
    const wrap = document.getElementById('crate-panels');
    if (!wrap) return;
    if (!S.crates.length) {
      wrap.innerHTML = '<div class="empty-state">Create a crate and add tracks from the Library.</div>';
      return;
    }
    wrap.innerHTML = S.crates.map(crate => {
      let tracks = [...(crate.tracks || [])];
      if (sortMode === 'bpm')    tracks.sort((a, b) => a.bpm - b.bpm);
      if (sortMode === 'key')    tracks.sort((a, b) => String(a.musical_key).localeCompare(String(b.musical_key)));
      if (sortMode === 'energy') tracks.sort((a, b) => a.energy_level - b.energy_level);
      return `<div class="crate-list-panel" style="margin-bottom:14px">
        <h3>${esc(crate.name)}</h3>
        <div class="crate-meta">${tracks.length} track${tracks.length !== 1 ? 's' : ''}</div>
        <div class="crate-actions">
          <button class="btn sm primary" onclick="Pool.downloadCrateZip('${esc(crate.id)}')">⬇ Download ZIP</button>
          <button class="btn sm" onclick="Pool.crateSort('bpm')">BPM</button>
          <button class="btn sm" onclick="Pool.crateSort('key')">Key</button>
          <button class="btn sm" onclick="Pool.crateSort('energy')">Energy</button>
          <button class="btn sm ghost" onclick="Pool.deleteCrate('${esc(crate.id)}')">Delete</button>
        </div>
        <div class="crate-tracks">
          ${tracks.length ? tracks.map((t, i) => crateTrackRow(t, crate.id, i)).join('') : '<div class="empty-state" style="padding:16px">Empty crate.</div>'}
        </div>
      </div>`;
    }).join('');
  },

  crateSort(mode) { Pool.renderCrates(mode); },

  renderDrops() {
    const grid = document.getElementById('drops-grid');
    if (!grid) return;
    if (!S.drops.length) { grid.innerHTML = '<div class="empty-state">No drops yet.</div>'; return; }
    grid.innerHTML = S.drops.map(d => {
      const artImg = d.cover_image ? `<img src="${esc(d.cover_image)}" alt="" loading="lazy">` : '';
      const initials = d.name.slice(0, 2).toUpperCase();
      return `<div class="drop-card">
        <div class="drop-card-art">
          ${artImg}<div class="drop-art-text">${esc(initials)}</div>
          ${d.genre ? `<span class="drop-genre-badge">${esc(d.genre)}</span>` : ''}
        </div>
        <div class="drop-card-body">
          <div class="drop-card-name">${esc(d.name)}</div>
          <div class="drop-card-desc">${esc(d.description || 'A curated selection of DJ-ready tracks.')}</div>
          <div class="drop-card-footer">
            <span class="drop-track-count">${(d.tracks || []).length} tracks</span>
            <div style="display:flex;gap:6px">
              <button class="btn sm" onclick="Pool.openDrop('${esc(d.id)}')">View Pack</button>
              ${(d.tracks || []).some(t => t.audio_url)
                ? `<button class="btn sm primary" onclick="Pool.downloadDropZip('${esc(d.id)}')">⬇ ZIP</button>`
                : ''}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  openDrop(id) {
    const drop = S.drops.find(d => d.id === id);
    if (!drop) return;
    const detail = document.getElementById('drop-detail');
    const tracks = drop.tracks || [];
    const artImg = drop.cover_image ? `<img src="${esc(drop.cover_image)}" alt="" loading="lazy">` : '';
    detail.innerHTML = `<div class="drop-detail">
      <div class="drop-detail-header">
        <div class="drop-detail-art">${artImg}<span style="font-family:var(--font-d);font-size:24px;color:rgba(232,255,0,.2)">${esc(drop.name.slice(0,2).toUpperCase())}</span></div>
        <div>
          <div class="eyebrow">${esc(drop.genre || 'Curated Pack')}</div>
          <h2 style="font-family:var(--font-d);font-size:32px;margin-bottom:8px">${esc(drop.name)}</h2>
          <p style="color:var(--muted);font-size:13px;margin-bottom:12px">${esc(drop.description || '')}</p>
          ${tracks.some(t => t.audio_url) ? `<button class="btn primary" onclick="Pool.downloadDropZip('${esc(drop.id)}')">⬇ Download All as ZIP</button>` : ''}
        </div>
      </div>
      <div class="tracks-grid">${tracks.length ? tracks.map(trackCard).join('') : '<div class="empty-state">No tracks in this drop yet.</div>'}</div>
    </div>`;
    detail.scrollIntoView({ behavior: 'smooth' });
  },

  renderLabels() {
    const grid = document.getElementById('labels-grid');
    if (!grid) return;
    grid.innerHTML = S.labels.map(l => `<div class="label-card">
      <div class="label-card-genre">${esc(l.genre_focus)}</div>
      <div class="label-card-name">${esc(l.name)}</div>
      <div class="label-card-desc">${esc(l.description)}</div>
      <div style="display:flex;gap:8px">
        <button class="btn sm" onclick="Pool.openLabel('${esc(l.id)}')">Browse Tracks</button>
      </div>
    </div>`).join('');
  },

  async openLabel(id) {
    try {
      const { label, tracks } = await API.get('/labels/' + id);
      const detail = document.getElementById('label-detail');
      detail.innerHTML = `<div style="border:1px solid var(--wire);background:var(--panel);padding:20px;margin-top:16px">
        <div class="eyebrow">${esc(label.genre_focus)}</div>
        <h2 style="font-family:var(--font-d);font-size:36px;margin-bottom:8px">${esc(label.name)}</h2>
        <p style="color:var(--muted);font-size:13px;margin-bottom:20px">${esc(label.description)}</p>
        <div class="tracks-grid">${tracks.length ? tracks.map(trackCard).join('') : '<div class="empty-state">No tracks yet.</div>'}</div>
      </div>`;
      detail.scrollIntoView({ behavior: 'smooth' });
    } catch (e) { toast(e.message); }
  },

  /* ── Hearts ──────────────────────────────────────────────────── */
  async toggleHeart(id, btn) {
    const wasOn = S.hearts.has(id);
    if (wasOn) { S.hearts.delete(id); await API.del('/hearts/' + id).catch(() => {}); }
    else        { S.hearts.add(id);   await API.put('/hearts/' + id).catch(() => {}); }
    // Update all heart buttons for this track
    document.querySelectorAll(`[data-hid="${id}"]`).forEach(el => {
      el.classList.toggle('on', !wasOn);
      el.textContent = wasOn ? '♡' : '♥';
      el.classList.add('pop');
      setTimeout(() => el.classList.remove('pop'), 400);
    });
    if (!wasOn) toast('Added to My Hearts');
    // Re-render hearts tab if visible
    if (document.getElementById('tab-hearts')?.classList.contains('active')) Pool.renderHearts();
    // Refresh suggestions
    Pool.loadSuggested();
  },

  /* ── Crates ──────────────────────────────────────────────────── */
  async createCrate() {
    const name = document.getElementById('crate-name-input')?.value.trim();
    if (!name) { toast('Enter a crate name first.'); return; }
    try {
      await API.post('/crates', { name });
      document.getElementById('crate-name-input').value = '';
      await Pool.loadCrates();
      Pool.renderCrates();
      toast(`Crate "${name}" created.`);
    } catch (e) { toast(e.message); }
  },

  async addToCrate(trackId) {
    try {
      await Pool.loadCrates();
      if (!S.crates.length) {
        await API.post('/crates', { name: 'Main Crate' });
        await Pool.loadCrates();
      }
      const crate = S.crates[0];
      await API.post(`/crates/${crate.id}/tracks`, { track_id: trackId });
      await Pool.loadCrates();
      toast('Added to crate.');
      if (document.getElementById('tab-crate')?.classList.contains('active')) Pool.renderCrates();
    } catch (e) { toast(e.message); }
  },

  async removeCrateTrack(crateId, trackId) {
    try {
      await API.del(`/crates/${crateId}/tracks/${trackId}`);
      await Pool.loadCrates();
      Pool.renderCrates();
    } catch (e) { toast(e.message); }
  },

  async deleteCrate(crateId) {
    try {
      await API.del('/crates/' + crateId);
      await Pool.loadCrates();
      Pool.renderCrates();
    } catch (e) { toast(e.message); }
  },

  /* ── Downloads ───────────────────────────────────────────────── */
  async download(trackId) {
    try {
      const { url } = await API.post('/download/' + trackId, {});
      window.open(url, '_blank', 'noopener');
      // Increment local count display
      const t = S.tracks.find(x => x.id === trackId);
      if (t) t.download_count = (t.download_count || 0) + 1;
      toast('Download started.');
    } catch (e) { toast(e.message); }
  },

  downloadCurrent() {
    if (S.queue[S.queueIdx]) Pool.download(S.queue[S.queueIdx].id);
  },

  /* ── ZIP download ────────────────────────────────────────────── */
  async downloadCrateZip(crateId) {
    const crate = S.crates.find(c => c.id === crateId);
    if (!crate || !(crate.tracks || []).length) { toast('Crate is empty.'); return; }
    await Pool.zipTracks(crate.tracks, crate.name);
  },

  async downloadDropZip(dropId) {
    const drop = S.drops.find(d => d.id === dropId);
    if (!drop || !(drop.tracks || []).length) { toast('Drop is empty.'); return; }
    await Pool.zipTracks(drop.tracks, drop.name);
  },

  async zipTracks(tracks, name) {
    const withAudio = tracks.filter(t => t.audio_url);
    if (!withAudio.length) { toast('No downloadable audio in this pack yet.'); return; }
    if (typeof JSZip === 'undefined') { toast('ZIP library not loaded. Check your connection.'); return; }

    const overlay  = document.getElementById('zip-overlay');
    const statusEl = document.getElementById('zip-status');
    const barEl    = document.getElementById('zip-bar');
    overlay.classList.add('show');
    S.zipAbort = false;

    try {
      const zip = new JSZip();
      let done  = 0;
      for (const t of withAudio) {
        if (S.zipAbort) { toast('ZIP cancelled.'); break; }
        statusEl.textContent = `Downloading ${done + 1} / ${withAudio.length}: ${t.title}`;
        barEl.style.width    = `${Math.round((done / withAudio.length) * 100)}%`;
        try {
          const resp = await fetch(t.audio_url);
          if (!resp.ok) throw new Error('fetch failed');
          const buf  = await resp.arrayBuffer();
          const ext  = t.audio_url.split('.').pop().split('?')[0] || 'mp3';
          const fn   = `${t.artist} - ${t.title}.${ext}`.replace(/[/\\:*?"<>|]/g, '-');
          zip.file(fn, buf);
        } catch {
          statusEl.textContent = `Skipped (unavailable): ${t.title}`;
        }
        done++;
        barEl.style.width = `${Math.round((done / withAudio.length) * 100)}%`;
      }
      if (!S.zipAbort) {
        statusEl.textContent = 'Compressing…';
        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href  = URL.createObjectURL(blob);
        link.download = `FreqVault — ${name}.zip`.replace(/[/\\:*?"<>|]/g, '-');
        link.click();
        URL.revokeObjectURL(link.href);
        toast(`ZIP downloaded: ${done} track${done !== 1 ? 's' : ''}.`);
      }
    } catch (e) {
      toast('ZIP failed: ' + e.message);
    } finally {
      barEl.style.width = '100%';
      setTimeout(() => { overlay.classList.remove('show'); barEl.style.width = '0%'; }, 600);
    }
  },

  zipCancel() { S.zipAbort = true; },

  /* ── Player ──────────────────────────────────────────────────── */
  play(id) {
    const track = S.tracks.find(t => t.id === id);
    if (!track) return;
    // Build queue from current visible tracks
    const all = S.tracks.filter(t => t.audio_url || true); // allow preview attempt
    S.queue    = all;
    S.queueIdx = all.findIndex(t => t.id === id);
    Pool._playTrack(track);
  },

  _playTrack(track) {
    const audio    = document.getElementById('pool-audio');
    const player   = document.getElementById('pool-player');
    const titleEl  = document.getElementById('player-title');
    const artistEl = document.getElementById('player-artist');
    const initEl   = document.getElementById('player-init');
    const artEl    = document.getElementById('player-art');
    const waveEl   = document.getElementById('player-wave');
    const playBtn  = document.getElementById('play-btn');

    titleEl.textContent  = track.title;
    artistEl.textContent = `${track.artist} / ${track.label}`;
    initEl.textContent   = artInitials(track);
    // Update cover art
    const existing = artEl.querySelector('img');
    if (existing) existing.remove();
    if (track.cover_image) {
      const img = document.createElement('img');
      img.src = track.cover_image;
      img.alt = '';
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
      artEl.prepend(img);
    }
    // Waveform
    waveEl.innerHTML = Array.from({ length: 60 }, (_, i) =>
      `<i style="height:${6 + ((i * 11 + 7) % 22)}px" class="${i < 15 ? 'active' : ''}"></i>`
    ).join('');
    if (track.audio_url) {
      audio.src = track.audio_url;
      audio.play().catch(() => {});
    } else {
      audio.removeAttribute('src');
      toast('No audio preview available for this track yet.');
    }
    player.classList.add('on');
    playBtn.innerHTML = '❚❚';
  },

  playerToggle() {
    const audio  = document.getElementById('pool-audio');
    const playBtn = document.getElementById('play-btn');
    if (audio.paused) { audio.play().catch(() => {}); playBtn.innerHTML = '❚❚'; }
    else              { audio.pause();                 playBtn.innerHTML = '▶'; }
  },

  playerPrev() {
    if (S.queueIdx > 0) { S.queueIdx--; Pool._playTrack(S.queue[S.queueIdx]); }
  },

  playerNext() {
    if (S.queueIdx < S.queue.length - 1) { S.queueIdx++; Pool._playTrack(S.queue[S.queueIdx]); }
  },

  playerClose() {
    document.getElementById('pool-audio').pause();
    document.getElementById('pool-player').classList.remove('on');
  },

  /* ── Subscriptions ───────────────────────────────────────────── */
  async activatePlan(tier) {
    try {
      const { subscription } = await API.post('/subscription', { tier });
      S.sub = subscription;
      Pool.renderSubStatus();
      toast(`${tier} plan activated.`);
    } catch (e) { toast(e.message); }
  },

  /* ── Admin ───────────────────────────────────────────────────── */
  adminTab(name) {
    const map = { upload: 'Upload Track', drop: 'Create Drop', analytics: 'Analytics' };
    document.querySelectorAll('.admin-tab').forEach(b => {
      b.classList.toggle('active', b.textContent.trim() === (map[name] || ''));
    });
    document.querySelectorAll('.admin-pane').forEach(p => p.classList.remove('active'));
    const pane = document.getElementById('adm-' + name);
    if (pane) pane.classList.add('active');
    if (name === 'analytics') Pool.loadAdminAnalytics();
  },

  async uploadTrack() {
    const form = document.getElementById('upload-form');
    const msg  = document.getElementById('upload-msg');
    const fd   = new FormData(form);
    msg.style.display = 'none';
    try {
      await API.form('/tracks', fd);
      form.reset();
      await Pool.loadTracks();
      Pool.renderDashboard();
      msg.style.display = 'block';
      msg.textContent   = 'Track uploaded successfully.';
      toast('Track uploaded.');
    } catch (e) {
      msg.style.display = 'block';
      msg.textContent   = 'Upload failed: ' + e.message;
      toast(e.message);
    }
  },

  async createDrop() {
    const form = document.getElementById('drop-form');
    const msg  = document.getElementById('drop-msg');
    const fd   = new FormData(form);
    msg.style.display = 'none';
    try {
      await API.form('/drops', fd);
      form.reset();
      await Pool.loadDrops();
      msg.style.display = 'block';
      msg.textContent   = 'Drop created.';
      toast('Drop created.');
    } catch (e) {
      msg.style.display = 'block';
      msg.textContent   = 'Failed: ' + e.message;
    }
  },

  async loadAdminAnalytics() {
    try {
      const { counts, topTracks } = await API.get('/admin/analytics');
      const meta = document.getElementById('adm-meta');
      const top  = document.getElementById('adm-top');
      if (meta) meta.innerHTML = [
        ['Tracks', counts.tracks],
        ['Downloads', counts.downloads],
        ['Crates', counts.crates],
        ['Subscribers', counts.active_subscriptions],
      ].map(([k, v]) => `<div class="meta-cell"><b>${k}</b><span>${v}</span></div>`).join('');
      if (top) top.innerHTML = (topTracks || []).map(t =>
        `<div class="admin-top-row"><span>${esc(t.artist)} — ${esc(t.title)}</span><span class="dl-count">${t.downloads} dl</span></div>`
      ).join('') || '<div class="empty-state">No downloads yet.</div>';
    } catch {}
  },

  /* ── Filters / search ────────────────────────────────────────── */
  bindFilters() {
    const ids = ['f-q','f-genre','f-label','f-key','f-energy','f-bpm-min','f-bpm-max'];
    let debounce;
    ids.forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => Pool.renderLibrary(), 160);
      });
    });
  },

  /* ── Init ─────────────────────────────────────────────────────── */
  async init() {
    // Tab clicks
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', () => Pool.showTab(btn.dataset.tab));
    });
    // Check admin mode
    try {
      const data = await fetch('/api/auth/admin/check').then(r => r.ok ? r.json() : null);
      if (data?.loggedIn) {
        S.adminMode = true;
        const adm = document.getElementById('admin-section');
        if (adm) adm.style.display = '';
      }
    } catch {}

    // Load everything
    await Pool.loadAll();
    await Promise.allSettled([Pool.loadDrops(), Pool.loadLabels()]);
    Pool.bindFilters();

    // Audio ended → auto-next
    document.getElementById('pool-audio')?.addEventListener('ended', () => Pool.playerNext());
  }
};

document.addEventListener('DOMContentLoaded', () => Pool.init().catch(console.error));
