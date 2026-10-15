import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nis = searchParams.get('nis')?.trim();

    if (!nis || !/^\d+$/.test(nis)) {
      return NextResponse.json({ error: 'NIS tidak valid.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const [{ data: rows, error }, { data: tahap }] = await Promise.all([
      supabase
        .from('pelanggaran')
        .select(
          'id, jenis_nama, poin, total_poin, hukuman, perlu_bukti, keterangan, tanggal, created_at, bukti_status, bukti_url, bukti_note, bukti_uploaded_at, verified_at'
        )
        .eq('nis', nis)
        .order('created_at', { ascending: false }),
      supabase
        .from('tahap_hukuman')
        .select('id, min_poin, hukuman')
        .order('min_poin', { ascending: true }),
    ]);

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
