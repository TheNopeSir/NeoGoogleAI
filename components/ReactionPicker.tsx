import React, { useState, useRef, useEffect } from 'react';
import { ReactionType, Reaction } from '../types';
import { REACTION_CONFIG } from '../constants';

interface ReactionPickerProps {
  reactions?: Reaction[];
  currentUsername: string;
  onReact: (reactionType: ReactionType) => void;
  theme: 'dark' | 'light' | 'xp' | 'winamp';
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  reactions = [],
  currentUsername,
  onReact,
  theme
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isWinamp = theme === 'winamp';

  // Get user's current reaction
  const userReaction = reactions.find(r => r.users.includes(currentUsername));

  // Calculate total reactions
  const totalReactions = reactions.reduce((sum, r) => sum + r.users.length, 0);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const handleReactionClick = (reactionType: ReactionType) => {
    onReact(reactionType);
    setShowPicker(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      {/* Main Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(!showPicker);
        }}
        className={`flex items-center gap-1 text-[10px] transition-all hover:scale-110 ${
          userReaction
            ? `${REACTION_CONFIG[userReaction.type].color} font-bold`
            : isWinamp ? 'text-wa-green' : 'opacity-40 hover:opacity-100'
        }`}
      >
        <span className="text-sm">
          {userReaction ? REACTION_CONFIG[userReaction.type].emoji : '👍'}
        </span>
        <span>{totalReactions}</span>
      </button>

      {/* Reaction Picker Popup */}
      {showPicker && (
        <div
          className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 animate-in fade-in zoom-in-95 duration-200`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`p-2 rounded-xl border shadow-xl backdrop-blur-md flex gap-1 ${
            isWinamp
              ? 'bg-[#292929] border-[#505050]'
              : theme === 'dark'
                ? 'bg-black/90 border-white/20'
                : 'bg-white/90 border-black/20'
          }`}>
            {(Object.keys(REACTION_CONFIG) as ReactionType[]).map((reactionType) => {
              const config = REACTION_CONFIG[reactionType];
              const reactionData = reactions.find(r => r.type === reactionType);
              const count = reactionData?.users.length || 0;
              const isActive = userReaction?.type === reactionType;

              return (
                <button
                  key={reactionType}
                  onClick={() => handleReactionClick(reactionType)}
                  className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all hover:scale-110 ${
                    isActive
                      ? 'bg-white/20 ring-2 ring-current ' + config.color
                      : 'hover:bg-white/10'
                  }`}
                  title={config.label}
                >
                  <span className="text-xl leading-none">{config.emoji}</span>
                  {count > 0 && (
                    <span className={`absolute -top-1 -right-1 text-[8px] px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full font-bold ${
                      isActive ? 'bg-current text-black' : 'bg-white/20'
                    }`}>
                      {count}
                    </span>
                  )}

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className={`px-2 py-1 rounded text-[9px] font-pixel whitespace-nowrap ${
                      theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'
                    } shadow-lg`}>
                      {config.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Arrow */}
          <div className={`w-3 h-3 absolute left-1/2 transform -translate-x-1/2 -bottom-1 rotate-45 ${
            isWinamp
              ? 'bg-[#292929] border-r border-b border-[#505050]'
              : theme === 'dark'
                ? 'bg-black/90 border-r border-b border-white/20'
                : 'bg-white/90 border-r border-b border-black/20'
          }`}></div>
        </div>
      )}
    </div>
  );
};

export default ReactionPicker;
