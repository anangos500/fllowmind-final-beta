
import { GoogleGenAI } from '@google/genai';
import type { Handler, HandlerEvent } from "@netlify/functions";

// Mengambil semua kunci API yang tersedia dari variabel lingkungan.
// Ini mendukung pola API_KEY, API_KEY_2, API_KEY_3, dst.
const getApiKeys = (): string[] => {
    const keys: string[] = [];
    if (process.env.API_KEY) {
        keys.push(process.env.API_KEY);
    }
    
    let i = 2;
    while (process.env[`API_KEY_${i}`]) {
        const key = process.env[`API_KEY_${i}`];
        if (key) {
            keys.push(key);
        }
        i++;
    }
    return keys;
};


const handler: Handler = async (event: HandlerEvent) => {
  // Hanya izinkan request POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKeys = getApiKeys();

  // Jika tidak ada kunci API yang ditemukan sama sekali
  if (apiKeys.length === 0) {
    console.error("Tidak ada variabel lingkungan API_KEY yang ditetapkan.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Layanan AI tidak terkonfigurasi dengan benar di server.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    if (!body.model || !body.contents) {
         return { statusCode: 400, body: JSON.stringify({ error: 'Request body harus berisi "model" dan "contents".' }) };
    }

    let lastError: any = null;

    // Loop melalui setiap kunci API dan coba panggilannya
    for (const key of apiKeys) {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent(body);
            
            // Jika berhasil, segera kembalikan respons dan hentikan loop
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: response.text }),
            };
        } catch (error: any) {
            console.warn(`Panggilan API gagal dengan kunci yang berakhir ...${key.slice(-4)}. Mencoba kunci berikutnya.`);
            lastError = error;
            // Loop akan berlanjut ke kunci berikutnya
        }
    }

    // Jika loop selesai, berarti semua kunci gagal.
    console.error("Semua kunci API gagal. Kesalahan terakhir:", lastError);
    const errorMessage = lastError?.message || 'Terjadi kesalahan yang tidak diketahui';
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal mendapatkan respons dari layanan AI setelah mencoba semua kunci yang tersedia.', details: errorMessage }),
    };

  } catch (error: any) {
    console.error("Terjadi kesalahan tak terduga dalam fungsi handler:", error);
    const errorMessage = error.message || 'Terjadi kesalahan yang tidak diketahui';
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal memproses permintaan AI.', details: errorMessage }),
    };
  }
};

export { handler };
