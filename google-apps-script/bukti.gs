/************************************************************
 * DIPORANI - Bukti Hukuman Uploader (Google Apps Script)
 *
 * Script ini menerima foto bukti hukuman dari app siswa dan
 * menyimpannya ke Google Drive, lalu mengembalikan link file.
 * Database (Supabase) hanya menyimpan link-nya.
 *
 * CARA PASANG (sekali saja, ± 3 menit):
 * 1. Buka https://script.google.com lalu klik "New project".
 * 2. Hapus isi Code.gs, tempel seluruh isi file ini.
 * 3. Ganti nilai SECRET di bawah dengan string rahasia bebas
 *    (huruf/angka panjang). Nanti string yang sama dipasang di
 *    .env.local app siswa sebagai DRIVE_UPLOAD_SECRET.
 * 4. Klik Deploy > New deployment > pilih type "Web app".
 *    - Description   : Bukti Hukuman Uploader
 *    - Execute as    : Me (akun Gmail ini)
 *    - Who has access: Anyone
 * 5. Klik Deploy, izinkan akses (Advanced > Go to project).
 * 6. Salin "Web app URL" (berakhiran /exec) ke .env.local app
 *    siswa sebagai DRIVE_UPLOAD_URL.
 * 7. Tes: buka URL /exec di browser. Harus muncul tulisan
 *    {"ok":true,...} tanda script aktif.
 *
 * CATATAN:
 * - Semua foto masuk ke folder "Bukti Hukuman" di Google Drive
 *   akun ini (folder dibuat otomatis saat upload pertama).
 * - File dibagikan "anyone with link" agar bisa dilihat admin
 *   dari dashboard. Jangan pakai akun Drive yang isinya privat.
 * - Kuota Drive akun ini dipakai bersama: 15 GB untuk semua
 *   foto bukti. Foto dari HP sudah dikompres otomatis (~1-2 MB).
 ************************************************************/

// GANTI dengan string rahasia pilihan Anda (sama dengan DRIVE_UPLOAD_SECRET di .env.local)
var SECRET = 'GANTI_DENGAN_STRING_RAHASIA_PANJANG';

var FOLDER_NAME = 'Bukti Hukuman';
var MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function doGet() {
  return jsonOut({
    ok: true,
    message: 'Bukti Hukuman Uploader aktif.',
    folder: FOLDER_NAME,
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ ok: false, error: 'Request kosong.' });
    }

    var body = JSON.parse(e.postData.contents);

    if (body.secret !== SECRET) {
      return jsonOut({ ok: false, error: 'Secret salah.' });
    }
    if (!body.data || !body.mimeType || !body.filename) {
      return jsonOut({ ok: false, error: 'Payload tidak lengkap.' });
    }
    if (String(body.mimeType).indexOf('image/') !== 0) {
      return jsonOut({ ok: false, error: 'Hanya file gambar yang diizinkan.' });
    }

    // Perkiraan ukuran dari panjang base64
    var approxBytes = Math.floor(String(body.data).length * 3 / 4);
    if (approxBytes > MAX_BYTES) {
      return jsonOut({ ok: false, error: 'File terlalu besar (maks 8 MB).' });
    }

    var folder = getOrCreateFolder(FOLDER_NAME);
    var bytes = Utilities.base64Decode(body.data);
    var blob = Utilities.newBlob(bytes, body.mimeType, body.filename);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    return jsonOut({
      ok: true,
      fileId: fileId,
      url: 'https://drive.google.com/file/d/' + fileId + '/view',
      name: file.getName(),
    });
  } catch (err) {
    return jsonOut({ ok: false, error: 'Error: ' + String(err) });
  }
}

function getOrCreateFolder(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
