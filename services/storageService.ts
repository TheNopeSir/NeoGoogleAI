
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
const FORCE_RESET_TOKEN = 'NEO_RESET_2025_V1'; // Changing this clears DB for everyone

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
                // Handle Chrome specific "tab blocking" issue
                console.warn("Database blocked: please close other tabs with this app open.");
            },
            blocking() {
                // If this tab is blocking another version, close connection
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
const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const controller = new AbortController();
    // 8 second timeout. If server doesn't respond, we fail and use local DB.
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const headers: any = { 'Content-Type': 'application/json' };
        const options: RequestInit = { 
            method, 
            headers,
            signal: controller.signal 
        };
        if (body) options.body = JSON.stringify(body);
        
        const fullPath = `${API_BASE}${endpoint}`;
        const res = await fetch(fullPath, options);
        
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API Error ${res.status}: ${errText.slice(0, 100)}`);
        }
        return await res.json();
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            console.warn(`[API] Timeout on ${endpoint} - switching to offline mode logic`);
            throw new Error('Network timeout');
        }
        console.error(`❌ API Call Failed [${endpoint}]:`, e.message);
        throw e;
    }
};

export const isOffline = () => !navigator.onLine;

// --- CORE FUNCTIONS ---

// 1. FAST Hydration (Users & Metadata only) - Blocks UI for minimal time
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

// 2. SLOW Hydration (Exhibits with images) - Runs in background
const hydrateContent = async () => {
    try {
        const db = await getDB();
        const [exhibits, collections, generic] = await Promise.all([
            db.getAll('exhibits'),
            db.getAll('collections'),
            db.getAll('generic')
        ]);

        hotCache.exhibits = exhibits.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        hotCache.collections = collections;
        
        // Unpack generic tables
        hotCache.wishlist = generic.filter((i:any) => i.table === 'wishlist').map((i:any) => i.data);
        hotCache.guestbook = generic.filter((i:any) => i.table === 'guestbook').map((i:any) => i.data);
        hotCache.guilds = generic.filter((i:any) => i.table === 'guilds').map((i:any) => i.data);
        hotCache.tradeRequests = generic.filter((i:any) => i.table === 'tradeRequests').map((i:any) => i.data);

        console.log(`[NeoDB] Content Hydrated: ${exhibits.length} items`);
        notifyListeners(); // Update UI immediately when IDB is ready
    } catch (e) {
        console.error("Content hydration failed:", e);
    }
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

// BACKGROUND SYNC LOGIC (Progressive - Instant Updates)
const performBackgroundSync = async (activeUserUsername?: string) => {
    if (!navigator.onLine) return;
    
    console.log("🔄 [Sync] Starting Progressive Sync...");
    const db = await getDB();

    // Helper to process specific fetch and update UI immediately
    const fetchAndApply = async (endpoint: string, table: keyof NeoArchiveDB | 'generic', genericTable?: string, cacheKey?: keyof typeof hotCache) => {
        try {
            const data = await apiCall(endpoint);
            if (!Array.isArray(data)) return;

            const tx = db.transaction(table as any, 'readwrite');
            const store = tx.objectStore(table as any);

            // Update IDB & Hot Cache in parallel
            if (table === 'generic' && genericTable && cacheKey) {
                // Generic logic
                data.forEach(item => store.put({ id: item.id, table: genericTable, data: item }));
                hotCache[cacheKey] = data as any;
            } else if (cacheKey) {
                // Specific table logic
                data.forEach(item => store.put(item));
                
                // Special Sort for exhibits
                if (cacheKey === 'exhibits') {
                    hotCache.exhibits = data.sort((a:any, b:any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                } else {
                    hotCache[cacheKey] = data as any;
                }
            }
            
            await tx.done;
            notifyListeners(); // <--- CRITICAL: Update UI as soon as THIS chunk is ready
            console.log(`✅ [Sync] ${endpoint} loaded & rendered`);
        } catch (e) {
            console.warn(`[Sync] Failed ${endpoint}:`, e);
        }
    };

    // 1. FETCH FEED FIRST (Most important for "Instant" feel)
    fetchAndApply('/feed', 'exhibits', undefined, 'exhibits');

    // 2. Fetch others in parallel (don't await feed)
    fetchAndApply('/users', 'users', undefined, 'users');
    fetchAndApply('/collections', 'collections', undefined, 'collections');
    fetchAndApply('/wishlist', 'generic', 'wishlist', 'wishlist');
    fetchAndApply('/guestbook', 'generic', 'guestbook', 'guestbook');

    // 3. User Specific Sync
    if (activeUserUsername) {
        apiCall(`/sync?username=${activeUserUsername}`).then(async (syncData) => {
            if (!syncData) return;
            const tx = db.transaction(['users', 'collections'], 'readwrite');
            
            if (syncData.users?.length) {
                syncData.users.forEach((u: UserProfile) => tx.objectStore('users').put(u));
                // Merge users
                syncData.users.forEach((u: UserProfile) => {
                    const idx = hotCache.users.findIndex(ex => ex.username === u.username);
                    if(idx !== -1) hotCache.users[idx] = u; else hotCache.users.push(u);
                });
            }
            if (syncData.collections?.length) {
                syncData.collections.forEach((c: Collection) => tx.objectStore('collections').put(c));
                // Merge collections
                syncData.collections.forEach((c: Collection) => {
                    const idx = hotCache.collections.findIndex(ex => ex.id === c.id);
                    if(idx !== -1) hotCache.collections[idx] = c; else hotCache.collections.push(c);
                });
            }
            await tx.done;
            notifyListeners();
        }).catch(e => console.warn("[Sync] Personal Sync Error", e));

        // Notifications & Messages
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
        }).catch(e => console.warn("[Sync] Messages Sync Error", e));
    }
};

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    // 0. CLEANUP OLD LEGACY CACHE
    try { localStorage.removeItem('neo_archive_db_cache_v2'); } catch(e){}

    // 0.1 FORCE RESET CHECK
    const lastReset = localStorage.getItem('neo_force_reset_key');
    if (lastReset !== FORCE_RESET_TOKEN) {
        console.warn("⚠️ FORCE CLEARING CACHE FOR UPDATE");
        try {
            const db = await getDB();
            await db.clear('exhibits');
            await db.clear('collections');
            await db.clear('users');
            await db.clear('notifications');
            await db.clear('messages');
            await db.clear('generic');
            localStorage.setItem('neo_force_reset_key', FORCE_RESET_TOKEN);
        } catch (e) {
            console.error("Cache reset failed:", e);
        }
    }

    // 1. Load Critical Data (Users/Session)
    await hydrateCritical();
    
    // 2. Start Heavy Load (Exhibits from IDB)
    hydrateContent();

    let activeUserUsername: string | undefined;
    try {
        const db = await getDB();
        const storedSession = await db.get('system', SESSION_USER_KEY);
        activeUserUsername = storedSession?.value;
    } catch (e) {
        console.warn("Could not read session from DB");
    }

    // 3. Trigger Progressive Background Sync IMMEDIATELY
    // Do not await this. Let it populate the UI as data arrives.
    performBackgroundSync(activeUserUsername);

    // 4. Return user immediately from local cache if present
    if (activeUserUsername) {
        return hotCache.users.find(u => u.username === activeUserUsername) || null;
    }
    return null;
};

// --- AUTH ---

export const loginUser = async (identifier: string, password: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/login', 'POST', { identifier, password });
    
    const db = await getDB();
    await db.put('system', { key: SESSION_USER_KEY, value: user.username }, SESSION_USER_KEY);
    await db.put('users', user);
    
    // Update Hot Cache
    const idx = hotCache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) hotCache.users[idx] = user; else hotCache.users.push(user);
    
    notifyListeners();
    // Trigger sync after login to get fresh data
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
            const dbPromise = getDB().then(db => db.put('notifications', n));
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
export const getMyTradeRequests = () => ({ incoming: [], outgoing: [], history: [], active: [], actionRequired: [] });
export const sendTradeRequest = async (p: any) => {};
export const acceptTradeRequest = async (id:string) => {};
export const updateTradeStatus = async (id:string, s:string) => {};
export const completeTradeRequest = async (id:string) => {};
