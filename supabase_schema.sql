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
    story_content TEXT NOT NULL,
    status TEXT DEFAULT 'menunggu_tanggapan',
    counselor_reply TEXT,
    replied_at TIMESTAMP WITH TIME ZONE,
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
