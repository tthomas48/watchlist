export function personInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Prefer snake_case browse field, then camelCase vote/client field. */
export function personAvatarSrc(person, cacheBust) {
  if (!person) return null;
  const base = person.avatar_url || person.avatarUrl || null;
  if (!base) return null;
  if (cacheBust == null || cacheBust === '') return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}v=${encodeURIComponent(String(cacheBust))}`;
}
