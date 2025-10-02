import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus } from '../types';

const NOTIFICATION_CHECK_INTERVAL = 60000; // 1 minute
const REMINDER_THRESHOLD = 15 * 60 * 1000; // 15 minutes

export const useNotifications = (tasks: Task[]) => {
  // Gunakan PermissionState yang lebih luas yang mencakup 'prompt'
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Menggunakan suara baru yang lebih melodis sesuai permintaan pengguna.
    const sound = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV-CQAEAC4A75990AAAAANIAAAEAAAD0QAAAQAAMQ==';
    notificationAudioRef.current = new Audio(sound);
  }, []);

  // Mengganti polling dengan Permissions API yang modern untuk keandalan.
  useEffect(() => {
    // Periksa apakah Permissions API didukung.
    if (!('Notification' in window) || !navigator.permissions) {
      // Fallback untuk browser lama atau lingkungan yang tidak aman.
      if ('Notification' in window) {
        // FIX: Normalisasi 'default' ke 'prompt' agar sesuai dengan Permissions API
        const legacyPermission = Notification.permission;
        setPermission(legacyPermission === 'default' ? 'prompt' : legacyPermission);
      } else {
        setPermission('denied');
      }
      return;
    }

    const checkPermission = async () => {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'notifications' as PermissionName });
        setPermission(permissionStatus.state);
        // Dengarkan perubahan status izin.
        permissionStatus.onchange = () => {
          setPermission(permissionStatus.state);
        };
      } catch (err) {
        console.error("Tidak dapat menanyakan izin notifikasi:", err);
        // Jika query gagal (misalnya di Firefox), kembali ke API yang lebih lama.
        // FIX: Normalisasi 'default' ke 'prompt' agar sesuai dengan Permissions API
        const legacyPermission = Notification.permission;
        setPermission(legacyPermission === 'default' ? 'prompt' : legacyPermission);
      }
    };
    
    checkPermission();
  }, []); // Jalankan sekali saat komponen dimuat.

  const requestPermission = useCallback(() => {
    if (!('Notification' in window)) {
      alert('Browser ini tidak mendukung notifikasi desktop.');
      return;
    }

    Notification.requestPermission().then(result => {
      // Listener onchange harus menangani pembaruan, tetapi kita atur di sini
      // untuk umpan balik langsung jika listener gagal.
      // FIX: Normalisasi 'default' ke 'prompt' agar sesuai dengan Permissions API
      setPermission(result === 'default' ? 'prompt' : result);
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

  // Hook sekarang mengembalikan PermissionState.
  return { notificationPermission: permission, requestNotificationPermission: requestPermission };
};
