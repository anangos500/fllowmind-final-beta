import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent } from "@netlify/functions";

// Inisialisasi Supabase Admin Client
const createAdminClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or service role key is not set in environment variables.');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

const handler: Handler = async (event: HandlerEvent) => {
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

  try {
    const supabaseAdmin = createAdminClient();

    // 1. Dapatkan pengguna dari JWT untuk memverifikasi siapa yang membuat permintaan.
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Token tidak valid atau pengguna tidak ditemukan.' }) };
    }

    // 2. Verifikasi kata sandi pengguna dengan mencoba login.
    // Ini adalah langkah keamanan penting sebelum melakukan tindakan destruktif.
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email!,
        password: password
    });

    if (signInError) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Password salah.' }) };
    }

    // 3. Jika kata sandi benar, hapus pengguna menggunakan ID pengguna.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      throw deleteError;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'User deleted successfully' }),
    };

  } catch (error: any) {
    console.error("Error in delete-user function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Terjadi kesalahan server internal saat menghapus pengguna.', details: error.message }),
    };
  }
};

export { handler };
