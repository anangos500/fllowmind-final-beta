
import React from 'react';
import CalendarIcon from './icons/CalendarIcon';
import SunIcon from './icons/SunIcon';
import BarChartIcon from './icons/BarChartIcon';
import { View } from '../types';
import BellIcon from './icons/BellIcon';
import { useAuth } from '../contexts/AuthContext';
import LogoutIcon from './icons/LogoutIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import { useTheme } from '../contexts/ThemeContext';
import MoonIcon from './icons/MoonIcon';
import FlowmindIcon from './icons/FlowmindIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import TiktokIcon from './icons/TiktokIcon';
import InstagramIcon from './icons/InstagramIcon';
import ThreadsIcon from './icons/ThreadsIcon';
import SettingsIcon from './icons/SettingsIcon';
import MicIcon from './icons/MicIcon';


interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  // FIX: Update notification permission type to align with modern PermissionState.
  notificationPermission: 'granted' | 'denied' | 'prompt';
  requestNotificationPermission: () => void;
  micPermission: 'default' | 'granted' | 'denied' | 'prompt';
  requestMicPermission: () => void;
  onLogoutRequest: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg'
        : 'text-slate-500 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100'
    }`}
  >
    {React.cloneElement(icon, { className: 'w-6 h-6' })}
    <span className="font-semibold">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, notificationPermission, requestNotificationPermission, micPermission, requestMicPermission, onLogoutRequest, isOpen, onClose }) => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity duration-300 ${
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            ></div>
            <aside className={`w-64 bg-slate-100 dark:bg-slate-800 p-6 flex flex-col fixed inset-y-0 left-0 h-full border-r border-slate-200 dark:border-slate-700 z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="mb-10">
                    <div className="flex items-center space-x-3">
                        <FlowmindIcon className="w-8 h-8 text-blue-600"/>
                        <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">Flowmind</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-11">by Aospheree.ai</p>
                </div>

                <nav className="space-y-3 flex-grow" data-tour-id="sidebar-nav">
                    <NavItem icon={<SunIcon />} label="Hari Ini" isActive={currentView === 'daily'} onClick={() => onViewChange('daily')} />
                    <div data-tour-id="overdue-nav">
                        <NavItem icon={<AlertTriangleIcon />} label="Tugas Terlewat" isActive={currentView === 'overdue'} onClick={() => onViewChange('overdue')} />
                    </div>
                    <div data-tour-id="weekly-nav">
                        <NavItem icon={<CalendarIcon />} label="Mingguan" isActive={currentView === 'weekly'} onClick={() => onViewChange('weekly')} />
                    </div>
                    <div data-tour-id="monthly-nav">
                        <NavItem icon={<BarChartIcon />} label="Bulanan" isActive={currentView === 'monthly'} onClick={() => onViewChange('monthly')} />
                    </div>
                    <div data-tour-id="journal-nav">
                        <NavItem icon={<BookOpenIcon />} label="Jurnal" isActive={currentView === 'journal'} onClick={() => onViewChange('journal')} />
                    </div>
                    <div data-tour-id="settings-nav">
                        <NavItem icon={<SettingsIcon />} label="Pengaturan" isActive={currentView === 'settings'} onClick={() => onViewChange('settings')} />
                    </div>
                </nav>

                <div className="space-y-4">
                    {user && (
                        <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-lg">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-200 truncate text-center" title={user.email || ''}>
                                {user.email}
                            </p>
                        </div>
                    )}
                    {/* FIX: Tampilkan tombol untuk meminta izin notifikasi jika statusnya 'prompt'. */}
                    {notificationPermission === 'prompt' && (
                        <button 
                            onClick={requestNotificationPermission}
                            className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg text-slate-600 dark:text-amber-200 bg-amber-100 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800/80 transition-colors"
                        >
                            <BellIcon className="w-6 h-6" />
                            <span className="font-semibold text-sm">Aktifkan Notifikasi</span>
                        </button>
                    )}
                     {notificationPermission === 'denied' && (
                        <button 
                            disabled
                            title="Izin notifikasi diblokir di pengaturan browser Anda."
                            className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 cursor-not-allowed"
                        >
                            <BellIcon className="w-6 h-6" />
                            <span className="font-semibold text-sm">Notifikasi Diblokir</span>
                        </button>
                    )}
                     {(micPermission === 'default' || micPermission === 'prompt') && (
                        <button 
                            onClick={requestMicPermission}
                            className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg text-slate-600 dark:text-rose-200 bg-rose-100 dark:bg-rose-800/50 hover:bg-rose-200 dark:hover:bg-rose-800/80 transition-colors"
                        >
                            <MicIcon className="w-6 h-6" />
                            <span className="font-semibold text-sm">Aktifkan Mikrofon</span>
                        </button>
                    )}
                     {micPermission === 'denied' && (
                        <button 
                            disabled
                            title="Izin mikrofon diblokir di pengaturan browser Anda."
                            className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 cursor-not-allowed"
                        >
                            <MicIcon className="w-6 h-6" />
                            <span className="font-semibold text-sm">Mikrofon Diblokir</span>
                        </button>
                    )}
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={onLogoutRequest}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            <LogoutIcon className="w-6 h-6" />
                            <span className="font-semibold">Keluar</span>
                        </button>
                        <button 
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            className="p-3 rounded-lg text-slate-500 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
                        </button>
                    </div>
                    <div className="flex justify-center items-center space-x-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <a href="https://www.tiktok.com/@aos_2110" target="_blank" rel="noopener noreferrer" aria-label="Tiktok" className="text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <TiktokIcon className="w-5 h-5" />
                        </a>
                        <a href="https://www.threads.net/@aospheree.ai" target="_blank" rel="noopener noreferrer" aria-label="Threads" className="text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <ThreadsIcon className="w-5 h-5" />
                        </a>
                        <a href="https://www.instagram.com/aospheree.ai/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <InstagramIcon className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
