import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { uploadToDrive } from '@/lib/drive';

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB (foto sudah dikompres di HP sebelum dikirim)

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const pelanggaranId = String(form.get('pelanggaran_id') ?? '').trim();
    const nis = String(form.get('nis') ?? '').trim();

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'File bukti tidak ditemukan.' }, { status: 400 });
    }
    if (!pelanggaranId || !nis) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Ukuran file maksimal 8 MB.' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Bukti harus berupa foto (JPG/PNG).' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: row, error } = await supabase
      .from('pelanggaran')
      .select('id, nis, nama, jenis_nama, bukti_status, perlu_bukti')
      .eq('id', pelanggaranId)
      .maybeSingle();

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

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
    const filename = `${nis}-${row.id.slice(0, 8)}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadToDrive({
      nis,
      nama: row.nama,
      jenis: row.jenis_nama ?? '',
      filename,
      mimeType: file.type || 'image/jpeg',
      dataBase64: buffer.toString('base64'),
    });

    const { data: updated, error: updateError } = await supabase
      .from('pelanggaran')
      .update({
        bukti_file_id: uploaded.fileId,
        bukti_url: uploaded.url,
        bukti_status: 'menunggu',
        bukti_note: null,
        bukti_uploaded_at: new Date().toISOString(),
      })
      .eq('id', pelanggaranId)
      .select()
      .single();

    if (updateError) {
      console.error('Update bukti error:', updateError);
      return NextResponse.json({ error: 'Bukti terunggah ke Drive tapi gagal disimpan. Coba lagi.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Bukti POST error:', error);
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunggah bukti.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
