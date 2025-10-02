import React, { useState } from 'react';
import XIcon from './icons/XIcon';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';

interface DeleteAccountModalProps {
  onClose: () => void;
  onConfirmDelete: (password: string) => Promise<void>;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ onClose, onConfirmDelete }) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isLoading) return;
    setIsAnimatingOut(true);
    setTimeout(onClose, 300);
  };

  const handleConfirm = async () => {
    if (!password) {
      setError('Password harus diisi.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await onConfirmDelete(password);
      // The parent component will handle closing the modal on success
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black flex justify-center items-center z-[110] p-4 transition-opacity duration-300 ${isAnimatingOut ? 'bg-opacity-0' : 'bg-opacity-50'}`}>
      <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md transition-all duration-300 ease-out overflow-hidden ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <header className="p-5 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Konfirmasi Hapus Akun</h2>
          <button type="button" onClick={handleClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="p-6">
          <p className="text-slate-600 dark:text-slate-300 mb-4 text-center">
            Ini adalah tindakan permanen dan tidak dapat diurungkan. Semua tugas, jurnal, dan data akun Anda akan dihapus.
          </p>
          <p className="text-slate-600 dark:text-slate-300 mb-4 text-center font-semibold">
            Untuk melanjutkan, silakan masukkan kata sandi Anda.
          </p>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="password-confirm">Password</label>
            <div className="relative">
              <input 
                id="password-confirm" 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="w-full px-4 py-3 pr-10 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={isLoading}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 dark:text-slate-400"
                disabled={isLoading}
              >
                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
          </div>
        </main>
        
        <footer className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !password}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Menghapus...' : 'Hapus Akun Secara Permanen'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default DeleteAccountModal;