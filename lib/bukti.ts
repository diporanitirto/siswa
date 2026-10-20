import type { BuktiStatus, PelanggaranData } from './types';

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
