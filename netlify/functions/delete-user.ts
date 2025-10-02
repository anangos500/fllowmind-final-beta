import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent) => {
  // 1. Pemeriksaan Awal
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Metode Tidak Diizinkan' }) };
  }

  const { password } = JSON.parse(event.body || '{}');
  const authHeader = event.headers.authorization;

  if (!password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Password harus diisi.' }) };
  }
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Header otorisasi tidak valid atau tidak ada.' }) };
  }
  
  const jwt = authHeader.split(' ')[1];

  // 2. Pemeriksaan Variabel Lingkungan & Inisialisasi Klien Admin
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Variabel lingkungan Supabase (URL atau Kunci Peran Layanan) tidak diatur.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Konfigurasi server tidak lengkap. Tidak dapat melanjutkan dengan penghapusan akun.' }),
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 3. Dapatkan Pengguna dari JWT untuk memverifikasi identitas
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Gagal mendapatkan pengguna dari JWT:', userError?.message);
      return { statusCode: 401, body: JSON.stringify({ error: 'Token tidak valid atau sesi telah berakhir.' }) };
    }

    // 4. Verifikasi kata sandi pengguna untuk keamanan
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email!,
        password: password
    });

    if (signInError) {
        console.warn(`Upaya penghapusan akun gagal untuk ${user.email} karena kata sandi salah.`);
        return { statusCode: 401, body: JSON.stringify({ error: 'Password yang Anda masukkan salah.' }) };
    }

    // 5. Jika kata sandi benar, lanjutkan dengan penghapusan menggunakan Admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      // Ini adalah sumber paling mungkin dari "internal server error" asli
      console.error(`Kesalahan admin saat menghapus pengguna ${user.id}:`, deleteError.message);
      throw deleteError; // Biarkan blok catch generik yang menanganinya
    }

    // 6. Berhasil
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Akun berhasil dihapus.' }),
    };

  } catch (error: any) {
    console.error("Kesalahan tak terduga dalam fungsi delete-user:", error);
    // Berikan pesan yang ramah pengguna tetapi catat detail teknisnya
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Terjadi kesalahan server internal saat mencoba menghapus akun Anda.' }),
    };
  }
};

export { handler };
