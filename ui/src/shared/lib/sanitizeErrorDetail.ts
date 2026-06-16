/** Returns true when an error detail string looks like internal backend diagnostics. */
export function isTechnicalErrorDetail(detail?: string): boolean {
  if (!detail?.trim()) {
    return false;
  }
  return /\/app\/|\.npy\b|user_feat|pub_universe|stage10|deepsets|artifacts?/i.test(
    detail,
  );
}

/** Strips technical paths from error details shown on marketer-facing surfaces. */
export function sanitizeMarketerErrorDetail(
  detail?: string,
): string | undefined {
  if (!detail || isTechnicalErrorDetail(detail)) {
    return undefined;
  }
  return detail;
}
