/**
 * Small Markdown renderer. HTML is escaped first, then a short allowlist
 * is applied: headings, bold, italic, links, lists, quotes, and images.
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(value) {
  const url = String(value || '').trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return '';
}

function inline(escaped) {
  let html = escaped;
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt, href) => {
    const src = safeHref(href);
    if (!src) return match;
    return `<img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" decoding="async">`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, text, href) => {
    const src = safeHref(href);
    if (!src) return text;
    const external = /^https?:\/\//i.test(src);
    const rel = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(src)}"${rel}>${text}</a>`;
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^\*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return html;
}

function isList(lines, pattern) {
  return lines.length > 0 && lines.every((line) => pattern.test(line));
}

function renderMarkdown(src) {
  const text = String(src || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block) => {
    const lines = block.split('\n').map((line) => line.trimEnd());
    const heading = lines.length === 1 && /^(#{1,3})\s+(.+)$/.exec(lines[0]);
    if (heading) {
      const level = heading[1].length;
      return `<h${level}>${inline(escapeHtml(heading[2].trim()))}</h${level}>`;
    }
    if (lines.every((line) => line.startsWith('> '))) {
      const quote = lines.map((line) => inline(escapeHtml(line.slice(2)))).join('<br>');
      return `<blockquote><p>${quote}</p></blockquote>`;
    }
    if (isList(lines, /^[-*]\s+/)) {
      const items = lines.map((line) => `<li>${inline(escapeHtml(line.replace(/^[-*]\s+/, '')))}</li>`).join('');
      return `<ul>${items}</ul>`;
    }
    if (isList(lines, /^\d+\.\s+/)) {
      const items = lines.map((line) => `<li>${inline(escapeHtml(line.replace(/^\d+\.\s+/, '')))}</li>`).join('');
      return `<ol>${items}</ol>`;
    }
    const body = lines.map((line) => inline(escapeHtml(line))).join('<br>');
    return `<p>${body}</p>`;
  }).join('');
}

function markdownToText(src) {
  return String(src || '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[>#*`_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { renderMarkdown, markdownToText, escapeHtml };
