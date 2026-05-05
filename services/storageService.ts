import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Capacitor } from '@capacitor/core';
import { type Exhibit, type Collection, type Notification, type Message, type UserProfile, type GuestbookEntry, type WishlistItem, type Guild, type Duel, type TradeRequest, type NotificationType, type ArtifactBattle, type DailyBracket } from '../types';
import { calculateWishlistMatchScore, WISHLIST_MATCH_THRESHOLD } from '../constants';

// ==========================================
// 🚀 NEO_ARCHIVE HIGH-PERFORMANCE DB LAYER
// ==========================================

// IndexedDB Schema Definition
interface NeoArchiveDB extends DBSchema {
  system: {
    key: string;
    value: any;
  };
  exhibits: {
    key: string;
    value: Exhibit;
    indexes: { 'by-owner': string; 'by-date': string };
  };
  collections: {
    key: string;
    value: Collection;
    indexes: { 'by-owner': string };
  };
  users: {
    key: string; // username
    value: UserProfile;
  };
  notifications: {
    key: string;
    value: Notification;
    indexes: { 'by-recipient': string };
  };
  messages: {
    key: string;
    value: Message;
  };
  generic: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'NeoArchive_V3_Turbo';
const DB_VERSION = 2; 
const SESSION_USER_KEY = 'neo_active_user';

// --- API CONFIGURATION FOR MOBILE & WEB ---
const getEnvVar = (key: string): string | undefined => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) {
        console.warn('Environment variable access failed', e);
    }
    return undefined;
};

// Fallback server URL for Android (must use HTTPS in production)
// Set VITE_API_URL in .env to override this value
const REMOTE_SERVER_URL = 'https://neoarchive.ru/api';

const isNative = Capacitor.isNativePlatform();

// Если мы на телефоне - используем удаленный сервер. Если в браузере - относительный путь.
const API_BASE = getEnvVar('VITE_API_URL') || (isNative ? REMOTE_SERVER_URL : '/api');

console.log(`[Network] API Target: ${API_BASE} (Native: ${isNative})`);

const FORCE_RESET_TOKEN = 'NEO_RESET_S3_MIGRATION_V3_FINAL_FIX_DUPE'; 

// --- IN-MEMORY HOT CACHE (RAM) ---
let hotCache = {
    exhibits: [] as Exhibit[],
    collections: [] as Collection[],
    notifications: [] as Notification[],
    messages: [] as Message[],
    users: [] as UserProfile[],
    guestbook: [] as GuestbookEntry[],
    wishlist: [] as WishlistItem[],
    guilds: [] as Guild[],
    tradeRequests: [] as TradeRequest[],
};

let dbPromise: Promise<IDBPDatabase<NeoArchiveDB>> | null = null;

// --- HELPER: Merge Arrays Unique by ID ---
const mergeUnique = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
    const map = new Map<string, T>();
    current.forEach(item => map.set(item.id, item));
    incoming.forEach(item => map.set(item.id, item));
    // Convert back to array
    return Array.from(map.values());
};

const mergeUniqueUsers = (current: UserProfile[], incoming: UserProfile[]): UserProfile[] => {
    const map = new Map<string, UserProfile>();
    current.forEach(item => map.set(item.username, item));
    incoming.forEach(item => map.set(item.username, item));
    return Array.from(map.values());
};

// --- INITIALIZATION ---

const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<NeoArchiveDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('system')) db.createObjectStore('system');
                
                if (!db.objectStoreNames.contains('exhibits')) {
                    const store = db.createObjectStore('exhibits', { keyPath: 'id' });
                    store.createIndex('by-owner', 'owner');
                    store.createIndex('by-date', 'timestamp');
                }
                if (!db.objectStoreNames.contains('collections')) {
                    const store = db.createObjectStore('collections', { keyPath: 'id' });
                    store.createIndex('by-owner', 'owner');
                }
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'username' });
                }
                if (!db.objectStoreNames.contains('notifications')) {
                    const store = db.createObjectStore('notifications', { keyPath: 'id' });
                    store.createIndex('by-recipient', 'recipient');
                }
                if (!db.objectStoreNames.contains('messages')) {
                    db.createObjectStore('messages', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('generic')) {
                    db.createObjectStore('generic', { keyPath: 'id' });
                }
            },
            blocked() {
                console.warn("Database blocked: please close other tabs with this app open.");
            },
            blocking() {
                if (dbPromise) {
                    dbPromise.then(db => db.close());
                    dbPromise = null;
                }
            },
            terminated() {
                console.error("Database terminated unexpectedly");
            }
        });
    }
    return dbPromise;
};

// --- OBSERVER PATTERN ---
type ChangeListener = () => void;
const listeners: ChangeListener[] = [];
type ToastListener = (n: Notification) => void;
const toastListeners: ToastListener[] = [];

export const subscribe = (listener: ChangeListener) => {
    listeners.push(listener);
    return () => { const i = listeners.indexOf(listener); if(i > -1) listeners.splice(i, 1); };
};
export const subscribeToToasts = (listener: ToastListener) => {
    toastListeners.push(listener);
    return () => { const i = toastListeners.indexOf(listener); if(i > -1) toastListeners.splice(i, 1); };
};
let _notifying = false;
const notifyListeners = () => {
    if (_notifying) return;
    _notifying = true;
    try { listeners.forEach(l => l()); } finally { _notifying = false; }
};

// Batches multiple rapid updates into a single repaint frame to avoid UI thrashing
let _rafPending = false;
const scheduleNotify = () => {
    if (_rafPending) return;
    _rafPending = true;
    requestAnimationFrame(() => {
        _rafPending = false;
        notifyListeners();
    });
};

// IDs уведомлений, уже известных при загрузке — не показывать как тосты
let _knownNotificationIds: Set<string> | null = null;
const emitNewToasts = (notifs: Notification[]) => {
    if (_knownNotificationIds === null) {
        // Первая загрузка — просто запоминаем, тосты не показываем
        _knownNotificationIds = new Set(notifs.map(n => n.id));
        return;
    }
    for (const n of notifs) {
        if (!_knownNotificationIds.has(n.id)) {
            _knownNotificationIds.add(n.id);
            toastListeners.forEach(l => l(n));
        }
    }
};

// --- API HELPER WITH TIMEOUT ---
const pendingRequests = new Map<string, Promise<any>>();

const apiCall = async (endpoint: string, method: string = 'GET', body?: any, extraHeaders?: Record<string, string>) => {
    const cacheKey = method === 'GET' ? `${method}:${endpoint}` : null;
    if (cacheKey && pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey)!;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const requestPromise = (async () => {
        try {
            const headers: any = { 'Content-Type': 'application/json', ...extraHeaders };
            const options: RequestInit = {
                method,
                headers,
                signal: controller.signal
            };
            if (body) options.body = JSON.stringify(body);

            // Construct full URL using API_BASE which can be absolute for mobile
            const fullPath = endpoint.startsWith('/') ? `${API_BASE}${endpoint}` : `${API_BASE}/${endpoint}`;
            
            // Cache-bust only real-time endpoints; stable data (users, collections) can use HTTP cache
            const REALTIME_PREFIXES = ['/feed', '/notifications', '/messages', '/sync'];
            const needsCacheBust = REALTIME_PREFIXES.some(p => endpoint.startsWith(p));
            let finalUrl = fullPath;
            if (method === 'GET' && needsCacheBust) {
                const separator = fullPath.includes('?') ? '&' : '?';
                finalUrl += `${separator}_t=${Date.now()}`;
            }

            const res = await fetch(finalUrl, options);
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errText = await res.text();
                // Check if we got HTML instead of JSON (common 404 error)
                if (errText.trim().startsWith('<')) {
                    throw new Error(`Server Error ${res.status}: Endpoint not found (check API URL)`);
                }
                throw new Error(`API Error ${res.status}: ${errText.slice(0, 100)}`);
            }
            return await res.json();
        } catch (e: any) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') throw new Error('Network timeout');
            throw e;
        } finally {
            if (cacheKey) pendingRequests.delete(cacheKey);
        }
    })();

    if (cacheKey) pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
};

export const isOffline = () => !navigator.onLine;

// --- CORE FUNCTIONS (Hydration) ---
const hydrateCritical = async () => {
    try {
        const db = await Promise.race([
            getDB(),
            new Promise<IDBPDatabase<NeoArchiveDB>>((_, reject) => setTimeout(() => reject(new Error("DB_OPEN_TIMEOUT")), 5000))
        ]);
        const [users, notifications, messages] = await Promise.all([
            db.getAll('users'),
            db.getAll('notifications'),
            db.getAll('messages'),
        ]);
        hotCache.users = users;
        hotCache.notifications = notifications;
        hotCache.messages = messages;
    } catch (e) {
        console.warn("Critical hydration failed (clean slate?):", e);
    }
};

const hydrateContent = async () => {
    try {
        const db = await getDB();
        // Load latest exhibits from IDB to show something immediately
        const tx = db.transaction('exhibits', 'readonly');
        const index = tx.store.index('by-date');
        let cursor = await index.openCursor(null, 'prev');
        const latestExhibits: Exhibit[] = [];
        let count = 0;
        while (cursor && count < 50) {
            latestExhibits.push(cursor.value);
            count++;
            cursor = await cursor.continue();
        }
        
        const [collections, generic] = await Promise.all([
            db.getAll('collections'),
            db.getAll('generic')
        ]);

        hotCache.exhibits = latestExhibits;
        hotCache.collections = collections;
        hotCache.wishlist = generic.filter((i:any) => i.table === 'wishlist').map((i:any) => i.data);
        hotCache.guestbook = generic.filter((i:any) => i.table === 'guestbook').map((i:any) => i.data);
        hotCache.guilds = generic.filter((i:any) => i.table === 'guilds').map((i:any) => i.data);
        hotCache.tradeRequests = generic.filter((i:any) => i.table === 'trade_requests').map((i:any) => i.data);

        notifyListeners();
    } catch (e) { console.error("Content hydration failed:", e); }
};

// --- PUSH NOTIFICATIONS ---

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subscribeToPush = async (username: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push not supported');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Push permission denied');
            return false;
        }

        const registration = await navigator.serviceWorker.ready;

        // VAPID Public Key from ENV
        const vapidPublicKey = getEnvVar('VITE_VAPID_PUBLIC_KEY');
        if (!vapidPublicKey) {
            console.error('VAPID Public Key missing');
            return false;
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        // Send subscription to server
        await apiCall('/push/subscribe', 'POST', { username, subscription });
        console.log('Push Subscribed:', subscription);
        return true;
    } catch (error) {
        console.error('Push Subscription Error:', error);
        return false;
    }
};

export const unsubscribeFromPush = async () => {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await apiCall('/push/subscribe', 'DELETE', { endpoint: subscription.endpoint });
            await subscription.unsubscribe();
        }
        return true;
    } catch (e) { return false; }
};

// --- INITIALIZATION ---

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    try { localStorage.removeItem('neo_archive_db_cache_v2'); } catch(e){}

    const lastReset = localStorage.getItem('neo_force_reset_key');
    if (lastReset !== FORCE_RESET_TOKEN) {
        try {
            const db = await getDB();
            await db.clear('exhibits');
            await db.clear('collections');
            await db.clear('users');
            await db.clear('notifications');
            await db.clear('messages');
            await db.clear('generic');
            // Also wipe the delta-sync marker so next load does a full fresh fetch
            try { await db.delete('system', 'lastFeedSyncAt'); } catch(_) {}
            localStorage.setItem('neo_force_reset_key', FORCE_RESET_TOKEN);
        } catch (e) { console.error("Cache reset failed:", e); }
    }

    await hydrateCritical();
    await hydrateContent();

    let activeUserUsername: string | undefined;
    try {
        const db = await getDB();
        const storedSession = await db.get('system', SESSION_USER_KEY);
        activeUserUsername = storedSession?.value;
    } catch (e) { console.warn("Could not read session from DB"); }

    if (activeUserUsername) {
        // Load data in background to not block UI
        loadCriticalFeedData().then(() => performBackgroundSync(activeUserUsername!));
        return hotCache.users.find(u => u.username === activeUserUsername) || null;
    }

    // Anonymous users also get a fresh feed so the page isn't empty after cache clear
    loadCriticalFeedData();
    return null;
};

// --- CRUD OPERATIONS ---
const saveGeneric = async (table: string, data: any) => {
    const db = await getDB();
    await db.put('generic', { id: data.id, table, data });
};
const deleteGeneric = async (id: string) => {
    const db = await getDB();
    await db.delete('generic', id);
};

const loadCriticalFeedData = async () => {
    try {
        const db = await getDB();
        const lastSync: string | undefined = await db.get('system', 'lastFeedSyncAt');

        const limit = 200;
        const url = lastSync
            ? `/feed?limit=${limit}&since=${encodeURIComponent(lastSync)}`
            : `/feed?limit=${limit}`;

        const data = await apiCall(url);
        if (!Array.isArray(data)) return;

        const syncTime = new Date().toISOString();

        if (!lastSync) {
            // Full fetch: purge deleted items from cache and IDB
            const serverIds = new Set(data.map((e: any) => e.id));
            const activeUsername = await getActiveUsername();

            hotCache.exhibits = hotCache.exhibits.filter(e =>
                e.isDraft ||
                (activeUsername && e.owner === activeUsername) ||
                serverIds.has(e.id)
            );

            getDB().then(async db => {
                const tx = db.transaction('exhibits', 'readwrite');
                data.forEach((item: any) => tx.store.put(item));
                await tx.done;
                const allLocal = await db.getAll('exhibits');
                const toDelete = allLocal.filter((e: any) =>
                    !e.isDraft &&
                    !(activeUsername && e.owner === activeUsername) &&
                    !serverIds.has(e.id)
                );
                if (toDelete.length > 0) {
                    const delTx = db.transaction('exhibits', 'readwrite');
                    toDelete.forEach((e: any) => delTx.store.delete(e.id));
                    await delTx.done;
                }
            });
        } else if (data.length > 0) {
            // Delta fetch: only write new/updated items — no purge needed
            getDB().then(async db => {
                const tx = db.transaction('exhibits', 'readwrite');
                data.forEach((item: any) => tx.store.put(item));
                await tx.done;
            });
        }

        if (data.length > 0) {
            const merged = mergeUnique(hotCache.exhibits, data);
            merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            hotCache.exhibits = merged;
            scheduleNotify();
        }

        db.put('system', syncTime, 'lastFeedSyncAt');
    } catch (e) { console.warn("Feed load failed", e); }
};

const performBackgroundSync = async (activeUserUsername?: string) => {
    const db = await getDB();
    const fetchAndApply = async (endpoint: string, table: keyof NeoArchiveDB | 'generic', genericTable?: string, cacheKey?: keyof typeof hotCache) => {
        try {
            const data = await apiCall(endpoint);
            if (!Array.isArray(data)) return;
            
            if (cacheKey) {
                if (cacheKey === 'exhibits') {
                    // Strict deduplication for exhibits
                    const merged = mergeUnique(hotCache.exhibits, data);
                    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    hotCache.exhibits = merged;
                } else if (cacheKey === 'collections') {
                    // Dedupe collections
                    const merged = mergeUnique(hotCache.collections, data);
                    hotCache.collections = merged;
                } else if (cacheKey === 'users') {
                    // Dedupe users
                    const merged = mergeUniqueUsers(hotCache.users, data);
                    hotCache.users = merged;
                } else {
                    // For other lists, usually replacing is safer if full list is fetched
                    hotCache[cacheKey] = data as any;
                }
            } else if (table === 'generic') {
                 if (genericTable === 'wishlist') hotCache.wishlist = data;
                 if (genericTable === 'guestbook') hotCache.guestbook = data;
            }
            
            scheduleNotify();

            const tx = db.transaction(table as any, 'readwrite');
            const store = tx.objectStore(table as any);
            if (table === 'generic' && genericTable) {
                data.forEach((item: any) => store.put({ id: item.id, table: genericTable, data: item }));
            } else {
                data.forEach((item: any) => store.put(item));
            }
            await tx.done;
        } catch (e) {}
    };

    // /feed is already handled by loadCriticalFeedData (called before this function)
    Promise.allSettled([
        fetchAndApply('/users', 'users', undefined, 'users'),
        fetchAndApply('/collections', 'collections', undefined, 'collections'),
        fetchAndApply('/wishlist', 'generic', 'wishlist', 'wishlist'),
        fetchAndApply('/guestbook', 'generic', 'guestbook', 'guestbook')
    ]);

    if (activeUserUsername) {
        // Reconcile user's own published exhibits with server — removes locally-cached
        // items that were deleted from server (e.g. deleted from another device/by admin)
        apiCall(`/exhibits?owner=${encodeURIComponent(activeUserUsername)}&limit=500`).then(async (serverOwned: any) => {
            if (!Array.isArray(serverOwned)) return;
            const serverOwnedIds = new Set(serverOwned.map((e: any) => e.id));
            hotCache.exhibits = hotCache.exhibits.filter(e =>
                e.owner !== activeUserUsername ||  // keep other users' items untouched
                e.isDraft ||                       // always keep own drafts
                serverOwnedIds.has(e.id)           // keep own items confirmed on server
            );
            // Merge fresh server data for own items
            hotCache.exhibits = mergeUnique(hotCache.exhibits, serverOwned);
            scheduleNotify();
            // Sync IDB
            const db = await getDB();
            const allLocal = await db.getAll('exhibits');
            const orphaned = allLocal.filter((e: any) =>
                e.owner === activeUserUsername && !e.isDraft && !serverOwnedIds.has(e.id)
            );
            if (orphaned.length > 0) {
                const tx = db.transaction('exhibits', 'readwrite');
                orphaned.forEach((e: any) => tx.store.delete(e.id));
                await tx.done;
            }
        }).catch(() => {});

        apiCall(`/sync?username=${activeUserUsername}`).then(async (syncData) => {
            if (!syncData) return;
            if (syncData.tradeRequests?.length) {
                hotCache.tradeRequests = syncData.tradeRequests;
                syncData.tradeRequests.forEach(async (tr: TradeRequest) => await saveGeneric('trade_requests', tr));
                scheduleNotify();
            }
        });
        Promise.all([
            apiCall(`/notifications?username=${activeUserUsername}`),
            apiCall(`/messages?username=${activeUserUsername}`)
        ]).then(async ([notifs, msgs]) => {
            const tx = db.transaction(['notifications', 'messages'], 'readwrite');
            if (Array.isArray(notifs)) {
                notifs.forEach(n => tx.objectStore('notifications').put(n));
                emitNewToasts(notifs);
                hotCache.notifications = notifs;
            }
            if (Array.isArray(msgs)) {
                msgs.forEach(m => tx.objectStore('messages').put(m));
                hotCache.messages = msgs;
            }
            await tx.done;
            scheduleNotify();
        });
    }
};

const getActiveUsername = async (): Promise<string | null> => {
    try {
        const db = await getDB();
        const session = await db.get('system', SESSION_USER_KEY);
        return session?.value || null;
    } catch { return null; }
};

export const loginUser = async (identifier: string, password: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/login', 'POST', { identifier, password });
    const db = await getDB();
    await db.put('system', { key: SESSION_USER_KEY, value: user.username }, SESSION_USER_KEY);
    await db.put('users', user);
    // Dedupe users list
    hotCache.users = mergeUniqueUsers(hotCache.users, [user]);
    
    notifyListeners();
    await loadCriticalFeedData();
    performBackgroundSync(user.username);
    return user;
};

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<{ success: boolean }> => {
    // Сервер создаёт pending-регистрацию и отправляет email с подтверждением.
    // Аккаунт появится в БД только после перехода по ссылке из письма.
    // Возвращает { success: true }, НЕ UserProfile.
    const result = await apiCall('/auth/register', 'POST', { username, password, tagline, email });
    return result;
};

export const logoutUser = async () => {
    const db = await getDB();
    await db.delete('system', SESSION_USER_KEY);
    window.location.href = '/';
};

export const loginViaTelegram = async (tgUser: any) => {
    const user = await apiCall('/auth/telegram', 'POST', tgUser);
    const db = await getDB();
    await db.put('system', { key: SESSION_USER_KEY, value: user.username }, SESSION_USER_KEY);
    await db.put('users', user);
    hotCache.users = mergeUniqueUsers(hotCache.users, [user]);
    notifyListeners();
    performBackgroundSync(user.username);
    return user;
};

export const loginViaOAuth = async (username: string): Promise<UserProfile> => {
    const user = await apiCall(`/users/${encodeURIComponent(username)}`, 'GET');
    const db = await getDB();
    await db.put('system', { key: SESSION_USER_KEY, value: user.username }, SESSION_USER_KEY);
    await db.put('users', user);
    hotCache.users = mergeUniqueUsers(hotCache.users, [user]);
    notifyListeners();
    performBackgroundSync(user.username);
    return user;
};

export const recoverPassword = async (email: string) => {
    return await apiCall('/auth/recover', 'POST', { email });
};

/** Запрос смены пароля — отправляет письмо с подтверждением на текущий email пользователя */
export const requestPasswordChange = async (username: string, newPassword: string): Promise<void> => {
    await apiCall('/auth/change-password', 'POST', { username, newPassword });
};

/** Запрос смены email — отправляет письмо с подтверждением на НОВЫЙ адрес */
export const requestEmailChange = async (username: string, newEmail: string): Promise<void> => {
    await apiCall('/auth/change-email', 'POST', { username, newEmail });
};

export const getFullDatabase = () => ({ ...hotCache });

export const saveExhibit = async (e: Exhibit) => {
    const isNewPublish = !e.isDraft && !hotCache.exhibits.some(ex => ex.id === e.id);
    // Optimistic update
    hotCache.exhibits = mergeUnique([e], hotCache.exhibits);
    notifyListeners();

    if (isNewPublish) {
        (async () => {
            const activeWishItems = hotCache.wishlist.filter(
                w => w.owner !== e.owner && (!w.status || w.status === 'SEARCHING')
            );
            for (const w of activeWishItems) {
                if (calculateWishlistMatchScore(e, w) >= WISHLIST_MATCH_THRESHOLD) {
                    const alreadyNotified = hotCache.notifications.some(
                        n => n.type === 'WISHLIST_MATCH' && n.targetId === e.id && n.contextId === w.id
                    );
                    if (!alreadyNotified) {
                        await createNotification(w.owner, 'WISHLIST_MATCH', e.owner, e.id, e.title, w.id);
                    }
                }
            }
        })();
    }
    
    const db = await getDB();
    await db.put('exhibits', e);
    const serverResponse = await apiCall('/exhibits', 'POST', e);
    if (serverResponse && serverResponse.imageUrls) {
        const updatedExhibit = { ...e, imageUrls: serverResponse.imageUrls };
        
        // Update cache with server response (which contains image URLs)
        hotCache.exhibits = hotCache.exhibits.map(item => item.id === e.id ? updatedExhibit : item);
        
        await db.put('exhibits', updatedExhibit);
        notifyListeners();
    }
};

export const updateExhibit = async (e: Exhibit) => {
    const idx = hotCache.exhibits.findIndex(x => x.id === e.id);
    if (idx !== -1) hotCache.exhibits = hotCache.exhibits.map(x => x.id === e.id ? e : x);
    else hotCache.exhibits = [e, ...hotCache.exhibits];
    
    notifyListeners();
    
    const db = await getDB();
    await db.put('exhibits', e);
    const serverResponse = await apiCall('/exhibits', 'POST', e);
    if (serverResponse && serverResponse.imageUrls) {
        const updatedExhibit = { ...e, imageUrls: serverResponse.imageUrls };
        hotCache.exhibits = hotCache.exhibits.map(item => item.id === e.id ? updatedExhibit : item);
        await db.put('exhibits', updatedExhibit);
        notifyListeners();
    }
};

export const incrementShares = async (id: string) => {
    const username = await getActiveUsername();
    if (!username) return;
    const exhibit = hotCache.exhibits.find(e => e.id === id);
    if (!exhibit) return;
    if ((exhibit.sharedBy ?? []).includes(username)) return; // уже шарил
    const updated = {
        ...exhibit,
        shares: (exhibit.shares ?? 0) + 1,
        sharedBy: [...(exhibit.sharedBy ?? []), username],
    };
    hotCache.exhibits = hotCache.exhibits.map(e => e.id === id ? updated : e);
    notifyListeners();
    const db = await getDB();
    await db.put('exhibits', updated);
    apiCall(`/exhibits/${id}/shares`, 'POST', { username }).catch(() => {});
};

const purgeExhibitFromCache = async (id: string) => {
    hotCache.exhibits = hotCache.exhibits.filter(e => e.id !== id);
    notifyListeners();
    const db = await getDB();
    await db.delete('exhibits', id);
};

export const deleteExhibit = async (id: string) => {
    const username = await getActiveUsername();
    const qs = username ? `?username=${encodeURIComponent(username)}` : '';
    try {
        const result = await apiCall(`/exhibits/${id}${qs}`, 'DELETE');
        if (result && result.success) {
            await purgeExhibitFromCache(id);
        } else {
            throw new Error(result?.error || 'Нет прав для удаления');
        }
    } catch (e: any) {
        const msg: string = e?.message || '';

        // 404 — artifact gone from server, just clean up local cache silently
        if (msg.includes('404')) {
            await purgeExhibitFromCache(id);
            return;
        }

        // Parse diagnostic info from server 403 error
        const jsonMatch = msg.match(/\{.*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.storedOwner && parsed.requestedBy && parsed.storedOwner !== parsed.requestedBy) {
                    throw new Error(`Артефакт принадлежит «${parsed.storedOwner}», вы вошли как «${parsed.requestedBy}»`);
                }
                if (parsed.error) throw new Error(parsed.error);
            } catch (parseErr: any) {
                if (parseErr.message !== msg) throw parseErr;
            }
        }
        throw e;
    }
};

export const saveCollection = async (c: Collection) => {
    hotCache.collections = mergeUnique([c], hotCache.collections);
    notifyListeners();
    const db = await getDB();
    await db.put('collections', c);
    
    try {
        const res = await apiCall('/collections', 'POST', c);
        if (res && res.success && res.data) {
            const updated = res.data;
            hotCache.collections = hotCache.collections.map(col => col.id === c.id ? updated : col);
            await db.put('collections', updated);
            notifyListeners();
        }
    } catch (e) { console.error("Save collection sync error:", e); }
};

export const updateCollection = async (c: Collection) => {
    hotCache.collections = hotCache.collections.map(col => col.id === c.id ? c : col);
    notifyListeners();
    const db = await getDB();
    await db.put('collections', c);
    
    try {
        const res = await apiCall('/collections', 'POST', c);
        if (res && res.success && res.data) {
            const updated = res.data;
            hotCache.collections = hotCache.collections.map(col => col.id === c.id ? updated : col);
            await db.put('collections', updated);
            notifyListeners();
        }
    } catch (e) { console.error("Update collection sync error:", e); }
};

export const deleteCollection = async (id: string) => {
    hotCache.collections = hotCache.collections.filter(c => c.id !== id);
    notifyListeners();
    const db = await getDB();
    await db.delete('collections', id);
    const username = await getActiveUsername();
    const qs = username ? `?username=${encodeURIComponent(username)}` : '';
    await apiCall(`/collections/${id}${qs}`, 'DELETE');
};

export const updateUserProfile = async (u: UserProfile) => {
    hotCache.users = mergeUniqueUsers([u], hotCache.users);
    notifyListeners();
    const db = await getDB();
    await db.put('users', u);
    
    try {
        const res = await apiCall('/users', 'POST', { id: u.username, ...u }, { 'X-Requested-By': u.username });
        if (res && res.success) {
            let updated = { ...u };
            if (res.avatarUrl) updated.avatarUrl = res.avatarUrl;
            if (res.coverUrl) updated.coverUrl = res.coverUrl;
            
            hotCache.users = hotCache.users.map(us => us.username === u.username ? updated : us);
            await db.put('users', updated);
            notifyListeners();
        }
    } catch(e) { console.error("Update profile sync error:", e); }
};

export const createNotification = async (r:string, t:NotificationType, a:string, id?:string, p?:string, ctx?:string) => {
    const notif: Notification = {
        id: crypto.randomUUID(),
        type: t,
        recipient: r,
        actor: a,
        targetId: id,
        targetPreview: p,
        contextId: ctx,
        timestamp: new Date().toISOString(),
        isRead: false
    };

    // Если уведомление адресовано текущему пользователю — показываем тост немедленно,
    // не дожидаясь следующего поллинга (особенно важно для GRADE_UP)
    getActiveUsername().then(username => {
        if (username && notif.recipient === username) {
            emitNewToasts([notif]);
            hotCache.notifications = [notif, ...hotCache.notifications];
            notifyListeners();
        }
    });

    await apiCall('/notifications', 'POST', notif);
};

export const saveWishlistItem = async (w: WishlistItem) => {
    hotCache.wishlist.push(w);
    notifyListeners();
    await saveGeneric('wishlist', w);
    
    try {
        const res = await apiCall('/wishlist', 'POST', w);
        if (res && res.success && res.data) {
            const updated = res.data;
            const idx = hotCache.wishlist.findIndex(item => item.id === w.id);
            if (idx !== -1) hotCache.wishlist[idx] = updated;
            await saveGeneric('wishlist', updated);
            notifyListeners();
        }
    } catch(e) { console.error("Save wishlist sync error:", e); }
};

export const deleteWishlistItem = async (id: string) => {
    hotCache.wishlist = hotCache.wishlist.filter(w => w.id !== id);
    notifyListeners();
    await deleteGeneric(id);
    await apiCall(`/wishlist/${id}`, 'DELETE');
};

export const saveGuestbookEntry = async (e: GuestbookEntry) => {
    hotCache.guestbook.push(e);
    notifyListeners();
    await saveGeneric('guestbook', e);
    await apiCall('/guestbook', 'POST', e);
};

export const deleteGuestbookEntry = async (id: string) => {
    hotCache.guestbook = hotCache.guestbook.filter(g => g.id !== id);
    notifyListeners();
    await deleteGeneric(id);
    await apiCall(`/guestbook/${id}`, 'DELETE');
};

export const saveMessage = async (m: Message) => {
    hotCache.messages.push(m);
    notifyListeners();
    const db = await getDB();
    await db.put('messages', m);
    await apiCall('/messages', 'POST', m);
};

export const updateMessage = async (m: Message) => {
    const idx = hotCache.messages.findIndex(x => x.id === m.id);
    if (idx !== -1) hotCache.messages[idx] = m;
    else hotCache.messages.push(m);
    notifyListeners();
    const dbInstance = await getDB();
    await dbInstance.put('messages', m);
    await apiCall('/messages', 'POST', m);
};

/** Update only reactions on a direct message — uses PATCH to bypass the spam/dedup filter */
export const updateMessageReactions = async (id: string, reactions: import('../types').MessageReaction[]): Promise<void> => {
    // Update hotCache immediately so any subsequent getFullDatabase() call returns fresh data
    const idx = hotCache.messages.findIndex(x => x.id === id);
    if (idx !== -1) hotCache.messages[idx] = { ...hotCache.messages[idx], reactions };
    // Update IndexedDB
    try {
        const dbInstance = await getDB();
        const stored = await dbInstance.get('messages', id);
        if (stored) await dbInstance.put('messages', { ...stored, reactions });
    } catch {}
    // PATCH the server — no notifyListeners() here to avoid refreshData() race condition
    // App.tsx already applied the optimistic update via setMessages before calling this
    try {
        await apiCall(`/messages/${id}`, 'PATCH', { reactions });
    } catch {}
};

export const createGuild = async (g: Guild) => {
    hotCache.guilds.push(g);
    notifyListeners();
    await saveGeneric('guilds', g);
};

export const deleteGuild = async (id: string) => {
    hotCache.guilds = hotCache.guilds.filter(g => g.id !== id);
    notifyListeners();
    await deleteGeneric(id);
};

// Generates a deterministic SVG avatar locally — no external requests needed
const generateLocalAvatar = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const bg = `hsl(${hue},60%,38%)`;
    const initials = (name || 'NA').slice(0, 2).toUpperCase();
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">',
        `<rect width="80" height="80" fill="${bg}"/>`,
        `<text x="40" y="40" dominant-baseline="central" text-anchor="middle" fill="#fff" `,
        `font-family="system-ui,sans-serif" font-size="30" font-weight="700">${initials}</text>`,
        '</svg>',
    ].join('');
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const getUserAvatar = (username: string): string => {
    if (!username) return generateLocalAvatar('NA');
    const u = hotCache.users.find(u => u.username === username);
    // Skip old placeholder URLs from external services
    if (u?.avatarUrl && !u.avatarUrl.includes('ui-avatars.com')) return u.avatarUrl;
    return generateLocalAvatar(username);
};

export const fetchExhibitById = async (id: string) => {
    const mem = hotCache.exhibits.find(e => e.id === id);
    if (mem && !(mem as any)._isLite) return mem;
    try {
        const item = await apiCall(`/exhibits/${id}`);
        if(item) {
            const db = await getDB();
            await db.put('exhibits', item);
            hotCache.exhibits = mergeUnique(hotCache.exhibits, [item]);
        }
        return item;
    } catch { return null; }
};

export const fetchCollectionById = async (id: string) => {
    try {
        const col = await apiCall(`/collections/${id}`);
        if(col) {
            const db = await getDB();
            await db.put('collections', col);
            hotCache.collections = mergeUnique(hotCache.collections, [col]);
        }
        return col;
    } catch { return null; }
};

export const fileToBase64 = (file: File, maxWidth = 1600, quality = 0.82): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Non-image files (e.g. video): fall back to plain base64
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onerror = reject;
        reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                // Resize if wider than maxWidth, keep aspect ratio
                const scale = img.width > maxWidth ? maxWidth / img.width : 1;
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, w, h);
                // Always output as JPEG for photos; preserve PNG only for small files
                const outputType = file.type === 'image/png' && file.size < 300_000 ? 'image/png' : 'image/jpeg';
                resolve(canvas.toDataURL(outputType, quality));
            };
            img.src = reader.result as string;
        };
    });
};

let _liveUpdateInterval: ReturnType<typeof setInterval> | null = null;

export const startLiveUpdates = () => {
    if (_liveUpdateInterval) return;
    _liveUpdateInterval = setInterval(async () => {
        try {
            const data = await apiCall('/users');
            if (!Array.isArray(data)) return;
            hotCache.users = mergeUniqueUsers(hotCache.users, data);
            notifyListeners();
            const db = await getDB();
            const tx = db.transaction('users', 'readwrite');
            data.forEach((u: UserProfile) => tx.store.put(u));
            await tx.done;
        } catch (e) {}

        // Поллинг уведомлений для текущего пользователя
        try {
            const username = await getActiveUsername();
            if (!username) return;
            const notifs = await apiCall(`/notifications?username=${username}`);
            if (!Array.isArray(notifs)) return;
            emitNewToasts(notifs);
            hotCache.notifications = notifs;
            notifyListeners();
        } catch (e) {}

        // Обновление экспонатов для блока "Сейчас популярно"
        try {
            const fresh = await apiCall('/feed?limit=50');
            if (!Array.isArray(fresh)) return;
            hotCache.exhibits = mergeUnique(hotCache.exhibits, fresh);
            notifyListeners();
        } catch (e) {}
    }, 30000);
};

export const stopLiveUpdates = () => {
    if (_liveUpdateInterval) {
        clearInterval(_liveUpdateInterval);
        _liveUpdateInterval = null;
    }
};

// --- GLOBAL CHAT ---
export const getGlobalChatMessages = async (): Promise<any[]> => {
    try {
        const data = await apiCall('/global_chat?limit=100');
        if (!Array.isArray(data)) return [];
        return data.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (e) {
        return [];
    }
};

export const sendGlobalChatMessage = async (msg: { id: string; sender: string; text: string; timestamp: string; replyTo?: { id: string; sender: string; text: string } }): Promise<void> => {
    await apiCall('/global_chat', 'POST', msg);
};

export const deleteGlobalChatMessage = async (id: string): Promise<void> => {
    try {
        await apiCall(`/global_chat/${id}`, 'DELETE');
    } catch (e) {}
};

export const updateGlobalChatMessageReactions = async (id: string, reactions: import('../types').MessageReaction[]): Promise<void> => {
    try {
        await apiCall(`/global_chat/${id}`, 'PATCH', { reactions });
    } catch (e) {}
};

export const getStorageEstimate = async (): Promise<StorageEstimate | undefined> => {
    if (navigator.storage && navigator.storage.estimate) {
        return await navigator.storage.estimate();
    }
    return undefined;
};

export const clearLocalCache = async () => {
    const db = await getDB();
    await db.clear('exhibits');
    await db.clear('collections');
    await db.clear('users');
    await db.clear('notifications');
    await db.clear('messages');
    await db.clear('generic');
    window.location.reload();
};

export const markNotificationsRead = async (username: string) => {
    // 1. Update Local State (Immediate Feedback)
    let hasUpdates = false;
    hotCache.notifications.forEach(n => { 
        if(n.recipient === username && !n.isRead) {
            n.isRead = true;
            getDB().then(db => db.put('notifications', n));
            hasUpdates = true;
        }
    });
    
    if (hasUpdates) {
        notifyListeners();
        // 2. Persist to Server (Prevent Reversion)
        try {
            await apiCall('/notifications/read-all', 'POST', { username });
        } catch (e) {
            console.error("Failed to sync read status to server:", e);
        }
    }
};

export const markSingleNotificationRead = async (id: string, username: string) => {
    const notif = hotCache.notifications.find(n => n.id === id);
    if (notif && !notif.isRead) {
        notif.isRead = true;
        getDB().then(db => db.put('notifications', notif));
        notifyListeners();
        // Sync single update via generic API
        try {
            await apiCall('/notifications', 'POST', notif);
        } catch (e) {
            console.error("Failed to sync single notification read status:", e);
        }
    }
}

export const toggleFollow = async (me: string, them: string) => {
    const myUser   = hotCache.users.find(u => u.username === me);
    const theirUser = hotCache.users.find(u => u.username === them);

    if (!myUser) return;

    const isCurrentlyFollowing = myUser.following.includes(them);

    // ── Optimistic local update (instant UI feedback) ──
    if (isCurrentlyFollowing) {
        myUser.following = myUser.following.filter(u => u !== them);
        if (theirUser) theirUser.followers = (theirUser.followers || []).filter(u => u !== me);
    } else {
        if (!myUser.following.includes(them)) myUser.following.push(them);
        if (theirUser) {
            if (!theirUser.followers) theirUser.followers = [];
            if (!theirUser.followers.includes(me)) theirUser.followers.push(me);
        }
    }
    notifyListeners();

    try {
        // ── Atomic server-side update via dedicated endpoint ──
        // Uses PostgreSQL JSON ops — no race conditions, works even if theirUser
        // is missing from hotCache.
        const result = await apiCall('/follow', 'POST', {
            follower: me,
            following: them,
            unfollow: isCurrentlyFollowing,
        });

        if (result.success) {
            const db = await getDB();
            if (result.followerProfile) {
                hotCache.users = hotCache.users.map(u => u.username === me   ? result.followerProfile  : u);
                await db.put('users', result.followerProfile);
            }
            if (result.followingProfile) {
                hotCache.users = hotCache.users.map(u => u.username === them ? result.followingProfile : u);
                await db.put('users', result.followingProfile);
            }
            notifyListeners();
        }
    } catch (e) {
        // ── Revert optimistic update on failure ──
        console.error('[toggleFollow] Error:', e);
        if (isCurrentlyFollowing) {
            if (!myUser.following.includes(them)) myUser.following.push(them);
            if (theirUser) {
                if (!theirUser.followers) theirUser.followers = [];
                if (!theirUser.followers.includes(me)) theirUser.followers.push(me);
            }
        } else {
            myUser.following = myUser.following.filter(u => u !== them);
            if (theirUser) theirUser.followers = (theirUser.followers || []).filter(u => u !== me);
        }
        notifyListeners();
        throw e;
    }
};

export const joinGuild = async (code:string, u:string) => true;
export const leaveGuild = async (gid:string, u:string) => true;
export const kickFromGuild = async (gid:string, u:string) => {};

// --- TRADE SYSTEM ---
export const getMyTradeRequests = () => hotCache.tradeRequests || [];

export const sendTradeRequest = async (payload: Partial<TradeRequest> & { message?: string }) => {
    const db = await getDB();
    const storedSession = await db.get('system', SESSION_USER_KEY);
    const sender = storedSession?.value;
    if(!sender) throw new Error("Not logged in");

    const req: TradeRequest = {
        id: crypto.randomUUID(),
        sender: sender,
        recipient: payload.recipient!,
        senderItems: payload.senderItems || [],
        recipientItems: payload.recipientItems || [],
        type: payload.type || 'DIRECT',
        status: 'PENDING',
        messages: payload.message ? [{ author: sender, text: payload.message, timestamp: new Date().toISOString() }] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        price: payload.price,
        currency: 'RUB',
        isWishlistFulfillment: payload.isWishlistFulfillment,
        wishlistId: payload.wishlistId,
        shipment: payload.shipment,
    };

    hotCache.tradeRequests.push(req);
    notifyListeners();
    await saveGeneric('trade_requests', req);
    await apiCall('/trade_requests', 'POST', req);
    createNotification(req.recipient, 'TRADE_OFFER', sender, req.id, 'Новое предложение обмена');
};

export const acceptTradeRequest = async (id: string) => {
    const req = hotCache.tradeRequests.find(r => r.id === id);
    if (!req) return;

    if (req.shipment) {
        // When delivery is involved, don't transfer ownership yet.
        // Ownership transfers only after the recipient confirms delivery.
        req.status = 'SHIPPING_PENDING';
        // Register the shipment and get a tracking ID
        const { createShipment } = await import('./deliveryService');
        try {
            const trackingId = await createShipment(req.id, req.shipment);
            req.shipment = { ...req.shipment, status: 'CREATED', trackingId };
        } catch {
            // If delivery API fails, fall back to standard flow
            req.status = 'ACCEPTED';
        }
    } else {
        // No delivery — transfer items immediately (legacy behaviour)
        req.status = 'ACCEPTED';
        const senderItems = hotCache.exhibits.filter(e => req.senderItems.includes(e.id));
        const recipientItems = hotCache.exhibits.filter(e => req.recipientItems.includes(e.id));
        for (const item of senderItems) { item.owner = req.recipient; item.tradeStatus = 'NONE'; await updateExhibit(item); }
        for (const item of recipientItems) { item.owner = req.sender; item.tradeStatus = 'NONE'; await updateExhibit(item); }
    }

    req.updatedAt = new Date().toISOString();
    await saveGeneric('trade_requests', req);
    await apiCall('/trade_requests', 'POST', req);
    notifyListeners();
    createNotification(req.sender, 'TRADE_ACCEPTED', req.recipient, req.id, 'Предложение принято!');
};

export const updateTradeStatus = async (id: string, status: 'DECLINED' | 'CANCELLED') => {
    const req = hotCache.tradeRequests.find(r => r.id === id);
    if (!req) return;
    req.status = status;
    req.updatedAt = new Date().toISOString();
    await saveGeneric('trade_requests', req);
    await apiCall('/trade_requests', 'POST', req);
    notifyListeners();
    if (status === 'DECLINED') createNotification(req.sender, 'TRADE_DECLINED', req.recipient, req.id, 'Предложение отклонено');
};

export const completeTradeRequest = async (id: string) => {
    const req = hotCache.tradeRequests.find(r => r.id === id);
    if (!req) return;
    req.status = 'COMPLETED';
    req.updatedAt = new Date().toISOString();

    // If items weren't transferred yet (delivery flow), do it now
    if (req.shipment) {
        const senderItems = hotCache.exhibits.filter(e => req.senderItems.includes(e.id));
        const recipientItems = hotCache.exhibits.filter(e => req.recipientItems.includes(e.id));
        for (const item of senderItems) { item.owner = req.recipient; item.tradeStatus = 'NONE'; await updateExhibit(item); }
        for (const item of recipientItems) { item.owner = req.sender; item.tradeStatus = 'NONE'; await updateExhibit(item); }
    }

    await saveGeneric('trade_requests', req);
    await apiCall('/trade_requests', 'POST', req);
    notifyListeners();
    createNotification(req.sender, 'TRADE_COMPLETED', req.recipient, req.id, 'Сделка завершена!');

    // Auto-mark linked wishlist item as ACQUIRED
    if (req.isWishlistFulfillment && req.wishlistId) {
        const wishItem = hotCache.wishlist.find(w => w.id === req.wishlistId);
        if (wishItem && wishItem.status !== 'ACQUIRED') {
            const updated = { ...wishItem, status: 'ACQUIRED' as const };
            hotCache.wishlist = hotCache.wishlist.map(w => w.id === req.wishlistId ? updated : w);
            await saveGeneric('wishlist', updated);
            await apiCall('/wishlist', 'POST', updated);
            createNotification(req.recipient, 'WISHLIST_ACQUIRED', req.sender, req.wishlistId, wishItem.title);
        }
    }
};

export const confirmDelivery = async (id: string) => {
    const req = hotCache.tradeRequests.find(r => r.id === id);
    if (!req || !req.shipment) return;
    req.shipment = { ...req.shipment, status: 'DELIVERED' };
    req.updatedAt = new Date().toISOString();
    await saveGeneric('trade_requests', req);
    await apiCall('/trade_requests', 'POST', req);
    notifyListeners();
    await completeTradeRequest(id);
};

// ─────────────────────────────────────────────────────────────────────────────
// ⚔️ DAILY BATTLES
// ─────────────────────────────────────────────────────────────────────────────

export const getDailyBracket = async (category: string): Promise<{ bracket: DailyBracket | null; reason?: string }> => {
    try {
        const data = await apiCall(`/battles?category=${encodeURIComponent(category)}`, 'GET');
        return data;
    } catch {
        return { bracket: null };
    }
};

export const castBattleVote = async (bracketId: string, battleId: string, exhibitId: string, username: string): Promise<ArtifactBattle | null> => {
    try {
        const data = await apiCall('/battles/vote', 'POST', { bracketId, battleId, exhibitId, username });
        return data.battle ?? null;
    } catch {
        return null;
    }
};

export const getBattleHistory = async (category: string, limit = 5): Promise<DailyBracket[]> => {
    try {
        const data = await apiCall(`/battles/history?category=${encodeURIComponent(category)}&limit=${limit}`, 'GET');
        return data.history ?? [];
    } catch {
        return [];
    }
};