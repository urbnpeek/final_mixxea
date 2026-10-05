(function () {
  const form = document.getElementById('booking-inquiry');
  if (!form) return;
  const status = document.getElementById('booking-status');

  function setStatus(message, isError) {
    if (!status) return;
    status.textContent = message;
    status.className = 'status-msg ' + (isError ? 'err' : 'ok');
  }

  function guardFields() {
    if (window.MixxeaGuard) return window.MixxeaGuard.collect(form);
    const data = new FormData(form);
    return {
      company_url: String(data.get('company_url') || ''),
      form_started_at: Number(data.get('form_started_at') || ''),
      'cf-turnstile-response': String(data.get('cf-turnstile-response') || ''),
    };
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const inquiryType = String(data.get('inquiryType') || 'Booking Request').trim();
    const artist = String(data.get('artist') || '').trim();
    const venue = String(data.get('venue') || '').trim();
    const city = String(data.get('city') || '').trim();
    const eventDate = String(data.get('eventDate') || '').trim();
    const note = String(data.get('message') || '').trim();
    const guard = guardFields();

    if (!name || !email || !note) {
      setStatus('Name, email, and message are required.', true);
      return;
    }
    if (!guard['cf-turnstile-response']) {
      setStatus('Complete the verification and try again.', true);
      return;
    }

    const lines = [];
    if (artist) lines.push('Artist: ' + artist);
    if (venue) lines.push('Venue: ' + venue);
    if (city) lines.push('City: ' + city);
    if (eventDate) lines.push('Date: ' + eventDate);
    if (lines.length) lines.push('');
    lines.push(note);

    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    setStatus('Sending…', false);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          inquiryType: inquiryType,
          message: lines.join('\n'),
          link: '',
          company_url: guard.company_url,
          form_started_at: guard.form_started_at,
          'cf-turnstile-response': guard['cf-turnstile-response'],
        }),
      });
      const payload = await response.json().catch(function () { return {}; });
      if (!response.ok && response.status !== 202) {
        throw new Error(payload.error || 'Could not send the inquiry.');
      }
      form.reset();
      if (window.MixxeaGuard) window.MixxeaGuard.reset(form);
      const select = form.querySelector('[name="inquiryType"]');
      if (select) select.value = 'Booking Request';
      setStatus(payload.warning
        ? 'Inquiry saved. Email delivery needs a check, and the request is still on file.'
        : 'Inquiry sent. Freq Vault will reply at the email you entered.', false);
    } catch (err) {
      setStatus((err && err.message) || 'Could not send the inquiry. Email booking@mixxea.com instead.', true);
      if (window.MixxeaGuard) window.MixxeaGuard.reset(form);
    } finally {
      if (button) button.disabled = false;
    }
  });
})();
