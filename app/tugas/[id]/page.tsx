import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HalamanTugas from '@/components/HalamanTugas';

export const metadata: Metadata = {
  title: 'Kirim Tugas | DIPORANI',
  description: 'Halaman pengiriman bukti tugas hukuman siswa Ambalan Diporani.',
};

export default function TugasPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <HalamanTugas />
      </main>
      <Footer />
    </div>
  );
}
