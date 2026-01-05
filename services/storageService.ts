
import { Exhibit, Collection, Notification, Message, UserProfile, GuestbookEntry, WishlistItem, Guild, Duel, TradeRequest, TradeRequestStatus, TradeType, NotificationType } from '../types';

// INTERNAL IN-MEMORY CACHE
let cache = {
    exhibits: [] as Exhibit[],
    collections: [] as Collection[],
    notifications: [] as Notification[],
    messages: [] as Message[],
    users: [] as UserProfile[],
    guestbook: [] as GuestbookEntry[],
    wishlist: [] as WishlistItem[],
    guilds: [] as Guild[],
    duels: [] as Duel[],
    tradeRequests: [] as TradeRequest[],
    lastSync: 0
};

const CACHE_STORAGE_KEY = 'neo_archive_db_cache_v2'; 
const SESSION_USER_KEY = 'neo_active_user';
const API_BASE = '/api'; 

// --- OBSERVER PATTERN ---
type ChangeListener = () => void;
const listeners: ChangeListener[] = [];

type ToastListener = (n: Notification) => void;
const toastListeners: ToastListener[] = [];

export const subscribeToToasts = (listener: ToastListener) => {
    toastListeners.push(listener);
    return () => {
        const index = toastListeners.indexOf(listener);
        if (index > -1) toastListeners.splice(index, 1);
    };
};

export const subscribe = (listener: ChangeListener) => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
    };
};

const notifyListeners = () => listeners.forEach(l => l());

// --- PERSISTENCE HELPERS ---
const saveCacheToLocal = () => {
    try {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
    } catch (e) { console.error("Cache save failed", e); }
};

const loadCacheFromLocal = () => {
    try {
        const stored = localStorage.getItem(CACHE_STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            cache = { ...cache, ...data };
            notifyListeners(); 
        }
    } catch (e) { console.error("Cache load failed", e); }
};

// --- API HELPER ---
const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10s Timeout

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
        clearTimeout(id);
        
        // Handle HTML responses (Proxy failures usually return index.html or 404 page)
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
             const text = await res.text();
             // If we got HTML or text instead of JSON, the API is likely down or route is wrong
             console.error(`API returned non-JSON (${res.status}) for ${fullPath}:`, text.slice(0, 100));
             throw new Error(`BACKEND OFFLINE: ${res.status} (Is server.js running on 3002?)`);
        }

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API Error ${res.status}: ${errText.slice(0, 100)}`);
        }
        return await res.json();
    } catch (e: any) {
        clearTimeout(id);
        console.error(`❌ API Call Failed [${endpoint}]:`, e.message);
        throw e;
    }
};

export const isOffline = () => !navigator.onLine;

export const getUserAvatar = (username: string): string => {
    if (!username) return 'https://ui-avatars.com/api/?name=NA&background=000&color=fff';
    const u = cache.users.find(u => u.username === username);
    if (u?.avatarUrl) return u.avatarUrl;
    return `https://ui-avatars.com/api/?name=${username}&background=random&color=fff&bold=true`;
};

// --- CORE FUNCTIONS ---

export const initializeDatabase = async (): Promise<UserProfile | null> => {
    // 1. FAST LOAD
    loadCacheFromLocal();
    
    const activeUser = localStorage.getItem(SESSION_USER_KEY);
    
    // 2. BACKGROUND SYNC
    try {
        // Health Check
        try { await apiCall('/health'); } catch(e) { console.warn("Backend offline or proxy error:", e.message); }

        // Fetch global feed
        const feed = await apiCall('/feed');
        if (Array.isArray(feed)) {
            // Merge with local drafts if any
            const drafts = cache.exhibits.filter(e => e.isDraft);
            const serverItems = feed.filter(e => !drafts.find(d => d.id === e.id));
            cache.exhibits = [...drafts, ...serverItems];
            console.log(`[SYNC] Loaded ${feed.length} exhibits from server.`);
        }

        // Fetch User Data if logged in
        if (activeUser) {
            const syncData = await apiCall(`/sync?username=${activeUser}`);
            if (syncData.users && syncData.users.length > 0) {
                const freshUser = syncData.users[0];
                const idx = cache.users.findIndex(u => u.username === freshUser.username);
                if (idx !== -1) cache.users[idx] = freshUser;
                else cache.users.push(freshUser);
                
                cache.collections = syncData.collections || [];
                
                try {
                    const notifs = await apiCall(`/notifications?username=${activeUser}`);
                    if (Array.isArray(notifs)) cache.notifications = notifs;
                } catch(e) {}

                saveCacheToLocal();
                notifyListeners();
                return freshUser;
            }
        }
    } catch (e) {
        console.warn("Background sync failed - showing cached data", e);
    }
    
    saveCacheToLocal();
    notifyListeners();
    return cache.users.find(u => u.username === activeUser) || null;
};

// AUTH
export const loginUser = async (identifier: string, password: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/login', 'POST', { identifier, password });
    localStorage.setItem(SESSION_USER_KEY, user.username);
    
    const idx = cache.users.findIndex(u => u.username === user.username);
    if (idx !== -1) cache.users[idx] = user;
    else cache.users.push(user);
    
    saveCacheToLocal();
    notifyListeners();
    return user;
};

export const registerUser = async (username: string, password: string, tagline: string, email: string): Promise<UserProfile> => {
    const user = await apiCall('/auth/register', 'POST', { username, password, tagline, email });
    localStorage.setItem(SESSION_USER_KEY, user.username);
    cache.users.push(user);
    saveCacheToLocal();
    notifyListeners();
    return user;
};

export const logoutUser = async () => { 
    localStorage.removeItem(SESSION_USER_KEY); 
    notifyListeners(); 
    window.location.reload();
};

export const loginViaTelegram = async (tgUser: any) => { 
    const user = await apiCall('/auth/telegram', 'POST', tgUser);
    localStorage.setItem(SESSION_USER_KEY, user.username);
    cache.users.push(user);
    saveCacheToLocal();
    notifyListeners();
    return user;
};

export const recoverPassword = async (email: string) => { 
    return await apiCall('/auth/recover', 'POST', { email }); 
};

// DATA OPERATIONS
export const getFullDatabase = () => ({ ...cache });

export const saveExhibit = async (e: Exhibit) => { 
    cache.exhibits.unshift(e); 
    notifyListeners();
    await apiCall('/exhibits', 'POST', e);
    saveCacheToLocal();
};

export const updateExhibit = async (e: Exhibit) => { 
    const idx = cache.exhibits.findIndex(x => x.id === e.id);
    if (idx !== -1) {
        cache.exhibits[idx] = e;
        notifyListeners();
    }
    await apiCall('/exhibits', 'POST', e);
    saveCacheToLocal();
};

export const deleteExhibit = async (id: string) => { 
    cache.exhibits = cache.exhibits.filter(e => e.id !== id); 
    notifyListeners();
    await apiCall(`/exhibits/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const saveCollection = async (c: Collection) => {
    cache.collections.push(c);
    notifyListeners();
    await apiCall('/collections', 'POST', c);
    saveCacheToLocal();
};

export const updateCollection = async (c: Collection) => {
    cache.collections = cache.collections.map(col => col.id === c.id ? c : col);
    notifyListeners();
    await apiCall('/collections', 'POST', c);
    saveCacheToLocal();
};

export const deleteCollection = async (id: string) => {
    cache.collections = cache.collections.filter(c => c.id !== id);
    notifyListeners();
    await apiCall(`/collections/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const saveWishlistItem = async (w: WishlistItem) => {
    cache.wishlist.push(w);
    notifyListeners();
    await apiCall('/wishlist', 'POST', w);
    saveCacheToLocal();
};

export const deleteWishlistItem = async (id: string) => {
    cache.wishlist = cache.wishlist.filter(w => w.id !== id);
    notifyListeners();
    await apiCall(`/wishlist/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const saveGuestbookEntry = async (e: GuestbookEntry) => {
    cache.guestbook.push(e);
    notifyListeners();
    await apiCall('/guestbook', 'POST', e);
    saveCacheToLocal();
};

export const updateGuestbookEntry = async (e: GuestbookEntry) => {
    cache.guestbook = cache.guestbook.map(g => g.id === e.id ? e : g);
    notifyListeners();
    await apiCall('/guestbook', 'POST', e);
    saveCacheToLocal();
};

export const deleteGuestbookEntry = async (id: string) => {
    cache.guestbook = cache.guestbook.filter(g => g.id !== id);
    notifyListeners();
    await apiCall(`/guestbook/${id}`, 'DELETE');
    saveCacheToLocal();
};

export const updateUserProfile = async (u: UserProfile) => {
    const idx = cache.users.findIndex(us => us.username === u.username);
    if (idx !== -1) cache.users[idx] = u;
    notifyListeners();
    await apiCall('/users', 'POST', { id: u.username, ...u });
    saveCacheToLocal();
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

export const saveMessage = async (m: Message) => {
    cache.messages.push(m);
    notifyListeners();
    await apiCall('/messages', 'POST', m);
    saveCacheToLocal();
};

// Utils
export const calculateFeedScore = (item: Exhibit, user: UserProfile) => {
    return new Date(item.timestamp).getTime();
};

export const fetchExhibitById = async (id: string) => {
    try {
        const item = await apiCall(`/exhibits/${id}`);
        return item;
    } catch { return null; }
};

export const fetchCollectionById = async (id: string) => {
    try {
        return await apiCall(`/collections/${id}`);
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
    localStorage.removeItem(CACHE_STORAGE_KEY);
    window.location.reload();
};
export const markNotificationsRead = (u:string) => {
    cache.notifications.forEach(n => { if(n.recipient === u) n.isRead = true; });
    notifyListeners();
};
export const toggleFollow = async (me:string, them:string) => {
    const myUser = cache.users.find(u => u.username === me);
    if(myUser) {
        if(myUser.following.includes(them)) {
            myUser.following = myUser.following.filter(u => u !== them);
        } else {
            myUser.following.push(them);
        }
        updateUserProfile(myUser);
    }
};
export const createGuild = async (g:Guild) => {};
export const joinGuild = async (code:string, u:string) => true;
export const leaveGuild = async (gid:string, u:string) => true;
export const kickFromGuild = async (gid:string, u:string) => {};
export const deleteGuild = async (gid:string) => {};
export const getMyTradeRequests = () => ({ incoming: [], outgoing: [], history: [], active: [], actionRequired: [] });
export const sendTradeRequest = async (p: any) => {};
export const acceptTradeRequest = async (id:string) => {};
export const updateTradeStatus = async (id:string, s:string) => {};
export const completeTradeRequest = async (id:string) => {};
