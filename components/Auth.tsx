

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FlowmindIcon from './icons/FlowmindIcon';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';
import CheckIcon from './icons/CheckIcon';

type AuthView = 'login' | 'signup' | 'forgotPassword' | 'updatePassword';

const Auth: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [updatePasswordSuccess, setUpdatePasswordSuccess] = useState(false);
  
  const { 
    signInWithPassword, 
    signUp, 
    signOut,
    resetPasswordForEmail, 
    isPasswordRecovery, 
    updateUserPassword,
    clearPasswordRecoveryFlag
  } = useAuth();

  useEffect(() => {
    if (isPasswordRecovery) {
      setView('updatePassword');
    }
  }, [isPasswordRecovery]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await signInWithPassword(email, password);
      if (error) throw error;
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await signUp(email, password, username);
      if (error) throw error;
      setMessage('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.');
      setEmail('');
      setPassword('');
      setUsername('');
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await resetPasswordForEmail(email);
      if (error) throw error;
      setForgotPasswordSuccess(true);
      setMessage('Jika email terdaftar, tautan untuk mereset password telah dikirim ke kotak masuk Anda.');
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setError("Password tidak memenuhi persyaratan keamanan.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await updateUserPassword(password);
      if (error) throw error;
      setUpdatePasswordSuccess(true);
      setMessage("Password Anda berhasil diperbarui. Silakan kembali ke halaman masuk untuk login.");
      // Note: signOut is now handled by the user clicking the 'Continue to Login' button
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setMessage(null);
    setPassword('');
    setForgotPasswordSuccess(false);
    setUpdatePasswordSuccess(false);
    if (newView !== 'forgotPassword') {
        setEmail('');
    }
    if (newView === 'signup') {
        setUsername('');
    }
  };
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);

  const renderPasswordValidation = () => (
    <div className="space-y-1 mt-3 text-xs">
      <p className={`flex items-center transition-colors ${hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
        <CheckIcon className="w-3.5 h-3.5 mr-2" />
        Minimal 8 karakter
      </p>
      <p className={`flex items-center transition-colors ${hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
        <CheckIcon className="w-3.5 h-3.5 mr-2" />
        Minimal 1 huruf besar
      </p>
      <p className={`flex items-center transition-colors ${hasNumber ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
        <CheckIcon className="w-3.5 h-3.5 mr-2" />
        Minimal 1 angka
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
            <div className="flex justify-center items-center">
                <FlowmindIcon className="w-10 h-10 text-blue-600" />
                <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200 ml-3">Flowmind</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">by Aospheree.ai</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          {view === 'login' && (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Selamat Datang Kembali</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Masuk untuk melanjutkan</p>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="email">Alamat Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="password">Password</label>
                  <div className="relative"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 pr-10 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 dark:text-slate-400">{showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}</button></div>
                </div>
                {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
                {message && <p className="text-green-500 text-sm text-center pt-2">{message}</p>}
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-slate-400">{loading ? 'Memproses...' : 'Masuk'}</button>
              </form>
              <div className="text-center mt-6 space-y-2">
                <button onClick={() => switchView('signup')} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Belum punya akun? Daftar</button>
                <br/>
                <button onClick={() => switchView('forgotPassword')} className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:underline">Lupa password?</button>
              </div>
            </>
          )}
          
          {view === 'signup' && (
             <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Buat Akun Baru</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Mulai atur tugas Anda</p>
              </div>
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                 {message && <p className="text-green-500 text-sm text-center pb-2">{message}</p>}
                 {error && <p className="text-red-500 text-sm text-center pb-2">{error}</p>}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="username">Nama Lengkap</label>
                  <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="email">Alamat Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="password">Password</label>
                  <div className="relative"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 pr-10 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 dark:text-slate-400">{showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}</button></div>
                  {password.length > 0 && renderPasswordValidation()}
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-slate-400">{loading ? 'Memproses...' : 'Daftar'}</button>
              </form>
              <div className="text-center mt-6">
                <button onClick={() => switchView('login')} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Sudah punya akun? Masuk</button>
              </div>
            </>
          )}

          {view === 'forgotPassword' && (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Reset Password</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    {forgotPasswordSuccess ? 'Tautan Terkirim!' : 'Masukkan email Anda untuk menerima tautan reset.'}
                </p>
              </div>
              {forgotPasswordSuccess ? (
                <div className="text-center">
                    <p className="text-green-600 dark:text-green-400 text-sm mb-6">{message}</p>
                    <button onClick={() => switchView('login')} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300">Kembali ke Login</button>
                </div>
              ) : (
                <>
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                        <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="email">Alamat Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-slate-400">{loading ? 'Mengirim...' : 'Kirim Tautan'}</button>
                    </form>
                    <div className="text-center mt-6">
                        <button onClick={() => switchView('login')} className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:underline">Kembali ke halaman Masuk</button>
                    </div>
                </>
              )}
            </>
          )}

          {view === 'updatePassword' && (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Buat Password Baru</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    {updatePasswordSuccess ? 'Berhasil!' : 'Masukkan password baru yang aman.'}
                </p>
              </div>
              {updatePasswordSuccess ? (
                <div className="text-center">
                    <p className="text-green-600 dark:text-green-400 text-sm mb-6">{message}</p>
                    <button 
                        onClick={async () => {
                            // First, sign out of the temporary recovery session
                            await signOut();
                            // Then, clear the flag that indicates we are in recovery mode
                            clearPasswordRecoveryFlag();
                            // Finally, switch the UI back to the login form
                            switchView('login');
                        }} 
                        className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                    >
                        Lanjutkan ke Login
                    </button>
                </div>
              ) : (
                <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
                    <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="password">Password Baru</label>
                    <div className="relative"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 pr-10 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 dark:text-slate-400">{showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}</button></div>
                    {password.length > 0 && renderPasswordValidation()}
                    </div>
                    {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-slate-400">{loading ? 'Memperbarui...' : 'Perbarui Password'}</button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;