'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { SiswaData } from '@/lib/types';

interface NISModalProps {
  isOpen: boolean;
  onSubmit: (nis: string, siswaData: SiswaData) => void;
}

export default function NISModal({ isOpen, onSubmit }: NISModalProps) {
  const [nis, setNis] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNis('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nis.length < 4) {
      setError('NIS minimal 4 digit');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/siswa?nis=${encodeURIComponent(nis)}`);
      const result = await res.json().catch(() => null);

      if (res.ok && result?.success) {
        onSubmit(nis, result.data as SiswaData);
      } else if (res.status === 404) {
        setError('NIS tidak ditemukan dalam database. Periksa kembali NIS Anda.');
      } else {
        setError('Gagal memuat data siswa. Silakan coba lagi.');
      }
    } catch {
      setError('Gagal memuat data siswa. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-scoutKhaki-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full border border-scoutBrown-200">
        <div className="p-8">
          <div className="text-center mb-6">
            <Image
              src="/assets/logo-diporani.png"
              alt="Logo Diporani"
              width={48}
              height={48}
              className="object-contain mx-auto mb-4"
              priority
            />

            <h2 className="text-xl font-bold text-scoutBrown-900 mb-1">
              Selamat Datang
            </h2>
            <p className="text-sm text-scoutBrown-500">
              Masukkan NIS untuk melihat poin & hukuman
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label
                htmlFor="nis"
                className="block text-sm font-semibold text-scoutBrown-800 mb-2"
              >
                Nomor Induk Siswa
              </label>
              <input
                id="nis"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={nis}
                onChange={(e) => {
                  setNis(e.target.value.replace(/\D/g, ''));
                  setError(null);
                }}
                placeholder="Contoh: 11892"
                className="w-full px-4 py-3 border border-scoutBrown-300 rounded-lg bg-white text-scoutBrown-900 text-sm focus:outline-none focus:border-scoutBrown-500 focus:ring-2 focus:ring-scoutBrown-500/20 transition-all"
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-scoutRed-50 border border-scoutRed-200 rounded-lg">
                <p className="text-sm text-scoutRed-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-scoutBrown-700 text-white rounded-lg font-semibold text-sm cursor-pointer hover:bg-scoutBrown-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                  Memeriksa...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
