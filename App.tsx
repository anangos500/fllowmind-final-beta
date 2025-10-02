













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


  // Simpan tampilan saat ini ke localStorage setiap kali berubah
  useEffect(() => {
    localStorage.setItem('flowmind-currentView', currentView);
  }, [currentView]);

  // Menampilkan panduan izin (Permission Wizard) saat pertama kali masuk
  useEffect(() => {
    const checkPermissions = async () => {
      if (sessionStorage.getItem('flowmind-permission-wizard-dismissed')) {
        return;
      }

      const notifPerm = Notification.permission;
      let micPerm = 'prompt';
      try {
        // 'microphone' as PermissionName is a type cast for TypeScript
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        micPerm = result.state;
      } catch (e) {
        console.warn("Could not query microphone permission:", e);
      }
      
      if (notifPerm === 'default' || micPerm === 'prompt') {
        setTimeout(() => setShowPermissionWizard(true), 1500);
      }
    };
    
    // Check after profile is loaded to avoid showing it on the auth screen
    if (profile) {
      checkPermissions();
    }
  }, [profile]);


  useEffect(() => {
    // Tampilkan tur jika profil pengguna telah dimuat dan flag orientasi adalah false.
    if (profile && profile.hasCompletedOnboarding === false) {
      setShowTour(true);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(10, 30, 0, 0);

      const yesterdayEnd = new Date(yesterday.getTime() + 3600000); // 1 hour duration
      
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

    // Jangan tampilkan jika sudah diinstal atau jika pengguna sudah menutupnya di sesi ini
    if (isStandalone || hasClosedPrompt) {
      return;
    }

    // Hanya mulai timer jika prompt siap (baik event browser atau karena ini iOS)
    if (installPrompt || isIos) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 5000); // Tampilkan setelah 5 detik

      return () => clearTimeout(timer);
    }
  }, [installPrompt, isIos]);

  const { visibility, startFocusSession } = useFocusTimer();

  const handleSelectTask = useCallback((task: Task) => {
    if (task.id === 'tour-fake-task-overdue') return;
    setSelectedTask(task);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setSelectedTask(null);
  }, []);
  
  const handleStartFocus = useCallback((task: Task) => {
    startFocusSession(task);
    setSelectedTask(null);
  }, [startFocusSession]);

  const handleTourStepChange = useCallback((stepIndex: number) => {
    switch (stepIndex) {
      case 2: // Overdue Nav
      case 3: // Overdue View
        setCurrentView('overdue');
        break;
      case 6: // Weekly View
        setCurrentView('weekly');
        break;
      case 7: // Monthly View
        setCurrentView('monthly');
        break;
      case 8: // Journal View
        setCurrentView('journal');
        break;
      case 9: // Settings View
      case 10: // AI Assistant (keep on settings view)
      case 11: // Manual Add (keep on settings view)
        setCurrentView('settings');
        break;
      default: // All other steps on Daily view
        setCurrentView('daily');
        break;
    }
  
    // Sidebar steps: Sidebar Nav, Overdue Nav, Weekly, Monthly, Journal, Settings
    const sidebarSteps = [1, 2, 6, 7, 8, 9];
    const isMobile = window.innerWidth < 1024;
  
    if (isMobile) {
      if (sidebarSteps.includes(stepIndex)) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    }
  }, []);

  const handleTourClose = () => {
    setShowTour(false);
    setTourFakeTask(null);
    setIsSidebarOpen(false);
    
    // Perbarui profil di database untuk menandai tur telah selesai.
    if (profile && profile.hasCompletedOnboarding === false) {
        updateUserProfile({ hasCompletedOnboarding: true });
    }
  };
  
  const handleOpenManualAdd = (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'>) => {
    setInitialTaskData(taskData);
    setAddModalOpen(true);
  };

  const handleRequestMicPermission = async () => {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error("Microphone permission denied:", err);
    }
  };

  const handleWizardClose = (skipped: boolean) => {
    setShowPermissionWizard(false);
    if (skipped) {
        sessionStorage.setItem('flowmind-permission-wizard-dismissed', 'true');
    }
  };

  const handleDeleteAccount = async (password: string): Promise<void> => {
    if (!session) {
      throw new Error("Sesi tidak ditemukan.");
    }
    const response = await fetch('/.netlify/functions/delete-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menghapus akun.');
    }
    
    // Sign out on the client-side after successful deletion
    await signOut();
    setDeleteAccountModalOpen(false);
    alert('Akun Anda telah berhasil dihapus secara permanen.');
  };


  const renderView = () => {
    if (tasksLoading || journalsLoading) {
        return <div className="flex h-full items-center justify-center"><p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Memuat data...</p></div>
    }

    const combinedError = tasksError || journalsError;
    if (combinedError) {
        return (
            <div className="flex h-full items-center justify-center p-4 sm:p-8">
                <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 px-6 py-4 rounded-xl text-center shadow-md" role="alert">
                    <strong className="font-bold text-lg">Oops! Terjadi kesalahan.</strong>
                    <p className="mt-2">{combinedError}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">Ini bisa terjadi jika ada masalah dengan koneksi ke database atau jika tabel belum disiapkan. Silakan periksa konsol untuk detail teknis.</p>
                </div>
            </div>
        );
    }

    switch (currentView) {
      case 'daily':
        return <DailyView tasks={tasks} onSelectTask={handleSelectTask} onUpdateTask={updateTask} onBulkUpdateTasks={bulkUpdateTasks} onDeleteTask={deleteTask} onAddTask={addTask} onOpenManualAdd={handleOpenManualAdd}/>;
      case 'overdue':
        const overdueViewTasks = showTour && tourFakeTask ? [...tasks, tourFakeTask] : tasks;
        return <OverdueView tasks={overdueViewTasks} onSelectTask={handleSelectTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} onBulkDeleteTask={bulkDeleteTasks} />;
      case 'weekly':
        return <WeeklyView tasks={tasks} onSelectTask={handleSelectTask} onUpdateTask={updateTask} onDeleteTask={deleteTask}/>;
      case 'monthly':
        return <MonthlyView tasks={tasks}/>;
      case 'journal':
        return <JournalView tasks={tasks} journals={journals} createOrUpdateJournal={createOrUpdateJournal} downloadJournal={downloadJournal} deleteJournal={deleteJournal} />;
      case 'settings':
        return <SettingsView user={session?.user || null} profile={profile} onUpdateProfile={updateUserProfile} onDeleteAccountRequest={() => setDeleteAccountModalOpen(true)} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen font-sans text-slate-800 dark:text-slate-200 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onViewChange={(view) => {
            setCurrentView(view);
            setIsSidebarOpen(false); // Close sidebar on view change on mobile
        }}
        notificationPermission={notificationPermission}
        requestNotificationPermission={requestNotificationPermission}
        onLogoutRequest={() => setShowLogoutConfirm(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 lg:ml-64 overflow-y-auto bg-slate-50 dark:bg-slate-900 w-full">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md z-10 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 dark:text-slate-300">
                <MenuIcon className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
                <FlowmindIcon className="w-6 h-6 text-blue-600"/>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">Flowmind</span>
            </div>
            <div className="w-6"></div>
        </header>

        {renderView()}
      </main>
      
      {isAiAssistantOpen && <AiAssistant onClose={() => setIsAiAssistantOpen(false)} />}

      <div className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 flex flex-col items-center gap-4 z-20">
        <button
          onClick={() => setIsAiAssistantOpen(true)}
          data-tour-id="ai-assistant-button"
          className="bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800"
          aria-label="Buka Asisten AI"
        >
          <SparklesBotIcon className="w-6 h-6" />
        </button>
        <button
          onClick={() => setAddModalOpen(true)}
          data-tour-id="add-task-button"
          className="bg-blue-600 text-white w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
          aria-label="Tambah Tugas Baru"
        >
          <PlusIcon className="w-7 h-7 lg:w-8 lg:h-8" />
        </button>
      </div>

      {isAddModalOpen && (
        <AddTaskModal
          initialData={initialTaskData}
          tasks={tasks}
          onClose={() => {
            setAddModalOpen(false);
            setInitialTaskData(null); // Selalu bersihkan data awal setelah ditutup
          }}
          onAddTask={addTask}
        />
      )}
      
      {selectedTask && (
        <TaskDetailModal 
            task={selectedTask} 
            tasks={tasks}
            onClose={handleCloseDetailModal} 
            onUpdate={updateTask}
            onDelete={deleteTask}
            onStartFocus={handleStartFocus}
        />
      )}
      
      {showPermissionWizard && (
        <PermissionWizard
          onRequestNotificationPermission={requestNotificationPermission}
          onRequestMicPermission={handleRequestMicPermission}
          onClose={handleWizardClose}
        />
      )}

      {isDeleteAccountModalOpen && (
        <DeleteAccountModal
          onClose={() => setDeleteAccountModalOpen(false)}
          onConfirmDelete={handleDeleteAccount}
        />
      )}

      {visibility === 'full' && <FocusMode />}
      {visibility === 'minimized' && <FloatingFocusWidget />}
      {showTour && <OnboardingTour onClose={handleTourClose} onStepChange={handleTourStepChange} />}
      
      <InstallPwaPrompt 
        isVisible={showInstallPrompt}
        isIos={isIos}
        onInstall={() => {
          triggerInstall();
          setShowInstallPrompt(false);
          // Ingat pilihan ini agar tidak muncul lagi
          sessionStorage.setItem('flowmind-install-prompt-closed', 'true');
        }}
        onClose={() => {
          setShowInstallPrompt(false);
          // Ingat pilihan ini untuk sesi ini
          sessionStorage.setItem('flowmind-install-prompt-closed', 'true');
        }}
      />

      {showLogoutConfirm && (
        <ConfirmationModal
            title="Konfirmasi Keluar"
            message="Apakah Anda yakin ingin keluar dari akun Anda?"
            confirmText="Ya, Keluar"
            onConfirm={signOut}
            onCancel={() => setShowLogoutConfirm(false)}
            isDestructive={true}
        />
      )}
    </div>
  );
};


const App: React.FC = () => {
  // FIX: Destructure `profile` from useAuth to pass it to the provider.
  const { session, loading, isPasswordRecovery, profile } = useAuth();

  if (loading) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
            <p className="text-xl font-bold text-slate-700 dark:text-slate-300">Memuat Sesi...</p>
        </div>
    );
  }

  // Jika pengguna sedang dalam alur pemulihan password (bahkan jika mereka memiliki sesi sementara)
  // atau jika mereka tidak memiliki sesi sama sekali, tampilkan komponen Auth.
  if (isPasswordRecovery || !session) {
    return <Auth />;
  }

  return (
    // FIX: Pass the `profile` object to the FocusTimerProvider as a required prop.
    <FocusTimerProvider profile={profile}>
      <AppContent />
    </FocusTimerProvider>
  );
};


export default App;
