
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry, WishlistItem, Guild, Duel, TradeRequest, NotificationType } from '../types';

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
const API_BASE = '/api';
const FORCE_RESET_TOKEN = 'NEO_RESET_S3_MIGRATION_V3_FINAL'; 

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
const notifyListeners = () => listeners.forEach(l => l());

// --- API HELPER WITH TIMEOUT ---
const pendingRequests = new Map<string, Promise<any>>();

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const cacheKey = method === 'GET' ? `${method}:${endpoint}` : null;
    if (cacheKey && pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey)!;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const requestPromise = (async () => {
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const options: RequestInit = {
                method,
                headers,
                signal: controller.signal
            };
            if (body) options.body = JSON.stringify(body);

            let fullPath = `${API_BASE}${endpoint}`;

            if (method === 'GET') {
                const separator = fullPath.includes('?') ? '&' : '?';
                fullPath += `${separator}_t=${Date.now()}`;
            }

            const res = await fetch(fullPath, options);
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errText = await res.text();
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
            new Promise<IDBPDatabase<NeoArchiveDB>>((_, reject) => setTimeout(() => reject(new Error("DB_OPEN_TIMEOUT")), 2000))
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
        const tx = db.transaction('exhibits', 'readonly');
        const index = tx.store.index('by-date');
        let cursor = await index.openCursor(null, 'prev');
        const latestExhibits: Exhibit[] = [];
        let count = 0;
        while (cursor && count < 30) {
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

// ... (Existing Save Functions) ...

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
        const registration = await navigator.serviceWorker.ready;
        
        // VAPID Public Key from ENV
        const vapidPublicKey = (import.meta as any).env.VITE_VAPID_PUBLIC_KEY;
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
            await subscription.unsubscribe();
            // TODO: Notify server to remove sub
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
        await loadCriticalFeedData();
        performBackgroundSync(activeUserUsername);
        return hotCache.users.find(u => u.username === activeUserUsername) || null;
    }

    return null;
};

// ... (Rest of existing functions) ...

// --- CRUD OPERATIONS (Restored from previous) ---
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
        const limit = 30;
        const data = await apiCall(`/feed?limit=${limit}`);
        if (!Array.isArray(data)) return;
        const serverIds = new Set(data.map((e: any) => e.id));
        const oldItemsToKeep = hotCache.exhibits.filter(e => !serverIds.has(e.id));
        const merged = [...data, ...oldItemsToKeep].sort((a:any, b:any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        hotCache.exhibits = merged;
        notifyListeners();
        getDB().then(db => {
            const tx = db.transaction('exhibits', 'readwrite');
            data.forEach((item: any) => tx.store.put(item));
            return tx.done;
        });
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
                    const serverIds = new Set(data.map((e: any) => e.id));
                    const oldItemsToKeep = hotCache.exhibits.filter(e => !serverIds.has(e.id));
                    const merged = [...data, ...oldItemsToKeep].sort((a:any, b:any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    hotCache.exhibits = merged;
                } else {
                    hotCache[cacheKey] = data as any;
                }
            } else if (table === 'generic') {
                 if (genericTable === 'wishlist') hotCache.wishlist = data;
                 if (genericTable === 'guestbook') hotCache.guestbook = data;
            }
            notifyListeners();
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

    Promise.allSettled([
        fetchAndApply('/feed?limit=30', 'exhibits', undefined, 'exhibits'),
        fetchAndApply('/users', 'users', undefined, 'users'),
        fetchAndApply('/collections', 'collections', undefined, 'collections'),
        fetchAndApply('/wishlist', 'generic', 'wishlist', 'wishlist'),
        fetchAndApply('/guestbook', 'generic', 'guestbook', 'guestbook')
    ]);

    if (activeUserUsername) {
        apiCall(`/sync?username=${activeUserUsername}`).then(async (syncData) => {
            if (!syncData) return;
            if (syncData.tradeRequests?.length) {
                hotCache.tradeRequests = syncData.tradeRequests;
                syncData.tradeRequests.forEach(async (tr: TradeRequest) => await saveGeneric('trade_requests', tr));
            }
            notifyListeners();
        });
        Promise.all([
            apiCall(`/notifications?username=${activeUserUsername}`),
            apiCall(`/messages?username=${activeUserUsername}`)
        ]).then(async ([notifs, msgs]) => {
            const tx = db.transaction(['notifications', 'messages'], 'readwrite');
            if (Array.isArray(notifs)) {
                notifs.forEach(n => tx.objectStore('notifications').put(n));
                hotCache.notifications = notifs;
            }
            if (Array.isArray(msgs)) {
                msgs.forEach(m => tx.objectStore('messages').put(m));
                hotCache.messages = msgs;
            }
            await tx.done;
            notifyListeners();
        });
    }
};

export const loginUser = async (identifier: string, password: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/login', 'POST', { identifier, password });
    const db = await getDB();
    await db.put('system', { key: SESSION_USER_KEY, value: user.username }, SESSION_USER_KEY);
    await db.put('users', user);
    const idx = hotCache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) hotCache.users[idx] = user; else hotCache.users.push(user);
    notifyListeners();
    await loadCriticalFeedData();
    performBackgroundSync(user.username);
    return user;
};

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/register', 'POST', { username, password, tagline, email });
    const db = await getDB();
    await db.put('system', { key: SESSION_USER_KEY, value: user.username }, SESSION_USER_KEY);
    await db.put('users', user);
    hotCache.users.push(user);
    notifyListeners();
    await loadCriticalFeedData();
    performBackgroundSync(user.username);
    return user;
};

export const logoutUser = async () => {
    const db = await getDB();
    await db.delete('system', SESSION_USER_KEY);
    window.location.reload();
};

export const loginViaTelegram = async (tgUser: any) => {
    const user = await apiCall('/auth/telegram', 'POST', tgUser);
    const db = await getDB();
    await db.put('system', { key: SESSION_USER_KEY, value: user.username }, SESSION_USER_KEY);
    await db.put('users', user);
    hotCache.users.push(user);
    notifyListeners();
    performBackgroundSync(user.username);
    return user;
};

export const recoverPassword = async (email: string) => { 
    return await apiCall('/auth/recover', 'POST', { email }); 
};

export const getFullDatabase = () => ({ ...hotCache });

export const saveExhibit = async (e: Exhibit) => {
    hotCache.exhibits.unshift(e);
    notifyListeners();
    const db = await getDB();
    await db.put('exhibits', e);
    const serverResponse = await apiCall('/exhibits', 'POST', e);
    if (serverResponse && serverResponse.imageUrls) {
        const updatedExhibit = { ...e, imageUrls: serverResponse.imageUrls };
        const idx = hotCache.exhibits.findIndex(x => x.id === e.id);
        if (idx !== -1) hotCache.exhibits[idx] = updatedExhibit;
        await db.put('exhibits', updatedExhibit);
        notifyListeners();
    }
};

export const updateExhibit = async (e: Exhibit) => {
    const idx = hotCache.exhibits.findIndex(x => x.id === e.id);
    if (idx !== -1) hotCache.exhibits[idx] = e;
    notifyListeners();
    const db = await getDB();
    await db.put('exhibits', e);
    const serverResponse = await apiCall('/exhibits', 'POST', e);
    if (serverResponse && serverResponse.imageUrls) {
        const updatedExhibit = { ...e, imageUrls: serverResponse.imageUrls };
        if (idx !== -1) hotCache.exhibits[idx] = updatedExhibit;
        await db.put('exhibits', updatedExhibit);
        notifyListeners();
    }
};

export const deleteExhibit = async (id: string) => {
    hotCache.exhibits = hotCache.exhibits.filter(e => e.id !== id);
    notifyListeners();
    const db = await getDB();
    await db.delete('exhibits', id);
    await apiCall(`/exhibits/${id}`, 'DELETE');
};

export const saveCollection = async (c: Collection) => {
    hotCache.collections.push(c);
    notifyListeners();
    const db = await getDB();
    await db.put('collections', c);
    await apiCall('/collections', 'POST', c);
};

export const updateCollection = async (c: Collection) => {
    hotCache.collections = hotCache.collections.map(col => col.id === c.id ? c : col);
    notifyListeners();
    const db = await getDB();
    await db.put('collections', c);
    await apiCall('/collections', 'POST', c);
};

export const deleteCollection = async (id: string) => {
    hotCache.collections = hotCache.collections.filter(c => c.id !== id);
    notifyListeners();
    const db = await getDB();
    await db.delete('collections', id);
    await apiCall(`/collections/${id}`, 'DELETE');
};

export const updateUserProfile = async (u: UserProfile) => {
    const idx = hotCache.users.findIndex(us => us.username === u.username);
    if (idx !== -1) hotCache.users[idx] = u;
    notifyListeners();
    const db = await getDB();
    await db.put('users', u);
    await apiCall('/users', 'POST', { id: u.username, ...u });
};

export const createNotification = async (r:string, t:NotificationType, a:string, id?:string, p?:string) => {
    const notif: Notification = {
        id: crypto.randomUUID(),
        type: t,
        recipient: r,
        actor: a,
        targetId: id,
        targetPreview: p,
        timestamp: new Date().toISOString(),
        isRead: false
    };
    await apiCall('/notifications', 'POST', notif);
};

export const saveWishlistItem = async (w: WishlistItem) => {
    hotCache.wishlist.push(w);
    notifyListeners();
    await saveGeneric('wishlist', w);
    await apiCall('/wishlist', 'POST', w);
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

export const getUserAvatar = (username: string): string => {
    if (!username) return 'https://ui-avatars.com/api/?name=NA&background=000&color=fff';
    const u = hotCache.users.find(u => u.username === username);
    if (u?.avatarUrl) return u.avatarUrl;
    return `https://ui-avatars.com/api/?name=${username}&background=random&color=fff&bold=true`;
};

export const fetchExhibitById = async (id: string) => {
    const mem = hotCache.exhibits.find(e => e.id === id);
    if (mem && !(mem as any)._isLite) return mem;
    try {
        const item = await apiCall(`/exhibits/${id}`);
        if(item) {
            const db = await getDB();
            await db.put('exhibits', item);
            const idx = hotCache.exhibits.findIndex(e => e.id === id);
            if (idx !== -1) hotCache.exhibits[idx] = item; else hotCache.exhibits.push(item);
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
            hotCache.collections.push(col);
        }
        return col;
    } catch { return null; }
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const startLiveUpdates = () => {};
export const stopLiveUpdates = () => {};

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

export const markNotificationsRead = async (u:string) => {
    hotCache.notifications.forEach(n => { 
        if(n.recipient === u && !n.isRead) {
            n.isRead = true;
            getDB().then(db => db.put('notifications', n));
        }
    });
    notifyListeners();
};

export const toggleFollow = async (me:string, them:string) => {
    const myUser = hotCache.users.find(u => u.username === me);
    if(myUser) {
        if(myUser.following.includes(them)) {
            myUser.following = myUser.following.filter(u => u !== them);
        } else {
            myUser.following.push(them);
        }
        await updateUserProfile(myUser);
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
        wishlistId: payload.wishlistId
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
    req.status = 'ACCEPTED';
    req.updatedAt = new Date().toISOString();
    const senderItems = hotCache.exhibits.filter(e => req.senderItems.includes(e.id));
    const recipientItems = hotCache.exhibits.filter(e => req.recipientItems.includes(e.id));
    for (const item of senderItems) { item.owner = req.recipient; item.tradeStatus = 'NONE'; await updateExhibit(item); }
    for (const item of recipientItems) { item.owner = req.sender; item.tradeStatus = 'NONE'; await updateExhibit(item); }
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
    await saveGeneric('trade_requests', req);
    await apiCall('/trade_requests', 'POST', req);
    notifyListeners();
};
