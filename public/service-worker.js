const CACHE_NAME = 'flowmind-cache-v1';
const urlsToCache = [
  '/', // Caches index.html at the root
  '/index.html',
  '/icon.svg',
  '/maskable-icon.svg',
  '/apple-touch-icon.svg',
  '/manifest.json'
];

const DB_NAME = 'FlowmindDB';
const DB_VERSION = 1;
const TASK_STORE_NAME = 'tasks';
const NOTIFIED_STORE_NAME = 'notified_tasks';
const NOTIFICATION_CHECK_INTERVAL = 60000; // 1 minute
const REMINDER_THRESHOLD = 15 * 60 * 1000; // 15 minutes

// --- IndexedDB Helpers ---

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (event) => reject("Error opening DB: " + (event.target as any).errorCode);
    request.onsuccess = (event) => resolve((event.target as any).result);
    request.onupgradeneeded = event => {
      const db = (event.target as any).result;
      if (!db.objectStoreNames.contains(TASK_STORE_NAME)) {
        db.createObjectStore(TASK_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(NOTIFIED_STORE_NAME)) {
        db.createObjectStore(NOTIFIED_STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

async function updateTasksInDB(tasks) {
  const db: any = await openDB();
  const transaction = db.transaction(TASK_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(TASK_STORE_NAME);
  await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = resolve;
      clearRequest.onerror = reject;
  });
  for (const task of tasks) {
    store.put(task);
  }
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject("Transaction error");
  });
}

async function getNotifiedState(key) {
    const db: any = await openDB();
    const transaction = db.transaction(NOTIFIED_STORE_NAME, 'readonly');
    const store = transaction.objectStore(NOTIFIED_STORE_NAME);
    const request = store.get(key);
    return new Promise(resolve => {
        request.onsuccess = () => resolve(!!request.result);
    });
}

async function setNotifiedState(key) {
    const db: any = await openDB();
    const transaction = db.transaction(NOTIFIED_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(NOTIFIED_STORE_NAME);
    store.put({ key: key, notified: true });
}


// --- Main Notification Logic ---

async function checkTasksAndNotify() {
  // Pastikan izin telah diberikan sebelum melanjutkan
  if (self.Notification.permission !== 'granted') {
    return;
  }
  
  const db: any = await openDB();
  if (!db.objectStoreNames.contains(TASK_STORE_NAME)) return;

  const transaction = db.transaction(TASK_STORE_NAME, 'readonly');
  const store = transaction.objectStore(TASK_STORE_NAME);
  const tasks = await new Promise(resolve => store.getAll().onsuccess = event => resolve((event.target as any).result));

  if (!tasks || tasks.length === 0) return;

  const now = Date.now();

  for (const task of tasks) {
    if (task.status === 'Done') continue;

    const endTime = new Date(task.endTime).getTime();
    const timeUntilEnd = endTime - now;

    const overdueKey = `notified-overdue-${task.id}`;
    const wasNotifiedOverdue = await getNotifiedState(overdueKey);
    if (timeUntilEnd < 0 && !wasNotifiedOverdue) {
      self.registration.showNotification('Tugas Terlewat!', {
        body: `Tugas "${task.title}" sudah melewati batas waktu.`,
        icon: '/icon.svg',
        tag: overdueKey, // Gunakan tag untuk mencegah duplikasi jika pengecekan berjalan cepat
      });
      await setNotifiedState(overdueKey);
    }

    const reminderKey = `notified-reminder-${task.id}`;
    const wasNotifiedReminder = await getNotifiedState(reminderKey);
    if (timeUntilEnd > 0 && timeUntilEnd <= REMINDER_THRESHOLD && !wasNotifiedReminder) {
      self.registration.showNotification('Pengingat Tugas', {
        body: `Tugas "${task.title}" akan berakhir dalam 15 menit.`,
        icon: '/icon.svg',
        tag: reminderKey,
      });
      await setNotifiedState(reminderKey);
    }
  }
}

// --- Service Worker Event Listeners ---

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache and caching app shell');
      return cache.addAll(urlsToCache);
    }).then(() => {
      // Buka IndexedDB saat instalasi
      return openDB();
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker activated. Starting notification checks.');
        // Pengecekan awal, lalu atur interval
        checkTasksAndNotify();
        setInterval(checkTasksAndNotify, NOTIFICATION_CHECK_INTERVAL);
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'UPDATE_TASKS') {
    console.log('Service Worker received updated tasks.');
    updateTasksInDB(event.data.payload)
      .catch(err => console.error('Failed to update tasks in SW DB:', err));
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
          await cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        if (event.request.mode === 'navigate') {
          const fallbackResponse = await cache.match('/index.html');
          return fallbackResponse;
        }
        throw error;
      }
    })
  );
});
