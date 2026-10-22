export interface SiswaData {
  nis: string;
  nama: string;
  jk: string;
  kelas: string;
  absen: number;
}

export interface TahapHukuman {
  id: number;
  min_poin: number;
  hukuman: string;
}

export type BuktiStatus = 'belum' | 'menunggu' | 'selesai' | 'ditolak';

export interface BuktiFile {
  file_id: string;
  url: string;
  /** Foto hasil upload, link video, atau folder Drive berisi beberapa foto. Data lama tidak punya field ini. */
  kind?: 'image' | 'video' | 'folder';
  /** Jumlah foto di dalam folder (khusus kind folder). */
  count?: number;
}

export interface PelanggaranData {
  id: string;
  jenis_nama: string | null;
  poin: number;
  total_poin: number | null;
  hukuman: string | null;
  perlu_bukti: boolean;
  keterangan: string | null;
  tanggal: string;
  created_at: string;
  bukti_status: BuktiStatus;
  bukti_file_id: string | null;
  bukti_url: string | null;
  bukti_files: BuktiFile[] | null;
  bukti_note: string | null;
  bukti_uploaded_at: string | null;
  verified_at: string | null;
}

export interface PelanggaranResponse {
  rows: PelanggaranData[];
  tahap: TahapHukuman[];
  totalPoin: number;
}
