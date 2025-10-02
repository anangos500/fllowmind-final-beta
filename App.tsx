
import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import MonthlyView from './components/MonthlyView';
import JournalView from './components/JournalView';
import AddTaskModal from './components/AddTaskModal';
import TaskDetailModal from './components/TaskDetailModal';
import FocusMode from './components/FocusMode';
import PlusIcon from './components/icons/PlusIcon';
import { useTasks } from './hooks/useTasks';
import { useJournals } from './hooks/useJournals';
import { View, Task, TaskStatus, Recurrence } from './types';
import { useNotifications } from './hooks/useNotifications';
import { FocusTimerProvider, useFocusTimer } from './contexts/FocusTimerContext';
import FloatingFocusWidget from './components/FloatingFocusWidget';
import { useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import OverdueView from './components/OverdueView';
import OnboardingTour from './components/OnboardingTour';
import MenuIcon from './components/icons/MenuIcon';
import FlowmindIcon from './components/icons/FlowmindIcon';
import AiAssistant from './components/AiAssistant';
import SparklesBotIcon from './components/icons/SparklesBotIcon';
import ConfirmationModal from './components/ConfirmationModal';
import { usePwaInstall } from './hooks/usePwaInstall';
import InstallPwaPrompt from './components/InstallPwaPrompt';
import PermissionWizard from './components/PermissionWizard';
import SettingsView from './components/SettingsView';
import DeleteAccountModal from './components/DeleteAccountModal';
import DeleteSuccessModal from './components/DeleteSuccessModal';


const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(() => {
    const savedView = localStorage.getItem('flowmind-currentView') as View;
    const validViews: View[] = ['daily', 'overdue', 'weekly', 'monthly', 'journal', 'settings'];
    return savedView && validViews.includes(savedView) ? savedView : 'daily';
  });

  const { tasks, addTask, updateTask, deleteTask, bulkDeleteTasks, bulkUpdateTasks, loading: tasksLoading, error: tasksError } = useTasks();
  const { journals, loading: journalsLoading, error: journalsError, createOrUpdateJournal, downloadJournal, deleteJournal } = useJournals();
  const { notificationPermission, requestNotificationPermission } = useNotifications(tasks);
  const { session, signOut, profile, updateUserProfile } = useAuth();
  
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [tourFakeTask, setTourFakeTask] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [initialTaskData, setInitialTaskData] = useState<Omit<Task, 'id' | 'createdAt' | 'userId'> | null>(null);
  const { installPrompt, triggerInstall } = usePwaInstall();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const [showPermissionWizard, setShowPermissionWizard] = useState(false);
  const [isDeleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  // FIX: Broaden the micPermission state type to include 'prompt', which is a valid
  // value from the Permissions API, resolving TypeScript errors on lines 69 and 72.
  const [micPermission, setMicPermission] = useState<'default' | 'granted' | 'denied' | 'prompt'>('default');

  // Memeriksa dan memantau status izin mikrofon
  const checkMicPermission = useCallback(async () => {
    // Permissions API mungkin tidak tersedia di semua browser
    if (!navigator.permissions) return;
    try {
      // 'microphone' as PermissionName adalah type cast untuk TypeScript
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicPermission(permissionStatus.state);
      // Dengarkan perubahan status izin
      permissionStatus.onchange = () => {
        setMicPermission(permissionStatus.state);
      };
    } catch (err) {
      console.error("Tidak dapat menanyakan izin mikrofon:", err);
    }
  }, []);

  useEffect(() => {
    checkMicPermission();
  }, [checkMicPermission]);

  const requestMicPermission = useCallback(async () => {
    try {
      // Meminta izin akan memicu pembaruan status melalui event 'onchange'
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Permintaan izin mikrofon gagal:", err);
      // Periksa ulang status setelah permintaan, karena bisa jadi 'denied'
      checkMicPermission();
    }
  }, [checkMicPermission]);

  useEffect(() => {
    localStorage.setItem('flowmind-currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    let wizardTimer: number | undefined;
    const checkPermissions = async () => {
      if (sessionStorage.getItem('flowmind-permission-wizard-dismissed') || showTour) {
        return;
      }
      // FIX: Check for 'prompt' for notification permission as the hook now normalizes 'default' to 'prompt'.
      if (notificationPermission === 'prompt' || micPermission === 'default' || micPermission === 'prompt') {
        wizardTimer = window.setTimeout(() => setShowPermissionWizard(true), 1500);
      }
    };
    if (profile) {
      checkPermissions();
    }
    return () => clearTimeout(wizardTimer);
  }, [profile, showTour, notificationPermission, micPermission]);

  useEffect(() => {
    if (profile && profile.hasCompletedOnboarding === false) {
      setShowTour(true);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(10, 30, 0, 0);
      const yesterdayEnd = new Date(yesterday.getTime() + 3600000);
      setTourFakeTask({
        id: 'tour-fake-task-overdue',
        title: 'Contoh Tugas Terlewat',
        startTime: yesterday.toISOString(),
        endTime: yesterdayEnd.toISOString(),
        status: TaskStatus.ToDo,
        checklist: [],
        notes: 'Ini adalah contoh tugas yang sudah melewati batas waktunya.',
        isImportant: false,
        recurrence: Recurrence.None,
        createdAt: yesterday.toISOString(),
      });
    }
  }, [profile]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const hasClosedPrompt = sessionStorage.getItem('flowmind-install-prompt-closed') === 'true';
    if (isStandalone || hasClosedPrompt) return;
    if (installPrompt || isIos) {
      const timer = setTimeout(() => setShowInstallPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [installPrompt, isIos]);

  const { visibility, startFocusSession } = useFocusTimer();
  const handleSelectTask = useCallback((task: Task) => {
    if (task.id === 'tour-fake-task-overdue') return;
    setSelectedTask(task);
  }, []);

  const handleCloseDetailModal = useCallback(() => setSelectedTask(null), []);
  const handleStartFocus = useCallback((task: Task) => {
    startFocusSession(task);
    setSelectedTask(null);
  }, [startFocusSession]);

  const handleTourStepChange = useCallback((stepIndex: number) => {
    const viewMap: { [key: number]: View } = { 2: 'overdue', 3: 'overdue', 6: 'weekly', 7: 'monthly', 8: 'journal', 9: 'settings', 10: 'settings', 11: 'settings' };
    setCurrentView(viewMap[stepIndex] || 'daily');
    if (window.innerWidth < 1024) {
      setIsSidebarOpen([1, 2, 6, 7, 8, 9].includes(stepIndex));
    }
  }, []);

  const handleTourClose = () => {
    setShowTour(false);
    setTourFakeTask(null);
    setIsSidebarOpen(false);
    if (profile && !profile.hasCompletedOnboarding) {
      updateUserProfile({ hasCompletedOnboarding: true });
    }
  };

  const handleOpenManualAdd = (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'>) => {
    setInitialTaskData(taskData);
    setAddModalOpen(true);
  };

  const handleWizardClose = (skipped: boolean) => {
    setShowPermissionWizard(false);
    if (skipped) sessionStorage.setItem('flowmind-permission-wizard-dismissed', 'true');
  };

  const handleSuccessModalClose = () => {
    setShowDeleteSuccess(false);
    signOut();
  };

  const handleDeleteAccount = async (password: string): Promise<void> => {
    if (!session) throw new Error("Sesi tidak ditemukan.");
    const response = await fetch('/.netlify/functions/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Gagal menghapus akun.');
    }
    setDeleteAccountModalOpen(false);
    setShowDeleteSuccess(true);
  };

  const renderView = () => {
    if (tasksLoading || journalsLoading) return <div className="flex h-full items-center justify-center"><p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Memuat data...</p></div>;
    const combinedError = tasksError || journalsError;
    if (combinedError) return (
      <div className="flex h-full items-center justify-center p-4 sm:p-8">
        <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 px-6 py-4 rounded-xl text-center shadow-md" role="alert">
          <strong className="font-bold text-lg">Oops! Terjadi kesalahan.</strong>
          <p className="mt-2">{combinedError}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">Ini bisa terjadi jika ada masalah dengan koneksi ke database atau jika tabel belum disiapkan. Silakan periksa konsol untuk detail teknis.</p>
        </div>
      </div>
    );
    switch (currentView) {
      case 'daily': return <DailyView tasks={tasks} onSelectTask={handleSelectTask} onUpdateTask={updateTask} onBulkUpdateTasks={bulkUpdateTasks} onDeleteTask={deleteTask} onAddTask={addTask} onOpenManualAdd={handleOpenManualAdd} />;
      case 'overdue': return <OverdueView tasks={showTour && tourFakeTask ? [...tasks, tourFakeTask] : tasks} onSelectTask={handleSelectTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} onBulkDeleteTask={bulkDeleteTasks} />;
      case 'weekly': return <WeeklyView tasks={tasks} onSelectTask={handleSelectTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} />;
      case 'monthly': return <MonthlyView tasks={tasks} />;
      case 'journal': return <JournalView tasks={tasks} journals={journals} createOrUpdateJournal={createOrUpdateJournal} downloadJournal={downloadJournal} deleteJournal={deleteJournal} />;
      case 'settings': return <SettingsView user={session?.user || null} profile={profile} onUpdateProfile={updateUserProfile} onDeleteAccountRequest={() => setDeleteAccountModalOpen(true)} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen font-sans text-slate-800 dark:text-slate-200 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onViewChange={view => { setCurrentView(view); setIsSidebarOpen(false); }}
        notificationPermission={notificationPermission}
        requestNotificationPermission={requestNotificationPermission}
        micPermission={micPermission}
        requestMicPermission={requestMicPermission}
        onLogoutRequest={() => setShowLogoutConfirm(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 lg:ml-64 overflow-y-auto bg-slate-50 dark:bg-slate-900 w-full">
        <header className="lg:hidden sticky top-0 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md z-10 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 dark:text-slate-300"><MenuIcon className="w-6 h-6" /></button>
          <div className="flex items-center space-x-2"><FlowmindIcon className="w-6 h-6 text-blue-600" /><span className="text-lg font-bold text-slate-800 dark:text-slate-200">Flowmind</span></div>
          <div className="w-6"></div>
        </header>
        {renderView()}
      </main>
      
      {isAiAssistantOpen && <AiAssistant onClose={() => setIsAiAssistantOpen(false)} />}
      <div className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 flex flex-col items-center gap-4 z-20">
        <button onClick={() => setIsAiAssistantOpen(true)} data-tour-id="ai-assistant-button" aria-label="Buka Asisten AI" className="bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800"><SparklesBotIcon className="w-6 h-6" /></button>
        <button onClick={() => setAddModalOpen(true)} data-tour-id="add-task-button" aria-label="Tambah Tugas Baru" className="bg-blue-600 text-white w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"><PlusIcon className="w-7 h-7 lg:w-8 lg:h-8" /></button>
      </div>
      {isAddModalOpen && <AddTaskModal initialData={initialTaskData} tasks={tasks} onClose={() => { setAddModalOpen(false); setInitialTaskData(null); }} onAddTask={addTask} />}
      {selectedTask && <TaskDetailModal task={selectedTask} tasks={tasks} onClose={handleCloseDetailModal} onUpdate={updateTask} onDelete={deleteTask} onStartFocus={handleStartFocus} />}
      {showPermissionWizard && <PermissionWizard onRequestNotificationPermission={requestNotificationPermission} onRequestMicPermission={requestMicPermission} onClose={handleWizardClose} />}
      {isDeleteAccountModalOpen && <DeleteAccountModal onClose={() => setDeleteAccountModalOpen(false)} onConfirmDelete={handleDeleteAccount} />}
      {showDeleteSuccess && <DeleteSuccessModal onClose={handleSuccessModalClose} />}
      {visibility === 'full' && <FocusMode />}
      {visibility === 'minimized' && <FloatingFocusWidget />}
      {showTour && <OnboardingTour onClose={handleTourClose} onStepChange={handleTourStepChange} />}
      <InstallPwaPrompt isVisible={showInstallPrompt} isIos={isIos} onInstall={() => { triggerInstall(); setShowInstallPrompt(false); sessionStorage.setItem('flowmind-install-prompt-closed', 'true'); }} onClose={() => { setShowInstallPrompt(false); sessionStorage.setItem('flowmind-install-prompt-closed', 'true'); }} />
      {showLogoutConfirm && <ConfirmationModal title="Konfirmasi Keluar" message="Apakah Anda yakin ingin keluar dari akun Anda?" confirmText="Ya, Keluar" onConfirm={signOut} onCancel={() => setShowLogoutConfirm(false)} isDestructive={true} />}
    </div>
  );
};

const App: React.FC = () => {
  const { session, loading, isPasswordRecovery, profile } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900"><p className="text-xl font-bold text-slate-700 dark:text-slate-300">Memuat Sesi...</p></div>;
  if (isPasswordRecovery || !session) return <Auth />;
  return <FocusTimerProvider profile={profile}><AppContent /></FocusTimerProvider>;
};

export default App;
