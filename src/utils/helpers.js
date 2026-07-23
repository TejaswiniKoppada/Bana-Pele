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

export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
