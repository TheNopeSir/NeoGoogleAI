
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
// UPDATED TOKEN TO FORCE CLIENT RESET
const FORCE_RESET_TOKEN = 'NEO_RESET_S3_MIGRATION_V3_FINAL'; 

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
        console.log(`[API] Deduplicating request: ${endpoint}`);
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

            // Anti-Caching strategy
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
            if (e.name === 'AbortError') {
                console.warn(`[API] Timeout on ${endpoint} - switching to offline mode logic`);
                throw new Error('Network timeout');
            }
            console.error(`❌ API Call Failed [${endpoint}]:`, e.message);
            throw e;
        } finally {
            if (cacheKey) pendingRequests.delete(cacheKey);
        }
    })();

    if (cacheKey) pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
};

export const isOffline = () => !navigator.onLine;

// --- CORE FUNCTIONS ---

// 1. FAST Hydration (Users & Metadata only)
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

// 2. OPTIMIZED Hydration (Exhibits) - LOAD ONLY LATEST
const hydrateContent = async () => {
    try {
        const db = await getDB();
        
        // OPTIMIZATION: Do not load ALL exhibits at once if database is huge.
        // Load only latest 30 exhibits from IDB for immediate display.
        const tx = db.transaction('exhibits', 'readonly');
        const index = tx.store.index('by-date');
        let cursor = await index.openCursor(null, 'prev'); // 'prev' means latest first
        
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

        hotCache.exhibits = latestExhibits; // Already sorted by date desc by cursor
        hotCache.collections = collections;
        
        hotCache.wishlist = generic.filter((i:any) => i.table === 'wishlist').map((i:any) => i.data);
        hotCache.guestbook = generic.filter((i:any) => i.table === 'guestbook').map((i:any) => i.data);
        hotCache.guilds = generic.filter((i:any) => i.table === 'guilds').map((i:any) => i.data);
        hotCache.tradeRequests = generic.filter((i:any) => i.table === 'trade_requests').map((i:any) => i.data);

        console.log(`[NeoDB] Content Hydrated (Lite): ${latestExhibits.length} latest items`);
        notifyListeners();
    } catch (e) {
        console.error("Content hydration failed:", e);
    }
};

const saveGeneric = async (table: string, data: any) => {
    const db = await getDB();
    await db.put('generic', { id: data.id, table, data });
};
const deleteGeneric = async (id: string) => {
    const db = await getDB();
    await db.delete('generic', id);
};

// 3. CRITICAL FEED LOADER - Fetch fresh data from API
const loadCriticalFeedData = async () => {
    try {
        // Reduced limit to 30 for speed
        const limit = 30;
        console.log("📦 [Sync] Loading critical feed data...");
        const data = await apiCall(`/feed?limit=${limit}`);
        if (!Array.isArray(data)) return;

        // Smart Merge: Only update if changed or new
        const serverIds = new Set(data.map((e: any) => e.id));
        const oldItemsToKeep = hotCache.exhibits.filter(e => !serverIds.has(e.id));
        const merged = [...data, ...oldItemsToKeep].sort((a:any, b:any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        hotCache.exhibits = merged;
        notifyListeners();

        // Persist to IDB in background
        getDB().then(db => {
            const tx = db.transaction('exhibits', 'readwrite');
            data.forEach((item: any) => tx.store.put(item));
            return tx.done;
        }).then(() => console.log("✅ [Sync] Feed persisted"));

        console.log(`✅ [Sync] Feed loaded: ${data.length} items`);
    } catch (e) {
        console.warn("[Sync] Critical feed load failed:", e);
    }
};

// BACKGROUND SYNC LOGIC
const performBackgroundSync = async (activeUserUsername?: string) => {
    console.log("🔄 [Sync] Starting background sync...");
    const db = await getDB();

    const fetchAndApply = async (endpoint: string, table: keyof NeoArchiveDB | 'generic', genericTable?: string, cacheKey?: keyof typeof hotCache) => {
        try {
            const data = await apiCall(endpoint);
            if (!Array.isArray(data)) return;

            if (cacheKey) {
                if (cacheKey === 'exhibits') {
                    // Similar smart merge logic as above
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
                 // Add trade sync if endpoint supports it without param
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
            console.log(`✅ [Sync] ${endpoint} persisted`);
        } catch (e) {
            console.warn(`[Sync] Failed ${endpoint}:`, e);
        }
    };

    Promise.allSettled([
        fetchAndApply('/feed?limit=30', 'exhibits', undefined, 'exhibits'),
        fetchAndApply('/users', 'users', undefined, 'users'),
        fetchAndApply('/collections', 'collections', undefined, 'collections'),
        fetchAndApply('/wishlist', 'generic', 'wishlist', 'wishlist'),
        fetchAndApply('/guestbook', 'generic', 'guestbook', 'guestbook')
    ]).then(results => {
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            console.warn(`[Sync] ${failures.length} requests failed`);
        }
    });

    if (activeUserUsername) {
        apiCall(`/sync?username=${activeUserUsername}`).then(async (syncData) => {
            if (!syncData) return;
            
            if (syncData.users?.length) {
                const tx = db.transaction('users', 'readwrite');
                syncData.users.forEach((u: UserProfile) => {
                    tx.store.put(u);
                    const idx = hotCache.users.findIndex(ex => ex.username === u.username);
                    if(idx !== -1) hotCache.users[idx] = u; else hotCache.users.push(u);
                });
                await tx.done;
            }
            if (syncData.collections?.length) {
                const tx = db.transaction('collections', 'readwrite');
                syncData.collections.forEach((c: Collection) => {
                    tx.store.put(c);
                    const idx = hotCache.collections.findIndex(ex => ex.id === c.id);
                    if(idx !== -1) hotCache.collections[idx] = c; else hotCache.collections.push(c);
                });
                await tx.done;
            }
            if (syncData.tradeRequests?.length) {
                hotCache.tradeRequests = syncData.tradeRequests;
                syncData.tradeRequests.forEach(async (tr: TradeRequest) => {
                    await saveGeneric('trade_requests', tr);
                });
            }
            notifyListeners();
        }).catch(e => console.warn("[Sync] Personal Sync Error", e));

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
    try { localStorage.removeItem('neo_archive_db_cache_v2'); } catch(e){}

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

    await hydrateCritical();
    await hydrateContent(); // Now optimized to only load latest

    let activeUserUsername: string | undefined;
    try {
        const db = await getDB();
        const storedSession = await db.get('system', SESSION_USER_KEY);
        activeUserUsername = storedSession?.value;
    } catch (e) {
        console.warn("Could not read session from DB");
    }

    if (activeUserUsername) {
        await loadCriticalFeedData();
        performBackgroundSync(activeUserUsername);
        return hotCache.users.find(u => u.username === activeUserUsername) || null;
    }

    return null;
};

// --- AUTH & CRUD OPERATIONS ---
// (Standard CRUD below - largely unchanged but using S3 optimization logic if applicable)

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
    const db = await getDB();
    const local = await db.get('exhibits', id);
    if (local && !(local as any)._isLite) return local;
    try {
        const item = await apiCall(`/exhibits/${id}`);
        if(item) {
            await db.put('exhibits', item);
            const idx = hotCache.exhibits.findIndex(e => e.id === id);
            if (idx !== -1) hotCache.exhibits[idx] = item; else hotCache.exhibits.push(item);
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

// Get my active user from hotCache based on last session logic if simpler, 
// but it's better to filter by current user passed in context.
// However, hotCache has everything.
export const getMyTradeRequests = () => {
    // This helper returns all known trade requests. Component filters by user.
    return hotCache.tradeRequests || [];
};

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
    
    // Notify Recipient
    createNotification(req.recipient, 'TRADE_OFFER', sender, req.id, 'Новое предложение обмена');
};

export const acceptTradeRequest = async (id: string) => {
    const req = hotCache.tradeRequests.find(r => r.id === id);
    if (!req) return;

    // 1. Update Request Status
    req.status = 'ACCEPTED';
    req.updatedAt = new Date().toISOString();
    
    // 2. Perform Swap Logic (Simplistic: Swap Ownership)
    // IMPORTANT: In a real app, this should be transactional on the server.
    // Here we simulate it optimistically.
    
    const senderItems = hotCache.exhibits.filter(e => req.senderItems.includes(e.id));
    const recipientItems = hotCache.exhibits.filter(e => req.recipientItems.includes(e.id));

    // Move Sender items to Recipient
    for (const item of senderItems) {
        item.owner = req.recipient;
        item.tradeStatus = 'NONE'; // Reset status
        await updateExhibit(item);
    }

    // Move Recipient items to Sender
    for (const item of recipientItems) {
        item.owner = req.sender;
        item.tradeStatus = 'NONE';
        await updateExhibit(item);
    }

    // 3. Save Request
    await saveGeneric('trade_requests', req);
    await apiCall('/trade_requests', 'POST', req);
    
    notifyListeners();
    
    // Notify Sender
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
    
    const target = status === 'CANCELLED' ? req.recipient : req.sender; // If cancelled (by sender), notify recipient? Usually no need if pending.
    // If declined (by recipient), notify sender.
    if (status === 'DECLINED') {
        createNotification(req.sender, 'TRADE_DECLINED', req.recipient, req.id, 'Предложение отклонено');
    }
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
