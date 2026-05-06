import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const APP_ORIGIN = Capacitor.isNativePlatform() ? 'https://neoarchive.ru' : window.location.origin;
import { 
  LayoutGrid, PlusCircle, Search, Bell, FolderPlus, ArrowLeft, Folder, Plus, Globe,
  Heart, SkipBack, Play, Square, Pause, User, WifiOff, AlertTriangle,
  ListMusic, Radio, Zap, Activity, Disc,
  LayoutTemplate, FilePlus2, Flag, UserCheck, ChevronLeft, ChevronRight
} from 'lucide-react';

import MatrixRain from './components/MatrixRain';
import CRTOverlay from './components/CRTOverlay';
import MatrixLogin from './components/MatrixLogin';
import UserProfileView from './components/UserProfileView';
import ExhibitDetailPage from './components/ExhibitDetailPage';
import CommunityHub from './components/CommunityHub'; 
import RetroLoader from './components/RetroLoader';
import ActivityView from './components/ActivityView';
import SEO from './components/SEO';
import HallOfFame from './components/HallOfFame';
import CollectionDetailPage from './components/CollectionDetailPage';
import DirectChat from './components/DirectChat';
import GlobalChat from './components/GlobalChat';
import CreateArtifactView from './components/CreateArtifactView';
import CreateCollectionView from './components/CreateCollectionView';
import CreateWishlistItemView from './components/CreateWishlistItemView';
import WishlistDetailView from './components/WishlistDetailView';
import SocialListView from './components/SocialListView';
import SearchView from './components/SearchView';
import UserWishlistView from './components/UserWishlistView';
import FeedView from './components/FeedView';
import ToastContainer from './components/ToastContainer';
import MyCollection from './components/MyCollection';
import LandingPage from './components/LandingPage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsOfUsePage from './components/TermsOfUsePage';
import { ThemeContext } from './components/ThemeContext';

import * as db from './services/storageService';
import { UserProfile, Exhibit, Collection, ViewState, Notification, Message, GuestbookEntry, Comment, WishlistItem, TradeRequest, UserStatus, Reaction, MessageReactionEmoji, MessageReaction, WishlistPriority, WishlistItemStatus, ProcessedImage, AchievementProgress } from './types';
import { getArtifactTier, BADGE_CONFIG } from './constants';
import useSwipe from './hooks/useSwipe';
import useSwipeTabs from './hooks/useSwipeTabs';
import XI from './components/XI';

const CACHE_VERSION = 'v6.0_CLEAN_ID';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'xp' | 'winamp'>('dark');
  const [view, setView] = useState<ViewState>('AUTH');
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const userRef = useRef<UserProfile | null>(null);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<WishlistItem | null>(null);
  const [viewedProfileUsername, setViewedProfileUsername] = useState<string>('');
  const [hallOfFameUsername, setHallOfFameUsername] = useState<string>('');
  const [highlightCommentId, setHighlightCommentId] = useState<string | undefined>(undefined);

  // Verification Logic
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [verificationType, setVerificationType] = useState<'REGISTER' | 'RESET' | 'CHANGE_PASSWORD' | 'CHANGE_EMAIL' | null>(null);

  // Feed State
  const [selectedCategory, setSelectedCategory] = useState<string>('ВСЕ');
  const [feedMode, setFeedMode] = useState<'ARTIFACTS' | 'WISHLIST' | 'COLLECTIONS'>('ARTIFACTS');
  const [feedViewMode, setFeedViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [feedType, setFeedType] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');

  // Social/Edit State
  const [socialListType, setSocialListType] = useState<'followers' | 'following'>('followers');
  const [isAddingToCollection, setIsAddingToCollection] = useState<string | null>(null);

  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editBio, setEditBio] = useState(''); 
  const [editStatus, setEditStatus] = useState<UserStatus>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
  const [guestbookInput, setGuestbookInput] = useState('');
  const guestbookInputRef = useRef<HTMLInputElement>(null);

  // Auth prompt for unauthenticated users trying to interact
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // --- STORIES ---
  const stories = useMemo(() => {
      if (!user) return [];
      const following = user.following || [];
      
      // Get unique users from following list who have posted
      // Sort exhibits by date desc first
      const sortedExhibits = [...exhibits].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const storyUsersMap = new Map<string, Exhibit>();
      
      sortedExhibits.forEach(e => {
          if (following.includes(e.owner) && !e.isDraft) {
              if (!storyUsersMap.has(e.owner)) {
                  storyUsersMap.set(e.owner, e);
              }
          }
      });

      return Array.from(storyUsersMap.entries()).map(([username, item]) => ({
          username,
          avatar: db.getUserAvatar(username),
          latestItem: item
      })).slice(0, 15);
  }, [user, exhibits]);

  // --- PURE ACHIEVEMENT COMPUTATION (works for ANY username) ---
  // Серверные ачивки (события, нельзя восстановить из текущего состояния данных):
  const SERVER_ONLY_IDS = ['GHOST_MODE', 'FIRST_VOTE', 'OVERCLOCK', 'GRAIL_HUNTER'];

  const computeAchievementsForUser = useCallback((username: string): AchievementProgress[] => {
      // HELLO_WORLD — всегда выполнено у любого зарегистрированного пользователя
      const hw: AchievementProgress = { id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true };

      // ── Общие данные ──────────────────────────────────────────────────────
      const ownExhibits = exhibits.filter(e => e.owner === username && !e.isDraft);
      const uploadCount = ownExhibits.length;

      let commentsMade = 0;
      exhibits.forEach(e => { if (e.comments) commentsMade += e.comments.filter(c => c.author === username).length; });

      const collectionCount = collections.filter(c => c.owner === username).length;

      const allUsers = db.getFullDatabase().users;
      const targetUser = allUsers.find(u => u.username === username);
      const followerCount = targetUser?.followers?.length || 0;
      const followingCount = targetUser?.following?.length || 0;

      // ── COMMON ────────────────────────────────────────────────────────────

      // INIT_SEQUENCE — первый артефакт
      const initSeq: AchievementProgress = { id: 'INIT_SEQUENCE', current: Math.min(uploadCount, 1), target: 1, unlocked: uploadCount >= 1 };

      // UPLOADER — 5 артефактов
      const uploader: AchievementProgress = { id: 'UPLOADER', current: Math.min(uploadCount, BADGE_CONFIG.UPLOADER.target), target: BADGE_CONFIG.UPLOADER.target, unlocked: uploadCount >= BADGE_CONFIG.UPLOADER.target };

      // INFLUENCER — 50 лайков суммарно
      const totalLikes = exhibits.filter(e => e.owner === username).reduce((acc, e) => acc + (e.likes || 0), 0);
      const influencer: AchievementProgress = { id: 'INFLUENCER', current: Math.min(totalLikes, BADGE_CONFIG.INFLUENCER.target), target: BADGE_CONFIG.INFLUENCER.target, unlocked: totalLikes >= BADGE_CONFIG.INFLUENCER.target };

      // CRITIC — 10 комментариев
      const critic: AchievementProgress = { id: 'CRITIC', current: Math.min(commentsMade, BADGE_CONFIG.CRITIC.target), target: BADGE_CONFIG.CRITIC.target, unlocked: commentsMade >= BADGE_CONFIG.CRITIC.target };

      // COLLECTOR — 3 коллекции
      const collector: AchievementProgress = { id: 'COLLECTOR', current: Math.min(collectionCount, BADGE_CONFIG.COLLECTOR.target), target: BADGE_CONFIG.COLLECTOR.target, unlocked: collectionCount >= BADGE_CONFIG.COLLECTOR.target };

      // FIRST_FOLLOW — хотя бы одна подписка
      const firstFollow: AchievementProgress = { id: 'FIRST_FOLLOW', current: followingCount > 0 ? 1 : 0, target: 1, unlocked: followingCount > 0 };

      // ── UNCOMMON ──────────────────────────────────────────────────────────

      // BATTLE_CHAMPION — хранится в профиле (выдаётся системой битв)
      const storedChampion = targetUser?.achievements?.find(a => a.id === 'BATTLE_CHAMPION');
      const champion: AchievementProgress = storedChampion
          ? { ...storedChampion, current: Math.min(storedChampion.current, 1) }
          : { id: 'BATTLE_CHAMPION', current: 0, target: 1, unlocked: false };

      // ARCHAEOLOGIST — 25 артефактов
      const archaeologist: AchievementProgress = { id: 'ARCHAEOLOGIST', current: Math.min(uploadCount, BADGE_CONFIG.ARCHAEOLOGIST.target), target: BADGE_CONFIG.ARCHAEOLOGIST.target, unlocked: uploadCount >= BADGE_CONFIG.ARCHAEOLOGIST.target };

      // ANALYST — 50 комментариев
      const analyst: AchievementProgress = { id: 'ANALYST', current: Math.min(commentsMade, BADGE_CONFIG.ANALYST.target), target: BADGE_CONFIG.ANALYST.target, unlocked: commentsMade >= BADGE_CONFIG.ANALYST.target };

      // CURATOR — 10 коллекций
      const curator: AchievementProgress = { id: 'CURATOR', current: Math.min(collectionCount, BADGE_CONFIG.CURATOR.target), target: BADGE_CONFIG.CURATOR.target, unlocked: collectionCount >= BADGE_CONFIG.CURATOR.target };

      // SIGNAL_BOOST — 10 подписчиков
      const signalBoost: AchievementProgress = { id: 'SIGNAL_BOOST', current: Math.min(followerCount, BADGE_CONFIG.SIGNAL_BOOST.target), target: BADGE_CONFIG.SIGNAL_BOOST.target, unlocked: followerCount >= BADGE_CONFIG.SIGNAL_BOOST.target };

      // ── RARE ──────────────────────────────────────────────────────────────

      // LEGEND — владеет хотя бы одним артефактом уровня LEGENDARY
      const hasLegendary = ownExhibits.some(e => getArtifactTier(e) === 'LEGENDARY');
      const legend: AchievementProgress = { id: 'LEGEND', current: hasLegendary ? 1 : 0, target: 1, unlocked: hasLegendary };

      // ARCHON — 100 артефактов
      const archon: AchievementProgress = { id: 'ARCHON', current: Math.min(uploadCount, BADGE_CONFIG.ARCHON.target), target: BADGE_CONFIG.ARCHON.target, unlocked: uploadCount >= BADGE_CONFIG.ARCHON.target };

      // BROADCAST_NODE — 50 подписчиков
      const broadcastNode: AchievementProgress = { id: 'BROADCAST_NODE', current: Math.min(followerCount, BADGE_CONFIG.BROADCAST_NODE.target), target: BADGE_CONFIG.BROADCAST_NODE.target, unlocked: followerCount >= BADGE_CONFIG.BROADCAST_NODE.target };

      // ── EPIC ──────────────────────────────────────────────────────────────

      // FULL_STACK — артефакты во всех 10 категориях
      const ownedCategories = new Set(ownExhibits.map(e => e.category)).size;
      const fullStack: AchievementProgress = { id: 'FULL_STACK', current: Math.min(ownedCategories, BADGE_CONFIG.FULL_STACK.target), target: BADGE_CONFIG.FULL_STACK.target, unlocked: ownedCategories >= BADGE_CONFIG.FULL_STACK.target };

      // HEMINGWAY — комментарий < 50 символов с >= 10 лайками
      const hasHemingway = exhibits.some(e => (e.comments || []).some(c => c.author === username && c.text && c.text.length < 50 && (c.likes || 0) >= 10));
      const hemingway: AchievementProgress = { id: 'HEMINGWAY', current: hasHemingway ? 1 : 0, target: 1, unlocked: hasHemingway };

      // ── СЕРВЕРНЫЕ (события — читаем из хранимого профиля) ─────────────────
      const serverAchs: AchievementProgress[] = SERVER_ONLY_IDS.map(id => {
          const stored = targetUser?.achievements?.find(a => a.id === id);
          const cfg = BADGE_CONFIG[id as keyof typeof BADGE_CONFIG];
          return stored
              ? { ...stored, current: Math.min(stored.current, cfg.target) }
              : { id, current: 0, target: cfg.target, unlocked: false };
      });

      return [
          hw, initSeq, uploader, influencer, critic, collector, firstFollow,
          champion, archaeologist, analyst, curator, signalBoost,
          legend, archon, broadcastNode,
          fullStack, hemingway,
          ...serverAchs,
      ];
  }, [exhibits, collections]);

  // --- ACHIEVEMENTS CHECKER (сохраняет актуальные данные в профиле залогиненного) ---
  const checkAchievements = useCallback(async (currentUser: UserProfile) => {
      if (!currentUser) return;
      const fresh = computeAchievementsForUser(currentUser.username);

      // Серверные ачивки: предпочесть хранимую версию (актуальнее вычисленной по кэшу)
      const merged = fresh.map(a => {
          if (SERVER_ONLY_IDS.includes(a.id)) {
              const stored = currentUser.achievements?.find(p => p.id === a.id);
              return stored ? { ...stored, current: Math.min(stored.current, a.target) } : a;
          }
          return a;
      });

      // Сохраняем только если данные изменились
      const prev = currentUser.achievements || [];
      const changed = merged.some(f => {
          const old = prev.find(p => p.id === f.id);
          return !old || old.current !== f.current || old.unlocked !== f.unlocked;
      });

      if (changed) {
          const updatedUser = { ...currentUser, achievements: merged };
          setUser(updatedUser);
          await db.updateUserProfile(updatedUser);
      }
  }, [computeAchievementsForUser]);

  // --- ROUTING LOGIC ---
  const syncFromUrl = useCallback(async () => {
      // 1. Check for verification params
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const type = searchParams.get('type');
      const session = searchParams.get('session');

      // OAuth web callback: /?session=username&type=OAUTH
      if (type === 'OAUTH' && session) {
          window.history.replaceState({}, document.title, '/');
          try {
              const userProfile = await db.loginViaOAuth(session);
              setUser(userProfile);
              if (userProfile.settings?.theme) setTheme(userProfile.settings.theme);
              setView('FEED');
          } catch (e) {
              setView('AUTH');
          }
          return;
      }

      if (code && type) {
          setVerificationCode(code);
          setVerificationType(type as any);
          setView('AUTH');
          // Clean URL
          window.history.replaceState({}, document.title, "/");
          return;
      }

      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      const root = segments[0];

      if (!root) { setView('FEED'); return; }

      if (root === 'privacy') { setView('PRIVACY'); return; }
      if (root === 'terms') { setView('TERMS'); return; }

      // For unauthenticated users, redirect protected routes to FEED
      const isLoggedIn = !!userRef.current;
      if (!isLoggedIn && ['community', 'activity', 'search', 'create', 'my-collection', 'u', 'profile'].includes(root)) {
          setView('FEED');
          window.history.replaceState({}, document.title, '/');
          return;
      }

      if (root === 'community') setView('COMMUNITY_HUB');
      else if (root === 'activity') setView('ACTIVITY');
      else if (root === 'search') setView('SEARCH');
      else if (root === 'create') setView('CREATE_HUB');
      else if (root === 'my-collection') setView('MY_COLLECTION');
      else if (root === 'u' || root === 'profile') {
          const username = segments[1] ? decodeURIComponent(segments[1]) : '';
          if (username) {
              setViewedProfileUsername(username);
              if (segments[2] === 'wishlist') setView('USER_WISHLIST');
              else setView('USER_PROFILE');
          }
      } else if (root === 'artifact') {
          const id = segments[1];
          let item = db.getFullDatabase().exhibits.find(e => e.id === id);
          if (!item) try { item = await db.fetchExhibitById(id); } catch(e){}
          if (item) { setSelectedExhibit(item); setView('EXHIBIT'); }
          else { document.title = 'Страница не найдена — NeoArchive'; setView('NOT_FOUND'); }
      } else if (root === 'collection') {
          const id = segments[1];
          let col = db.getFullDatabase().collections.find(c => c.id === id);
          if (!col) try { col = await db.fetchCollectionById(id); } catch(e){}
          if (col) { setSelectedCollection(col); setView('COLLECTION_DETAIL'); }
          else { document.title = 'Страница не найдена — NeoArchive'; setView('NOT_FOUND'); }
      } else { setView('FEED'); }
  }, []);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
      const handlePopState = () => {
          if (userRef.current) syncFromUrl();
          else if (Capacitor.isNativePlatform()) setView('AUTH');
          else syncFromUrl(); // unauthenticated web: resolve from URL (FEED, EXHIBIT, COLLECTION_DETAIL)
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [syncFromUrl]);

  // Views that require authentication — redirect to AUTH if user is not logged in
  const AUTH_REQUIRED_VIEWS: ViewState[] = [
    'ACTIVITY', 'MY_COLLECTION', 'WISHLIST_DETAIL', 'DIRECT_CHAT', 'GLOBAL_CHAT',
    'USER_PROFILE', 'HALL_OF_FAME', 'SEARCH', 'COMMUNITY_HUB', 'CREATE_HUB',
    'CREATE_ARTIFACT', 'EDIT_ARTIFACT', 'CREATE_COLLECTION', 'EDIT_COLLECTION',
    'CREATE_WISHLIST', 'USER_WISHLIST', 'SOCIAL_LIST', 'SETTINGS', 'ADMIN',
  ];

  // Helper: runs action only if authenticated, otherwise shows the auth prompt modal
  const requireAuth = (action: () => void) => {
    if (!user) { setShowAuthPrompt(true); return; }
    action();
  };

  const navigateTo = (newView: ViewState, params?: { username?: string; item?: Exhibit; collection?: Collection; wishlistItem?: WishlistItem; highlightCommentId?: string; initialData?: any; tab?: string }) => {
      if (params?.username) setViewedProfileUsername(params.username);

      // Redirect unauthenticated users away from protected views
      if (!user && AUTH_REQUIRED_VIEWS.includes(newView)) {
          setView('AUTH');
          window.history.pushState({}, '', '/');
          return;
      }

      // Shipments moved to profile — redirect
      if (newView === 'SHIPMENTS' && user) {
          if (!params?.username) setViewedProfileUsername(user.username);
          setView('USER_PROFILE');
          window.history.pushState({ view: 'USER_PROFILE', params }, '', `/u/${encodeURIComponent(user.username)}`);
          return;
      }

      if (newView === 'CREATE_ARTIFACT') {
          if (params?.initialData) {
              setSelectedExhibit(params.initialData);
          } else {
              setSelectedExhibit(null); 
          }
      } else if (params?.item) { 
          setSelectedExhibit(params.item); 
          setHighlightCommentId(params.highlightCommentId); 
      }

      if (newView === 'CREATE_COLLECTION') {
          if (params?.initialData) {
              setSelectedCollection(params.initialData);
          } else {
              setSelectedCollection(null);
          }
      } else if (params?.collection) {
          setSelectedCollection(params.collection);
      }

      if (params?.wishlistItem) setSelectedWishlistItem(params.wishlistItem);
      
      setView(newView);

      let path = '/';
      if (newView === 'USER_PROFILE') path = `/u/${encodeURIComponent(params?.username || viewedProfileUsername)}`;
      else if (newView === 'USER_WISHLIST') path = `/u/${encodeURIComponent(params?.username || viewedProfileUsername)}/wishlist`;
      else if (newView === 'EXHIBIT') path = `/artifact/${params?.item?.id || selectedExhibit?.id}`;
      else if (newView === 'COLLECTION_DETAIL') path = `/collection/${params?.collection?.id || selectedCollection?.id}`;
      else if (newView === 'COMMUNITY_HUB') path = '/community';
      else if (newView === 'ACTIVITY') path = '/activity';
      else if (newView === 'SEARCH') path = '/search';
      else if (newView === 'CREATE_HUB') path = '/create';
      else if (newView === 'MY_COLLECTION') path = '/my-collection';
      else if (newView === 'PRIVACY') path = '/privacy';
      else if (newView === 'TERMS') path = '/terms';

      window.history.pushState({ view: newView, params }, '', path);
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute('href', `https://neoarchive.ru${path}`);
      window.scrollTo(0, 0);
  };

  const handleBack = () => {
      if (window.history.length > 1) window.history.back();
      else navigateTo('FEED');
  };

  const refreshData = useCallback(() => {
    const data = db.getFullDatabase();
    
    // Slight optimization: only update state if data array length changed or specific flag
    // But since it's a full refresh, React might re-render.
    // The storage service now handles deduplication, so this array is clean.
    setExhibits(prev => {
        // Simple length check or reference check might be premature optimization, 
        // relying on storage service data being fresh.
        return data.exhibits || [];
    });
    
    setCollections(data.collections || []);
    setWishlist(data.wishlist || []);
    setNotifications(data.notifications || []);
    setMessages(data.messages || []);
    setGuestbook(data.guestbook || []);
    setTradeRequests([...(data.tradeRequests || [])]);
    setAllUsers([...(data.users || [])]);
    setIsOffline(db.isOffline());
    
    if (user) {
       const updatedUser = data.users.find(u => u.username === user.username);
       if (updatedUser) {
           setUser(updatedUser);
           checkAchievements(updatedUser);
       }
    }
  }, [user, checkAchievements]);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => { refreshData(); });
    db.startLiveUpdates();
    return () => { unsubscribe(); db.stopLiveUpdates(); };
  }, [refreshData]);

  // Sync selectedExhibit with live exhibits state (so likes/comments from other users appear in real time)
  useEffect(() => {
    if (!selectedExhibit) return;
    const updated = exhibits.find(e => e.id === selectedExhibit.id);
    if (updated && updated !== selectedExhibit) setSelectedExhibit(updated);
  }, [exhibits]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync selectedCollection with live collections state
  useEffect(() => {
    if (!selectedCollection) return;
    const updated = collections.find(c => c.id === selectedCollection.id);
    if (updated && updated !== selectedCollection) setSelectedCollection(updated);
  }, [collections]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      try {
          const activeUser = await db.initializeDatabase();
          refreshData();
          if (activeUser) {
              setUser(activeUser);
              if (activeUser.settings?.theme) setTheme(activeUser.settings.theme);
              await syncFromUrl();
          } else {
              // Check for email verification/reset link BEFORE clearing URL
              const searchParams = new URLSearchParams(window.location.search);
              const code = searchParams.get('code');
              const type = searchParams.get('type');
              const session = searchParams.get('session');
              if ((code && type) || (session && type === 'OAUTH')) {
                  // Email verification link OR OAuth callback
                  await syncFromUrl();
              } else if (window.location.pathname === '/privacy') {
                  setView('PRIVACY');
              } else if (window.location.pathname === '/terms') {
                  setView('TERMS');
              } else if (Capacitor.isNativePlatform()) {
                  setView('AUTH');
              } else {
                  // Web: show FEED (or specific public page from URL) even without login
                  await syncFromUrl();
              }
          }
      } catch (e) { setView('AUTH'); }
      finally { setIsInitializing(false); setTimeout(() => setShowSplash(false), 50); }
    };
    init();

    // Deep link listener for native OAuth callbacks (ru.neoarchive.app://auth?session=xxx&type=OAUTH)
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        try {
          const urlObj = new URL(url);
          const session = urlObj.searchParams.get('session');
          const type = urlObj.searchParams.get('type');
          if (type === 'OAUTH' && session) {
            const userProfile = await db.loginViaOAuth(session);
            setUser(userProfile);
            if (userProfile.settings?.theme) setTheme(userProfile.settings.theme);
            setView('FEED');
          }
        } catch (e) {
          setView('AUTH');
        }
      });
    }
  }, []);

  const handleExhibitClick = async (item: Exhibit) => {
    const sessionKey = `neo_viewed_${item.id}`;
    const hasViewed = sessionStorage.getItem(sessionKey);
    let updatedItem = item;
    if (!hasViewed) {
        const viewedBy = item.viewedBy || [];
        const currentUser = user?.username;
        if (currentUser && !viewedBy.includes(currentUser)) {
             updatedItem = {
                 ...item,
                 views: (item.views || 0) + 1,
                 viewedBy: [...viewedBy, currentUser]
             };
             setExhibits(prev => prev.map(e => e.id === item.id ? updatedItem : e));
             await db.updateExhibit(updatedItem);
        }
        sessionStorage.setItem(sessionKey, 'true');
    }
    // Track recently viewed in localStorage
    try {
        const raw = localStorage.getItem('neo_recently_viewed');
        const existing: string[] = raw ? JSON.parse(raw) : [];
        const deduped = [item.id, ...existing.filter((id: string) => id !== item.id)].slice(0, 15);
        localStorage.setItem('neo_recently_viewed', JSON.stringify(deduped));
    } catch { /* ignore */ }
    navigateTo('EXHIBIT', { item: updatedItem });
  };

  // Add exhibit to a user's collection (quick action from feed card)
  const handleAddExhibitToCollection = async (exhibitId: string, collectionId: string) => {
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    if (col.exhibitIds.includes(exhibitId)) return; // already in collection
    const updated = { ...col, exhibitIds: [...col.exhibitIds, exhibitId] };
    await db.updateCollection(updated);
  };

  // Create wishlist item from an exhibit (quick action from feed card)
  const handleAddExhibitToWishlist = async (exhibit: Exhibit, priority: WishlistPriority) => {
    if (!user) return;
    const refImage = exhibit.imageUrls?.[0];
    const refUrl = typeof refImage === 'string'
      ? refImage
      : (refImage as ProcessedImage)?.thumbnail || '';
    const newItem: WishlistItem = {
      id: crypto.randomUUID(),
      title: exhibit.title,
      category: exhibit.category,
      owner: user.username,
      priority,
      referenceImageUrl: refUrl,
      timestamp: new Date().toISOString(),
    };
    await db.saveWishlistItem(newItem);
  };

  // ROBUST REACTION HANDLER - FIXES DUPLICATION
  const handleReaction = async (id: string) => {
    if (!user) return;
    
    // Find in exhibits state
    const itemIndex = exhibits.findIndex(e => e.id === id);
    if (itemIndex === -1) return;
    
    const item = exhibits[itemIndex];
    
    // Using Set ensures unique users
    const currentLikes = new Set(item.likedBy || []);
    
    // Check reactions for legacy migration/consistency
    item.reactions?.filter(r => r.type === 'LIKE').forEach(r => {
        r.users.forEach(u => currentLikes.add(u));
    });

    const isLiked = currentLikes.has(user.username);
    if (isLiked) {
        currentLikes.delete(user.username);
    } else {
        currentLikes.add(user.username);
    }

    const newLikedBy = Array.from(currentLikes);
    const newReactions = [{ type: 'LIKE' as const, users: newLikedBy }];

    const updatedItem = {
        ...item,
        likes: newLikedBy.length,
        likedBy: newLikedBy,
        reactions: newReactions
    };

    // Optimistic Update
    const newExhibits = [...exhibits];
    newExhibits[itemIndex] = updatedItem;
    setExhibits(newExhibits);

    // Also update selectedExhibit if it matches
    if (selectedExhibit?.id === id) {
        setSelectedExhibit(updatedItem);
    }

    // Persist
    await db.updateExhibit(updatedItem);

    // Notify Owner (only if liking)
    if (!isLiked && item.owner !== user.username) {
        db.createNotification(item.owner, 'LIKE', user.username, item.id, item.title);
    }

    // Tier upgrade notification
    if (!isLiked) {
        const oldTier = getArtifactTier(item);
        const newTier = getArtifactTier(updatedItem);
        if (newTier !== oldTier) {
            db.createNotification(item.owner, 'GRADE_UP', item.owner, item.id, item.title, newTier);
        }
    }
    
    // We don't need to call refreshData() manually here because db.updateExhibit already calls notifyListeners
    // which triggers the subscription in useEffect -> refreshData.
  };

  const handleLikeCollection = async (collectionId: string) => {
    if (!user) return;
    const colIndex = collections.findIndex(c => c.id === collectionId);
    if (colIndex === -1) return;
    const col = collections[colIndex];
    const likedBy = new Set(col.likedBy || []);
    const isLiked = likedBy.has(user.username);
    if (isLiked) likedBy.delete(user.username);
    else likedBy.add(user.username);
    const newLikedBy = Array.from(likedBy);
    const updated = { ...col, likes: newLikedBy.length, likedBy: newLikedBy };
    const newCollections = [...collections];
    newCollections[colIndex] = updated;
    setCollections(newCollections);
    if (selectedCollection?.id === collectionId) setSelectedCollection(updated);
    await db.updateCollection(updated);
    if (!isLiked && col.owner !== user.username) {
      db.createNotification(col.owner, 'LIKE', user.username, col.id, col.title);
    }
  };

  const handleShareCollection = (col: Collection) => {
    const url = `${APP_ORIGIN}/collection/${col.id}`;
    if (navigator.share) {
      navigator.share({ title: col.title, text: col.description, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleEditComment = async (exhibitId: string, commentId: string, newText: string) => {
    if (!user) return;
    const exhibit = exhibits.find(e => e.id === exhibitId);
    if (!exhibit) return;
    const updatedComments = exhibit.comments.map(c => {
      if (c.id === commentId && c.author === user.username) {
        return { ...c, text: newText, editedAt: new Date().toISOString() };
      }
      return c;
    });
    const updatedExhibit = { ...exhibit, comments: updatedComments };
    if (selectedExhibit?.id === exhibitId) setSelectedExhibit(updatedExhibit);
    setExhibits(prev => prev.map(e => e.id === exhibitId ? updatedExhibit : e));
    await db.updateExhibit(updatedExhibit);
  };

  const handleMessageReaction = async (messageId: string, emoji: MessageReactionEmoji) => {
    if (!user) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    const currentReactions: MessageReaction[] = msg.reactions ? [...msg.reactions] : [];
    const existingIdx = currentReactions.findIndex(r => r.emoji === emoji);
    if (existingIdx === -1) {
      currentReactions.push({ emoji, users: [user.username] });
    } else {
      const bucket = currentReactions[existingIdx];
      const hasReacted = bucket.users.includes(user.username);
      if (hasReacted) {
        const newUsers = bucket.users.filter(u => u !== user.username);
        if (newUsers.length === 0) currentReactions.splice(existingIdx, 1);
        else currentReactions[existingIdx] = { ...bucket, users: newUsers };
      } else {
        currentReactions[existingIdx] = { ...bucket, users: [...bucket.users, user.username] };
      }
    }
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: currentReactions } : m));
    await db.updateMessageReactions(messageId, currentReactions);
  };

  const handleCommentReact = async (exhibitId: string, commentId: string, emoji: MessageReactionEmoji) => {
    if (!user) return;
    const exhibit = exhibits.find(e => e.id === exhibitId);
    if (!exhibit) return;
    const updatedComments = exhibit.comments.map(c => {
      if (c.id !== commentId) return c;
      const currentReactions: MessageReaction[] = c.reactions ? [...c.reactions] : [];
      const existingIdx = currentReactions.findIndex(r => r.emoji === emoji);
      if (existingIdx === -1) {
        currentReactions.push({ emoji, users: [user.username] });
      } else {
        const bucket = currentReactions[existingIdx];
        const hasReacted = bucket.users.includes(user.username);
        if (hasReacted) {
          const newUsers = bucket.users.filter(u => u !== user.username);
          if (newUsers.length === 0) currentReactions.splice(existingIdx, 1);
          else currentReactions[existingIdx] = { ...bucket, users: newUsers };
        } else {
          currentReactions[existingIdx] = { ...bucket, users: [...bucket.users, user.username] };
        }
      }
      return { ...c, reactions: currentReactions };
    });
    const updatedExhibit = { ...exhibit, comments: updatedComments };
    if (selectedExhibit?.id === exhibitId) setSelectedExhibit(updatedExhibit);
    setExhibits(prev => prev.map(e => e.id === exhibitId ? updatedExhibit : e));
    await db.updateExhibit(updatedExhibit);
  };

  // Swipe navigation between main tab views (mobile only)
  // Must be called before any early returns to satisfy Rules of Hooks
  const SWIPE_TAB_ORDER: ViewState[] = ['FEED', 'COMMUNITY_HUB', 'ACTIVITY', 'USER_PROFILE'];
  const TAB_LABELS: Record<string, string> = { FEED: 'ЛЕНТА', COMMUNITY_HUB: 'СООБЩЕСТВО', ACTIVITY: 'АКТИВНОСТЬ', USER_PROFILE: 'ПРОФИЛЬ' };
  const isMainTabView = SWIPE_TAB_ORDER.includes(view);
  const currentTabIndex = Math.max(0, SWIPE_TAB_ORDER.indexOf(view));
  const { dragX: tabDragX, isDragging: tabIsDragging, handlers: tabSwipeHandlers } = useSwipeTabs({
      tabCount: SWIPE_TAB_ORDER.length,
      currentIndex: currentTabIndex,
      onNavigate: (dir) => {
          const idx = SWIPE_TAB_ORDER.indexOf(view);
          if (dir === 'next' && idx >= 0 && idx < SWIPE_TAB_ORDER.length - 1) {
              const nextView = SWIPE_TAB_ORDER[idx + 1];
              // Swipe to profile always opens own profile
              navigateTo(nextView, nextView === 'USER_PROFILE' ? { username: user?.username } : undefined);
          }
          if (dir === 'prev' && idx > 0) navigateTo(SWIPE_TAB_ORDER[idx - 1]);
      },
  });
  const backSwipeHandlers = useSwipe({ onSwipeRight: handleBack });

  // Track swipe transition so transform is only applied during actual drag/snap-back.
  // Without this, transform:translateX(0px) persists at rest and breaks sticky positioning
  // inside CommunityHub (and other tab views).
  const [swipeTransitionActive, setSwipeTransitionActive] = useState(false);
  const swipeTransitionTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!tabIsDragging) {
      setSwipeTransitionActive(true);
      swipeTransitionTimer.current = setTimeout(() => setSwipeTransitionActive(false), 300);
    }
    return () => clearTimeout(swipeTransitionTimer.current);
  }, [tabIsDragging]);

  if (isInitializing || showSplash) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <MatrixRain theme="dark" />
        <RetroLoader size="lg" text="INITIALIZING SYSTEM" />
      </div>
    );
  }

  if (view === 'LANDING') {
    return (
      <LandingPage
        onLogin={() => setView('AUTH')}
        onRegister={() => setView('AUTH')}
      />
    );
  }

  if (view === 'PRIVACY') {
    return (
      <PrivacyPolicyPage
        onBack={() => {
          window.history.back();
          setView('LANDING');
        }}
      />
    );
  }

  if (view === 'TERMS') {
    return (
      <TermsOfUsePage
        onBack={() => {
          window.history.back();
          setView('LANDING');
        }}
      />
    );
  }

  if (view === 'NOT_FOUND') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <div className="text-8xl font-bold text-[#4cff5a] font-mono mb-2">404</div>
          <div className="text-xl text-gray-400 mb-1">Страница не найдена</div>
          <div className="text-sm text-gray-600">Экспонат или коллекция были удалены или не существуют</div>
        </div>
        <button
          onClick={() => { window.history.replaceState({}, '', '/'); setView('FEED'); document.title = 'NeoArchive: Ваша цифровая полка и виртуальные коллекции'; }}
          className="px-6 py-3 bg-[#4cff5a] text-black font-bold rounded-lg hover:bg-[#3de049] transition-colors"
        >
          На главную
        </button>
      </div>
    );
  }

  if (view === 'AUTH') {
    return (
      <div className="min-h-screen bg-dark-bg text-white relative overflow-hidden">
        <SEO title="NeoArchive: Вход" />
        <MatrixRain theme="dark" />
        <CRTOverlay />
        <div className="relative z-10">
          <MatrixLogin 
            theme="dark" 
            onLogin={(u, remember) => {
                setUser(u);
                if (u.settings?.theme) setTheme(u.settings.theme);
                if (!remember) localStorage.removeItem('neo_active_user');
                syncFromUrl();
            }}
            initialCode={verificationCode}
            initialType={verificationType}
          />
        </div>
      </div>
    );
  }

  // Helper for conditional classes
  const getDesktopNavClasses = () => {
      switch(theme) {
          case 'xp': return 'bg-xp-blue border-b-2 border-xp-navy text-white shadow-[0_2px_6px_rgba(0,0,0,0.3)]';
          case 'winamp': return 'bg-wa-base border-b border-[#505050] text-[#00ff00] font-winamp';
          case 'light': return 'bg-white/90 backdrop-blur-md border-b border-gray-200 text-gray-900';
          default: return 'bg-[#0a0a0a] border-b border-[#1e1e1e] text-white';
      }
  };

  const getMobileNavClasses = () => {
      switch(theme) {
          case 'xp': return 'bg-xp-bg border-t-2 border-xp-navy text-black shadow-[0_-2px_5px_rgba(0,0,0,0.1)]';
          case 'winamp': return 'bg-wa-base border-t border-[#505050] text-[#00ff00]';
          case 'light': return 'bg-white/90 backdrop-blur-md border-t border-gray-200 text-gray-900';
          default: return 'bg-[#111] border-t border-[#1e1e1e] text-white';
      }
  };

  const getThemeClasses = () => {
      switch(theme) {
          case 'xp': return 'bg-xp-bg text-black font-sans';
          case 'winamp': return 'bg-[#191919] font-winamp text-gray-300';
          case 'light': return 'bg-light-bg text-gray-900';
          default: return 'bg-dark-bg text-gray-100';
      }
  };

  const getNavIcon = (viewName: ViewState) => {
      if (theme === 'winamp') {
          switch(viewName) {
              case 'FEED': return <XI icon={ListMusic} size={24} />;
              case 'COMMUNITY_HUB': return <XI icon={Radio} size={24} />;
              case 'CREATE_HUB': return <XI icon={Zap} size={24} />;
              case 'ACTIVITY': return <XI icon={Activity} size={24} />;
              default: return null; 
          }
      }
      if (theme === 'xp') {
          switch(viewName) {
              case 'FEED': return <XI icon={LayoutTemplate} size={24} />;
              case 'COMMUNITY_HUB': return <XI icon={Globe} size={24} />;
              case 'CREATE_HUB': return <XI icon={FilePlus2} size={24} />;
              case 'ACTIVITY': return <XI icon={Flag} size={24} />;
              default: return null;
          }
      }
      switch(viewName) {
          case 'FEED': return <XI icon={LayoutGrid} size={24} />;
          case 'COMMUNITY_HUB': return <XI icon={Globe} size={24} />;
          case 'CREATE_HUB': return <XI icon={Plus} size={24} />;
          case 'ACTIVITY': return <XI icon={Bell} size={24} />;
          default: return null;
      }
  };

  return (
    <ThemeContext.Provider value={theme}>
    <div className={`min-h-screen transition-colors duration-300 pb-safe md:pl-[60px] ${getThemeClasses()}`} style={{ overflowX: 'clip', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
        <SEO title="NeoArchive" />
        <MatrixRain theme={theme === 'dark' ? 'dark' : 'light'} />
        {theme === 'dark' && <CRTOverlay />}
        
        <ToastContainer cardFlipEnabled={user?.settings?.cardFlipAnimation ?? true} />

        {isOffline && (
            <div className="sticky top-0 left-0 right-0 z-40 bg-yellow-500/90 text-black text-center py-1 px-4 text-xs font-bold font-mono flex justify-center items-center gap-2">
                <XI icon={WifiOff} size={14}/> OFFLINE MODE / SYNCHRONIZING...
            </div>
        )}

        {!user && (
            <>
                {/* GUEST HEADER — десктоп */}
                <nav className="hidden md:flex w-full z-50 px-6 h-16 items-center justify-between backdrop-blur-md bg-black/80 border-b border-white/10 text-white">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigateTo('FEED')}>
                        <div className="w-8 h-8 flex items-center justify-center font-bold text-xs rounded border bg-green-500 border-green-500 text-black">NA</div>
                        <span className="font-pixel font-bold text-lg tracking-[0.2em] group-hover:opacity-80 transition-opacity text-white">NEO_ARCHIVE</span>
                    </div>
                    <button
                        onClick={() => setView('AUTH')}
                        className="flex items-center gap-2 font-pixel text-xs font-bold px-5 py-2 rounded-xl bg-green-500 text-black hover:bg-green-400 transition-all"
                    >
                        <XI icon={UserCheck} size={16} /> ВОЙТИ
                    </button>
                </nav>
                {/* GUEST HEADER — мобайл (сверху) */}
                <nav className="md:hidden fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 h-14 bg-black/80 backdrop-blur-md border-b border-white/10">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('FEED')}>
                        <div className="w-7 h-7 flex items-center justify-center font-bold text-[10px] rounded border bg-green-500 border-green-500 text-black">NA</div>
                        <span className="font-pixel font-bold text-sm tracking-[0.2em] text-white">NEO_ARCHIVE</span>
                    </div>
                    <button
                        onClick={() => setView('AUTH')}
                        className="flex items-center gap-2 font-pixel text-[10px] font-bold px-4 py-1.5 rounded-lg bg-green-500 text-black hover:bg-green-400 transition-all"
                    >
                        <XI icon={UserCheck} size={14} /> ВОЙТИ
                    </button>
                </nav>
            </>
        )}

        {user && (
            <>
                {/* DESKTOP SIDEBAR NAV */}
                <nav className={`hidden md:flex flex-col items-center fixed left-0 top-0 bottom-0 z-50 w-[60px] transition-all duration-300 ${
                    theme === 'winamp' ? 'bg-wa-base border-r border-[#505050]'
                    : theme === 'xp' ? 'bg-xp-bg border-r-2 border-xp-navy/30'
                    : theme === 'light' ? 'bg-white border-r border-black/8'
                    : 'bg-[#0a0a0a] border-r border-[#1e1e1e]'
                }`}>
                    {/* Logo */}
                    <div className="pt-[18px] pb-3 flex items-center justify-center w-full cursor-pointer" onClick={() => navigateTo('FEED')}>
                        <div className={`w-7 h-7 rounded-[7px] flex items-center justify-center font-bold text-[13px] font-pixel transition-colors ${
                            theme === 'winamp' ? 'bg-[#191919] text-[#00ff00] border border-[#505050]'
                            : theme === 'xp' ? 'bg-xp-blue text-white'
                            : theme === 'light' ? 'bg-black text-white'
                            : 'bg-[#4cff5a] text-black'
                        }`}>N</div>
                    </div>

                    {/* Nav items */}
                    <div className="flex flex-col items-center gap-1 flex-1 w-full px-2">
                        {([
                            { v: 'FEED', icon: LayoutGrid },
                            { v: 'COMMUNITY_HUB', icon: Globe },
                            { v: 'SEARCH', icon: Search },
                            { v: 'CREATE_HUB', icon: Plus },
                            { v: 'ACTIVITY', icon: Bell },
                        ] as { v: string; icon: any }[]).map(({ v, icon }) => {
                            const isActive = view === v;
                            return (
                                <button
                                    key={v}
                                    onClick={() => navigateTo(v as ViewState)}
                                    className={`relative w-11 h-11 rounded-[11px] flex items-center justify-center transition-all ${
                                        isActive
                                            ? theme === 'winamp' ? 'bg-[#00ff00]/10 text-[#00ff00]'
                                              : theme === 'xp' ? 'bg-xp-navy/10 text-xp-navy'
                                              : theme === 'light' ? 'bg-black/10 text-black'
                                              : 'bg-[rgba(76,255,90,0.1)] text-[#4cff5a]'
                                            : theme === 'winamp' ? 'text-[#505050] hover:text-[#00ff00]'
                                              : theme === 'xp' ? 'text-xp-navy/40 hover:text-xp-navy/80'
                                              : theme === 'light' ? 'text-black/30 hover:text-black/70'
                                              : 'text-[#555] hover:text-[#888]'
                                    }`}
                                >
                                    <XI icon={icon} size={18} />
                                    {v === 'ACTIVITY' && notifications.some(n => n.recipient === user.username && !n.isRead) && (
                                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Avatar at bottom */}
                    <div className="pb-[18px]">
                        <div
                            onClick={() => navigateTo('USER_PROFILE', { username: user.username })}
                            className={`w-8 h-8 rounded-full cursor-pointer overflow-hidden border transition-all ${
                                theme === 'winamp' ? 'border-[#505050]'
                                : theme === 'dark' ? 'border-[#2a2a2a] hover:border-[#4cff5a]'
                                : 'border-black/10 hover:border-black/30'
                            } ${view === 'USER_PROFILE' && viewedProfileUsername === user.username ? (theme === 'dark' ? 'border-[#4cff5a]' : '') : ''}`}
                        >
                            <img src={db.getUserAvatar(user.username)} className="w-full h-full object-cover" alt={user.username} />
                        </div>
                    </div>
                </nav>

                {/* MOBILE NAV */}
                <nav className={`md:hidden fixed bottom-0 left-0 w-full z-50 pb-safe ${getMobileNavClasses()}`}>
                    <div className="flex justify-around items-center h-[58px]">
                        <button onClick={() => navigateTo('FEED')} className={`flex flex-col items-center gap-1 p-2 transition-colors ${view === 'FEED' ? 'text-[#4cff5a]' : 'text-[#555] hover:text-[#888]'}`}>{getNavIcon('FEED')}</button>
                        <button onClick={() => navigateTo('COMMUNITY_HUB')} className={`flex flex-col items-center gap-1 p-2 transition-colors ${view === 'COMMUNITY_HUB' ? 'text-[#4cff5a]' : 'text-[#555] hover:text-[#888]'}`}>{getNavIcon('COMMUNITY_HUB')}</button>
                        <button onClick={() => navigateTo('CREATE_HUB')} className={`flex items-center justify-center w-11 h-11 rounded-full -mt-5 border-[3px] border-[#111] transition-colors ${view === 'CREATE_HUB' ? 'bg-white text-black' : 'bg-[#4cff5a] text-black'}`}><XI icon={Plus} size={22}/></button>
                        <button onClick={() => navigateTo('ACTIVITY')} className={`flex flex-col items-center gap-1 p-2 relative transition-colors ${view === 'ACTIVITY' ? 'text-[#4cff5a]' : 'text-[#555] hover:text-[#888]'}`}>{getNavIcon('ACTIVITY')}{notifications.some(n => n.recipient === user.username && !n.isRead) && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}</button>
                        <button onClick={() => navigateTo('USER_PROFILE', { username: user.username })} className={`flex flex-col items-center gap-1 p-2 relative transition-colors ${view === 'USER_PROFILE' && viewedProfileUsername === user.username ? 'text-[#4cff5a]' : 'text-[#555] hover:text-[#888]'}`}><XI icon={UserCheck} size={24}/>{tradeRequests.some(r => r.shipment && r.recipient === user.username && (r.shipment.status === 'IN_TRANSIT' || r.shipment.status === 'DELIVERED') && r.status !== 'COMPLETED') && <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}</button>
                    </div>
                </nav>
            </>
        )}


        {/* Swipe peek: adjacent-tab preview slides in from the edge during drag */}
        {isMainTabView && tabIsDragging && tabDragX < -10 && currentTabIndex < SWIPE_TAB_ORDER.length - 1 && (
            <div
                className={`fixed inset-0 z-0 flex flex-col items-start justify-center pl-5 pointer-events-none ${getThemeClasses()}`}
                style={{ transform: `translateX(calc(100vw + ${tabDragX}px))` }}
            >
                <div className="flex items-center gap-2 opacity-60">
                    <ChevronLeft size={16} className={theme === 'winamp' ? 'text-[#00ff00]' : theme === 'xp' ? 'text-xp-navy' : 'text-green-400'} />
                    <span className={`font-pixel text-sm tracking-widest ${theme === 'winamp' ? 'text-[#00ff00]' : theme === 'xp' ? 'text-xp-navy' : 'text-white'}`}>
                        {TAB_LABELS[SWIPE_TAB_ORDER[currentTabIndex + 1]] ?? ''}
                    </span>
                </div>
                {/* Progress dots */}
                <div className="flex gap-1.5 mt-3">
                    {SWIPE_TAB_ORDER.map((_, i) => (
                        <div key={i} className={`rounded-full transition-all ${i === currentTabIndex + 1 ? 'w-4 h-1.5 bg-green-400' : 'w-1.5 h-1.5 bg-white/20'}`} />
                    ))}
                </div>
            </div>
        )}
        {isMainTabView && tabIsDragging && tabDragX > 10 && currentTabIndex > 0 && (
            <div
                className={`fixed inset-0 z-0 flex flex-col items-end justify-center pr-5 pointer-events-none ${getThemeClasses()}`}
                style={{ transform: `translateX(calc(-100vw + ${tabDragX}px))` }}
            >
                <div className="flex items-center gap-2 opacity-60">
                    <span className={`font-pixel text-sm tracking-widest ${theme === 'winamp' ? 'text-[#00ff00]' : theme === 'xp' ? 'text-xp-navy' : 'text-white'}`}>
                        {TAB_LABELS[SWIPE_TAB_ORDER[currentTabIndex - 1]] ?? ''}
                    </span>
                    <ChevronRight size={16} className={theme === 'winamp' ? 'text-[#00ff00]' : theme === 'xp' ? 'text-xp-navy' : 'text-green-400'} />
                </div>
                {/* Progress dots */}
                <div className="flex gap-1.5 mt-3">
                    {SWIPE_TAB_ORDER.map((_, i) => (
                        <div key={i} className={`rounded-full transition-all ${i === currentTabIndex - 1 ? 'w-4 h-1.5 bg-green-400' : 'w-1.5 h-1.5 bg-white/20'}`} />
                    ))}
                </div>
            </div>
        )}

        <div
            style={isMainTabView && (tabIsDragging || swipeTransitionActive) ? {
                transform: `translateX(${tabDragX}px)`,
                transition: tabIsDragging ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                willChange: tabIsDragging ? 'transform' : 'auto',
            } : undefined}
            {...(isMainTabView ? tabSwipeHandlers : (['CREATE_ARTIFACT', 'EDIT_ARTIFACT', 'CREATE_COLLECTION', 'EDIT_COLLECTION', 'CREATE_WISHLIST', 'SETTINGS', 'ADMIN'].includes(view) ? {} : backSwipeHandlers))}
        >
            {/* Отступ под гостевым мобильным хедером */}
            {!user && <div className="md:hidden h-14" />}

            {view === 'FEED' && (
                <FeedView theme={theme} user={user} stories={stories} exhibits={exhibits} wishlist={wishlist} collections={collections.filter(c => {
                    if (user && c.owner === user.username) return true;
                    if (!c.visibility || c.visibility === 'PUBLIC') return true;
                    if (c.visibility === 'PRIVATE') return false;
                    if (c.visibility === 'FOLLOWERS') {
                        if (!user) return false;
                        const owner = allUsers.find(u => u.username === c.owner);
                        return owner?.followers?.includes(user.username) ?? false;
                    }
                    return true;
                })} feedMode={feedMode} setFeedMode={setFeedMode} feedViewMode={feedViewMode} setFeedViewMode={setFeedViewMode} feedType={feedType} setFeedType={setFeedType} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} onNavigate={(v, p) => navigateTo(v as ViewState, p)} onExhibitClick={handleExhibitClick} onReact={(id) => requireAuth(() => handleReaction(id))} onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })} onWishlistClick={(w) => { requireAuth(() => { setSelectedWishlistItem(w); setView('WISHLIST_DETAIL'); }); }} onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })} userCollections={user ? collections.filter(c => c.owner === user.username) : []} onAddToCollection={handleAddExhibitToCollection} onAddToWishlist={(exhibit, priority) => requireAuth(() => handleAddExhibitToWishlist(exhibit, priority))} onRefresh={refreshData} />
            )}

            {view === 'ACTIVITY' && user && (
                <div className="p-4 pb-24">
                    <ActivityView notifications={notifications} messages={messages} currentUser={user} theme={theme} onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })} onExhibitClick={(id, commentId) => { const item = exhibits.find(e => e.id === id); if (item) navigateTo('EXHIBIT', { item, highlightCommentId: commentId }); }} onChatClick={(u) => navigateTo('DIRECT_CHAT', { username: u })} exhibits={exhibits} cardFlipEnabled={user?.settings?.cardFlipAnimation ?? true} />
                </div>
            )}
            
            {view === 'MY_COLLECTION' && user && (
                <MyCollection theme={theme} user={user} exhibits={exhibits.filter(e => e.owner === user.username)} allExhibits={exhibits} collections={collections.filter(c => c.owner === user.username)} wishlist={wishlist} onBack={() => navigateTo('FEED')} onExhibitClick={(item) => { if (item.isDraft) navigateTo('CREATE_ARTIFACT', { initialData: item }); else handleExhibitClick(item); }} onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })} onReact={handleReaction} onWishlistClick={(w) => { setSelectedWishlistItem(w); setView('WISHLIST_DETAIL'); }} onEditDraft={(item) => navigateTo('CREATE_ARTIFACT', { initialData: item })} onPublishDraft={async (item) => { await db.updateExhibit({ ...item, isDraft: false }); refreshData(); }} />
            )}

            {view === 'EXHIBIT' && selectedExhibit && (
                <ExhibitDetailPage exhibit={selectedExhibit} theme={theme} onBack={handleBack} onShare={(id) => db.incrementShares(id)} onFavorite={() => {}} onLike={(id) => requireAuth(() => handleReaction(id))} isFavorited={false} isLiked={selectedExhibit.likedBy?.includes(user?.username || '') || false} onPostComment={async (id, text, parentId) => { if (!user) { setShowAuthPrompt(true); return; } const comment: Comment = { id: crypto.randomUUID(), parentId, author: user.username, text, timestamp: new Date().toLocaleString(), likes: 0, likedBy: [] }; const updatedExhibit = { ...selectedExhibit, comments: [...(selectedExhibit.comments || []), comment] }; setSelectedExhibit(updatedExhibit); await db.updateExhibit(updatedExhibit); if (selectedExhibit.owner !== user.username) { db.createNotification(selectedExhibit.owner, 'COMMENT', user.username, selectedExhibit.id, selectedExhibit.title); } if (parentId) { const parentComment = (selectedExhibit.comments || []).find((c: Comment) => c.id === parentId); if (parentComment && parentComment.author !== user.username && parentComment.author !== selectedExhibit.owner) { db.createNotification(parentComment.author, 'COMMENT', user.username, selectedExhibit.id, `↩ ${text.slice(0, 40)}`); } } const mentionedUsers = [...new Set(Array.from(text.matchAll(/@(\w+)/g), m => m[1]))]; for (const mentioned of mentionedUsers) { if (mentioned !== user.username && mentioned !== selectedExhibit.owner) { db.createNotification(mentioned, 'MENTION', user.username, selectedExhibit.id, selectedExhibit.title, comment.id); } } }} onCommentLike={async (commentId) => { if (!user) { setShowAuthPrompt(true); return; } const updatedComments = selectedExhibit.comments.map(c => { if (c.id === commentId) { const isLiked = c.likedBy?.includes(user.username); if (!isLiked && c.author !== user.username) { db.createNotification(c.author, 'LIKE_COMMENT', user.username, selectedExhibit.id, c.text.slice(0, 30)); } return { ...c, likes: isLiked ? c.likes - 1 : c.likes + 1, likedBy: isLiked ? c.likedBy.filter(u => u !== user.username) : [...(c.likedBy || []), user.username] }; } return c; }); const updatedExhibit = { ...selectedExhibit, comments: updatedComments }; setSelectedExhibit(updatedExhibit); await db.updateExhibit(updatedExhibit); }} onDeleteComment={async (exId, cId) => { const updatedComments = selectedExhibit.comments.filter(c => c.id !== cId); const updatedExhibit = { ...selectedExhibit, comments: updatedComments }; setSelectedExhibit(updatedExhibit); await db.updateExhibit(updatedExhibit); }} onEditComment={handleEditComment} onCommentReact={handleCommentReact} onAuthorClick={(author) => navigateTo('USER_PROFILE', { username: author })} onFollow={async (u) => { if (!user) { setShowAuthPrompt(true); return; } const wasFollowing = user.following.includes(u); await db.toggleFollow(user.username, u); if (!wasFollowing) { db.createNotification(u, 'FOLLOW', user.username); } refreshData(); }} onMessage={(u) => { requireAuth(() => navigateTo('DIRECT_CHAT', { username: u })); }} onDelete={async (id) => { try { await db.deleteExhibit(id); handleBack(); } catch (e: any) { alert(e?.message || 'Ошибка удаления'); } }} onEdit={(item) => navigateTo('CREATE_ARTIFACT', { initialData: item })} onAddToCollection={() => setIsAddingToCollection(selectedExhibit.id)} onExhibitClick={handleExhibitClick} isFollowing={user?.following?.includes(selectedExhibit.owner) || false} currentUser={user?.username || ''} currentUserProfile={user} isAdmin={user?.isAdmin || false} users={allUsers} allExhibits={exhibits} highlightCommentId={highlightCommentId} />
            )}

            {view === 'COLLECTION_DETAIL' && selectedCollection && (
                <div className="max-w-4xl mx-auto p-4 pb-24">
                    <CollectionDetailPage
                        collection={selectedCollection}
                        artifacts={selectedCollection.exhibitIds.map(id => exhibits.find(e => e.id === id)).filter(Boolean) as Exhibit[]}
                        theme={theme}
                        onBack={handleBack}
                        onExhibitClick={handleExhibitClick}
                        onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                        currentUser={user?.username || ''}
                        onEdit={() => navigateTo('CREATE_COLLECTION', { initialData: selectedCollection })}
                        onDelete={async (id) => { await db.deleteCollection(id); handleBack(); }}
                        onLike={(id) => requireAuth(() => handleReaction(id))}
                        onLikeCollection={() => requireAuth(() => handleLikeCollection(selectedCollection.id))}
                        isCollectionLiked={selectedCollection.likedBy?.includes(user?.username || '') ?? false}
                        onShareCollection={() => handleShareCollection(selectedCollection)}
                    />
                </div>
            )}

            {view === 'WISHLIST_DETAIL' && selectedWishlistItem && user && (
                <WishlistDetailView
                    item={selectedWishlistItem}
                    theme={theme}
                    onBack={handleBack}
                    currentUser={user.username}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onDelete={async (id) => { await db.deleteWishlistItem(id); handleBack(); }}
                    onShare={() => {
                        const url = `${APP_ORIGIN}/wishlist/${selectedWishlistItem.id}`;
                        if (navigator.share) {
                            navigator.share({ title: selectedWishlistItem.title, url });
                        } else {
                            navigator.clipboard.writeText(url);
                        }
                    }}
                    onStatusChange={async (id, status) => {
                        const item = wishlist.find(w => w.id === id);
                        if (!item) return;
                        const updated = { ...item, status };
                        setWishlist(prev => prev.map(w => w.id === id ? updated : w));
                        setSelectedWishlistItem(updated);
                        await db.saveWishlistItem(updated);
                    }}
                    userInventory={exhibits.filter(e => e.owner === user.username)}
                />
            )}

            {view === 'USER_WISHLIST' && (
                <UserWishlistView ownerUsername={viewedProfileUsername} currentUser={user} wishlistItems={wishlist.filter(w => w.owner === viewedProfileUsername)} theme={theme} onBack={handleBack} onItemClick={(item) => { setSelectedWishlistItem(item); setView('WISHLIST_DETAIL'); }} onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })} />
            )}

            {view === 'SOCIAL_LIST' && (
                <SocialListView type={socialListType} username={viewedProfileUsername} currentUserUsername={user?.username} theme={theme} onBack={handleBack} onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })} />
            )}

            {view === 'SEARCH' && (
                <div className="p-4 pb-24">
                    <SearchView theme={theme} exhibits={exhibits} collections={collections} users={allUsers} onBack={handleBack} onExhibitClick={handleExhibitClick} onCollectionClick={(c) => { setSelectedCollection(c); setView('COLLECTION_DETAIL'); }} onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })} onReact={handleReaction} currentUser={user} />
                </div>
            )}

            {view === 'COMMUNITY_HUB' && (
                <div className="p-4 pb-24">
                    <CommunityHub theme={theme} users={allUsers} exhibits={exhibits} onExhibitClick={handleExhibitClick} onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })} onBack={() => navigateTo('FEED')} currentUser={user} currentUsername={user?.username} onReact={handleReaction} onFollow={async (u) => { if(user) { const wasFollowing = user.following.includes(u); await db.toggleFollow(user.username, u); if (!wasFollowing) { db.createNotification(u, 'FOLLOW', user.username); } refreshData(); } }} onOpenGlobalChat={() => navigateTo('GLOBAL_CHAT')} />
                </div>
            )}

            {view === 'DIRECT_CHAT' && user && (
                <DirectChat theme={theme} currentUser={user} partnerUsername={viewedProfileUsername} messages={messages.filter(m => (m.sender.toLowerCase() === user.username.toLowerCase() && m.receiver.toLowerCase() === viewedProfileUsername.toLowerCase()) || (m.sender.toLowerCase() === viewedProfileUsername.toLowerCase() && m.receiver.toLowerCase() === user.username.toLowerCase()))} users={allUsers} onBack={handleBack} onSendMessage={async (text) => { const msg = { id: crypto.randomUUID(), sender: user.username, receiver: viewedProfileUsername, text, timestamp: new Date().toLocaleString(), isRead: false }; await db.saveMessage(msg); }} onReactToMessage={handleMessageReaction} />
            )}

            {view === 'GLOBAL_CHAT' && user && (
                <div className="p-4 pb-24">
                    <GlobalChat theme={theme} currentUser={user} onBack={handleBack} onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })} allUsers={allUsers} />
                </div>
            )}

            {/* Other views (Create, Edit etc) */}
            {view === 'CREATE_HUB' && (
                <div className="p-6 pb-24 animate-in slide-in-from-bottom-10">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={handleBack} className="flex items-center gap-2 opacity-50 hover:opacity-100"><XI icon={ArrowLeft} size={16}/> НАЗАД</button>
                        <h2 className="font-pixel text-lg">СОЗДАТЬ</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <button onClick={() => navigateTo('CREATE_ARTIFACT')} className="p-6 border border-green-500/30 rounded-2xl flex items-center gap-4 hover:bg-green-500/10 transition-all"><div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500"><XI icon={Plus} size={24}/></div><div className="text-left"><div className="font-pixel text-sm font-bold">НОВЫЙ АРТЕФАКТ</div><div className="text-xs opacity-50">Добавить предмет в коллекцию</div></div></button>
                        <button onClick={() => navigateTo('CREATE_COLLECTION')} className="p-6 border border-blue-500/30 rounded-2xl flex items-center gap-4 hover:bg-blue-500/10 transition-all"><div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500"><XI icon={FolderPlus} size={24}/></div><div className="text-left"><div className="font-pixel text-sm font-bold">НОВАЯ КОЛЛЕКЦИЯ</div><div className="text-xs opacity-50">Объединить предметы в альбом</div></div></button>
                        <button onClick={() => navigateTo('CREATE_WISHLIST')} className="p-6 border border-purple-500/30 rounded-2xl flex items-center gap-4 hover:bg-purple-500/10 transition-all"><div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-500"><XI icon={Search} size={24}/></div><div className="text-left"><div className="font-pixel text-sm font-bold">В ПОИСКЕ (WISHLIST)</div><div className="text-xs opacity-50">Объявить розыск предмета</div></div></button>
                    </div>
                </div>
            )}

            {view === 'CREATE_ARTIFACT' && (
                <div className="p-4 pb-24">
                    <CreateArtifactView 
                      theme={theme} 
                      onBack={handleBack} 
                      onSave={async (item) => { 
                        if (!user) return; 
                        const ownerToSet = item.adminOwner || (item.id ? item.owner : user.username);
                        const newItem = { 
                          ...item, 
                          id: item.id || crypto.randomUUID(), 
                          owner: ownerToSet,
                          timestamp: item.id ? (item.timestamp || new Date().toISOString()) : new Date().toISOString(),
                          likes: item.likes || 0, 
                          views: item.views || 0 
                        }; 
                        if (newItem.adminOwner) delete newItem.adminOwner;
                        if (item.id) db.updateExhibit(newItem);
                        else db.saveExhibit(newItem);
                        handleBack();
                      }} 
                      initialData={selectedExhibit} 
                      userArtifacts={exhibits.filter(e => e.owner === user?.username)}
                      currentUser={user}
                      allUsers={allUsers}
                    />
                </div>
            )}

            {view === 'CREATE_COLLECTION' && (
                <div className="p-4 pb-24">
                    <CreateCollectionView theme={theme} userArtifacts={exhibits.filter(e => e.owner === user?.username && !e.isDraft)} onBack={handleBack} onSave={async (col) => { if (!user) return; const newCol = { ...col, id: col.id || crypto.randomUUID(), owner: user.username, timestamp: new Date().toLocaleString() } as Collection; if (col.id) await db.updateCollection(newCol); else await db.saveCollection(newCol); handleBack(); }} initialData={selectedCollection} onDelete={async (id) => { await db.deleteCollection(id); handleBack(); }} />
                </div>
            )}

            {view === 'CREATE_WISHLIST' && (
                <div className="p-4 pb-24">
                    <CreateWishlistItemView theme={theme} onBack={handleBack} onSave={async (item) => { if (!user) return; const newItem = { ...item, owner: user.username }; await db.saveWishlistItem(newItem); handleBack(); }} />
                </div>
            )}

            {isAddingToCollection && user && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
                    <div className={`w-full max-w-sm rounded-xl p-6 ${theme === 'winamp' ? 'bg-[#292929] border border-[#505050] text-gray-300' : 'bg-dark-surface border border-white/10 text-white'}`}>
                        <h3 className="font-pixel text-sm mb-4">ДОБАВИТЬ В КОЛЛЕКЦИЮ</h3>
                        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                            {collections.filter(c => c.owner === user.username).map(col => (
                                <button key={col.id} onClick={async () => { if(col.exhibitIds.includes(isAddingToCollection)) return; const updated = { ...col, exhibitIds: [...col.exhibitIds, isAddingToCollection] }; await db.updateCollection(updated); const item = exhibits.find(e => e.id === isAddingToCollection); if (item && item.owner !== user.username) { db.createNotification(item.owner, 'LIKE', user.username, item.id, item.title + " (Saved)"); } setIsAddingToCollection(null); alert('Добавлено!'); }} className="w-full p-3 text-left border border-white/10 rounded hover:bg-white/5 flex items-center gap-2"><XI icon={Folder} size={16}/> {col.title}</button>
                            ))}
                            {collections.filter(c => c.owner === user.username).length === 0 && <div className="opacity-50 text-xs">Нет коллекций</div>}
                        </div>
                        <button onClick={() => setIsAddingToCollection(null)} className="w-full py-3 bg-white/10 rounded font-bold text-xs">ОТМЕНА</button>
                    </div>
                </div>
            )}
            
            {view === 'USER_PROFILE' && user && (
                <UserProfileView 
                    user={user} 
                    viewedProfileUsername={viewedProfileUsername} 
                    exhibits={exhibits} 
                    collections={collections} 
                    guestbook={guestbook} 
                    theme={theme} 
                    onBack={handleBack} 
                    onLogout={() => { db.logoutUser(); setView('AUTH'); }}
                    onFollow={async (u) => { if(user) { const wasFollowing = user.following.includes(u); await db.toggleFollow(user.username, u); if (!wasFollowing) { db.createNotification(u, 'FOLLOW', user.username); } refreshData(); } }}
                    onChat={(u) => navigateTo('DIRECT_CHAT', { username: u })} 
                    onExhibitClick={handleExhibitClick} 
                    onReact={handleReaction} 
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })} 
                    onCollectionClick={(c) => { setSelectedCollection(c); setView('COLLECTION_DETAIL'); }} 
                    onShareCollection={() => {}} 
                    onViewHallOfFame={(username) => { setHallOfFameUsername(username); setView('HALL_OF_FAME'); }}
                    onGuestbookPost={async (text) => { if (!user) return; const entry: GuestbookEntry = { id: crypto.randomUUID(), author: user.username, targetUser: viewedProfileUsername, text, timestamp: new Date().toLocaleString(), isRead: false }; await db.saveGuestbookEntry(entry); if(viewedProfileUsername !== user.username) db.createNotification(viewedProfileUsername, 'GUESTBOOK', user.username); }} 
                    refreshData={refreshData} 
                    isEditingProfile={isEditingProfile} 
                    setIsEditingProfile={setIsEditingProfile} 
                    editTagline={editTagline} 
                    setEditTagline={setEditTagline} 
                    editBio={editBio} 
                    setEditBio={setEditBio} 
                    editStatus={editStatus} 
                    setEditStatus={setEditStatus} 
                    editTelegram={editTelegram} 
                    setEditTelegram={setEditTelegram} 
                    editPassword={editPassword} 
                    setEditPassword={setEditPassword} 
                    onSaveProfile={async () => { if (!user) return; const updated = { ...user, tagline: editTagline, bio: editBio, status: editStatus, telegram: editTelegram }; if (editPassword) updated.password = editPassword; await db.updateUserProfile(updated); setIsEditingProfile(false); setEditPassword(''); }} 
                    onProfileImageUpload={async (e) => { if (e.target.files?.[0] && user) { const file = e.target.files[0]; if (!file.type.startsWith('image/')) { alert('Допустимы только изображения'); e.target.value = ''; return; } if (file.size > 5 * 1024 * 1024) { alert('Размер аватарки не должен превышать 5 МБ'); e.target.value = ''; return; } const b64 = await db.fileToBase64(file, 800, 0.85); await db.updateUserProfile({ ...user, avatarUrl: b64 }); } }} 
                    onProfileCoverUpload={async (e) => { if (e.target.files?.[0] && user) { const b64 = await db.fileToBase64(e.target.files[0]); await db.updateUserProfile({ ...user, coverUrl: b64 }); } }} 
                    guestbookInput={guestbookInput} 
                    setGuestbookInput={setGuestbookInput} 
                    guestbookInputRef={guestbookInputRef} 
                    profileTab={profileTab} 
                    setProfileTab={setProfileTab} 
                    onOpenSocialList={(u, type) => { setViewedProfileUsername(u); setSocialListType(type); setView('SOCIAL_LIST'); }} 
                    onThemeChange={(t) => setTheme(t)} 
                    onWishlistClick={(w) => { setSelectedWishlistItem(w); setView('WISHLIST_DETAIL'); }}
                    allUsers={allUsers}
                    tradeRequests={tradeRequests}
                />
            )}

            {view === 'HALL_OF_FAME' && user && (
                 <HallOfFame
                     theme={theme}
                     achievements={computeAchievementsForUser(hallOfFameUsername || user.username)}
                     username={hallOfFameUsername || user.username}
                     onBack={handleBack}
                 />
            )}
        </div>

        {/* Auth prompt modal for unauthenticated interaction attempts */}
        {showAuthPrompt && (
            <div
                className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
                onClick={() => setShowAuthPrompt(false)}
            >
                <div
                    className={`w-full max-w-xs rounded-2xl p-6 flex flex-col gap-4 shadow-2xl border ${theme === 'winamp' ? 'bg-[#292929] border-[#505050] text-gray-200' : theme === 'xp' ? 'bg-xp-bg border-xp-navy text-xp-navy' : 'bg-dark-surface border-white/10 text-white'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <h3 className="font-pixel text-sm font-bold tracking-widest text-center">ВХОД ТРЕБУЕТСЯ</h3>
                    <p className="text-xs opacity-60 text-center leading-relaxed">Чтобы взаимодействовать с контентом, необходимо войти в аккаунт</p>
                    <button
                        onClick={() => { setShowAuthPrompt(false); setView('AUTH'); }}
                        className={`w-full py-3 rounded-xl font-pixel text-xs font-bold tracking-wider transition-all ${theme === 'winamp' ? 'bg-[#00ff00] text-black hover:bg-[#00cc00]' : theme === 'xp' ? 'bg-xp-navy text-white hover:opacity-80' : 'bg-green-500 text-black hover:bg-green-400'}`}
                    >
                        ВОЙТИ
                    </button>
                    <button
                        onClick={() => setShowAuthPrompt(false)}
                        className="w-full py-2 rounded-xl font-pixel text-xs opacity-50 hover:opacity-80 transition-opacity"
                    >
                        ОТМЕНА
                    </button>
                </div>
            </div>
        )}
    </div>
    </ThemeContext.Provider>
  );
}