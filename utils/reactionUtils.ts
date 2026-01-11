import { Reaction, ReactionType, Exhibit } from '../types';

/**
 * Toggle user's reaction on an exhibit
 * If user has the same reaction type - remove it
 * If user has a different reaction type - replace it
 * If user has no reaction - add it
 */
export const toggleReaction = (
  reactions: Reaction[] = [],
  username: string,
  reactionType: ReactionType
): Reaction[] => {
  // Find if user already has any reaction
  const existingReactionIndex = reactions.findIndex(r => r.users.includes(username));

  // Create a copy of reactions array
  let newReactions = [...reactions];

  if (existingReactionIndex !== -1) {
    const existingReaction = newReactions[existingReactionIndex];

    // If same reaction type - remove user (toggle off)
    if (existingReaction.type === reactionType) {
      newReactions[existingReactionIndex] = {
        ...existingReaction,
        users: existingReaction.users.filter(u => u !== username)
      };

      // Remove reaction type if no users left
      if (newReactions[existingReactionIndex].users.length === 0) {
        newReactions.splice(existingReactionIndex, 1);
      }
    } else {
      // Different reaction type - remove from old, add to new
      // Remove from old
      newReactions[existingReactionIndex] = {
        ...existingReaction,
        users: existingReaction.users.filter(u => u !== username)
      };

      // Remove reaction type if no users left
      if (newReactions[existingReactionIndex].users.length === 0) {
        newReactions.splice(existingReactionIndex, 1);
      }

      // Add to new reaction type
      const newReactionIndex = newReactions.findIndex(r => r.type === reactionType);
      if (newReactionIndex !== -1) {
        newReactions[newReactionIndex] = {
          ...newReactions[newReactionIndex],
          users: [...newReactions[newReactionIndex].users, username]
        };
      } else {
        newReactions.push({
          type: reactionType,
          users: [username]
        });
      }
    }
  } else {
    // User has no reaction - add new one
    const reactionIndex = newReactions.findIndex(r => r.type === reactionType);
    if (reactionIndex !== -1) {
      newReactions[reactionIndex] = {
        ...newReactions[reactionIndex],
        users: [...newReactions[reactionIndex].users, username]
      };
    } else {
      newReactions.push({
        type: reactionType,
        users: [username]
      });
    }
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
 * Get user's reaction type if any
 */
export const getUserReaction = (
  reactions: Reaction[] = [],
  username: string
): ReactionType | null => {
  const reaction = reactions.find(r => r.users.includes(username));
  return reaction?.type || null;
};

/**
 * Check if user has reacted with any type
 */
export const hasUserReacted = (
  reactions: Reaction[] = [],
  username: string
): boolean => {
  return reactions.some(r => r.users.includes(username));
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
