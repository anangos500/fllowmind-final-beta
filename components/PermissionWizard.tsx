import React, { useState, useEffect } from 'react';
import BellIcon from './icons/BellIcon';
import MicIcon from './icons/MicIcon';

interface PermissionWizardProps {
  onRequestNotificationPermission: () => void;
  onRequestMicPermission: () => Promise<void>;
  onClose: (skipped: boolean) => void;
}

const PermissionWizard: React.FC<PermissionWizardProps> = ({
  onRequestNotificationPermission,
  onRequestMicPermission,
  onClose,
}) => {
  const [visible, setVisible] = useState(false);
  const [notifStatus, setNotifStatus] = useState(Notification.permission);
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    
    // The Permissions API query for microphone can be unreliable on Android,
    // often defaulting to 'denied' until a user gesture triggers a request.
    // By removing the initial check (`navigator.permissions.query`), we ensure
    // the button is always enabled by default. The `handleRequestMic` function,
    // which uses the more reliable `getUserMedia`, will then correctly handle
    // the permission request and update the UI state.
    
    // Watch for notification status changes (can happen outside the component)
    const interval = setInterval(() => {
        if (Notification.permission !== notifStatus) {
            setNotifStatus(Notification.permission);
        }
    }, 500);

    return () => clearInterval(interval);

  }, [notifStatus]);

  const handleRequestNotifications = () => {
    onRequestNotificationPermission();
  };
  
  const handleRequestMic = async () => {
    // Prop `onRequestMicPermission` dari App.tsx tidak mengembalikan hasil
    // permintaan izin, yang diperlukan untuk memperbarui UI secara andal di semua platform (terutama iOS).
    // Oleh karena itu, kita menangani panggilan `getUserMedia` secara langsung di sini untuk memastikan fungsionalitas yang benar.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Jika promise berhasil, izin diberikan.
      setMicStatus('granted');
      // Segera hentikan stream; kita hanya membutuhkannya untuk memicu prompt izin.
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      // Jika promise gagal, izin ditolak.
      console.error("Izin mikrofon ditolak:", err);
      setMicStatus('denied');
    }
  };
  
  const handleClose = (skipped: boolean) => {
    setVisible(false);
    setTimeout(() => onClose(skipped), 300);
  };
  
  const allPermissionsSet = notifStatus !== 'default' && micStatus !== 'prompt';

  useEffect(() => {
    if (allPermissionsSet) {
        // If all permissions are handled, close the wizard automatically
        handleClose(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPermissionsSet]);


  return (
    <div className={`fixed inset-0 bg-black flex justify-center items-center z-[100] p-4 transition-opacity duration-300 ${visible ? 'bg-opacity-50' : 'bg-opacity-0'}`}>
      <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md transition-all duration-300 ease-out overflow-hidden ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <header className="p-6 text-center border-b dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Aktifkan Fitur Cerdas</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Dapatkan pengalaman terbaik dari Flowmind.</p>
        </header>
        <main className="p-6 space-y-5">
            {/* Notification Permission */}
            <div className={`flex items-center p-4 rounded-xl transition-all ${notifStatus === 'default' ? 'bg-slate-50 dark:bg-slate-700/50' : 'opacity-60'}`}>
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                    <BellIcon className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-grow">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Notifikasi Tepat Waktu</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Dapatkan pengingat saat tugas akan berakhir.</p>
                </div>
                <button
                    onClick={handleRequestNotifications}
                    disabled={notifStatus !== 'default'}
                    className="ml-4 px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-500 dark:disabled:bg-slate-600 disabled:text-slate-100 dark:disabled:text-slate-300"
                >
                    {notifStatus === 'default' ? 'Aktifkan' : (notifStatus === 'granted' ? 'Diizinkan' : 'Ditolak')}
                </button>
            </div>
            
            {/* Microphone Permission */}
            <div className={`flex items-center p-4 rounded-xl transition-all ${micStatus === 'prompt' ? 'bg-slate-50 dark:bg-slate-700/50' : 'opacity-60'}`}>
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
                    <MicIcon className="w-6 h-6" />
                </div>
                <div className="ml-4 flex-grow">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Perintah Suara</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Klik ikon mic untuk menambahkan tugas via suara.</p>
                </div>
                <button
                    onClick={handleRequestMic}
                    disabled={micStatus !== 'prompt'}
                    className="ml-4 px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-500 dark:disabled:bg-slate-600 disabled:text-slate-100 dark:disabled:text-slate-300"
                >
                    {micStatus === 'prompt' ? 'Aktifkan' : (micStatus === 'granted' ? 'Diizinkan' : 'Ditolak')}
                </button>
            </div>

        </main>
        <footer className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-center">
            <button
              onClick={() => handleClose(true)}
              className="px-6 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              Lewati untuk sekarang
            </button>
        </footer>
      </div>
    </div>
  );
};

export default PermissionWizard;
