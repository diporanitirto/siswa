'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import UploadBukti from './UploadBukti';
import { formatDate, formatDateTime, infoBukti } from '@/lib/bukti';
import type { PelanggaranData, PelanggaranResponse, SiswaData } from '@/lib/types';

function KartuSesiHilang() {
  return (
    <div className="mx-auto max-w-md py-10">
      <div className="rounded-2xl border border-scoutBrown-200 bg-white p-6 text-center">
        <h1 className="text-lg font-bold text-scoutBrown-900">Sesi tidak ditemukan</h1>
        <p className="mt-2 text-sm text-scoutBrown-600">
          Masuk dengan NIS dulu supaya kami bisa menampilkan tugasmu.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-scoutBrown-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scoutBrown-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scoutBrown-500 focus-visible:ring-offset-2"
        >
          Masuk dengan NIS
        </Link>
      </div>
    </div>
  );
}

function KartuTugasHilang() {
  return (
    <div className="mx-auto max-w-md py-10">
      <div className="rounded-2xl border border-scoutBrown-200 bg-white p-6 text-center">
        <h1 className="text-lg font-bold text-scoutBrown-900">Tugas tidak ditemukan</h1>
        <p className="mt-2 text-sm text-scoutBrown-600">
          Tugas ini tidak ada di daftar pelanggaran NIS kamu. Mungkin tautannya sudah tidak berlaku.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-scoutBrown-200 bg-scoutKhaki-50 px-4 py-2.5 text-sm font-semibold text-scoutBrown-700 transition-colors hover:bg-scoutKhaki-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scoutBrown-500 focus-visible:ring-offset-2"
        >
          Kembali ke dashboard
        </Link>
      </div>
    </div>
  );
}

function KartuGagal({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-md py-10">
      <div className="rounded-2xl border border-scoutRed-200 bg-white p-6 text-center">
        <h1 className="text-lg font-bold text-scoutBrown-900">Gagal memuat tugas</h1>
        <p className="mt-2 text-sm text-scoutRed-700">{message}</p>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-scoutBrown-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scoutBrown-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scoutBrown-500 focus-visible:ring-offset-2"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-scoutBrown-200 bg-scoutKhaki-50 px-4 py-2.5 text-sm font-semibold text-scoutBrown-700 transition-colors hover:bg-scoutKhaki-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scoutBrown-500 focus-visible:ring-offset-2"
          >
            Kembali ke dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function KartuMemuat() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Memuat tugas...</span>
      <div className="h-5 w-36 animate-pulse rounded bg-scoutBrown-100" />
      <div className="h-40 animate-pulse rounded-2xl border border-scoutBrown-200 bg-white" />
      <div className="h-56 animate-pulse rounded-2xl border border-scoutBrown-200 bg-white" />
    </div>
  );
}

export default function HalamanTugas() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [sessionChecked, setSessionChecked] = useState(false);
  const [nis, setNis] = useState('');
  const [siswa, setSiswa] = useState<SiswaData | null>(null);
  const [rows, setRows] = useState<PelanggaranData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedNis = sessionStorage.getItem('nis') ?? '';
    const storedSiswa = sessionStorage.getItem('siswaData');
    let parsedSiswa: SiswaData | null = null;

    if (storedSiswa) {
      try {
        const parsed = JSON.parse(storedSiswa) as SiswaData;
        if (typeof parsed.nama === 'string' && parsed.kelas && typeof parsed.absen === 'number') {
          parsedSiswa = parsed;
        }
      } catch {
        parsedSiswa = null;
      }
    }

    setNis(storedNis);
    setSiswa(parsedSiswa);
    setSessionChecked(true);
  }, []);

  const load = useCallback(async () => {
    if (!nis) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/pelanggaran?nis=${encodeURIComponent(nis)}`);
      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        throw new Error(result?.error ?? 'Gagal memuat data tugas.');
      }

      const data = result.data as PelanggaranResponse;
      setRows(data.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data tugas.');
    } finally {
      setLoading(false);
    }
  }, [nis]);

  useEffect(() => {
    if (sessionChecked) load();
  }, [sessionChecked, load]);

  const handleUploaded = (updated: PelanggaranData) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === updated.id
          ? {
              ...row,
              bukti_status: updated.bukti_status,
              bukti_url: updated.bukti_url,
              bukti_note: updated.bukti_note,
              bukti_uploaded_at: updated.bukti_uploaded_at,
            }
          : row
      )
    );
  };

  if (!sessionChecked) return <KartuMemuat />;
  if (!nis) return <KartuSesiHilang />;
  if (loading) return <KartuMemuat />;
  if (error) return <KartuGagal message={error} onRetry={load} />;

  const tugas = rows.find((row) => row.id === id) ?? null;
  if (!tugas) return <KartuTugasHilang />;

  const status = infoBukti(tugas);
  const perluKirim = tugas.perlu_bukti && tugas.bukti_status !== 'menunggu' && tugas.bukti_status !== 'selesai';

  return (
    <div className="space-y-4 animate-fade-in">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-scoutBrown-600 transition-colors hover:text-scoutBrown-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scoutBrown-500 focus-visible:ring-offset-2"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali ke dashboard
      </Link>

      {siswa && (
        <div className="rounded-xl border border-scoutBrown-200 bg-white px-4 py-3">
          <p className="truncate text-sm font-bold text-scoutBrown-900">{siswa.nama}</p>
          <p className="text-xs text-scoutBrown-600">
            {siswa.kelas} • Absen {siswa.absen} • NIS {siswa.nis}
          </p>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-scoutBrown-200 bg-white">
        <div className="bg-scoutBrown-700 px-5 py-5 text-white">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/85">
            Tugas Hukuman
          </p>
          <h1 className="mt-1.5 text-2xl font-bold leading-snug">
            {tugas.hukuman || 'Tugas hukuman'}
          </h1>
          <p className="mt-2 text-sm text-white/85">
            {tugas.jenis_nama || 'Pelanggaran'} • {formatDate(tugas.tanggal)}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-scoutBrown-100 px-5 py-4">
          <div>
            <p className="text-xs text-scoutBrown-600">Poin pelanggaran</p>
            <p className="mt-0.5 text-sm font-semibold text-scoutRed-700">+{tugas.poin} poin</p>
          </div>
          <div>
            <p className="text-xs text-scoutBrown-600">Total poin saat itu</p>
            <p className="mt-0.5 text-sm font-semibold text-scoutBrown-800">{tugas.total_poin ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-scoutBrown-600">Status tugas</p>
            <span
              className={`mt-0.5 inline-block rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold ${status.className}`}
            >
              {status.label}
            </span>
          </div>
        </div>
      </section>

      {tugas.keterangan && (
        <section className="rounded-xl border border-scoutBrown-200 bg-white p-5">
          <h2 className="text-base font-bold text-scoutBrown-900">Catatan</h2>
          <p className="mt-1 text-sm text-scoutBrown-700">{tugas.keterangan}</p>
        </section>
      )}

      {!tugas.perlu_bukti && (
        <section className="rounded-xl border border-scoutBrown-200 bg-scoutKhaki-50 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-scoutKhaki-200 text-scoutBrown-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-bold text-scoutBrown-900">Tidak perlu kirim tugas</h2>
              <p className="mt-1 text-sm text-scoutBrown-700">
                Catatan ini masuk tahap peringatan, jadi tidak ada bukti hukuman yang harus diunggah.
              </p>
            </div>
          </div>
        </section>
      )}

      {tugas.perlu_bukti && tugas.bukti_status === 'menunggu' && (
        <section className="rounded-xl border border-scoutKhaki-300 bg-scoutKhaki-50 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-scoutKhaki-200 text-scoutBrown-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-scoutBrown-900">Bukti sudah dikirim</h2>
              <p className="mt-1 text-sm text-scoutBrown-700">
                {tugas.bukti_uploaded_at
                  ? `Dikirim ${formatDateTime(tugas.bukti_uploaded_at)}. `
                  : ''}
                Tunggu pembina atau petugas memeriksa buktimu. Kamu tidak perlu mengirim ulang.
              </p>
            </div>
          </div>
          {tugas.bukti_url && (
            <a
              href={tugas.bukti_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-scoutBrown-200 bg-white px-4 py-2.5 text-sm font-semibold text-scoutBrown-700 transition-colors hover:bg-scoutKhaki-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scoutBrown-500 focus-visible:ring-offset-2 sm:w-auto"
            >
              Lihat bukti yang dikirim
            </a>
          )}
        </section>
      )}

      {tugas.perlu_bukti && tugas.bukti_status === 'selesai' && (
        <section className="rounded-xl border border-scoutGreen-300 bg-scoutGreen-50 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-scoutGreen-100 text-scoutGreen-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-scoutBrown-900">Tugas selesai</h2>
              <p className="mt-1 text-sm text-scoutBrown-700">
                Bukti sudah diverifikasi
                {tugas.verified_at ? ` pada ${formatDate(tugas.verified_at)}` : ''}. Tidak ada yang
                perlu kamu kirim lagi.
              </p>
            </div>
          </div>
          {tugas.bukti_url && (
            <a
              href={tugas.bukti_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-scoutBrown-200 bg-white px-4 py-2.5 text-sm font-semibold text-scoutBrown-700 transition-colors hover:bg-scoutKhaki-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scoutBrown-500 focus-visible:ring-offset-2 sm:w-auto"
            >
              Lihat bukti yang dikirim
            </a>
          )}
        </section>
      )}

      {perluKirim && (
        <section className="overflow-hidden rounded-xl border border-scoutBrown-200 bg-white">
          <div className="border-b border-scoutBrown-200 bg-scoutKhaki-50 px-5 py-4">
            <h2 className="text-base font-bold text-scoutBrown-900">Kirim bukti tugas</h2>
            <p className="mt-1 text-sm text-scoutBrown-600">
              Unggah satu foto sebagai bukti bahwa kamu sudah menjalankan tugas ini.
            </p>
          </div>

          <div className="space-y-4 p-5">
            {tugas.bukti_status === 'ditolak' && (
              <div className="rounded-lg border border-scoutRed-200 bg-scoutRed-50 p-3.5" role="alert">
                <p className="text-sm font-semibold text-scoutRed-700">Bukti sebelumnya ditolak</p>
                <p className="mt-1 text-sm text-scoutRed-700">
                  {tugas.bukti_note || 'Silakan unggah ulang bukti tugasmu.'}
                </p>
                {tugas.bukti_url && (
                  <a
                    href={tugas.bukti_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-scoutRed-700 underline underline-offset-2 hover:text-scoutRed-800"
                  >
                    Lihat bukti sebelumnya
                  </a>
                )}
              </div>
            )}

            <ul className="space-y-1.5 text-sm text-scoutBrown-700">
              <li className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>Setelah terkirim, bukti diperiksa pembina atau petugas.</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>Kalau ditolak, alasannya muncul di halaman ini.</span>
              </li>
            </ul>

            <UploadBukti pelanggaranId={tugas.id} nis={nis} onUploaded={handleUploaded} />
          </div>
        </section>
      )}

      <div className="rounded-xl border border-scoutBrown-200 bg-scoutKhaki-50 px-4 py-3">
        <p className="text-xs text-scoutBrown-600">
          Ada kendala saat mengirim bukti? Hubungi pembina atau petugas.
        </p>
      </div>
    </div>
  );
}
