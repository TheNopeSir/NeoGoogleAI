
export interface Comment {
  id: string;
  parentId?: string; // For replies
  author: string;
  text: string;
  timestamp: string;
  likes: number;
  likedBy: string[];
}

export type TierType = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'CURSED';

export type TradeStatus = 'NONE' | 'FOR_TRADE' | 'FOR_SALE' | 'GIFT' | 'NOT_FOR_SALE';

export type WishlistPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'GRAIL';

export interface WishlistItem {
    id: string;
    title: string;
    category: string;
    owner: string;
    priority: WishlistPriority;
    notes?: string;
    referenceImageUrl?: string; // Image of what user wants
    timestamp: string;
}

export interface Exhibit {
  id: string;
  slug?: string;
  title: string;
  description: string;
  imageUrls: string[];
  videoUrl?: string; 
  category: string; 
  subcategory?: string;
  owner: string;
  timestamp: string;
  likes: number;
  likedBy: string[]; 
  views: number;
  condition?: string;
  quality: string;
  specs: Record<string, string>;
  comments: Comment[];
  isDraft?: boolean;
  tradeStatus?: TradeStatus; 
  price?: number;
  currency?: 'RUB' | 'USD' | 'ETH';
  tradeRequest?: string; // What they want in return
  relatedIds?: string[]; // IDs of connected items within user's collection
  lockedInTradeId?: string; // ID of the trade if item is locked
}

export interface Collection {
  id: string;
  slug?: string;
  title: string;
  description: string;
  owner: string;
  coverImage: string;
  exhibitIds: string[];
  timestamp: string;
  likes: number;
  likedBy: string[];
}

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'GUESTBOOK' | 'LIKE_COMMENT' | 'MENTION' | 'TRADE_OFFER' | 'TRADE_ACCEPTED' | 'TRADE_DECLINED' | 'TRADE_COMPLETED' | 'TRADE_CANCELLED' | 'TRADE_COUNTER';

export interface Notification {
  id: string;
  type: NotificationType;
  actor: string;
  recipient: string;
  targetId?: string;
  targetPreview?: string;
  contextId?: string; 
  timestamp: string;
  isRead: boolean;
}

export interface Message {
    id: string;
    sender: string;
    receiver: string;
    text: string;
    timestamp: string;
    isRead: boolean;
}

export interface GuestbookEntry {
    id: string;
    author: string;
    targetUser: string;
    text: string;
    timestamp: string;
    isRead: boolean;
}

export type UserStatus = 'ONLINE' | 'AWAY' | 'DND' | 'INVISIBLE' | 'FREE_FOR_CHAT';

export interface AchievementProgress {
  id: string;
  current: number;
  target: number;
  unlocked: boolean;
}

export interface AppSettings {
    theme?: 'dark' | 'light' | 'xp' | 'winamp';
    notificationsEnabled?: boolean;
    soundEnabled?: boolean;
    publicProfile?: boolean;
    showEmail?: boolean;
}

export interface UserProfile {
  username: string;
  email: string;
  tagline: string;
  bio?: string; // Extended biography
  status?: UserStatus;
  avatarUrl: string;
  coverUrl?: string; // Profile Banner
  joinedDate: string;
  following: string[];
  followers: string[]; 
  achievements: AchievementProgress[]; 
  preferences?: Record<string, number>;
  settings?: AppSettings;
  password?: string;
  isAdmin?: boolean;
  telegram?: string;
  guildId?: string;
  reputation?: number;
  tradeStats?: {
      total: number;
      completed: number;
      ratingSum: number;
      ratingCount: number;
  };
}

export interface Guild {
    id: string;
    name: string;
    description: string;
    leader: string;
    members: string[];
    bannerUrl?: string; // Avatar/Banner
    rules?: string; // Rules text
    inviteCode?: string; // For invite links
    isPrivate: boolean;
}

export interface Duel {
    id: string;
    challenger: string;
    opponent: string;
    challengerItem: string; // Exhibit ID
    opponentItem?: string; // Exhibit ID
    winner?: string;
    status: 'PENDING' | 'ACTIVE' | 'FINISHED';
    logs: string[];
}

export type TradeRequestStatus = 'PENDING' | 'COUNTER_OFFERED' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
export type TradeType = 'DIRECT' | 'MULTI' | 'GIFT';

export interface TradeMessage {
    author: string;
    text: string;
    timestamp: string;
}

export interface TradeRequest {
    id: string;
    sender: string;
    recipient: string;
    senderItems: string[]; // IDs of items from sender
    recipientItems: string[]; // IDs of items from recipient
    type: TradeType;
    status: TradeRequestStatus;
    messages: TradeMessage[];
    createdAt: string;
    updatedAt: string;
    ratings?: {
        sender?: number;
        recipient?: number;
    };
}

export type ViewState = 'AUTH' | 'FEED' | 'PROFILE' | 'USER_PROFILE' | 'USER_WISHLIST' | 'CREATE_HUB' | 'CREATE_ARTIFACT' | 'CREATE_WISHLIST' | 'EDIT_ARTIFACT' | 'CREATE_COLLECTION' | 'EDIT_COLLECTION' | 'EXHIBIT' | 'COLLECTIONS' | 'COLLECTION_DETAIL' | 'ADMIN' | 'SETTINGS' | 'ACTIVITY' | 'SEARCH' | 'HALL_OF_FAME' | 'DIRECT_CHAT' | 'SOCIAL_LIST' | 'WISHLIST_DETAIL' | 'COMMUNITY_HUB' | 'MY_COLLECTION' | 'GUILD_DETAIL';
