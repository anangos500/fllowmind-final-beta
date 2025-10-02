
import React, { useState, useEffect } from 'react';
import DownloadCloudIcon from './icons/DownloadCloudIcon';
import XIcon from './icons/XIcon';

interface InstallPwaPromptProps {
  isVisible: boolean;
  isIos: boolean;
  onInstall: () => void;
  onClose: () => void;
}

const InstallPwaPrompt: React.FC<InstallPwaPromptProps> = ({ isVisible, isIos, onInstall, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
    }
  }, [isVisible]);

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShow(false);
    // Beri waktu untuk animasi sebelum memanggil onClose dari induk
    setTimeout(onClose, 300);
  };

  if (!isVisible) {
    return null;
  }

  const iosInstructions = (
    <div className="text-center">
      <p className="font-semibold mb-2">Instal Aplikasi Ini</p>
      <p className="text-sm">
        Ketuk ikon 'Bagikan' <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-middle"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> di browser Anda, lalu pilih 'Tambah ke Layar Utama'.
      </p>
    </div>
  );

  const desktopAndroidPrompt = (
    <>
      <DownloadCloudIcon className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      <div className="flex-grow">
        <p className="font-semibold text-slate-800 dark:text-slate-200">Instal Flowmind</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Dapatkan pengalaman yang lebih cepat dan bebas gangguan (klik instal, proses tidak sampai 1 menit!).</p>
      </div>
      <button
        onClick={onInstall}
        className="ml-4 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0"
      >
        Instal
      </button>
    </>
  );

  return (
    <div
      className={`fixed top-4 right-4 sm:max-w-md z-50 transition-all duration-300 ease-out ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12'}`}
      role="alert"
      aria-live="polite"
    >
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl p-4 flex items-center">
        {isIos ? iosInstructions : desktopAndroidPrompt}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
          aria-label="Tutup"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPwaPrompt;
