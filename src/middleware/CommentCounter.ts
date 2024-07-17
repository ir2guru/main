import Comment from '../models/Comment';
import Reply from '../models/Reply';

interface CommentCounts {
    totalComments: number;
    totalReplies: number;
    totalAll: number;
}

export const fetchCommentAndReplyCounts = async (ideaId: string): Promise<CommentCounts> => {
    try {
        // Fetch all comments for the given ideaId
        const comments = await Comment.find({ ideaId });

        // Initialize counters
        let totalReplies = 0;

        // Calculate the count of replies for each comment
        for (const comment of comments) {
            const replyCount = await Reply.countDocuments({ commentId: comment._id });
            totalReplies += replyCount;
        }

        return {
            totalComments: comments.length,
            totalAll: totalReplies + comments.length,
            totalReplies
        };
    } catch (error) {
        console.error('Error fetching comment and reply counts:', error);
        throw new Error('Failed to fetch comment and reply counts');
    }
};