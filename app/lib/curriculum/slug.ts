export function normalizeLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeClassName(value: string): string {
  return normalizeLabel(value.replace(/^klasa\s+/i, ""));
}

export function slugify(value: string): string {
  return normalizeLabel(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function classIdFromName(name: string): string {
  const normalized = normalizeClassName(name);

  if (/^\d+\s*lo$/.test(normalized)) {
    return normalized.replace(/\s+/g, "");
  }

  if (normalized === "matura") {
    return "matura";
  }

  return slugify(normalized);
}

export function classDisplayName(name: string): string {
  const normalized = normalizeClassName(name);

  if (/^\d+\s*lo$/.test(normalized)) {
    return `Klasa ${normalized.replace(/\s+/g, " ").toUpperCase()}`;
  }

  if (normalized === "matura") {
    return "Matura";
  }

  return name.trim();
}
