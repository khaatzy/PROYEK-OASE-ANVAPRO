// @ts-nocheck
/* eslint-disable */
/**
 * ==============================================================================
 * DAFTAR KONSELOR & AKUN OASE CERITA (counselors.js)
 * ==============================================================================
 * 
 * PANDUAN UNTUK ANDA:
 * Anda dapat dengan sangat mudah mengedit, menghapus, atau menambahkan akun konselor
 * baru di bawah ini.
 * 
 * Format data setiap konselor:
 * - id          : Kode unik konselor (contoh: 'counselor-1', 'counselor-2', dst)
 * - name        : Nama lengkap beserta gelar
 * - role        : Jabatan atau bidang keahlian
 * - email       : Email login khusus konselor
 * - password    : Password login konselor (dapat Anda ubah kapan saja)
 * - avatar      : URL tautan foto profil (bisa URL gambar online atau file lokal di folder proyek)
 * - specialties : Daftar keahlian / fokus masalah dalam bentuk array teks
 * - status      : Status ketersediaan (contoh: 'Siap Mendengarkan', 'Tersedia', 'Aktif')
 * 
 * ==============================================================================
 */

(function () {
  const COUNSELORS_DATA = [
    {
      id: 'auto',
      name: 'Pilihkan Otomatis',
      role: 'Sistem OASE akan meneruskan ke konselor pertama yang siap',
      email: '',
      password: '',
      avatar: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=200&h=200&q=80',
      specialties: ['Semua Kategori', 'Respon Cepat'],
      status: 'Tersedia',
      rating: 5.0,
      total_reviews: 10
    },
    {
      id: 'counselor-1',
      name: 'Kak Sarah Maulida, S.Psi.',
      role: 'Psikolog & Konselor Remaja',
      email: 'sarah@oase.id',
      password: 'konselor123',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80',
      specialties: ['Kesehatan Mental', 'Akademik & Pembelajaran'],
      status: 'Siap Mendengarkan',
      rating: 4.9,
      total_reviews: 18
    },
    {
      id: 'counselor-2',
      name: 'Kak Dimas Pratama, M.Psi.',
      role: 'Konselor Hubungan & Keluarga',
      email: 'dimas@oase.id',
      password: 'konselor123',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
      specialties: ['Masalah Keluarga', 'Pertemanan & Sosial'],
      status: 'Siap Mendengarkan',
      rating: 5.0,
      total_reviews: 14
    },
    {
      id: 'counselor-3',
      name: 'Ibu Ningsih Rahayu, M.Pd.',
      role: 'Konselor Bimbingan & Karier',
      email: 'ningsih@oase.id',
      password: 'konselor123',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&h=200&q=80',
      specialties: ['Pengembangan Diri', 'Kecemasan Belajar'],
      status: 'Siap Mendengarkan',
      rating: 4.8,
      total_reviews: 16
    }
  ];

  // Helper untuk mengambil rating dinamis konselor
  function getCounselorRatingInfo(counselorId) {
    if (typeof window !== 'undefined' && window.ChatSessionService && typeof window.ChatSessionService.getCounselorRating === 'function') {
      const liveRating = window.ChatSessionService.getCounselorRating(counselorId);
      if (liveRating) {
        return {
          average: parseFloat(liveRating.average) || 5.0,
          totalReviews: liveRating.totalCount || 5
        };
      }
    }
    const counselor = COUNSELORS_DATA.find(c => c.id === counselorId);
    return {
      average: counselor ? counselor.rating : 5.0,
      totalReviews: counselor ? counselor.total_reviews : 10
    };
  }

  // Menjadikan data dan helper tersedia secara global di window maupun module exports
  if (typeof window !== 'undefined') {
    window.COUNSELORS_DATA = COUNSELORS_DATA;
    window.getCounselorRatingInfo = getCounselorRatingInfo;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { COUNSELORS_DATA, getCounselorRatingInfo };
  }
})();
