import { Request, Response } from 'express';
import Comment from '../models/Comment';
import Reply from '../models/Reply';
import Idea from '../models/Idea';
import User from '../models/user';
import { createNotification } from '../utilities/notificationUtils';
import { sendNotification } from '../middleware/sendNotification';
import Profile from '../models/Profile';
import Metadata, { IMetadata } from '../models/metadata';
import { notifyUser } from '../middleware/socket';
import { io } from '..';


const sendNotifi = async (userId: string, title: string, body: string) => {
    try {
      // Fetch user profile
      const profile = await Profile.findOne({ userId });
  
      // Check if profile and FCM token exist
      if (!profile || !profile.fcmtoken) {
        console.log('FCM token not found for user or profile does not exist.');
        return;
      }
  
      const token = profile.fcmtoken;
  
      // Check if required parameters are provided
      if (!token || !title || !body) {
        console.log('Token, title, and body are required.');
        return;
      }
  
      // Send notification
      await sendNotification(token, { title, body });
      console.log('Notification sent successfully.');
    } catch (error) {
      console.error('Error sending notification:', error);
      console.log('Failed to send notification.');
    }
  };
  
export const commentOnIdea = async (req: Request, res: Response) => {
    const { ideaId } = req.params;
    const { userId, content } = req.body;

    try {
        // Create and save the new comment
        const newComment = new Comment({
            ideaId,
            userId,
            content,
            replies: []
        });

        await newComment.save();

        // Fetch the idea
        const IdeaPosted = await Idea.findById(ideaId);
        if (!IdeaPosted) {
            console.error('Idea not found with ID:', ideaId);
            return res.status(404).json({ message: 'Idea not found' });
        }

        // Fetch the username
        const username = await User.findById(userId);
        if (!username) {
            console.error('User not found with ID:', userId);
            return res.status(404).json({ message: 'User not found' });
        }

        const datameta = new Metadata({
            groupId: '',         // Replace with actual values
            userId: IdeaPosted.userId,                  // Assuming IdeaUser is the userId
            memberId: '',                // Assuming memberId is the same as userId
            iniciatorId: userId, // Replace with actual value
            username: `${username?.fname} ${username?.lname}`,         // Assuming username object has fname property
            typeId: ideaId       // Assuming IdeaPosted object has headline property
        });

        // Create the notification
        const notificationTitle = `${username.fname} Just Commented On ${IdeaPosted.headline}`;
        // await createNotification(notificationTitle, IdeaPosted.userId.toString(), 'Comment', ideaId.toString());
        //await createNotification('New Comment on your Idea',IdeaPosted.userId, 'Comment',  notificationTitle,'',ideaId,`${username?.fname} ${username?.lname}`, userId);
        await sendNotifi(IdeaPosted.userId,`Your Idea Got A Comment`, notificationTitle,);
        await createNotification('New Comment on your Idea', 'Comment', notificationTitle, datameta);
        notifyUser(userId, 'you have a new notification');
        const notificationMessage = "New Notification";
        const notificationStatus = "true";
            
            const newNotification = {
                message: notificationMessage,
                status: notificationStatus
            };
            
            // Assuming `IdeaUser` is the ID of the user to be notified
            io.to(IdeaPosted.userId).emit('newNotification', newNotification);
        //console.log("LLLLF");

        res.status(201).json({ message: 'Comment posted successfully', comment: newComment });
    } catch (error) {
        console.error('Error posting comment:', error);
        res.status(500).json({ message: 'Failed to post comment' });
    }
};

export const replyToComment = async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const { userId, content, repliedToUserId } = req.body;

    try {
        // Check if the comment exists
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Create and save the new reply
        const newReply = new Reply({
            commentId,
            userId,
            repliedToUserId,
            content
        });

        await newReply.save();

        const CommentPosted = await Comment.findOne({ _id: commentId });
        if (!CommentPosted) {
            return res.status(404).json({ message: 'Idea not found' });
        }

        const IdeaId = CommentPosted.ideaId;
        if (!IdeaId) {
            return res.status(404).json({ message: 'User who posted the idea not found' });
        }

        const IdeaPosted = await Idea.findOne({ _id: IdeaId });
            if (!IdeaPosted) {
                return res.status(404).json({ message: 'Idea not found' });
        }

        const username = await User.findById(userId);

        // Add the reply ID to the comment's replies array
        comment.replies.push(newReply._id);
        await comment.save();

        const datameta = new Metadata({
            groupId: '',         // Replace with actual values
            userId: repliedToUserId,                  // Assuming IdeaUser is the userId
            memberId: '',                // Assuming memberId is the same as userId
            iniciatorId: userId, // Replace with actual value
            username: `${username?.fname} ${username?.lname}`,         // Assuming username object has fname property
            typeId: IdeaId       // Assuming IdeaPosted object has headline property
        });

        const notificationTitle = `${username?.fname} ${username?.lname} Just Replied Your Comment: ${CommentPosted.content} On ${IdeaPosted?.headline}`;
        //await createNotification(notificationTitle, repliedToUserId.toString(), 'Reply', IdeaId.toString());
        await createNotification('New Reply on your Comment','Reply',  notificationTitle, datameta);
        await sendNotifi(repliedToUserId,`Your Idea Got A Reply`, notificationTitle,);
        const notificationMessage = "New Notification";
        const notificationStatus = "true";
            
            const newNotification = {
                message: notificationMessage,
                status: notificationStatus
            };
            
            // Assuming `IdeaUser` is the ID of the user to be notified
            io.to(repliedToUserId).emit('newNotification', newNotification);
        res.status(201).json({ message: 'Reply posted successfully', reply: newReply });
    } catch (error) {
        console.error('Error posting reply:', error);
        res.status(500).json({ message: 'Failed to post reply' });
    }
};

export const fetchCommentsAndRepliesByIdeaId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ideaId } = req.params;

        if (!ideaId) {
            res.status(400).json({ message: 'Idea ID is required' });
            return;
        }

        // Fetch comments associated with the ideaId
        const comments = await Comment.find({ ideaId }).exec();

        if (!comments.length) {
            res.status(200).json({ message: `No comments found for ideaId: ${ideaId}` });
            return;
        }

        // Fetch user details for each comment and reply
        const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
            // Fetch user details for the comment
            const commentUser = await User.findById(comment.userId).select('fname lname').exec();
            const commentProfile = await Profile.findOne({ userId: comment.userId }).select('ppicture').exec();
            const replies = await Reply.find({ commentId: comment._id }).exec();

            const repliesWithUserDetails = await Promise.all(replies.map(async (reply) => {
                // Fetch user details for the reply
                const replyUser = await User.findById(reply.userId).select('fname lname').exec();
                const replyProfile = await Profile.findOne({ userId: reply.userId }).select('ppicture').exec();
                return {
                    ...reply.toObject(),
                    user: replyUser ? {
                        fname: replyUser.fname,
                        lname: replyUser.lname,
                        ppicture: replyProfile ? replyProfile.ppicture : null,
                    } : null
                };
            }));

            return {
                ...comment.toObject(),
                user: commentUser ? {
                    fname: commentUser.fname,
                    lname: commentUser.lname,
                    ppicture: commentProfile ? commentProfile.ppicture : null,
                } : null,
                replies: repliesWithUserDetails
            };
        }));

        res.status(200).json({
            message: 'Comments and replies fetched successfully',
            comments: commentsWithReplies
        });
    } catch (error) {
        console.error('Error fetching comments and replies:', error);
        res.status(500).json({ message: 'Failed to fetch comments and replies' });
    }
};

export const fetchRepliesByCommentId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { commentId } = req.params;

        if (!commentId) {
            res.status(200).json({ message: 'Comment ID is required' });
            return;
        }

        // Fetch replies using commentId
        const replies = await Reply.find({ commentId }).exec();

        if (!replies.length) {
            res.status(200).json({ message: 'No replies found for this comment' });
            return;
        }

        // Fetch user details and profile details for each reply
        const repliesWithDetails = await Promise.all(
            replies.map(async (reply) => {
                const user = await User.findById(reply.userId).select('fname lname');
                const profile = await Profile.findOne({ userId: reply.userId }).select('ppicture');

                return {
                    ...reply.toObject(),
                    fname: user?.fname || '',
                    lname: user?.lname || '',
                    ppicture: profile?.ppicture || ''
                };
            })
        );

        res.status(200).json({
            message: 'Replies fetched successfully',
            replies: repliesWithDetails
        });
    } catch (error) {
        console.error('Error fetching replies by comment ID:', error);
        res.status(500).json({ message: 'Failed to fetch replies' });
    }
};