
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry, WishlistItem, Guild, Duel, TradeRequest, NotificationType, ApiKey } from '../types';

// ==========================================
// 🚀 NEO_ARCHIVE HIGH-PERFORMANCE DB LAYER
// ==========================================

interface NeoArchiveDB extends DBSchema {
  system: { key: string; value: any; };
  exhibits: { key: string; value: Exhibit & { _isLite?: boolean }; indexes: { 'by-owner': string; 'by-date': string }; };
  collections: { key: string; value: Collection; indexes: { 'by-owner': string }; };
  users: { key: string; value: UserProfile; };
  notifications: { key: string; value: Notification; indexes: { 'by-recipient': string }; };
  messages: { key: string; value: Message; };
  generic: { key: string; value: any; };
}

const DB_NAME = 'NeoArchive_V3_Turbo';
const DB_VERSION = 2; 
const SESSION_USER_KEY = 'neo_active_user';
const API_BASE = '/api';
const FORCE_RESET_TOKEN = 'NEO_RESET_2025_V1';

// --- IN-MEMORY HOT CACHE (RAM) ---
let hotCache = {
    exhibits: [] as (Exhibit & { _isLite?: boolean })[],
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
            blocked() { console.warn("Database blocked"); },
            blocking() { if (dbPromise) { dbPromise.then(db => db.close()); dbPromise = null; } },
            terminated() { console.error("Database terminated"); }
        });
    }
    return dbPromise;
};

// Safe wrapper to prevent crashes if DB is blocked by browser (Tracking Prevention)
const safeDB = async <T>(operation: (db: IDBPDatabase<NeoArchiveDB>) => Promise<T>): Promise<T | null> => {
    try {
        const db = await getDB();
        return await operation(db);
    } catch (e) {
        console.warn("[NeoDB] Storage operation blocked or failed. Running in memory mode.", e);
        return null;
    }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const headers: any = { 'Content-Type': 'application/json' };
        const options: RequestInit = { method, headers, signal: controller.signal };
        if (body) options.body = JSON.stringify(body);
        
        const fullPath = `${API_BASE}${endpoint}`;
        const res = await fetch(fullPath, options);
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`API Error ${res.status}`);
        return await res.json();
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') throw new Error('Network timeout');
        console.error(`❌ API Call Failed [${endpoint}]:`, e.message);
        throw e;
    }
};

export const isOffline = () => !navigator.onLine;

// --- CORE FUNCTIONS ---

const hydrateCritical = async () => {
    // Attempt to load from DB, but don't crash if blocked
    await safeDB(async (db) => {
        const [users, notifications, messages] = await Promise.all([
            db.getAll('users'),
            db.getAll('notifications'),
            db.getAll('messages'),
        ]);
        hotCache.users = users;
        hotCache.notifications = notifications;
        hotCache.messages = messages;
    });
};

const hydrateContent = async () => {
    await safeDB(async (db) => {
        const [exhibits, collections, generic] = await Promise.all([
            db.getAll('exhibits'),
            db.getAll('collections'),
            db.getAll('generic')
        ]);
        hotCache.exhibits = exhibits.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        hotCache.collections = collections;
        hotCache.wishlist = generic.filter((i:any) => i.table === 'wishlist').map((i:any) => i.data);
        hotCache.guestbook = generic.filter((i:any) => i.table === 'guestbook').map((i:any) => i.data);
        hotCache.guilds = generic.filter((i:any) => i.table === 'guilds').map((i:any) => i.data);
        hotCache.tradeRequests = generic.filter((i:any) => i.table === 'tradeRequests').map((i:any) => i.data);
        console.log(`[NeoDB] Content Hydrated: ${exhibits.length} items`);
    });
    notifyListeners();
};

const performBackgroundSync = async (activeUserUsername?: string) => {
    if (!navigator.onLine) return;
    
    console.log("🔄 [Sync] Starting background sync...");
    try {
        const promises: Promise<any>[] = [
            apiCall('/feed'),
            apiCall('/users'),
            apiCall('/wishlist'),
            apiCall('/collections'),
            apiCall('/guestbook')
        ];

        if (activeUserUsername) {
            promises.push(apiCall(`/sync?username=${activeUserUsername}`));
        }

        const results = await Promise.allSettled(promises);
        const getVal = (res: PromiseSettledResult<any>) => res.status === 'fulfilled' ? res.value : [];
        
        const feed = getVal(results[0]);
        const globalUsers = getVal(results[1]);
        const globalWishlist = getVal(results[2]);
        const globalCollections = getVal(results[3]);
        const globalGuestbook = getVal(results[4]);
        const syncData = activeUserUsername ? getVal(results[5]) : null;

        // Save to DB via Safe Wrapper
        await safeDB(async (db) => {
            const tx = db.transaction(['exhibits', 'users', 'generic', 'collections'], 'readwrite');
            if (Array.isArray(feed)) feed.forEach(item => tx.objectStore('exhibits').put(item));
            if (Array.isArray(globalUsers)) globalUsers.forEach(u => tx.objectStore('users').put(u));
            if (Array.isArray(globalWishlist)) globalWishlist.forEach(w => tx.objectStore('generic').put({ id: w.id, table: 'wishlist', data: w }));
            if (Array.isArray(globalCollections)) globalCollections.forEach(c => tx.objectStore('collections').put(c));
            if (Array.isArray(globalGuestbook)) globalGuestbook.forEach(g => tx.objectStore('generic').put({ id: g.id, table: 'guestbook', data: g }));
            
            if (syncData) {
                if (syncData.users && Array.isArray(syncData.users)) syncData.users.forEach((u: UserProfile) => tx.objectStore('users').put(u));
                if (syncData.collections && Array.isArray(syncData.collections)) syncData.collections.forEach((c: Collection) => tx.objectStore('collections').put(c));
            }
            await tx.done;
        });

        // Sync Notifications & Messages
        if (activeUserUsername) {
            try {
                const resultsPriv = await Promise.allSettled([
                    apiCall(`/notifications?username=${activeUserUsername}`),
                    apiCall(`/messages?username=${activeUserUsername}`)
                ]);

                const notifs = getVal(resultsPriv[0]);
                const msgs = getVal(resultsPriv[1]);

                await safeDB(async (db) => {
                    if(Array.isArray(notifs)) {
                        const txNotif = db.transaction('notifications', 'readwrite');
                        await Promise.all(notifs.map((n: Notification) => txNotif.store.put(n)));
                        await txNotif.done;
                    }
                    if(Array.isArray(msgs)) {
                        const txMsg = db.transaction('messages', 'readwrite');
                        await Promise.all(msgs.map((m: Message) => txMsg.store.put(m)));
                        await txMsg.done;
                    }
                });
            } catch (e) {
                console.error("Failed to sync personal data:", e);
            }
        }
        
        await hydrateContent(); 
        console.log("✅ [Sync] Background sync complete");
    } catch (e) {
        console.warn("[Sync] Critical sync error:", e);
    }
};

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    // Reset check
    try {
        const lastReset = localStorage.getItem('neo_force_reset_key');
        if (lastReset !== FORCE_RESET_TOKEN) {
            await safeDB(async (db) => {
                await db.clear('exhibits'); await db.clear('collections'); await db.clear('users');
                await db.clear('notifications'); await db.clear('messages'); await db.clear('generic');
            });
            localStorage.setItem('neo_force_reset_key', FORCE_RESET_TOKEN);
        }
    } catch (e) {}

    await hydrateCritical();
    hydrateContent();

    let activeUserUsername: string | undefined;
    // Safe read session
    await safeDB(async (db) => {
        const storedSession = await db.get('system', SESSION_USER_KEY);
        activeUserUsername = storedSession?.value;
    });

    performBackgroundSync(activeUserUsername);

    if (activeUserUsername) {
        return hotCache.users.find(u => u.username === activeUserUsername) || null;
    }
    return null;
};

// --- AUTH ---

export const loginUser = async (identifier: string, password: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/login', 'POST', { identifier, password });
    
    // Fallback-safe save
    await safeDB(async (db) => {
        await db.put('system', { key: SESSION_USER_KEY, value: user.username }, SESSION_USER_KEY);
        await db.put('users', user);
    });
    
    const idx = hotCache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) hotCache.users[idx] = user; else hotCache.users.push(user);
    
    notifyListeners();
    // Pass username to ensure messages are fetched even if DB write failed
    performBackgroundSync(user.username);
    return user;
};

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/register', 'POST', { username, password, tagline, email });
    await safeDB(async (db) => {
        await db.put('system', { key: SESSION_USER_KEY, value: user.username }, SESSION_USER_KEY);
        await db.put('users', user);
    });
    hotCache.users.push(user);
    notifyListeners();
    performBackgroundSync(user.username);
    return user;
};

export const logoutUser = async () => {
    await safeDB(async (db) => await db.delete('system', SESSION_USER_KEY));
    window.location.reload();
};

export const loginViaTelegram = async (tgUser: any) => {
    const user = await apiCall('/auth/telegram', 'POST', tgUser);
    await safeDB(async (db) => {
        await db.put('system', { key: SESSION_USER_KEY, value: user.username }, SESSION_USER_KEY);
        await db.put('users', user);
    });
    hotCache.users.push(user);
    notifyListeners();
    performBackgroundSync(user.username);
    return user;
};

export const recoverPassword = async (email: string) => { 
    return await apiCall('/auth/recover', 'POST', { email }); 
};

export const checkUsernameAvailable = (username: string, excludeCurrentUser: string): boolean => {
    const lower = username.toLowerCase();
    const exists = hotCache.users.some(u => u.username.toLowerCase() === lower && u.username !== excludeCurrentUser);
    return !exists;
};

export const checkTelegramAvailable = (tg: string, excludeCurrentUser: string): boolean => {
    if (!tg) return true;
    const lower = tg.toLowerCase().replace('@', '');
    const exists = hotCache.users.some(u => u.telegram && u.telegram.toLowerCase() === lower && u.username !== excludeCurrentUser);
    return !exists;
};

// --- CRUD ---

export const getFullDatabase = () => ({ ...hotCache });

export const saveExhibit = async (e: Exhibit) => {
    hotCache.exhibits.unshift(e);
    notifyListeners();
    await safeDB(async (db) => await db.put('exhibits', e));
    await apiCall('/exhibits', 'POST', e);
};

export const updateExhibit = async (e: Exhibit) => {
    const idx = hotCache.exhibits.findIndex(x => x.id === e.id);
    if (idx !== -1) hotCache.exhibits[idx] = e;
    notifyListeners();
    await safeDB(async (db) => await db.put('exhibits', e));
    await apiCall('/exhibits', 'POST', e);
};

export const deleteExhibit = async (id: string) => {
    hotCache.exhibits = hotCache.exhibits.filter(e => e.id !== id);
    notifyListeners();
    await safeDB(async (db) => await db.delete('exhibits', id));
    await apiCall(`/exhibits/${id}`, 'DELETE');
};

export const saveCollection = async (c: Collection) => {
    hotCache.collections.push(c);
    notifyListeners();
    await safeDB(async (db) => await db.put('collections', c));
    await apiCall('/collections', 'POST', c);
};

export const updateCollection = async (c: Collection) => {
    hotCache.collections = hotCache.collections.map(col => col.id === c.id ? c : col);
    notifyListeners();
    await safeDB(async (db) => await db.put('collections', c));
    await apiCall('/collections', 'POST', c);
};

export const deleteCollection = async (id: string) => {
    hotCache.collections = hotCache.collections.filter(c => c.id !== id);
    notifyListeners();
    await safeDB(async (db) => await db.delete('collections', id));
    await apiCall(`/collections/${id}`, 'DELETE');
};

export const updateUserProfile = async (u: UserProfile) => {
    const idx = hotCache.users.findIndex(us => us.username === u.username);
    if (idx !== -1) hotCache.users[idx] = u;
    notifyListeners();
    await safeDB(async (db) => await db.put('users', u));
    await apiCall('/users', 'POST', { id: u.username, ...u });
};

export const createNotification = async (r:string, t:NotificationType, a:string, id?:string, p?:string) => {
    const notif: Notification = {
        id: crypto.randomUUID(),
        type: t, recipient: r, actor: a, targetId: id, targetPreview: p,
        timestamp: new Date().toISOString(), isRead: false
    };
    await apiCall('/notifications', 'POST', notif);
};

export const saveWishlistItem = async (w: WishlistItem) => {
    hotCache.wishlist.push(w);
    notifyListeners();
    await safeDB(async (db) => await db.put('generic', { id: w.id, table: 'wishlist', data: w }));
    await apiCall('/wishlist', 'POST', w);
};

export const deleteWishlistItem = async (id: string) => {
    hotCache.wishlist = hotCache.wishlist.filter(w => w.id !== id);
    notifyListeners();
    await safeDB(async (db) => await db.delete('generic', id));
    await apiCall(`/wishlist/${id}`, 'DELETE');
};

export const saveGuestbookEntry = async (e: GuestbookEntry) => {
    hotCache.guestbook.push(e);
    notifyListeners();
    await safeDB(async (db) => await db.put('generic', { id: e.id, table: 'guestbook', data: e }));
    await apiCall('/guestbook', 'POST', e);
};

export const deleteGuestbookEntry = async (id: string) => {
    hotCache.guestbook = hotCache.guestbook.filter(g => g.id !== id);
    notifyListeners();
    await safeDB(async (db) => await db.delete('generic', id));
    await apiCall(`/guestbook/${id}`, 'DELETE');
};

export const saveMessage = async (m: Message) => {
    hotCache.messages.push(m);
    notifyListeners();
    await safeDB(async (db) => await db.put('messages', m));
    await apiCall('/messages', 'POST', m);
};

export const createGuild = async (g: Guild) => {
    hotCache.guilds.push(g);
    notifyListeners();
    await safeDB(async (db) => await db.put('generic', { id: g.id, table: 'guilds', data: g }));
};

export const deleteGuild = async (id: string) => {
    hotCache.guilds = hotCache.guilds.filter(g => g.id !== id);
    notifyListeners();
    await safeDB(async (db) => await db.delete('generic', id));
};

export const getUserAvatar = (username: string): string => {
    if (!username) return 'https://ui-avatars.com/api/?name=NA&background=000&color=fff';
    const u = hotCache.users.find(u => u.username === username);
    if (u?.avatarUrl) return u.avatarUrl;
    return `https://ui-avatars.com/api/?name=${username}&background=random&color=fff&bold=true`;
};

export const fetchExhibitById = async (id: string) => {
    const mem = hotCache.exhibits.find(e => e.id === id);
    if (mem && !mem._isLite) return mem;
    
    // Try Safe DB read
    const local = await safeDB(async (db) => await db.get('exhibits', id));
    if (local && !local._isLite) {
        if (!mem || mem._isLite) {
            const idx = hotCache.exhibits.findIndex(e => e.id === id);
            if (idx !== -1) hotCache.exhibits[idx] = local; else hotCache.exhibits.push(local);
        }
        return local;
    }

    try {
        console.log(`[NeoDB] Upgrading exhibit ${id} from server...`);
        const item = await apiCall(`/exhibits/${id}`);
        if(item) {
            await safeDB(async (db) => await db.put('exhibits', item));
            const idx = hotCache.exhibits.findIndex(e => e.id === id);
            if (idx !== -1) hotCache.exhibits[idx] = item; else hotCache.exhibits.push(item);
            notifyListeners();
        }
        return item;
    } catch { return null; }
};

export const fetchCollectionById = async (id: string) => {
    const mem = hotCache.collections.find(c => c.id === id);
    if (mem) return mem;
    const local = await safeDB(async (db) => await db.get('collections', id));
    if (local) return local;
    try {
        const col = await apiCall(`/collections/${id}`);
        if(col) {
            await safeDB(async (db) => await db.put('collections', col));
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
    await safeDB(async (db) => {
        await db.clear('exhibits'); await db.clear('collections'); await db.clear('users');
        await db.clear('notifications'); await db.clear('messages'); await db.clear('generic');
    });
    window.location.reload();
};

export const markNotificationsRead = async (u:string, ids?: string[]) => {
    const updatedNotifications: Notification[] = [];
    hotCache.notifications.forEach(n => { 
        if(n.recipient === u && !n.isRead) {
            if (!ids || ids.includes(n.id)) {
                n.isRead = true;
                updatedNotifications.push(n);
                safeDB(async (db) => await db.put('notifications', n));
            }
        }
    });
    notifyListeners();
    if (updatedNotifications.length > 0) {
        try { await Promise.all(updatedNotifications.map(n => apiCall('/notifications', 'POST', n))); } 
        catch (e) { console.error("Failed to sync notification read status", e); }
    }
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

export const generateApiKey = (): ApiKey => {
    return { id: crypto.randomUUID(), name: 'New Key', key: 'na_' + crypto.randomUUID().replace(/-/g, ''), createdAt: new Date().toISOString() };
};

export const exportUserData = async (username: string) => {
    const data = getFullDatabase();
    const userData = {
        profile: data.users.find(u => u.username === username),
        exhibits: data.exhibits.filter(e => e.owner === username),
        collections: data.collections.filter(c => c.owner === username),
        wishlist: data.wishlist.filter(w => w.owner === username)
    };
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `neoarchive_export_${username}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
};
