import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  LayoutGrid, PlusCircle, Search, Bell, FolderPlus, ArrowLeft, Folder, Plus, Globe,
  Heart, SkipBack, Play, Square, Pause, User
} from 'lucide-react';

import MatrixRain from './components/MatrixRain';
import CRTOverlay from './components/CRTOverlay';
import MatrixLogin from './components/MatrixLogin';
import UserProfileView from './components/UserProfileView';
import ExhibitDetailPage from './components/ExhibitDetailPage';
import CommunityHub from './components/CommunityHub'; 
import RetroLoader from './components/RetroLoader';
import PixelSnow from './components/PixelSnow';
import ActivityView from './components/ActivityView';
import SEO from './components/SEO';
import HallOfFame from './components/HallOfFame';
import CollectionDetailPage from './components/CollectionDetailPage';
import DirectChat from './components/DirectChat';
import CreateArtifactView from './components/CreateArtifactView';
import CreateCollectionView from './components/CreateCollectionView';
import CreateWishlistItemView from './components/CreateWishlistItemView';
import WishlistDetailView from './components/WishlistDetailView';
import SocialListView from './components/SocialListView';
import SearchView from './components/SearchView';
import GuildDetailView from './components/GuildDetailView';
import UserWishlistView from './components/UserWishlistView';
import FeedView from './components/FeedView';

import * as db from './services/storageService';
import { UserProfile, Exhibit, Collection, ViewState, Notification, Message, GuestbookEntry, Comment, WishlistItem, Guild } from './types';
import { getArtifactTier } from './constants';
import useSwipe from './hooks/useSwipe';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'xp' | 'winamp'>('dark');
  const [view, setView] = useState<ViewState>('AUTH');
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<WishlistItem | null>(null);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [viewedProfileUsername, setViewedProfileUsername] = useState<string>('');
  
  // Advanced Notification State
  const [highlightCommentId, setHighlightCommentId] = useState<string | undefined>(undefined);

  // Feed State
  const [selectedCategory, setSelectedCategory] = useState<string>('ВСЕ');
  const [feedMode, setFeedMode] = useState<'ARTIFACTS' | 'WISHLIST'>('ARTIFACTS');
  const [feedViewMode, setFeedViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [feedType, setFeedType] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');

  // Pagination
  const [feedPage, setFeedPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Social/Edit State
  const [socialListType, setSocialListType] = useState<'followers' | 'following'>('followers');
  const [isAddingToCollection, setIsAddingToCollection] = useState<string | null>(null);

  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editBio, setEditBio] = useState(''); 
  const [editStatus, setEditStatus] = useState<any>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');
  const [guestbookInput, setGuestbookInput] = useState('');
  const guestbookInputRef = useRef<HTMLInputElement>(null);

  // --- STORIES ---
  const stories = useMemo(() => {
      if (!user) return [];
      const following = user.following || [];
      const recentPosts = exhibits
          .filter(e => following.includes(e.owner) && !e.isDraft)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Get unique users who posted recently
      const storyUsers = Array.from(new Set(recentPosts.map(e => e.owner))).slice(0, 10);
      return storyUsers.map(u => ({ username: u, avatar: db.getUserAvatar(u), latestItem: recentPosts.find(e => e.owner === u) }));
  }, [user, exhibits]);

  // --- ROUTING LOGIC ---

  // Central function to sync state from URL
  const syncFromUrl = useCallback(async () => {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean); // Remove empty strings
      const root = segments[0];

      if (!root) {
          setView('FEED');
          return;
      }

      if (root === 'community') {
          setView('COMMUNITY_HUB');
      } else if (root === 'activity') {
          setView('ACTIVITY');
      } else if (root === 'search') {
          setView('SEARCH');
      } else if (root === 'create') {
          setView('CREATE_HUB');
      } else if (root === 'u' || root === 'profile') {
          const username = segments[1];
          if (username) {
              setViewedProfileUsername(username);
              if (segments[2] === 'wishlist') {
                  setView('USER_WISHLIST');
              } else {
                  setView('USER_PROFILE');
              }
          }
      } else if (root === 'artifact') {
          const id = segments[1];
          let item: Exhibit | null | undefined = db.getFullDatabase().exhibits.find(e => e.id === id);
          if (!item) {
              try { item = await db.fetchExhibitById(id); } catch(e){}
          }
          if (item) {
              setSelectedExhibit(item);
              setView('EXHIBIT');
          } else {
              setView('FEED'); 
          }
      } else if (root === 'collection') {
          const id = segments[1];
          let col: Collection | null | undefined = db.getFullDatabase().collections.find(c => c.id === id);
          if (!col) {
              try { col = await db.fetchCollectionById(id); } catch(e){}
          }
          if (col) {
              setSelectedCollection(col);
              setView('COLLECTION_DETAIL');
          }
      } else if (root === 'guild') {
          const id = segments[1];
          const guild = db.getFullDatabase().guilds.find(g => g.id === id);
          if (guild) {
              setSelectedGuild(guild);
              setView('GUILD_DETAIL');
          }
      } else {
          setView('FEED');
      }
  }, []);

  useEffect(() => {
      const handlePopState = () => {
          syncFromUrl();
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [syncFromUrl]);

  const navigateTo = (newView: ViewState, params?: { username?: string; item?: Exhibit; collection?: Collection; wishlistItem?: WishlistItem; guild?: Guild; highlightCommentId?: string }) => {
      if (params?.username) setViewedProfileUsername(params.username);
      if (params?.item) {
          setSelectedExhibit(params.item);
          setHighlightCommentId(params.highlightCommentId);
      }
      if (params?.collection) setSelectedCollection(params.collection);
      if (params?.wishlistItem) setSelectedWishlistItem(params.wishlistItem);
      if (params?.guild) setSelectedGuild(params.guild);
      
      setView(newView);

      let path = '/';
      if (newView === 'USER_PROFILE') path = `/u/${params?.username || viewedProfileUsername}`;
      else if (newView === 'USER_WISHLIST') path = `/u/${params?.username || viewedProfileUsername}/wishlist`;
      else if (newView === 'EXHIBIT') path = `/artifact/${params?.item?.id || selectedExhibit?.id}`;
      else if (newView === 'COLLECTION_DETAIL') path = `/collection/${params?.collection?.id || selectedCollection?.id}`;
      else if (newView === 'GUILD_DETAIL') path = `/guild/${params?.guild?.id || selectedGuild?.id}`;
      else if (newView === 'COMMUNITY_HUB') path = '/community';
      else if (newView === 'ACTIVITY') path = '/activity';
      else if (newView === 'SEARCH') path = '/search';
      else if (newView === 'CREATE_HUB') path = '/create';
      
      window.history.pushState({ view: newView, params }, '', path);
      window.scrollTo(0, 0);
  };

  const handleBack = () => {
      if (window.history.length > 1) {
          window.history.back();
      } else {
          navigateTo('FEED');
      }
  };

  const globalSwipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (view === 'FEED') {
          navigateTo('COMMUNITY_HUB');
      } else if (view === 'COMMUNITY_HUB') {
          navigateTo('ACTIVITY');
      } else if (view === 'ACTIVITY') {
          if (user) navigateTo('USER_PROFILE', { username: user.username });
      }
    },
    onSwipeRight: () => {
        if (view !== 'FEED') handleBack();
    },
  });

  const refreshData = useCallback(() => {
    const data = db.getFullDatabase();
    setExhibits(data.exhibits || []);
    setCollections(data.collections || []);
    setWishlist(data.wishlist || []);
    setNotifications(data.notifications || []);
    setMessages(data.messages || []);
    setGuestbook(data.guestbook || []);
    if (user) {
       const updatedUser = data.users.find(u => u.username === user.username);
       if (updatedUser) setUser(updatedUser);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => { refreshData(); });
    db.startLiveUpdates();
    return () => {
        unsubscribe();
        db.stopLiveUpdates();
    };
  }, [refreshData]);

  useEffect(() => {
    document.body.style.overflowY = 'scroll';
    const safetyTimer = setTimeout(() => { setIsInitializing(false); setShowSplash(false); }, 6000); 
    
    const init = async () => {
      try {
          const activeUser = await db.initializeDatabase();
          refreshData(); 
          if (activeUser) { 
              setUser(activeUser);
              if (activeUser.settings?.theme) setTheme(activeUser.settings.theme);
              await syncFromUrl();
          } else { 
              setView('AUTH'); 
          }
      } catch (e) { 
          setView('AUTH'); 
      } finally { 
          clearTimeout(safetyTimer); 
          setIsInitializing(false); 
          setTimeout(() => setShowSplash(false), 300); 
      }
    };
    init();
  }, []);

  const loadMore = useCallback(async () => {
      if (isLoadingMore || !hasMore || feedMode !== 'ARTIFACTS') return;
      setIsLoadingMore(true);
      const nextPage = feedPage + 1;
      const items = await db.loadFeedBatch(nextPage, 12);
      if (items.length < 12) setHasMore(false);
      setFeedPage(nextPage);
      refreshData();
      setIsLoadingMore(false);
  }, [feedPage, hasMore, isLoadingMore, feedMode, refreshData]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800) loadMore();
    };
    if (view === 'FEED') {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [view, loadMore]);

  const handleExhibitClick = async (item: Exhibit) => {
    const sessionKey = `neo_viewed_${item.id}`;
    const hasViewed = sessionStorage.getItem(sessionKey);
    let updatedItem = item;
    if (!hasViewed) {
        updatedItem = { ...item, views: (item.views || 0) + 1 };
        setExhibits(prev => prev.map(e => e.id === item.id ? updatedItem : e));
        sessionStorage.setItem(sessionKey, 'true');
        await db.updateExhibit(updatedItem);
    }
    navigateTo('EXHIBIT', { item: updatedItem });
  };

  const handleLike = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) return;
    const item = exhibits.find(e => e.id === id);
    if (item) {
        const isLiked = item.likedBy?.includes(user.username);
        const updatedItem = {
            ...item,
            likes: isLiked ? item.likes - 1 : item.likes + 1,
            likedBy: isLiked ? item.likedBy.filter(u => u !== user.username) : [...(item.likedBy || []), user.username]
        };
        setExhibits(prev => prev.map(ex => ex.id === id ? updatedItem : ex));
        if (selectedExhibit?.id === id) setSelectedExhibit(updatedItem);
        await db.updateExhibit(updatedItem); 
    }
  };

  if (isInitializing || showSplash) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <MatrixRain theme="dark" />
        <RetroLoader size="lg" text="INITIALIZING SYSTEM" />
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
          <MatrixLogin theme="dark" onLogin={(u, remember) => {
             setUser(u);
             if (u.settings?.theme) setTheme(u.settings.theme);
             if (!remember) localStorage.removeItem('neo_active_user');
             syncFromUrl();
          }} />
        </div>
      </div>
    );
  }

  const getThemeClasses = () => {
      switch(theme) {
          case 'xp': return 'bg-[#ECE9D8] text-black font-sans';
          case 'winamp': return 'bg-[#191919] font-winamp text-gray-300';
          case 'light': return 'bg-light-bg text-gray-900';
          default: return 'bg-dark-bg text-gray-100';
      }
  };

  const getDesktopNavClasses = () => {
      switch(theme) {
          case 'xp': return 'bg-gradient-to-b from-[#245DDA] to-[#245DDA] border-b-2 border-[#003C74] text-white';
          case 'winamp': return 'bg-[#292929] border-b border-[#505050] text-[#00ff00] font-winamp';
          case 'light': return 'bg-white/90 backdrop-blur-md border-b border-gray-200 text-gray-900';
          default: return 'bg-black/80 backdrop-blur-md border-b border-white/10 text-white';
      }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 pb-safe ${getThemeClasses()}`}>
        <SEO title="NeoArchive" />
        <MatrixRain theme={theme === 'dark' ? 'dark' : 'light'} />
        {theme === 'dark' && <CRTOverlay />}
        {theme !== 'xp' && theme !== 'winamp' && <PixelSnow theme={theme === 'dark' ? 'dark' : 'light'} />}
        
        {/* --- DESKTOP TOP NAVIGATION --- */}
        {user && (
            <nav className={`hidden md:flex fixed top-0 left-0 w-full z-50 px-6 h-16 items-center justify-between ${getDesktopNavClasses()}`}>
                {/* Logo Area */}
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('FEED')}>
                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${theme === 'winamp' ? 'border border-[#505050] bg-black text-[#00ff00]' : theme === 'xp' ? 'bg-[url(https://upload.wikimedia.org/wikipedia/commons/e/e2/Windows_logo_and_wordmark_-_2001-2006.svg)] bg-contain bg-no-repeat bg-center w-8' : 'bg-green-500 text-black font-pixel'}`}>
                        {theme !== 'xp' && 'NA'}
                    </div>
                    <span className={`font-bold tracking-widest ${theme === 'winamp' ? 'text-lg font-winamp' : theme === 'xp' ? 'font-sans italic text-lg drop-shadow' : 'font-pixel text-lg'}`}>NeoArchive</span>
                </div>

                {/* Desktop Menu Links */}
                <div className="flex items-center gap-6">
                    <button onClick={() => navigateTo('FEED')} className={`flex items-center gap-2 hover:opacity-100 transition-opacity ${view === 'FEED' ? 'opacity-100 font-bold' : 'opacity-60'}`}>
                        <LayoutGrid size={18}/> {theme === 'winamp' ? 'LIBRARY' : 'Лента'}
                    </button>
                    <button onClick={() => navigateTo('COMMUNITY_HUB')} className={`flex items-center gap-2 hover:opacity-100 transition-opacity ${view === 'COMMUNITY_HUB' ? 'opacity-100 font-bold' : 'opacity-60'}`}>
                        <Globe size={18}/> {theme === 'winamp' ? 'NETWORK' : 'Комьюнити'}
                    </button>
                    <button onClick={() => navigateTo('CREATE_HUB')} className={`flex items-center gap-2 hover:opacity-100 transition-opacity ${view === 'CREATE_HUB' ? 'opacity-100 font-bold' : 'opacity-60'}`}>
                        <PlusCircle size={18}/> {theme === 'winamp' ? 'UPLOAD' : 'Создать'}
                    </button>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigateTo('SEARCH')} className="opacity-70 hover:opacity-100"><Search size={20}/></button>
                    <button onClick={() => navigateTo('ACTIVITY')} className="relative opacity-70 hover:opacity-100">
                        <Bell size={20}/>
                        {notifications.some(n => n.recipient === user.username && !n.isRead) && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                    </button>
                    <div className="w-[1px] h-6 bg-current opacity-20"></div>
                    <div onClick={() => navigateTo('USER_PROFILE', { username: user.username })} className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                        <span className={`text-sm font-bold ${theme === 'winamp' ? 'font-winamp' : ''}`}>@{user.username}</span>
                        <img src={user.avatarUrl} className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                    </div>
                </div>
            </nav>
        )}

        {/* Adjust padding for desktop top nav */}
        <div className="md:pt-16">
            
            {view === 'FEED' && user && (
                <FeedView 
                    theme={theme}
                    user={user}
                    stories={stories}
                    exhibits={exhibits}
                    wishlist={wishlist}
                    
                    feedMode={feedMode}
                    setFeedMode={setFeedMode}
                    feedViewMode={feedViewMode}
                    setFeedViewMode={setFeedViewMode}
                    feedType={feedType}
                    setFeedType={setFeedType}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}

                    onNavigate={(v, p) => navigateTo(v as ViewState, p)}
                    onExhibitClick={handleExhibitClick}
                    onLike={handleLike}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onWishlistClick={(w) => { setSelectedWishlistItem(w); setView('WISHLIST_DETAIL'); }}
                />
            )}

            {view === 'ACTIVITY' && user && (
                <div className="p-4 pb-24" {...globalSwipeHandlers}>
                    <ActivityView 
                        notifications={notifications}
                        messages={messages}
                        currentUser={user}
                        theme={theme}
                        onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                        onExhibitClick={(id, commentId) => {
                            const item = exhibits.find(e => e.id === id);
                            if (item) navigateTo('EXHIBIT', { item, highlightCommentId: commentId });
                        }}
                        onChatClick={(u) => navigateTo('DIRECT_CHAT', { username: u })}
                    />
                </div>
            )}
            
            {view === 'EXHIBIT' && selectedExhibit && (
                <ExhibitDetailPage 
                    exhibit={selectedExhibit} 
                    theme={theme}
                    onBack={handleBack}
                    onShare={() => {}}
                    onFavorite={() => {}}
                    onLike={(id) => handleLike(id)}
                    isFavorited={false}
                    isLiked={selectedExhibit.likedBy?.includes(user?.username || '') || false}
                    onPostComment={async (id, text, parentId) => {
                        if (!user) return;
                        const comment: Comment = {
                            id: crypto.randomUUID(),
                            parentId,
                            author: user.username,
                            text,
                            timestamp: new Date().toLocaleString(),
                            likes: 0,
                            likedBy: []
                        };
                        const updatedExhibit = { ...selectedExhibit, comments: [...(selectedExhibit.comments || []), comment] };
                        setSelectedExhibit(updatedExhibit);
                        await db.updateExhibit(updatedExhibit);
                    }}
                    onCommentLike={async (commentId) => {
                        if (!user) return;
                        const updatedComments = selectedExhibit.comments.map(c => {
                            if (c.id === commentId) {
                                const isLiked = c.likedBy?.includes(user.username);
                                return {
                                    ...c,
                                    likes: isLiked ? c.likes - 1 : c.likes + 1,
                                    likedBy: isLiked ? c.likedBy.filter(u => u !== user.username) : [...(c.likedBy || []), user.username]
                                };
                            }
                            return c;
                        });
                        const updatedExhibit = { ...selectedExhibit, comments: updatedComments };
                        setSelectedExhibit(updatedExhibit);
                        await db.updateExhibit(updatedExhibit);
                    }}
                    onDeleteComment={async (exId, cId) => {
                        const updatedComments = selectedExhibit.comments.filter(c => c.id !== cId);
                        const updatedExhibit = { ...selectedExhibit, comments: updatedComments };
                        setSelectedExhibit(updatedExhibit);
                        await db.updateExhibit(updatedExhibit);
                    }}
                    onAuthorClick={(author) => navigateTo('USER_PROFILE', { username: author })}
                    onFollow={(u) => { if(user) db.toggleFollow(user.username, u); }}
                    onMessage={(u) => { navigateTo('DIRECT_CHAT', { username: u }); }}
                    onDelete={async (id) => { await db.deleteExhibit(id); handleBack(); }}
                    onEdit={(item) => navigateTo('EDIT_ARTIFACT', { item })}
                    onAddToCollection={() => setIsAddingToCollection(selectedExhibit.id)}
                    onExhibitClick={handleExhibitClick}
                    isFollowing={user?.following?.includes(selectedExhibit.owner) || false}
                    currentUser={user?.username || ''}
                    currentUserProfile={user}
                    isAdmin={user?.isAdmin || false}
                    users={db.getFullDatabase().users}
                    allExhibits={exhibits}
                    highlightCommentId={highlightCommentId}
                />
            )}

            {/* Other views */}
            {view === 'COLLECTION_DETAIL' && selectedCollection && (
                <div className="max-w-4xl mx-auto p-4 pb-24">
                    <CollectionDetailPage 
                        collection={selectedCollection}
                        artifacts={exhibits.filter(e => selectedCollection.exhibitIds.includes(e.id))}
                        theme={theme}
                        onBack={handleBack}
                        onExhibitClick={handleExhibitClick}
                        onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                        currentUser={user?.username || ''}
                        onDelete={async (id) => { await db.deleteCollection(id); handleBack(); }}
                        onLike={async (id) => { /* Collection like logic */ }}
                    />
                </div>
            )}

            {view === 'GUILD_DETAIL' && selectedGuild && user && (
                <GuildDetailView
                    guild={selectedGuild}
                    currentUser={user}
                    theme={theme}
                    onBack={handleBack}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                />
            )}

            {view === 'WISHLIST_DETAIL' && selectedWishlistItem && user && (
                <WishlistDetailView 
                    item={selectedWishlistItem}
                    theme={theme}
                    onBack={handleBack}
                    currentUser={user.username}
                    onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                    onDelete={async (id) => { await db.deleteWishlistItem(id); handleBack(); }}
                />
            )}

            {view === 'USER_WISHLIST' && (
                <UserWishlistView 
                    ownerUsername={viewedProfileUsername}
                    currentUser={user}
                    wishlistItems={wishlist.filter(w => w.owner === viewedProfileUsername)}
                    theme={theme}
                    onBack={handleBack}
                    onItemClick={(item) => { setSelectedWishlistItem(item); setView('WISHLIST_DETAIL'); }}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                />
            )}

            {view === 'SOCIAL_LIST' && (
                <SocialListView 
                    type={socialListType}
                    username={viewedProfileUsername}
                    currentUserUsername={user?.username}
                    theme={theme}
                    onBack={handleBack}
                    onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                />
            )}

            {view === 'SEARCH' && (
                <div className="p-4 pb-24">
                    <SearchView 
                        theme={theme}
                        exhibits={exhibits}
                        collections={collections}
                        users={db.getFullDatabase().users}
                        onBack={handleBack}
                        onExhibitClick={handleExhibitClick}
                        onCollectionClick={(c) => { setSelectedCollection(c); setView('COLLECTION_DETAIL'); }}
                        onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                        onLike={handleLike}
                        currentUser={user}
                    />
                </div>
            )}

            {view === 'COMMUNITY_HUB' && (
                <div className="p-4 pb-24" {...globalSwipeHandlers}>
                    <CommunityHub 
                        theme={theme} 
                        users={db.getFullDatabase().users} 
                        exhibits={exhibits}
                        onExhibitClick={handleExhibitClick}
                        onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                        onBack={() => navigateTo('FEED')}
                        onGuildClick={(g) => { setSelectedGuild(g); navigateTo('GUILD_DETAIL', { guild: g }); }}
                        currentUser={user}
                    />
                </div>
            )}

            {view === 'DIRECT_CHAT' && user && (
                <DirectChat 
                    theme={theme}
                    currentUser={user}
                    partnerUsername={viewedProfileUsername}
                    messages={messages.filter(m => 
                        (m.sender === user.username && m.receiver === viewedProfileUsername) || 
                        (m.sender === viewedProfileUsername && m.receiver === user.username)
                    )}
                    onBack={handleBack}
                    onSendMessage={async (text) => {
                        const msg = { id: crypto.randomUUID(), sender: user.username, receiver: viewedProfileUsername, text, timestamp: new Date().toLocaleString(), isRead: false };
                        await db.saveMessage(msg);
                    }}
                />
            )}

            {view === 'CREATE_HUB' && (
                <div className="p-6 pb-24 animate-in slide-in-from-bottom-10">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={handleBack} className="flex items-center gap-2 opacity-50 hover:opacity-100"><ArrowLeft size={16}/> НАЗАД</button>
                        <h2 className="font-pixel text-lg">СОЗДАТЬ</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <button onClick={() => setView('CREATE_ARTIFACT')} className="p-6 border border-green-500/30 rounded-2xl flex items-center gap-4 hover:bg-green-500/10 transition-all">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500"><Plus size={24}/></div>
                            <div className="text-left">
                                <div className="font-pixel text-sm font-bold">НОВЫЙ АРТЕФАКТ</div>
                                <div className="text-xs opacity-50">Добавить предмет в коллекцию</div>
                            </div>
                        </button>
                        <button onClick={() => setView('CREATE_COLLECTION')} className="p-6 border border-blue-500/30 rounded-2xl flex items-center gap-4 hover:bg-blue-500/10 transition-all">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500"><FolderPlus size={24}/></div>
                            <div className="text-left">
                                <div className="font-pixel text-sm font-bold">НОВАЯ КОЛЛЕКЦИЯ</div>
                                <div className="text-xs opacity-50">Объединить предметы в альбом</div>
                            </div>
                        </button>
                        <button onClick={() => setView('CREATE_WISHLIST')} className="p-6 border border-purple-500/30 rounded-2xl flex items-center gap-4 hover:bg-purple-500/10 transition-all">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-500"><Search size={24}/></div>
                            <div className="text-left">
                                <div className="font-pixel text-sm font-bold">В ПОИСКЕ (WISHLIST)</div>
                                <div className="text-xs opacity-50">Объявить розыск предмета</div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {view === 'CREATE_ARTIFACT' && (
                <div className="p-4 pb-24">
                    <CreateArtifactView 
                        theme={theme} 
                        onBack={handleBack} 
                        onSave={async (item) => { 
                            const newItem = { ...item, id: crypto.randomUUID(), owner: user!.username, timestamp: new Date().toLocaleString(), likes: 0, views: 0 }; 
                            await db.saveExhibit(newItem); 
                            handleBack(); 
                        }}
                        userArtifacts={exhibits.filter(e => e.owner === user?.username)}
                    />
                </div>
            )}

            {view === 'EDIT_ARTIFACT' && selectedExhibit && (
                <div className="p-4 pb-24">
                    <CreateArtifactView 
                        theme={theme} 
                        initialData={selectedExhibit}
                        onBack={handleBack} 
                        onSave={async (item) => { 
                            await db.updateExhibit(item); 
                            handleBack(); 
                        }}
                        userArtifacts={exhibits.filter(e => e.owner === user?.username)}
                    />
                </div>
            )}

            {view === 'CREATE_COLLECTION' && (
                <div className="p-4 pb-24">
                    <CreateCollectionView 
                        theme={theme} 
                        userArtifacts={exhibits.filter(e => e.owner === user!.username && !e.isDraft)}
                        onBack={handleBack} 
                        onSave={async (col) => { 
                            const newCol = { ...col, id: crypto.randomUUID(), owner: user!.username, timestamp: new Date().toLocaleString(), likes: 0 } as Collection;
                            await db.saveCollection(newCol); 
                            handleBack(); 
                        }}
                    />
                </div>
            )}

            {view === 'CREATE_WISHLIST' && (
                <div className="p-4 pb-24">
                    <CreateWishlistItemView
                        theme={theme}
                        onBack={handleBack}
                        onSave={async (item) => {
                            const newItem = { ...item, owner: user!.username };
                            await db.saveWishlistItem(newItem);
                            handleBack();
                        }}
                    />
                </div>
            )}

            {view === 'USER_PROFILE' && user && (
                <div className="pb-24">
                    <UserProfileView 
                        user={user}
                        viewedProfileUsername={viewedProfileUsername || user.username}
                        exhibits={exhibits}
                        collections={collections}
                        guestbook={guestbook}
                        theme={theme}
                        onBack={handleBack}
                        onLogout={db.logoutUser}
                        onFollow={(u) => db.toggleFollow(user.username, u)}
                        onChat={(u) => navigateTo('DIRECT_CHAT', { username: u })}
                        onExhibitClick={handleExhibitClick}
                        onLike={handleLike}
                        onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                        onCollectionClick={(c) => { setSelectedCollection(c); setView('COLLECTION_DETAIL'); }}
                        onShareCollection={() => {}}
                        onViewHallOfFame={() => setView('HALL_OF_FAME')}
                        onGuestbookPost={async (text) => {
                            const entry = { id: crypto.randomUUID(), author: user.username, targetUser: viewedProfileUsername, text, timestamp: new Date().toLocaleString(), isRead: false };
                            await db.saveGuestbookEntry(entry);
                            refreshData();
                        }}
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
                        onSaveProfile={async () => {
                            const updatedUser = { ...user, tagline: editTagline, bio: editBio, status: editStatus, telegram: editTelegram };
                            if (editPassword) updatedUser.password = editPassword;
                            await db.updateUserProfile(updatedUser);
                            setIsEditingProfile(false);
                        }}
                        onProfileImageUpload={async (e) => {
                            if (e.target.files?.[0]) {
                                const b64 = await db.fileToBase64(e.target.files[0]);
                                const updated = { ...user, avatarUrl: b64 };
                                await db.updateUserProfile(updated);
                                setUser(updated);
                            }
                        }}
                        onProfileCoverUpload={async (e) => {
                            if (e.target.files?.[0]) {
                                const b64 = await db.fileToBase64(e.target.files[0]);
                                const updated = { ...user, coverUrl: b64 };
                                await db.updateUserProfile(updated);
                                setUser(updated);
                            }
                        }}
                        guestbookInput={guestbookInput}
                        setGuestbookInput={setGuestbookInput}
                        guestbookInputRef={guestbookInputRef}
                        profileTab={profileTab}
                        setProfileTab={setProfileTab}
                        onOpenSocialList={(u, type) => {
                            setSocialListType(type);
                            navigateTo('SOCIAL_LIST', { username: u });
                        }}
                        onThemeChange={(t) => setTheme(t)}
                        onWishlistClick={(w) => { setSelectedWishlistItem(w); setView('WISHLIST_DETAIL'); }}
                    />
                </div>
            )}

            {view === 'HALL_OF_FAME' && user && (
                <div className="p-4 pb-24">
                    <HallOfFame 
                        theme={theme} 
                        achievements={user.achievements} 
                        onBack={handleBack} 
                    />
                </div>
            )}

            {/* BOTTOM NAVIGATION - Mobile Only */}
            {user && (
                <div className={`md:hidden fixed bottom-0 left-0 w-full z-40 border-t safe-area-pb ${theme === 'winamp' ? 'bg-[#292929] border-[#505050]' : theme === 'dark' ? 'bg-black/90 border-white/10 backdrop-blur-md' : 'bg-white/90 border-black/10 backdrop-blur-md'}`}>
                    {theme === 'winamp' ? (
                        <div className="flex justify-around items-center p-2">
                            {/* Prev / Feed */}
                            <button onClick={() => navigateTo('FEED')} className={`w-10 h-8 flex items-center justify-center border-t border-l border-[#505050] border-b border-r border-black active:border-t-black active:border-l-black active:border-b-[#505050] active:border-r-[#505050] bg-[#191919] ${view === 'FEED' ? 'text-wa-green' : 'text-gray-500'}`}>
                                <SkipBack size={16} fill="currentColor"/>
                            </button>
                            
                            {/* Play / Community */}
                            <button onClick={() => navigateTo('COMMUNITY_HUB')} className={`w-10 h-8 flex items-center justify-center border-t border-l border-[#505050] border-b border-r border-black active:border-t-black active:border-l-black active:border-b-[#505050] active:border-r-[#505050] bg-[#191919] ${view === 'COMMUNITY_HUB' ? 'text-wa-green' : 'text-gray-500'}`}>
                                <Play size={16} fill="currentColor"/>
                            </button>

                            {/* Create (Thunder) */}
                            <button onClick={() => navigateTo('CREATE_HUB')} className={`w-10 h-8 flex items-center justify-center border-t border-l border-[#505050] border-b border-r border-black active:border-t-black active:border-l-black active:border-b-[#505050] active:border-r-[#505050] bg-[#191919] ${view.includes('CREATE') ? 'text-wa-gold' : 'text-gray-500'}`}>
                                <span className="font-winamp text-xl">⚡</span>
                            </button>

                            {/* Pause / Activity */}
                            <button onClick={() => navigateTo('ACTIVITY')} className={`w-10 h-8 flex items-center justify-center border-t border-l border-[#505050] border-b border-r border-black active:border-t-black active:border-l-black active:border-b-[#505050] active:border-r-[#505050] bg-[#191919] relative ${view === 'ACTIVITY' ? 'text-wa-green' : 'text-gray-500'}`}>
                                <Pause size={16} fill="currentColor"/>
                                {notifications.some(n => n.recipient === user.username && !n.isRead) && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />}
                            </button>

                            {/* Eject / Profile */}
                            <button onClick={() => navigateTo('USER_PROFILE', { username: user.username })} className={`w-10 h-8 flex items-center justify-center border-t border-l border-[#505050] border-b border-r border-black active:border-t-black active:border-l-black active:border-b-[#505050] active:border-r-[#505050] bg-[#191919] ${view === 'USER_PROFILE' && viewedProfileUsername === user.username ? 'text-wa-green' : 'text-gray-500'}`}>
                                <User size={16} fill="currentColor" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-around items-center p-3">
                            <button onClick={() => navigateTo('FEED')} className={`flex flex-col items-center gap-1 ${view === 'FEED' ? 'text-green-500' : 'opacity-50'}`}>
                                <LayoutGrid size={20} />
                            </button>
                            <button onClick={() => navigateTo('COMMUNITY_HUB')} className={`flex flex-col items-center gap-1 ${view === 'COMMUNITY_HUB' ? 'text-green-500' : 'opacity-50'}`}>
                                <Globe size={20} />
                            </button>
                            <button onClick={() => navigateTo('CREATE_HUB')} className="flex flex-col items-center justify-center -mt-8">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 bg-green-500 text-black`}>
                                    <Plus size={28} />
                                </div>
                            </button>
                            <button onClick={() => navigateTo('ACTIVITY')} className={`flex flex-col items-center gap-1 relative ${view === 'ACTIVITY' ? 'text-green-500' : 'opacity-50'}`}>
                                <Bell size={20} />
                                {notifications.some(n => n.recipient === user.username && !n.isRead) && <div className="absolute top-0 right-1 w-2 h-2 bg-red-500 rounded-full" />}
                            </button>
                            <button onClick={() => navigateTo('USER_PROFILE', { username: user.username })} className={`flex flex-col items-center gap-1 ${view === 'USER_PROFILE' && viewedProfileUsername === user.username ? 'text-green-500' : 'opacity-50'}`}>
                                <div className={`w-6 h-6 rounded-full overflow-hidden border ${view === 'USER_PROFILE' && viewedProfileUsername === user.username ? 'border-green-500' : 'border-transparent'}`}>
                                    <img src={user.avatarUrl} className="w-full h-full object-cover" />
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modals for Add to Collection */}
            {isAddingToCollection && user && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
                    <div className={`w-full max-w-sm rounded-xl p-6 ${theme === 'winamp' ? 'bg-[#292929] border border-[#505050] text-gray-300' : 'bg-dark-surface border border-white/10 text-white'}`}>
                        <h3 className="font-pixel text-sm mb-4">ДОБАВИТЬ В КОЛЛЕКЦИЮ</h3>
                        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                            {collections.filter(c => c.owner === user.username).map(col => (
                                <button 
                                    key={col.id}
                                    onClick={async () => {
                                        if(col.exhibitIds.includes(isAddingToCollection)) return;
                                        const updated = { ...col, exhibitIds: [...col.exhibitIds, isAddingToCollection] };
                                        await db.updateCollection(updated);
                                        setIsAddingToCollection(null);
                                        alert('Добавлено!');
                                    }}
                                    className="w-full p-3 text-left border border-white/10 rounded hover:bg-white/5 flex items-center gap-2"
                                >
                                    <Folder size={16}/> {col.title}
                                </button>
                            ))}
                            {collections.filter(c => c.owner === user.username).length === 0 && <div className="opacity-50 text-xs">Нет коллекций</div>}
                        </div>
                        <button onClick={() => setIsAddingToCollection(null)} className="w-full py-3 bg-white/10 rounded font-bold text-xs">ОТМЕНА</button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}