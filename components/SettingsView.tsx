import React, { useState, useEffect, useRef } from 'react';
import { Profile } from '../types';
import { User } from '@supabase/supabase-js';
import PlayIcon from './icons/PlayIcon';
import StopCircleIcon from './icons/StopCircleIcon';

// The user prop is added to display the correct email address.
interface SettingsViewProps {
  user: User | null;
  profile: Profile | null;
  onUpdateProfile: (updates: Partial<Omit<Profile, 'id'>>) => Promise<void>;
  onDeleteAccountRequest: () => void;
}

// A list of available alarm sounds for the user to choose from.
const soundOptions = [
    { name: 'Bedside Clock (Default)', url: 'https://dl.dropboxusercontent.com/scl/fi/4weoragikbg2q96agaxdc/Bedside-Clock-Alarm.mp3?rlkey=nmbi5zgqtl7xconrb729k9csz' },
    { name: 'Clock Alarm', url: 'https://dl.dropboxusercontent.com/scl/fi/5kt2g2bwnsvxyyunalmwj/Kring-Clock-Alarm.mp3?rlkey=n3karsc0vls8kfcy4l7t2rmly' },
    { name: 'Funny Alarm', url: 'https://dl.dropboxusercontent.com/scl/fi/5ih8ac0e8f6vtjlgrtblq/Funny-Alarm.mp3?rlkey=4zckls4ob87hsyobgfzqdru6p' },
];

const DEFAULT_ALARM_URL = soundOptions[0].url;

const ToggleSwitch: React.FC<{
    label: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}> = ({ label, description, enabled, onChange }) => (
    <div
        className="flex justify-between items-center p-4 rounded-lg bg-slate-100 dark:bg-slate-700/50"
    >
        <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">{label}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <button
            onClick={() => onChange(!enabled)}
            type="button"
            role="switch"
            aria-checked={enabled}
            className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 ${
                enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    </div>
);


const SettingsView: React.FC<SettingsViewProps> = ({ user, profile, onUpdateProfile, onDeleteAccountRequest }) => {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hentikan audio saat komponen dilepas
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handlePreviewSound = (url: string) => {
    if (audioRef.current && playingUrl === url) {
      // Jika suara yang sama sedang diputar, hentikan
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingUrl(null);
    } else {
      // Hentikan suara yang sedang diputar (jika ada)
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Putar suara baru
      const newAudio = new Audio(url);
      audioRef.current = newAudio;
      setPlayingUrl(url);

      newAudio.play().catch(e => {
          console.error("Pemutaran audio gagal:", e);
          setPlayingUrl(null); // Reset state jika gagal
      });

      // Saat suara selesai, reset state pemutaran
      newAudio.onended = () => {
        setPlayingUrl(null);
      };
    }
  };
  
  if (!profile || !user) {
    return <div className="p-8 text-center">Memuat profil...</div>;
  }
  
  const handleNotificationSettingChange = (key: 'playFocusEndSound' | 'playBreakEndSound' | 'focusEndSound' | 'breakEndSound', value: boolean | string) => {
    onUpdateProfile({ [key]: value });
  };

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Pengaturan</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola preferensi akun dan aplikasi Anda.</p>
      </header>

      <div className="space-y-8">
        {/* Account Section */}
        <section>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">Akun</h2>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
              <span className="font-semibold text-slate-600 dark:text-slate-300 mb-2 sm:mb-0">Alamat Email</span>
              <span className="font-medium text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-md">{user.email}</span>
            </div>
          </div>
        </section>
        
        {/* Notification Settings Section */}
        <section>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">Notifikasi Fokus</h2>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm space-y-4">
            <div>
                <ToggleSwitch
                    label="Alarm Selesai Sesi Fokus"
                    description="Putar suara saat timer fokus berakhir."
                    enabled={profile.playFocusEndSound !== false}
                    onChange={(enabled) => handleNotificationSettingChange('playFocusEndSound', enabled)}
                />
                {profile.playFocusEndSound !== false && (
                    <div className="mt-3 pl-4 flex items-center space-x-2">
                        <select
                            id="focus-sound-select"
                            value={profile.focusEndSound || DEFAULT_ALARM_URL}
                            onChange={(e) => handleNotificationSettingChange('focusEndSound', e.target.value)}
                            className="p-2 w-full max-w-xs rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {soundOptions.map(opt => <option key={opt.name} value={opt.url}>{opt.name}</option>)}
                        </select>
                        <button
                          onClick={() => handlePreviewSound(profile.focusEndSound || DEFAULT_ALARM_URL)}
                          className="p-2 text-slate-500 bg-slate-200 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-slate-500 transition-colors"
                          aria-label="Pratinjau Suara"
                        >
                          {playingUrl === (profile.focusEndSound || DEFAULT_ALARM_URL) ? (
                              <StopCircleIcon className="w-5 h-5" />
                          ) : (
                              <PlayIcon className="w-5 h-5" />
                          )}
                        </button>
                    </div>
                )}
            </div>
            
             <div className="border-t border-slate-200 dark:border-slate-700"></div>

             <div>
                <ToggleSwitch
                    label="Alarm Selesai Sesi Istirahat"
                    description="Putar suara saat timer istirahat berakhir."
                    enabled={profile.playBreakEndSound !== false}
                    onChange={(enabled) => handleNotificationSettingChange('playBreakEndSound', enabled)}
                />
                 {profile.playBreakEndSound !== false && (
                    <div className="mt-3 pl-4 flex items-center space-x-2">
                        <select
                            id="break-sound-select"
                            value={profile.breakEndSound || DEFAULT_ALARM_URL}
                            onChange={(e) => handleNotificationSettingChange('breakEndSound', e.target.value)}
                            className="p-2 w-full max-w-xs rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {soundOptions.map(opt => <option key={opt.name} value={opt.url}>{opt.name}</option>)}
                        </select>
                         <button
                          onClick={() => handlePreviewSound(profile.breakEndSound || DEFAULT_ALARM_URL)}
                          className="p-2 text-slate-500 bg-slate-200 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-slate-500 transition-colors"
                          aria-label="Pratinjau Suara"
                        >
                          {playingUrl === (profile.breakEndSound || DEFAULT_ALARM_URL) ? (
                              <StopCircleIcon className="w-5 h-5" />
                          ) : (
                              <PlayIcon className="w-5 h-5" />
                          )}
                        </button>
                    </div>
                )}
            </div>
          </div>
        </section>

        {/* Danger Zone Section */}
        <section>
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4 pb-2 border-b border-red-200 dark:border-red-800">Zona Bahaya</h2>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between sm:items-center">
            <div>
              <h4 className="font-bold text-red-800 dark:text-red-300">Hapus Akun</h4>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                Tindakan ini akan menghapus semua data Anda secara permanen.
              </p>
            </div>
            <button 
                onClick={onDeleteAccountRequest}
                className="mt-4 sm:mt-0 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm w-full sm:w-auto"
            >
              Hapus Akun Saya
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;