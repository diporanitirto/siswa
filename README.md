# Dashboard Siswa — Poin & Hukuman (DIPORANI)

App khusus siswa untuk:
- Masuk pakai NIS (tanpa akun/password)
- Melihat rekap poin pelanggaran dan hukuman yang berlaku
- Upload foto bukti hukuman → otomatis masuk Google Drive, database hanya menyimpan linknya
- Lihat status verifikasi bukti (menunggu / selesai / ditolak + alasan)

Data pelanggaran dicatat oleh petugas dari **dashboard admin** (menu *Pelanggaran*).
Skema database ada di `sql/06-pelanggaran.sql` dan `sql/07-pelanggaran-perlu-bukti.sql`
(jalankan berurutan di Supabase SQL Editor).

Catatan: pelanggaran dengan hukuman **tahap peringatan** (tahap pertama, min_poin
terkecil) tidak perlu upload bukti — upload bukti hanya untuk tahap kedua dst.
Kalau pengaturan tahap diubah (dari dashboard admin), catatan yang **belum diproses**
langsung menyesuaikan tahap terbaru — misalnya hukuman tahap baru ditambahkan setelah
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

> Penting: pakai akun Gmail yang memang disiapkan untuk ambalan. Kuota Drive 15 GB
> dibagi untuk semua foto bukti (foto sudah dikompres ~1–2 MB di HP sebelum dikirim).

## Alur pemakaian

1. Petugas mencatat pelanggaran di **dashboard admin → Pelanggaran**. Poin dihitung
   otomatis (default 1 poin per pelanggaran, bisa diubah per jenis).
2. Hukuman mengikuti **tahap** (misal pelanggaran pertama = "Peringatan", berikutnya
   bisa diatur di tab *Pengaturan* dashboard admin).
3. Siswa buka app ini → masuk dengan NIS → lihat poin & hukuman → upload foto bukti.
4. Petugas memverifikasi di tab *Daftar & Verifikasi*: **Setujui** (selesai) atau
   **Tolak** + alasan (siswa bisa upload ulang).

## Deploy (Vercel)

- Root directory: folder `siswa`
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `DRIVE_UPLOAD_URL`, `DRIVE_UPLOAD_SECRET`
