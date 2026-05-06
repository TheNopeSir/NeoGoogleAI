import React, { useState, useEffect, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

const getPublicUrl = () =>
  Capacitor.isNativePlatform()
    ? window.location.href.replace('https://localhost', 'https://neoarchive.ru')
    : window.location.href;
import {
  ChevronLeft, ChevronRight, Heart, Share2, MessageSquare, Trash2,
  ArrowLeft, Eye, BookmarkPlus, Send, MessageCircle, CornerDownRight, Edit2, Link2, Sparkles, Video, Pin, RefreshCw,
  Maximize2, ZoomIn, ZoomOut, Home, X, Info, Award, ChevronDown, ChevronUp, Pencil, SmilePlus, LayoutGrid, SlidersHorizontal
} from 'lucide-react';
import { Exhibit, Comment, UserProfile } from '../types';
import { getArtifactTier, TIER_CONFIG, TRADE_STATUS_CONFIG, getSimilarArtifacts, CATEGORY_CONDITIONS } from '../constants';
import { getUserAvatar } from '../services/storageService';
import { ExhibitCard } from './ExhibitCard';
import TradeOfferModal from './TradeOfferModal';
import useSwipe from '../hooks/useSwipe';
import { getImageUrl } from '../utils/imageUtils';
import EmojiPicker from './EmojiPicker';
import MessageReactionPicker from './MessageReactionPicker';
import ReactionBar from './ReactionBar';
import { renderTextWithMentions, validateMessageText } from '../utils/textUtils';
import { MessageReactionEmoji } from '../types';
import XI from './XI';
import SEO from './SEO';

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
  onEditComment?: (exhibitId: string, commentId: string, newText: string) => void;
  onCommentReact?: (exhibitId: string, commentId: string, emoji: MessageReactionEmoji) => void;
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


const ExhibitDetailPage: React.FC<ExhibitDetailPageProps> = ({
  exhibit, theme, onBack, onShare, onFavorite, onLike, isFavorited, isLiked, onPostComment, onCommentLike, onDeleteComment, onEditComment, onCommentReact, onAuthorClick, onFollow, onMessage, onDelete, onEdit, onAddToCollection, onExhibitClick, isFollowing, currentUser, currentUserProfile, isAdmin, users, allExhibits, highlightCommentId
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string, author: string } | null>(null);
  const [showLikesModal, setShowLikesModal] = useState(false);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);

  const [showTradeModal, setShowTradeModal] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const initialPinchDistanceRef = React.useRef<number | null>(null);
  const initialPinchZoomRef = React.useRef<number>(1);

  // Refs for drag — bypass React state in the hot path to avoid 60fps re-renders
  const imgRef = React.useRef<HTMLImageElement>(null);
  const panRef = React.useRef({ x: 0, y: 0 });
  const isDraggingRef = React.useRef(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });

  const applyTransform = React.useCallback((x: number, y: number, zoom: number, animated = false) => {
      if (!imgRef.current) return;
      imgRef.current.style.transition = animated ? 'transform 0.2s ease-out' : 'none';
      imgRef.current.style.transform = `scale(${zoom}) translate3d(${x / zoom}px, ${y / zoom}px, 0)`;
  }, []);

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Gallery enhancements
  const [galleryMode, setGalleryMode] = useState<'SLIDER' | 'GRID'>('SLIDER');

  // Comment enhancements
  const [commentSort, setCommentSort] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set());
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [commentReactionPicker, setCommentReactionPicker] = useState<{ commentId: string; position: { x: number; y: number } } | null>(null);
  const commentLongPressRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentLongPressFiredRef = React.useRef(false);

  const isWinamp = theme === 'winamp';
  const isXp = theme === 'xp';

  const slides = useMemo(() => {
      const media: Array<{type: 'image' | 'video', url: string, largeUrl?: string}> = [];

      const imageUrls = Array.isArray(exhibit.imageUrls) && exhibit.imageUrls.length > 0 ? exhibit.imageUrls : [];
      
      // Handle case where there are no images
      if (imageUrls.length === 0) {
          media.push({
            type: 'image',
            url: 'https://placehold.co/600x400?text=NO+IMAGE',
            largeUrl: 'https://placehold.co/600x400?text=NO+IMAGE'
          });
      } else {
          // Add first image
          media.push({
              type: 'image',
              url: getImageUrl(imageUrls[0], 'medium'),
              largeUrl: getImageUrl(imageUrls[0], 'large')
          });
      }

      if (exhibit.videoUrl) {
          const embed = getEmbedUrl(exhibit.videoUrl);
          if (embed) media.push({ type: 'video', url: embed, largeUrl: embed });
      }

      // Add remaining images
      if (imageUrls.length > 1) {
          imageUrls.slice(1).forEach(imageData => media.push({
              type: 'image',
              url: getImageUrl(imageData, 'medium'),
              largeUrl: getImageUrl(imageData, 'large')
          }));
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

  // Prioritize viewedBy.length if available
  const viewsDisplay = exhibit.viewedBy?.length || exhibit.views;

  // Swipe logic for gallery
  const gallerySwipeHandlers = useSwipe({
      onSwipeLeft: () => setCurrentSlideIndex(prev => (prev + 1) % slides.length),
      onSwipeRight: () => setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length),
  });
  // Stop propagation so gallery swipes don't bubble up to the page-level back-swipe handler
  const gallerySwipeStop = {
      onTouchStart: (e: React.TouchEvent) => { gallerySwipeHandlers.onTouchStart(e); e.stopPropagation(); },
      onTouchMove: (e: React.TouchEvent) => { gallerySwipeHandlers.onTouchMove(e); e.stopPropagation(); },
      onTouchEnd: (e: React.TouchEvent) => { gallerySwipeHandlers.onTouchEnd(); e.stopPropagation(); },
  };

  useEffect(() => {
      setCurrentSlideIndex(0);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
  }, [exhibit.id]);

  useEffect(() => {
      panRef.current = { x: 0, y: 0 };
      setPanPosition({ x: 0, y: 0 });
      applyTransform(0, 0, zoomLevel, false);
  }, [currentSlideIndex, zoomLevel, applyTransform]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
              setIsFullscreen(false);
              setZoomLevel(1);
              setPanPosition({ x: 0, y: 0 });
          } else if (e.key === 'ArrowRight' && !isDragging) {
              setCurrentSlideIndex(prev => (prev + 1) % slides.length);
          } else if (e.key === 'ArrowLeft' && !isDragging) {
              setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isDragging]);

  const commentTree = useMemo(() => {
      const roots = comments.filter(c => !c.parentId).sort((a, b) => {
          if (commentSort === 'oldest') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          if (commentSort === 'popular') return b.likes - a.likes;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); // newest
      });
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
  }, [comments, commentSort]);

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
      const othersExhibits = allExhibits.filter(e => e.owner !== currentUser);
      return getSimilarArtifacts(exhibit, othersExhibits);
  }, [exhibit, allExhibits, currentUser]);

  const ownerArtifactCount = useMemo(() => {
      if (!allExhibits) return 0;
      return allExhibits.filter(e => e.owner === exhibit.owner).length;
  }, [allExhibits, exhibit.owner]);

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
    const publicUrl = getPublicUrl();
    const url = encodeURIComponent(publicUrl);
    const text = encodeURIComponent(`NeoArchive Artifact: ${exhibit.title}`);
    const media = encodeURIComponent(slides[currentSlideIndex].url);

    switch(platform) {
        case 'tg': window.open(`https://t.me/share/url?url=${url}&text=${text}`); break;
        case 'wa': window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`); break;
        case 'pin': window.open(`https://pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${text}`); break;
        case 'copy': navigator.clipboard.writeText(publicUrl); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); break;
    }
    onShare(exhibit.id);
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

  const handleMouseDown = (e: React.MouseEvent) => {
      if (zoomLevel > 1) {
          e.preventDefault();
          isDraggingRef.current = true;
          setIsDragging(true);
          dragStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
      }
  };

  // No setState here — direct DOM write avoids 60fps re-renders
  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDraggingRef.current && zoomLevel > 1) {
          const x = e.clientX - dragStartRef.current.x;
          const y = e.clientY - dragStartRef.current.y;
          panRef.current = { x, y };
          applyTransform(x, y, zoomLevel);
      }
  };

  const handleMouseUp = () => {
      if (isDraggingRef.current) {
          isDraggingRef.current = false;
          setIsDragging(false);
          setPanPosition({ ...panRef.current });
          applyTransform(panRef.current.x, panRef.current.y, zoomLevel, true);
      }
  };

  const getPinchDistance = (touches: React.TouchList) =>
      Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
      );

  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          e.stopPropagation();
          initialPinchDistanceRef.current = getPinchDistance(e.touches);
          initialPinchZoomRef.current = zoomLevel;
          isDraggingRef.current = false;
          setIsDragging(false);
      } else if (zoomLevel > 1 && e.touches.length === 1) {
          e.stopPropagation();
          isDraggingRef.current = true;
          setIsDragging(true);
          dragStartRef.current = {
              x: e.touches[0].clientX - panRef.current.x,
              y: e.touches[0].clientY - panRef.current.y,
          };
      }
  };

  // No setState in the hot path — direct DOM write only
  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
          e.stopPropagation();
          const currentDist = getPinchDistance(e.touches);
          const ratio = currentDist / initialPinchDistanceRef.current;
          const newZoom = Math.max(1, Math.min(4, initialPinchZoomRef.current * ratio));
          setZoomLevel(newZoom);
          if (newZoom === 1) {
              panRef.current = { x: 0, y: 0 };
              setPanPosition({ x: 0, y: 0 });
          }
      } else if (isDraggingRef.current && zoomLevel > 1 && e.touches.length === 1) {
          e.stopPropagation();
          const x = e.touches[0].clientX - dragStartRef.current.x;
          const y = e.touches[0].clientY - dragStartRef.current.y;
          panRef.current = { x, y };
          applyTransform(x, y, zoomLevel);
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (initialPinchDistanceRef.current !== null || isDraggingRef.current) {
          e.stopPropagation();
      }
      initialPinchDistanceRef.current = null;
      if (isDraggingRef.current) {
          isDraggingRef.current = false;
          setIsDragging(false);
          setPanPosition({ ...panRef.current });
          applyTransform(panRef.current.x, panRef.current.y, zoomLevel, true);
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (isFullscreen && slides[currentSlideIndex].type === 'image') {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.2 : 0.2;
          setZoomLevel(prev => Math.max(1, Math.min(4, prev + delta)));
      }
  };

  const renderCommentNode = (c: Comment, depth = 0) => {
      const isCommentLiked = c.likedBy && c.likedBy.includes(currentUser);
      const isAuthor = c.author === currentUser;
      const replies = commentTree.byParent[c.id] || [];
      const isEditing = editingCommentId === c.id;
      const isCollapsed = collapsedComments.has(c.id);
      const parentComment = depth > 0 && c.parentId ? comments.find(p => p.id === c.parentId) : null;
      const toggleCollapse = () => setCollapsedComments(prev => {
          const next = new Set(prev);
          if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
          return next;
      });

      const openCommentReactionPicker = (e: React.MouseEvent | React.TouchEvent, id: string) => {
          let x: number, y: number;
          if ('touches' in e) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
          else { x = (e as React.MouseEvent).clientX; y = (e as React.MouseEvent).clientY; }
          setCommentReactionPicker({ commentId: id, position: { x, y } });
      };

      return (
          <div key={c.id} className={`flex flex-col ${depth > 0 ? `ml-4 md:ml-8 border-l-2 pl-4 mt-2 ${isXp ? 'border-xp-navy/20' : 'border-white/10'}` : 'mt-4'}`}>
              <div
                id={`comment-${c.id}`}
                className={`p-3 border transition-all select-none ${isWinamp ? 'bg-black border-[#505050]' : isXp ? 'rounded-xl bg-gray-50 border-gray-200 hover:border-gray-300' : 'rounded-xl bg-white/5 border-white/5 hover:border-white/10'}`}
                onContextMenu={e => e.preventDefault()}
                onTouchStart={e => {
                    const touch = e.touches[0];
                    commentLongPressFiredRef.current = false;
                    commentLongPressRef.current = setTimeout(() => {
                        commentLongPressFiredRef.current = true;
                        setCommentReactionPicker({ commentId: c.id, position: { x: touch.clientX, y: touch.clientY } });
                    }, 500);
                }}
                onTouchEnd={e => {
                    if (commentLongPressRef.current) clearTimeout(commentLongPressRef.current);
                    // Prevent synthetic click whenever picker fired OR picker is already open
                    if (commentLongPressFiredRef.current || commentReactionPicker !== null) {
                        e.preventDefault();
                    }
                    commentLongPressFiredRef.current = false;
                }}
                onTouchMove={() => {
                    if (commentLongPressRef.current) clearTimeout(commentLongPressRef.current);
                    commentLongPressFiredRef.current = false;
                }}
              >
                  <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                          <img src={getUserAvatar(c.author)} className="w-5 h-5 rounded-full cursor-pointer" onClick={() => onAuthorClick(c.author)} />
                          <div className="flex items-center gap-2">
                              <div onClick={() => onAuthorClick(c.author)} className="font-bold cursor-pointer text-green-500 font-pixel text-[10px] leading-none">@{c.author}</div>
                              <div className="text-[9px] opacity-30 font-mono leading-none">{c.timestamp}</div>
                              {c.editedAt && <span className="text-[8px] opacity-25 font-mono italic">ред.</span>}
                              {replies.length > 0 && (
                                  <button onClick={toggleCollapse} className="flex items-center gap-0.5 text-[9px] font-mono text-green-500/70 hover:text-green-400 transition-colors" title={isCollapsed ? 'Развернуть' : 'Свернуть'}>
                                      <CornerDownRight size={10} />
                                      {replies.length}
                                      {isCollapsed ? <XI icon={ChevronDown} size={10} /> : <XI icon={ChevronUp} size={10} />}
                                  </button>
                              )}
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => onCommentLike(c.id)} className={`flex items-center gap-1 text-[10px] transition-colors ${isCommentLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                              <XI icon={Heart} size={12} fill={isCommentLiked ? "currentColor" : "none"} /> {c.likes > 0 && c.likes}
                          </button>
                          <button
                              onClick={(e) => openCommentReactionPicker(e, c.id)}
                              className="text-gray-500 hover:text-yellow-400 transition-colors"
                              title="Реакция"
                          >
                              <SmilePlus size={12} />
                          </button>
                          <button onClick={() => handleReply(c)} className="text-gray-500 hover:text-white transition-colors" title="Ответить">
                              <CornerDownRight size={14} />
                          </button>
                          {isAuthor && onEditComment && (
                              <button
                                  onClick={() => { setEditingCommentId(c.id); setEditingText(c.text); }}
                                  className="text-gray-500 hover:text-blue-400 transition-colors"
                                  title="Редактировать"
                              >
                                  <Pencil size={12} />
                              </button>
                          )}
                          {(isAuthor || isAdmin) && (
                              <button onClick={() => onDeleteComment(exhibit.id, c.id)} className="text-gray-500 hover:text-red-500 transition-colors" title="Удалить">
                                  <XI icon={Trash2} size={14} />
                              </button>
                          )}
                      </div>
                  </div>
                  {parentComment && !isEditing && (
                      <div className="pl-7 mb-1">
                          <div className="border-l-2 border-white/20 pl-2 text-[9px] font-mono opacity-40 truncate">
                              <span className="text-green-500/70">@{parentComment.author}:</span> {parentComment.text.slice(0, 60)}{parentComment.text.length > 60 ? '...' : ''}
                          </div>
                      </div>
                  )}
                  {isEditing ? (
                      <div className="flex gap-2 mt-1 pl-7">
                          <input
                              value={editingText}
                              onChange={e => setEditingText(e.target.value)}
                              className="flex-1 bg-black/40 border border-green-500/50 px-2 py-1 font-mono text-xs rounded focus:outline-none focus:border-green-500 transition-colors"
                              autoFocus
                              onKeyDown={e => {
                                  if (e.key === 'Enter' && editingText.trim()) {
                                      onEditComment?.(exhibit.id, c.id, editingText.trim());
                                      setEditingCommentId(null);
                                  }
                                  if (e.key === 'Escape') setEditingCommentId(null);
                              }}
                          />
                          <button
                              onClick={() => { onEditComment?.(exhibit.id, c.id, editingText.trim()); setEditingCommentId(null); }}
                              className="text-green-500 hover:text-white text-[10px] font-bold px-2"
                          >
                              СОХР
                          </button>
                          <button onClick={() => setEditingCommentId(null)} className="text-gray-500 hover:text-red-500">
                              <XI icon={X} size={12} />
                          </button>
                      </div>
                  ) : (
                      <p className="font-mono text-xs opacity-80 pl-7 break-words leading-relaxed">
                          {renderTextWithMentions(c.text, onAuthorClick, users)}
                      </p>
                  )}
                  {/* Reaction bar */}
                  {c.reactions && c.reactions.length > 0 && (
                      <div
                          className="pl-7 mt-2"
                          onTouchStart={e => e.stopPropagation()}
                          onTouchEnd={e => e.stopPropagation()}
                      >
                          <ReactionBar
                              reactions={c.reactions}
                              currentUsername={currentUser}
                              onReact={emoji => onCommentReact?.(exhibit.id, c.id, emoji)}
                              isMe={false}
                              theme={theme}
                          />
                      </div>
                  )}
              </div>
              {!isCollapsed && replies.map(reply => renderCommentNode(reply, depth + 1))}
          </div>
      );
  };

  const recipientProfile = users.find(u => u.username === exhibit.owner);

  // Description truncation logic
  const MAX_DESCRIPTION_LENGTH = 100; // Updated limit
  const isLongDescription = exhibit.description && exhibit.description.length > MAX_DESCRIPTION_LENGTH;
  const displayDescription = isLongDescription && !isDescriptionExpanded 
      ? exhibit.description.slice(0, MAX_DESCRIPTION_LENGTH) + '...'
      : exhibit.description;

  const ogImage = exhibit.imageUrls?.[0]
      ? getImageUrl(exhibit.imageUrls[0], 'large')
      : undefined;

  // Reusable comments section
  const commentsSection = (
    <div className={`p-5 rounded-2xl border ${isWinamp ? 'bg-[#191919] border-[#505050]' : isXp ? 'bg-white border-gray-300 shadow-inner' : 'bg-dark-surface border-white/5'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-pixel text-xs flex items-center gap-2 uppercase tracking-widest ${isWinamp ? 'text-[#00ff00]' : isXp ? 'text-xp-navy' : 'text-white'}`}>
          <XI icon={MessageSquare} size={14} className={isWinamp ? 'text-[#00ff00]' : isXp ? 'text-xp-navy' : 'text-green-500'} />
          ОБСУЖДЕНИЕ
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full font-mono text-[10px] font-bold">{comments.length}</span>
        </h3>
        {comments.length > 0 && (
          <div className="flex gap-1">
            {(['newest', 'oldest', 'popular'] as const).map(sort => {
              const labels = { newest: 'НОВЫЕ', oldest: 'СТАРЫЕ', popular: 'ТОП' };
              return (
                <button key={sort} onClick={() => setCommentSort(sort)} className={`px-2 py-0.5 text-[8px] font-pixel uppercase rounded transition-all ${commentSort === sort ? (isXp ? 'bg-xp-navy/10 text-xp-navy border border-xp-navy/40' : 'bg-green-500/20 text-green-400 border border-green-500/40') : (isXp ? 'text-gray-500 hover:text-gray-700' : 'opacity-30 hover:opacity-60')}`}>
                  {labels[sort]}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {comments.length === 0
          ? <div className={`text-center py-8 opacity-30 text-[10px] font-pixel uppercase tracking-widest border border-dashed rounded-xl ${isXp ? 'border-gray-400 text-gray-600' : 'border-white/10'}`}>ТИШИНА В ЭФИРЕ</div>
          : commentTree.roots.map(rootComment => renderCommentNode(rootComment))
        }
      </div>
      <div className="flex flex-col gap-2 relative">
        {mentionQuery !== null && filteredUsers.length > 0 && (
          <div className="absolute bottom-full mb-2 left-0 w-64 bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
            {filteredUsers.map(u => (
              <button key={u.username} onClick={() => selectMention(u.username)} className="w-full flex items-center gap-2 p-2 hover:bg-white/10 text-left transition-colors">
                <img src={getUserAvatar(u.username)} className="w-6 h-6 rounded-full" />
                <span className="font-bold text-[10px]">@{u.username}</span>
              </button>
            ))}
          </div>
        )}
        {replyTo && (
          <div className={`flex items-center justify-between text-[10px] font-mono p-2 rounded-lg border ${isXp ? 'bg-gray-100 border-gray-200 text-gray-700' : 'bg-white/5 border-white/5'}`}>
            <span className="opacity-70">Ответ <span className="text-green-500 font-bold">@{replyTo.author}</span></span>
            <button onClick={() => { setReplyTo(null); setCommentText(''); }} className="hover:text-red-500"><XI icon={X} size={12}/></button>
          </div>
        )}
        <div className="flex gap-2 relative">
          {showEmojiPicker && (
            <EmojiPicker theme={theme} onSelect={emoji => setCommentText(prev => prev + emoji)} onClose={() => setShowEmojiPicker(false)} />
          )}
          <input
            id="comment-input"
            type="text"
            value={commentText}
            onChange={handleCommentChange}
            placeholder={replyTo ? "Ваш ответ..." : "Написать комментарий..."}
            className={`flex-1 border px-3 py-2.5 font-mono text-xs focus:outline-none transition-colors rounded-lg ${isWinamp ? 'bg-black/40 border-white/10 text-[#00ff00] placeholder-gray-600 focus:border-green-500' : isXp ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-xp-navy' : 'bg-black/40 border-white/10 focus:border-green-500'}`}
            onKeyDown={e => {
              if (e.key === 'Enter' && commentText.trim()) {
                const err = validateMessageText(commentText);
                if (err) { alert(err); return; }
                onPostComment(exhibit.id, commentText, replyTo?.id);
                setCommentText(''); setReplyTo(null); setMentionQuery(null);
              }
            }}
          />
          <button onClick={() => setShowEmojiPicker(v => !v)} className={`p-2.5 rounded-lg border transition-all ${showEmojiPicker ? (isXp ? 'bg-xp-navy/10 border-xp-navy/40 text-xp-navy' : 'bg-green-500/20 border-green-500/40 text-green-400') : (isXp ? 'border-gray-300 text-gray-500 hover:text-gray-700' : 'border-white/10 text-gray-500 hover:text-white')}`} title="Эмодзи">
            <SmilePlus size={16} />
          </button>
          <button
            onClick={() => {
              if (commentText.trim()) {
                const err = validateMessageText(commentText);
                if (err) { alert(err); return; }
                onPostComment(exhibit.id, commentText, replyTo?.id);
                setCommentText(''); setReplyTo(null); setMentionQuery(null);
              }
            }}
            className="bg-green-500 text-black p-2.5 rounded-lg hover:scale-105 active:scale-95 transition-all"
          >
            <XI icon={Send} size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  // Reusable specs grid
  const specsGrid = (cols: string) => nonEmptySpecs.length > 0 && (
    <div className={`grid ${cols} gap-2 p-3 rounded-2xl border ${isWinamp ? 'bg-[#191919] border-[#505050]' : isXp ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
      {nonEmptySpecs.map(([key, val]) => {
        const parenIdx = key.indexOf('(');
        const mainLabel = parenIdx > -1 ? key.slice(0, parenIdx).trim() : key;
        const subLabel  = parenIdx > -1 ? key.slice(parenIdx) : null;
        return (
          <div key={key} className={`px-3 py-2.5 border rounded-xl flex flex-col justify-center ${isWinamp ? 'bg-black border-[#505050]' : isXp ? 'bg-white border-gray-200' : 'bg-white/5 border-white/5'}`}>
            <div className={`text-[8px] uppercase tracking-wider leading-tight ${isWinamp ? 'text-[#00ff00] opacity-60' : isXp ? 'text-gray-500' : 'opacity-50'}`}>
              {mainLabel}{subLabel && <span className="opacity-60 normal-case tracking-normal"> {subLabel}</span>}
            </div>
            <div className={`font-bold font-mono text-xs break-words leading-tight mt-1 ${isWinamp ? 'text-[#00ff00]' : isXp ? 'text-[#1a1a1a]' : 'text-white'}`}>{val}</div>
          </div>
        );
      })}
      {exhibit.condition && (
        <div className={`px-3 py-2.5 border rounded-xl flex flex-col justify-center ${isWinamp ? 'bg-black border-[#505050]' : isXp ? 'bg-white border-gray-200' : 'bg-white/5 border-white/5'}`}>
          <div className={`text-[8px] uppercase tracking-wider mb-1 flex items-center gap-1 ${isWinamp ? 'text-[#00ff00] opacity-60' : isXp ? 'text-gray-500' : 'opacity-50'}`}><XI icon={Award} size={10}/> СОСТОЯНИЕ</div>
          <div className={`font-bold font-mono text-xs text-green-400 uppercase leading-tight break-words ${isWinamp ? 'text-[#00ff00]' : ''}`}>{exhibit.condition}</div>
        </div>
      )}
    </div>
  );

  // Linked artifacts row
  const linkedSection = linkedArtifacts.length > 0 && (
    <div className={`pt-4 border-t ${isXp ? 'border-gray-200' : 'border-white/5'}`}>
      <h3 className="font-pixel text-[9px] opacity-40 uppercase tracking-widest mb-3 flex items-center gap-1"><XI icon={Link2} size={10}/> СВЯЗАННЫЕ ПРЕДМЕТЫ</h3>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {linkedArtifacts.map(link => (
          <div key={link.id} onClick={() => onExhibitClick(link)} className="flex-shrink-0 w-20 group cursor-pointer">
            <div className="aspect-square rounded-lg overflow-hidden border border-white/10 relative bg-black/20">
              <img src={getImageUrl(link.imageUrls[0], 'thumbnail')} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            </div>
            <div className="mt-1 text-[8px] font-bold truncate opacity-70 group-hover:opacity-100">{link.title}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // Similar artifacts grid
  const similarSection = similarArtifacts.length > 0 && (
    <div className="mt-10 mb-4">
      <h3 className="font-pixel text-[9px] opacity-40 mb-4 flex items-center gap-2 tracking-[0.2em] uppercase"><XI icon={Sparkles} size={12} className="text-purple-400" /> ПОХОЖИЕ ОБЪЕКТЫ</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {similarArtifacts.map(sim => (
          <ExhibitCard key={sim.id} item={sim} theme={theme} onClick={() => onExhibitClick(sim)} currentUsername={currentUser} onReact={() => {}} onAuthorClick={onAuthorClick} />
        ))}
      </div>
    </div>
  );

  // Share dropdown (reused in both layouts)
  const shareDropdown = showShareMenu && (
    <div className={`absolute right-0 top-8 w-44 border rounded-xl shadow-2xl z-50 p-1 animate-in slide-in-from-top-2 ${isXp ? 'bg-white border-gray-200' : 'bg-dark-surface border-white/10'}`}>
      <button onClick={() => handleShare('tg')} className="w-full text-left p-2 hover:bg-white/5 rounded text-[10px] font-bold flex items-center gap-2"><XI icon={Send} size={12} className="text-blue-400"/> TELEGRAM</button>
      <button onClick={() => handleShare('wa')} className="w-full text-left p-2 hover:bg-white/5 rounded text-[10px] font-bold flex items-center gap-2"><XI icon={MessageCircle} size={12} className="text-green-500"/> WHATSAPP</button>
      <button onClick={() => handleShare('copy')} className="w-full text-left p-2 hover:bg-white/5 rounded text-[10px] font-bold flex items-center gap-2"><XI icon={Share2} size={12}/> COPY LINK</button>
    </div>
  );

  const canTrade = !isOwner && (tradeStatus === 'FOR_TRADE' || tradeStatus === 'FOR_SALE' || tradeStatus === 'NONE' || !tradeStatus);

  return (
    <div className={`w-full min-h-full animate-in slide-in-from-right-8 fade-in duration-500 ${isWinamp ? 'font-mono text-gray-300' : theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
      <SEO
        title={`${exhibit.title} | NeoArchive`}
        description={exhibit.description || `Артефакт @${exhibit.owner} на NeoArchive`}
        image={ogImage}
        type="article"
      />

      {showTradeModal && currentUserProfile && allExhibits && recipientProfile && (
        <TradeOfferModal
          targetItem={exhibit}
          currentUser={currentUserProfile}
          userInventory={allExhibits.filter(e => e.owner === currentUser)}
          recipient={recipientProfile}
          onClose={() => setShowTradeModal(false)}
        />
      )}

      {/* LIKES MODAL */}
      {showLikesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl border ${isWinamp ? 'bg-[#191919] border-[#505050] text-[#00ff00]' : 'bg-dark-surface border-white/10 text-white'}`}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="font-pixel text-xs font-bold uppercase">Оценили ({exhibit.likedBy?.length || 0})</h3>
              <button onClick={() => setShowLikesModal(false)} className="opacity-50 hover:opacity-100"><XI icon={X} size={18}/></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {exhibit.likedBy && exhibit.likedBy.length > 0 ? exhibit.likedBy.map(username => {
                const userObj = users.find(u => u.username === username);
                return (
                  <div key={username} onClick={() => { setShowLikesModal(false); onAuthorClick(username); }} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                    <img src={userObj?.avatarUrl || getUserAvatar(username)} className="w-8 h-8 rounded-full border border-white/10" />
                    <span className="font-mono text-sm font-bold">@{username}</span>
                  </div>
                );
              }) : <div className="text-center opacity-50 font-mono text-xs py-4">Список пуст</div>}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN OVERLAY */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200">
          <div className="absolute top-4 left-4 z-50 flex gap-3">
            <button onClick={() => onLike(exhibit.id)} className={`p-3 bg-black/50 rounded-full transition-all ${isLiked ? 'text-red-500' : 'text-white hover:bg-white/20'}`} title={isLiked ? 'Убрать лайк' : 'Лайк'}>
              <XI icon={Heart} size={22} fill={isLiked ? "currentColor" : "none"} />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-black/50 text-white rounded-full text-sm font-mono">
              <XI icon={Heart} size={14} className="text-red-500" /> {exhibit.likes}
            </div>
          </div>
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 4))} className="p-3 bg-black/50 text-white rounded-full hover:bg-white/20"><ZoomIn size={22}/></button>
            <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))} className="p-3 bg-black/50 text-white rounded-full hover:bg-white/20"><ZoomOut size={22}/></button>
            <button onClick={() => { setZoomLevel(1); setPanPosition({ x: 0, y: 0 }); }} className="p-3 bg-black/50 text-white rounded-full hover:bg-blue-500/20 hover:text-blue-400" title="Сбросить"><XI icon={Home} size={22}/></button>
            <button onClick={() => { setIsFullscreen(false); setZoomLevel(1); setPanPosition({ x: 0, y: 0 }); }} className="p-3 bg-black/50 text-white rounded-full hover:bg-red-500/20 hover:text-red-500"><XI icon={X} size={22}/></button>
          </div>
          {zoomLevel > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-mono">{Math.round(zoomLevel * 100)}%</div>
          )}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden" {...(zoomLevel === 1 ? gallerySwipeStop : {})}>
            {zoomLevel === 1 && (
              <>
                <button onClick={() => setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length)} className="absolute left-4 z-40 p-4 text-white/40 hover:text-white transition-colors"><XI icon={ChevronLeft} size={48}/></button>
                <button onClick={() => setCurrentSlideIndex(prev => (prev + 1) % slides.length)} className="absolute right-4 z-40 p-4 text-white/40 hover:text-white transition-colors"><XI icon={ChevronRight} size={48}/></button>
              </>
            )}
            <div className="relative w-full h-full flex items-center justify-center p-4" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onWheel={handleWheel} style={{ cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}>
              {slides[currentSlideIndex].type === 'image' ? (
                <img ref={imgRef} src={slides[currentSlideIndex].largeUrl || slides[currentSlideIndex].url} className="max-w-full max-h-full object-contain select-none" style={{ transform: `scale(${zoomLevel}) translate3d(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px, 0)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out', willChange: 'transform', touchAction: 'none' }} draggable={false} />
              ) : (
                <iframe src={slides[currentSlideIndex].url} className="w-full h-full max-w-4xl max-h-[80vh]" frameBorder="0" allowFullScreen></iframe>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 pb-4 pt-2">
            <div className="flex items-center gap-2">
              {slides.map((_, idx) => <button key={idx} onClick={() => setCurrentSlideIndex(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-white scale-125' : 'bg-white/20 hover:bg-white/40'}`} />)}
            </div>
            {slides.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4">
                {slides.map((slide, idx) => (
                  <button key={idx} onClick={() => setCurrentSlideIndex(idx)} className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${idx === currentSlideIndex ? 'border-green-500' : 'border-transparent opacity-40 hover:opacity-70'}`}>
                    {slide.type === 'image' ? <img src={slide.url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black/80 flex items-center justify-center"><XI icon={Video} size={14} className="text-white/60"/></div>}
                  </button>
                ))}
              </div>
            )}
            <div className="text-white/40 text-[10px] font-mono">{currentSlideIndex + 1} / {slides.length}</div>
          </div>
        </div>
      )}

      {/* ============================================================
          MOBILE LAYOUT  (hidden on lg+)
      ============================================================ */}
      <div className="lg:hidden pb-28">

        {/* Mobile header */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${isXp ? 'border-gray-200 bg-white' : 'border-white/5 bg-black/60 backdrop-blur-sm'}`}>
          <button onClick={onBack} className="p-1 -ml-1 hover:opacity-70 transition-opacity">
            <ArrowLeft size={22} />
          </button>
          <span className={`flex-1 text-center font-pixel text-[11px] uppercase tracking-widest ${isXp ? 'text-gray-500' : 'opacity-50'}`}>Артефакт</span>
          <div className="flex items-center gap-3 relative">
            {(isOwner || isAdmin) && onEdit && (
              <button onClick={() => onEdit(exhibit)} className="text-purple-400 hover:opacity-70"><Edit2 size={18}/></button>
            )}
            {(isOwner || isAdmin) && onDelete && (
              <button onClick={() => onDelete(exhibit.id)} className="text-red-500 hover:opacity-70"><Trash2 size={18}/></button>
            )}
            <button onClick={() => setShowShareMenu(!showShareMenu)} className={`${shareCopied ? 'text-green-500' : ''} hover:opacity-70`}><Share2 size={18}/></button>
            {shareDropdown}
          </div>
        </div>

        {/* Mobile gallery grid */}
        <div className="w-full bg-black" style={{ height: '62vw', maxHeight: '340px', minHeight: '220px' }}>
          {slides.length <= 1 ? (
            <div className="w-full h-full cursor-zoom-in relative overflow-hidden" onClick={() => setIsFullscreen(true)}>
              <img src={slides[0]?.url} alt={exhibit.title} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white/80"><Maximize2 size={14}/></div>
            </div>
          ) : (
            <div className="w-full h-full" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '2px' }}>
              {/* First image: 2 cols wide, 1 row */}
              <div className="overflow-hidden cursor-pointer relative" style={{ gridColumn: 'span 2' }} onClick={() => { setCurrentSlideIndex(0); setIsFullscreen(true); }}>
                {slides[0].type === 'image'
                  ? <img src={slides[0].url} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-black/80 flex items-center justify-center"><Video size={24} className="text-white/60"/></div>
                }
              </div>
              {/* Remaining: up to 4 more cells */}
              {slides.slice(1, 5).map((slide, idx) => {
                const realIdx = idx + 1;
                const isLastCell = idx === 3 && slides.length > 5;
                return (
                  <div key={idx} className="overflow-hidden cursor-pointer relative" onClick={() => { setCurrentSlideIndex(realIdx); setIsFullscreen(true); }}>
                    {slide.type === 'image'
                      ? <img src={slide.url} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-black/80 flex items-center justify-center"><Video size={16} className="text-white/60"/></div>
                    }
                    {isLastCell && (
                      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">+{slides.length - 5}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile info */}
        <div className="px-4 pt-4 space-y-4">

          {/* Title + like */}
          <div className="flex items-start justify-between gap-3">
            <h1 className={`text-xl font-bold font-pixel leading-tight flex-1 ${isCursed ? 'text-red-500 italic' : isWinamp ? 'text-[#00ff00]' : isXp ? 'text-[#1a1a1a]' : 'text-white'}`}>{exhibit.title}</h1>
            <button onClick={() => onLike(exhibit.id)} className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-1" title={isLiked ? 'Убрать лайк' : 'Лайк'}>
              <XI icon={Heart} size={22} fill={isLiked ? "currentColor" : "none"} className={isLiked ? 'text-red-500' : 'opacity-60'} />
              <span className={`text-[10px] font-mono ${isLiked ? 'text-red-500' : 'opacity-40'}`}>{exhibit.likes}</span>
            </button>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[10px] font-mono font-bold ${isXp ? 'text-gray-500' : 'opacity-50'}`}>{exhibit.category}</span>
            {exhibit.subcategory && <>
              <span className="opacity-30 text-[10px]">›</span>
              <span className={`text-[10px] font-mono ${isXp ? 'text-gray-500' : 'opacity-50'}`}>{exhibit.subcategory}</span>
            </>}
            <span className={`px-2 py-0.5 text-[9px] font-pixel font-bold uppercase rounded flex items-center gap-1 ${isWinamp ? 'border border-[#00ff00] text-[#00ff00]' : `${tier.bgColor} ${tier.color}`}`}><TierIcon size={9}/> {tier.name}</span>
            {tradeStatus !== 'NONE' && (
              <span className={`px-2 py-0.5 text-[9px] font-pixel font-bold uppercase rounded flex items-center gap-1 ${tradeConfig.color} ${tradeConfig.bg}`}>
                {tradeConfig.icon && React.createElement(tradeConfig.icon, { size: 9 })} {tradeConfig.badge}
              </span>
            )}
          </div>

          {/* Author row */}
          <div className={`flex items-center justify-between pt-3 border-t ${isXp ? 'border-gray-200' : 'border-white/5'}`}>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onAuthorClick(exhibit.owner)}>
              <img src={getUserAvatar(exhibit.owner)} className={`w-10 h-10 rounded-full border ${isXp ? 'border-gray-200' : 'border-white/10'}`} />
              <div>
                <div className={`font-bold text-sm font-pixel ${isWinamp ? 'text-[#00ff00]' : ''}`}>{exhibit.owner}</div>
                <div className={`text-[10px] font-mono ${isXp ? 'text-gray-400' : 'opacity-40'}`}>@{exhibit.owner}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono opacity-40">
              <Eye size={13}/> {viewsDisplay}
            </div>
          </div>

          <div className={`border-t ${isXp ? 'border-gray-200' : 'border-white/5'}`} />

          {/* Description */}
          {exhibit.description && (
            <div>
              <p className={`font-mono text-xs leading-relaxed whitespace-pre-wrap ${isWinamp ? 'text-[#00ff00]' : 'opacity-75'}`}>{displayDescription}</p>
              {isLongDescription && (
                <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className={`mt-1.5 text-[10px] font-bold uppercase flex items-center gap-1 hover:underline ${isWinamp ? 'text-[#00ff00]' : 'text-blue-400'}`}>
                  {isDescriptionExpanded ? <>Свернуть <XI icon={ChevronUp} size={10}/></> : <>Читать далее <XI icon={ChevronDown} size={10}/></>}
                </button>
              )}
            </div>
          )}

          {/* ПАРАМЕТРЫ */}
          {(nonEmptySpecs.length > 0 || exhibit.condition) && (
            <div>
              <h3 className={`font-pixel text-[9px] uppercase tracking-widest mb-3 ${isWinamp ? 'text-[#00ff00]' : isXp ? 'text-gray-500' : 'opacity-40'}`}>Параметры</h3>
              {specsGrid('grid-cols-2')}
            </div>
          )}

          {/* Linked */}
          {linkedSection}

          {/* Comments */}
          {commentsSection}

          {/* Similar */}
          {similarSection}
        </div>
      </div>

      {/* ============================================================
          DESKTOP LAYOUT  (hidden below lg)
      ============================================================ */}
      <div className="hidden lg:flex min-h-screen">

        {/* Left: sticky gallery */}
        <div className="w-1/2 sticky top-0 h-screen bg-black flex flex-col overflow-hidden">

          {/* Main image area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden" {...gallerySwipeStop}>
            {/* Blurred bg */}
            {slides[currentSlideIndex].type === 'image' && (
              <img key={`bg-${exhibit.id}-${currentSlideIndex}`} src={slides[currentSlideIndex].url} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-25 scale-110 pointer-events-none" />
            )}

            {/* Slide counter */}
            {slides.length > 1 && (
              <div className="absolute top-4 left-4 z-20 bg-black/60 text-white text-[10px] font-mono px-2.5 py-1 rounded-full backdrop-blur-sm">
                {currentSlideIndex + 1} / {slides.length}
              </div>
            )}

            {/* Nav arrows */}
            {slides.length > 1 && (
              <>
                <button onClick={() => setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length)} className="absolute left-3 z-20 p-2.5 bg-black/50 text-white/60 hover:text-white rounded-full transition-colors"><XI icon={ChevronLeft} size={28}/></button>
                <button onClick={() => setCurrentSlideIndex(prev => (prev + 1) % slides.length)} className="absolute right-3 z-20 p-2.5 bg-black/50 text-white/60 hover:text-white rounded-full transition-colors"><XI icon={ChevronRight} size={28}/></button>
              </>
            )}

            {/* Fullscreen button */}
            <button onClick={() => setIsFullscreen(true)} className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white/60 hover:text-white rounded-lg transition-colors"><Maximize2 size={18}/></button>

            {/* Main media */}
            {slides[currentSlideIndex].type === 'image' ? (
              <img key={`main-${exhibit.id}-${currentSlideIndex}`} src={slides[currentSlideIndex].url} alt={exhibit.title} className="relative z-10 max-w-full max-h-full object-contain cursor-zoom-in select-none" onClick={() => setIsFullscreen(true)} />
            ) : (
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <iframe src={slides[currentSlideIndex].url} className="w-full h-full" frameBorder="0" allowFullScreen />
                <div className="absolute top-0 left-0 w-[12%] h-full z-20 cursor-pointer" onClick={() => setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length)} />
                <div className="absolute top-0 right-0 w-[12%] h-full z-20 cursor-pointer" onClick={() => setCurrentSlideIndex(prev => (prev + 1) % slides.length)} />
              </div>
            )}

            {/* Dot indicators */}
            {slides.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
                {slides.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentSlideIndex(idx)} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-white scale-125' : 'bg-white/25 hover:bg-white/50'}`} />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {slides.length > 1 && (
            <div className={`flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-t ${isWinamp ? 'border-[#505050] bg-[#191919]' : 'border-white/5 bg-black/80'}`}>
              {slides.map((slide, idx) => (
                <button key={idx} onClick={() => setCurrentSlideIndex(idx)} className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${idx === currentSlideIndex ? 'border-green-500 opacity-100' : 'border-transparent opacity-40 hover:opacity-70'}`}>
                  {slide.type === 'image' ? <img src={slide.url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black/80 flex items-center justify-center"><XI icon={Video} size={14} className="text-white/60"/></div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: scrollable info */}
        <div className={`w-1/2 max-h-screen overflow-y-auto pb-28 ${isXp ? 'bg-gray-50' : isWinamp ? 'bg-[#111]' : 'bg-dark-bg'}`}>
          <div className="px-8 pt-8 pb-4 space-y-6">

            {/* Breadcrumb + back */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-pixel uppercase tracking-wider">
                <button onClick={onBack} className={`flex items-center gap-1 ${isXp ? 'text-gray-400 hover:text-gray-700' : 'opacity-40 hover:opacity-80'} transition-opacity`}><XI icon={ArrowLeft} size={11}/> НАЗАД</button>
                <span className={isXp ? 'text-gray-300' : 'opacity-20'}>·</span>
                <span className={`font-bold ${isXp ? 'text-gray-600' : 'opacity-60'}`}>{exhibit.category}</span>
                {exhibit.subcategory && <>
                  <span className={isXp ? 'text-gray-300' : 'opacity-20'}>·</span>
                  <span className={isXp ? 'text-gray-600' : 'opacity-50'}>{exhibit.subcategory}</span>
                </>}
                <span className={isXp ? 'text-gray-300' : 'opacity-20'}>·</span>
                <span className={`font-bold flex items-center gap-0.5 ${isWinamp ? 'text-[#00ff00]' : tier.color}`}><TierIcon size={9}/> {tier.name}</span>
                {tradeStatus !== 'NONE' && <>
                  <span className={isXp ? 'text-gray-300' : 'opacity-20'}>·</span>
                  <span className={`flex items-center gap-1 ${tradeConfig.color}`}>
                    {tradeConfig.icon && React.createElement(tradeConfig.icon, { size: 9 })} {tradeConfig.badge}
                  </span>
                </>}
              </div>
              <div className="flex items-center gap-2 relative">
                {(isOwner || isAdmin) && onEdit && <button onClick={() => onEdit(exhibit)} className="p-1.5 text-purple-400 hover:opacity-70 transition-opacity"><Edit2 size={15}/></button>}
                {(isOwner || isAdmin) && onDelete && <button onClick={() => onDelete(exhibit.id)} className="p-1.5 text-red-500 hover:opacity-70 transition-opacity"><Trash2 size={15}/></button>}
                <button onClick={() => setShowShareMenu(!showShareMenu)} className={`p-1.5 hover:opacity-70 transition-opacity ${shareCopied ? 'text-green-500' : ''}`}><Share2 size={15}/></button>
                {shareDropdown}
              </div>
            </div>

            {/* Title */}
            <h1 className={`text-3xl lg:text-4xl font-bold font-pixel leading-tight ${isCursed ? 'text-red-500 italic' : isWinamp ? 'text-[#00ff00]' : isXp ? 'text-[#1a1a1a]' : 'text-white'}`}>{exhibit.title}</h1>

            {/* Author row */}
            <div className={`flex items-center justify-between pb-6 border-b ${isXp ? 'border-gray-200' : 'border-white/5'}`}>
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onAuthorClick(exhibit.owner)}>
                <img src={getUserAvatar(exhibit.owner)} className={`w-12 h-12 rounded-full border ${isXp ? 'border-gray-200' : 'border-white/10'}`} />
                <div>
                  <div className={`font-bold transition-colors ${isWinamp ? 'text-[#00ff00]' : 'group-hover:text-green-500'}`}>{exhibit.owner}</div>
                  <div className={`text-xs font-mono mt-0.5 ${isXp ? 'text-gray-400' : 'opacity-40'}`}>@{exhibit.owner} · {ownerArtifactCount} артефактов</div>
                </div>
              </div>
              <button onClick={() => onAuthorClick(exhibit.owner)} className={`px-4 py-1.5 border rounded-lg text-xs font-pixel font-bold transition-colors hover:bg-white/5 ${isXp ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : isWinamp ? 'border-[#00ff00] text-[#00ff00]' : 'border-white/20 text-white'}`}>
                Профиль
              </button>
            </div>

            {/* Desktop action buttons */}
            {!isOwner ? (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onMessage(exhibit.owner)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-pixel font-bold transition-colors ${isXp ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : isWinamp ? 'border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/10' : 'border-white/20 text-white hover:bg-white/5'}`}
                >
                  <MessageSquare size={15}/> Написать
                </button>
                {canTrade && (
                  <button
                    onClick={() => setShowTradeModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-black rounded-xl text-sm font-pixel font-bold hover:bg-green-400 active:scale-[0.99] transition-all"
                  >
                    <XI icon={RefreshCw} size={14}/> Предложить обмен
                  </button>
                )}
              </div>
            ) : onEdit ? (
              <div className="flex gap-3">
                <button
                  onClick={() => onEdit(exhibit)}
                  className={`flex items-center gap-2 px-4 py-2.5 border border-purple-500/30 text-purple-400 rounded-xl text-sm font-pixel font-bold hover:bg-purple-500/10 transition-colors`}
                >
                  <Edit2 size={14}/> Редактировать
                </button>
              </div>
            ) : null}

            {/* Stats bar */}
            <div className="flex items-center gap-4 text-xs font-mono opacity-60">
              <div className="flex items-center gap-2">
                <button onClick={() => onLike(exhibit.id)} className={`transition-colors ${isLiked ? 'text-red-500 opacity-100' : 'hover:opacity-100'}`} title={isLiked ? 'Убрать лайк' : 'Лайк'}>
                  <XI icon={Heart} size={18} className={isLiked ? 'fill-current' : ''} />
                </button>
                <div className="flex items-center gap-1 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => setShowLikesModal(true)}>
                  {exhibit.likedBy && exhibit.likedBy.length > 0 && (
                    <div className="flex -space-x-2 mr-1">
                      {exhibit.likedBy.slice(0, 3).map((u, i) => <img key={i} src={getUserAvatar(u)} className="w-5 h-5 rounded-full border border-black bg-black" />)}
                    </div>
                  )}
                  <span className="font-bold">{exhibit.likes}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5"><XI icon={Eye} size={15}/> {viewsDisplay}</div>
              <div className="flex-1"/>
              {isOwner && <button onClick={() => onAddToCollection?.(exhibit.id)} className="hover:text-blue-400 hover:opacity-100 transition-all" title="В коллекцию"><XI icon={BookmarkPlus} size={18}/></button>}
              {!isOwner && <button onClick={() => onFollow(exhibit.owner)} className={`px-3 py-1 text-[9px] font-bold font-pixel border rounded transition-all ${isFollowing ? (isXp ? 'border-gray-300 opacity-40' : 'border-white/10 opacity-40') : (isXp ? 'bg-xp-navy text-white border-transparent' : 'bg-white/10 hover:bg-white/20 border-transparent opacity-100')}`}>{isFollowing ? 'ПОДПИСАН' : 'ПОДПИСАТЬСЯ'}</button>}
            </div>

            {/* Description */}
            {exhibit.description && (
              <div>
                <h4 className={`text-[9px] uppercase tracking-widest mb-2 font-pixel ${isWinamp ? 'text-[#00ff00] opacity-60' : isXp ? 'text-gray-400' : 'opacity-40'}`}>Описание</h4>
                <p className={`font-mono text-sm leading-relaxed whitespace-pre-wrap ${isWinamp ? 'text-[#00ff00]' : 'opacity-80'}`}>{displayDescription}</p>
                {isLongDescription && (
                  <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className={`mt-2 text-[10px] font-bold uppercase flex items-center gap-1 hover:underline ${isWinamp ? 'text-[#00ff00]' : 'text-blue-400'}`}>
                    {isDescriptionExpanded ? <>Свернуть <XI icon={ChevronUp} size={10}/></> : <>Читать далее <XI icon={ChevronDown} size={10}/></>}
                  </button>
                )}
              </div>
            )}

            {/* Specs */}
            {(nonEmptySpecs.length > 0 || exhibit.condition) && (
              <div>
                <h4 className={`text-[9px] uppercase tracking-widest mb-3 font-pixel ${isWinamp ? 'text-[#00ff00] opacity-60' : isXp ? 'text-gray-400' : 'opacity-40'}`}>Параметры</h4>
                {specsGrid('grid-cols-2')}
              </div>
            )}

            {/* Linked */}
            {linkedSection}

            {/* Comments */}
            {commentsSection}

            {/* Similar */}
            {similarSection}
          </div>
        </div>
      </div>

      {/* ============================================================
          FIXED BOTTOM ACTION BAR
      ============================================================ */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 border-t ${isXp ? 'bg-white border-gray-200' : isWinamp ? 'bg-[#111] border-[#505050]' : 'bg-black/90 border-white/5 backdrop-blur-md'}`}>
        {/* Mobile bar only */}
        <div className="lg:hidden flex gap-3 px-4 py-3">
          <button
            onClick={() => onMessage(exhibit.owner)}
            className={`flex-1 py-3 border rounded-2xl font-pixel text-xs uppercase font-bold transition-colors ${isXp ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : isWinamp ? 'border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/10' : 'border-white/20 text-white hover:bg-white/5'}`}
          >
            Написать
          </button>
          {canTrade && (
            <button
              onClick={() => setShowTradeModal(true)}
              className="flex-[2] flex items-center justify-center gap-2 py-3 bg-green-500 text-black rounded-2xl font-pixel text-xs uppercase font-bold hover:bg-green-400 active:scale-95 transition-all"
            >
              <XI icon={RefreshCw} size={14}/> Предложить обмен
            </button>
          )}
        </div>
      </div>

      {/* Comment reaction picker */}
      {commentReactionPicker && (() => {
        const pickerComment = comments.find(c => c.id === commentReactionPicker.commentId);
        return (
          <MessageReactionPicker
            position={commentReactionPicker.position}
            onReact={emoji => { onCommentReact?.(exhibit.id, commentReactionPicker.commentId, emoji); setCommentReactionPicker(null); }}
            onClose={() => setCommentReactionPicker(null)}
            onReply={pickerComment ? () => { setCommentReactionPicker(null); handleReply(pickerComment); } : undefined}
            theme={theme}
          />
        );
      })()}
    </div>
  );
}

export default ExhibitDetailPage;