const { siteNav, siteFooter, pageShell, esc } = require('./publicPages');

function renderUnsubscribePage({ preview = false, email = '', token = '', done = false, invalid = false } = {}) {
  const draft = preview
    ? '<div class="draft-banner" role="status">Draft for approval</div>'
    : '';
  let main = '';
  if (done) {
    main = `<h1 class="d-m">Unsubscribed</h1>
      <p class="body">That address is off the newsletter list. We keep only the address and the time, so a bulk import does not add it again. You can subscribe again yourself from the footer whenever you want.</p>`;
  } else if (invalid || !email) {
    main = `<h1 class="d-m">Link not valid</h1>
      <p class="body">This unsubscribe link is missing or no longer matches. Email <a href="mailto:hello@mixxea.com">hello@mixxea.com</a> if you still want to be removed.</p>`;
  } else {
    main = `<h1 class="d-m">Unsubscribe</h1>
      <p class="body">This will remove <strong>${esc(email)}</strong> from the Mixxea newsletter.</p>
      <form method="post" action="/unsubscribe?token=${encodeURIComponent(token)}">
        <input type="hidden" name="confirm" value="1">
        <button class="btn acid" type="submit">Confirm unsubscribe</button>
      </form>`;
  }
  const body = `${siteNav('/unsubscribe')}
<main id="content">
${draft}
<section class="band"><div class="wrap legal">
  ${main}
</div></section>
</main>
${siteFooter()}`;
  return pageShell({
    title: done ? 'Unsubscribed | Mixxea' : 'Unsubscribe | Mixxea',
    description: 'Unsubscribe from the Mixxea newsletter.',
    canonicalPath: '/unsubscribe',
    omitCanonical: true,
    robots: 'noindex, nofollow',
    body,
  });
}

module.exports = { renderUnsubscribePage };
