'use client';

import { useEffect, useRef, useState } from 'react';
import { MAX_BUKTI_PHOTOS, MAX_BUKTI_VIDEOS } from '@/lib/bukti';
import { parseDriveFileLink } from '@/lib/drive-link';
import type { PelanggaranData } from '@/lib/types';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

interface PickedFile {
  file: File;
  previewUrl: string;
}

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
  const previewUrlsRef = useRef<string[]>([]);
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    previewUrlsRef.current = picked.map((item) => item.previewUrl);
  }, [picked]);

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  const resetForm = () => {
    picked.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setPicked([]);
    setVideoUrl('');
    setProgress(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    const target = picked[index];
    if (!target) return;
    URL.revokeObjectURL(target.previewUrl);
    setPicked((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMessage(null);

    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (selected.length === 0) return;

    if (picked.length + selected.length > MAX_BUKTI_PHOTOS) {
      setError(
        `Maksimal ${MAX_BUKTI_PHOTOS} foto per pengiriman. Jika foto lebih dari ${MAX_BUKTI_PHOTOS}, upload sisanya di folder Google Drive sendiri, lalu lampirkan link-nya di bagian bawah ini. Tidak perlu upload foto-foto tersebut di sini.`
      );
      return;
    }

    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        setError('File yang diunggah harus berupa foto.');
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError(`Foto "${file.name}" terlalu besar. Maksimal 15 MB sebelum dikompres.`);
        return;
      }
    }

    const added = selected.map<PickedFile>((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPicked((prev) => [...prev, ...added]);
  };

  const performUpload = async () => {
    setConfirmOpen(false);
    const rawVideoUrl = videoUrl.trim();
    if ((picked.length === 0 && !rawVideoUrl) || isUploading) return;

    const videoLink = rawVideoUrl ? parseDriveFileLink(rawVideoUrl) : null;
    if (rawVideoUrl && !videoLink) {
      setError('Link video Google Drive tidak valid. Salin link file dari menu Bagikan.');
      setSuccessMessage(null);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsUploading(true);

    try {
      const prepared: File[] = [];
      for (const [index, item] of picked.entries()) {
        setProgress(`Menyiapkan foto ${index + 1} dari ${picked.length}...`);
        // Kalau browser tidak bisa kompres (mis. HEIC), kirim apa adanya.
        try {
          prepared.push(await compressImage(item.file));
        } catch {
          prepared.push(item.file);
        }
      }

      const photoCount = prepared.length;
      setProgress(
        photoCount > 0
          ? `Mengunggah ${photoCount} foto ke Google Drive...`
          : 'Menyimpan link video...'
      );

      const form = new FormData();
      prepared.forEach((file) => form.append('file', file));
      if (videoLink) form.append('video_url', videoLink.url);
      form.append('pelanggaran_id', pelanggaranId);
      form.append('nis', nis);

      const res = await fetch('/api/bukti', { method: 'POST', body: form });
      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        throw new Error(result?.error ?? 'Gagal menyimpan bukti.');
      }

      const fotoLabel = photoCount === 1 ? '1 foto' : `${photoCount} foto`;
      const hasFolder = Array.isArray(result.data?.bukti_files)
        ? result.data.bukti_files.some((file: { kind?: string }) => file?.kind === 'folder')
        : false;
      const isFolderLink = videoLink?.kind === 'folder';
      setSuccessMessage(
        photoCount > 0 && videoLink
          ? `${fotoLabel} dan link ${isFolderLink ? 'folder' : 'video'} sudah dikirim.`
          : videoLink
            ? `Link ${isFolderLink ? 'folder' : 'video'} sudah dikirim.`
            : photoCount > 1 && hasFolder
              ? `${fotoLabel} disimpan ke satu folder Google Drive.`
              : `${fotoLabel} sudah diunggah.`
      );
      resetForm();
      onUploaded(result.data as PelanggaranData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan bukti.');
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  const hasContent = picked.length > 0 || videoUrl.trim().length > 0;
  const submitLabel =
    picked.length > 0
      ? videoUrl.trim()
        ? `Kirim ${picked.length} Foto + Link Video`
        : `Kirim ${picked.length} Foto`
      : 'Simpan Link Video';

  return (
    <div className="rounded-lg border border-scoutBrown-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-scoutBrown-800">Unggah bukti hukuman</p>

      {successMessage && !hasContent && (
        <div
          className="mb-2 rounded-lg border border-scoutGreen-300 bg-scoutGreen-50 p-2.5"
          role="status"
        >
          <p className="text-xs text-scoutGreen-700">
            {successMessage} Tunggu verifikasi pembina/petugas.
          </p>
        </div>
      )}

      {picked.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {picked.map((item, index) => (
            <div
              key={item.previewUrl}
              className="relative overflow-hidden rounded-lg border border-scoutBrown-200 bg-scoutKhaki-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={`Pratinjau foto ${index + 1}`}
                className="h-28 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={isUploading}
                aria-label={`Hapus foto ${index + 1}`}
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-scoutBrown-900/80 text-white transition-colors hover:bg-scoutBrown-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="absolute bottom-1.5 left-1.5 rounded bg-scoutBrown-900/75 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                Foto {index + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {hasContent && (
        <div className="mb-3 rounded-lg border border-scoutBrown-200 bg-scoutKhaki-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-scoutBrown-700">
            Validasi pengiriman
          </p>
          <ul className="space-y-1 text-xs text-scoutBrown-700">
            <li className="flex items-center gap-2">
              <span className={picked.length > 0 && picked.length <= MAX_BUKTI_PHOTOS ? 'text-scoutGreen-700' : 'text-scoutRed-700'}>
                {picked.length > 0 && picked.length <= MAX_BUKTI_PHOTOS ? '✓' : '✗'}
              </span>
              Foto: {picked.length} / {MAX_BUKTI_PHOTOS}
              {picked.length === 0 ? ' (tidak wajib jika ada link)' : ''}
            </li>
            <li className="flex items-center gap-2">
              {videoUrl.trim() === '' ? (
                <>
                  <span className="text-scoutBrown-500">•</span>
                  Link video/folder: tidak ada (opsional)
                </>
              ) : parseDriveFileLink(videoUrl) ? (
                <>
                  <span className="text-scoutGreen-700">✓</span>
                  Link {parseDriveFileLink(videoUrl)?.kind === 'folder' ? 'folder' : 'video'} terdeteksi
                </>
              ) : (
                <>
                  <span className="text-scoutRed-700">✗</span>
                  Link tidak valid (harus link Google Drive)
                </>
              )}
            </li>
            <li className="flex items-center gap-2">
              {picked.length === 0 && !parseDriveFileLink(videoUrl) ? (
                <>
                  <span className="text-scoutRed-700">✗</span>
                  Minimal 1 foto atau 1 link valid
                </>
              ) : (
                <>
                  <span className="text-scoutGreen-700">✓</span>
                  Siap dikirim
                </>
              )}
            </li>
          </ul>
        </div>
      )}

      {hasContent && (
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isUploading || (picked.length === 0 && !parseDriveFileLink(videoUrl))}
            className="min-h-11 flex-1 rounded-lg bg-scoutGreen-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scoutGreen-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? 'Mengirim...' : submitLabel}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={isUploading}
            className="min-h-11 rounded-lg border border-scoutBrown-200 bg-scoutBrown-50 px-4 py-2.5 text-sm font-medium text-scoutBrown-600 transition-colors hover:bg-scoutBrown-100 disabled:opacity-60"
          >
            Batal
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        id={`bukti-file-${pelanggaranId}`}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        disabled={isUploading}
        className="peer sr-only"
      />
      <label
        htmlFor={`bukti-file-${pelanggaranId}`}
        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-scoutBrown-500 peer-focus-visible:ring-offset-2 ${
          picked.length > 0
            ? 'border border-scoutBrown-200 bg-scoutKhaki-50 text-scoutBrown-700 hover:bg-scoutKhaki-100'
            : 'bg-scoutBrown-700 text-white hover:bg-scoutBrown-800'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
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
        {picked.length > 0 ? 'Tambah Foto' : 'Pilih Foto'}
      </label>

      <p className="mt-2 text-xs text-scoutBrown-600">
        Maksimal {MAX_BUKTI_PHOTOS} foto. Foto dikompres otomatis, ukuran akhir maks. 8 MB per foto.
      </p>
      <p className="mt-1 text-xs text-scoutBrown-600">
        Jika foto lebih dari {MAX_BUKTI_PHOTOS}, upload sisanya di folder Google Drive sendiri, lalu lampirkan
        link-nya di bagian bawah ini (kolom "Link video / folder Google Drive"). Tidak perlu upload foto-foto
        tersebut di sini.
      </p>

      <div className="mt-4 rounded-lg border border-scoutBrown-200 bg-scoutKhaki-50 p-3">
        <label
          htmlFor={`bukti-video-${pelanggaranId}`}
          className="block text-sm font-semibold text-scoutBrown-800"
        >
          Link video / folder Google Drive (opsional)
        </label>
        <p id={`bukti-video-help-${pelanggaranId}`} className="mt-0.5 text-xs text-scoutBrown-600">
          Upload video atau folder foto ke Drive dulu, lalu tempel link file/folder-nya di sini. Link folder
          dipakai kalau foto lebih dari {MAX_BUKTI_PHOTOS}.
        </p>
        <input
          id={`bukti-video-${pelanggaranId}`}
          type="url"
          inputMode="url"
          value={videoUrl}
          onChange={(e) => {
            setVideoUrl(e.target.value);
            setError(null);
            setSuccessMessage(null);
          }}
          disabled={isUploading}
          aria-describedby={`bukti-video-help-${pelanggaranId}`}
          placeholder="https://drive.google.com/file/d/..."
          className="mt-2 w-full rounded-lg border border-scoutBrown-200 bg-white px-3 py-2.5 text-sm text-scoutBrown-800 placeholder:text-scoutBrown-400 focus:border-scoutBrown-500 focus:outline-none focus:ring-2 focus:ring-scoutBrown-200 disabled:opacity-60"
        />
        <p className="mt-1.5 text-xs text-scoutBrown-600">
          Atur akses file: Bagikan → Siapa saja yang memiliki link. Maksimal {MAX_BUKTI_VIDEOS}{' '}
          link video.
        </p>
        {parseDriveFileLink(videoUrl)?.kind === 'folder' ? (
          <p className="mt-1.5 text-xs font-medium text-scoutGreen-700">Link folder terdeteksi.</p>
        ) : parseDriveFileLink(videoUrl) ? (
          <p className="mt-1.5 text-xs font-medium text-scoutGreen-700">Link video terdeteksi.</p>
        ) : null}
      </div>

      {progress && (
        <div className="mt-2 flex items-center gap-2 text-xs text-scoutBrown-600" role="status">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-scoutBrown-200 border-t-scoutBrown-600" />
          {progress}
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-lg border border-scoutRed-200 bg-scoutRed-50 p-2.5" role="alert">
          <p className="text-xs text-scoutRed-700">{error}</p>
        </div>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-scoutBrown-900/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-scoutBrown-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-scoutBrown-900">Konfirmasi pengiriman bukti</h3>
            <p className="mt-1 text-xs text-scoutBrown-600">
              Periksa kembali data yang akan dikirim. Setelah dikirim, tunggu verifikasi pembina/petugas.
            </p>

            <div className="mt-3 rounded-lg border border-scoutBrown-200 bg-scoutKhaki-50 p-3">
              <ul className="space-y-1.5 text-sm text-scoutBrown-800">
                <li className="flex justify-between gap-3">
                  <span className="text-scoutBrown-600">Foto</span>
                  <span className="font-semibold">{picked.length} foto</span>
                </li>
                {picked.length > 0 && (
                  <li className="text-xs text-scoutBrown-600">
                    {picked.map((_, i) => `Foto ${i + 1}`).join(', ')}
                  </li>
                )}
                <li className="flex justify-between gap-3">
                  <span className="text-scoutBrown-600">Link</span>
                  <span className="font-semibold">
                    {videoUrl.trim()
                      ? parseDriveFileLink(videoUrl)?.kind === 'folder'
                        ? 'Folder Google Drive'
                        : 'Video Google Drive'
                      : 'Tidak ada'}
                  </span>
                </li>
                {videoUrl.trim() && (
                  <li className="break-all text-xs text-scoutBrown-600">{videoUrl.trim()}</li>
                )}
                <li className="flex justify-between gap-3 border-t border-scoutBrown-200 pt-2">
                  <span className="text-scoutBrown-600">Total</span>
                  <span className="font-semibold">
                    {picked.length} foto{videoUrl.trim() ? ' + 1 link' : ''}
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="min-h-11 flex-1 rounded-lg border border-scoutBrown-200 bg-scoutBrown-50 px-4 py-2.5 text-sm font-medium text-scoutBrown-600 transition-colors hover:bg-scoutBrown-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={performUpload}
                className="min-h-11 flex-1 rounded-lg bg-scoutGreen-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scoutGreen-800"
              >
                Ya, kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
