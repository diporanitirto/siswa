'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDate, formatTime, infoBukti, statusInfo } from '@/lib/bukti';
import type { PelanggaranData, PelanggaranResponse, SiswaData, TahapHukuman } from '@/lib/types';

interface DashboardSiswaProps {
  nis: string;
  siswa: SiswaData;
  onLogout: () => void;
}

export default function DashboardSiswa({ nis, siswa, onLogout }: DashboardSiswaProps) {
  const [rows, setRows] = useState<PelanggaranData[]>([]);
  const [tahap, setTahap] = useState<TahapHukuman[]>([]);
  const [totalPoin, setTotalPoin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pelanggaran?nis=${encodeURIComponent(nis)}`);
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) {
        throw new Error(result?.error ?? 'Gagal memuat data pelanggaran.');
      }
      const data = result.data as PelanggaranResponse;
      setRows(data.rows ?? []);
      setTahap(data.tahap ?? []);
      setTotalPoin(data.totalPoin ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data pelanggaran.');
    } finally {
      setLoading(false);
    }
  }, [nis]);

  useEffect(() => {
    load();
  }, [load]);

  const tahapUrut = useMemo(() => [...tahap].sort((a, b) => a.min_poin - b.min_poin), [tahap]);

  const tahapAktif = useMemo(() => {
    let aktif: TahapHukuman | null = null;
    for (const t of tahapUrut) {
      if (totalPoin >= t.min_poin) aktif = t;
    }
    return aktif;
  }, [tahapUrut, totalPoin]);

  const tahapBerikut = useMemo(
    () => tahapUrut.find((t) => t.min_poin > totalPoin) ?? null,
    [tahapUrut, totalPoin]
  );

  const progress = tahapBerikut
    ? Math.min(100, Math.round((totalPoin / tahapBerikut.min_poin) * 100))
    : 100;

  // Hukuman yang belum tuntas (perlu upload / menunggu verifikasi / ditolak).
  const hukumanBelumSelesai = rows.filter(
    (r) => r.perlu_bukti && r.bukti_status !== 'selesai'
  );
  // Masih ada hukuman yang harus dijalani/upload buktinya? Kartu jadi merah.
  const adaHukuman = hukumanBelumSelesai.length > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Info siswa */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-scoutBrown-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-scoutBrown-900">{siswa.nama}</p>
          <p className="text-xs text-scoutBrown-600">
            {siswa.kelas} • Absen {siswa.absen} • NIS {siswa.nis}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 rounded-lg border border-scoutBrown-200 bg-scoutKhaki-50 px-3 py-1.5 text-xs font-medium text-scoutBrown-600 transition-colors hover:bg-scoutKhaki-100"
        >
          Ganti NIS
        </button>
      </div>

      {/* Kartu poin */}
      <div
        className={`overflow-hidden rounded-2xl border bg-white ${
          adaHukuman ? 'border-scoutRed-200' : 'border-scoutBrown-200'
        }`}
      >
        <div className={`px-5 py-5 text-white ${adaHukuman ? 'bg-scoutRed-700' : 'bg-scoutBrown-700'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/85">
                Total Poin Pelanggaran
              </p>
              <p className="mt-1.5 text-4xl font-bold leading-none tracking-tight">{totalPoin}</p>
            </div>
            <div className="min-w-0 max-w-[11rem] text-right">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/85">
                Hukuman Berlaku
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-snug">
                {tahapAktif ? tahapAktif.hukuman : 'Belum ada'}
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-white/15 pt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white/90 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-medium text-white/85">
              {totalPoin === 0
                ? 'Belum ada poin. Semoga tetap kosong.'
                : tahapBerikut
                  ? `${totalPoin} / ${tahapBerikut.min_poin} poin menuju tahap hukuman berikutnya`
                  : 'Ini tahap hukuman terakhir.'}
            </p>
          </div>
        </div>

        {adaHukuman && (
          <div id="tugas" className="border-t border-scoutRed-200 bg-scoutRed-50 px-5 py-4">
            <p className="text-xs font-semibold text-scoutRed-700">
              Ada <span className="font-bold">{hukumanBelumSelesai.length}</span> hukuman yang belum
              selesai. Buka halaman tugas untuk melihat rincian dan mengirim bukti.
            </p>

            <div className="mt-3 space-y-3">
              {hukumanBelumSelesai.map((p) => {
                const status = statusInfo[p.bukti_status];
                const sudahKirim = p.bukti_status === 'menunggu';

                return (
                  <div key={p.id} className="rounded-lg border border-scoutRed-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug text-scoutBrown-900">
                          {p.hukuman || 'Tugas hukuman'}
                        </p>
                        <p className="mt-0.5 text-xs text-scoutBrown-600">
                          {p.jenis_nama || 'Pelanggaran'} • {formatDate(p.tanggal)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {sudahKirim ? (
                      <p className="mt-2.5 text-xs text-scoutBrown-600">
                        Bukti sudah dikirim. Tunggu verifikasi pembina atau petugas.
                      </p>
                    ) : (
                      p.bukti_status === 'ditolak' &&
                      p.bukti_note && (
                        <div className="mt-2.5 rounded-lg border border-scoutRed-200 bg-scoutRed-50 p-2.5">
                          <p className="text-xs text-scoutRed-700">
                            <span className="font-semibold">Alasan ditolak:</span> {p.bukti_note}
                          </p>
                        </div>
                      )
                    )}

                    <Link
                      href={`/tugas/${p.id}`}
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-scoutBrown-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scoutBrown-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scoutBrown-500 focus-visible:ring-offset-2"
                    >
                      {sudahKirim ? 'Lihat status tugas' : 'Buka halaman tugas'}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Riwayat pelanggaran */}
      <div className="overflow-hidden rounded-xl border border-scoutBrown-200 bg-white">
        <div className="flex items-center justify-between border-b border-scoutBrown-200 bg-scoutKhaki-50 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-scoutBrown-900">Riwayat Pelanggaran</h2>
            <p className="mt-0.5 text-xs text-scoutBrown-600">
              {rows.length > 0 ? `${rows.length} catatan` : 'Belum ada catatan'}
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-scoutBrown-200 bg-white px-3 py-1.5 text-xs font-medium text-scoutBrown-600 transition-colors hover:bg-scoutKhaki-50 disabled:opacity-50"
          >
            <span className={loading ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
            <span className="ml-1.5">Refresh</span>
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-scoutBrown-600">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-scoutBrown-200 border-t-scoutBrown-600" />
              Memuat riwayat...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-scoutRed-200 bg-scoutRed-50 p-3">
              <p className="text-sm text-scoutRed-700">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-scoutGreen-100">
                <svg className="h-7 w-7 text-scoutGreen-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-scoutBrown-800">Tidak Ada Pelanggaran</p>
              <p className="mt-1 text-xs text-scoutBrown-600">Terus jaga disiplinmu sampai akhir tahun.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((p) => {
                const expanded = expandedId === p.id;
                const status = infoBukti(p);
                return (
                  <div key={p.id} className="overflow-hidden rounded-lg border border-scoutBrown-200">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-scoutKhaki-50"
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                      aria-expanded={expanded}
                    >
                      <span className="shrink-0 rounded-md bg-scoutRed-100 px-2 py-0.5 text-xs font-bold text-scoutRed-700">
                        +{p.poin} poin
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-scoutBrown-900">
                          {p.jenis_nama || 'Pelanggaran'}
                        </p>
                        <p className="text-xs text-scoutBrown-600">
                          {formatDate(p.tanggal)} • {formatTime(p.created_at)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                      <span className={`shrink-0 text-xs text-scoutBrown-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {p.perlu_bukti && (
                      <Link
                        href={`/tugas/${p.id}`}
                        className="flex min-h-9 w-full items-center justify-center border-t border-scoutBrown-200 bg-scoutBrown-700 px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-scoutBrown-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scoutBrown-500 focus-visible:ring-offset-2"
                      >
                        Buka halaman tugas
                      </Link>
                    )}

                    {expanded && (
                      <div className="space-y-3 border-t border-scoutBrown-100 bg-scoutKhaki-50 p-4">
                        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                          <div>
                            <p className="text-scoutBrown-600">Poin</p>
                            <p className="font-medium text-scoutBrown-800">+{p.poin}</p>
                          </div>
                          <div>
                            <p className="text-scoutBrown-600">Total poin saat itu</p>
                            <p className="font-medium text-scoutBrown-800">{p.total_poin ?? '-'}</p>
                          </div>
                          <div>
                            <p className="text-scoutBrown-600">Status bukti</p>
                            <span className={`mt-0.5 inline-block rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold ${status.className}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="col-span-2 sm:col-span-3">
                            <p className="text-scoutBrown-600">Hukuman saat itu</p>
                            <p className="font-medium text-scoutBrown-800">{p.hukuman || 'Tidak ada hukuman'}</p>
                          </div>
                          {p.keterangan && (
                            <div className="col-span-2 sm:col-span-3">
                              <p className="text-scoutBrown-600">Keterangan</p>
                              <p className="mt-1 rounded-lg border border-scoutBrown-100 bg-white p-2.5 text-scoutBrown-800">
                                {p.keterangan}
                              </p>
                            </div>
                          )}
                        </div>

                        {p.bukti_status === 'selesai' && p.verified_at && (
                          <div className="rounded-lg border border-scoutGreen-200 bg-scoutGreen-50 p-2.5">
                            <p className="text-xs text-scoutGreen-700">
                              Hukuman selesai diverifikasi pada {formatDate(p.verified_at)}.
                            </p>
                          </div>
                        )}

                        {p.bukti_url && (
                          <a
                            href={p.bukti_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full rounded-lg border border-scoutBrown-200 bg-white px-3 py-2 text-center text-xs font-medium text-scoutBrown-700 transition-colors hover:bg-scoutKhaki-50"
                          >
                            Lihat Bukti di Google Drive
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
