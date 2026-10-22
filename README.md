# Dashboard Siswa: Poin & Hukuman (DIPORANI)

App khusus siswa untuk:
- Masuk pakai NIS (tanpa akun/password)
- Melihat rekap poin pelanggaran dan hukuman yang berlaku
- Halaman tugas per pelanggaran: rincian hukuman, status, dan form upload bukti di `/tugas/[id]`
- Upload beberapa foto bukti hukuman (maks. 5) + link video Google Drive opsional → foto masuk Google Drive, database menyimpan linknya
- Jika upload lebih dari satu foto, app membuat satu folder Drive per pengiriman; admin cukup membuka satu link folder untuk verifikasi
- Lihat status verifikasi bukti (menunggu / selesai / ditolak + alasan)
- Lihat semua foto dan link video bukti yang pernah dikirim

Data pelanggaran dicatat oleh petugas dari **dashboard admin** (menu *Pelanggaran*).
Skema database ada di `sql/06-pelanggaran.sql`, `sql/07-pelanggaran-perlu-bukti.sql`, dan
`sql/08-bukti-multi-foto.sql` (jalankan berurutan di Supabase SQL Editor).

Catatan: pelanggaran dengan hukuman **tahap peringatan** (tahap pertama, min_poin
terkecil) tidak perlu upload bukti; upload bukti hanya untuk tahap kedua dst.
Kalau pengaturan tahap diubah (dari dashboard admin), catatan yang **belum diproses**
langsung menyesuaikan tahap terbaru, misalnya hukuman tahap baru ditambahkan setelah
catatan lama tercatat, siswanya otomatis bisa upload bukti untuk hukuman itu.

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya (lihat bawah)
npm run dev                  # jalan di http://localhost:3002
```

### Isi `.env.local`

| Variable | Isi |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | sama dengan app izin/dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | sama dengan app izin/dashboard (server-only, jangan dipublikasikan) |
| `DRIVE_UPLOAD_URL` | URL web app Apps Script (berakhiran `/exec`) |
| `DRIVE_UPLOAD_SECRET` | string rahasia yang sama dengan `SECRET` di Apps Script |

## Setup Google Drive (upload bukti)

Foto bukti hukuman disimpan di Google Drive akun Gmail ambalan, lewat Apps Script:

1. Buka https://script.google.com → **New project**.
2. Tempel seluruh isi `google-apps-script/bukti.gs` ke `Code.gs`.
3. Ganti `SECRET` di file itu dengan string rahasia panjang pilihanmu.
4. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Salin **Web app URL** ke `DRIVE_UPLOAD_URL`, dan string rahasia ke `DRIVE_UPLOAD_SECRET`.
6. Tes: buka URL `/exec` di browser → harus muncul `{"ok":true,...}`.

Foto otomatis masuk folder **"Bukti Hukuman"** di Drive (dibuat sendiri saat upload pertama),
dan dibagikan *anyone with link* supaya admin bisa melihatnya dari dashboard.
Kalau satu pengiriman berisi beberapa foto, app membuat **satu subfolder per pengiriman**
di dalam folder tersebut; admin cukup membuka satu link folder untuk verifikasi.

Jika `bukti.gs` diubah nanti, buka **Deploy → Manage deployments → ikon edit**
pada deployment yang aktif, pilih **Version: New version**, lalu **Deploy**.
URL web app tetap sama; tidak perlu ganti `DRIVE_UPLOAD_URL`.

> Penting: pakai akun Gmail yang memang disiapkan untuk ambalan. Kuota Drive 15 GB
> dipakai untuk semua foto bukti (foto sudah dikompres ~1–2 MB di HP sebelum dikirim).

## Link video bukti

Video **tidak diunggah lewat app**. Siswa upload videonya sendiri ke Google Drive, lalu
tempel link file video di form bukti. Syaratnya:

1. Di Google Drive, klik kanan file video → **Bagikan**.
2. Ubah akses menjadi **Siapa saja yang memiliki link**.
3. Salin link, lalu tempel di kolom **Link video Google Drive** pada halaman tugas.

Gunakan link **file** (bukan link folder). Satu pengiriman hanya menerima satu link video.

## Alur pemakaian

1. Petugas mencatat pelanggaran di **dashboard admin → Pelanggaran**. Poin dihitung
   otomatis (default 1 poin per pelanggaran, bisa diubah per jenis).
2. Hukuman mengikuti **tahap** (misal pelanggaran pertama = "Peringatan", berikutnya
   bisa diatur di tab *Pengaturan* dashboard admin).
3. Siswa buka app ini → masuk dengan NIS → lihat poin & hukuman → klik **Buka halaman tugas**
   untuk melihat rincian dan mengirim bukti (beberapa foto dan/atau link video Drive).
4. Petugas memverifikasi di tab *Daftar & Verifikasi*: **Setujui** (selesai) atau
   **Tolak** + alasan (siswa bisa upload ulang).

## Deploy (Vercel)

- Root directory: folder `siswa`
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `DRIVE_UPLOAD_URL`, `DRIVE_UPLOAD_SECRET`
