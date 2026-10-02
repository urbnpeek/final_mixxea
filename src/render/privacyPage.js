/**
 * Draft privacy and cookie notice. Facts come from the routes that store data.
 * Open points are marked [CONFIRM] for the controller to answer before production.
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
    <p>This notice describes how www.mixxea.com handles personal data. It covers the public site, the booking form, demo submissions, the newsletter, the artist portal, the DJ pool, and staff sign-in. It is written from what the site code actually does.</p>

    <h2>Who we are</h2>
    <p>The controller is Freq Grup SRL, CUI 52133484, Trade Reg. No. J2025050803009, EUID ROONRC.J2025050803009, Intr. Gheorghe Simionescu 19, Ap. B26, 014155 București (Sector 1), România.</p>
    <p>Privacy requests: <a href="mailto:hello@mixxea.com">hello@mixxea.com</a>.</p>
    <p>This notice does not name a data protection officer. [CONFIRM] whether one is appointed.</p>

    <h2>Contact messages</h2>
    <p>The booking page at <a href="/booking-agency">/booking-agency</a> posts to <code>/api/contact</code>. The fields sent are your name, email, inquiry type, and message. If you fill them in, the message also includes the artist, venue, city, and date. The link field is sent empty. Inquiry types on that form are Booking Request, A&amp;R / Demo Submission, Artist Management, Brand / Partnership, Press / Media, and General.</p>
    <p>The admin site at <a href="/admin">/admin</a> has a separate contact form that posts the same endpoint with name, email, message, inquiry type, an optional link, and a newsletter opt-in checkbox. The public homepage does not have its own contact form.</p>
    <p>Each message is stored with an id and the time it was sent. If the inquiry type contains the word “booking” (the booking page’s “Booking Request” does), a second record is stored as a booking. On that record the venue and contact are set to your name, the notes are the message, and artist, date, city, country, and fee are left empty. The artist, venue, city, and date you typed stay inside the message text.</p>
    <p>The site then emails an admin notification and a confirmation to the address you entered.</p>
    <p>Purpose: to read and reply to the message, and to keep a booking record when the inquiry is a booking request.</p>
    <p>Lawful basis: [CONFIRM]. A booking request is likely steps you asked us to take before a contract. Other messages are likely our legitimate interest in answering them.</p>
    <p>Retention: until no longer needed for the purpose, and at most [CONFIRM] months. Nothing in the code deletes these records on a timer.</p>

    <h2>Demo submissions</h2>
    <p><a href="/submit.html">/submit.html</a> posts JSON to <code>/api/demos/submit</code>. The stored fields are artist name, legal name, email, country, performing-rights organisation (PRO), a profile or SoundCloud link, track title, version, genre, BPM, musical key, file format, a download link, a description, whether the track was released before and where, whether you are the sole writer or a co-writer, co-writer details, whether publishing would sit with Mixxea or your own publisher, your publisher’s name if you have one, and whether the track uses samples (none, cleared, or uncleared). The record also stores an id, the time it was sent, and a status that starts as “new”.</p>
    <p>That page sends a download link. It does not upload a file. The same endpoint accepts a multipart upload (the admin demo form does this) with a <code>track</code> file of up to 200&nbsp;MB. When a file is present and Blob storage is configured, the file is stored and the record keeps the file URL. [CONFIRM] demo files are uploaded with public access. Say if that should change.</p>
    <p>An admin can also email a submission invite (<code>/api/demos/send-link</code>) using an email address and an artist name. That is started by staff, not by the public form.</p>
    <p>The site emails an admin notification and, when an email was provided, a confirmation to the submitter.</p>
    <p>Purpose: A&amp;R review of a demo you chose to send.</p>
    <p>Lawful basis: [CONFIRM]. This is likely steps before a possible label agreement.</p>
    <p>Retention: until no longer needed for the purpose, and at most [CONFIRM] months, including the audio file and the download link. The code does not set a deletion date.</p>

    <h2>Newsletter</h2>
    <p>The footer form posts your email to <code>/api/newsletter/subscribe</code> with source “footer”. The admin site’s newsletter box uses source “homepage”. If you tick the newsletter box on the admin contact form, the same email is added with source “contact-form”. The address is stored in lower case with the time you joined and that source. A welcome email is sent. Signing up again does not create a second row.</p>
    <p>Staff can send a campaign to the stored addresses. The campaign record keeps the subject, intro, from-name, time, how many recipients were attempted, whether it succeeded, and the email provider. It does not keep a separate copy of every address.</p>
    <p><code>DELETE /api/newsletter/unsubscribe/:email</code> removes that address. The email is in the URL. There is no unsubscribe page in the site templates. [CONFIRM] the unsubscribe link you want in the emails.</p>
    <p>Purpose: to send the newsletter you asked for.</p>
    <p>Lawful basis: consent. [CONFIRM] that the subscribe action, stored as the time and the source, is the consent record you want to rely on. The code does not store a copy of the consent text.</p>
    <p>Retention: the address stays on the list until that unsubscribe endpoint removes it, or until it is no longer needed for the purpose, and at most [CONFIRM] months.</p>

    <h2>Booking enquiries</h2>
    <p>The booking page uses the contact endpoint described above. A second public endpoint, <code>POST /api/bookings/inquire</code>, stores the JSON body plus a status of “pending” and the time it was sent. The confirmation email reads artist, venue, contact, email, date, city, country, fee, and notes when those fields are present. No page in this site calls that endpoint. [CONFIRM] whether it is still in use.</p>
    <p>Purpose: to handle a booking request.</p>
    <p>Lawful basis: [CONFIRM], likely steps before a contract.</p>
    <p>Retention: until no longer needed for the purpose, and at most [CONFIRM] months.</p>

    <h2>Artist portal</h2>
    <p><a href="/portal">/portal</a> is a login form. It sends email and password to <code>/api/auth/artist/login</code>. The password is checked against a bcrypt hash. It is not stored in plain text. A successful login puts the artist id and artist name on the session cookie <code>mixxea.sid</code>. There is no separate artist cookie.</p>
    <p><code>POST /api/auth/artist/register</code> still accepts artist name, legal name, email, country, genre, password (stored as a bcrypt hash), and a SoundCloud URL, and sets status to “unsigned”. The redesign login page does not show a registration form. Registration is wired in the admin application script. [CONFIRM] whether public registration is still offered.</p>
    <p>A signed-in artist can load <code>/api/royalties/my</code>. That returns royalty rows an admin entered for the same artist name. The code stores an amount and whatever other fields the admin posted. [CONFIRM] which of those fields are personal data you want named here.</p>
    <p>Purpose: to give an artist access to the portal and to royalty rows entered for them.</p>
    <p>Lawful basis: [CONFIRM], likely a contract with the artist, or steps before one for an unsigned account.</p>
    <p>Retention: until no longer needed for the purpose, and at most [CONFIRM] months after the account is closed. The code does not set a deletion date.</p>

    <h2>DJ pool</h2>
    <p>There is no separate DJ-pool signup. The first DJ-pool request creates a guest id (<code>g-</code> plus eight characters) on <code>mixxea.sid</code> if the browser has no artist id and no admin email. Hearts, crates, download logs, and subscriptions are stored under that id, or under the artist id or admin email when one of those is on the session.</p>
    <p>Hearts store the visitor id and a track id. Crates store the visitor id, a crate name, and track ids. A download stores the visitor id, the track id, and the time. A subscription requires an artist login and stores a tier name (Starter, Pro DJ, or Elite), status, start time, download limit, and downloads used. The code does not collect a card number or a payment. [CONFIRM] whether payment for a tier happens anywhere else.</p>
    <p>Purpose: to remember crates, hearts, and the download allowance for that browser or artist account.</p>
    <p>Lawful basis: [CONFIRM]. [CONFIRM] whether the DJ pool is offered to the public.</p>
    <p>Retention: until no longer needed for the purpose, and at most [CONFIRM] months. The session cookie expires after 24 hours. The database rows do not.</p>

    <h2>Admin and staff sign-in</h2>
    <p><code>POST /api/auth/admin/login</code> takes an email and a password. The environment admin is checked against the configured admin email and password. Staff are checked by email against a bcrypt password hash. A successful staff login stores the time of that login. The session cookie records the role, staff id, name, and email. A second cookie, <code>mixxea_auth</code>, is set for admin and staff sign-in. Both cookies are httpOnly, SameSite Lax, Secure in production, and last 24 hours. Passwords are not stored in the cookies.</p>
    <p>Staff accounts are created by an admin with a name, email, role, and password. The password is stored only as a bcrypt hash. An admin can also create an API token. The token secret is shown once. Only a hash, a label, the created time, and the last-used time are stored.</p>
    <p>Purpose: to let staff open the admin tools and to keep those accounts secure.</p>
    <p>Lawful basis: [CONFIRM], likely a contract with the person or our legitimate interest in running the site.</p>
    <p>Retention: the cookies last 24 hours, which is set in the code. The account itself is kept until it is no longer needed for the purpose, and at most [CONFIRM] months after it is closed.</p>

    <h2>Email delivery records</h2>
    <p>If Resend reports that a message bounced, was complained about, failed, or was suppressed, the site stores up to 100 of those events. Each one can include the event type, recipient addresses, subject, from address, bounce type, reason, Resend’s email id, and the time. An alert is emailed to hello@mixxea.com unless another alert address is configured. Older events drop off once the list passes 100. There is no time limit in the code.</p>
    <p>Purpose: to see which messages were not delivered.</p>
    <p>Lawful basis: [CONFIRM], likely our legitimate interest in fixing failed email.</p>
    <p>Retention: until no longer needed for the purpose, and at most [CONFIRM] months.</p>

    <h2>Other records staff enter</h2>
    <p>These are not public forms. Admins can store them:</p>
    <ul>
      <li>Contracts: artist, type, signed date, expiry, notes, status, and an uploaded file. The file uses the same public Blob upload as demo audio. [CONFIRM] whether contract files should be public.</li>
      <li>Promoters: name, email, venue, city, country, a booking count, and notes.</li>
      <li>Royalties: an amount and the other fields the admin submits, matched to an artist name.</li>
    </ul>
    <p>Purpose: to run the label and the agency. Lawful basis: [CONFIRM]. Retention: until no longer needed for the purpose, and at most [CONFIRM] months.</p>

    <h2>Who we share data with</h2>
    <p>The site calls these services. We do not sell personal data. The code has no sale or ad-broker step.</p>
    <ul>
      <li>Vercel provides hosting and, when Blob storage is configured, file storage for demo audio and contract files. Uploads are stored with public access.</li>
      <li>Upstash provides the Redis database for the records above when it is configured. If it is not, the server falls back to files on the machine running it.</li>
      <li>Resend sends contact, booking, demo, newsletter, and bounce-alert email when a Resend API key is set. Resend can call back with the delivery events described above.</li>
      <li>[CONFIRM] If Resend is not configured and an SMTP user is set, email is sent with Nodemailer instead. The default host in the code is smtp.gmail.com unless another host is set. Say whether production uses Resend only, SMTP, or both.</li>
      <li>Google Analytics 4 is provided by Google Ireland Limited. It loads only after you accept analytics. See Cookies.</li>
      <li>The Meta Pixel is provided by Meta Platforms Ireland Limited. It loads only after you accept marketing. See Cookies.</li>
    </ul>
    <p>These providers may process data outside the European Economic Area, including in the United States. The usual tools for that kind of transfer are Standard Contractual Clauses and, where a provider is certified, the EU-US Data Privacy Framework. [CONFIRM] which of those Freq Grup actually relies on for Vercel, Upstash, Resend, Google, and Meta. This notice does not claim that a particular contract is signed.</p>
    <p>Hosting means Vercel handles the request data needed to serve the page. This codebase does not set how long those host logs are kept. [CONFIRM] the log retention period.</p>

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
          ['What it is', 'Not a cookie. Your analytics and marketing choice is stored in this browser’s localStorage under this key, as version, analytics yes or no, and marketing yes or no.'],
          ['How long', 'No expiry is set in the code. [CONFIRM] how long that choice should be kept.'],
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
    <p>You can ask for access, rectification, erasure, restriction, and a portable copy of your data. You can object to processing based on legitimate interests. You can withdraw consent for the newsletter and for analytics or marketing cookies. Email <a href="mailto:hello@mixxea.com">hello@mixxea.com</a>. The GDPR usually requires a reply within one month, and that period can be extended in some cases. [CONFIRM] any shorter time you want to promise.</p>
    <p>You can complain to the ANSPDCP, Romania’s data protection authority, at <a href="https://www.dataprotection.ro">https://www.dataprotection.ro</a>.</p>
    <p>These forms are for artists, promoters, and staff. [CONFIRM] a minimum age if you want one stated.</p>

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
