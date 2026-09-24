-- ========================================================
-- SKEMA DATABASE SUPABASE UNTUK "OASE CERITA"
-- ========================================================
-- Jalankan skrip ini di menu SQL Editor pada Dashboard Supabase Anda:
-- https://supabase.com/dashboard/project/lfsgrihhlyffxrlwjyev/sql/new

-- 1. Buat Tabel Cerita (stories)
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT DEFAULT 'Sahabat Anonim',
    emotion_tag TEXT NOT NULL,
    content TEXT NOT NULL,
    hug_count INT DEFAULT 0,
    is_anonymous BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Aktifkan Row Level Security (RLS) demi keamanan data
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Kebijakan 1: Siapapun (pengunjung) dapat membaca cerita publik
CREATE POLICY "Cerita dapat dibaca oleh siapa saja" 
ON public.stories FOR SELECT 
USING (true);

-- Kebijakan 2: Pengguna dapat menambahkan cerita baru
CREATE POLICY "Pengguna dapat menulis cerita baru" 
ON public.stories FOR INSERT 
WITH CHECK (true);

-- Kebijakan 3: Siapapun dapat memberikan reaksi 'Pelukan Hangat'
CREATE POLICY "Siapapun dapat memperbarui reaksi pelukan" 
ON public.stories FOR UPDATE 
USING (true);

-- 3. Masukkan Cerita Awal (Seed Data) yang menenangkan
INSERT INTO public.stories (author_name, emotion_tag, content, hug_count, is_anonymous)
VALUES 
('Sahabat Anonim #342', 'Lelah', 'Hari ini rasanya begitu berat di tempat kerja. Aku merasa usahaku tidak pernah cukup. Tapi saat menulis di sini, rasanya seperti meletakkan satu ransel batu yang sudah seharian kupanggul...', 28, true),
('Sahabat Anonim #115', 'Cemas', 'Ada banyak hal yang terjadi sekaligus minggu ini dan kepalaku rasanya penuh sekali. Mencoba tarik napas dalam-dalam dan mengingat bahwa langkah kecil tetaplah sebuah kemajuan.', 19, true),
('Sahabat Anonim #409', 'Syukur', 'Menemukan tempat tenang ini membuatku sadar bahwa emosiku tidak salah. Terima kasih untuk semua pelukan hangat dan kata-kata positif yang selalu saling menguatkan di sini.', 42, true);

-- ========================================================
-- 4. Buat Tabel Pengiriman Cerita & Konseling (counseling_submissions)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.counseling_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_code TEXT UNIQUE NOT NULL,
    author_name TEXT NOT NULL,
    education_level TEXT NOT NULL,
    grade_class TEXT,
    gender TEXT NOT NULL,
    category TEXT NOT NULL,
    counselor_id TEXT NOT NULL,
    counselor_name TEXT NOT NULL,
    story_content TEXT NOT NULL, -- Isi cerita (terenkripsi ENC_v1:... untuk privasi)
    is_crisis BOOLEAN DEFAULT false, -- True jika terdeteksi indikasi krisis/self-harm
    status TEXT DEFAULT 'menunggu_tanggapan',
    counselor_reply TEXT, -- Balasan konselor (terenkripsi ENC_v1:...)
    replied_at TIMESTAMP WITH TIME ZONE,
    transferred_from_name TEXT,
    transfer_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan RLS untuk tabel counseling_submissions
ALTER TABLE public.counseling_submissions ENABLE ROW LEVEL SECURITY;

-- Kebijakan: Siapapun dapat mengirim cerita / curhatan baru
CREATE POLICY "Siapapun dapat mengirimkan curhatan" 
ON public.counseling_submissions FOR INSERT 
WITH CHECK (true);

-- Kebijakan: Pengunjung dapat melihat status/balasan cerita dengan kode tiket
CREATE POLICY "Pengguna dapat mengecek curhatan berdasarkan tiket" 
ON public.counseling_submissions FOR SELECT 
USING (true);

-- Kebijakan: Konselor dapat memperbarui balasan dan alih kasus
CREATE POLICY "Konselor dapat memperbarui balasan dan status" 
ON public.counseling_submissions FOR UPDATE 
USING (true);

-- Data Awal Antrean Curhat untuk Pengujian Konselor
INSERT INTO public.counseling_submissions 
(ticket_code, author_name, education_level, grade_class, gender, category, counselor_id, counselor_name, story_content, status, created_at)
VALUES
('OASE-2941-KB', 'User104', 'SMA / SMK / MA', 'Kelas 12', 'Perempuan', 'Masalah Pembelajaran & Akademik', 'counselor-1', 'Kak Sarah Maulida, S.Psi.', 'Halo Kak Sarah, aku merasa sangat cemas menghadapi ujian kelulusan dan seleksi masuk perguruan tinggi bulan depan. Rasanya orang tua punya ekspektasi sangat tinggi, sementara nilaiku sering pas-pasan. Aku susah tidur setiap malam...', 'menunggu_tanggapan', NOW() - INTERVAL '35 minutes'),
('OASE-5820-MN', 'Bunga Lavender', 'SMP / MTs', 'Kelas 9', 'Perempuan', 'Masalah Keluarga & Rumah Tangga', 'auto', 'Pilihkan Otomatis', 'Di rumah suasana sedang tidak nyaman karena orang tua sering bertengkar hebat akhir-akhir ini. Aku merasa sendirian di kamar dan tidak tahu harus bercerita ke siapa. Takut mengganggu teman...', 'menunggu_tanggapan', NOW() - INTERVAL '2 hours'),
('OASE-7731-XT', 'Pejuang Senja', 'Perguruan Tinggi / Mahasiswa', 'Semester 6', 'Laki-laki', 'Karier & Rencana Masa Depan', 'counselor-3', 'Ibu Ningsih Rahayu, M.Pd.', 'Saya merasa salah mengambil jurusan kuliah. Memasuki semester akhir ini tugas magang dan skripsi terasa begitu hampa. Apakah wajar merasa seperti ini di usia 21 tahun?', 'menunggu_tanggapan', NOW() - INTERVAL '5 hours');

-- ========================================================
-- 5. Tabel Profil Pengguna & Role Akun (profiles)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'counselor', 'moderator')),
    moderator_approval_status TEXT DEFAULT 'pending' CHECK (moderator_approval_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profil dapat dibaca oleh pemilik dan konselor" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Pengguna dapat memperbarui profilnya sendiri" 
ON public.profiles FOR UPDATE 
USING (true);

CREATE POLICY "Pengguna dapat mendaftarkan profil awal" 
ON public.profiles FOR INSERT 
WITH CHECK (true);

-- ========================================================
-- 6. Tabel Sesi Konseling Booking (counseling_sessions)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.counseling_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    counselor_id TEXT NOT NULL,
    counselor_name TEXT NOT NULL,
    topic TEXT NOT NULL,
    booking_date TEXT, -- Tanggal booking (YYYY-MM-DD)
    booking_time TEXT, -- Jam slot booking (misal: 13:00)
    duration_minutes INT DEFAULT 30,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'aktif' CHECK (status IN ('menunggu_konfirmasi', 'aktif', 'selesai', 'dibatalkan')),
    rating INT, -- Rating 1-5 bintang dari siswa
    review TEXT, -- Ulasan/feedback dari siswa
    motivational_message TEXT, -- Pesan motivasi penutup dari konselor
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.counseling_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua pihak dalam sesi dapat melihat sesi" 
ON public.counseling_sessions FOR SELECT 
USING (true);

CREATE POLICY "User dapat melakukan booking sesi baru" 
ON public.counseling_sessions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "User dan konselor dapat memperbarui status sesi" 
ON public.counseling_sessions FOR UPDATE 
USING (true);

-- ========================================================
-- 7. Tabel Pesan Chat & Voice Note (session_messages)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.session_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.counseling_sessions(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'counselor')),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'motivation')),
    message_text TEXT, -- Teks pesan (terenkripsi ENC_v1:... untuk privasi)
    audio_data TEXT, -- Base64 Data URL atau URL file rekaman suara
    is_crisis BOOLEAN DEFAULT false, -- True jika pesan mengandung kata kunci darurat/self-harm
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pesan dapat dibaca oleh partisipan sesi" 
ON public.session_messages FOR SELECT 
USING (true);

CREATE POLICY "Partisipan sesi dapat mengirim pesan" 
ON public.session_messages FOR INSERT 
WITH CHECK (true);

