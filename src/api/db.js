/**
 * db.js -- Lightweight JSON file-based data store
 * Drop-in replacement until you add PostgreSQL/MongoDB
 * Usage: const db = require('./db'); db.get('releases'); db.set('releases', data);
 *
 * Note: writes are silently skipped on read-only filesystems (e.g. Vercel).
 * Data will still be served from DEFAULTS or pre-committed JSON files.
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) { /* read-only filesystem -- skip */ }

const DEFAULTS = {
  releases: [
    { id:'mxa001', title:'Dark Matter EP', artist:'KRATOS', genre:'Techno', bpm:128, catNo:'MXA001', date:'2025-03-14', status:'out', artwork:'', spotify:'', beatport:'', apple:'', soundcloud:'', description:'Landmark techno EP from Berlin-based KRATOS.' },
    { id:'mxa002', title:'Ocean Floor LP', artist:'SOLV',   genre:'Deep House', bpm:122, catNo:'MXA002', date:'2025-01-28', status:'out', artwork:'', spotify:'', beatport:'', apple:'', soundcloud:'', description:'Debut long-player from London-based SOLV.' },
    { id:'mxa003', title:'Signal Loss',    artist:'AXON',   genre:'Ambient', bpm:0, catNo:'MXA003', date:'2025-05-02', status:'pre', artwork:'', spotify:'', beatport:'', apple:'', soundcloud:'', description:'Experimental ambient work from Tokyo.' },
    { id:'mxa004', title:'Grind System EP',artist:'VEXR',   genre:'Bass', bpm:140, catNo:'MXA004', date:'2025-06-01', status:'soon', artwork:'', spotify:'', beatport:'', apple:'', soundcloud:'', description:'Industrial bass from NYC.' },
    { id:'mxa005', title:'Void Protocol',  artist:'LYDA',   genre:'Techno', bpm:135, catNo:'MXA005', date:'2025-02-12', status:'out', artwork:'', spotify:'', beatport:'', apple:'', soundcloud:'', description:'Hard-hitting techno from Bucharest.' },
  ],
  artists: [
    { id:'a1', name:'KRATOS', realName:'', country:'DE', city:'Berlin',    genre:'Techno',      bio:'Berlin-based techno and minimal artist with a signature raw, hypnotic style.', instagram:'', soundcloud:'', type:'both',  status:'signed', photo:'' },
    { id:'a2', name:'SOLV',   realName:'', country:'UK', city:'London',    genre:'Deep House',  bio:'UK producer crafting deep, melodic house with emotional depth.',                instagram:'', soundcloud:'', type:'both',  status:'signed', photo:'' },
    { id:'a3', name:'AXON',   realName:'', country:'JP', city:'Tokyo',     genre:'Ambient',     bio:'Tokyo-based ambient and experimental artist exploring texture and space.',       instagram:'', soundcloud:'', type:'label', status:'signed', photo:'' },
    { id:'a4', name:'VEXR',   realName:'', country:'US', city:'New York',  genre:'Bass',        bio:'NYC producer at the intersection of industrial and bass music.',                 instagram:'', soundcloud:'', type:'both',  status:'signed', photo:'' },
    { id:'a5', name:'LYDA',   realName:'', country:'RO', city:'Bucharest', genre:'Techno',      bio:'Romanian techno force bringing Eastern European intensity to global floors.',    instagram:'', soundcloud:'', type:'both',  status:'signed', photo:'' },
  ],
  demos: [
    { id:'d1', artistName:'HEXX',      email:'hexxtechno@gmail.com',        trackTitle:'Acid Vortex',   genre:'Techno',     bpm:132, notes:'Raw acid techno with 303 work.',  soundcloudLink:'', file:'', submittedAt:'2025-04-04T14:32:00Z', status:'new' },
    { id:'d2', artistName:'DARKFIELD', email:'darkfield@proton.me',         trackTitle:'Black Horizon', genre:'Minimal',    bpm:128, notes:'Minimal techno, long journey.',   soundcloudLink:'', file:'', submittedAt:'2025-04-03T09:10:00Z', status:'new' },
    { id:'d3', artistName:'SOLVEX',    email:'solvex@icloud.com',           trackTitle:'Deep Waters',   genre:'Deep House', bpm:122, notes:'Deep and rolling.',               soundcloudLink:'', file:'', submittedAt:'2025-04-02T17:45:00Z', status:'reviewing' },
  ],
  bookings: [
    { id:'b1', venue:'Berghain',       city:'Berlin', country:'DE', contact:'Thomas Muller', email:'thomas@berghain.de',    artist:'KRATOS', date:'2025-07-20', type:'Headline',  fee:4000, notes:'Saturday main floor. Full rider required.', status:'pending' },
    { id:'b2', venue:'Sonus Festival', city:'Tisno',  country:'HR', contact:'Ana Kovac',     email:'booking@sonus.hr',      artist:'LYDA',   date:'2025-08-08', type:'Festival',  fee:3500, notes:'Meridian stage. 2h set.',                   status:'discussing' },
    { id:'b3', venue:'Panorama Bar',   city:'Berlin', country:'DE', contact:'Max R.',         email:'booking@panoramabar.de',artist:'AXON',   date:'2025-09-13', type:'Live Set',  fee:0,    notes:'Ambient live format. Budget TBC.',          status:'pending' },
  ],
  events: [
    { id:'e1', date:'2025-05-12', venue:'Tresor Berlin',        city:'Berlin',    country:'DE', artist:'KRATOS',       type:'Headline',   ticketLink:'', fee:2500, status:'confirmed' },
    { id:'e2', date:'2025-05-24', venue:'Awakenings Festival',  city:'Amsterdam', country:'NL', artist:'KRATOS, LYDA', type:'Festival',   ticketLink:'', fee:5000, status:'confirmed' },
    { id:'e3', date:'2025-06-15', venue:'Fabric London',        city:'London',    country:'UK', artist:'SOLV',         type:'Club Night', ticketLink:'', fee:0,    status:'hold' },
    { id:'e4', date:'2025-06-28', venue:'De School',            city:'Amsterdam', country:'NL', artist:'AXON',         type:'Live Set',   ticketLink:'', fee:1200, status:'confirmed' },
  ],
  newsletter: {
    subscribers: [
      { email:'techno.fan@gmail.com',          joinedAt:'2025-04-04', source:'homepage' },
      { email:'underground.music@proton.me',   joinedAt:'2025-04-03', source:'ar-form' },
      { email:'dj.studio@icloud.com',          joinedAt:'2025-04-02', source:'footer' },
    ],
    campaigns: []
  },
  contactMessages: [],
  news: [
    { id:'n1', title:"KRATOS Drops Landmark 'Dark Matter' EP",    category:'Release News', author:'Mixxea Team', date:'2025-03-14', status:'published', body:'...', image:'' },
    { id:'n2', title:'SOLV Announces European Tour via FreqVault', category:'Artist News',  author:'Mixxea Team', date:'2025-03-08', status:'published', body:'...', image:'' },
  ],
  royalties: [
    { id:'r1', artist:'KRATOS', release:'Dark Matter EP',  source:'Streaming + Sales',      amount:1840, period:'Q1 2025', paidAt:null },
    { id:'r2', artist:'KRATOS', release:'Void Protocol',   source:'Streaming',               amount:960,  period:'Q1 2025', paidAt:null },
    { id:'r3', artist:'SOLV',   release:'Ocean Floor LP',  source:'Streaming + Beatport',    amount:2100, period:'Q1 2025', paidAt:null },
    { id:'r4', artist:'LYDA',   release:'Void Protocol',   source:'Sync License',            amount:440,  period:'Q1 2025', paidAt:null },
  ],
  promoters: [
    { id:'p1', name:'Thomas Muller', email:'thomas@berghain.de',    venue:'Berghain',       city:'Berlin', country:'DE', totalBookings:6, notes:'' },
    { id:'p2', name:'Ana Kovac',     email:'booking@sonus.hr',      venue:'Sonus Festival', city:'Tisno',  country:'HR', totalBookings:3, notes:'' },
    { id:'p3', name:'Lea Dubois',    email:'lea@rex-club.com',       venue:'Rex Club',       city:'Paris',  country:'FR', totalBookings:4, notes:'' },
    { id:'p4', name:'Mark Evans',    email:'mark@fabriclondon.com',  venue:'Fabric London',  city:'London', country:'UK', totalBookings:7, notes:'' },
  ],
  contracts: [
    { id:'c1', artist:'KRATOS', type:'Label + Management', signedAt:'2025-01-01', expiresAt:'2027-12-31', status:'active', file:'' },
    { id:'c2', artist:'SOLV',   type:'Label',              signedAt:'2024-11-15', expiresAt:'2026-11-14', status:'active', file:'' },
    { id:'c3', artist:'LYDA',   type:'Label + Agency',     signedAt:'2025-03-01', expiresAt:'2028-02-28', status:'active', file:'' },
  ],
  artistPortalUsers: [
    { id:'u1', artistName:'KRATOS', email:'kratos@mixxea.com', passwordHash:'$2a$10$VJ2.OcGx4W2UbmuXt4r2neP6l6dxY/iHsoj1hejgmDGkA2lXLiD76', status:'signed', createdAt:'2025-01-01' }
  ]
};

// -- Read a collection --
function get(collection) {
  const file = path.join(DATA_DIR, `${collection}.json`);
  if (!fs.existsSync(file)) {
    const def = DEFAULTS[collection];
    if (def) { set(collection, def); return def; }
    return [];
  }
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return DEFAULTS[collection] || []; }
}

// -- Write a collection (silently skip if read-only filesystem) --
function set(collection, data) {
  try {
    const file = path.join(DATA_DIR, `${collection}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    /* read-only filesystem (e.g. Vercel) -- data not persisted this request */
  }
}

// -- Initialise all collections on first run --
try { Object.keys(DEFAULTS).forEach(k => get(k)); } catch (e) { /* skip on read-only / cold start */ }

module.exports = { get, set };
