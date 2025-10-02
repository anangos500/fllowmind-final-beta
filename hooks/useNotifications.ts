import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus } from '../types';

type NotificationPermission = 'default' | 'granted' | 'denied';

const NOTIFICATION_CHECK_INTERVAL = 60000; // 1 minute
const REMINDER_THRESHOLD = 15 * 60 * 1000; // 15 minutes

export const useNotifications = (tasks: Task[]) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Menggunakan suara baru yang lebih melodis sesuai permintaan pengguna.
    const sound = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV-CQAEAC4A75990AAAAANIAAAEAAAD0QAAAQAAMQ==';
    notificationAudioRef.current = new Audio(sound);
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;

    // Periksa status izin secara berkala karena tidak ada event 'onchange' standar
    const intervalId = setInterval(() => {
      if (Notification.permission !== permission) {
        setPermission(Notification.permission as NotificationPermission);
      }
    }, 1000); // Periksa setiap detik

    // Atur status awal saat komponen dimuat
    setPermission(Notification.permission as NotificationPermission);

    return () => clearInterval(intervalId); // Bersihkan interval saat komponen dilepas
  }, [permission]);

  const requestPermission = useCallback(() => {
    if (!('Notification' in window)) {
      alert('Browser ini tidak mendukung notifikasi desktop.');
      return;
    }

    Notification.requestPermission().then(result => {
      setPermission(result);
    });
  }, []);

  useEffect(() => {
    if (permission !== 'granted') {
      return;
    }

    const checkTasksAndNotify = () => {
      const now = new Date().getTime();
      const audio = notificationAudioRef.current;

      tasks.forEach(task => {
        if (task.status === TaskStatus.Done) return;

        const endTime = new Date(task.endTime).getTime();
        const timeUntilEnd = endTime - now;
        
        const overdueKey = `notified-overdue-${task.id}`;
        if (timeUntilEnd < 0 && !localStorage.getItem(overdueKey)) {
          new Notification('Tugas Terlewat!', {
            body: `Tugas "${task.title}" sudah melewati batas waktu.`,
            icon: '/icon.svg',
          });
          audio?.play().catch(e => console.warn("Pemutaran audio gagal:", e));
          localStorage.setItem(overdueKey, 'true');
        }
        
        const reminderKey = `notified-reminder-${task.id}`;
        if (timeUntilEnd > 0 && timeUntilEnd <= REMINDER_THRESHOLD && !localStorage.getItem(reminderKey)) {
           new Notification('Pengingat Tugas', {
            body: `Tugas "${task.title}" akan berakhir dalam 15 menit.`,
            icon: '/icon.svg',
          });
          audio?.play().catch(e => console.warn("Pemutaran audio gagal:", e));
          localStorage.setItem(reminderKey, 'true');
        }
      });
    };

    const intervalId = setInterval(checkTasksAndNotify, NOTIFICATION_CHECK_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [tasks, permission]);

  return { notificationPermission: permission, requestNotificationPermission: requestPermission };
};
