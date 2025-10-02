import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus } from '../types';

// jangan pakai nama yang sama dengan DOM type global
type NotifPermission = 'default' | 'granted' | 'denied';

const NOTIFICATION_CHECK_INTERVAL = 60_000; // 1 minute
const REMINDER_THRESHOLD = 15 * 60 * 1000;  // 15 minutes

export const useNotifications = (tasks: Task[]) => {
  const [permission, setPermission] = useState<NotifPermission>('default');
  const [audioArmed, setAudioArmed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // siapkan audio (akan siap diputar setelah ada user gesture)
  useEffect(() => {
    const sound =
      'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1d...'; // (dipangkas)
    audioRef.current = new Audio(sound);
  }, []);

  // cek dukungan + status awal
  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('denied'); // treat as tidak didukung
      return;
    }
    setPermission(Notification.permission as NotifPermission);
  }, []);

  // HARUS dipanggil dari user gesture (onClick/onTap)
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('Browser ini tidak mendukung notifikasi.');
      return 'denied' as NotifPermission;
    }
    if (!window.isSecureContext) {
      alert('Notifikasi membutuhkan HTTPS. Pastikan domain memakai https.');
      return 'denied' as NotifPermission;
    }

    // “arming” audio agar boleh diputar setelah user gesture
    try {
      await audioRef.current?.play();
      audioRef.current?.pause();
      audioRef.current!.currentTime = 0;
      setAudioArmed(true);
    } catch {
      // tidak apa-apa, beberapa browser tetap butuh interaksi berikutnya
      setAudioArmed(false);
    }

    const result = await Notification.requestPermission();
    setPermission(result as NotifPermission);
    return result as NotifPermission;
  }, []);

  useEffect(() => {
    if (permission !== 'granted') return;

    const checkTasksAndNotify = () => {
      const now = Date.now();

      for (const task of tasks) {
        if (!task?.endTime) continue;
        if (task.status === TaskStatus.Done) continue;

        const endTimeMs = new Date(task.endTime).getTime();
        if (Number.isNaN(endTimeMs)) continue;

        const dt = endTimeMs - now;

        // overdue
        const overdueKey = `notified:overdue:${task.id}`;
        if (dt < 0 && !localStorage.getItem(overdueKey)) {
          new Notification('Tugas Terlewat!', {
            body: `Tugas "${task.title}" sudah melewati batas waktu.`,
            icon: '/icon.svg',
          });
          if (audioArmed) {
            audioRef.current?.play().catch(() => {});
          }
          localStorage.setItem(overdueKey, '1');
        }

        // reminder <= 15 menit
        const reminderKey = `notified:reminder:${task.id}`;
        if (dt > 0 && dt <= REMINDER_THRESHOLD && !localStorage.getItem(reminderKey)) {
          new Notification('Pengingat Tugas', {
            body: `Tugas "${task.title}" akan berakhir dalam 15 menit.`,
            icon: '/icon.svg',
          });
          if (audioArmed) {
            audioRef.current?.play().catch(() => {});
          }
          localStorage.setItem(reminderKey, '1');
        }
      }
    };

    const id = window.setInterval(checkTasksAndNotify, NOTIFICATION_CHECK_INTERVAL);
    // opsional: cek pertama kali 2–3 detik setelah izin (hindari crash setelah dialog)
    const warmup = window.setTimeout(checkTasksAndNotify, 3000);

    return () => {
      clearInterval(id);
      clearTimeout(warmup);
    };
  }, [tasks, permission, audioArmed]);

  return {
    notificationPermission: permission,
    requestNotificationPermission: requestPermission,
  };
};
