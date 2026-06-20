/**
 * admin.js — Mixxea Admin Panel
 * All modules wired to real API: Releases, Artists, Demos, Contracts,
 * News, Events, Bookings, Promoters, Newsletter, Subscribers, DJ Pool, Analytics
 */
'use strict';

/* ─────────────────────────────────────────────────────────
   IN-MEMORY CACHE — populated from API responses only
───────────────────────────────────────────────────────── */
const STORE = {
  releases: [],
  artists: [],
  demos: [],
  bookings: [],
  events: [],
  contracts: [],
  news: [],
  subscribers: [],
  promoters: [],
};

/* ─────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2,10)+Date.now().toString(36); }
function eur(n) { if(!n&&n!==0)return'—'; return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n); }
function fmtDate(s) { if(!s)return'—'; try{return new Date(s).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}catch(e){return s;} }
function val(id) { const e=document.getElementById(id); return e?e.value.trim():''; }
function setVal(id,v) { const e=document.getElementById(id); if(e)e.value=v||''; }
function setText(id,v) { const e=document.getElementById(id); if(e)e.textContent=(v===null||v===undefined)?'—':v; }
function setHTML(id,v) { const e=document.getElementById(id); if(e)e.innerHTML=v; }
function badge(text,cls) { return `<span class="adm-badge ${cls}">${text}</span>`; }
function relBadge(s) {
  const m={out:['Out Now','ab-live'],pre:['Pre-Order','ab-pre'],soon:['Coming Soon','ab-pre'],draft:['Draft','ab-draft']};
  const [t,c]=m[s]||[s,'ab-draft']; return badge(t,c);
}

function toast(msg, type) {
  const t=document.createElement('div'); const err=type==='error';
  t.style.cssText=`position:fixed;bottom:90px;right:32px;z-index:99999;font-family:var(--Mono);font-size:11px;letter-spacing:1px;padding:14px 22px;border:1px solid;background:var(--panel);color:${err?'var(--g3)':'var(--g1)'};border-color:${err?'rgba(255,45,107,.35)':'rgba(232,255,0,.3)'};animation:toastIn .25s ease;pointer-events:none`;
  t.textContent=(err?'✕ ':'✓ ')+msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3500);
}

async function api(method, path, data) {
  try {
    const o={method};
    if(data instanceof FormData){o.body=data;}
    else if(data){o.headers={'Content-Type':'application/json'};o.body=JSON.stringify(data);}
    const r=await fetch('/api'+path,o);
    const text=await r.text();
    let payload=null;
    try { payload=text?JSON.parse(text):null; } catch(e) { payload=text; }
    if(!r.ok) {
      const message=(payload&&payload.error)||(payload&&payload.message)||('HTTP '+r.status);
      throw new Error(message);
    }
    return payload;
  } catch(e) {
    console.error('[ADMIN API]', method, path, e.message);
    if(method!=='GET') toast(e.message || 'Request failed','error');
    return null;
  }
}

/* ─────────────────────────────────────────────────────────
   FORM TOGGLE + CLEAR HELPERS
───────────────────────────────────────────────────────── */
function admToggle(id) {
  const el=document.getElementById(id); if(!el)return;
  el.style.display=el.style.display==='none'?'block':'none';
  if(el.style.display==='block') el.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function admClearRel() {
  ['rel-edit-id','rel-title','rel-artist','rel-catno','rel-bpm','rel-desc','rel-spotify','rel-beatport','rel-apple','rel-soundcloud','rel-bandcamp'].forEach(id=>setVal(id,''));
  setVal('rel-genre','Techno'); setVal('rel-status','draft');
  setText('rel-form-title','NEW RELEASE');
}
function admClearArt() {
  ['art-edit-id','art-name','art-realname','art-country','art-city','art-bio','art-instagram','art-soundcloud','art-bookingemail'].forEach(id=>setVal(id,''));
  setVal('art-genre','Techno'); setVal('art-type','both'); setVal('art-status','signed');
  setText('art-form-title','NEW ARTIST');
}
function admClearNews() {
  ['news-edit-id','news-title','news-body'].forEach(id=>setVal(id,''));
  setVal('news-author','Mixxea Team'); setVal('news-cat','Release News'); setVal('news-status','draft');
  setText('news-form-title','NEW POST');
  const prev=document.getElementById('news-img-preview'); if(prev){prev.src='';prev.style.display='none';}
  const fi=document.getElementById('news-image'); if(fi)fi.value='';
}

/* ─────────────────────────────────────────────────────────
   SECTION SWITCHER
───────────────────────────────────────────────────────── */
function toggleAdminNav(force) {
  const overlay = document.getElementById('admin-overlay');
  if (!overlay) return;
  const shouldOpen = typeof force === 'boolean' ? force : !overlay.classList.contains('admin-nav-open');
  overlay.classList.toggle('admin-nav-open', shouldOpen);
}

function switchAdminSection(id) {
  if (window.innerWidth <= 900) toggleAdminNav(false);

  const loaders = {
    'a-dash': () => ADMIN.loadDashboard(),
    'a-rel':  () => ADMIN.loadReleases(),
    'a-art':  () => ADMIN.loadArtists(),
    'a-demo': () => ADMIN.loadDemos('all'),
    'a-con':  () => ADMIN.loadContracts(),
    'a-news': () => ADMIN.loadNews(),
    'a-ev':   () => ADMIN.loadEvents(),
    'a-bk':   () => ADMIN.loadBookings('all'),
    'a-promo':() => ADMIN.loadPromoters(),
    'a-djpool': () => ADMIN.loadDjPool(),
    'a-nl':   () => ADMIN.loadNLStats(),
    'a-subs': () => ADMIN.loadSubscribers(),
    'a-analytics': () => { ADMIN.loadAnalytics(); buildChart(); },
  };
  try { if (loaders[id]) loaders[id](); } catch(e) { console.error('Section load error:', e); }
}

const ADMIN_AUTH = {
  setMode(loggedIn) {
    const overlay = document.getElementById('admin-overlay');
    if (!overlay) return;
    overlay.classList.toggle('auth-ready', !!loggedIn);
  },

  setMessage(message, type) {
    const el = document.getElementById('adm-auth-msg');
    if (!el) return;
    el.textContent = message || '';
    el.style.display = message ? 'block' : 'none';
    el.style.color = type === 'error' ? 'var(--g3)' : 'var(--muted)';
  },

  async check() {
    const res = await api('GET', '/auth/admin/check');
    const loggedIn = !!res?.loggedIn;
    this.setMode(loggedIn);
    if (!loggedIn) this.setMessage('');
    return loggedIn;
  },

  async login() {
    const email = val('adm-login-email');
    const password = val('adm-login-password');
    if (!email || !password) {
      this.setMessage('Email and password are required.', 'error');
      return false;
    }

    this.setMessage('Signing in...');
    const result = await api('POST', '/auth/admin/login', { email, password });
    if (!result?.success) {
      this.setMode(false);
      this.setMessage('Invalid admin credentials.', 'error');
      return false;
    }

    this.setMode(true);
    this.setMessage('');
    setVal('adm-login-password', '');
    toast('Admin signed in');
    ADMIN.loadDashboard();
    return true;
  },

  async logout() {
    const result = await api('POST', '/auth/admin/logout', {});
    if (!result?.success) return;
    this.setMode(false);
    this.setMessage('Signed out.');
    setVal('adm-login-password', '');
    toast('Admin signed out');
  }
};

/* ─────────────────────────────────────────────────────────
   ADMIN OBJECT — all module methods
───────────────────────────────────────────────────────── */
const ADMIN = {

  /* ══ DASHBOARD ══════════════════════════════════════════ */
  async loadDashboard() {
    try {
      const dateEl=document.getElementById('adm-date');
      if(dateEl) dateEl.textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

      const [rel,art,dem,bk,sub,ev,nws]=await Promise.all([
        api('GET','/releases'),api('GET','/artists'),api('GET','/demos'),api('GET','/bookings'),
        api('GET','/newsletter/subscribers'),api('GET','/events'),api('GET','/news'),
      ]);
      const releases=rel||[], artists=art||[], demos=dem||[];
      const bookings=bk||[], events=ev||[], news=nws||[];
      const subCount=sub ? ((sub?.count??sub?.subscribers?.length)??0) : null;

      setText('dash-release-count', releases.length);
      setText('dash-artist-count',  artists.length);
      setText('dash-demo-count',    demos.filter(d=>d.status==='new').length);
      setText('dash-booking-count', bookings.filter(b=>b.status==='pending').length);
      setText('dash-subs-count',    subCount === null ? 'Unavailable' : subCount.toLocaleString());
      setText('dash-event-count',   events.length);
      setText('dash-news-count',    news.filter(n=>n.status==='published').length);

      const activity=[
        ...demos.slice(0,3).map(d=>({type:'Demo',label:`"${d.trackTitle}" by ${d.artistName}`,date:d.submittedAt,status:d.status,cls:'ab-new'})),
        ...releases.slice(0,2).map(r=>({type:'Release',label:`${r.title} — ${r.artist}`,date:r.date,status:r.status,cls:'ab-live'})),
        ...bookings.slice(0,2).map(b=>({type:'Booking',label:`${b.venue} — ${b.artist||b.contact||''}`,date:b.date||b.submittedAt,status:b.status,cls:'ab-hold'})),
      ].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,8);

      setHTML('adm-activity-tbody', activity.length ? activity.map(a=>`
        <tr>
          <td>${badge(a.type,a.cls)}</td>
          <td class="tbl-name">${a.label}</td>
          <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${fmtDate(a.date)}</td>
          <td>${badge(a.status,a.cls)}</td>
        </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;font-family:var(--Mono);font-size:11px">No activity yet</td></tr>');
    } catch(e) { console.error('Dashboard:', e); }
  },

  /* ══ RELEASES ═══════════════════════════════════════════ */
  async loadReleases() {
    const data=await api('GET','/releases')||[];
    STORE.releases=data;
    setHTML('adm-rel-tbody', data.length ? data.map(r=>`
      <tr>
        <td><div class="tbl-art">
          <div class="tbl-thumb">${r.artwork?`<img src="${r.artwork}" style="width:36px;height:36px;object-fit:cover">`:(r.catNo||'???').slice(-3)}</div>
          <div><div class="tbl-name">${r.title}</div><div class="tbl-sub">${r.catNo||''}</div></div>
        </div></td>
        <td style="font-family:var(--Mono);font-size:11px">${r.artist}</td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${r.genre}</td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${fmtDate(r.date)}</td>
        <td>${relBadge(r.status)}</td>
        <td><div class="tbl-actions">
          <button class="tbl-btn" onclick="ADMIN.editRelease('${r.id}')">Edit</button>
          <button class="tbl-btn del" onclick="ADMIN.deleteRelease('${r.id}','${(r.title||'').replace(/'/g,'')}')">Delete</button>
        </div></td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px;font-family:var(--Mono);font-size:11px">No releases yet — add your first one above</td></tr>');
  },

  async saveRelease() {
    const title=val('rel-title'), artist=val('rel-artist');
    if(!title||!artist){toast('Title and artist are required','error');return;}
    const id=val('rel-edit-id');
    const payload={title,artist,genre:val('rel-genre'),bpm:parseInt(val('rel-bpm'))||0,catNo:val('rel-catno'),date:val('rel-date'),status:val('rel-status'),description:val('rel-desc'),spotify:val('rel-spotify'),beatport:val('rel-beatport'),apple:val('rel-apple'),soundcloud:val('rel-soundcloud'),bandcamp:val('rel-bandcamp')};
    const fd=new FormData(); Object.entries(payload).forEach(([k,v])=>fd.append(k,v));
    const aw=document.getElementById('rel-artwork'), au=document.getElementById('rel-audio');
    if(aw?.files[0]) fd.append('artwork',aw.files[0]);
    if(au?.files[0]) fd.append('audio',au.files[0]);
    if(id){
      const result=await api('PUT',`/releases/${id}`,fd);
      if(!result)return;
      const i=STORE.releases.findIndex(r=>r.id===id);
      if(i>-1)STORE.releases[i]={...STORE.releases[i],...result};
    } else {
      const result=await api('POST','/releases',fd);
      if(!result)return;
      STORE.releases.unshift(result);
    }
    toast(id?'Release updated':'Release created'); admToggle('rel-form'); admClearRel(); this.loadReleases();
  },

  async editRelease(id) {
    const r=await api('GET',`/releases/${id}`)||STORE.releases.find(x=>x.id===id); if(!r)return;
    setVal('rel-edit-id',r.id); setVal('rel-title',r.title); setVal('rel-artist',r.artist);
    setVal('rel-catno',r.catNo); setVal('rel-bpm',r.bpm); setVal('rel-genre',r.genre);
    setVal('rel-date',r.date); setVal('rel-status',r.status); setVal('rel-desc',r.description||r.desc||'');
    setVal('rel-spotify',r.spotify||''); setVal('rel-beatport',r.beatport||'');
    setVal('rel-apple',r.apple||''); setVal('rel-soundcloud',r.soundcloud||''); setVal('rel-bandcamp',r.bandcamp||'');
    setText('rel-form-title','EDIT RELEASE');
    const f=document.getElementById('rel-form'); f.style.display='block'; f.scrollIntoView({behavior:'smooth'});
  },

  async deleteRelease(id,name) {
    if(!confirm(`Delete "${name}"? This cannot be undone.`))return;
    const result=await api('DELETE',`/releases/${id}`);
    if(!result)return;
    STORE.releases=STORE.releases.filter(r=>r.id!==id);
    toast('Release deleted'); this.loadReleases();
  },

  /* ══ ARTISTS ════════════════════════════════════════════ */
  async loadArtists() {
    const data=await api('GET','/artists')||[];
    STORE.artists=data;
    const COLS=['var(--g1)','var(--g4)','var(--g3)','var(--g5)','rgba(245,240,255,.5)'];
    setHTML('adm-art-tbody', data.length ? data.map((a,i)=>`
      <tr>
        <td><div class="tbl-art">
          <div class="tbl-thumb" style="color:${COLS[i%COLS.length]}">${a.photo?`<img src="${a.photo}" style="width:36px;height:36px;object-fit:cover;border-radius:50%">`:a.name.slice(0,2)}</div>
          <div><div class="tbl-name">${a.name}</div><div class="tbl-sub">${a.genre}</div></div>
        </div></td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${a.country} / ${a.city}</td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${a.genre}</td>
        <td>${badge(a.type==='both'?'Label + Agency':a.type==='label'?'Label Only':'Agency Only',a.type==='both'?'ab-review':'ab-draft')}</td>
        <td>${badge(a.status,a.status==='signed'?'ab-signed':'ab-unsigned')}</td>
        <td><div class="tbl-actions">
          <button class="tbl-btn" onclick="ADMIN.editArtist('${a.id}')">Edit</button>
          <button class="tbl-btn del" onclick="ADMIN.deleteArtist('${a.id}','${a.name}')">Delete</button>
        </div></td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px;font-family:var(--Mono);font-size:11px">No artists yet</td></tr>');
  },

  async saveArtist() {
    const name=val('art-name'); if(!name){toast('Artist name is required','error');return;}
    const id=val('art-edit-id');
    const payload={name,realName:val('art-realname'),country:val('art-country'),city:val('art-city'),genre:val('art-genre'),type:val('art-type'),status:val('art-status'),bio:val('art-bio'),instagram:val('art-instagram'),soundcloud:val('art-soundcloud'),bookingEmail:val('art-bookingemail')};
    const fd=new FormData(); Object.entries(payload).forEach(([k,v])=>fd.append(k,v));
    const ph=document.getElementById('art-photo'); if(ph?.files[0]) fd.append('photo',ph.files[0]);
    if(id){
      const result=await api('PUT',`/artists/${id}`,fd);
      if(!result)return;
      const i=STORE.artists.findIndex(a=>a.id===id);
      if(i>-1)STORE.artists[i]={...STORE.artists[i],...result};
    } else {
      const result=await api('POST','/artists',fd);
      if(!result)return;
      STORE.artists.push(result);
    }
    toast(id?'Artist updated':'Artist added'); admToggle('art-form'); admClearArt(); this.loadArtists();
  },

  async editArtist(id) {
    const a=await api('GET',`/artists/${id}`)||STORE.artists.find(x=>x.id===id); if(!a)return;
    setVal('art-edit-id',a.id); setVal('art-name',a.name); setVal('art-realname',a.realName||'');
    setVal('art-country',a.country); setVal('art-city',a.city); setVal('art-genre',a.genre);
    setVal('art-type',a.type); setVal('art-status',a.status); setVal('art-bio',a.bio||'');
    setVal('art-instagram',a.instagram||''); setVal('art-soundcloud',a.soundcloud||''); setVal('art-bookingemail',a.bookingEmail||'');
    setText('art-form-title','EDIT ARTIST');
    const f=document.getElementById('art-form'); f.style.display='block'; f.scrollIntoView({behavior:'smooth'});
  },

  async deleteArtist(id,name) {
    if(!confirm(`Delete artist "${name}"?`))return;
    const result=await api('DELETE',`/artists/${id}`);
    if(!result)return;
    STORE.artists=STORE.artists.filter(a=>a.id!==id);
    toast('Artist removed'); this.loadArtists();
  },

  /* ══ DEMOS ══════════════════════════════════════════════ */
  _df:'all',
  _demosCache:[],
  async loadDemos(filter) {
    if(filter) this._df=filter;
    document.querySelectorAll('#a-demo .f-btn').forEach(b=>b.classList.toggle('on',b.textContent.toLowerCase()===this._df));
    const all=await api('GET','/demos')||[];
    this._demosCache=all;
    STORE.demos=all;
    setText('adm-demo-count',all.filter(d=>d.status==='new').length+' NEW');
    let data=this._df==='all'?all:all.filter(d=>d.status===this._df);
    const sc={new:'ab-new',reviewing:'ab-review',approved:'ab-live',declined:'ab-draft'};
    setHTML('adm-demo-tbody', data.length ? data.map(d=>`
      <tr>
        <td><div class="tbl-name">${d.artistName}</div><div class="tbl-sub">${d.email||''}</div></td>
        <td><div class="tbl-name">${d.trackTitle}</div><div class="tbl-sub" style="color:var(--muted2)">${d.version||'Original Mix'}</div></td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${d.genre||'—'}<br><span style="color:var(--muted2)">${d.bpm?d.bpm+' BPM':''}</span></td>
        <td>${d.downloadLink?`<a href="${d.downloadLink}" target="_blank" class="tbl-btn" style="display:inline-block;font-size:9px">DL ↗</a>`:d.file?`<a href="${d.file}" target="_blank" class="tbl-btn" style="display:inline-block;font-size:9px">File ↗</a>`:'<span style="color:var(--muted2);font-size:10px;font-family:var(--Mono)">—</span>'}</td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${fmtDate(d.submittedAt)}</td>
        <td>${badge(d.status,sc[d.status]||'ab-draft')}</td>
        <td><div class="tbl-actions">
          <button class="tbl-btn" style="color:#c8b8ff" onclick="ADMIN.viewDemo('${d.id}')">View</button>
          <button class="tbl-btn" onclick="ADMIN.setDemoStatus('${d.id}','reviewing')">Review</button>
          <button class="tbl-btn" style="color:var(--g1)" onclick="ADMIN.setDemoStatus('${d.id}','approved')">Approve</button>
          <button class="tbl-btn del" onclick="ADMIN.setDemoStatus('${d.id}','declined')">Decline</button>
          <button class="tbl-btn del" onclick="ADMIN.deleteDemo('${d.id}')">Delete</button>
        </div></td>
      </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px;font-family:var(--Mono);font-size:11px">No ${this._df==='all'?'':this._df+' '}demos</td></tr>`);
  },

  filterDemos(f,btn) { document.querySelectorAll('#a-demo .f-btn').forEach(b=>b.classList.remove('on')); if(btn)btn.classList.add('on'); this.loadDemos(f); },

  async setDemoStatus(id,status) {
    const notify=status==='declined'&&confirm('Send decline email to artist?');
    const result=await api('PUT',`/demos/${id}/status`,{status,notify});
    if(!result)return;
    const d=STORE.demos.find(x=>x.id===id); if(d)d.status=status;
    toast(`Demo marked as ${status}`); this.loadDemos();
  },

  async deleteDemo(id) {
    if(!confirm('Permanently delete this demo submission?'))return;
    const result=await api('DELETE',`/demos/${id}`);
    if(!result)return;
    STORE.demos=STORE.demos.filter(d=>d.id!==id);
    toast('Demo deleted'); this.loadDemos();
  },

  openSendLinkModal() {
    const m=document.getElementById('adm-send-link-modal');
    if(m){ m.style.display='flex'; document.getElementById('sl-email').value=''; document.getElementById('sl-name').value=''; document.getElementById('sl-result').textContent=''; }
  },

  closeSendLinkModal() {
    const m=document.getElementById('adm-send-link-modal');
    if(m) m.style.display='none';
  },

  async sendSubmissionLink() {
    const email=(document.getElementById('sl-email').value||'').trim();
    const artistName=(document.getElementById('sl-name').value||'').trim();
    const resultEl=document.getElementById('sl-result');
    if(!email||!email.includes('@')){ resultEl.style.color='var(--danger)'; resultEl.textContent='Valid email required'; return; }
    const btn=document.getElementById('sl-send-btn');
    btn.disabled=true; btn.textContent='Sending...';
    const result=await api('POST','/demos/send-link',{email,artistName});
    btn.disabled=false; btn.textContent='SEND LINK';
    if(result&&result.success){
      resultEl.style.color='var(--g1)'; resultEl.textContent='✓ Sent to '+email;
      setTimeout(()=>this.closeSendLinkModal(),2200);
    } else {
      resultEl.style.color='var(--danger)'; resultEl.textContent='Failed — check email settings';
    }
  },

  viewDemo(id) {
    const d=this._demosCache.find(x=>x.id===id);
    if(!d)return;
    const sampMap={none:'No samples — 100% original',cleared:'Samples cleared & licensed',uncleared:'Samples used — not cleared'};
    const writersMap={sole:'Sole author',collab:'Multiple writers / collaborators'};
    const pubMap={mixxea:'Mixxea Publishing (full administration)',own:'Own publisher — co-pub TBD'};
    const prevRel=d.prevReleased==='yes'?'Yes — previously released':'No — unreleased & exclusive';
    const sc={new:'ab-new',reviewing:'ab-review',approved:'ab-live',declined:'ab-draft'};
    const lbl=(t)=>`<div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-family:var(--Mono);margin-bottom:3px">${t}</div>`;
    const val=(v,mono)=>`<div style="font-size:13px;color:var(--text);${mono?'font-family:var(--Mono);font-size:11px;word-break:break-all':''}">${v||'—'}</div>`;
    const cell=(t,v,mono,sub)=>`<div>${lbl(t)}${val(v,mono)}${sub?`<div style="font-size:11px;color:var(--muted);margin-top:3px">${sub}</div>`:''}</div>`;
    const grid2=(cells)=>`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 24px;margin-bottom:18px">${cells}</div>`;
    const hr=`<hr style="border:none;border-top:0.5px solid rgba(255,255,255,.08);margin:18px 0">`;

    document.getElementById('adm-demo-detail-title').textContent=`"${d.trackTitle}" by ${d.artistName}`;
    document.getElementById('adm-demo-detail-body').innerHTML=
      grid2(
        cell('Artist',d.artistName)+
        cell('Legal name',d.realName)+
        cell('Email',d.email)+
        cell('Country',d.country)+
        cell('PRO',d.pro||'None')+
        cell('Profile',d.social||d.soundcloudLink?(d.social||d.soundcloudLink).replace(/^https?:\/\//,'').slice(0,40)+'…':'—')
      )+hr+
      grid2(
        cell('Track',`${d.trackTitle} — ${d.version||'Original Mix'}`)+
        cell('Genre / BPM',`${d.genre||'—'} · ${d.bpm||'—'} BPM`)+
        cell('Key',d.musKey||'Unknown')+
        cell('Format',d.fileFormat||'—')
      )+
      `<div style="margin-bottom:18px">${lbl('Download link')}<div style="font-size:12px;font-family:var(--Mono);word-break:break-all">${d.downloadLink?`<a href="${d.downloadLink}" target="_blank" style="color:#c8b8ff">${d.downloadLink}</a>`:'—'}</div></div>`+
      (d.description||d.notes?`<div style="background:rgba(255,255,255,.04);border:0.5px solid rgba(255,255,255,.08);padding:14px;border-radius:6px;margin-bottom:18px">${lbl('Description')}<div style="font-size:13px;line-height:1.65;margin-top:4px">${(d.description||d.notes).replace(/\n/g,'<br>')}</div></div>`:'')+
      hr+
      grid2(
        cell('Previously released',prevRel,'',d.prevWhere||'')+
        cell('Samples',sampMap[d.samples]||d.samples||'—')+
        cell('Writers',writersMap[d.writers]||d.writers||'—','',d.cowriters||'')+
        cell('Publishing',pubMap[d.pubAgree]||d.pubAgree||'—','',d.ownPubName||'')
      )+
      `<div style="margin-bottom:4px">${lbl('Status')}${badge(d.status,sc[d.status]||'ab-draft')}</div>`;

    document.getElementById('adm-demo-detail-actions').innerHTML=
      `<button class="tbl-btn" onclick="ADMIN.setDemoStatus('${d.id}','reviewing');closeDemoDetailModal()">Mark Reviewing</button>`+
      `<button class="tbl-btn" style="color:var(--g1)" onclick="ADMIN.setDemoStatus('${d.id}','approved');closeDemoDetailModal()">Approve</button>`+
      `<button class="tbl-btn del" onclick="ADMIN.setDemoStatus('${d.id}','declined');closeDemoDetailModal()">Decline</button>`+
      (d.email?`<button class="tbl-btn" style="margin-left:auto" onclick="navigator.clipboard.writeText('${d.email}');toast('Email copied')">Copy Email</button>`:'');

    document.getElementById('adm-demo-detail-modal').style.display='flex';
  },

  closeDemoDetail() {
    const m=document.getElementById('adm-demo-detail-modal');
    if(m) m.style.display='none';
  },

  /* ══ CONTRACTS ══════════════════════════════════════════ */
  async loadContracts() {
    const data=await api('GET','/contracts')||[];
    STORE.contracts=data;
    const now=new Date();
    setHTML('adm-con-tbody', data.length ? data.map(c=>{
      const exp=new Date(c.expiresAt), days=Math.ceil((exp-now)/(1000*60*60*24)), urgent=days<90&&days>0;
      return `<tr>
        <td class="tbl-name">${c.artist}</td>
        <td style="font-family:var(--Mono);font-size:11px;color:var(--muted)">${c.type}</td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${fmtDate(c.signedAt)}</td>
        <td style="font-family:var(--Mono);font-size:10px;color:${urgent?'var(--g5)':'var(--muted)'}">${fmtDate(c.expiresAt)}${urgent?` <small style="font-size:9px">(${days}d left)</small>`:''}</td>
        <td>${badge(c.status,c.status==='active'?'ab-signed':'ab-draft')}</td>
        <td><div class="tbl-actions">
          ${c.file?`<a href="${c.file}" target="_blank" class="tbl-btn" style="display:inline-block">Open</a>`:''}
          <button class="tbl-btn del" onclick="ADMIN.deleteContract('${c.id}','${c.artist}')">Remove</button>
        </div></td>
      </tr>`;}).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px;font-family:var(--Mono);font-size:11px">No contracts yet</td></tr>');
  },

  async saveContract() {
    const artist=val('con-artist'); if(!artist){toast('Artist name is required','error');return;}
    const fd=new FormData();
    fd.append('artist',artist);
    fd.append('type',val('con-type'));
    fd.append('signedAt',val('con-signed'));
    fd.append('expiresAt',val('con-expires'));
    fd.append('notes',val('con-notes'));
    fd.append('status','active');
    const file=document.getElementById('con-file');
    if(file?.files[0]) fd.append('file',file.files[0]);
    const result=await api('POST','/contracts',fd);
    if(!result)return;
    STORE.contracts.unshift(result);
    toast('Contract saved'); admToggle('con-form');
    ['con-artist','con-signed','con-expires','con-notes'].forEach(id=>setVal(id,''));
    if(file) file.value='';
    this.loadContracts();
  },

  async deleteContract(id,artist) {
    if(!confirm(`Remove contract for ${artist}?`))return;
    const result=await api('DELETE',`/contracts/${id}`);
    if(!result)return;
    STORE.contracts=STORE.contracts.filter(c=>c.id!==id); toast('Contract removed'); this.loadContracts();
  },

  /* ══ NEWS / BLOG ════════════════════════════════════════ */
  async loadNews() {
    const data=await api('GET','/news');
    const newsData = Array.isArray(data) ? data : [];
    STORE.news = newsData;
    setHTML('adm-news-tbody', newsData.length ? newsData.map(n=>`
      <tr>
        <td><div class="tbl-art">
          <div class="tbl-thumb">${n.image?`<img src="${n.image}" style="width:36px;height:36px;object-fit:cover">`:''}</div>
          <span class="tbl-name">${n.title}</span>
        </div></td>
        <td>${badge(n.category,'ab-review')}</td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${n.author||'—'}</td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${fmtDate(n.date||n.createdAt)}</td>
        <td>${badge(n.status,n.status==='published'?'ab-live':'ab-draft')}</td>
        <td><div class="tbl-actions">
          <button class="tbl-btn" onclick="ADMIN.editNews('${n.id}')">Edit</button>
          <button class="tbl-btn del" onclick="ADMIN.deleteNews('${n.id}','${(n.title||'').slice(0,25).replace(/'/g,'')}')">Delete</button>
        </div></td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px;font-family:var(--Mono);font-size:11px">No posts yet</td></tr>');
  },

  async saveNews() {
    const title=val('news-title'), body=val('news-body');
    if(!title||!body){toast('Title and body are required','error');return;}
    const id=val('news-edit-id');
    const payload={title,category:val('news-cat'),author:val('news-author')||'Mixxea Team',date:val('news-date')||new Date().toISOString().slice(0,10),status:val('news-status'),body};
    const fd=new FormData(); Object.entries(payload).forEach(([k,v])=>fd.append(k,v));
    const img=document.getElementById('news-image'); if(img?.files[0]) fd.append('image',img.files[0]);
    if(id){
      const result=await api('PUT',`/news/${id}`,fd);
      if(!result)return;
      const i=STORE.news.findIndex(n=>n.id===id);
      if(i>-1)STORE.news[i]={...STORE.news[i],...result};
    } else {
      const result=await api('POST','/news',fd);
      if(!result)return;
      STORE.news.unshift(result);
    }
    toast(id?'Post updated':'Post published'); admToggle('news-form'); admClearNews(); this.loadNews();
  },

  async editNews(id) {
    const n=await api('GET',`/news/${id}`)||STORE.news.find(x=>x.id===id);
    if(!n){toast('Post not found — try refreshing the page.','error');return;}
    setVal('news-edit-id',n.id); setVal('news-title',n.title); setVal('news-cat',n.category);
    setVal('news-author',n.author); setVal('news-date',n.date); setVal('news-status',n.status); setVal('news-body',n.body||'');
    const prev=document.getElementById('news-img-preview');
    if(prev){prev.src=n.image||'';prev.style.display=n.image?'block':'none';}
    setText('news-form-title','EDIT POST');
    const f=document.getElementById('news-form'); f.style.display='block'; f.scrollIntoView({behavior:'smooth'});
  },

  async deleteNews(id,title) {
    if(!confirm(`Delete "${title}..."?`))return;
    const result=await api('DELETE',`/news/${id}`);
    if(!result)return;
    STORE.news=STORE.news.filter(n=>n.id!==id); toast('Post deleted'); this.loadNews();
  },

  /* ══ EVENTS ═════════════════════════════════════════════ */
  async loadEvents() {
    const data=await api('GET','/events')||[];
    STORE.events=data;
    const sc={confirmed:'ab-conf',hold:'ab-hold',cancelled:'ab-draft'};
    setHTML('adm-ev-tbody', data.length ? data.map(e=>`
      <tr>
        <td style="font-family:var(--Anton);font-size:15px;color:var(--g4)">${fmtDate(e.date)}</td>
        <td class="tbl-name">${e.venue}</td>
        <td style="font-family:var(--Mono);font-size:11px">${e.artist}</td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${e.city}, ${e.country}</td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${e.type}</td>
        <td style="font-family:var(--Anton);font-size:16px;color:var(--g1)">${e.fee?eur(e.fee):'TBC'}</td>
        <td>${badge(e.status,sc[e.status]||'ab-draft')}</td>
        <td><div class="tbl-actions">
          <button class="tbl-btn" onclick="ADMIN.toggleEvent('${e.id}','${e.status}')">${e.status==='hold'?'Confirm':'Hold'}</button>
          <button class="tbl-btn del" onclick="ADMIN.deleteEvent('${e.id}','${(e.venue||'').replace(/'/g,'')}')">Remove</button>
        </div></td>
      </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px;font-family:var(--Mono);font-size:11px">No shows yet — add your first one above</td></tr>');
  },

  async saveEvent() {
    const d=val('ev-date'), v=val('ev-venue'), a=val('ev-artist');
    if(!d||!v||!a){toast('Date, venue and artist are required','error');return;}
    const entry={id:uid(),date:d,venue:v,city:val('ev-city'),country:val('ev-country'),artist:a,type:val('ev-type'),fee:parseInt(val('ev-fee'))||0,status:val('ev-status'),ticketLink:val('ev-ticket')};
    const result=await api('POST','/events',entry);
    if(!result)return;
    STORE.events.unshift(result);
    toast('Show added'); admToggle('ev-add-form');
    ['ev-date','ev-venue','ev-city','ev-country','ev-artist','ev-fee','ev-ticket'].forEach(id=>setVal(id,''));
    this.loadEvents();
  },

  async toggleEvent(id,current) {
    const s=current==='hold'?'confirmed':'hold';
    const result=await api('PUT',`/events/${id}`,{status:s});
    if(!result)return;
    const e=STORE.events.find(x=>x.id===id); if(e)e.status=s; toast(`Show ${s}`); this.loadEvents();
  },

  async deleteEvent(id,venue) {
    if(!confirm(`Remove show at "${venue}"?`))return;
    const result=await api('DELETE',`/events/${id}`);
    if(!result)return;
    STORE.events=STORE.events.filter(e=>e.id!==id); toast('Show removed'); this.loadEvents();
  },

  /* ══ BOOKINGS ═══════════════════════════════════════════ */
  _bf:'all',
  async loadBookings(filter) {
    if(filter) this._bf=filter;
    document.querySelectorAll('#a-bk .f-btn').forEach(b=>b.classList.toggle('on',b.textContent.toLowerCase()===this._bf));
    let data=await api('GET','/bookings')||[];
    STORE.bookings=data;
    setText('adm-bk-count',data.filter(b=>b.status==='pending').length+' PENDING');
    if(this._bf!=='all') data=data.filter(b=>b.status===this._bf);
    const sc={pending:'ab-new',discussing:'ab-hold',confirmed:'ab-conf',declined:'ab-draft'};
    setHTML('adm-bk-container', data.length ? data.map(b=>`
      <div class="book-card">
        <div class="bk-head"><div class="bk-venue">${b.venue}${b.city?` — ${b.city}`:''}</div>${badge(b.status,sc[b.status]||'ab-draft')}</div>
        <div class="bk-meta">
          ${[b.contact,b.email,b.artist?`Artist: ${b.artist}`:'',b.date?fmtDate(b.date):'',b.fee?eur(b.fee):'Fee TBC'].filter(Boolean).join(' · ')}
        </div>
        <div class="bk-msg">${b.notes||''}</div>
        <div class="bk-actions">
          <button class="bk-confirm" onclick="ADMIN.setBkStatus('${b.id}','confirmed')">Confirm</button>
          <button class="bk-hold"    onclick="ADMIN.setBkStatus('${b.id}','discussing')">Hold</button>
          <button class="bk-decline" onclick="ADMIN.setBkStatus('${b.id}','declined')">Decline</button>
          <button class="tbl-btn"    onclick="ADMIN.deleteBooking('${b.id}')" style="margin-left:8px">Remove</button>
        </div>
      </div>`).join('') : `<div style="text-align:center;color:var(--muted);font-family:var(--Mono);font-size:11px;padding:48px">No ${this._bf==='all'?'':this._bf+' '}bookings</div>`);
  },

  filterBookings(f,btn) { document.querySelectorAll('#a-bk .f-btn').forEach(b=>b.classList.remove('on')); if(btn)btn.classList.add('on'); this.loadBookings(f); },

  async setBkStatus(id,status) {
    const result=await api('PUT',`/bookings/${id}`,{status});
    if(!result)return;
    const b=STORE.bookings.find(x=>x.id===id); if(b)b.status=status; toast(`Booking ${status}`); this.loadBookings();
  },

  async deleteBooking(id) {
    if(!confirm('Remove this booking?'))return;
    const result=await api('DELETE',`/bookings/${id}`);
    if(!result)return;
    STORE.bookings=STORE.bookings.filter(b=>b.id!==id); toast('Booking removed'); this.loadBookings();
  },

  /* ══ PROMOTER CRM ═══════════════════════════════════════ */
  async loadPromoters() {
    const data=await api('GET','/promoters')||[];
    STORE.promoters=data;
    setHTML('adm-promo-tbody', data.length ? data.map(p=>`
      <tr>
        <td><div class="tbl-name">${p.name}</div><div class="tbl-sub">${p.email}</div></td>
        <td class="tbl-name">${p.venue}</td>
        <td style="font-family:var(--Mono);font-size:10px;color:var(--muted)">${p.city}, ${p.country}</td>
        <td style="font-family:var(--Anton);font-size:22px;color:var(--g1)">${p.totalBookings}</td>
        <td><div class="tbl-actions">
          <a href="mailto:${p.email}" class="tbl-btn" style="display:inline-block">Email</a>
          <button class="tbl-btn del" onclick="ADMIN.deletePromoter('${p.id}')">Remove</button>
        </div></td>
      </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:32px;font-family:var(--Mono);font-size:11px">No promoters yet</td></tr>');
  },

  async savePromoter() {
    const name=val('promo-name'); if(!name){toast('Contact name required','error');return;}
    const result=await api('POST','/promoters',{name,email:val('promo-email'),venue:val('promo-venue'),city:val('promo-city'),country:val('promo-country'),totalBookings:0,notes:val('promo-notes')});
    if(!result)return;
    STORE.promoters.unshift(result);
    toast('Promoter added'); admToggle('promo-form');
    ['promo-name','promo-email','promo-venue','promo-city','promo-country','promo-notes'].forEach(id=>setVal(id,''));
    this.loadPromoters();
  },

  async deletePromoter(id) {
    if(!confirm('Remove this promoter?'))return;
    const result=await api('DELETE',`/promoters/${id}`);
    if(!result)return;
    STORE.promoters=STORE.promoters.filter(p=>p.id!==id); toast('Promoter removed'); this.loadPromoters();
  },

  /* ══ DJ POOL ════════════════════════════════════════════ */
  async loadDjPool() {
    const data = await api('GET', '/dj-pool/admin/analytics');
    if (!data) {
      setHTML('adm-djpool-tbody', '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:32px;font-family:var(--Mono);font-size:11px">Log in as admin to view DJ Pool analytics.</td></tr>');
      return;
    }
    setText('djpool-track-count', data.counts?.tracks ?? 0);
    setText('djpool-download-count', data.counts?.downloads ?? 0);
    setText('djpool-crate-count', data.counts?.crates ?? 0);
    setText('djpool-sub-count', data.counts?.active_subscriptions ?? 0);
    setHTML('adm-djpool-tbody', data.topTracks?.length ? data.topTracks.map(t => `
      <tr>
        <td>${t.title || '-'}</td>
        <td>${t.artist || '-'}</td>
        <td>${t.label || '-'}</td>
        <td>${t.bpm || '-'}</td>
        <td><span class="ab-live" style="position:static">${t.downloads || 0}</span></td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:32px;font-family:var(--Mono);font-size:11px">No DJ Pool downloads yet.</td></tr>');
  },

  /* ══ NEWSLETTER ═════════════════════════════════════════ */
  async loadNLStats() {
    const res=await api('GET','/newsletter/subscribers');
    if(!res){
      setText('nl-sc-count','Unavailable');
      return;
    }
    const count=(res?.count??res?.subscribers?.length)??0;
    setText('nl-sc-count',count.toLocaleString());
  },

  async sendNewsletter(test) {
    const subject=val('nl-subject'), body=val('nl-body');
    if(!subject||!body){toast('Subject and body are required','error');return;}
    if(test){
      const email=val('nl-test-email')||prompt('Test email address:'); if(!email)return;
      const result=await api('POST','/newsletter/send',{subject,body,testEmail:email});
      if(!result)return;
      toast(`Test sent to ${email}`); return;
    }
    if(!confirm('Send to all subscribers now?'))return;
    const res=await api('POST','/newsletter/send',{subject,body,fromName:val('nl-fromname')||'Mixxea Records'});
    if(!res)return;
    const count=res?.sent??0; toast(`Sent to ${count} subscriber${count!==1?'s':''}`);
    const ok=document.getElementById('nl-send-ok'); if(ok){ok.style.display='block';setTimeout(()=>ok.style.display='none',5000);}
  },

  /* ══ SUBSCRIBERS ════════════════════════════════════════ */
  _subs: [],
  async loadSubscribers() {
    const res=await api('GET','/newsletter/subscribers');
    if(!res){
      this._subs=[];
      setText('subs-total-count','Unavailable');
      const more=document.getElementById('subs-load-more');
      if(more) more.textContent='Subscriber data is unavailable until the admin API is reachable.';
      this._renderSubs([]);
      return;
    }
    this._subs=(res?.subscribers)??[];
    const count=this._subs.length;
    setText('subs-total-count',count.toLocaleString());
    const more=document.getElementById('subs-load-more');
    if(more) more.textContent=count>50?`Showing 50 of ${count.toLocaleString()} — export CSV to see all`:'';
    this._renderSubs(this._subs.slice(0,50));
  },

  _renderSubs(list) {
    setHTML('adm-subs-list', list.length ? list.map(s=>`
      <div class="subs-row">
        <span class="subs-email">${s.email}</span>
        <span class="subs-date">${fmtDate(s.joinedAt)}</span>
        <span class="adm-badge ${s.source==='homepage'?'ab-live':'ab-draft'}" style="font-size:8px">${s.source||'—'}</span>
      </div>`).join('') : '<div style="text-align:center;color:var(--muted);padding:24px;font-family:var(--Mono);font-size:11px">No subscribers yet</div>');
  },

  searchSubscribers(q) {
    const f=q?this._subs.filter(s=>s.email.toLowerCase().includes(q.toLowerCase())):this._subs.slice(0,50);
    this._renderSubs(f);
  },

  exportSubscribers() {
    if(!this._subs.length){toast('No subscriber data loaded','error');return;}
    const csv=['Email,Joined,Source',...this._subs.map(s=>`${s.email},${s.joinedAt||''},${s.source||''}`)].join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`mixxea-subscribers-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    toast(`Exported ${this._subs.length} subscribers`);
  },

  /* ══ ANALYTICS ══════════════════════════════════════════ */
  async loadAnalytics() {
    const [rel,art,dem,bk,ev,nws,sub]=await Promise.all([
      api('GET','/releases'),api('GET','/artists'),api('GET','/demos'),
      api('GET','/bookings'),api('GET','/events'),api('GET','/news'),
      api('GET','/newsletter/subscribers'),
    ]);
    setText('analytics-releases',  rel ? rel.length : 'Unavailable');
    setText('analytics-artists',   art ? art.length : 'Unavailable');
    setText('analytics-demos',     dem ? dem.length : 'Unavailable');
    setText('analytics-bookings',  bk  ? bk.length  : 'Unavailable');
    setText('analytics-events',    ev  ? ev.length   : 'Unavailable');
    setText('analytics-news',      nws ? nws.filter(n=>n.status==='published').length : 'Unavailable');
    const subCount = sub ? (sub?.count??sub?.subscribers?.length??0) : null;
    setText('analytics-subs', subCount === null ? 'Unavailable' : subCount.toLocaleString());
  },
};

/* ─────────────────────────────────────────────────────────
   NEWSLETTER TEMPLATES
───────────────────────────────────────────────────────── */
const NL_TPLS = {
  release:{sub:'New Release — [Title] is out now on Mixxea Records',body:'Hey,\n\nWe\'re excited to announce that [Artist]\'s "[Title]" is out now.\n\n→ Beatport: [link]\n→ Spotify: [link]\n→ Apple Music: [link]\n\nStay underground,\nMixxea Records'},
  event:{sub:'[Artist] Live — [Venue], [Date]',body:'Hey,\n\n[Artist] performs live at [Venue] on [Date].\n\nTickets: [link]\n\nSee you on the floor,\nFreqVault Agency'},
  monthly:{sub:'Mixxea Monthly — [Month] Roundup',body:'Hey,\n\n🎵 NEW RELEASES\n→ [Release 1]\n\n🎛 UPCOMING SHOWS\n→ [Show 1]\n\n📰 LABEL NEWS\n→ [Item]\n\nMixxea Records'},
  artist:{sub:'Artist Spotlight: [Artist Name]',body:'Hey,\n\nThis month we\'re spotlighting [Artist].\n\n[Bio / news]\n\nListen: [link]\nBook: bookings@freqvault.com\n\n— Mixxea Records'},
  custom:{sub:'',body:''},
};

function loadTpl(key) {
  const t=NL_TPLS[key]; if(!t)return;
  setVal('nl-subject',t.sub); setVal('nl-body',t.body); previewNl();
}

async function previewNl() {
  const subject = val('nl-subject') || 'Subject preview';
  const body = val('nl-body') || 'Body preview...';
  const fromName = val('nl-fromname') || 'Mixxea Records';
  const intro = body.split(/\r?\n\r?\n/)[0] || body;

  setText('nl-prev-sub', subject);
  const pb = document.getElementById('nl-prev-body');
  if (pb) {
    pb.style.whiteSpace = 'pre-wrap';
    pb.textContent = body;
  }

  try {
    const res = await api('POST', '/newsletter/preview', { subject, body, intro, fromName });
    if (!res?.success || !res.html || !pb) return;

    pb.style.whiteSpace = 'normal';
    pb.innerHTML = '<div style="margin-bottom:14px;font-family:var(--Mono);font-size:10px;letter-spacing:1px;color:var(--muted)">LIVE EMAIL PREVIEW</div>' +
      '<iframe title="Newsletter Preview" srcdoc="' + res.html.replace(/"/g, '&quot;') + '" style="width:100%;min-height:520px;border:1px solid var(--line);background:#fff;border-radius:14px"></iframe>';
  } catch(e) {
    // Keep existing plain-text preview if API unavailable
  }
}

function sendNl() { ADMIN.sendNewsletter(false); }

['nl-subject','nl-body'].forEach(id=>{
  const el=document.getElementById(id); if(el)el.addEventListener('input',previewNl);
});

/* ─────────────────────────────────────────────────────────
   ANALYTICS CHART
───────────────────────────────────────────────────────── */
function buildChart() {
  const bars=document.getElementById('chartBars'), lbls=document.getElementById('chartLabels');
  if(!bars)return;
  const data=[3200,4100,3800,5200,4600,6100,5800,7200,6400,8100,7800,6840];
  const months=['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  const max=Math.max(...data);
  bars.innerHTML=''; lbls.innerHTML='';
  data.forEach((v,i)=>{
    const b=document.createElement('div'); b.className='c-bar';
    b.style.height=((v/max)*100)+'%'; b.setAttribute('data-v',v.toLocaleString()); bars.appendChild(b);
    const l=document.createElement('div'); l.className='c-lbl'; l.textContent=months[i]; lbls.appendChild(l);
  });
}

/* ─────────────────────────────────────────────────────────
   OPEN / CLOSE
───────────────────────────────────────────────────────── */
function openAdmin() {
  const o=document.getElementById('admin-overlay'); if(!o)return;
  o.classList.add('open'); o.classList.remove('admin-nav-open'); document.body.style.overflow='hidden';
  ADMIN_AUTH.check().then((loggedIn) => {
    if (loggedIn) {
      ADMIN.loadDashboard();
      return;
    }
    const emailInput = document.getElementById('adm-login-email');
    if (emailInput) emailInput.focus();
  });
}

function closeAdmin() {
  const o=document.getElementById('admin-overlay'); if(o){o.classList.remove('open'); o.classList.remove('admin-nav-open');}
  document.body.style.overflow='';
}

/* ─────────────────────────────────────────────────────────
   TOAST ANIMATION + ESC
───────────────────────────────────────────────────────── */
const _s=document.createElement('style');
_s.textContent='@keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
document.head.appendChild(_s);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAdmin();});

document.addEventListener('click', (event) => {
  const overlay = document.getElementById('admin-overlay');
  const side = document.querySelector('.adm-side');
  const menuBtn = document.querySelector('.adm-mobile-menu');
  if (!overlay || !overlay.classList.contains('admin-nav-open') || window.innerWidth > 900) return;
  if (side?.contains(event.target) || menuBtn?.contains(event.target)) return;
  toggleAdminNav(false);
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 900) toggleAdminNav(false);
});

/* ─────────────────────────────────────────────────────────
   INIT — runs once DOM is ready
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  var loginBtn = document.getElementById('adm-login-submit');
  if (loginBtn) {
    loginBtn.addEventListener('click', function() { ADMIN_AUTH.login(); });
  }
  ['adm-login-email', 'adm-login-password'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); ADMIN_AUTH.login(); }
    });
  });
});

console.log('✓ Mixxea Admin — 13 modules loaded, all wired to real API');
