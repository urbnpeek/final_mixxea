(function () {
  const form = document.getElementById('booking-inquiry');
  if (!form) return;
  const status = document.getElementById('booking-status');

  function setStatus(message, isError) {
    if (!status) return;
    status.textContent = message;
    status.className = 'status-msg ' + (isError ? 'err' : 'ok');
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

    if (!name || !email || !note) {
      setStatus('Name, email, and message are required.', true);
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
        body: JSON.stringify({ name, email, inquiryType, message: lines.join('\n'), link: '' }),
      });
      const payload = await response.json().catch(function () { return {}; });
      if (!response.ok && response.status !== 202) {
        throw new Error(payload.error || 'Could not send the inquiry.');
      }
      form.reset();
      const select = form.querySelector('[name="inquiryType"]');
      if (select) select.value = 'Booking Request';
      setStatus(payload.warning
        ? 'Inquiry saved. Email delivery needs a check, and the request is still on file.'
        : 'Inquiry sent. Freq Vault will reply at the email you entered.', false);
    } catch (err) {
      setStatus((err && err.message) || 'Could not send the inquiry. Email booking@mixxea.com instead.', true);
    } finally {
      if (button) button.disabled = false;
    }
  });
})();
