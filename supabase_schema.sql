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
