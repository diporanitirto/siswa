import type { BuktiFile, BuktiStatus, PelanggaranData } from './types';

/** Batas jumlah foto bukti per tugas. Dipakai juga oleh API upload. */
export const MAX_BUKTI_PHOTOS = 5;

/** Hanya satu link video Google Drive per pengiriman. */
export const MAX_BUKTI_VIDEOS = 1;

export const statusInfo: Record<BuktiStatus, { label: string; className: string }> = {
  belum: { label: 'Belum unggah', className: 'border-scoutKhaki-300 bg-scoutKhaki-100 text-scoutBrown-800' },
  menunggu: {
    label: 'Menunggu verifikasi',
    className: 'border-scoutKhaki-500 bg-scoutKhaki-200 text-scoutBrown-800',
  },
  selesai: {
    label: 'Selesai',
    className: 'border-scoutGreen-300 bg-scoutGreen-100 text-scoutGreen-700',
  },
  ditolak: {
    label: 'Ditolak',
    className: 'border-scoutRed-300 bg-scoutRed-100 text-scoutRed-700',
  },
};

export interface BuktiDriveUpload {
  fileId: string;
  url: string;
  folder?: { id: string; url: string };
}

export interface BuktiTersusun {
  files: BuktiFile[];
  legacy: BuktiFile | null;
}

/** Beberapa foto disimpan sebagai satu link folder; satu foto tetap link file. */
export function susunBuktiFiles(
  uploads: BuktiDriveUpload[],
  video: BuktiFile | null
): BuktiTersusun {
  const photos: BuktiFile[] = uploads.map((item) => ({
    file_id: item.fileId,
    url: item.url,
    kind: 'image',
  }));
  const folder = uploads[0]?.folder;
  const files: BuktiFile[] =
    photos.length > 1 && folder
      ? [{ file_id: folder.id, url: folder.url, kind: 'folder', count: photos.length }]
      : photos;

  if (video) files.push({ ...video, kind: 'video' });

  return { files, legacy: photos[0] ?? video ?? null };
}

/** Daftar foto bukti, dengan fallback ke kolom lama (satu foto). */
export function daftarBukti(
  p: Pick<PelanggaranData, 'bukti_files' | 'bukti_file_id' | 'bukti_url'>
): BuktiFile[] {
  const files = (p.bukti_files ?? []).filter((file) => Boolean(file?.url));
  if (files.length > 0) return files;
  if (p.bukti_url) return [{ file_id: p.bukti_file_id ?? '', url: p.bukti_url }];
  return [];
}

export function infoBukti(p: PelanggaranData) {
  if (!p.perlu_bukti) {
    return {
      label: 'Peringatan',
      className: 'border-scoutBrown-200 bg-scoutBrown-50 text-scoutBrown-600',
    };
  }
  return statusInfo[p.bukti_status];
}

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(d: string) {
  return `${formatDate(d)} pukul ${formatTime(d)}`;
}
