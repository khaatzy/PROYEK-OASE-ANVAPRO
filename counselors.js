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

const COUNSELORS_DATA = [
  {
    id: 'auto',
    name: 'Pilihkan Otomatis',
    role: 'Sistem OASE akan meneruskan ke konselor pertama yang siap',
    email: '',
    password: '',
    avatar: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=200&h=200&q=80',
    specialties: ['Semua Kategori', 'Respon Cepat'],
    status: 'Tersedia'
  },
  {
    id: 'counselor-1',
    name: 'Kak Sarah Maulida, S.Psi.',
    role: 'Psikolog & Konselor Remaja',
    email: 'sarah@oase.id',
    password: 'konselor123',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80',
    specialties: ['Kesehatan Mental', 'Akademik & Pembelajaran'],
    status: 'Siap Mendengarkan'
  },
  {
    id: 'counselor-2',
    name: 'Kak Dimas Pratama, M.Psi.',
    role: 'Konselor Hubungan & Keluarga',
    email: 'dimas@oase.id',
    password: 'konselor123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
    specialties: ['Masalah Keluarga', 'Pertemanan & Sosial'],
    status: 'Siap Mendengarkan'
  },
  {
    id: 'counselor-3',
    name: 'Ibu Ningsih Rahayu, M.Pd.',
    role: 'Konselor Bimbingan & Karier',
    email: 'ningsih@oase.id',
    password: 'konselor123',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&h=200&q=80',
    specialties: ['Pengembangan Diri', 'Kecemasan Belajar'],
    status: 'Siap Mendengarkan'
  }
];

// Menjadikan data tersedia secara global di window agar bisa diakses oleh seluruh halaman OASE
window.COUNSELORS_DATA = COUNSELORS_DATA;
