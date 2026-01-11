import { Reaction, ReactionType, Exhibit } from '../types';

/**
 * Toggle user's like on an exhibit
 * If user has liked - remove it
 * If user hasn't liked - add it
 */
export const toggleReaction = (
  reactions: Reaction[] = [],
  username: string,
  reactionType: ReactionType = 'LIKE'
): Reaction[] => {
  // Find the LIKE reaction
  const likeReactionIndex = reactions.findIndex(r => r.type === 'LIKE');

  // Create a copy of reactions array
  let newReactions = [...reactions];

  if (likeReactionIndex !== -1) {
    const likeReaction = newReactions[likeReactionIndex];

    // Check if user has already liked
    if (likeReaction.users.includes(username)) {
      // Remove user's like (toggle off)
      newReactions[likeReactionIndex] = {
        ...likeReaction,
        users: likeReaction.users.filter(u => u !== username)
      };

      // Remove reaction if no users left
      if (newReactions[likeReactionIndex].users.length === 0) {
        newReactions.splice(likeReactionIndex, 1);
      }
    } else {
      // Add user's like
      newReactions[likeReactionIndex] = {
        ...likeReaction,
        users: [...likeReaction.users, username]
      };
    }
  } else {
    // No LIKE reaction yet - create it with this user
    newReactions.push({
      type: 'LIKE',
      users: [username]
    });
  }

  return newReactions;
};

/**
 * Get total reaction count for an exhibit
 */
export const getTotalReactions = (reactions: Reaction[] = []): number => {
  return reactions.reduce((sum, r) => sum + r.users.length, 0);
};

/**
 * Check if user has liked
 */
export const getUserReaction = (
  reactions: Reaction[] = [],
  username: string
): ReactionType | null => {
  const likeReaction = reactions.find(r => r.type === 'LIKE' && r.users.includes(username));
  return likeReaction ? 'LIKE' : null;
};

/**
 * Check if user has liked
 */
export const hasUserReacted = (
  reactions: Reaction[] = [],
  username: string
): boolean => {
  return reactions.some(r => r.type === 'LIKE' && r.users.includes(username));
};

/**
 * Migrate legacy likes to reactions
 * For backward compatibility with old data
 */
export const migrateLegacyLikes = (exhibit: Exhibit): Exhibit => {
  // If already has reactions, don't migrate
  if (exhibit.reactions && exhibit.reactions.length > 0) {
    return exhibit;
  }

  // If has legacy likes, convert to LIKE reactions
  if (exhibit.likedBy && exhibit.likedBy.length > 0) {
    return {
      ...exhibit,
      reactions: [{
        type: 'LIKE' as ReactionType,
        users: exhibit.likedBy
      }]
    };
  }

  return exhibit;
};

/**
 * Update legacy fields for backward compatibility
 */
export const updateLegacyFields = (exhibit: Exhibit): Exhibit => {
  const totalReactions = getTotalReactions(exhibit.reactions);
  const allUsers = exhibit.reactions?.flatMap(r => r.users) || [];

  return {
    ...exhibit,
    likes: totalReactions,
    likedBy: allUsers
  };
};
