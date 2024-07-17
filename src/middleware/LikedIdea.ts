import Like from '../models/Like';

/**
 * Checks if a user has liked a specific idea.
 * @param userId - The ID of the user.
 * @param ideaId - The ID of the idea.
 * @returns A boolean indicating if the user has liked the idea (true) or not (false).
 */
export const hasUserLikedIdea = async (userId: string, ideaId: string): Promise<boolean> => {
    try {
        const existingLike = await Like.findOne({ userId, ideaId });
        return !!existingLike;
    } catch (error) {
        console.error('Error checking if user liked the idea:', error);
        throw new Error('Failed to check if user liked the idea');
    }
};
