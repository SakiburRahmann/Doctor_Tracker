/**
 * Portrait sourcing.
 *
 * The registry has no photographs of its own, so each person gets a stable
 * Unsplash portrait derived from their id — the same doctor always shows the
 * same face, and it survives reloads and sorting. Crops are face-aware and
 * sized on the CDN, so the page never downloads a larger file than it shows.
 */

const DOCTORS = [
  '1559839734-2b71ea197ec2',
  '1612349317150-e413f6a5b16d',
  '1622253692010-333f2da6031d',
  '1594824476967-48c8b964273f',
  '1582750433449-648ed127bb54',
  '1576091160399-112ba8d25d1d',
  '1651008376811-b90baee60c1f',
  '1537368910025-700350fe46c7',
];

const PATIENTS = [
  '1494790108377-be9c29b29330',
  '1500648767791-00dcc994a43e',
  '1534528741775-53994a69daeb',
  '1507003211169-0a1dd7228f2d',
  '1544005313-94ddf0286df2',
  '1517841905240-472988babdf9',
  '1524504388940-b1c1722653e1',
  '1594824476967-48c8b964273f',
];

/** FNV-1a — small, stable, and good enough to spread ids across the set. */
function hash(value) {
  let h = 2166136261;
  const str = String(value);
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param {string} id      record id (or any stable key)
 * @param {'doctor'|'patient'} kind
 * @param {number} size    rendered px; the CDN gets 2× for retina
 */
export function portraitUrl(id, kind = 'doctor', size = 40) {
  const pool = kind === 'patient' ? PATIENTS : DOCTORS;
  const photo = pool[hash(`${kind}:${id}`) % pool.length];
  const px = Math.round(size * 2);
  return `https://images.unsplash.com/photo-${photo}?auto=format&fit=facearea&facepad=2.8&w=${px}&h=${px}&q=80`;
}
