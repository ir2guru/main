import Like from '../models/Like';

/**
 * Fetches the total count of likes for a given ideaId.
 * @param ideaId - The ID of the idea to get the like count for.
 * @returns The total count of likes.
 */
export const getLikeCountForIdea = async (ideaId: string): Promise<number> => {
    try {
        const likeCount = await Like.countDocuments({ ideaId });
        return likeCount;
    } catch (error) {
        console.error('Error fetching like count:', error);
        throw new Error('Failed to fetch like count');
    }
};