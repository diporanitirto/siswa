'use client';

import { useRef, useState } from 'react';
import type { PelanggaranData } from '@/lib/types';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

interface UploadBuktiProps {
  pelanggaranId: string;
  nis: string;
  onUploaded: (updated: PelanggaranData) => void;
}

/** Kompres foto di HP sebelum dikirim (maks 1600px, JPEG ~0.8) supaya ringan & aman batas ukuran. */
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar.');
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  );
  if (!blob) throw new Error('Gagal mengompres gambar.');

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'bukti';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

export default function UploadBukti({ pelanggaranId, nis, onUploaded }: UploadBuktiProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (!picked.type.startsWith('image/')) {
      setError('Pilih file foto (JPG/PNG).');
      resetPreview();
      return;
    }
    if (picked.size > 15 * 1024 * 1024) {
      setError('Foto terlalu besar. Maksimal 15 MB sebelum dikompres.');
      resetPreview();
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
  };

  const handleUpload = async () => {
    if (!file || isUploading) return;
    setError(null);
    setIsUploading(true);

    try {
      // Kompres di HP; kalau browser tidak bisa (mis. format HEIC), kirim apa adanya.
      let prepared = file;
      try {
        prepared = await compressImage(file);
      } catch {
        prepared = file;
      }

      const form = new FormData();
      form.append('file', prepared);
      form.append('pelanggaran_id', pelanggaranId);
      form.append('nis', nis);

      const res = await fetch('/api/bukti', { method: 'POST', body: form });
      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        throw new Error(result?.error ?? 'Gagal mengunggah bukti.');
      }

      resetPreview();
      setSuccess(true);
      onUploaded(result.data as PelanggaranData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah bukti.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-lg border border-scoutBrown-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-scoutBrown-800">
        Unggah bukti hukuman
      </p>

      {success && !file && (
        <div className="mb-2 rounded-lg border border-scoutGreen-300 bg-scoutGreen-50 p-2.5" role="status">
          <p className="text-xs text-scoutGreen-700">
            Bukti sudah diunggah. Tunggu verifikasi pembina/petugas.
          </p>
        </div>
      )}

      {previewUrl ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Pratinjau bukti"
            className="max-h-56 w-full rounded-lg border border-scoutBrown-200 object-contain bg-scoutKhaki-50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="min-h-11 flex-1 rounded-lg bg-scoutGreen-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scoutGreen-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? 'Mengunggah...' : 'Unggah Bukti'}
            </button>
            <button
              type="button"
              onClick={resetPreview}
              disabled={isUploading}
              className="min-h-11 rounded-lg border border-scoutBrown-200 bg-scoutBrown-50 px-4 py-2.5 text-sm font-medium text-scoutBrown-600 transition-colors hover:bg-scoutBrown-100 disabled:opacity-60"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            id={`bukti-file-${pelanggaranId}`}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="sr-only"
          />
          <label
            htmlFor={`bukti-file-${pelanggaranId}`}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-scoutBrown-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scoutBrown-800 focus-within:ring-2 focus-within:ring-scoutBrown-500 focus-within:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Pilih Foto dari Galeri / Kamera
          </label>
          <p className="mt-2 text-xs text-scoutBrown-600">
            Foto dikompres otomatis. Ukuran akhir maks. 8 MB.
          </p>
        </>
      )}

      {isUploading && (
        <div className="mt-2 flex items-center gap-2 text-xs text-scoutBrown-600" role="status">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-scoutBrown-200 border-t-scoutBrown-600" />
          Mengunggah ke Google Drive...
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-lg border border-scoutRed-200 bg-scoutRed-50 p-2.5" role="alert">
          <p className="text-xs text-scoutRed-700">{error}</p>
        </div>
      )}
    </div>
  );
}
