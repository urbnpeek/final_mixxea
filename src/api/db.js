/**
 * db.js — Async data store
 * Primary:  Vercel KV (Redis) — auto-configured when KV store is connected in Vercel dashboard
 * Fallback: local JSON files  — used in local dev when KV is not configured
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {}

const DEFAULTS = {
  releases: [
    { id:'mxa001', title:'Dark Matter EP', artist:'KRATOS', genre:'Techno', bpm:128, catNo:'MXA001', date:'2025-03-14', status:'out', artwork:'', spotify:'', beatport:'', apple:'', soundcloud:'', description:'Landmark techno EP from Berlin-based KRATOS.' },
    { id:'mxa002', title:'Ocean Floor LP', artist:'SOLV',   genre:'Deep House', bpm:122, catNo:'MXA002', date:'2025-01-28', status:'out', artwork:'', spotify:'', beatport:'', apple:'', soundcloud:'', description:'Debut long-player from London-based SOLV.' },
    { id:'mxa003', title:'Signal Loss',    artist:'AXON',   genre:'Ambient', bpm:0, catNo:'MXA003', date:'2025-05-02', status:'pre', artwork:'', spotify:'', beatport:'', apple:'', soundcloud:'', description:'Experimental ambient work from Tokyo.' },
    { id:'mxa004', title:'Grind System EP',artist:'VEXR',   genre:'Bass', bpm:140, catNo:'MXA004', date:'2025-06-01', status:'soon', artwork:'', spotify:'', beatport:'', apple:'', soundcloud:'', description:'Industrial bass from NYC.' },
    { id:'mxa005', title:'Void Protocol',  artist:'LYDA',   genre:'Techno', bpm:135, catNo:'MXA005', date:'2025-02-12', status:'out', artwork:'', spotify:'', beatport:'', apple:'', soundcloud:'', description:'Hard-hitting techno from Bucharest.' },
  ],
  artists: [
    { id:'a1', name:'KRATOS', realName:'', country:'DE', city:'Berlin',    genre:'Techno',     bio:'Berlin-based techno and minimal artist.', instagram:'', soundcloud:'', type:'both',  status:'signed', photo:'' },
    { id:'a2', name:'SOLV',   realName:'', country:'UK', city:'London',    genre:'Deep House', bio:'UK producer crafting deep, melodic house.', instagram:'', soundcloud:'', type:'both',  status:'signed', photo:'' },
    { id:'a3', name:'AXON',   realName:'', country:'JP', city:'Tokyo',     genre:'Ambient',    bio:'Tokyo-based ambient and experimental artist.', instagram:'', soundcloud:'', type:'label', status:'signed', photo:'' },
    { id:'a4', name:'VEXR',   realName:'', country:'US', city:'New York',  genre:'Bass',       bio:'NYC producer at the intersection of industrial and bass.', instagram:'', soundcloud:'', type:'both',  status:'signed', photo:'' },
    { id:'a5', name:'LYDA',   realName:'', country:'RO', city:'Bucharest', genre:'Techno',     bio:'Romanian techno force.', instagram:'', soundcloud:'', type:'both',  status:'signed', photo:'' },
  ],
  demos: [
    { id:'d1', artistName:'HEXX',      email:'hexxtechno@gmail.com',  trackTitle:'Acid Vortex',   genre:'Techno',     bpm:132, notes:'Raw acid techno.', soundcloudLink:'', file:'', submittedAt:'2025-04-04T14:32:00Z', status:'new' },
    { id:'d2', artistName:'DARKFIELD', email:'darkfield@proton.me',   trackTitle:'Black Horizon', genre:'Minimal',    bpm:128, notes:'Minimal techno.',  soundcloudLink:'', file:'', submittedAt:'2025-04-03T09:10:00Z', status:'new' },
    { id:'d3', artistName:'SOLVEX',    email:'solvex@icloud.com',     trackTitle:'Deep Waters',   genre:'Deep House', bpm:122, notes:'Deep and rolling.', soundcloudLink:'', file:'', submittedAt:'2025-04-02T17:45:00Z', status:'reviewing' },
  ],
  bookings: [
    { id:'b1', venue:'Berghain',       city:'Berlin', country:'DE', contact:'Thomas Muller', email:'thomas@berghain.de',     artist:'KRATOS', date:'2025-07-20', type:'Headline', fee:4000, notes:'Saturday main floor.', status:'pending' },
    { id:'b2', venue:'Sonus Festival', city:'Tisno',  country:'HR', contact:'Ana Kovac',     email:'booking@sonus.hr',       artist:'LYDA',   date:'2025-08-08', type:'Festival',  fee:3500, notes:'Meridian stage.',       status:'discussing' },
    { id:'b3', venue:'Panorama Bar',   city:'Berlin', country:'DE', contact:'Max R.',         email:'booking@panoramabar.de', artist:'AXON',   date:'2025-09-13', type:'Live Set',  fee:0,    notes:'Ambient live format.',  status:'pending' },
  ],
  events: [
    { id:'e1', date:'2025-05-12', venue:'Tresor Berlin',       city:'Berlin',    country:'DE', artist:'KRATOS',       type:'Headline',   ticketLink:'', fee:2500, status:'confirmed' },
    { id:'e2', date:'2025-05-24', venue:'Awakenings Festival', city:'Amsterdam', country:'NL', artist:'KRATOS, LYDA', type:'Festival',   ticketLink:'', fee:5000, status:'confirmed' },
    { id:'e3', date:'2025-06-15', venue:'Fabric London',       city:'London',    country:'UK', artist:'SOLV',         type:'Club Night', ticketLink:'', fee:0,    status:'hold' },
  ],
  newsletter:    { subscribers: [], campaigns: [] },
  contactMessages: [],
  news: [
    { id:'n1', title:"KRATOS Drops Landmark 'Dark Matter' EP",    category:'Release News', author:'Mixxea Team', date:'2025-03-14', status:'published', body:'', image:'' },
    { id:'n2', title:'SOLV Announces European Tour via FreqVault', category:'Artist News',  author:'Mixxea Team', date:'2025-03-08', status:'published', body:'', image:'' },
  ],
  royalties: [
    { id:'r1', artist:'KRATOS', release:'Dark Matter EP', source:'Streaming + Sales', amount:1840, period:'Q1 2025', paidAt:null },
    { id:'r2', artist:'SOLV',   release:'Ocean Floor LP', source:'Streaming + Beatport', amount:2100, period:'Q1 2025', paidAt:null },
  ],
  promoters: [
    { id:'p1', name:'Thomas Muller', email:'thomas@berghain.de',   venue:'Berghain',       city:'Berlin', country:'DE', totalBookings:6, notes:'' },
    { id:'p2', name:'Ana Kovac',     email:'booking@sonus.hr',     venue:'Sonus Festival', city:'Tisno',  country:'HR', totalBookings:3, notes:'' },
  ],
  contracts: [
    { id:'c1', artist:'KRATOS', type:'Label + Management', signedAt:'2025-01-01', expiresAt:'2027-12-31', status:'active', file:'' },
    { id:'c2', artist:'SOLV',   type:'Label',              signedAt:'2024-11-15', expiresAt:'2026-11-14', status:'active', file:'' },
  ],
  artistPortalUsers: [
    { id:'u1', artistName:'KRATOS', email:'kratos@mixxea.com', passwordHash:'$2a$10$VJ2.OcGx4W2UbmuXt4r2neP6l6dxY/iHsoj1hejgmDGkA2lXLiD76', status:'signed', createdAt:'2025-01-01' }
  ]
};

// ── Vercel KV ─────────────────────────────────────────────────────────────────

function isKvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvGet(collection) {
  const { kv } = require('@vercel/kv');
  const data = await kv.get('db:' + collection);
  return data ?? null;
}

async function kvSet(collection, data) {
  const { kv } = require('@vercel/kv');
  await kv.set('db:' + collection, data);
}

// ── Local file helpers ────────────────────────────────────────────────────────

function localGet(collection) {
  const file = path.join(DATA_DIR, `${collection}.json`);
  if (!fs.existsSync(file)) {
    const def = DEFAULTS[collection];
    if (def) { localSet(collection, def); return def; }
    return Array.isArray(DEFAULTS[collection]) ? [] : {};
  }
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return DEFAULTS[collection] || []; }
}

function localSet(collection, data) {
  try {
    const file = path.join(DATA_DIR, `${collection}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {}
}

// ── Public API ────────────────────────────────────────────────────────────────

async function get(collection) {
  if (isKvConfigured()) {
    try {
      const data = await kvGet(collection);
      if (data !== null) return data;
      const seed = DEFAULTS[collection] ?? [];
      await kvSet(collection, seed);
      return seed;
    } catch (e) {
      console.error('[DB] KV get failed:', e.message);
      return localGet(collection);
    }
  }
  return localGet(collection);
}

async function set(collection, data) {
  if (isKvConfigured()) {
    try {
      await kvSet(collection, data);
      return;
    } catch (e) {
      console.error('[DB] KV set failed:', e.message);
    }
  }
  localSet(collection, data);
}

module.exports = { get, set };
