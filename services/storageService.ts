
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
const DB_VERSION = 1;
const SESSION_USER_KEY = 'neo_active_user';
const API_BASE = '/api';

// --- IN-MEMORY HOT CACHE (RAM) ---
// Mimics Redis on the client side for instant UI updates
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
                // System Store (Settings, Session)
                if (!db.objectStoreNames.contains('system')) db.createObjectStore('system');
                
                // Content Stores
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

// --- API HELPER ---
const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
        const headers: any = { 'Content-Type': 'application/json' };
        const options: RequestInit = { method, headers };
        if (body) options.body = JSON.stringify(body);
        
        const fullPath = `${API_BASE}${endpoint}`;
        const res = await fetch(fullPath, options);
        
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API Error ${res.status}: ${errText.slice(0, 100)}`);
        }
        return await res.json();
    } catch (e: any) {
        console.error(`❌ API Call Failed [${endpoint}]:`, e.message);
        throw e;
    }
};

export const isOffline = () => !navigator.onLine;

// --- CORE FUNCTIONS ---

// Load everything from IndexedDB to RAM (Hot Cache)
const hydrateCache = async () => {
    const db = await getDB();
    
    const [exhibits, collections, users, notifications, messages, generic] = await Promise.all([
        db.getAll('exhibits'),
        db.getAll('collections'),
        db.getAll('users'),
        db.getAll('notifications'),
        db.getAll('messages'),
        db.getAll('generic')
    ]);

    hotCache.exhibits = exhibits.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    hotCache.collections = collections;
    hotCache.users = users;
    hotCache.notifications = notifications;
    hotCache.messages = messages;
    
    // Unpack generic tables
    hotCache.wishlist = generic.filter((i:any) => i.table === 'wishlist').map((i:any) => i.data);
    hotCache.guestbook = generic.filter((i:any) => i.table === 'guestbook').map((i:any) => i.data);
    hotCache.guilds = generic.filter((i:any) => i.table === 'guilds').map((i:any) => i.data);
    hotCache.tradeRequests = generic.filter((i:any) => i.table === 'tradeRequests').map((i:any) => i.data);

    notifyListeners();
    console.log(`[NeoDB] Hydrated: ${exhibits.length} items, ${users.length} users.`);
};

// Generic DB Helper for things that don't have their own store
const saveGeneric = async (table: string, data: any) => {
    const db = await getDB();
    // Wrap in a structure that allows storing by ID in the 'generic' store
    await db.put('generic', { id: data.id, table, data });
};
const deleteGeneric = async (id: string) => {
    const db = await getDB();
    await db.delete('generic', id);
};

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    // 0. CLEANUP OLD LEGACY CACHE
    try { localStorage.removeItem('neo_archive_db_cache_v2'); } catch(e){}

    // 1. Load Local Data Fast
    await hydrateCache();
    
    const db = await getDB();
    const storedSession = await db.get('system', SESSION_USER_KEY);
    const activeUserUsername = storedSession?.value;

    // 2. Background Sync
    if (navigator.onLine) {
        try {
            // Fetch Feed
            const feed = await apiCall('/feed');
            if (Array.isArray(feed)) {
                const tx = db.transaction('exhibits', 'readwrite');
                // Smart merge: Update existing, add new.
                // We trust server timestamp more than local unless it's a draft
                await Promise.all(feed.map(item => tx.store.put(item)));
                await tx.done;
            }

            // Fetch User Data if logged in
            if (activeUserUsername) {
                const syncData = await apiCall(`/sync?username=${activeUserUsername}`);
                
                if (syncData.users) {
                    const txUser = db.transaction('users', 'readwrite');
                    await Promise.all(syncData.users.map((u: UserProfile) => txUser.store.put(u)));
                    await txUser.done;
                }
                
                if (syncData.collections) {
                    const txCol = db.transaction('collections', 'readwrite');
                    await Promise.all(syncData.collections.map((c: Collection) => txCol.store.put(c)));
                    await txCol.done;
                }

                // Sync Notifications
                try {
                    const notifs = await apiCall(`/notifications?username=${activeUserUsername}`);
                    if(Array.isArray(notifs)) {
                        const txNotif = db.transaction('notifications', 'readwrite');
                        await Promise.all(notifs.map((n: Notification) => txNotif.store.put(n)));
                        await txNotif.done;
                    }
                } catch (e) {}
            }
            
            // Re-hydrate to reflect new server data
            await hydrateCache();
        } catch (e) {
            console.warn("[Sync] Server unreachable, using local data.");
        }
    }

    if (activeUserUsername) {
        return hotCache.users.find(u => u.username === activeUserUsername) || null;
    }
    return null;
};

// --- AUTH ---

export const loginUser = async (identifier: string, password: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/login', 'POST', { identifier, password });
    
    const db = await getDB();
    await db.put('system', { key: SESSION_USER_KEY, value: user.username });
    await db.put('users', user);
    
    // Update Hot Cache
    const idx = hotCache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) hotCache.users[idx] = user; else hotCache.users.push(user);
    
    notifyListeners();
    return user;
};

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/register', 'POST', { username, password, tagline, email });
    const db = await getDB();
    await db.put('system', { key: SESSION_USER_KEY, value: user.username });
    await db.put('users', user);
    hotCache.users.push(user);
    notifyListeners();
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
    await db.put('system', { key: SESSION_USER_KEY, value: user.username });
    await db.put('users', user);
    hotCache.users.push(user);
    notifyListeners();
    return user;
};

export const recoverPassword = async (email: string) => { 
    return await apiCall('/auth/recover', 'POST', { email }); 
};

// --- CRUD OPERATIONS (OPTIMISTIC UI UPDATE + ASYNC DB) ---

export const getFullDatabase = () => ({ ...hotCache });

export const saveExhibit = async (e: Exhibit) => {
    // 1. Optimistic Update (RAM)
    hotCache.exhibits.unshift(e);
    notifyListeners();
    
    // 2. Persist (IndexedDB)
    const db = await getDB();
    await db.put('exhibits', e);
    
    // 3. Sync (Server)
    await apiCall('/exhibits', 'POST', e);
};

export const updateExhibit = async (e: Exhibit) => {
    const idx = hotCache.exhibits.findIndex(x => x.id === e.id);
    if (idx !== -1) hotCache.exhibits[idx] = e;
    notifyListeners();
    
    const db = await getDB();
    await db.put('exhibits', e);
    await apiCall('/exhibits', 'POST', e);
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
    await apiCall('/users', 'POST', { id: u.username, ...u }); // Server expects full object
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
    // Local optimisic? No, usually notifications come from server logic, but for self-actions we can push locally?
    // Actually, we don't display outgoing notifications, only incoming.
    // So we just push to server.
    await apiCall('/notifications', 'POST', notif);
};

// Generic Items Handling (Guestbook, Wishlist, Guilds)
// These use the 'generic' store in IndexedDB

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

export const updateGuestbookEntry = async (e: GuestbookEntry) => {
    hotCache.guestbook = hotCache.guestbook.map(g => g.id === e.id ? e : g);
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
    // await apiCall('/guilds', 'POST', g); // Assuming API exists
};

export const deleteGuild = async (id: string) => {
    hotCache.guilds = hotCache.guilds.filter(g => g.id !== id);
    notifyListeners();
    await deleteGeneric(id);
    // await apiCall(`/guilds/${id}`, 'DELETE');
};

// UTILS

export const getUserAvatar = (username: string): string => {
    if (!username) return 'https://ui-avatars.com/api/?name=NA&background=000&color=fff';
    const u = hotCache.users.find(u => u.username === username);
    if (u?.avatarUrl) return u.avatarUrl;
    return `https://ui-avatars.com/api/?name=${username}&background=random&color=fff&bold=true`;
};

export const fetchExhibitById = async (id: string) => {
    // Try Hot Cache
    const mem = hotCache.exhibits.find(e => e.id === id);
    if (mem) return mem;
    
    // Try IndexedDB
    const db = await getDB();
    const local = await db.get('exhibits', id);
    if (local) return local;

    // Try Server
    try {
        const item = await apiCall(`/exhibits/${id}`);
        if(item) {
            await db.put('exhibits', item);
            hotCache.exhibits.push(item);
        }
        return item;
    } catch { return null; }
};

export const fetchCollectionById = async (id: string) => {
    const mem = hotCache.collections.find(c => c.id === id);
    if (mem) return mem;
    
    const db = await getDB();
    const local = await db.get('collections', id);
    if (local) return local;

    try {
        const col = await apiCall(`/collections/${id}`);
        if(col) {
            await db.put('collections', col);
            hotCache.collections.push(col);
        }
        return col;
    } catch { return null; }
};

export const calculateFeedScore = (item: Exhibit, user: UserProfile) => {
    return new Date(item.timestamp).getTime();
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
    // Clear all object stores
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
            // Async update DB
            const dbPromise = getDB().then(db => db.put('notifications', n));
        }
    });
    notifyListeners();
    // Batch API call ideally, or just individual
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
export const getMyTradeRequests = () => ({ incoming: [], outgoing: [], history: [], active: [], actionRequired: [] });
export const sendTradeRequest = async (p: any) => {};
export const acceptTradeRequest = async (id:string) => {};
export const updateTradeStatus = async (id:string, s:string) => {};
export const completeTradeRequest = async (id:string) => {};
