/**
 * Turn Supabase / fetch / unknown errors into user-facing text.
 * Avoids showing "{}" from JSON.stringify on empty error objects.
 */
export function formatErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (err == null) return fallback;
  if (typeof err === "string") {
    const trimmed = err.trim();
    return trimmed && trimmed !== "{}" ? trimmed : fallback;
  }
  if (err instanceof Error) {
    const msg = err.message?.trim();
    return msg && msg !== "{}" ? msg : fallback;
  }
  if (typeof err === "object") {
    const record = err as Record<string, unknown>;
    for (const key of ["message", "msg", "error_description", "error", "hint", "details"]) {
      const value = record[key];
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed && trimmed !== "{}") return trimmed;
      }
    }
    try {
      const serialized = JSON.stringify(err);
      if (serialized && serialized !== "{}" && serialized !== "[]") {
        return serialized;
      }
    } catch {
      // ignore circular refs
    }
  }
  return fallback;
}
