'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NISModal from '@/components/NISModal';
import DashboardSiswa from '@/components/DashboardSiswa';
import Loading from '@/components/Loading';
import type { SiswaData } from '@/lib/types';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [showNISModal, setShowNISModal] = useState(false);
  const [nis, setNis] = useState('');
  const [siswaData, setSiswaData] = useState<SiswaData | null>(null);

  useEffect(() => {
    const storedNis = sessionStorage.getItem('nis');
    const storedSiswaData = sessionStorage.getItem('siswaData');

    if (storedNis && storedSiswaData) {
      try {
        const parsed = JSON.parse(storedSiswaData) as SiswaData;
        if (typeof parsed.nama !== 'string' || !parsed.kelas || typeof parsed.absen !== 'number') {
          throw new Error('format lama');
        }
        setNis(storedNis);
        setSiswaData(parsed);
      } catch {
        sessionStorage.removeItem('nis');
        sessionStorage.removeItem('siswaData');
        setShowNISModal(true);
      }
    } else {
      setShowNISModal(true);
    }

    setIsLoading(false);
  }, []);

  const handleNISSubmit = (submittedNis: string, data: SiswaData) => {
    setNis(submittedNis);
    setSiswaData(data);
    setShowNISModal(false);
    sessionStorage.setItem('nis', submittedNis);
    sessionStorage.setItem('siswaData', JSON.stringify(data));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('nis');
    sessionStorage.removeItem('siswaData');
    setNis('');
    setSiswaData(null);
    setShowNISModal(true);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {siswaData ? (
          <DashboardSiswa nis={nis} siswa={siswaData} onLogout={handleLogout} />
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-scoutBrown-500">
              Masukkan NIS untuk melihat poin dan hukumanmu.
            </p>
          </div>
        )}
      </main>
      <Footer />
      <NISModal isOpen={showNISModal} onSubmit={handleNISSubmit} />
    </div>
  );
}
