import { Request, Response } from 'express';
import Document from '../models/Documents';
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import Thumb from '../models/thumb';
import User from '../models/user';
import Pitch from '../models/Pitch';
import Profile from '../models/Profile';
import fs from 'fs';
import cloudinary from '../config/cloudinary';
import Like from '../models/Like';
import Group from '../models/Group';
import Member from '../models/Member';
import ModifiedIdea from '../models/modifiedIdea';
import { fetchCommentAndReplyCounts } from '../middleware/CommentCounter';
import { count } from 'console';
import { getLikeCountForIdea } from '../middleware/LikeCount';
import { hasUserLikedIdea } from '../middleware/LikedIdea';
import { createNotification } from '../utilities/notificationUtils';
import { sendNotification } from '../middleware/sendNotification';
import Metadata, { IMetadata } from '../models/metadata';
import { checkAndAddUserView } from '../utils/checkAndAddUserView';
import { io } from '..';
import Idea from '../models/Idea';
import IdeaView from '../models/IdeaView';

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

  function calculateReadingTime(text: string): number {
    // Calculate the number of words in the text
    const words = text.trim().split(/\s+/).length;
  
    // Reading speed in words per minute
    const wordsPerMinute = 200;
  
    // Calculate the reading time in minutes
    const timeInMinutes = words / wordsPerMinute;
  
    // Convert the time to seconds
    const timeInSeconds = timeInMinutes * 60;
  
    // Return the total time in seconds
    return Math.ceil(timeInSeconds);
  }
  

  export const postIdea = async (req: Request, res: Response) => {
    const { headline, summary, category, body, minbud, maxbud, userId, pitches } = req.body;
    const createdAt = new Date();
    const ideaId = uuidv4();
  
    const idea = new Idea({
      _id: ideaId,
      headline,
      summary,
      body,
      minbud,
      maxbud,
      category,
      createdAt,
      userId,
      files: [],
    });
  
    try {
      await idea.save();
  
      const pitchArray = JSON.parse(pitches);
      const pitchDocuments = pitchArray.map((pitch: { step: string; count: number }) => ({
        ideaId: ideaId,
        step: pitch.step,
        count: pitch.count,
      }));
  
      const savedPitches = await Pitch.insertMany(pitchDocuments);
      console.log('Inserted pitches:', savedPitches);
  
      if (req.files && !Array.isArray(req.files)) {
        const files = req.files as { [fieldname: string]: Express.MulterS3.File[] };
  
        // Handle banner file
        const bannerFiles = files['banner'];
        if (bannerFiles && bannerFiles.length > 0) {
          const bannerFile = bannerFiles[0];
          const bannerFileUrl = bannerFile.location; // S3 file URL
  
          const thumb = new Thumb({
            originalName: bannerFile.originalname,
            mimeType: bannerFile.mimetype,
            size: bannerFile.size,
            ideaId: ideaId,
            path: bannerFileUrl, // Save the S3 URL
          });
  
          await thumb.save();
        }
  
        // Handle other files
        const uploadedFiles: any[] = [];
        const otherFiles = files['files'];
        if (otherFiles) {
          for (const file of otherFiles) {
            const fileId = uuidv4();
            const newFile = new Document({
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              ideaId: ideaId,
              path: file.location, // Save the S3 URL
            });
  
            await newFile.save();
  
            uploadedFiles.push({
              fileId,
              originalName: file.originalname,
            });
          }
        }
  
        if (uploadedFiles.length > 0) {
          await Idea.findByIdAndUpdate(ideaId, { $push: { files: uploadedFiles } });
        }
      }
  
      res.status(201).json({ message: 'Idea posted successfully', ideaId, fields: savedPitches });
    } catch (error) {
      console.error('Error posting idea:', error);
      res.status(500).json({ message: 'Failed to post idea' });
    }
  };

export const fetchIdeas = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query; // Assume userId is available on the request object

        // Fetch the first 30 ideas sorted by creation date in descending order
        const ideas = await Idea.find().sort({ createdAt: -1 }).limit(30).exec();

        // Fetch user details, profile details, and like status for each idea
        const ideasWithDetails = await Promise.all(ideas.map(async (idea) => {
            const user = await User.findById(idea.userId).select('fname lname');
            const profile = await Profile.findOne({ userId: idea.userId }).select('pow ppicture');
            const thumbs = await Thumb.findOne({ ideaId: idea.id }).select('path');
            const commentCounts = await fetchCommentAndReplyCounts(idea.id);
            const ideaLikeCount = await getLikeCountForIdea(idea.id);
            const userHasLiked = await Like.exists({ userId, ideaId: idea.id });
            const wpm = calculateReadingTime(idea.body);
            const viewCount = await IdeaView.countDocuments({ideaId: idea.id});
            

            return {
                ...idea.toObject(),
                fname: user?.fname,
                lname: user?.lname,
                pow: profile?.pow,
                banner: thumbs?.path,
                likes: ideaLikeCount,
                count: commentCounts.totalAll,
                profile: profile,
                wordpm: wpm,
                viewCount: viewCount,
                userHasLiked: !!userHasLiked // Convert to boolean
            };
        }));

        res.status(200).json({ ideas: ideasWithDetails });
    } catch (error) {
        console.error('Error fetching ideas:', error);
        res.status(500).json({ message: 'Failed to fetch ideas' });
    }
};


// Route 2: Fetch a specific idea with its related documents
export const getIdeaWithDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        // Fetch the specific idea by ID
        const idea = await Idea.findById(id).exec();
        if (!idea) {
            res.status(404).json({ message: 'Idea not found' });
            return;
        }

        const commentCounts = await fetchCommentAndReplyCounts(idea.id);

        // Fetch related documents for the specific idea
        const documents = await Document.find({ ideaId: id }).exec();
        const thumbs = await Thumb.find({ ideaId: id }).exec();
        const pitches = await Pitch.find({ ideaId: id }).exec();
        const user = await User.findById(idea.userId).select('fname lname');
        const profile = await Profile.findOne({ userId: idea.userId }).select('pow title ppicture');
        const wpm = calculateReadingTime(idea.body);
        const viewCount = await IdeaView.countDocuments({ideaId: idea.id});

        const ideaLikeCount = await getLikeCountForIdea(idea.id);

        let userHasLiked = false;

        if (userId) {
            const user = await User.findOne({ _id: userId }).exec();
            if (user) {
                await checkAndAddUserView(idea.id, userId.toString());
                userHasLiked = await hasUserLikedIdea(user._id, idea.id);
            } else {
                res.status(404).json({ message: 'User not found' });
                return;
            }
        }

       

        res.status(200).json({
            idea: idea.toObject(),
            userHasLiked,
            viewCounts: viewCount,
            likes: ideaLikeCount,
            count: commentCounts.totalAll,
            documents,
            thumbs,
            pitches,
            user,
            profile,
            wordpm : wpm
        });
    } catch (error) {
        console.error(`Error fetching idea with ID ${req.params.id}:`, error);
        res.status(500).json({ message: 'Failed to fetch the idea' });
    }
};


export const getModifiedIdeaWithDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Fetch the specific idea by ID
        const idea = await ModifiedIdea.findById({_id: id}).exec();
        if (!idea) {
            res.status(200).json({ message: 'Idea not found' });
            return;
        }

        const commentCounts = await fetchCommentAndReplyCounts(idea.id);

        // Fetch related documents for the specific idea
        const documents = await Document.find({ ideaId: idea._id }).exec();
        let thumbs = await Thumb.find({ ideaId: idea._id }).exec();
        
        // Check if thumbs is null, if so, fetch using originalIdeaId
        if (!thumbs || thumbs.length === 0) {
            thumbs = await Thumb.find({ ideaId: idea.originalIdeaId }).exec();
        }

        const pitches = await Pitch.find({ ideaId: idea._id }).exec();
        const user = await User.findById(idea.userId).select('fname lname');
        const profile = await Profile.findOne({ userId: idea.userId }).select('pow title ppicture');
        const ideaLikeCount = await getLikeCountForIdea(idea.id);
        const wpm = calculateReadingTime(idea.body);

        res.status(200).json({ 
            idea: idea.toObject(), 
            likes: ideaLikeCount, 
            documents, 
            thumbs, 
            pitches, 
            user, 
            profile,
            wordpm: wpm
        });
    } catch (error) {
        console.error(`Error fetching idea with ID ${req.params.id}:`, error);
        res.status(500).json({ message: 'Failed to fetch the idea' });
    }
};

export const modifyIdea = async (req: Request, res: Response) => {
    const { ideaId } = req.params;
    const { headline, summary, body, pitches, minbud, maxbud, category, userId } = req.body;
    const createdAt = new Date();

    try {
        // Find the original idea
        const originalIdea = await Idea.findById(ideaId);
        if (!originalIdea) {
            return res.status(404).json({ message: `Original idea not found ${ideaId}` });
        }

        const modiId = uuidv4();
        // Create a new modified idea
        const modifiedIdea = new ModifiedIdea({
            _id: modiId,
            headline,
            summary,
            body,
            minbud,
            maxbud,
            category,
            createdAt,
            userId: userId,
            originalIdeaId: ideaId,
        });

        // Save the modified idea
        await modifiedIdea.save();

        // Parse pitches
        let pitchArray = [];
        try {
            pitchArray = JSON.parse(pitches);
        } catch (error) {
            console.error('Error parsing pitches:', error);
            return res.status(400).json({ message: 'Invalid pitches format' });
        }

        const pitchDocuments = pitchArray.map((pitch: { step: string; count: number }) => ({
            ideaId: modiId, // Use the generated ideaId
            step: pitch.step,
            count: pitch.count,
        }));

        const savedPitches = await Pitch.insertMany(pitchDocuments);
        console.log('Inserted pitches:', savedPitches);

        if (req.files && !Array.isArray(req.files)) {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            // Handle banner files
            const bannerFiles = files['banner'];
            if (bannerFiles && bannerFiles.length > 0) {
                const bannerFile = bannerFiles[0];
                const filePath = bannerFile.path;

                try {
                    const result = await cloudinary.uploader.upload(filePath, { resource_type: 'image' });

                    const thumb = new Thumb({
                        originalName: bannerFile.originalname,
                        mimeType: bannerFile.mimetype,
                        size: bannerFile.size,
                        ideaId: modiId, // Use the correct ideaId
                        path: result.secure_url, // Save the Cloudinary URL
                    });

                    await thumb.save();

                    fs.unlinkSync(filePath);

                } catch (error) {
                    console.error('Error uploading image: ', error);
                    return res.status(500).send({ message: 'Failed to upload image' });
                }
            }

            // Handle other files
            const uploadedFiles: any[] = [];
            const otherFiles = files['files'];
            if (otherFiles) {
                for (const file of otherFiles) {
                    const fileId = uuidv4();
                    const newFile = new Document({
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                        size: file.size,
                        ideaId: modiId, // Link file to the idea
                        path: 'uploads/' + file.filename, // Save the file path
                    });

                    await newFile.save();

                    uploadedFiles.push({
                        fileId,
                        originalName: file.originalname
                    });
                }
            }

            if (uploadedFiles.length > 0) {
                await ModifiedIdea.findByIdAndUpdate(modiId, { $push: { files: uploadedFiles } });
            }
        }

        res.status(201).json({ message: 'Idea Modified successfully', modiId, fields: savedPitches });
    } catch (error) {
        console.error('Error modifying idea:', error);
        res.status(500).json({ message: 'Failed to modify idea' });
    }
};
export const fetchIdeaByStatus = async (req: Request, res: Response) => {
    try {
        const { status, userId} = req.query; // Accessing status from query parameters

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        // Fetch ideas where userId matches and status matches the query parameter
        const ideas = await Idea.find({ userId, status });

        const ideasWithDetails = await Promise.all(ideas.map(async (idea) => {
            const user = await User.findById(idea.userId).select('fname lname');
            const thumbs = await Thumb.findOne({ ideaId: idea.id }).select('path');
            const commentCounts = await fetchCommentAndReplyCounts(idea.id);
            const ideaLikeCount = await getLikeCountForIdea(idea.id);
            const profile = await Profile.findOne({ userId: idea.userId });
            const wpm = calculateReadingTime(idea.body);
            return {
                ...idea.toObject(),
                fname: user?.fname,
                lname: user?.lname,
                banner: thumbs?.path,
                likes: ideaLikeCount,
                count: commentCounts.totalAll,
                profile: profile,
                wordpm: wpm
            };
        }));

        if (ideas.length === 0) {
            return res.status(404).json({ message: `No ideas found with status: ${status} for this user` });
        }

        res.status(200).json({
            message: 'Ideas fetched successfully',
            ideasWithDetails
        });
    } catch (error) {
        console.error('Error fetching user ideas:', error);
        res.status(500).json({ message: 'Failed to fetch user ideas' });
    }
};

export const likeIdea = async (req: Request, res: Response) => {
    const { ideaId } = req.params;
    const { userId } = req.body;

    try {
        // Check if the user has already liked the idea
        const existingLike = await Like.findOne({ userId, ideaId });
        const username = await User.findById(userId);

        if (existingLike) {
            // Unlike the idea if it's already liked
            await Like.deleteOne({ _id: existingLike._id });
            res.status(200).json({ message: 'Idea unliked successfully', liked : false  });
            console.log("false");
        } else {
            const IdeaPosted = await Idea.findOne({ _id: ideaId });
            if (!IdeaPosted) {
                return res.status(404).json({ message: 'Idea not found' });
            }
    
            const IdeaUser = IdeaPosted.userId;
            if (!IdeaUser) {
                return res.status(404).json({ message: 'User who posted the idea not found' });
            }

            const user = await User.findById(IdeaUser).select('fname lname');
            // Like the idea if it hasn't been liked yet
            const newLike = new Like({ userId, ideaId });
            await newLike.save();
            const datameta = new Metadata({
                groupId: '',         // Replace with actual values
                userId: IdeaUser,                  // Assuming IdeaUser is the userId
                memberId: '',                // Assuming memberId is the same as userId
                iniciatorId: userId, // Replace with actual value
                username: `${username?.fname} ${username?.lname}`,         // Assuming username object has fname property
                typeId: ideaId       // Assuming IdeaPosted object has headline property
            });
            
            // const notificationTitle = `${username?.fname} Just Liked Your Idea ${IdeaPosted?.headline}`;
            const notificationTitle = `${username?.fname} Just Liked Your Idea ${IdeaPosted?.headline}`;

            //await sendNotifi(IdeaUser, `Your Idea Got A Like`, notificationTitle);
            await createNotification('Your Idea Got A Like', 'Like', notificationTitle, datameta);
            const notificationMessage = "New Notification";
            const notificationStatus = "true";
            
            const newNotification = {
                message: notificationMessage,
                status: notificationStatus
            };
            
            // Assuming `IdeaUser` is the ID of the user to be notified
            io.to(IdeaUser).emit('newNotification', newNotification);
        }
    } catch (error) {
        console.error('Error liking/unliking idea:', error);
        res.status(500).json({ message: 'Failed to like/unlike idea' });
    }
};

export const fetchActiveIdeasByCategory = async (req: Request, res: Response) => {
    const { category } = req.params;

    if (!category) {
        return res.status(400).json({ message: 'Category is required' });
    }

    try {
        // Fetch ideas where category matches and status is 'allowed'
        const ideas = await Idea.find({ category, status: 'allowed' });

        if (ideas.length === 0) {
            return res.status(404).json({ message: `No active ideas found in category: ${category}` });
        }

        // Fetch the additional variable for each idea
        const ideasWithAdditionalData = await Promise.all(
            ideas.map(async (idea) => {
                const commentCounts = await fetchCommentAndReplyCounts(idea.id);
                const ideaLikeCount = await getLikeCountForIdea(idea.id);
                const profile = await Profile.findOne({ userId: idea.userId });
                const thumbs = await Thumb.find({ ideaId: idea.id }).exec();
                const user = await User.findById(idea.userId).select('fname lname');
                const wpm = calculateReadingTime(idea.body);
                
                return {
                    ...idea.toObject(),
                    user: user,
                    likes: ideaLikeCount,
                    count: commentCounts.totalAll, // Add the fetched variable to the idea object
                    profile: profile,
                    thumb: thumbs,
                    wordpm: wpm
                };
            })
        );

        res.status(200).json({
            message: 'Active ideas fetched successfully',
            ideas: ideasWithAdditionalData
        });
    } catch (error) {
        console.error('Error fetching active ideas by category:', error);
        res.status(500).json({ message: 'Failed to fetch active ideas' });
    }
};

export const fetchGroupsByIdeaId = async (req: Request, res: Response) => {
    const { ideaId } = req.params;
    const { userId } = req.query;

    if (!ideaId) {
        return res.status(400).json({ message: 'Idea ID is required' });
    }

    try {
        // Fetch groups where ideaId matches the provided ideaId
        const groups = await Group.find({ ideaId });

        if (groups.length === 0) {
            return res.status(200).json({ message: `No groups found for ideaId: ${ideaId}`, groups });
        }

        // Fetch the user who created the idea
        const idea = await Idea.findById(ideaId).populate('userId');
        if (!idea) {
            return res.status(404).json({ message: 'Idea not found' });
        }
        const creatorProfile = await User.findOne({ _id: idea.userId });
        const creatorDetails = await Profile.findOne({ userId: idea.userId });
        const IdeaTitle = await Idea.findOne({ _id: ideaId });

        // Fetch the admin's first name for each group and check the member status
        const groupDetails = await Promise.all(groups.map(async (group) => {
            const adminProfile = await User.findOne({ _id: group.admin });
            const member = await Member.findOne({ userId: userId, groupId: group._id });

            let canJoin = false;
            let status = 'Not a member';
            if (member) {
                if (member.status === 'accepted') {
                    canJoin = true;
                    status = 'Accepted';
                }else if (member.status === 'declined') {
                    canJoin = false;
                    status = 'Declined';
                } else if (member.status === 'suspended') {
                    canJoin = false;
                    status = 'Suspended';
                } else if (member.status === 'pending') {
                    canJoin = false;
                    status = 'Pending';
                }else if (member.status === 'requested') {
                    canJoin = false;
                    status = 'requested';
                }
            }

            return {
                ...group.toObject(),
                adminFname: adminProfile ? adminProfile.fname : 'Admin not found',
                canJoin,
                status
            };
        }));

        res.status(200).json({
            message: 'Groups fetched successfully',
            title: IdeaTitle?.headline,
            description: IdeaTitle?.summary,
            ideaCreator: creatorProfile ? { fname: creatorProfile.fname, lname: creatorProfile.lname, pow: creatorDetails?.pow, url: creatorDetails?.ppicture } : 'Creator not found',
            groups: groupDetails
        });
    } catch (error) {
        console.error('Error fetching groups by ideaId:', error);
        res.status(500).json({ message: 'Failed to fetch groups' });
    }
};
export const fetchTopIdeasByLikes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { limit, userId, category } = req.query;

        if (!limit || isNaN(Number(limit))) {
            res.status(400).json({ message: 'Valid limit is required' });
            return;
        }

        const parsedLimit = parseInt(limit as string, 10);

        // Build the aggregation pipeline
        const pipeline: any[] = [
            {
                $lookup: {
                    from: 'likes',
                    localField: '_id',
                    foreignField: 'ideaId',
                    as: 'likes'
                }
            },
            {
                $addFields: {
                    likeCount: { $size: '$likes' }
                }
            },
            {
                $lookup: {
                    from: 'thumbs',
                    localField: '_id',
                    foreignField: 'ideaId',
                    as: 'thumbs'
                }
            },
            {
                $addFields: {
                    thumbPath: { $arrayElemAt: ['$thumbs.path', 0] }
                }
            },
            {
                $sort: { likeCount: -1 }
            },
            {
                $limit: parsedLimit
            },
            {
                $project: {
                    likes: 0,
                    thumbs: 0
                }
            }
        ];

        // Add category filter if provided
        if (category) {
            pipeline.unshift({
                $match: {
                    category: category
                }
            });
        }

        // Fetch the ideas, populate with the number of likes, and thumb paths
        const ideasWithDetails = await Idea.aggregate(pipeline).sort({createdAt: -1});

        // Loop through each idea and fetch user details
        const ideasWithUserDetails = await Promise.all(
            ideasWithDetails.map(async (idea) => {
                const user = await User.findById(idea.userId).select('fname lname');
                const profile = await Profile.findOne({ userId: idea.userId });
                const wpm = calculateReadingTime(idea.body);
                const commentCounts = await fetchCommentAndReplyCounts(idea.id);
                const ideaLikeCount = await getLikeCountForIdea(idea.id);
                const viewCount = await IdeaView.countDocuments({ideaId: idea.id});
                let userHasLiked = false;

                // Check if userId is provided and valid
                if (userId && userId !== '' && userId !== 'undefined' && userId !== 'null') {
                    const foundUser = await User.findById(userId).exec();
                    if (foundUser) {
                        userHasLiked = await hasUserLikedIdea(foundUser._id, idea._id);
                    } else {
                        res.status(200).json({ message: 'User not found' });
                        return;
                    }
                }

                return {
                    ...idea,
                    fname: user?.fname || '',
                    lname: user?.lname || '',
                    ppicture: profile?.ppicture || '',
                    pow: profile?.pow,
                    position: profile?.position,
                    hasliked: userHasLiked,
                    wordpm: wpm,
                    likeCount: ideaLikeCount,
                    count: commentCounts.totalAll,
                    viewCount: viewCount
                };
            })
        );

        res.status(200).json({
            message: 'Top ideas fetched successfully',
            ideas: ideasWithUserDetails
        });
    } catch (error) {
        console.error('Error fetching top ideas by likes:', error);
        res.status(500).json({ message: 'Failed to fetch top ideas' });
    }
};


export const fetchTopIdeasByViews = async (req: Request, res: Response): Promise<void> => {
    try {
        const { limit, userId, category } = req.query;

        if (!limit || isNaN(Number(limit))) {
            res.status(400).json({ message: 'Valid limit is required' });
            return;
        }

        const parsedLimit = parseInt(limit as string, 10);

        // Build the aggregation pipeline
        const pipeline: any[] = [
            {
                $lookup: {
                    from: 'ideaviews',
                    localField: '_id',
                    foreignField: 'ideaId',
                    as: 'views'
                }
            },
            {
                $addFields: {
                    viewCount: { $size: '$views' }
                }
            },
            {
                $lookup: {
                    from: 'thumbs',
                    localField: '_id',
                    foreignField: 'ideaId',
                    as: 'thumbs'
                }
            },
            {
                $addFields: {
                    thumbPath: { $arrayElemAt: ['$thumbs.path', 0] }
                }
            },
            {
                $sort: { viewCount: -1 }
            },
            {
                $limit: parsedLimit
            },
            {
                $project: {
                    views: 0,
                    thumbs: 0
                }
            }
        ];

        // Add category filter if provided
        if (category) {
            pipeline.unshift({
                $match: {
                    category: category
                }
            });
        }

        // Fetch the ideas, populate with the number of views, and thumb paths
        const ideasWithDetails = await Idea.aggregate(pipeline).sort({ createdAt: -1 });

        // Loop through each idea and fetch user details
        const ideasWithUserDetails = await Promise.all(
            ideasWithDetails.map(async (idea) => {
                const user = await User.findById(idea.userId).select('fname lname');
                const profile = await Profile.findOne({ userId: idea.userId }).select('ppicture');
                const wpm = calculateReadingTime(idea.body);
                const commentCounts = await fetchCommentAndReplyCounts(idea.id);
                const ideaLikeCount = await getLikeCountForIdea(idea.id);
                const viewCount = await IdeaView.countDocuments({ideaId: idea.id});

                let userHasLiked = false;
                if (userId) {
                    const user = await User.findOne({ _id: userId }).exec();
                    if (user) {
                        userHasLiked = await hasUserLikedIdea(user._id, idea._id);
                    } else {
                        res.status(200).json({ message: 'User not found' });
                        return;
                    }
                }

                return {
                    ...idea,
                    fname: user?.fname || '',
                    lname: user?.lname || '',
                    ppicture: profile?.ppicture || '',
                    pow: profile?.pow,
                    position: profile?.position,
                    hasliked: userHasLiked,
                    wordpm: wpm,
                    likeCount: ideaLikeCount,
                    count: commentCounts.totalAll,
                    viewCount: viewCount
                };
            })
        );

        res.status(200).json({
            message: 'Top ideas fetched successfully',
            ideas: ideasWithUserDetails
        });
    } catch (error) {
        console.error('Error fetching top ideas by views:', error);
        res.status(500).json({ message: 'Failed to fetch top ideas' });
    }
};


export const fetchModifiedIdeasByUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

        if (!userId) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }

        // Fetch modified ideas created by the user
        const modifiedIdeas = await ModifiedIdea.find({ userId })
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order (most recent first)
        .exec();

        if (!modifiedIdeas.length) {
            res.status(200).json({ message: 'No modified ideas found for this user' });
            return;
        }

        // Fetch user details and profile details for each modified idea
        const modifiedIdeasWithDetails = await Promise.all(
            modifiedIdeas.map(async (modifiedIdea) => {
                const user = await User.findById(modifiedIdea.userId).select('fname lname');
                const profile = await Profile.findOne({ userId: modifiedIdea.userId }).select('ppicture');
                const OgIdea = await Idea.findOne({_id: modifiedIdea.originalIdeaId}).select('headline');
                const wpm = calculateReadingTime(modifiedIdea.body);

                return {
                    ...modifiedIdea.toObject(),
                    fname: user?.fname || '',
                    lname: user?.lname || '',
                    ppicture: profile?.ppicture || '',
                    pow: profile?.pow,
                    position: profile?.position,
                    originalTitle: OgIdea?.headline,
                    wordpm: wpm

                };
            })
        );

        res.status(200).json({
            message: 'Modified ideas fetched successfully',
            modifiedIdeas: modifiedIdeasWithDetails
        });
    } catch (error) {
        console.error('Error fetching modified ideas:', error);
        res.status(500).json({ message: 'Failed to fetch modified ideas' });
    }
};

