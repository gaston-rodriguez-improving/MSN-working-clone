export const stripHtml = (value = '') => String(value ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const formatName = (value = '', max = 40) => {
  const out = [];
  const open = [];
  let count = 0;
  const parts = String(value ?? '').split(/(<[^>]*>)/);
  for (let i = 0; i < parts.length && count < max; i++) {
    const part = parts[i];
    if (i % 2 === 0) {
      const text = part.slice(0, max - count);
      count += text.length;
      out.push(escapeHtml(text));
      if (text.length < part.length) { count = max; out.push('&hellip;'); }
      continue;
    }
    const m = part.match(/^<(\/?)(b|i|u|font)(?:\s+color="(#?[0-9a-fA-F]{3,8})")?\s*>$/i);
    if (!m) continue;
    const tag = m[2].toLowerCase();
    if (m[1]) { const idx = open.lastIndexOf(tag); if (idx >= 0) { open.splice(idx, 1); out.push(`</${tag}>`); } }
    else { open.push(tag); out.push(tag === 'font' && m[3] ? `<font color="${m[3]}">` : `<${tag}>`); }
  }
  return out.join('') + open.reverse().map((t) => `</${t}>`).join('');
};
