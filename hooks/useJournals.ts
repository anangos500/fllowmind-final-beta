

import { useState, useEffect, useCallback } from 'react';
import { Journal } from '../types';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const toCamelCase = (obj: Record<string, any>): Record<string, any> => {
  if (!obj) return obj;
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj;
};

const toSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  if (!obj) return obj;
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = obj[key];
    }
  }
  return newObj;
};


export const useJournals = () => {
    const [journals, setJournals] = useState<Journal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const fetchJournals = useCallback(async () => {
        if (!user) {
            setJournals([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const { data, error: dbError } = await supabase
                .from('journals')
                .select('*')
                .eq('user_id', user.id);

            if (dbError) throw dbError;
            
            const camelCaseJournals = data.map(j => toCamelCase(j) as Journal);
            setJournals(camelCaseJournals);
        } catch (err: any) {
            // FIX: Provide a more descriptive error message to the user. This is crucial for
            // diagnosing setup issues, such as if the 'journals' table or its RLS policies
            // have not been correctly configured in the Supabase project. The specific
            // database error will now be shown in the UI.
            const errorMessage = err.message || "Terjadi kesalahan yang tidak diketahui.";
            setError(`Gagal memuat data jurnal. Kesalahan: ${errorMessage}`);
            console.error("Error fetching journals:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchJournals();
    }, [fetchJournals]);

    const createOrUpdateJournal = async (
        journalDate: string,
        title: string,
        notes: string,
        completedTasks: { title: string }[],
        pdfBlob: Blob,
        existingPdfPath?: string
    ) => {
        if (!user) throw new Error("Pengguna tidak terautentikasi.");

        // FEAT: Buat nama file yang lebih ramah pengguna berdasarkan judul jurnal.
        const sanitizeFilename = (name: string): string => {
            if (!name) return 'jurnal-tanpa-judul';
            const sanitized = name
                .toLowerCase()
                .replace(/\s+/g, '-') // Ganti spasi dengan tanda hubung
                .replace(/[^\w-]+/g, '') // Hapus semua karakter non-kata
                .replace(/--+/g, '-') // Ganti beberapa tanda hubung dengan satu
                .replace(/^-+/, '') // Potong tanda hubung dari awal
                .replace(/-+$/, ''); // Potong tanda hubung dari akhir
            return sanitized.slice(0, 50); // Batasi hingga 50 karakter
        };

        const finalTitle = title.trim() || `jurnal-${journalDate}`;
        const sanitizedTitle = sanitizeFilename(finalTitle);
        const filePath = `${user.id}/${sanitizedTitle}-${Date.now()}.pdf`;

        const { error: uploadError } = await supabase.storage
            .from('journal_pdfs')
            .upload(filePath, pdfBlob);

        if (uploadError) {
            console.error("Upload error:", uploadError);
            throw new Error(`Gagal mengunggah PDF: ${uploadError.message}. Pastikan bucket 'journal_pdfs' ada dan RLS policies sudah benar.`);
        }
        
        const journalData = {
            userId: user.id,
            journalDate,
            title,
            notes,
            completedTasks,
            pdfPath: filePath
        };
        
        const snakeCaseData = toSnakeCase(journalData);
        
        const { error: upsertError } = await supabase
            .from('journals')
            .upsert(snakeCaseData, { onConflict: 'user_id, journal_date' });

        if (upsertError) {
            console.error("Upsert error:", upsertError);
            await supabase.storage.from('journal_pdfs').remove([filePath]);
            throw new Error(`Gagal menyimpan data jurnal: ${upsertError.message}. Pastikan tabel 'journals' ada dan RLS policies sudah benar.`);
        }

        if (existingPdfPath) {
            const { error: deleteError } = await supabase.storage
                .from('journal_pdfs')
                .remove([existingPdfPath]);
            
            if (deleteError) {
                console.warn(`Gagal menghapus PDF jurnal lama di ${existingPdfPath}:`, deleteError.message);
            }
        }


        await fetchJournals();
    };

    const downloadJournal = async (path: string) => {
        try {
            const { data, error } = await supabase.storage.from('journal_pdfs').download(path);
            if (error) throw error;
            if (data) {
                const url = URL.createObjectURL(data);
                const a = document.createElement('a');
                a.href = url;
                a.download = path.split('/').pop() || 'journal.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (err: any) {
            console.error("Error downloading file:", err);
            throw new Error("Gagal mengunduh file jurnal.");
        }
    };
    
    const deleteJournal = async (journalId: string, pdfPath: string) => {
        if (!user) throw new Error("Pengguna tidak terautentikasi.");

        const { error: dbError } = await supabase
            .from('journals')
            .delete()
            .eq('id', journalId);

        if (dbError) {
            console.error("Error deleting journal record:", dbError);
            throw new Error("Gagal menghapus entri jurnal dari database.");
        }

        const { error: storageError } = await supabase.storage
            .from('journal_pdfs')
            .remove([pdfPath]);

        if (storageError) {
            console.error("Gagal menghapus PDF jurnal dari penyimpanan, tetapi catatan DB telah dihapus:", storageError);
        }

        await fetchJournals();
    };

    return { journals, loading, error, createOrUpdateJournal, downloadJournal, deleteJournal };
};