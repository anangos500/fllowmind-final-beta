import { useState, useEffect, useCallback } from 'react';

type NotificationPermission = 'default' | 'granted' | 'denied';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('Browser ini tidak mendukung notifikasi desktop.');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch (error) {
        console.error("Gagal meminta izin notifikasi:", error);
    }
  }, []);

  return { notificationPermission: permission, requestNotificationPermission: requestPermission };
};
