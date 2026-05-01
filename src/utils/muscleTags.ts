export function getMuscleTags(category: string | undefined) {
  const seen = new Set<string>();
  const tags = (category || '')
    .split(/\s+/)
    .map(tag => tag.trim().replace(/^#+/, ''))
    .filter(Boolean)
    .filter(tag => {
      const key = tag.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return tags;
}

export function formatMuscleTags(category: string | undefined, withHash = true) {
  return getMuscleTags(category)
    .map(tag => withHash ? `#${tag}` : tag)
    .join(' ');
}
