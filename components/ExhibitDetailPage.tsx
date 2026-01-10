
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Heart, Share2, MessageSquare, Trash2, 
  ArrowLeft, Eye, BookmarkPlus, Send, MessageCircle, CornerDownRight, Edit2, Link2, Sparkles, Video, Pin, RefreshCw,
  Maximize2, ZoomIn, ZoomOut, Home, X
} from 'lucide-react';
import { Exhibit, Comment, UserProfile } from '../types';
import { getArtifactTier, TIER_CONFIG, TRADE_STATUS_CONFIG, getSimilarArtifacts } from '../constants';
import { getUserAvatar } from '../services/storageService';
import ExhibitCard from './ExhibitCard';
import TradeOfferModal from './TradeOfferModal';
import useSwipe from '../hooks/useSwipe';

interface ExhibitDetailPageProps {
  exhibit: Exhibit;
  theme: 'dark' | 'light' | 'xp' | 'winamp';
  onBack: () => void;
  onShare: (id: string) => void;
  onFavorite: (id: string) => void;
  onLike: (id: string) => void;
  isFavorited: boolean;
  isLiked: boolean;
  onPostComment: (id: string, text: string, parentId?: string) => void;
  onCommentLike: (commentId: string) => void;
  onDeleteComment: (exhibitId: string, commentId: string) => void;
  onAuthorClick: (author: string) => void;
  onFollow: (username: string) => void;
  onMessage: (username: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (exhibit: Exhibit) => void;
  onAddToCollection?: (id: string) => void;
  onExhibitClick: (item: Exhibit) => void;
  isFollowing: boolean;
  currentUser: string;
  currentUserProfile?: UserProfile | null;
  isAdmin: boolean;
  users: UserProfile[];
  allExhibits?: Exhibit[];
  highlightCommentId?: string; 
}

const getEmbedUrl = (url: string) => {
    if (!url) return null;
    let embedUrl = url;
    try {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes('rutube.ru')) {
            const videoId = url.split('/video/')[1]?.split('/')[0];
            if (videoId) embedUrl = `https://rutube.ru/play/embed/${videoId}`;
        }
    } catch (e) { return null; }
    return embedUrl;
};

const renderTextWithMentions = (text: string, onUserClick: (u: string) => void) => {
    if (!text) return "";
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
        if (part.startsWith('@')) {
            const username = part.slice(1);
            return <span key={i} onClick={(e) => { e.stopPropagation(); onUserClick(username); }} className="text-blue-400 cursor-pointer hover:underline font-bold">{part}</span>;
        }
        return part;
    });
};

const ExhibitDetailPage: React.FC<ExhibitDetailPageProps> = ({
  exhibit, theme, onBack, onShare, onFavorite, onLike, isFavorited, isLiked, onPostComment, onCommentLike, onDeleteComment, onAuthorClick, onFollow, onMessage, onDelete, onEdit, onAddToCollection, onExhibitClick, isFollowing, currentUser, currentUserProfile, isAdmin, users, allExhibits, highlightCommentId
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string, author: string } | null>(null);
  
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);

  const [showTradeModal, setShowTradeModal] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const isWinamp = theme === 'winamp';

  const slides = useMemo(() => {
      const media: Array<{type: 'image' | 'video', url: string}> = [];

      // Получаем оптимизированные изображения (medium для детального просмотра)
      const getOptimizedImageUrl = (imageData: any) => {
          if (!imageData) return 'https://placehold.co/600x400?text=NO+IMAGE';

          // Новый формат (объект с путями к разным размерам)
          if (typeof imageData === 'object' && imageData.medium) {
              return imageData.medium;
          }

          // Старый формат (Base64 Data URI или обычный URL)
          return imageData;
      };

      const imageUrls = Array.isArray(exhibit.imageUrls) && exhibit.imageUrls.length > 0 ? exhibit.imageUrls : ['https://placehold.co/600x400?text=NO+IMAGE'];
      media.push({ type: 'image', url: getOptimizedImageUrl(imageUrls[0]) });
      if (exhibit.videoUrl) {
          const embed = getEmbedUrl(exhibit.videoUrl);
          if (embed) media.push({ type: 'video', url: embed });
      }
      if (imageUrls.length > 1) {
          imageUrls.slice(1).forEach(imageData => media.push({ type: 'image', url: getOptimizedImageUrl(imageData) }));
      }
      return media;
  }, [exhibit.imageUrls, exhibit.videoUrl]);

  const specs = exhibit.specs || {};
  const comments = exhibit.comments || [];
  
  const tierKey = getArtifactTier(exhibit);
  const tier = TIER_CONFIG[tierKey];
  const TierIcon = tier.icon;
  const isCursed = tierKey === 'CURSED';

  const tradeStatus = exhibit.tradeStatus || 'NONE';
  const tradeConfig = TRADE_STATUS_CONFIG[tradeStatus];

  const nonEmptySpecs = Object.entries(specs).filter(([_, val]) => !!val);
  const isOwner = currentUser === exhibit.owner;

  // Swipe logic for gallery
  const gallerySwipeHandlers = useSwipe({
      onSwipeLeft: () => setCurrentSlideIndex(prev => (prev + 1) % slides.length),
      onSwipeRight: () => setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length),
  });

  useEffect(() => {
      setCurrentSlideIndex(0);
  }, [exhibit.id]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
              setIsFullscreen(false);
              setZoomLevel(1);
          } else if (e.key === 'ArrowRight') {
              setCurrentSlideIndex(prev => (prev + 1) % slides.length);
          } else if (e.key === 'ArrowLeft') {
              setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  const commentTree = useMemo(() => {
      const roots = comments.filter(c => !c.parentId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const byParent = comments.reduce((acc, c) => {
          if (c.parentId) {
              if (!acc[c.parentId]) acc[c.parentId] = [];
              acc[c.parentId].push(c);
          }
          return acc;
      }, {} as Record<string, Comment[]>);
      
      Object.keys(byParent).forEach(key => {
          byParent[key].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      });
      
      return { roots, byParent };
  }, [comments]);

  useEffect(() => {
      if (highlightCommentId) {
          setTimeout(() => {
              const el = document.getElementById(`comment-${highlightCommentId}`);
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('animate-pulse');
                  setTimeout(() => el.classList.remove('animate-pulse'), 2000);
              }
          }, 500); 
      }
  }, [highlightCommentId, comments]);

  const similarArtifacts = useMemo(() => {
      if (!allExhibits) return [];
      return getSimilarArtifacts(exhibit, allExhibits);
  }, [exhibit, allExhibits]);

  const linkedArtifacts = useMemo(() => {
      if (!exhibit.relatedIds || !allExhibits) return [];
      return allExhibits.filter(e => exhibit.relatedIds?.includes(e.id));
  }, [exhibit.relatedIds, allExhibits]);

  useEffect(() => {
      if (mentionQuery !== null) {
          const query = mentionQuery.toLowerCase();
          setFilteredUsers(users.filter(u => u.username.toLowerCase().includes(query)).slice(0, 5));
      } else {
          setFilteredUsers([]);
      }
  }, [mentionQuery, users]);

  const handleShare = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`NeoArchive Artifact: ${exhibit.title}`);
    const media = encodeURIComponent(slides[currentSlideIndex].url);
    
    switch(platform) {
        case 'tg': window.open(`https://t.me/share/url?url=${url}&text=${text}`); break;
        case 'wa': window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`); break;
        case 'pin': window.open(`https://pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${text}`); break;
        case 'copy': navigator.clipboard.writeText(window.location.href); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); break;
    }
    setShowShareMenu(false);
  };

  const handleReply = (comment: Comment) => {
      setReplyTo({ id: comment.id, author: comment.author });
      setCommentText(`@${comment.author} `);
      document.getElementById('comment-input')?.focus();
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setCommentText(text);
      const lastWord = text.split(' ').pop();
      if (lastWord && lastWord.startsWith('@')) setMentionQuery(lastWord.slice(1));
      else setMentionQuery(null);
  };

  const selectMention = (username: string) => {
      const words = commentText.split(' ');
      words.pop(); 
      const newText = [...words, `@${username} `].join(' ');
      setCommentText(newText);
      setMentionQuery(null);
  };

  const renderCommentNode = (c: Comment, depth = 0) => {
      const isCommentLiked = c.likedBy && c.likedBy.includes(currentUser);
      const isAuthor = c.author === currentUser;
      const replies = commentTree.byParent[c.id] || [];

      return (
          <div key={c.id} className={`flex flex-col ${depth > 0 ? 'ml-4 md:ml-8 border-l-2 border-white/10 pl-4 mt-2' : 'mt-4'}`}>
              <div 
                id={`comment-${c.id}`} 
                className={`p-3 border transition-all ${isWinamp ? 'bg-black border-[#505050]' : 'rounded-xl bg-white/5 border-white/5 hover:border-white/10'}`}
              >
                  <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                          <img src={getUserAvatar(c.author)} className="w-5 h-5 rounded-full cursor-pointer" onClick={() => onAuthorClick(c.author)} />
                          <div className="flex items-center gap-2">
                              <div onClick={() => onAuthorClick(c.author)} className="font-bold cursor-pointer text-green-500 font-pixel text-[10px] leading-none">@{c.author}</div>
                              <div className="text-[9px] opacity-30 font-mono leading-none">{c.timestamp}</div>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => onCommentLike(c.id)} className={`flex items-center gap-1 text-[10px] transition-colors ${isCommentLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                              <Heart size={12} fill={isCommentLiked ? "currentColor" : "none"} /> {c.likes > 0 && c.likes}
                          </button>
                          <button onClick={() => handleReply(c)} className="text-gray-500 hover:text-white transition-colors" title="Ответить">
                              <CornerDownRight size={14} />
                          </button>
                          {(isAuthor || isAdmin) && (
                              <button onClick={() => onDeleteComment(exhibit.id, c.id)} className="text-gray-500 hover:text-red-500 transition-colors" title="Удалить">
                                  <Trash2 size={14} />
                              </button>
                          )}
                      </div>
                  </div>
                  <p className="font-mono text-xs opacity-80 pl-7 break-words leading-relaxed">{renderTextWithMentions(c.text, onAuthorClick)}</p>
              </div>
              {replies.map(reply => renderCommentNode(reply, depth + 1))}
          </div>
      );
  };

  const recipientProfile = users.find(u => u.username === exhibit.owner);

  return (
    <div className={`w-full min-h-full pb-20 animate-in slide-in-from-right-8 fade-in duration-500 ${isWinamp ? 'font-mono text-gray-300' : theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
      
      {showTradeModal && currentUserProfile && allExhibits && recipientProfile && (
          <TradeOfferModal
            targetItem={exhibit}
            currentUser={currentUserProfile}
            userInventory={allExhibits.filter(e => e.owner === currentUser)}
            recipient={recipientProfile}
            onClose={() => setShowTradeModal(false)}
          />
      )}

      {isFullscreen && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200">
              <div className="absolute top-4 right-4 z-50 flex gap-4">
                  <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 3))} className="p-3 bg-black/50 text-white rounded-full hover:bg-white/20"><ZoomIn size={24}/></button>
                  <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))} className="p-3 bg-black/50 text-white rounded-full hover:bg-white/20"><ZoomOut size={24}/></button>
                  <button onClick={() => { setIsFullscreen(false); setZoomLevel(1); }} className="p-3 bg-black/50 text-white rounded-full hover:bg-red-500/20 hover:text-red-500"><X size={24}/></button>
              </div>
              
              <div className="flex-1 flex items-center justify-center relative overflow-hidden" {...gallerySwipeHandlers}>
                  <button onClick={() => setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length)} className="absolute left-4 z-40 p-4 text-white/50 hover:text-white transition-colors"><ChevronLeft size={48}/></button>
                  
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                      {slides[currentSlideIndex].type === 'image' ? (
                          <img 
                            src={slides[currentSlideIndex].url} 
                            className="max-w-full max-h-full object-contain transition-transform duration-300"
                            style={{ transform: `scale(${zoomLevel})` }}
                          />
                      ) : (
                          <iframe src={slides[currentSlideIndex].url} className="w-full h-full max-w-4xl max-h-[80vh]" frameBorder="0" allowFullScreen></iframe>
                      )}
                  </div>

                  <button onClick={() => setCurrentSlideIndex(prev => (prev + 1) % slides.length)} className="absolute right-4 z-40 p-4 text-white/50 hover:text-white transition-colors"><ChevronRight size={48}/></button>
              </div>

              <div className="h-20 flex items-center justify-center gap-2 pb-4">
                  {slides.map((_, idx) => (
                      <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentSlideIndex ? 'bg-white' : 'bg-white/20'}`} />
                  ))}
              </div>
          </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        
        {/* COMPACT BREADCRUMBS & ACTIONS */}
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2 text-[10px] font-mono opacity-50 uppercase">
                <button onClick={onBack} className="hover:text-green-500 flex items-center gap-1"><ArrowLeft size={12}/> НАЗАД</button>
                <span className="opacity-30">/</span>
                <span className="hover:text-white cursor-pointer">{exhibit.category}</span>
            </div>

            <div className="flex items-center gap-3">
                {(isOwner || isAdmin) && (
                    <div className="flex gap-2">
                        {onEdit && <button onClick={() => onEdit(exhibit)} className="text-purple-400 hover:text-white transition-all"><Edit2 size={16}/></button>}
                        {onDelete && <button onClick={() => onDelete(exhibit.id)} className="text-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>}
                    </div>
                )}
                <div className="h-4 w-[1px] bg-white/10"></div>
                <div className="relative">
                    <button onClick={() => setShowShareMenu(!showShareMenu)} className={`hover:text-white transition-all ${shareCopied ? 'text-green-500' : 'text-gray-400'}`}><Share2 size={16}/></button>
                    {showShareMenu && (
                        <div className="absolute right-0 top-6 w-40 bg-dark-surface border border-white/10 rounded-xl shadow-2xl z-50 p-1 animate-in slide-in-from-top-2">
                            <button onClick={() => handleShare('tg')} className="w-full text-left p-2 hover:bg-white/5 rounded text-[10px] font-bold flex items-center gap-2"><Send size={12} className="text-blue-400"/> TELEGRAM</button>
                            <button onClick={() => handleShare('wa')} className="w-full text-left p-2 hover:bg-white/5 rounded text-[10px] font-bold flex items-center gap-2"><MessageCircle size={12} className="text-green-500"/> WHATSAPP</button>
                            <button onClick={() => handleShare('copy')} className="w-full text-left p-2 hover:bg-white/5 rounded text-[10px] font-bold flex items-center gap-2"><Share2 size={12}/> COPY LINK</button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            
            {/* LEFT COLUMN: MEDIA */}
            <div className="w-full lg:w-[45%] space-y-4 lg:sticky lg:top-20">
                <div 
                    className={`relative aspect-square w-full overflow-hidden border transition-all duration-500 group ${isWinamp ? 'bg-black border-[#505050]' : (theme === 'dark' ? 'rounded-2xl border-white/10 bg-black' : 'rounded-2xl border-black/10 bg-white')} ${isCursed ? 'shadow-[0_0_30px_red]' : ''}`}
                    {...gallerySwipeHandlers}
                >
                    {slides[currentSlideIndex].type === 'image' ? (
                        <div className="w-full h-full relative cursor-zoom-in" onClick={() => setIsFullscreen(true)}>
                            <img src={slides[currentSlideIndex].url} alt={exhibit.title} className="w-full h-full object-contain bg-black/50" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none opacity-50"/>
                        </div>
                    ) : (
                        <iframe src={slides[currentSlideIndex].url} className="w-full h-full relative z-10" frameBorder="0" allowFullScreen></iframe>
                    )}

                    {slides.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
                            {slides.map((_, idx) => (
                                <div key={idx} className={`w-1.5 h-1.5 rounded-full shadow ${idx === currentSlideIndex ? 'bg-white scale-125' : 'bg-white/30'}`} />
                            ))}
                        </div>
                    )}
                    
                    <button onClick={() => setIsFullscreen(true)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 size={16}/></button>
                </div>

                {!isOwner && (tradeStatus === 'FOR_TRADE' || tradeStatus === 'FOR_SALE' || tradeStatus === 'NONE' || !tradeStatus) && (
                    <button 
                        onClick={() => setShowTradeModal(true)}
                        className={`w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-pixel text-[10px] uppercase font-bold hover:bg-blue-500 shadow-lg`}
                    >
                        <RefreshCw size={14}/> ПРЕДЛОЖИТЬ ОБМЕН
                    </button>
                )}
            </div>

            {/* RIGHT COLUMN: INFO & SPECS */}
            <div className="flex-1 w-full">
                <div className={`p-5 md:p-6 border mb-4 ${isWinamp ? 'bg-[#191919] border-[#505050]' : (theme === 'dark' ? 'bg-dark-surface border-white/10 rounded-2xl' : 'bg-white border-black/10 shadow-xl rounded-2xl')}`}>
                    
                    {/* Header Info */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex flex-wrap gap-2">
                            <span className={`px-2 py-0.5 text-[9px] font-pixel font-bold uppercase border rounded ${isWinamp ? 'border-[#00ff00] text-[#00ff00]' : 'border-green-500/50 text-green-400 bg-green-500/10'}`}>{exhibit.category}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold font-pixel border rounded flex items-center gap-1 uppercase ${isWinamp ? 'border-[#00ff00] text-[#00ff00]' : `${tier.bgColor} ${tier.color} border-white/5`}`}><TierIcon size={10} /> {tier.name}</span>
                            {tradeStatus !== 'NONE' && (
                                <span className={`px-2 py-0.5 text-[9px] font-bold font-pixel border rounded flex items-center gap-1 uppercase ${tradeConfig.color} ${tradeConfig.bg}`}>
                                    {tradeConfig.icon && React.createElement(tradeConfig.icon, { size: 10 })} {tradeConfig.badge}
                                </span>
                            )}
                        </div>
                        
                        <h1 className={`text-xl md:text-3xl font-bold font-pixel leading-tight ${isCursed ? 'text-red-500 italic' : (isWinamp ? 'text-[#00ff00]' : 'text-white')}`}>{exhibit.title}</h1>
                        
                        {/* Compact Stats Toolbar */}
                        <div className="flex items-center gap-4 text-xs font-mono opacity-70 border-b border-white/5 pb-4">
                            <button onClick={() => onLike(exhibit.id)} className={`flex items-center gap-1.5 hover:text-green-400 transition-colors ${isLiked ? 'text-green-500' : ''}`}>
                                <Heart size={16} fill={isLiked ? "currentColor" : "none"} /> {exhibit.likes}
                            </button>
                            <div className="flex items-center gap-1.5">
                                <Eye size={16} /> {exhibit.views}
                            </div>
                            <div className="flex-1"></div>
                            {isOwner && (
                                <button onClick={() => onAddToCollection?.(exhibit.id)} className="hover:text-blue-400 transition-colors" title="Добавить в коллекцию">
                                    <BookmarkPlus size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Author Row */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onAuthorClick(exhibit.owner)}>
                            <img src={getUserAvatar(exhibit.owner)} className="w-10 h-10 rounded-full border border-white/20" />
                            <div>
                                <div className={`font-bold font-pixel text-xs transition-colors ${isWinamp ? 'text-[#00ff00]' : 'group-hover:text-green-500'}`}>@{exhibit.owner}</div>
                                <div className="text-[9px] opacity-40 font-mono uppercase">{exhibit.timestamp.split(',')[0]}</div>
                            </div>
                        </div>
                        {!isOwner && ( 
                            <button onClick={() => onFollow(exhibit.owner)} className={`px-3 py-1.5 text-[9px] font-bold font-pixel border rounded transition-all ${isFollowing ? 'border-white/10 opacity-40' : 'bg-white/10 hover:bg-white/20 border-transparent'}`}>
                                {isFollowing ? 'ПОДПИСАН' : 'ПОДПИСАТЬСЯ'}
                            </button> 
                        )}
                    </div>

                    {/* Description */}
                    <p className={`font-mono text-xs leading-relaxed whitespace-pre-wrap opacity-80 mb-6 ${isWinamp ? 'text-[#00ff00]' : ''}`}>{exhibit.description}</p>

                    {/* ULTRA COMPACT SPECS GRID */}
                    {nonEmptySpecs.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-pixel text-[9px] opacity-40 uppercase tracking-widest mb-2">ХАРАКТЕРИСТИКИ</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                                {nonEmptySpecs.map(([key, val]) => (
                                    <div key={key} className={`px-2 py-1.5 border rounded flex flex-col justify-center ${isWinamp ? 'bg-black border-[#505050]' : 'bg-black/20 border-white/5'}`}>
                                        <div className="text-[7px] uppercase opacity-40 font-pixel tracking-wider mb-0.5">{key}</div>
                                        <div className="font-bold font-mono text-[10px] break-words leading-tight">{val}</div>
                                    </div>
                                ))}
                                {exhibit.condition && (
                                    <div className={`px-2 py-1.5 border rounded flex flex-col justify-center ${isWinamp ? 'bg-black border-[#505050]' : 'bg-black/20 border-white/5'}`}>
                                        <div className="text-[7px] uppercase opacity-40 font-pixel tracking-wider mb-0.5">СОСТОЯНИЕ</div>
                                        <div className="font-bold font-mono text-[10px] text-green-400 uppercase leading-tight">{exhibit.condition}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Linked Items */}
                    {linkedArtifacts.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-white/5">
                            <h3 className="font-pixel text-[9px] opacity-40 uppercase tracking-widest mb-3 flex items-center gap-1"><Link2 size={10}/> СВЯЗАННЫЕ ПРЕДМЕТЫ</h3>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {linkedArtifacts.map(link => (
                                    <div key={link.id} onClick={() => onExhibitClick(link)} className="flex-shrink-0 w-20 group cursor-pointer">
                                        <div className="aspect-square rounded-lg overflow-hidden border border-white/10 relative bg-black/20">
                                            <img src={typeof link.imageUrls[0] === 'string' ? link.imageUrls[0] : (link.imageUrls[0]?.thumbnail || 'https://placehold.co/600x400?text=NO+IMAGE')} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        </div>
                                        <div className="mt-1 text-[8px] font-bold truncate opacity-70 group-hover:opacity-100">{link.title}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Comments Section */}
                <div className={`p-5 rounded-2xl border ${isWinamp ? 'bg-[#191919] border-[#505050]' : 'bg-dark-surface border-white/5'}`}>
                    <h3 className="font-pixel text-xs mb-4 flex items-center gap-2"><MessageSquare size={14} /> ОБСУЖДЕНИЕ ({comments.length})</h3>
                    
                    <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {comments.length === 0 ? ( <div className="text-center py-8 opacity-30 text-[10px] font-pixel uppercase tracking-widest border border-dashed border-white/10 rounded-xl">ТИШИНА В ЭФИРЕ</div> ) : ( 
                            commentTree.roots.map(rootComment => renderCommentNode(rootComment))
                        )}
                    </div>

                    <div className="flex flex-col gap-2 relative">
                        {mentionQuery !== null && filteredUsers.length > 0 && (
                            <div className="absolute bottom-full mb-2 left-0 w-64 bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                                {filteredUsers.map(u => (
                                    <button 
                                        key={u.username}
                                        onClick={() => selectMention(u.username)}
                                        className="w-full flex items-center gap-2 p-2 hover:bg-white/10 text-left transition-colors"
                                    >
                                        <img src={u.avatarUrl} className="w-6 h-6 rounded-full" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[10px]">@{u.username}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {replyTo && (
                            <div className="flex items-center justify-between text-[10px] font-mono bg-white/5 p-2 rounded-lg border border-white/5">
                                <span className="opacity-70">Ответ <span className="text-green-500 font-bold">@{replyTo.author}</span></span>
                                <button onClick={() => { setReplyTo(null); setCommentText(''); }} className="hover:text-red-500"><X size={12}/></button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input 
                                id="comment-input"
                                type="text" 
                                value={commentText} 
                                onChange={handleCommentChange} 
                                placeholder={replyTo ? "Ваш ответ..." : "Написать комментарий..."}
                                className={`flex-1 bg-black/40 border border-white/10 px-3 py-2.5 font-mono text-xs focus:outline-none focus:border-green-500 transition-colors rounded-lg`} 
                                onKeyDown={(e) => { 
                                    if(e.key === 'Enter' && commentText.trim()) { 
                                        onPostComment(exhibit.id, commentText, replyTo?.id); 
                                        setCommentText(''); 
                                        setReplyTo(null);
                                        setMentionQuery(null);
                                    } 
                                }} 
                            />
                            <button 
                                onClick={() => { 
                                    if(commentText.trim()) { 
                                        onPostComment(exhibit.id, commentText, replyTo?.id); 
                                        setCommentText(''); 
                                        setReplyTo(null);
                                        setMentionQuery(null);
                                    } 
                                }} 
                                className={`bg-green-500 text-black p-2.5 rounded-lg hover:scale-105 active:scale-95 transition-all`}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {similarArtifacts.length > 0 && (
                <div className="mt-12 mb-8">
                    <h3 className="font-pixel text-[9px] opacity-40 mb-4 flex items-center gap-2 tracking-[0.2em] uppercase"><Sparkles size={12} className="text-purple-400" /> ПОХОЖИЕ ОБЪЕКТЫ</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {similarArtifacts.map(sim => (
                            <ExhibitCard 
                                key={sim.id} 
                                item={sim} 
                                theme={theme}
                                onClick={() => onExhibitClick(sim)}
                                isLiked={sim.likedBy?.includes(currentUser)}
                                onLike={() => {}}
                                onAuthorClick={onAuthorClick}
                            />
                        ))}
                    </div>
                </div>
        )}
      </div>
    </div>
  );
}

export default ExhibitDetailPage;
