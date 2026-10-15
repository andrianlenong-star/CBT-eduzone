/**
 * Utility to get the public, student-accessible URL for the application.
 * In Google AI Studio, URLs with `ais-dev-` are private development URLs requiring
 * the project developer's Google login.
 * Public shared URLs that anyone (including students) can open use the `ais-pre-` prefix.
 */

export function getPublicBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  let origin = window.location.origin;
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin + window.location.pathname;
}

export function getPublicStudentExamUrl(subjectId?: string): string {
  const base = getPublicBaseUrl();
  const targetId = subjectId || 'literasi-numerasi';
  return `${base}?mapel=${encodeURIComponent(targetId)}&mode=siswa#siswa`;
}
