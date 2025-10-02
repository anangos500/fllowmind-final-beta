import React, { useState, useEffect } from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface DeleteSuccessModalProps {
  onClose: () => void;
}

const DeleteSuccessModal: React.FC<DeleteSuccessModalProps> = ({ onClose }) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 4000); // Automatically close after 4 seconds

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 300); // Animation duration
  };

  return (
    <div className={`fixed inset-0 bg-black flex justify-center items-center z-[120] p-4 transition-opacity duration-300 ${isAnimatingOut ? 'bg-opacity-0' : 'bg-opacity-50'}`}>
      <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm transition-all duration-300 ease-out text-center p-8 ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">Akun Berhasil Dihapus</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          Semua data Anda telah dihapus. Anda akan dialihkan ke halaman masuk.
        </p>
        <button
            onClick={handleClose}
            className="w-full px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
            Oke
        </button>
      </div>
    </div>
  );
};

export default DeleteSuccessModal;
