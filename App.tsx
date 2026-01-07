
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Home, Search, PlusSquare, Bell, User, 
  Settings, LogOut, Package, Archive
} from 'lucide-react';
import * as db from './services/storageService';
import { UserProfile, Exhibit, Collection, ViewState, Notification, Message, WishlistItem, GuestbookEntry, Guild } from './types';

// Components
import MatrixRain from './components/MatrixRain';
import PixelSnow from './components/PixelSnow';
import CRTOverlay from './components/CRTOverlay';
import MatrixLogin from './components/MatrixLogin';
import FeedView from './components/FeedView';
import UserProfileView from './components/UserProfileView';
import ExhibitDetailPage from './components/ExhibitDetailPage';
import CollectionDetailPage from './components/CollectionDetailPage';
import CreateArtifactView from './components/CreateArtifactView';
import CreateCollectionView from './components/CreateCollectionView';
import CreateWishlistItemView from './components/CreateWishlistItemView';
import WishlistDetailView from './components/WishlistDetailView';
import ActivityView from './components/ActivityView';
import SearchView from './components/SearchView';
import HallOfFame from './components/HallOfFame';
import CommunityHub from './components/CommunityHub';
import GuildDetailView from './components/GuildDetailView';
import SocialListView from './components/SocialListView';
import DirectChat from './components/DirectChat';
import MyCollection from './components/MyCollection';
import StorageMonitor from './components/StorageMonitor';
import ToastContainer from './components/ToastContainer';
import UserWishlistView from './components/UserWishlistView';

const App: React.FC = () => {
  // --- STATE ---
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>('AUTH');
  const [viewParams, setViewParams] = useState<any>({});
  
  // Data State
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  
  // UI State
  const [theme, setTheme] = useState<'dark' | 'light' | 'xp' | 'winamp'>('dark');
  const [loading, setLoading] = useState(true);

  // Profile Edit State (Lifted)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editStatus, setEditStatus] = useState<any>('ONLINE');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [guestbookInput, setGuestbookInput] = useState('');
  const [profileTab, setProfileTab] = useState<'ARTIFACTS' | 'COLLECTIONS'>('ARTIFACTS');

  // Feed State (Lifted)
  const [feedMode, setFeedMode] = useState<'ARTIFACTS' | 'WISHLIST'>('ARTIFACTS');
  const [feedViewMode, setFeedViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [feedType, setFeedType] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');
  const [selectedCategory, setSelectedCategory] = useState('ВСЕ');

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      const u = await db.initializeDatabase();
      if (u) {
        setUser(u);
        setTheme(u.settings?.theme || 'dark');
        setView('FEED');
      }
      refreshData();
      setLoading(false);
    };
    init();

    const unsubscribe = db.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  const refreshData = () => {
    const dbData = db.getFullDatabase();
    setExhibits([...dbData.exhibits]);
    setCollections([...dbData.collections]);
    setUsers([...dbData.users]);
    setNotifications([...dbData.notifications]);
    setMessages([...dbData.messages]);
    setWishlist([...dbData.wishlist]);
    setGuestbook([...dbData.guestbook]);
  };

  // --- ACTIONS ---
  const navigateTo = useCallback((newView: ViewState, params: any = {}) => {
    setView(newView);
    setViewParams(params);
    window.scrollTo(0, 0);
  }, []);

  const handleLogout = async () => {
    await db.logoutUser();
    setUser(null);
    setView('AUTH');
  };

  const handleLogin = (u: UserProfile, remember: boolean) => {
    setUser(u);
    setTheme(u.settings?.theme || 'dark');
    setView('FEED');
  };

  const handleLike = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    
    const ex = exhibits.find(x => x.id === id);
    if (ex) {
      const isLiked = ex.likedBy.includes(user.username);
      const updated = {
        ...ex,
        likes: isLiked ? ex.likes - 1 : ex.likes + 1,
        likedBy: isLiked ? ex.likedBy.filter(u => u !== user.username) : [...ex.likedBy, user.username]
      };
      await db.updateExhibit(updated);
      if (!isLiked && ex.owner !== user.username) {
        await db.createNotification(ex.owner, 'LIKE', user.username, ex.id, ex.title);
      }
    } else {
        const col = collections.find(c => c.id === id);
        if (col) {
            const isLiked = col.likedBy?.includes(user.username);
            const updated = {
                ...col,
                likes: (col.likes || 0) + (isLiked ? -1 : 1),
                likedBy: isLiked ? (col.likedBy || []).filter(u => u !== user.username) : [...(col.likedBy || []), user.username]
            };
            await db.updateCollection(updated);
             if (!isLiked && col.owner !== user.username) {
                await db.createNotification(col.owner, 'LIKE', user.username, col.id, col.title);
            }
        }
    }
  };

  // Computed Data
  const stories = useMemo(() => {
    if (!users || !exhibits) return [];
    return users
      .filter(u => u.username !== user?.username)
      .map(u => {
         const latest = exhibits.find(e => e.owner === u.username && !e.isDraft);
         return { username: u.username, avatar: u.avatarUrl || '', latestItem: latest };
      })
      .filter(s => !!s.latestItem)
      .slice(0, 10);
  }, [users, exhibits, user]);

  const hasUnread = useMemo(() => {
    if(!user) return false;
    return notifications.some(n => n.recipient === user.username && !n.isRead) || 
           messages.some(m => m.receiver === user.username && !m.isRead);
  }, [notifications, messages, user]);

  // --- RENDER VIEW CONTENT ---
  const renderContent = () => {
      if (!user && view !== 'AUTH') {
          // If lost session/user but trying to access authenticated view
          if(!loading) setView('AUTH');
          return null;
      }

      if (!user) return <MatrixLogin theme={theme === 'dark' || theme === 'winamp' ? 'dark' : 'light'} onLogin={handleLogin} />;

      switch (view) {
          case 'FEED':
              return (
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
                      onNavigate={navigateTo}
                      onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                      onLike={handleLike}
                      onUserClick={(username) => navigateTo('USER_PROFILE', { username })}
                      onWishlistClick={(item) => navigateTo('WISHLIST_DETAIL', { item })}
                  />
              );
          
          case 'SEARCH':
              return (
                  <SearchView 
                      theme={theme}
                      exhibits={exhibits}
                      collections={collections}
                      users={users}
                      currentUser={user}
                      onBack={() => navigateTo('FEED')}
                      onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                      onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })}
                      onUserClick={(username) => navigateTo('USER_PROFILE', { username })}
                      onLike={handleLike}
                  />
              );
              
          case 'ACTIVITY':
              return (
                  <ActivityView 
                      notifications={notifications}
                      messages={messages}
                      currentUser={user}
                      theme={theme}
                      onAuthorClick={(username) => navigateTo('USER_PROFILE', { username })}
                      onExhibitClick={(id) => {
                          const item = exhibits.find(e => e.id === id);
                          if(item) navigateTo('EXHIBIT', { item });
                      }}
                      onChatClick={(username) => navigateTo('DIRECT_CHAT', { partnerUsername: username })}
                  />
              );

          case 'USER_PROFILE':
              return (
                  <UserProfileView 
                      user={user}
                      viewedProfileUsername={viewParams.username || user.username}
                      exhibits={exhibits}
                      collections={collections}
                      guestbook={guestbook}
                      theme={theme}
                      onBack={() => navigateTo('FEED')}
                      onLogout={handleLogout}
                      onFollow={(u) => db.toggleFollow(user.username, u)}
                      onChat={(u) => navigateTo('DIRECT_CHAT', { partnerUsername: u })}
                      onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                      onLike={handleLike}
                      onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                      onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })}
                      onShareCollection={() => {}}
                      onViewHallOfFame={() => navigateTo('HALL_OF_FAME')}
                      onGuestbookPost={async (text) => {
                          const targetUser = viewParams.username || user.username;
                          await db.saveGuestbookEntry({
                              id: crypto.randomUUID(),
                              author: user.username,
                              targetUser,
                              text,
                              timestamp: new Date().toLocaleString(),
                              isRead: false
                          });
                      }}
                      refreshData={refreshData}
                      isEditingProfile={isEditingProfile}
                      setIsEditingProfile={setIsEditingProfile}
                      editTagline={editTagline} setEditTagline={setEditTagline}
                      editBio={editBio} setEditBio={setEditBio}
                      editStatus={editStatus} setEditStatus={setEditStatus}
                      editTelegram={editTelegram} setEditTelegram={setEditTelegram}
                      editPassword={editPassword} setEditPassword={setEditPassword}
                      onSaveProfile={async () => {
                          const updated = {
                              ...user,
                              tagline: editTagline || user.tagline,
                              bio: editBio || user.bio,
                              status: editStatus || user.status,
                              telegram: editTelegram || user.telegram,
                              password: editPassword || user.password
                          };
                          await db.updateUserProfile(updated);
                          setUser(updated);
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
                      guestbookInputRef={React.createRef()}
                      profileTab={profileTab}
                      setProfileTab={setProfileTab}
                      onOpenSocialList={(u, t) => navigateTo('SOCIAL_LIST', { username: u, type: t })}
                      onThemeChange={setTheme}
                      onWishlistClick={(item) => navigateTo('WISHLIST_DETAIL', { item })}
                  />
              );
              
          case 'MY_COLLECTION':
              return (
                  <MyCollection 
                      theme={theme}
                      user={user}
                      exhibits={exhibits.filter(e => e.owner === user.username)}
                      allExhibits={exhibits}
                      collections={collections.filter(c => c.owner === user.username)}
                      wishlist={wishlist}
                      onBack={() => navigateTo('FEED')}
                      onExhibitClick={(item) => {
                          if (item.isDraft) navigateTo('CREATE_ARTIFACT', { initialData: item });
                          else navigateTo('EXHIBIT', { item });
                      }}
                      onCollectionClick={(c) => navigateTo('COLLECTION_DETAIL', { collection: c })}
                      onLike={handleLike}
                  />
              );

          case 'EXHIBIT':
              return (
                  <ExhibitDetailPage 
                      exhibit={viewParams.item}
                      theme={theme}
                      onBack={() => navigateTo('FEED')}
                      onShare={() => {}}
                      onFavorite={() => {}}
                      onLike={(id) => handleLike(id)}
                      isFavorited={false}
                      isLiked={viewParams.item.likedBy?.includes(user.username)}
                      onPostComment={async (id, text, parentId) => {
                          const ex = exhibits.find(e => e.id === id);
                          if(ex) {
                              const newComment = {
                                  id: crypto.randomUUID(),
                                  parentId,
                                  author: user.username,
                                  text,
                                  timestamp: new Date().toLocaleString(),
                                  likes: 0,
                                  likedBy: []
                              };
                              const updated = { ...ex, comments: [...(ex.comments || []), newComment] };
                              await db.updateExhibit(updated);
                              if (ex.owner !== user.username) {
                                  await db.createNotification(ex.owner, 'COMMENT', user.username, ex.id, ex.title);
                              }
                          }
                      }}
                      onCommentLike={async (commentId) => {
                          // Simplified comment like logic
                          const ex = viewParams.item as Exhibit;
                          const comments = ex.comments || [];
                          const updatedComments = comments.map(c => {
                              if(c.id === commentId) {
                                  const isLiked = c.likedBy?.includes(user.username);
                                  return { ...c, likes: c.likes + (isLiked ? -1 : 1), likedBy: isLiked ? c.likedBy.filter(u=>u!==user.username) : [...(c.likedBy||[]), user.username] };
                              }
                              return c;
                          });
                          await db.updateExhibit({ ...ex, comments: updatedComments });
                      }}
                      onDeleteComment={async (exId, cId) => {
                          const ex = exhibits.find(e => e.id === exId);
                          if(ex) {
                              await db.updateExhibit({ ...ex, comments: ex.comments.filter(c => c.id !== cId) });
                          }
                      }}
                      onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                      onFollow={(u) => db.toggleFollow(user.username, u)}
                      onMessage={(u) => navigateTo('DIRECT_CHAT', { partnerUsername: u })}
                      onDelete={async (id) => {
                          if(confirm('Удалить экспонат?')) {
                              await db.deleteExhibit(id);
                              navigateTo('FEED');
                          }
                      }}
                      onEdit={(item) => navigateTo('CREATE_ARTIFACT', { initialData: item })}
                      onAddToCollection={(id) => navigateTo('MY_COLLECTION', { tab: 'COLLECTIONS' })} // Simplified
                      onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                      isFollowing={user.following.includes(viewParams.item.owner)}
                      currentUser={user.username}
                      currentUserProfile={user}
                      isAdmin={user.isAdmin || false}
                      users={users}
                      allExhibits={exhibits}
                  />
              );

          case 'CREATE_ARTIFACT':
              return (
                  <CreateArtifactView 
                      theme={theme}
                      onBack={() => navigateTo('FEED')}
                      onSave={async (data) => {
                          const newItem = {
                              ...data,
                              id: data.id || crypto.randomUUID(),
                              owner: user.username,
                              timestamp: new Date().toISOString(),
                              likes: 0,
                              likedBy: [],
                              views: 0,
                              comments: []
                          };
                          if (data.id) await db.updateExhibit(newItem);
                          else await db.saveExhibit(newItem);
                          navigateTo('FEED');
                      }}
                      initialData={viewParams.initialData}
                      userArtifacts={exhibits.filter(e => e.owner === user.username)}
                  />
              );

          case 'COLLECTION_DETAIL':
              return (
                  <CollectionDetailPage 
                      collection={viewParams.collection}
                      artifacts={exhibits.filter(e => viewParams.collection.exhibitIds?.includes(e.id))}
                      theme={theme}
                      onBack={() => navigateTo('FEED')}
                      onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                      onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                      currentUser={user.username}
                      onEdit={() => navigateTo('CREATE_COLLECTION', { initialData: viewParams.collection })}
                      onDelete={async (id) => {
                          await db.deleteCollection(id);
                          navigateTo('FEED');
                      }}
                      onLike={handleLike}
                  />
              );

          case 'CREATE_COLLECTION':
              return (
                  <CreateCollectionView 
                      theme={theme}
                      userArtifacts={exhibits.filter(e => e.owner === user.username)}
                      initialData={viewParams.initialData}
                      onBack={() => navigateTo('FEED')}
                      onSave={async (data) => {
                          const newCol = {
                              ...data,
                              id: data.id || crypto.randomUUID(),
                              owner: user.username,
                              timestamp: new Date().toISOString()
                          } as Collection;
                          if(data.id) await db.updateCollection(newCol);
                          else await db.saveCollection(newCol);
                          navigateTo('MY_COLLECTION', { tab: 'COLLECTIONS' });
                      }}
                      onDelete={async (id) => {
                           await db.deleteCollection(id);
                           navigateTo('MY_COLLECTION', { tab: 'COLLECTIONS' });
                      }}
                  />
              );

          case 'CREATE_WISHLIST':
              return (
                  <CreateWishlistItemView 
                      theme={theme}
                      onBack={() => navigateTo('FEED')}
                      onSave={async (data) => {
                          await db.saveWishlistItem({ ...data, owner: user.username });
                          navigateTo('FEED');
                      }}
                  />
              );

          case 'WISHLIST_DETAIL':
              return (
                  <WishlistDetailView 
                      item={viewParams.item}
                      theme={theme}
                      onBack={() => navigateTo('FEED')}
                      onDelete={async (id) => {
                          await db.deleteWishlistItem(id);
                          navigateTo('FEED');
                      }}
                      onAuthorClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                      currentUser={user.username}
                      userInventory={exhibits.filter(e => e.owner === user.username)}
                  />
              );

          case 'COMMUNITY_HUB':
              return (
                  <CommunityHub 
                      theme={theme}
                      users={users}
                      exhibits={exhibits}
                      onExhibitClick={(item) => navigateTo('EXHIBIT', { item })}
                      onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                      onBack={() => navigateTo('FEED')}
                      onGuildClick={(g) => navigateTo('GUILD_DETAIL', { guild: g })}
                      currentUser={user}
                  />
              );

          case 'GUILD_DETAIL':
              return (
                  <GuildDetailView 
                      guild={viewParams.guild}
                      currentUser={user}
                      theme={theme}
                      onBack={() => navigateTo('COMMUNITY_HUB', { tab: 'GUILDS' })}
                      onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                  />
              );

          case 'HALL_OF_FAME':
              return (
                  <HallOfFame 
                      theme={theme}
                      achievements={user.achievements || []}
                      onBack={() => navigateTo('USER_PROFILE', { username: user.username })}
                  />
              );

          case 'SOCIAL_LIST':
              return (
                  <SocialListView 
                      type={viewParams.type}
                      username={viewParams.username}
                      currentUserUsername={user.username}
                      theme={theme}
                      onBack={() => navigateTo('USER_PROFILE', { username: viewParams.username })}
                      onUserClick={(u) => navigateTo('USER_PROFILE', { username: u })}
                  />
              );
              
          case 'DIRECT_CHAT':
              return (
                  <DirectChat 
                      theme={theme}
                      currentUser={user}
                      partnerUsername={viewParams.partnerUsername}
                      messages={messages.filter(m => 
                          (m.sender === user.username && m.receiver === viewParams.partnerUsername) ||
                          (m.sender === viewParams.partnerUsername && m.receiver === user.username)
                      )}
                      onBack={() => navigateTo('ACTIVITY')}
                      onSendMessage={async (text) => {
                          await db.saveMessage({
                              id: crypto.randomUUID(),
                              sender: user.username,
                              receiver: viewParams.partnerUsername,
                              text,
                              timestamp: new Date().toISOString(),
                              isRead: false
                          });
                      }}
                  />
              );
              
           case 'CREATE_HUB':
              return (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-in zoom-in-95">
                      <button onClick={() => navigateTo('CREATE_ARTIFACT')} className="w-64 py-4 bg-green-500 text-black font-bold font-pixel rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2">
                          <Package size={20}/> АРТЕФАКТ
                      </button>
                      <button onClick={() => navigateTo('CREATE_COLLECTION')} className="w-64 py-4 bg-blue-500 text-white font-bold font-pixel rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2">
                          <Archive size={20}/> КОЛЛЕКЦИЯ
                      </button>
                      <button onClick={() => navigateTo('CREATE_WISHLIST')} className="w-64 py-4 bg-purple-500 text-white font-bold font-pixel rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2">
                          <Search size={20}/> ИЩУ (WISHLIST)
                      </button>
                      <button onClick={() => navigateTo('FEED')} className="mt-4 text-xs font-mono opacity-50 hover:underline">ОТМЕНА</button>
                  </div>
              );

          default:
              return <div className="p-10 text-center font-mono text-red-500">ERROR: UNKNOWN VIEW {view}</div>;
      }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-16 ${
      theme === 'dark' ? 'bg-dark-bg text-gray-100' : 
      theme === 'winamp' ? 'bg-[#1a1a1a] text-gray-300 font-winamp' : 
      theme === 'xp' ? 'bg-[#3A6EA5] font-sans' : 
      'bg-light-bg text-gray-900'
    }`}>
      {/* Background Effects */}
      <MatrixRain theme={theme === 'dark' || theme === 'winamp' ? 'dark' : 'light'} />
      {theme === 'dark' && <PixelSnow theme="dark" />}
      {theme === 'dark' && <CRTOverlay />}
      <ToastContainer />
      
      {/* Main Content Area */}
      <div className="relative z-10 min-h-screen flex flex-col">
           {renderContent()}
      </div>
      
      {/* Bottom Navigation for Authenticated Users */}
      {user && view !== 'AUTH' && view !== 'DIRECT_CHAT' && (
           <nav className={`fixed bottom-0 left-0 right-0 h-16 border-t flex justify-around items-center z-50 ${theme === 'winamp' ? 'bg-[#292929] border-[#505050]' : theme === 'dark' ? 'bg-black/90 border-white/10 backdrop-blur-md' : 'bg-white/90 border-black/10 backdrop-blur-md'}`}>
               
               <button onClick={() => navigateTo('FEED')} className={`flex flex-col items-center gap-1 p-2 ${view === 'FEED' ? 'text-green-500' : 'opacity-50'}`}>
                   <Home size={20} />
                   <span className="text-[9px] font-pixel">ЛЕНТА</span>
               </button>

               <button onClick={() => navigateTo('SEARCH')} className={`flex flex-col items-center gap-1 p-2 ${view === 'SEARCH' ? 'text-green-500' : 'opacity-50'}`}>
                   <Search size={20} />
                   <span className="text-[9px] font-pixel">ПОИСК</span>
               </button>

               <button onClick={() => navigateTo('CREATE_HUB')} className={`flex flex-col items-center justify-center w-12 h-12 rounded-full mb-6 shadow-lg transition-transform hover:scale-110 ${theme === 'winamp' ? 'bg-[#00ff00] text-black border border-[#505050]' : 'bg-green-500 text-black border-2 border-green-400'}`}>
                   <PlusSquare size={24} />
               </button>

               <button onClick={() => navigateTo('ACTIVITY')} className={`relative flex flex-col items-center gap-1 p-2 ${view === 'ACTIVITY' ? 'text-green-500' : 'opacity-50'}`}>
                   <Bell size={20} />
                   <span className="text-[9px] font-pixel">ИНФО</span>
                   {hasUnread && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"/>}
               </button>

               <button onClick={() => navigateTo('USER_PROFILE', { username: user.username })} className={`flex flex-col items-center gap-1 p-2 ${view === 'USER_PROFILE' && viewParams.username === user.username ? 'text-green-500' : 'opacity-50'}`}>
                   <User size={20} />
                   <span className="text-[9px] font-pixel">Я</span>
               </button>

           </nav>
      )}

      {/* Storage Monitor (Debug/Settings) - Hidden in normal views usually, but good for demo */}
      {user && view === 'USER_PROFILE' && viewParams.username === user.username && (
          <div className="fixed bottom-20 left-4 z-40 max-w-[200px] opacity-50 hover:opacity-100 transition-opacity">
               <StorageMonitor theme={theme} />
          </div>
      )}

    </div>
  );
};

export default App;
