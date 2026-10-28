'use strict';
// MX-03 /booking-agency/romania — final copy SEO-2026-10-26-04 (27 Oct 2026).
// Roster: David Hopperman and Eddie Bitar only. Eddie Bitar genre stays "TBC".
// No fees, exclusivity, availability claims or past gigs. Entity in footer only.
const { pageShell, siteNav, siteFooter, esc } = require('./publicPages');

const BASE = 'https://www.mixxea.com';
const PATH = '/booking-agency/romania';
const URL = BASE + PATH;
const EMAIL = 'booking@mixxea.com';
const MAIL = `<a href="mailto:${EMAIL}">${EMAIL}</a>`;
const CTA_HREF = `mailto:${EMAIL}?subject=Booking%20request%20%E2%80%93%20Romania`;

const TITLE = 'Booking Agency Romania: Electronic DJs | FreqVault Agency';
const DESCRIPTION = 'Booking electronic artists for a club or festival in Romania? Send your offer to FreqVault Agency, the booking arm of Mixxea Records: booking@mixxea.com.';
const H1 = 'Electronic music booking agency for Romania';

// Entity line from freqvault/org/shared/LEGAL_FOOTER.md (valid until ONRC registers the rename).
const ENTITY_LINE = 'FreqVault Group is operated by Ronala Imobiliare SRL · CUI 52133484 · J2025050803009 · Intr. Gheorghe Simionescu 19, Ap. B26, 014155 București, Romania';

const FAQ = [
  ['How do I book an artist for an event in Romania?',
    `Email ${MAIL} with the artist, event, city and venue, dates, capacity, set length, budget range, and production and travel details. A short note is enough to open the request. The booking desk replies to your email and confirms availability and terms from there.`],
  ['Which artists can I book for Romania?',
    `David Hopperman and Eddie Bitar are available for bookings in Romania through FreqVault / Mixxea. Open their profiles on mixxea.com for the details on file, then send your request to ${MAIL} with the artist named.`],
  ['How much does it cost to book a DJ?',
    `Fees depend on the artist, the date and the event, and we don't publish fees. Send your offer or budget range to ${MAIL} with the event details, and the booking desk will reply.`],
  ['Is FreqVault Agency separate from Mixxea Records?',
    `FreqVault is the booking agency. Mixxea is the record label. Both are on mixxea.com. Booking requests go to FreqVault at ${MAIL}.`],
  ['Do you handle festivals and clubs?',
    `Yes. FreqVault Agency takes booking requests for clubs, festivals and private events. Send the event type, venue, dates and capacity to ${MAIL}.`],
];

const stripTags = (s) => s.replace(/<[^>]+>/g, '');

function jsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': URL + '#page', url: URL, name: H1, description: DESCRIPTION, inLanguage: 'en' },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Booking agency', item: BASE + '/booking-agency' },
        { '@type': 'ListItem', position: 3, name: 'Romania', item: URL },
      ] },
      { '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({
        '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: stripTags(a) },
      })) },
    ],
  };
}

const REQUEST_ITEMS = [
  ['Event', 'the name and type (club night, festival, private or brand event)'],
  ['City and venue', 'for example Bucharest, Cluj-Napoca, Timișoara or a festival site'],
  ['Dates', 'your preferred date and any alternatives'],
  ['Capacity', 'the expected attendance and the room or stage size'],
  ['Set length', 'the slot time and how long the set runs'],
  ['Budget range', 'your offer or the range you are working with'],
  ['Production and travel', 'the sound and DJ setup, plus who arranges flights, ground transport and accommodation'],
];

function body() {
  return `${siteNav('/booking-agency')}
<main id="content">
<section class="hero landing-hero">
  <div class="wrap">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/booking-agency">Booking agency</a><span>/</span><span>Romania</span></nav>
    <div class="hero-grid">
      <div class="hero-copy">
        <div class="kicker">FreqVault Agency · Mixxea Records</div>
        <h1>${esc(H1)}</h1>
        <p class="lead">FreqVault Agency is the booking arm of Mixxea Records. Mixxea is the label; FreqVault is the agency. If you run a club, promote parties or programme a festival in Romania, this page shows which artists from the Mixxea roster are available for bookings in Romania and how to send a request. Every inquiry goes to one address: ${MAIL}. For the full agency page, see our <a href="/booking-agency">electronic music booking agency</a>.</p>
        <div class="hero-ctas"><a class="btn acid" href="${CTA_HREF}">Send your booking request</a></div>
      </div>
      <aside class="hero-card">
        <strong>Bookings</strong>
        <p>Email <a class="mail-link" href="${CTA_HREF}">${EMAIL}</a> with the artist, date, city and venue.</p>
      </aside>
    </div>
  </div>
</section>

<section class="section" id="artists">
  <div class="wrap">
    <h2>Artists available for bookings in Romania</h2>
    <p class="section-intro">The artists below are available for bookings in Romania through FreqVault / Mixxea. Open a profile to see the details on file, then send your request with the artist named.</p>
    <div class="grid-2">
      <article class="panel"><h3><a href="/artists/david-hopperman">David Hopperman</a></h3><p class="meta">Afro / Melodic House</p><p>A DJ and producer whose sound blends the legacy of French Touch with refined house sensibilities and contemporary energy. Based in Marseille. Available for bookings in Romania through FreqVault / Mixxea.</p></article>
      <article class="panel"><h3><a href="/artists/eddie-bitar">Eddie Bitar</a></h3><p class="meta">Electronic music artist (genre TBC)</p><p>An electronic music artist on the Mixxea roster. Available for bookings in Romania through FreqVault / Mixxea.</p></article>
    </div>
    <p>See the whole roster in the <a href="/electronic-music-artists">electronic music artists directory</a>.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2>How to send a booking request</h2>
    <p>A short email is enough to open a request. To help us reply with the right information, include as much of the following as you have:</p>
    <ul>
${REQUEST_ITEMS.map(([k, v]) => `      <li><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join('\n')}
    </ul>
    <p>Send it to ${MAIL} with the artist's name in the subject line. If you're not sure which artist fits, describe the event and ask.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2>What happens next</h2>
    <p>The booking desk reads your request and replies to the email you sent it from. Availability, terms and any next steps are confirmed in that reply, artist by artist and date by date. Nothing is confirmed until you have it in writing from the booking desk. If your show needs routing or on-the-ground logistics, say so in the same email; tour production can be discussed once a show is moving.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2>Based in Bucharest</h2>
    <p>FreqVault Agency works from Bucharest, so Romanian clubs and festivals deal with a team in the same country and time zone. We take requests for events anywhere in Romania, and for the rest of Europe through the main <a href="/booking-agency">electronic music booking agency</a> page.</p>
  </div>
</section>

<section class="section" id="faq">
  <div class="wrap">
    <h2>FAQ</h2>
    <div class="faq">
${FAQ.map(([q, a]) => `      <article class="faq-item"><h3>${esc(q)}</h3><p>${a}</p></article>`).join('\n')}
    </div>
    <p class="hero-ctas"><a class="btn acid" href="${CTA_HREF}">Send your booking request</a></p>
  </div>
</section>
</main>
${siteFooter().replace('<div class="wrap ft-base">', `<div class="wrap ft-base"><span class="small">${esc(ENTITY_LINE)}</span>`)}`;
}

function renderBookingRomania() {
  return pageShell({ title: TITLE, description: DESCRIPTION, canonicalPath: PATH, jsonLd: jsonLd(), body: body() });
}

module.exports = { renderBookingRomania, BOOKING_ROMANIA: { TITLE, DESCRIPTION, H1, PATH, FAQ } };
