
import { useState, useEffect } from 'react';

// TypeScript interface for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePwaInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Mencegah browser menampilkan prompt default
      e.preventDefault();
      // Menyimpan event agar dapat dipicu nanti
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Membersihkan listener saat komponen dilepas
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstall = () => {
    if (!installPrompt) return;
    
    // Menampilkan prompt instalasi browser
    installPrompt.prompt();
    
    // Menunggu pilihan pengguna
    installPrompt.userChoice.then(() => {
      // Prompt hanya dapat digunakan sekali, jadi kita membersihkannya
      setInstallPrompt(null);
    });
  };

  return { installPrompt, triggerInstall };
};
