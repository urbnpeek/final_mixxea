/**
 * Draft privacy and cookie notice. Facts come from the routes that store data.
 * Product questions still open are marked [CONFIRM-PRODUCT].
 */
const { siteNav, siteFooter, pageShell } = require('./publicPages');

const LAST_UPDATED = '2 October 2026';

function cell(label, text) {
  return `<td data-label="${label}">${text}</td>`;
}

function row(cells) {
  return `<tr>${cells.map(([label, text]) => cell(label, text)).join('')}</tr>`;
}

function renderPrivacyPage({ preview = false } = {}) {
  const draft = preview
    ? '<div class="draft-banner" role="status">Draft for approval</div>'
    : '';
  const body = `${siteNav('/privacy')}
<main id="content">
${draft}
<section class="band"><div class="wrap legal">
  <p class="meta">Last updated ${LAST_UPDATED}</p>
  <h1 class="d-m">Privacy and cookies</h1>
  <div class="a-body">
    <p>This notice describes how www.mixxea.com handles personal data. It covers the public site, the booking form, demo submissions, the newsletter, the artist portal, the DJ pool, and staff sign-in.</p>

    <h2>Who we are</h2>
    <p>The controller is Freq Grup SRL, CUI 52133484, Trade Reg. No. J2025050803009, EUID ROONRC.J2025050803009, Intr. Gheorghe Simionescu 19, Ap. B26, 014155 București (Sector 1), România.</p>
    <p>No data protection officer is appointed. Privacy requests go to <a href="mailto:hello@mixxea.com">hello@mixxea.com</a>. [CONFIRM-PRODUCT]</p>

    <h2>Contact messages</h2>
    <p>The booking page at <a href="/booking-agency">/booking-agency</a> posts to <code>/api/contact</code>. The fields sent are your name, email, inquiry type, and message. If you fill them in, the message also includes the artist, venue, city, and date. The link field is sent empty. Inquiry types on that form are Booking Request, A&amp;R / Demo Submission, Artist Management, Brand / Partnership, Press / Media, and General.</p>
    <p>The admin site at <a href="/admin">/admin</a> has a separate contact form that posts the same endpoint with name, email, message, inquiry type, an optional link, and a newsletter opt-in checkbox. The public homepage does not have its own contact form.</p>
    <p>Each message is stored with an id and the time it was sent. If the inquiry type contains the word “booking” (the booking page’s “Booking Request” does), a second record is stored as a booking. On that record the venue and contact are set to your name, the notes are the message, and artist, date, city, country, and fee are left empty. The artist, venue, city, and date you typed stay inside the message text.</p>
    <p>The site then emails an admin notification and a confirmation to the address you entered, through Resend.</p>
    <p>Purpose: to read and reply to the message, and to keep a booking record when the inquiry is a booking request.</p>
    <p>Lawful basis: legitimate interests in answering a general message and running the site. A booking enquiry is steps before a contract, or the contract once a booking is signed.</p>
    <p>Retention: contact messages are kept for 24 months. A booking enquiry that did not become a booking is kept for 24 months. A signed booking is kept for as long as Romanian accounting and tax law requires.</p>

    <h2>Demo submissions</h2>
    <p><a href="/submit.html">/submit.html</a> posts JSON to <code>/api/demos/submit</code>. The stored fields are artist name, legal name, email, country, performing-rights organisation (PRO), a profile or SoundCloud link, track title, version, genre, BPM, musical key, file format, a download link, a description, whether the track was released before and where, whether you are the sole writer or a co-writer, co-writer details, whether publishing would sit with Mixxea or your own publisher, your publisher’s name if you have one, and whether the track uses samples (none, cleared, or uncleared). The record also stores an id, the time it was sent, and a status that starts as “new”.</p>
    <p>That page sends a download link. It does not upload a file. The same endpoint accepts a multipart upload (the admin demo form does this) with a <code>track</code> file of up to 200&nbsp;MB. Demo audio is stored privately. It is not given a public link. Only authorised staff can open it, through an admin sign-in.</p>
    <p>An admin can also email a submission invite (<code>/api/demos/send-link</code>) using an email address and an artist name. That is started by staff, not by the public form.</p>
    <p>The site emails an admin notification and, when an email was provided, a confirmation to the submitter, through Resend.</p>
    <p>Purpose: A&amp;R review of a demo you chose to send.</p>
    <p>Lawful basis: steps before a contract, or the contract once it is signed.</p>
    <p>Retention: a demo record, its audio, and its links are kept for 24 months when they do not lead to a signing. A signed deal is kept for as long as Romanian accounting and tax law requires.</p>

    <h2>Newsletter</h2>
    <p>The footer form posts your email to <code>/api/newsletter/subscribe</code> with source “footer”. The admin site’s newsletter box uses source “homepage”. If you tick the newsletter box on the admin contact form, the same email is added with source “contact-form”. The address is stored in lower case with the time you joined, that source, and the consent wording version (currently 2026-10-02). That time and source are the record of your consent. A welcome email is sent. Signing up again does not create a second row.</p>
    <p>Staff can send a campaign to the stored addresses. Each newsletter email, including the welcome, contains an unsubscribe link. The link carries a signed token for that address, not the address itself. The message also includes a one-click unsubscribe header for mail clients. The campaign record keeps the subject, intro, from-name, time, how many recipients were attempted, whether it succeeded, and the provider. It does not keep a separate copy of every address.</p>
    <p>Opening the link shows a confirm button. The address is removed only when that button is used, or when a mail client sends the one-click request. A mail client that only previews the link does not unsubscribe you.</p>
    <p>Purpose: to send the newsletter you asked for.</p>
    <p>Lawful basis: consent. You can withdraw it with the unsubscribe link. Withdrawing consent does not affect a message already sent.</p>
    <p>Retention: the address stays on the list until you unsubscribe, and it is then deleted. A minimal suppression record (the address and the time) is kept so a bulk import does not add you again. Subscribing yourself later is a new consent and clears that record.</p>

    <h2>Booking enquiries</h2>
    <p>The booking page uses the contact endpoint described above. A second public endpoint, <code>POST /api/bookings/inquire</code>, stores the JSON body plus a status of “pending” and the time it was sent. The confirmation email reads artist, venue, contact, email, date, city, country, fee, and notes when those fields are present. No page in this site calls that endpoint. [CONFIRM-PRODUCT] whether it is still in use.</p>
    <p>Purpose: to handle a booking request.</p>
    <p>Lawful basis: steps before a contract, or the contract once a booking is signed.</p>
    <p>Retention: an enquiry that did not become a booking is kept for 24 months. A signed booking is kept for as long as Romanian accounting and tax law requires.</p>

    <h2>Artist portal</h2>
    <p><a href="/portal">/portal</a> is a login form. It sends email and password to <code>/api/auth/artist/login</code>. The password is checked against a bcrypt hash. It is not stored in plain text. A successful login puts the artist id and artist name on the session cookie <code>mixxea.sid</code>. There is no separate artist cookie.</p>
    <p><code>POST /api/auth/artist/register</code> still accepts artist name, legal name, email, country, genre, password (stored as a bcrypt hash), and a SoundCloud URL, and sets status to “unsigned”. The redesign login page does not show a registration form. Registration is wired in the admin application script. [CONFIRM-PRODUCT] whether public registration is still offered.</p>
    <p>A signed-in artist can load <code>/api/royalties/my</code>. Royalty rows are entered by an admin and can include the payee name, amounts, the statement period, and payment details if those were entered. A signed-in artist can also open a contract file stored in their name. Other people cannot.</p>
    <p>Purpose: to give an artist access to the portal, their royalty rows, and their own contract.</p>
    <p>Lawful basis: steps before a contract, or the contract once it is signed. Contracts and royalties are also kept where Romanian accounting and tax law requires it.</p>
    <p>Retention: the account is kept for 12 months after it is closed. Contracts and royalties are kept for as long as Romanian accounting and tax law requires.</p>

    <h2>DJ pool</h2>
    <p>There is no separate DJ-pool signup in this code. The first DJ-pool request creates a guest id (<code>g-</code> plus eight characters) on <code>mixxea.sid</code> if the browser has no artist id and no admin email. Hearts, crates, download logs, and subscriptions are stored under that id, or under the artist id or admin email when one of those is on the session. [CONFIRM-PRODUCT] whether the DJ pool is offered to the public.</p>
    <p>Hearts store the visitor id and a track id. Crates store the visitor id, a crate name, and track ids. A download stores the visitor id, the track id, and the time. A subscription requires an artist login and stores a tier name (Starter, Pro DJ, or Elite), status, start time, download limit, and downloads used. This code does not collect a card number. [CONFIRM-PRODUCT] whether a tier is paid for somewhere else.</p>
    <p>Purpose: to provide the DJ-pool service the account is using.</p>
    <p>Lawful basis: contract, for the service the person signed up for. [CONFIRM-PRODUCT]</p>
    <p>Retention: these rows are kept until the account is closed, then for 12 months. The session cookie itself expires after 24 hours.</p>

    <h2>Admin and staff sign-in</h2>
    <p><code>POST /api/auth/admin/login</code> takes an email and a password. The environment admin is checked against the configured admin email and password. Staff are checked by email against a bcrypt password hash. A successful staff login stores the time of that login. The session cookie records the role, staff id, name, and email. A second cookie, <code>mixxea_auth</code>, is set for admin and staff sign-in. Both cookies are httpOnly, SameSite Lax, Secure in production, and last 24 hours. Passwords are not stored in the cookies.</p>
    <p>Staff accounts are created by an admin with a name, email, role, and password. The password is stored only as a bcrypt hash. An admin can also create an API token. The token secret is shown once. Only a hash, a label, the created time, and the last-used time are stored.</p>
    <p>Purpose: to let staff open the admin tools and to keep those accounts secure.</p>
    <p>Lawful basis: legitimate interests in running the site.</p>
    <p>Retention: the cookies last 24 hours. The account is kept for 6 months after it is closed.</p>

    <h2>Email delivery records</h2>
    <p>Resend is the email provider. If Resend reports that a message bounced, was complained about, failed, or was suppressed, the site stores up to 100 of those events. Each one can include the event type, recipient addresses, subject, from address, bounce type, reason, Resend’s email id, and the time. An alert is emailed to hello@mixxea.com unless another alert address is configured.</p>
    <p>Purpose: to see which messages were not delivered.</p>
    <p>Lawful basis: legitimate interests in fixing failed email.</p>
    <p>Retention: 12 months.</p>

    <h2>Other records staff enter</h2>
    <p>These are not public forms. Admins can store them:</p>
    <ul>
      <li>Contracts: artist, type, signed date, expiry, notes, status, and an uploaded file. The file is stored privately and is visible only to authorised staff, or to the signed-in artist named on that contract.</li>
      <li>Promoters: name, email, venue, city, country, a booking count, and notes.</li>
      <li>Royalties: payee name, amounts, statement period, and payment details if entered.</li>
    </ul>
    <p>Purpose: to manage the label’s business.</p>
    <p>Lawful basis: legitimate interests in managing the label’s business. Contracts and royalties are also kept under a legal obligation in Romanian accounting and tax law.</p>
    <p>Retention: promoter records are kept for 24 months. Contracts, royalties, and signed bookings are kept for as long as Romanian accounting and tax law requires.</p>

    <h2>Who we share data with</h2>
    <p>The site calls these services. The code has no step that sells personal data.</p>
    <ul>
      <li>Vercel provides hosting. When Blob storage is configured, demo audio and contract files are stored there as private blobs. They are not served from a public URL.</li>
      <li>Upstash provides the Redis database for the records above when it is configured. If it is not, the server falls back to files on the machine running it.</li>
      <li>Resend is the only email provider. It sends contact, booking, demo, newsletter, and bounce-alert email. Resend can call back with the delivery events described above.</li>
      <li>Google Analytics 4 is provided by Google Ireland Limited. It loads only after you accept analytics. See Cookies.</li>
      <li>The Meta Pixel is provided by Meta Platforms Ireland Limited. It loads only after you accept marketing. See Cookies.</li>
    </ul>
    <p>These providers may process data outside the European Economic Area, including in the United States. We rely on each provider’s standard data processing terms. Those terms use the EU Standard Contractual Clauses and, where the provider is certified, the EU-US Data Privacy Framework. This notice does not claim any separately signed contract.</p>
    <p>Vercel keeps the request logs it needs to host the site. How long those logs last is Vercel’s own retention policy, described in <a href="https://vercel.com/legal/privacy-policy">Vercel’s privacy policy</a>. This codebase does not set a number of days.</p>

    <h2 id="cookies">Cookies</h2>
    <p>We use optional cookies from two services. Both stay off until you choose, and you can change that choice at any time from Cookie settings in the footer.</p>
    <p>Analytics uses Google Analytics 4, provided by Google Ireland Limited, property G-MEVRRCQQ5T. It tells us which pages are visited and whether the site is working. If you accept analytics, Google may store <code>_ga</code> (about two years, to tell browsers apart) and <code>_ga_MEVRRCQQ5T</code> (about two years, to keep a session together).</p>
    <p>Marketing uses the Meta Pixel, provided by Meta Platforms Ireland Limited, pixel 1331927570650344. It measures visits from Meta ads. The pixel is not loaded unless you accept marketing. If you do, Meta may store <code>_fbp</code> (about three months, to recognise the browser) and, after an ad click, <code>_fbc</code> (about three months, to store that click).</p>
    <p>Strictly necessary storage is not optional. It is used to keep you signed in or to remember a DJ-pool guest id, and to remember the choice you already made.</p>
    <table class="legal-table">
      <thead><tr><th>Name</th><th>What it is</th><th>How long</th></tr></thead>
      <tbody>
        ${row([
          ['Name', '<code>mixxea.sid</code>'],
          ['What it is', 'Session cookie. Set when an admin signs in, an artist signs in, or the DJ pool creates a guest id. httpOnly, SameSite Lax, and Secure in production. It holds a session id. It does not hold your password.'],
          ['How long', '24 hours'],
        ])}
        ${row([
          ['Name', '<code>mixxea_auth</code>'],
          ['What it is', 'Admin and staff sign-in cookie. httpOnly, SameSite Lax, and Secure in production.'],
          ['How long', '24 hours'],
        ])}
        ${row([
          ['Name', '<code>mx-consent</code>'],
          ['What it is', 'Not a cookie. Your analytics and marketing choice is stored in this browser’s localStorage under this key, with the time you made it.'],
          ['How long', '12 months. After that the banner asks again.'],
        ])}
      </tbody>
    </table>
    <p>Optional cookies are set by Google or Meta only after the matching choice. Rejecting, or never choosing, does not load those tags.</p>
    <table class="legal-table">
      <thead><tr><th>Name</th><th>Who sets it</th><th>How long</th></tr></thead>
      <tbody>
        ${row([
          ['Name', '<code>_ga</code>'],
          ['Who sets it', 'Google Ireland Limited, after you accept analytics'],
          ['How long', 'About two years'],
        ])}
        ${row([
          ['Name', '<code>_ga_MEVRRCQQ5T</code>'],
          ['Who sets it', 'Google Ireland Limited, after you accept analytics'],
          ['How long', 'About two years'],
        ])}
        ${row([
          ['Name', '<code>_fbp</code>'],
          ['Who sets it', 'Meta Platforms Ireland Limited, after you accept marketing'],
          ['How long', 'About three months'],
        ])}
        ${row([
          ['Name', '<code>_fbc</code>'],
          ['Who sets it', 'Meta Platforms Ireland Limited, after you accept marketing and only following an ad click'],
          ['How long', 'About three months'],
        ])}
      </tbody>
    </table>
    <p><button type="button" class="btn" data-cookie-settings>Change cookie settings</button></p>
    <p>Lawful basis for analytics and marketing cookies: consent. You can withdraw it with the button above, or with Cookie settings in the footer. Withdrawing consent does not affect processing that already happened. Strictly necessary cookies are used because they are required for the sign-in or DJ-pool feature you are using.</p>

    <h2>Your rights</h2>
    <p>You can ask for access, rectification, erasure, restriction, and a portable copy of your data. You can object to processing based on legitimate interests. You can withdraw consent for the newsletter and for analytics or marketing cookies. Email <a href="mailto:hello@mixxea.com">hello@mixxea.com</a>. We reply within one month, as the GDPR requires. That period can be extended where the GDPR allows it.</p>
    <p>You can complain to the ANSPDCP, Romania’s data protection authority, at <a href="https://www.dataprotection.ro">https://www.dataprotection.ro</a>.</p>
    <p>The minimum age is 16. That is Romania’s age of digital consent. The site’s services are not directed at children under 16.</p>

    <p class="meta">Last updated ${LAST_UPDATED}</p>
  </div>
</div></section>
</main>
${siteFooter()}`;

  return pageShell({
    title: 'Privacy and cookies | Mixxea',
    description: 'Privacy and cookie notice for www.mixxea.com, operated by Freq Grup SRL.',
    canonicalPath: '/privacy',
    robots: preview ? 'noindex, nofollow' : 'index,follow',
    body,
  });
}

module.exports = { renderPrivacyPage };
