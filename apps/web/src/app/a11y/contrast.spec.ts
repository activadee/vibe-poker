// Simple contrast checks for key design tokens to meet WCAG AA (4.5:1) for normal text
// This is not exhaustive, but guards against accidental regressions.

function srgb(chan: number): number {
  const c = chan / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  if (h.length === 6) {
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
  throw new Error('Only 6-digit hex supported');
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const [R, G, B] = [srgb(r), srgb(g), srgb(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(fg: string, bg: string): number {
  const L1 = luminance(fg);
  const L2 = luminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Design token contrast', () => {
  const WHITE = '#ffffff';
  const TOKENS = {
    primary900: '#1a2a40',
    slate700: '#334155', // Tailwind slate-700
    slate600: '#475569', // Tailwind slate-600
  } as const;

  it('primary-900 text on white >= 4.5:1', () => {
    expect(contrastRatio(TOKENS.primary900, WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it('slate-700 text on white >= 4.5:1', () => {
    expect(contrastRatio(TOKENS.slate700, WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it('slate-600 text on white >= 4.5:1', () => {
    expect(contrastRatio(TOKENS.slate600, WHITE)).toBeGreaterThanOrEqual(4.5);
  });
});

