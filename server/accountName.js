// The mail account identity is independent from the editable Messenger nickname.
function emailNameFromAddress(email) {
  return String(email || '').split('@')[0].replace(/[._-]+/g, ' ').trim().split(/\s+/).map((part) =>
    part ? `${part[0].toLocaleUpperCase()}${part.slice(1).toLocaleLowerCase()}` : ''
  ).filter(Boolean).join(' ');
}
function accountNameFromClaims(claims, email) {
  const given = typeof claims.given_name === 'string' ? claims.given_name.trim() : '';
  const family = typeof claims.family_name === 'string' ? claims.family_name.trim() : '';
  let name = given && family ? `${given} ${family}` : typeof claims.name === 'string' ? claims.name : '';
  const reversed = name.match(/^([^,]+),\s*(.+)$/);
  if (reversed) name = `${reversed[2]} ${reversed[1]}`;
  return name.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 80) || emailNameFromAddress(email).slice(0, 80);
}
module.exports = { accountNameFromClaims, emailNameFromAddress };
