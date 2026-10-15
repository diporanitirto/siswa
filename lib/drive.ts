interface DriveUploadInput {
  nis: string;
  nama: string;
  jenis: string;
  filename: string;
  mimeType: string;
  dataBase64: string;
}

interface DriveUploadResult {
  fileId: string;
  url: string;
}

/**
 * Kirim file bukti ke Google Drive lewat Apps Script web app.
 * URL + secret disimpan di server (.env.local), tidak pernah dikirim ke browser.
 * Kode Apps Script: google-apps-script/bukti.gs
 */
export async function uploadToDrive(input: DriveUploadInput): Promise<DriveUploadResult> {
  const url = process.env.DRIVE_UPLOAD_URL;
  const secret = process.env.DRIVE_UPLOAD_SECRET;

  if (!url || !secret) {
    throw new Error('Upload Drive belum dikonfigurasi. Isi DRIVE_UPLOAD_URL dan DRIVE_UPLOAD_SECRET di .env.local.');
  }

  const { dataBase64, ...meta } = input;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Apps Script (bukti.gs) membaca: secret, filename, mimeType, data (base64).
      body: JSON.stringify({ secret, ...meta, data: dataBase64 }),
      // Apps Script membalas redirect ke endpoint echo -> diikuti otomatis.
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error('Tidak bisa menghubungi layanan Drive. Coba lagi.');
  }

  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; fileId?: string; url?: string; error?: string }
    | null;

  if (!res.ok || !json?.ok || !json.fileId || !json.url) {
    throw new Error(json?.error || 'Gagal mengunggah bukti ke Google Drive.');
  }

  return { fileId: json.fileId, url: json.url };
}
