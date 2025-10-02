

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, Journal, TaskStatus } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DownloadIcon from './icons/DownloadIcon';
import SparklesIcon from './icons/SparklesIcon';
import TrashIcon from './icons/TrashIcon';
import { useTheme } from '../contexts/ThemeContext';
import ConfirmationModal from './ConfirmationModal';
import EditIcon from './icons/EditIcon';
import FlowmindIcon from './icons/FlowmindIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface JournalViewProps {
  tasks: Task[];
  journals: Journal[];
  createOrUpdateJournal: (
    journalDate: string,
    title: string,
    notes: string,
    completedTasks: { title: string }[],
    pdfBlob: Blob,
    existingPdfPath?: string
  ) => Promise<void>;
  downloadJournal: (path: string) => Promise<void>;
  deleteJournal: (journalId: string, pdfPath: string) => Promise<void>;
}

const getDraftKey = (date: string) => `flowmind-journal-draft-${date}`;

const JournalView: React.FC<JournalViewProps> = ({ tasks, journals, createOrUpdateJournal, downloadJournal, deleteJournal }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalTitle, setJournalTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isAiTitleProcessing, setIsAiTitleProcessing] = useState(false);
  const [showAiRefineRetry, setShowAiRefineRetry] = useState(false);
  const [journalToDelete, setJournalToDelete] = useState<Journal | null>(null);
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const existingJournal = useMemo(() => {
    return journals.find(j => j.journalDate === selectedDate);
  }, [journals, selectedDate]);
  
  const completedTasksForDate = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return tasks.filter(task => {
      const taskDate = new Date(task.startTime);
      return task.status === TaskStatus.Done && taskDate >= startOfDay && taskDate <= endOfDay;
    });
  }, [tasks, selectedDate]);

  const sortedJournals = useMemo(() => {
    return [...journals].sort((a, b) => new Date(b.journalDate).getTime() - new Date(a.journalDate).getTime());
  }, [journals]);

  useEffect(() => {
    setSaveError(null); // Hapus kesalahan saat tanggal berubah
    if (editingJournal && selectedDate !== editingJournal.journalDate) {
      setEditingJournal(null);
      setNotes('');
      setJournalTitle('');
    } else if (!editingJournal) {
      const journalForDate = journals.find(j => j.journalDate === selectedDate);
      if (journalForDate) {
        setNotes(journalForDate.notes || '');
        setJournalTitle(journalForDate.title || '');
      } else {
        try {
          const draftKey = getDraftKey(selectedDate);
          const savedDraft = localStorage.getItem(draftKey);
          if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            setNotes(draft.notes || '');
            setJournalTitle(draft.title || '');
          } else {
            setNotes('');
            setJournalTitle('');
          }
        } catch (e) {
          console.error("Failed to parse journal draft:", e);
          setNotes('');
          setJournalTitle('');
        }
      }
    }
  }, [selectedDate, journals, editingJournal]);

  useEffect(() => {
    const isNewEntry = !existingJournal && !editingJournal;
    
    if (isNewEntry) {
        const draft = { title: journalTitle, notes };
        localStorage.setItem(getDraftKey(selectedDate), JSON.stringify(draft));
    }
  }, [notes, journalTitle, selectedDate, existingJournal, editingJournal]);
  
  const handleAiRefine = async () => {
    if (!notes.trim() || isAiProcessing) return;
    setIsAiProcessing(true);
    setShowAiRefineRetry(false);
    try {
      const prompt = `Anda adalah seorang editor ahli. Perbaiki dan rapikan teks berikut agar memiliki tata bahasa, koherensi, dan kejelasan yang sangat baik. Jangan mengubah makna atau konteks aslinya. Jaga agar gaya bahasanya tetap sama. Kembalikan hanya teks yang sudah diperbaiki, tanpa penjelasan atau pembukaan apa pun. Teks yang akan diperbaiki:\n\n"${notes}"`;
      
      const response = await fetch('/.netlify/functions/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gemini-2.5-flash',
            contents: prompt,
        })
      });

      if (!response.ok) {
        throw new Error("AI service returned an error.");
      }

      const data = await response.json();
      const refinedText = data.text;

      if (refinedText) {
        setNotes(refinedText);
      } else {
        throw new Error("AI tidak memberikan respons teks.");
      }
    } catch (error) {
      console.error("Error refining text with AI:", error);
      setShowAiRefineRetry(true);
    } finally {
      setIsAiProcessing(false);
    }
  };

   const handleAiGenerateTitle = async () => {
    if ((completedTasksForDate.length === 0 && !notes.trim()) || isAiTitleProcessing) return;
    setIsAiTitleProcessing(true);
    
    const taskList = completedTasksForDate.map(t => `- ${t.title}`).join('\n');
    const context = `
        Tugas yang Selesai:
        ${taskList || 'Tidak ada.'}

        Catatan & Refleksi:
        ${notes || 'Tidak ada.'}
    `;
    const prompt = `Anda adalah seorang asisten yang ahli dalam membuat judul yang ringkas. Berdasarkan ringkasan aktivitas hari berikut, buatlah satu judul jurnal yang singkat, padat, dan jelas dalam Bahasa Indonesia. Judul harus secara langsung mencerminkan tema atau aktivitas utama hari itu.

Aturan:
- Jangan gunakan tanda kutip.
- Hindari metafora yang terlalu rumit.
- Kembalikan HANYA judulnya.

Contoh 1:
- Tugas: Menyelesaikan laporan kuartalan, Memperbaiki bug kritis.
- Catatan: Hari yang panjang, tapi akhirnya semua masalah besar teratasi. Merasa lega.
- Judul yang Baik: Menuntaskan Masalah Kuartalan

Contoh 2:
- Tugas: Mengedit foto sesi matahari terbenam.
- Catatan: Warna-warnanya luar biasa hari ini. Merasa terinspirasi oleh cahaya senja.
- Judul yang Baik: Mengabadikan Cahaya Senja

Sekarang, buat judul untuk ringkasan berikut:
${context}`;

    try {
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                contents: prompt,
            })
        });

        if (!response.ok) throw new Error("AI service returned an error.");
        
        const data = await response.json();
        const generatedTitle = data.text.replace(/["*]/g, '').trim();

        if (generatedTitle) {
            setJournalTitle(generatedTitle);
        } else {
            throw new Error("AI did not return a valid title.");
        }
    } catch (error) {
        console.error("Error generating title with AI:", error);
        alert("Gagal membuat judul dengan AI. Silakan coba lagi.");
    } finally {
        setIsAiTitleProcessing(false);
    }
  };

  const handleGenerateAndSave = async () => {
    if (!pdfContentRef.current) return;
    setIsLoading(true);
    setSaveError(null);

    try {
        const canvas = await html2canvas(pdfContentRef.current, {
            scale: 2,
            useCORS: true,
            // FEAT: Selalu gunakan latar belakang putih untuk PDF agar ramah cetak.
            backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        // FEAT: Latar belakang PDF diatur menjadi putih.
        pdf.setFillColor('#ffffff');
        pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const canvasAspectRatio = canvasWidth / canvasHeight;
        
        const margin = 40;
        const contentWidth = pdfWidth - margin * 2;
        let contentHeight = contentWidth / canvasAspectRatio;

        if (contentHeight > pdfHeight - margin * 2) {
            contentHeight = pdfHeight - margin * 2;
        }

        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
        
        const pdfBlob = pdf.output('blob');
        
        await createOrUpdateJournal(
            selectedDate,
            journalTitle,
            notes,
            completedTasksForDate.map(t => ({ title: t.title })),
            pdfBlob,
            editingJournal?.pdfPath
        );
        
        localStorage.removeItem(getDraftKey(selectedDate));

        if (editingJournal) {
            setEditingJournal(null);
        }
    } catch (error: any) {
        console.error("Error generating or saving PDF:", error);
        setSaveError(error.message || "Gagal membuat atau menyimpan jurnal PDF. Periksa koneksi Anda dan coba lagi.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleDownload = async (journal: Journal) => {
    setIsLoading(true);
    try {
        await downloadJournal(journal.pdfPath);
    } catch (error) {
        alert("Gagal mengunduh PDF.");
    } finally {
        setIsLoading(false);
    }
  }

  const handleDeleteJournalRequest = (journal: Journal) => {
    setJournalToDelete(journal);
  };

  const handleConfirmDeleteJournal = async () => {
    if (!journalToDelete) return;
    try {
      setIsLoading(true);
      await deleteJournal(journalToDelete.id, journalToDelete.pdfPath);
      localStorage.removeItem(getDraftKey(journalToDelete.journalDate));
    } catch (error: any) {
      console.error("Failed to delete journal:", error);
      alert(error.message || "Gagal menghapus jurnal.");
    } finally {
      setIsLoading(false);
      setJournalToDelete(null);
    }
  };

  const handleStartEdit = (journal: Journal) => {
    setEditingJournal(journal);
    setSelectedDate(journal.journalDate);
    setJournalTitle(journal.title || '');
    setNotes(journal.notes);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingJournal(null);
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Jurnal Harian</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Refleksikan pekerjaan Anda dan simpan catatan harian.</p>
      </header>
       {/* PDF Content - Hidden from view, used for generation */}
       <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
          <div 
            ref={pdfContentRef} 
            style={{
                width: '595px',
                height: '842px',
                padding: '40px',
                fontFamily: 'Inter, sans-serif',
                color: '#1e293b',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '28px', display: 'flex', justifyContent: 'center', color: '#2563eb', marginRight: '8px' }}>
                    <FlowmindIcon className="w-7 h-7" />
                </div>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Jurnal Harian Flowmind</span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{formattedDate}</span>
            </div>
            
            {/* Title */}
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '32px 0', textAlign: 'center', color: '#0f172a' }}>
              {journalTitle || 'Jurnal Harian'}
            </h1>

            {/* Completed Tasks */}
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                Tugas Selesai
              </h2>
              {completedTasksForDate.length > 0 ? (
                <ul style={{ paddingLeft: '0', listStyle: 'none', fontSize: '14px' }}>
                  {completedTasksForDate.map(task => (
                    <li key={task.id} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '28px', display: 'flex', justifyContent: 'center', color: '#22c55e', marginRight: '8px', flexShrink: 0 }}>
                        <CheckCircleIcon className="w-4 h-4" />
                      </div>
                      <span>{task.title}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '14px' }}>
                  Tidak ada tugas yang diselesaikan.
                </p>
              )}
            </div>

            {/* Notes & Reflection */}
            <div style={{ marginTop: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                Catatan & Refleksi
              </h2>
              <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
                {notes || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Tidak ada catatan.</span>}
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '10px', color: '#94a3b8', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              © {new Date().getFullYear()} Flowmind by Aospheree.ai. All rights reserved.
            </div>
          </div>
        </div>

      <div className="mb-6">
        <label htmlFor="journal-date" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Pilih Tanggal Jurnal
        </label>
        <input
          type="date"
          id="journal-date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          disabled={!!editingJournal}
          className="p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-xl shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">{formattedDate}</h2>

        <div className="mb-6">
            <label htmlFor="journal-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Judul Jurnal
            </label>
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    id="journal-title"
                    value={journalTitle}
                    onChange={e => setJournalTitle(e.target.value)}
                    placeholder={isAiTitleProcessing ? "AI sedang berpikir..." : "Judul jurnal hari ini..."}
                    className="flex-grow p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 disabled:opacity-70"
                    readOnly={(!!existingJournal && !editingJournal) || isAiTitleProcessing}
                />
                 {(editingJournal || !existingJournal) && (
                    <button
                        onClick={handleAiGenerateTitle}
                        disabled={isAiTitleProcessing || (completedTasksForDate.length === 0 && !notes.trim())}
                        className="flex-shrink-0 flex items-center p-3 text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Buat judul dengan AI"
                    >
                        <SparklesIcon className="w-5 h-5"/>
                    </button>
                 )}
            </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300 mb-3">Tugas Selesai Hari Ini</h3>
          {completedTasksForDate.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              {completedTasksForDate.map(task => (
                <li key={task.id}>{task.title}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 italic">Belum ada tugas yang diselesaikan hari ini.</p>
          )}
        </div>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">Catatan & Refleksi</h3>
            {(editingJournal || !existingJournal) && (
                <button
                    onClick={handleAiRefine}
                    disabled={isAiProcessing || !notes.trim()}
                    className="flex items-center px-3 py-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <SparklesIcon className="w-4 h-4 mr-2"/>
                    {isAiProcessing ? 'Memproses...' : 'Rapikan dengan AI'}
                </button>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tulis refleksi Anda tentang hari ini..."
            className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            readOnly={!!existingJournal && !editingJournal}
          ></textarea>
        </div>

        {saveError && (
            <div className="my-4 p-3 text-sm text-center text-red-800 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-300" role="alert">
              <strong>Gagal Menyimpan:</strong> {saveError}
            </div>
        )}
        <div className="flex justify-end items-center gap-4">
            {editingJournal ? (
                <>
                    <button
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                    >
                        Batal Edit
                    </button>
                    <button
                        onClick={handleGenerateAndSave}
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-slate-400"
                    >
                        {isLoading ? 'Memperbarui...' : 'Perbarui Jurnal & PDF'}
                    </button>
                </>
            ) : existingJournal ? (
                 <button
                    onClick={() => handleDownload(existingJournal)}
                    disabled={isLoading}
                    className="flex items-center px-6 py-3 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:bg-slate-400"
                >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    {isLoading ? 'Mengunduh...' : 'Unduh Jurnal PDF'}
                </button>
            ) : (
                <button
                    onClick={handleGenerateAndSave}
                    disabled={isLoading || (completedTasksForDate.length === 0 && !notes.trim() && !journalTitle.trim())}
                    className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
                    title={completedTasksForDate.length === 0 && !notes.trim() ? "Selesaikan tugas atau tulis catatan untuk membuat jurnal." : "Simpan Jurnal"}
                >
                    {isLoading ? 'Menyimpan...' : 'Simpan & Hasilkan PDF'}
                </button>
            )}
        </div>
      </div>
      
      {showAiRefineRetry && (
        <ConfirmationModal
          title="Gagal Merapikan Teks"
          message="AI gagal merapikan teks. Apakah Anda ingin mencoba lagi?"
          confirmText="Coba Lagi"
          onConfirm={handleAiRefine}
          onCancel={() => setShowAiRefineRetry(false)}
          isDestructive={false}
        />
      )}

      {/* Journal History Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Riwayat Jurnal</h2>
        {sortedJournals.length > 0 ? (
          <div className="space-y-3">
            {sortedJournals.map(journal => (
              <div key={journal.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-shadow hover:shadow-md">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{journal.title || 'Jurnal Tanpa Judul'}</p>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(journal.journalDate + 'T00:00:00').toLocaleDateString('id-ID', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => handleStartEdit(journal)}
                      disabled={isLoading}
                      className="p-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                      aria-label={`Edit jurnal untuk ${journal.journalDate}`}
                      title="Edit Jurnal"
                    >
                        <EditIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(journal)}
                      disabled={isLoading}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/80 transition-colors disabled:opacity-50"
                      aria-label={`Unduh jurnal untuk ${journal.journalDate}`}
                    >
                      <DownloadIcon className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Unduh</span>
                    </button>
                    <button
                        onClick={() => handleDeleteJournalRequest(journal)}
                        disabled={isLoading}
                        className="p-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/80 transition-colors disabled:opacity-50"
                        aria-label={`Hapus jurnal untuk ${journal.journalDate}`}
                        title="Hapus Jurnal"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm text-center">
            <p className="text-slate-500 dark:text-slate-400 italic">Belum ada riwayat jurnal.</p>
          </div>
        )}
      </div>
      {journalToDelete && (
        <ConfirmationModal
            title="Hapus Jurnal"
            message={`Apakah Anda yakin ingin menghapus jurnal untuk tanggal ${new Date(journalToDelete.journalDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}? Tindakan ini tidak dapat diurungkan.`}
            confirmText="Ya, Hapus"
            onConfirm={handleConfirmDeleteJournal}
            onCancel={() => setJournalToDelete(null)}
            isDestructive={true}
        />
      )}
    </div>
  );
};

export default JournalView;
