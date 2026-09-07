export function tryParseJson<T>(text: string): {ok: true; value: T} | {ok: false} {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidates = fenced ? [fenced, trimmed] : [trimmed];

  for (const candidate of candidates) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');

    if (start === -1 || end <= start) {
      continue;
    }

    try {
      return {ok: true, value: JSON.parse(candidate.slice(start, end + 1)) as T};
    } catch {
      continue;
    }
  }

  return {ok: false};
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
