/* /release/<token> — artist release-details form. Files go straight from the browser to private storage. */
(function () {
  'use strict';
  var token = (location.pathname.match(/^\/release\/([A-Za-z0-9_-]{43})\/?$/) || [])[1] || '';
  var api = '/api/release/' + token;
  var form = document.getElementById('rl-form');
  var state = { info: null, wav: null, artwork: null, uploading: 0 };

  function $(id) { return document.getElementById(id); }
  function show(el, on) { el.hidden = !on; }
  function alertMsg(text) { var a = $('rl-alert'); a.textContent = text || ''; show(a, !!text); }
  function fieldErr(name, text) {
    var el = form.querySelector('[data-err="' + name + '"]');
    if (el) { el.textContent = text || ''; return; }
    var input = form.elements[name];
    if (!input) return;
    var next = input.parentNode.querySelector('.rl-err');
    if (!next) { next = document.createElement('div'); next.className = 'rl-err'; input.parentNode.appendChild(next); }
    next.textContent = text || '';
  }
  function clearErrs() { Array.prototype.forEach.call(form.querySelectorAll('.rl-err'), function (e) { e.textContent = ''; }); }
  function mb(n) { return (n / 1048576).toFixed(1) + ' MB'; }

  function addCredit(c) {
    c = c || {};
    var row = document.createElement('div');
    row.className = 'rl-credit';
    row.innerHTML =
      '<label>Name<input data-c="name" maxlength="120" /></label>' +
      '<label>Role<select data-c="role"><option value="writer">Writer</option><option value="producer">Producer</option><option value="writer_producer">Writer + producer</option></select></label>' +
      '<label>Share %<input data-c="share" type="number" min="0" max="100" step="0.01" /></label>' +
      '<button type="button" class="rl-x" aria-label="Remove">×</button>';
    row.querySelector('[data-c="name"]').value = c.name || '';
    row.querySelector('[data-c="role"]').value = c.role || 'writer_producer';
    row.querySelector('[data-c="share"]').value = c.share != null ? c.share : '';
    row.querySelector('.rl-x').addEventListener('click', function () { row.remove(); total(); });
    row.querySelector('[data-c="share"]').addEventListener('input', total);
    $('rl-credits').appendChild(row);
    total();
  }
  function credits() {
    return Array.prototype.map.call($('rl-credits').querySelectorAll('.rl-credit'), function (r) {
      return { name: r.querySelector('[data-c="name"]').value.trim(), role: r.querySelector('[data-c="role"]').value, share: r.querySelector('[data-c="share"]').value };
    });
  }
  function total() {
    var t = credits().reduce(function (s, c) { return s + (parseFloat(c.share) || 0); }, 0);
    $('rl-credit-total').textContent = 'Total: ' + (Math.round(t * 100) / 100) + '%';
  }

  function safeName(name) { return String(name || 'file').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').slice(0, 80) || 'file'; }

  function uploadFile(kind, file) {
    var isWav = kind === 'wav';
    var max = isWav ? state.info.limits.wavMaxBytes : state.info.limits.artworkMaxBytes;
    fieldErr(kind, '');
    state[kind] = null;
    show($(isWav ? 'rl-wav-ok' : 'rl-art-ok'), false);
    if (!file) return;
    var ext = (file.name.match(/\.([^.]+)$/) || [])[1] || '';
    if (isWav && !/^wav$/i.test(ext)) return fieldErr(kind, 'Only .wav files are accepted.');
    if (!isWav && !/^(jpe?g|png)$/i.test(ext)) return fieldErr(kind, 'Artwork must be .jpg or .png.');
    if (file.size > max) return fieldErr(kind, 'File is too large (max ' + mb(max) + ').');
    if (!state.info.uploadsEnabled) return fieldErr(kind, 'File uploads are not available on this test site.');
    var pathname = state.info.uploadPrefix + kind + '-' + safeName(file.name) + '.' + ext.toLowerCase();
    var bar = $(isWav ? 'rl-wav-progress' : 'rl-art-progress');
    show(bar, true); bar.firstChild.style.width = '0%';
    state.uploading++; $('rl-submit').disabled = true;
    window.MixxeaBlob.upload(pathname, file, {
      access: 'private',
      handleUploadUrl: api + '/upload',
      clientPayload: kind,
      multipart: file.size > 20 * 1048576,
      contentType: isWav ? 'audio/wav' : (/png/i.test(ext) ? 'image/png' : 'image/jpeg'),
      onUploadProgress: function (p) { bar.firstChild.style.width = Math.round(p.percentage) + '%'; },
    }).then(function (blob) {
      state[kind] = { pathname: blob.pathname, url: blob.url, size: file.size, name: file.name };
      var ok = $(isWav ? 'rl-wav-ok' : 'rl-art-ok');
      ok.textContent = 'Uploaded: ' + file.name + ' (' + mb(file.size) + ')';
      show(ok, true);
    }).catch(function (e) {
      fieldErr(kind, 'Upload failed: ' + (e && e.message ? e.message : 'please try again') + '.');
    }).then(function () {
      state.uploading--; if (!state.uploading) $('rl-submit').disabled = false;
    });
  }

  function load() {
    if (!token) { alertMsg('This link is not valid. Please use the link from your approval email.'); $('rl-sub').textContent = ''; return; }
    fetch(api, { credentials: 'same-origin' }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (res) {
      if (!res.ok) { $('rl-sub').textContent = ''; alertMsg(res.j.error || 'This link is not valid.'); return; }
      var i = state.info = res.j;
      if (i.submitted) { $('rl-sub').textContent = ''; show($('rl-done'), true); return; }
      $('rl-sub').textContent = 'For "' + (i.trackTitle || 'your track') + '". Fields marked * are required.' + (i.expiresAt ? ' This link works until ' + new Date(i.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '.' : '');
      ['legalName', 'artistName', 'email', 'country', 'trackTitle', 'version', 'genre', 'bpm', 'musKey'].forEach(function (k) { if (form.elements[k] && i[k] != null) form.elements[k].value = i[k]; });
      addCredit({ name: i.legalName || i.artistName || '', role: 'writer_producer', share: 100 });
      if (!i.uploadsEnabled) alertMsg('Test site: file uploads are switched off here, so the form cannot be sent.');
      show(form, true);
    }).catch(function () { alertMsg('Could not load the form. Please check your connection and reload.'); });
  }

  $('rl-add-credit').addEventListener('click', function () { addCredit(); });
  $('rl-wav').addEventListener('change', function (e) { uploadFile('wav', e.target.files[0]); });
  $('rl-art').addEventListener('change', function (e) { uploadFile('artwork', e.target.files[0]); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrs(); alertMsg('');
    if (state.uploading) return alertMsg('Please wait for the upload to finish.');
    var body = {};
    ['legalName', 'artistName', 'email', 'phone', 'country', 'featuredArtists', 'trackTitle', 'version', 'genre', 'bpm', 'musKey', 'isrc', 'notes'].forEach(function (k) { body[k] = form.elements[k].value; });
    body.confirm = form.elements.confirm.checked;
    body.credits = credits();
    body.wav = state.wav;
    body.artwork = state.artwork;
    $('rl-submit').disabled = true;
    fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) { show(form, false); $('rl-sub').textContent = ''; show($('rl-done'), true); window.scrollTo(0, 0); return; }
        alertMsg(res.j.error || 'Please check the form.');
        Object.keys(res.j.errors || {}).forEach(function (k) { fieldErr(k, res.j.errors[k]); });
      })
      .catch(function () { alertMsg('Could not send. Please check your connection and try again.'); })
      .then(function () { $('rl-submit').disabled = false; });
  });

  load();
})();
