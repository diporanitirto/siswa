export interface DriveFileLink {
  file_id: string;
  url: string;
}

/**
 * Ambil ID file dari link Google Drive, lalu kembalikan URL view yang konsisten.
 * Mendukung format umum: /file/d/ID/view, /open?id=ID, /uc?id=ID.
 */
export function parseDriveFileLink(input: string): DriveFileLink | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (parsed.hostname !== 'drive.google.com' && parsed.hostname !== 'www.drive.google.com') {
    return null;
  }

  const fromPath = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? null;
  const fromQuery = parsed.searchParams.get('id');
  const fileId = fromPath ?? fromQuery;

  if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) return null;

  return {
    file_id: fileId,
    url: `https://drive.google.com/file/d/${fileId}/view`,
  };
}
