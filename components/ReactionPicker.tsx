import React from 'react';
import { Reaction } from '../types';

interface ReactionPickerProps {
  reactions?: Reaction[];
  currentUsername: string;
  onReact: () => void;
  theme: 'dark' | 'light' | 'xp' | 'winamp';
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  reactions = [],
  currentUsername,
  onReact,
  theme
}) => {
  const isWinamp = theme === 'winamp';

  // Get user's current like status (with safety check)
  const userHasLiked = reactions?.some(r => r.type === 'LIKE' && r.users?.includes(currentUsername));

  // Calculate total likes (with safety check)
  const totalLikes = reactions?.find(r => r.type === 'LIKE')?.users?.length || 0;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onReact();
      }}
      className={`flex items-center gap-1 text-[10px] transition-all hover:scale-110 ${
        userHasLiked
          ? 'text-blue-500 font-bold'
          : isWinamp ? 'text-wa-green' : 'opacity-40 hover:opacity-100'
      }`}
      title={userHasLiked ? 'Убрать лайк' : 'Поставить лайк'}
    >
      <span className="text-sm">👍</span>
      <span>{totalLikes}</span>
    </button>
  );
};

export default ReactionPicker;
