export interface DriveFileLink {
  file_id: string;
  url: string;
  /** 'file' untuk file video, 'folder' untuk folder berisi banyak foto. */
  kind?: 'file' | 'folder';
}

/**
 * Ambil ID dari link Google Drive, lalu kembalikan URL view yang konsisten.
 * Mendukung file (/file/d/ID/view, /open?id=ID, /uc?id=ID) dan folder
 * (/drive/folders/ID, /folders/ID, /open?id=ID dengan tipe folder).
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

  // Folder: /drive/folders/ID atau /folders/ID
  const folderMatch = parsed.pathname.match(/\/folders\/([^/]+)/);
  if (folderMatch) {
    const fileId = folderMatch[1];
    if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) return null;
    return {
      file_id: fileId,
      url: `https://drive.google.com/drive/folders/${fileId}`,
      kind: 'folder',
    };
  }

  // File: /file/d/ID/... atau ?id=ID
  const fromPath = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? null;
  const fromQuery = parsed.searchParams.get('id');
  const fileId = fromPath ?? fromQuery;

  if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) return null;

  return {
    file_id: fileId,
    url: `https://drive.google.com/file/d/${fileId}/view`,
    kind: 'file',
  };
}