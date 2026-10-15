'use client';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-scoutKhaki-50 to-scoutBrown-100">
      <div className="text-center animate-scale-in">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-scoutBrown-200 border-t-scoutBrown-700" />
        <p className="mt-4 text-sm font-semibold text-scoutBrown-800">Memuat data...</p>
      </div>
    </div>
  );
}
