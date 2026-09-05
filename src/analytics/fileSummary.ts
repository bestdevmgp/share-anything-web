const MAX_TYPES = 10;
const MAX_EXTENSION_LENGTH = 12;

const extensionOf = (fileName: string) => {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) return 'none';
  return fileName.slice(dot + 1).toLowerCase().slice(0, MAX_EXTENSION_LENGTH);
};

export const fileTypeSummary = (fileNames: string[]) => {
  const counts = new Map<string, number>();
  for (const name of fileNames) {
    const extension = extensionOf(name);
    counts.set(extension, (counts.get(extension) ?? 0) + 1);
  }
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    file_types: ranked.slice(0, MAX_TYPES).map(([extension]) => extension),
    primary_type: ranked[0]?.[0] ?? 'none',
    type_count: ranked.length,
  };
};
