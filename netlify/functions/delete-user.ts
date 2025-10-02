import { createClient } from '@supabase/supabase-js';
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
  // FIX: Periksa keberadaan SUPABASE_URL atau VITE_SUPABASE_URL untuk fleksibilitas.
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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

    // 5. Hapus semua data pengguna secara manual untuk mencegah pelanggaran foreign key.
    // Ini adalah pendekatan yang kuat untuk menangani kasus di mana ON DELETE CASCADE tidak diatur.

    // Hapus tugas
    const { error: tasksError } = await supabaseAdmin.from('tasks').delete().eq('user_id', user.id);
    if (tasksError) throw new Error(`Gagal menghapus tugas pengguna: ${tasksError.message}`);

    // Temukan dan hapus PDF jurnal dari penyimpanan
    const { data: journals, error: journalsError } = await supabaseAdmin.from('journals').select('pdf_path').eq('user_id', user.id);
    if (journalsError) throw new Error(`Gagal mengambil path PDF jurnal: ${journalsError.message}`);

    if (journals && journals.length > 0) {
        const filePaths = journals.map(j => j.pdf_path);
        const { error: storageError } = await supabaseAdmin.storage.from('journal_pdfs').remove(filePaths);
        if (storageError) console.warn(`Gagal menghapus file dari storage untuk pengguna ${user.id}:`, storageError.message);
    }
    
    // Hapus jurnal (juga ditangani oleh cascade, tetapi penghapusan eksplisit lebih aman)
    const { error: journalsDeleteError } = await supabaseAdmin.from('journals').delete().eq('user_id', user.id);
    if (journalsDeleteError) throw new Error(`Gagal menghapus jurnal pengguna: ${journalsDeleteError.message}`);

    // Hapus profil (juga ditangani oleh cascade, tetapi penghapusan eksplisit lebih aman)
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', user.id);
    if (profileError) throw new Error(`Gagal menghapus profil pengguna: ${profileError.message}`);
    
    // 6. Terakhir, hapus pengguna dari skema auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(`Kesalahan admin saat menghapus pengguna ${user.id} setelah membersihkan data:`, deleteError.message);
      throw deleteError;
    }
    
    // 7. Berhasil
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Akun dan semua data terkait berhasil dihapus.' }),
    };

  } catch (error: any) {
    console.error("Kesalahan dalam proses penghapusan akun:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Terjadi kesalahan server internal saat mencoba menghapus akun Anda.' }),
    };
  }
};

export { handler };
