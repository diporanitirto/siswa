import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { uploadToDrive, type DriveUploadResult } from '@/lib/drive';
import { MAX_BUKTI_PHOTOS, susunBuktiFiles } from '@/lib/bukti';
import { parseDriveFileLink } from '@/lib/drive-link';
import type { BuktiFile } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB per foto (sudah dikompres di HP)

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form
      .getAll('file')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const pelanggaranId = String(form.get('pelanggaran_id') ?? '').trim();
    const nis = String(form.get('nis') ?? '').trim();
    const rawVideoUrl = String(form.get('video_url') ?? '').trim();
    const videoLink = rawVideoUrl ? parseDriveFileLink(rawVideoUrl) : null;

    if (!pelanggaranId || !nis) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }
    if (rawVideoUrl && !videoLink) {
      return NextResponse.json(
        { error: 'Link video Google Drive tidak valid. Salin link file dari menu Bagikan.' },
        { status: 400 }
      );
    }
    if (files.length === 0 && !videoLink) {
      return NextResponse.json(
        { error: 'Unggah minimal satu foto atau masukkan link video Google Drive.' },
        { status: 400 }
      );
    }
    if (files.length > MAX_BUKTI_PHOTOS) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_BUKTI_PHOTOS} foto per tugas.` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'File yang diunggah harus berupa foto.' },
          { status: 400 }
        );
      }
      if (file.size > MAX_PHOTO_BYTES) {
        return NextResponse.json(
          { error: `Ukuran setiap foto maksimal 8 MB (${file.name}).` },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabase();
    const { data: row, error } = await supabase
      .from('pelanggaran')
      .select('id, nis, nama, jenis_nama, bukti_status, perlu_bukti, bukti_files')
      .eq('id', pelanggaranId)
      .maybeSingle();

    if (error?.code === '42703') {
      return NextResponse.json(
        {
          error:
            'Database belum siap untuk banyak foto. Jalankan sql/08-bukti-multi-foto.sql di Supabase.',
        },
        { status: 503 }
      );
    }
    if (error || !row) {
      return NextResponse.json({ error: 'Catatan pelanggaran tidak ditemukan.' }, { status: 404 });
    }
    if (row.nis !== nis) {
      return NextResponse.json({ error: 'Bukti ini bukan milik NIS Anda.' }, { status: 403 });
    }
    if (!row.perlu_bukti) {
      return NextResponse.json(
        { error: 'Pelanggaran ini hanya peringatan, tidak perlu unggah bukti.' },
        { status: 400 }
      );
    }
    if (row.bukti_status === 'selesai') {
      return NextResponse.json({ error: 'Hukuman ini sudah selesai dan tidak bisa unggah ulang.' }, { status: 400 });
    }

    const stamp = Date.now();
    // Beberapa foto dalam satu pengiriman masuk ke satu subfolder Drive.
    const folderName =
      files.length > 1 ? `Tugas-${nis}-${row.id.slice(0, 8)}-${stamp}` : undefined;
    const uploadedFiles: DriveUploadResult[] = [];

    for (const [index, file] of files.entries()) {
      const ext =
        (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) ||
        'jpg';
      const filename = `${nis}-${row.id.slice(0, 8)}-${stamp}-${index + 1}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      try {
        const uploaded = await uploadToDrive({
          nis,
          nama: row.nama,
          jenis: row.jenis_nama ?? '',
          filename,
          mimeType: file.type || 'image/jpeg',
          dataBase64: buffer.toString('base64'),
          folderName,
        });
        uploadedFiles.push(uploaded);
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : 'Gagal mengunggah ke Google Drive.';
        throw new Error(`Foto ${index + 1} gagal diunggah: ${message}`);
      }
    }

    const videoEntry: BuktiFile | null = videoLink ? { ...videoLink, kind: 'video' } : null;
    const { files: buktiFiles, legacy } = susunBuktiFiles(uploadedFiles, videoEntry);

    if (!legacy) {
      return NextResponse.json({ error: 'Tidak ada bukti yang bisa disimpan.' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('pelanggaran')
      .update({
        bukti_file_id: legacy.file_id,
        bukti_url: legacy.url,
        bukti_files: buktiFiles,
        bukti_status: 'menunggu',
        bukti_note: null,
        bukti_uploaded_at: new Date().toISOString(),
      })
      .eq('id', pelanggaranId)
      .select()
      .single();

    if (updateError) {
      console.error('Update bukti error:', updateError);
      const missingColumn = updateError.message.includes('bukti_files');
      return NextResponse.json(
        {
          error: missingColumn
            ? 'Database belum mendukung banyak file. Jalankan sql/08-bukti-multi-foto.sql di Supabase.'
            : 'Bukti terunggah ke Drive tapi gagal disimpan. Coba lagi.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Bukti POST error:', error);
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunggah bukti.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
