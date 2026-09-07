// Try to extract and parse a JSON object from plain text or a fenced code block.
export function tryParseJson<T>(text: string): {ok: true; value: T} | {ok: false} {
  const trimmed = text.trim();
  // If the response contains a ```json ... ``` block, try its contents first.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidates = fenced ? [fenced, trimmed] : [trimmed];
  for (const candidate of candidates) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    // Skip text that does not contain a possible JSON object.
    if (start === -1 || end <= start) {
      continue;
    }
    try {
      return {ok: true, value: JSON.parse(candidate.slice(start, end + 1)) as T};
    } catch {
      // Try the next candidate if this JSON is invalid.
      continue;
    }
  }
  return {ok: false};
}
// Convert an unknown error value into a readable message.
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
