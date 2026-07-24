const AVATAR_PALETTE = ['#4B2E83', '#8B5CF6', '#2F8F7A', '#C2703D', '#3B6FB0'];

export function avatarColorForName(name) {
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function darkenHex(hex, amount) {
  const value = hex.replace('#', '');
  const r = Math.round(parseInt(value.slice(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(value.slice(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(value.slice(4, 6), 16) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export function thumbnailPlaceholderGradient(title) {
  const base = avatarColorForName(title);
  return `linear-gradient(135deg, ${base} 0%, ${darkenHex(base, 0.35)} 100%)`;
}

export function initialsForName(name) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0];
  return initials.toUpperCase();
}

const YOUTUBE_ID_PATTERN =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/;

/** Extracts the 11-char video id from any common YouTube URL shape (watch, youtu.be, embed, shorts) — including extra query params like `?si=...`. Returns null for non-YouTube URLs. */
export function getYouTubeVideoId(url) {
  if (!url) return null;
  const match = url.match(YOUTUBE_ID_PATTERN);
  return match ? match[1] : null;
}

/** Public, no-API-key thumbnail CDN — https://img.youtube.com/vi/<id>/hqdefault.jpg always exists for a valid video id. Returns null for non-YouTube URLs. */
export function getYouTubeThumbnailUrl(url) {
  const id = getYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** Elevate's login response carries no per-user mentor/mentee field (confirmed
 * live — `organizations[].roles` lists every role the org offers, not which
 * one this account has), so the login identifier is the only signal already
 * in auth state that tells the two accounts apart. Defaults to 'mentee'. */
export function roleFromEmail(email) {
  return /mentor/i.test(email || '') ? 'mentor' : 'mentee';
}

export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
