import express, { Request, Response } from 'express';
import { commentOnIdea, replyToComment, fetchCommentsAndRepliesByIdeaId } from '../controllers/commentController';

const router = express.Router();


// Route to comment on an idea
router.post('/ideas/:ideaId/comments', commentOnIdea);

// Route to reply to a comment
router.post('/comments/:commentId/replies', replyToComment);

router.get('/ideas/:ideaId/getcomments', fetchCommentsAndRepliesByIdeaId);

module.exports = router;
