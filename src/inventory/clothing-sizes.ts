export type ClothingAudience = 'woman' | 'man' | 'girl' | 'boy' | 'baby';

export type ClothingGarment = 'superior' | 'inferior';

export const CLOTHING_GARMENTS: ClothingGarment[] = ['superior', 'inferior'];

export const CLOTHING_AUDIENCES: ClothingAudience[] = [
  'woman',
  'man',
  'girl',
  'boy',
  'baby',
];

const LETTER_RANK: Record<string, number> = {
  XXS: 1,
  XS: 2,
  S: 3,
  M: 4,
  L: 5,
  XL: 6,
  XXL: 7,
  XXXL: 8,
  XXXXL: 9,
  '2XL': 7,
  '3XL': 8,
  '4XL': 9,
};

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

export function detectAudience(name: string): ClothingAudience | null {
  const n = fold(name);
  if (/\bbebe(s)?\b|\brecien nacido/.test(n)) return 'baby';
  if (/\bnina(s)?\b/.test(n)) return 'girl';
  if (/\bnino(s)?\b/.test(n)) return 'boy';
  if (/\bmujeres?\b|\bdamas?\b/.test(n)) return 'woman';
  if (/\bhombres?\b|\bcaballeros?\b/.test(n)) return 'man';
  return null;
}

export function audiencesForName(name: string): ClothingAudience[] {
  const n = fold(name);
  if (/\bunisex\b/.test(n)) return ['woman', 'man'];
  const one = detectAudience(name);
  return one ? [one] : [];
}

export function normalizeSize(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  const compact = trimmed.replace(/\s/g, '').toUpperCase();
  if (LETTER_RANK[compact] !== undefined) return compact;
  const years = trimmed.match(/^(\d{1,2})\s*a[nñ]os?$/i);
  if (years) return years[1];
  const range = trimmed.match(/^(\d{1,2})\s*[-/]\s*(\d{1,2})(?:\s*meses)?$/i);
  if (range) return `${range[1]}-${range[2]}`;
  if (/^\d{1,2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

const CLOTHING_HINT =
  /\b(camisa|camiseta|blusa|pantalon(es)?|jean(s)?|falda|short(s)?|buzo|chaqueta|sueter|vestido|body|pijama|ropa|prenda|talla|superior(es)?|inferior(es)?|interior(es)?)\b/;

const NOT_CLOTHING =
  /\b(cobija|sabana|toalla|panal|colchoneta|plaza|jabon|kit de aseo)\b/;

export function looksLikeClothing(name: string): boolean {
  const n = fold(name);
  if (NOT_CLOTHING.test(n) && !CLOTHING_HINT.test(n)) return false;
  return CLOTHING_HINT.test(n) || Boolean(detectAudience(name));
}

export function detectGarment(name: string, stored?: string | null): ClothingGarment {
  if (stored === 'superior' || stored === 'inferior') return stored;
  const n = fold(name);
  if (/\b(inferior(es)?|pantalon(es)?|jean(s)?|falda|short(s)?)\b/.test(n)) return 'inferior';
  if (/\b(superior(es)?|camisa|camiseta|blusa|buzo|chaqueta|sueter|vestido|body)\b/.test(n)) {
    return 'superior';
  }
  return 'superior';
}

export function garmentPartLabel(audience: ClothingAudience, garment: ClothingGarment): string {
  if (garment === 'inferior') return 'Inferior';
  if (audience === 'man') return 'Camisa hombre';
  if (audience === 'boy') return 'Camisa niño';
  if (audience === 'baby') return 'Superior';
  return 'Blusa';
}

export function requestDisplayLabel(
  audience: ClothingAudience,
  name: string,
  storedGarment?: string | null,
  storedRequestLabel?: string | null,
): string {
  const custom = storedRequestLabel?.trim();
  if (custom) return custom;
  return garmentPartLabel(audience, detectGarment(name, storedGarment));
}

export function extractSizes(name: string): string[] {
  const found = new Set<string>();

  for (const match of name.matchAll(
    /\btalla\s*[:.]?\s*([a-zA-Z0-9]+(?:\s*[-/]\s*[a-zA-Z0-9]+)?(?:\s*a[nñ]os)?(?:\s*meses)?)/gi,
  )) {
    found.add(normalizeSize(match[1]));
  }

  for (const match of name.matchAll(/\b(\d{1,2})\s*a[nñ]os?\b/gi)) {
    found.add(match[1]);
  }

  for (const match of name.matchAll(/\b(\d{1,2}\s*[-/]\s*\d{1,2})\s*meses\b/gi)) {
    found.add(normalizeSize(match[1]));
  }

  for (const match of name.matchAll(/\b(xxxxl|xxxl|xxl|xl|xs|s|m|l|2xl|3xl|4xl)\b/gi)) {
    found.add(normalizeSize(match[1]));
  }

  const folded = fold(name);
  for (const match of name.matchAll(/\b(\d{1,2})\b/g)) {
    const n = Number(match[1]);
    if (!Number.isFinite(n) || n < 1 || n > 60) continue;
    const at = match.index ?? 0;
    const before = folded.slice(0, at).trimEnd();
    if (/(etapa|pack|x|plazas?)$/.test(before)) continue;
    found.add(String(n));
  }

  return [...found];
}

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const rankA = LETTER_RANK[a];
    const rankB = LETTER_RANK[b];
    if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;
    const numA = Number(a.split('-')[0]);
    const numB = Number(b.split('-')[0]);
    if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) return numA - numB;
    return a.localeCompare(b, 'es', { numeric: true });
  });
}
