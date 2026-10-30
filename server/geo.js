const geoip = require('geoip-lite');

const normalizeIp = value => {
  const ip = String(value || '').trim();
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
};

function clientIp(req, hops) {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  const addresses = String(forwardedFor || '').split(',').map(address => address.trim()).filter(Boolean);
  const proxyHops = Number(hops);
  const index = addresses.length - proxyHops;
  return normalizeIp(Number.isInteger(proxyHops) && proxyHops > 0 ? addresses[index] || req.socket?.remoteAddress : req.socket?.remoteAddress);
}

function lookupLocation(ip) {
  const location = geoip.lookup(normalizeIp(ip));
  if (!location?.country || !Array.isArray(location.ll) || !location.ll.every(Number.isFinite)) return null;
  const [lat, lng] = location.ll;
  return {
    country: location.country,
    city: location.city || null,
    lat: Math.round(lat * 10) / 10,
    lng: Math.round(lng * 10) / 10
  };
}

module.exports = { clientIp, lookupLocation };
