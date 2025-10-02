import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://auaypyfcjamvgalttknz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1YXlweWZjamFtdmdhbHR0a256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODEyMjMsImV4cCI6MjA3NDU1NzIyM30.yElhFyiUeFvACH48b0ZjUr_HlbgVrOnqw5o03ReeB_E'

// Ditambahkan opsi auth untuk memastikan persistensi sesi yang andal
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});


/* 
================================================================================
================================================================================

    --->   KODE SQL UNTUK MIGRASI DATABASE ANDA   <---

  JALANKAN KODE SQL BERIKUT DI EDITOR SQL SUPABASE ANDA.
  Skrip ini akan memperbarui tabel 'tasks' dan membuat tabel 'profiles' & 'journals' Anda.

================================================================================
================================================================================

-- Langkah 1: Buat tabel 'profiles' untuk menyimpan data pengguna tambahan.
-- Tabel ini akan terhubung ke pengguna Supabase Auth Anda.
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    updated_at timestamp with time zone,
    username text,
    has_completed_onboarding boolean DEFAULT false,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT profiles_username_check CHECK ((char_length(username) >= 3))
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Kebijakan RLS: Izinkan pengguna untuk melihat dan mengedit profil mereka sendiri.
DROP POLICY IF EXISTS "Users can view and update their own profile." ON public.profiles;
CREATE POLICY "Users can view and update their own profile."
ON public.profiles FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Langkah 2 (Otomatis): Buat fungsi untuk menyalin data pengguna baru dari auth.users ke public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$;

-- Langkah 3 (Otomatis): Atur trigger untuk menjalankan fungsi handle_new_user setiap kali ada pengguna baru
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Langkah 4: Migrasi kolom 'deadline' ke 'start_time' & 'end_time' di tabel 'tasks'.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_time timestamp with time zone;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;
-- Hanya jalankan UPDATE jika kolom deadline masih ada
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='deadline') THEN
      UPDATE public.tasks SET start_time = deadline, end_time = deadline + interval '1 hour' WHERE deadline IS NOT NULL AND start_time IS NULL;
      ALTER TABLE public.tasks DROP COLUMN deadline;
   END IF;
END $$;
ALTER TABLE public.tasks ALTER COLUMN start_time SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN end_time SET NOT NULL;

-- Langkah 5: Tambahkan kolom 'tags' untuk kategorisasi tugas.
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS tags text[];

-- Langkah 6 (BARU): Tambahkan kolom untuk preferensi notifikasi di tabel profiles.
-- Mengatur Bedside Clock sebagai default untuk pengguna baru.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS play_focus_end_sound boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS play_break_end_sound boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS focus_end_sound text DEFAULT 'https://www.dropbox.com/scl/fi/4weoragikbg2q96agaxdc/Bedside-Clock-Alarm.mp3?rlkey=nmbi5zgqtl7xconrb729k9csz&dl=1',
ADD COLUMN IF NOT EXISTS break_end_sound text DEFAULT 'https://www.dropbox.com/scl/fi/4weoragikbg2q96agaxdc/Bedside-Clock-Alarm.mp3?rlkey=nmbi5zgqtl7xconrb729k9csz&dl=1';


================================================================================
FIX UNTUK FITUR JURNAL (Jalankan jika PDF gagal dibuat/disimpan)
================================================================================

-- Langkah 1: Buat tabel 'journals' jika belum ada.
CREATE TABLE IF NOT EXISTS public.journals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    journal_date date NOT NULL,
    title text,
    notes text,
    completed_tasks jsonb,
    pdf_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT journals_pkey PRIMARY KEY (id),
    CONSTRAINT journals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT journals_user_id_journal_date_key UNIQUE (user_id, journal_date)
);

-- Langkah 2: Aktifkan Row Level Security (RLS) pada tabel journals.
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;

-- Langkah 3: Buat RLS policy untuk tabel journals.
DROP POLICY IF EXISTS "Allow users to manage their own journals" ON public.journals;
CREATE POLICY "Allow users to manage their own journals"
ON public.journals FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Langkah 4: Buat RLS policies untuk Supabase Storage bucket 'journal_pdfs'.
-- Bucket ini harus sudah Anda buat secara manual di dashboard Supabase Storage.
DROP POLICY IF EXISTS "Allow authenticated users to read their own journals" ON storage.objects;
CREATE POLICY "Allow authenticated users to read their own journals"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal_pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS "Allow authenticated users to upload journals" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload journals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'journal_pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS "Allow authenticated users to delete their own journals" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete their own journals"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal_pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

*/