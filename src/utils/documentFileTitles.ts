import path from 'path';

/** Safe download filename: attachment title + extension from stored key. */
export function attachmentDownloadBasename(title: string, storageKey: string): string {
  const ext = path.extname(path.basename(storageKey));
  const base =
    title
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 120) || 'file';
  return `${base}${ext}`;
}

/**
 * Parse multipart `file_titles` JSON: one non-empty string per file, max 50 chars each.
 */
export function parseAndValidateFileTitles(
  raw: unknown,
  fileCount: number
): { ok: true; titles: string[] } | { ok: false; message: string } {
  if (fileCount < 1) {
    return { ok: false, message: 'At least one file is required' };
  }
  if (raw == null || raw === '') {
    return {
      ok: false,
      message:
        'file_titles is required: JSON array with one title per file (1–50 characters each)',
    };
  }
  if (typeof raw !== 'string') {
    return { ok: false, message: 'file_titles must be a JSON string' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'file_titles must be valid JSON' };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, message: 'file_titles must be a JSON array' };
  }
  if (parsed.length !== fileCount) {
    return {
      ok: false,
      message: `file_titles must have exactly ${fileCount} entries (one per file)`,
    };
  }
  const titles: string[] = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const item = parsed[i];
    if (typeof item !== 'string') {
      return { ok: false, message: `file_titles[${i}] must be a string` };
    }
    const t = item.trim();
    if (!t.length) {
      return { ok: false, message: `Title is required for file ${i + 1}` };
    }
    if (t.length > 50) {
      return {
        ok: false,
        message: `Title for file ${i + 1} cannot exceed 50 characters`,
      };
    }
    titles.push(t);
  }
  return { ok: true, titles };
}
