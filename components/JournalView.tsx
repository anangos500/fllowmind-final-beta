










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
      console.error("Error refining text with AI: ", error);
      setShowAiRefineRetry(true);
    } finally {
      setIsAiProcessing(false);
    }
  };
  
  const handleAiTitle = async () => {
    if ((!notes.trim() && completedTasksForDate.length === 0) || isAiTitleProcessing) return;
    setIsAiTitleProcessing(true);
    try {
        const completedTasksString = completedTasksForDate.map(t => `- ${t.title}`).join('\n');
        const context = `Tugas yang diselesaikan:\n${completedTasksString}\n\nCatatan:\n${notes}`;
        const prompt = `Berdasarkan ringkasan hari berikut, buat judul jurnal yang singkat, menarik, dan reflektif dalam Bahasa Indonesia. Judul harus menangkap esensi dari hari itu.\n\n${context}`;
        
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                contents: prompt
            })
        });

        if (!response.ok) {
            throw new Error("AI service returned an error.");
        }
        const data = await response.json();
        let newTitle = data.text;

        // Membersihkan judul dari tanda kutip atau karakter yang tidak perlu
        newTitle = newTitle.replace(/^"|"$/g, '').trim();
        setJournalTitle(newTitle);
    } catch (error) {
        console.error("Gagal membuat judul dengan AI:", error);
        alert("Maaf, terjadi kesalahan saat membuat judul dengan AI. Silakan coba lagi.");
    } finally {
        setIsAiTitleProcessing(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!pdfContentRef.current || (!notes.trim() && completedTasksForDate.length === 0)) {
        setSaveError("Jurnal tidak boleh kosong untuk disimpan.");
        return;
    };
    setIsLoading(true);
    setSaveError(null);
    try {
        const canvas = await html2canvas(pdfContentRef.current, { 
            scale: 2, 
            backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff' 
        });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        // FIX: Replace 'getBlob()' with 'output('blob')' which is the correct jsPDF method
        // to generate a Blob from the PDF document, resolving the TypeScript error.
        const pdfBlob = pdf.output('blob');

        await createOrUpdateJournal(
            selectedDate, 
            journalTitle, 
            notes, 
            completedTasksForDate.map(t => ({ title: t.title })),
            pdfBlob,
            editingJournal?.pdfPath
        );
        
        // Hapus draf setelah berhasil menyimpan
        localStorage.removeItem(getDraftKey(selectedDate));
        
        setEditingJournal(null); // Keluar dari mode edit setelah menyimpan
    } catch (error: any) {
        console.error("Gagal menyimpan jurnal:", error);
        setSaveError(error.message || "Terjadi kesalahan yang tidak diketahui saat menyimpan.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteRequest = (journal: Journal) => {
    setJournalToDelete(journal);
  };
  
  const handleConfirmDelete = async () => {
    if (journalToDelete) {
        try {
            await deleteJournal(journalToDelete.id, journalToDelete.pdfPath);
        } catch (error) {
            alert('Gagal menghapus jurnal.');
        } finally {
            setJournalToDelete(null);
        }
    }
  };
  
  const handleEdit = (journal: Journal) => {
    setSelectedDate(journal.journalDate);
    setEditingJournal(journal);
    setNotes(journal.notes);
    setJournalTitle(journal.title);
  };

  const isToday = new Date().toISOString().split('T')[0] === selectedDate;
  const canEditOrSave = notes.trim() !== '' || completedTasksForDate.length > 0;
  
  const CompletedTasksContent = (
    <>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Tugas Selesai</h3>
        {completedTasksForDate.length > 0 ? (
           <ul className="space-y-2">
               {completedTasksForDate.map(task => (
                   <li key={task.id} className="flex items-center text-slate-600 dark:text-slate-200">
                       <CheckCircleIcon className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                       <span className="truncate">{task.title}</span>
                   </li>
               ))}
           </ul>
        ) : (
           <p className="text-sm text-center text-slate-500 dark:text-slate-300 py-4">Belum ada tugas yang selesai hari ini.</p>
        )}
   </>
  );

  return (
    <div className="p-4 sm:p-8">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Jurnal Harian</h1>
        <p className="text-slate-500 dark:text-slate-300 mt-1">Refleksikan kemajuan Anda dan simpan pencapaian harian.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm" data-tour-id="journal-editor">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{isToday ? "Jurnal Hari Ini" : "Jurnal untuk"}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-300">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <input 
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="p-2 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200"
                />
            </div>
            
            {/* Mobile-only completed tasks section, inside the editor card */}
            <div className="lg:hidden mb-6 border-b border-slate-200 dark:border-slate-700 pb-6">
              {CompletedTasksContent}
            </div>

            <div className="relative mb-4">
                 <input
                    type="text"
                    placeholder={isAiTitleProcessing ? "AI sedang berpikir..." : "Judul Jurnal Anda..."}
                    value={journalTitle}
                    onChange={e => setJournalTitle(e.target.value)}
                    className="w-full p-3 text-lg font-semibold bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 pr-12"
                    disabled={isAiTitleProcessing}
                />
                <button
                    onClick={handleAiTitle}
                    disabled={isAiTitleProcessing || (!notes.trim() && completedTasksForDate.length === 0)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Buat Judul dengan AI"
                >
                    <SparklesIcon className="w-5 h-5"/>
                </button>
            </div>
            
            <textarea
                placeholder="Tuliskan refleksi Anda di sini... Apa yang berjalan baik hari ini? Apa yang bisa ditingkatkan?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full h-64 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400"
            ></textarea>
            
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <button
                    onClick={handleAiRefine}
                    disabled={isAiProcessing || !notes.trim()}
                    className="flex items-center w-full sm:w-auto justify-center px-4 py-2 text-sm font-semibold text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/80 transition-colors disabled:opacity-50"
                >
                    <SparklesIcon className="w-4 h-4 mr-2"/>
                    {isAiProcessing ? "Memperbaiki..." : "Perbaiki Tulisan dengan AI"}
                </button>
                <button
                    onClick={handleSaveJournal}
                    disabled={isLoading || !canEditOrSave}
                    className="w-full sm:w-auto px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Menyimpan..." : (editingJournal ? "Perbarui Jurnal" : "Simpan Jurnal")}
                </button>
            </div>
            {saveError && <p className="text-sm text-red-500 text-center mt-3">{saveError}</p>}
        </div>

        {/* Previous Journals Section */}
        <div className="lg:col-span-1">
            <div className="hidden lg:block mb-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                {CompletedTasksContent}
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Entri Sebelumnya</h3>
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm max-h-96 overflow-y-auto">
                {sortedJournals.length > 0 ? (
                    sortedJournals.map(journal => (
                        <div key={journal.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                            <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{journal.title || "Jurnal Tanpa Judul"}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-300">{new Date(journal.journalDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div className="flex items-center space-x-1">
                                <button onClick={() => handleEdit(journal)} title="Edit Jurnal" className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"><EditIcon className="w-4 h-4"/></button>
                                <button onClick={() => downloadJournal(journal.pdfPath)} title="Unduh PDF" className="p-2 text-slate-500 hover:text-green-600 dark:text-slate-300 dark:hover:text-green-400 transition-colors"><DownloadIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleDeleteRequest(journal)} title="Hapus Jurnal" className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 transition-colors"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-sm text-slate-500 dark:text-slate-300 p-6">Belum ada jurnal yang disimpan.</p>
                )}
            </div>
        </div>
      </div>
      
      {showAiRefineRetry && (
        <ConfirmationModal
          title="Gagal Memperbaiki Teks"
          message="AI gagal memperbaiki tulisan Anda. Apakah Anda ingin mencoba lagi?"
          confirmText="Coba Lagi"
          onConfirm={handleAiRefine}
          onCancel={() => setShowAiRefineRetry(false)}
        />
      )}
      {journalToDelete && (
        <ConfirmationModal
            title="Hapus Jurnal"
            message={`Apakah Anda yakin ingin menghapus jurnal untuk tanggal ${new Date(journalToDelete.journalDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}?`}
            confirmText="Ya, Hapus"
            onConfirm={handleConfirmDelete}
            onCancel={() => setJournalToDelete(null)}
            isDestructive={true}
        />
      )}

      {/* Hidden div for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px' }}>
          <div ref={pdfContentRef} className={`p-12 ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-black'}`}>
              <div className="flex items-center justify-between mb-8 pb-4 border-b-2" style={{ borderColor: theme === 'dark' ? '#475569' : '#e2e8f0' }}>
                  <div>
                    <h1 className="text-4xl font-bold">{journalTitle || "Jurnal Harian"}</h1>
                    <p className="text-lg" style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <FlowmindIcon className="w-12 h-12" style={{ color: '#2563eb' }}/>
              </div>
              
              {completedTasksForDate.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">Tugas yang Diselesaikan</h2>
                    <ul className="list-disc list-inside space-y-2">
                        {completedTasksForDate.map(task => <li key={task.id}>{task.title}</li>)}
                    </ul>
                </div>
              )}

              {notes.trim() && (
                 <div>
                    <h2 className="text-2xl font-bold mb-4">Catatan & Refleksi</h2>
                    <div className="prose prose-lg whitespace-pre-wrap" style={{ color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }}>{notes}</div>
                </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default JournalView;
