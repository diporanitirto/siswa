import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const BASE_SELECT =
  'id, jenis_nama, poin, total_poin, hukuman, perlu_bukti, keterangan, tanggal, created_at, bukti_status, bukti_file_id, bukti_url, bukti_note, bukti_uploaded_at, verified_at';
const SELECT_WITH_FILES =
  'id, jenis_nama, poin, total_poin, hukuman, perlu_bukti, keterangan, tanggal, created_at, bukti_status, bukti_file_id, bukti_files, bukti_url, bukti_note, bukti_uploaded_at, verified_at';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nis = searchParams.get('nis')?.trim();

    if (!nis || !/^\d+$/.test(nis)) {
      return NextResponse.json({ error: 'NIS tidak valid.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Sebelum migrasi sql/08 dijalankan, kolom bukti_files belum ada.
    // Fallback ke kolom lama supaya login dan daftar pelanggaran tetap jalan.
    const loadRows = async () => {
      const first = await supabase
        .from('pelanggaran')
        .select(SELECT_WITH_FILES)
        .eq('nis', nis)
        .order('created_at', { ascending: false });

      if (!first.error || first.error.code !== '42703') return first;

      console.warn('Kolom bukti_files belum ada. Jalankan sql/08-bukti-multi-foto.sql.');
      return supabase
        .from('pelanggaran')
        .select(BASE_SELECT)
        .eq('nis', nis)
        .order('created_at', { ascending: false });
    };

    const [rowsResult, { data: tahap }] = await Promise.all([
      loadRows(),
      supabase
        .from('tahap_hukuman')
        .select('id, min_poin, hukuman')
        .order('min_poin', { ascending: true }),
    ]);

    const rows = rowsResult.data;
    const error = rowsResult.error;

    if (error) {
      console.error('Pelanggaran GET error:', error);
      return NextResponse.json({ error: 'Gagal mengambil data pelanggaran.' }, { status: 500 });
    }

    const totalPoin = (rows ?? []).reduce((sum, row) => sum + (row.poin ?? 0), 0);

    return NextResponse.json({
      success: true,
      data: { rows: rows ?? [], tahap: tahap ?? [], totalPoin },
    });
  } catch (error) {
    console.error('Pelanggaran GET error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
