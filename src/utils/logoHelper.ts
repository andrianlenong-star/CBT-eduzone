export type LogoShape = 'oval' | 'rounded' | 'circle' | 'square';
export type LogoFit = 'cover' | 'contain';

/**
 * Returns Tailwind border-radius class matching the frame shape
 * Default is oval / rounded-full for smooth curved oval look
 */
export function getLogoShapeClass(shape?: string): string {
  if (shape === 'square') return 'rounded-2xl';
  if (shape === 'rounded') return 'rounded-3xl';
  return 'rounded-full'; // default: oval melengkung proporsional
}

/**
 * Returns Tailwind class for inner image fitting
 * 'contain' (default) ensures the entire logo is precisely visible without being cropped or covered
 * 'cover' allows edge-to-edge fill if specifically requested
 */
export function getLogoFitClass(fit?: string): string {
  if (fit === 'cover') return 'object-cover';
  return 'object-contain'; // default: presisi, utuh, dan tidak terpotong/tertutup
}
