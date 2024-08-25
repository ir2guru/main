import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/user';
import Group from '../models/Group';
import Idea from '../models/Idea';
import Thumb from '../models/thumb';
import Member from '../models/Member';
import Profile from '../models/Profile';
import { getLikeCountForIdea } from '../middleware/LikeCount';
import { fetchCommentAndReplyCounts } from '../middleware/CommentCounter';
import IdeaView from '../models/IdeaView';
import ModifiedIdea from '../models/modifiedIdea';
import { hasUserLikedIdea } from '../middleware/LikedIdea';


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
  

export const getGroupsByAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, userId } = req.query;

        // Validate that search is provided
        if (search && typeof search !== 'string') {
            res.status(400).json({ message: 'Search parameter must be a string' });
            return;
        }

        if (userId && typeof userId !== 'string') {
            res.status(400).json({ message: 'User ID must be a string' });
            return;
        }

        // Build the query object for user search
        const userQuery: any = {
            $or: [
                { fname: new RegExp(search || '', 'i') }, // Case-insensitive partial match for fname
                { lname: new RegExp(search || '', 'i') }  // Case-insensitive partial match for lname
            ]
        };

        // Find users matching the query
        const users = await User.find(userQuery).exec();

        if (users.length === 0) {
            res.status(404).json({ message: 'No users found matching the criteria' });
            return;
        }

        // Extract user IDs
        const userIds = users.map(user => user._id);

        // Fetch all groups where the admin matches any of the user IDs
        const groups = await Group.find({ admin: { $in: userIds } }).exec();

        if (groups.length === 0) {
            res.status(404).json({ message: 'No groups found' });
            return;
        }

        // Extract idea IDs from the groups
        const ideaIds = Array.from(new Set(groups.map(group => group.ideaId)));

        // Fetch idea details
        const ideas = await Idea.find({ _id: { $in: ideaIds } }).exec();
        const ideaMap = new Map(ideas.map(idea => [idea._id.toString(), idea.headline]));

        // Fetch thumbnail paths for each idea
        const thumbs = await Thumb.find({ ideaId: { $in: ideaIds } }).exec();
        const thumbMap = new Map(thumbs.map(thumb => [thumb.ideaId, thumb.path]));

        // Fetch profile details for the admins
        const profiles = await Profile.find({ userId: { $in: userIds } }).exec();
        const profileMap = new Map(profiles.map(profile => [profile.userId.toString(), { pow: profile.pow, ppicture: profile.ppicture }]));

        // If userId is provided, check group membership
        const memberships = userId
            ? await Member.find({ userId: userId as string, groupId: { $in: groups.map(group => group._id.toString()) } }).exec()
            : [];

        const membershipMap = new Map(memberships.map(membership => [membership.groupId, membership.status]));

        // Include user details, profile details, idea headline, and thumbnail path in the groups response
        const groupsWithDetails = groups.map(group => ({
            ...group.toObject(),
            adminName: {
                fname: users.find(user => user._id.toString() === group.admin.toString())?.fname || 'Unknown',
                lname: users.find(user => user._id.toString() === group.admin.toString())?.lname || 'Unknown'
            },
            adminPow: profileMap.get(group.admin.toString())?.pow || 'Not available',
            adminPpicture: profileMap.get(group.admin.toString())?.ppicture || 'Not available',
            ideaHeadline: ideaMap.get(group.ideaId.toString()) || 'Unknown',
            thumbnailPath: thumbMap.get(group.ideaId.toString()) || 'Not available',
            userMembershipStatus: userId ? membershipMap.get(group._id.toString()) || 'Not a member' : 'Not checked'
        }));

        res.status(200).json({
            message: 'Groups fetched successfully',
            groups: groupsWithDetails,
        });
    } catch (error) {
        console.error('Error fetching groups by admin:', error);
        res.status(500).json({ message: 'Could not fetch groups' });
    }
};
export const getGroupsByIdea = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, userId } = req.query;

        // Validate that search is provided
        if (search && typeof search !== 'string') {
            res.status(400).json({ message: 'Search parameter must be a string' });
            return;
        }

        if (userId && typeof userId !== 'string') {
            res.status(400).json({ message: 'User ID must be a string' });
            return;
        }

        let groups;

        if (search) {
            // If search parameter is provided, find ideas matching the headline
            const ideas = await Idea.find({ headline: new RegExp(search, 'i') }).exec();

            if (ideas.length === 0) {
                res.status(404).json({ message: 'No ideas found matching the criteria' });
                return;
            }

            // Extract idea IDs and headlines
            const ideaData = ideas.map(idea => ({
                id: idea._id.toString(),
                headline: idea.headline
            }));

            // Fetch all groups where the ideaId matches any of the idea IDs
            groups = await Group.find({ ideaId: { $in: ideaData.map(idea => idea.id) } }).exec();
        } else {
            // If no search parameter is provided, fetch all groups
            groups = await Group.find().exec();
        }

        if (groups.length === 0) {
            res.status(404).json({ message: 'No groups found' });
            return;
        }

        // Extract user IDs for the admins of the groups
        const adminIds = Array.from(new Set(groups.map(group => group.admin)));

        // Fetch user details for the admins
        const users = await User.find({ _id: { $in: adminIds } }).exec();
        const userMap = new Map(users.map(user => [user._id.toString(), { fname: user.fname, lname: user.lname }]));

        // Fetch profile details for the admins
        const profiles = await Profile.find({ userId: { $in: adminIds } }).exec();
        const profileMap = new Map(profiles.map(profile => [profile.userId.toString(), { pow: profile.pow, ppicture: profile.ppicture }]));

        // Fetch idea details for each group
        const ideaIds = Array.from(new Set(groups.map(group => group.ideaId)));
        const ideas = await Idea.find({ _id: { $in: ideaIds } }).exec();
        const ideaMap = new Map(ideas.map(idea => [idea._id.toString(), idea.headline]));

        // Fetch thumbnail paths for each idea
        const thumbs = await Thumb.find({ ideaId: { $in: ideaIds } }).exec();
        const thumbMap = new Map(thumbs.map(thumb => [thumb.ideaId, thumb.path]));

        // If userId is provided, check group membership
        const memberships = userId
            ? await Member.find({ userId: userId as string, groupId: { $in: groups.map(group => group._id.toString()) } }).exec()
            : [];

        const membershipMap = new Map(memberships.map(membership => [membership.groupId, membership.status]));

        // Include user details, profile details, idea headline, and thumbnail path in the groups response
        const groupsWithDetails = groups.map(group => ({
            ...group.toObject(),
            adminName: userMap.get(group.admin.toString()) || { fname: 'Unknown', lname: 'Unknown' },
            adminPow: profileMap.get(group.admin.toString())?.pow || 'Not available',
            adminPpicture: profileMap.get(group.admin.toString())?.ppicture || 'Not available',
            ideaHeadline: ideaMap.get(group.ideaId.toString()) || 'Unknown',
            thumbnailPath: thumbMap.get(group.ideaId.toString()) || 'Not available',
            userMembershipStatus: userId ? membershipMap.get(group._id.toString()) || 'Not a member' : 'Not checked'
        }));

        res.status(200).json({
            message: 'Groups fetched successfully',
            groups: groupsWithDetails,
        });
    } catch (error) {
        console.error('Error fetching groups by idea:', error);
        res.status(500).json({ message: 'Could not fetch groups' });
    }
};

export const searchIdeasByHeadline = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query, page = 1, limit = 10 } = req.query;

        const searchQuery = query ? String(query) : '';

        // Calculate pagination variables
        const pageNumber = parseInt(page as string, 10) || 1;
        const resultsPerPage = parseInt(limit as string, 10) || 10;
        const skip = (pageNumber - 1) * resultsPerPage;

        // Create the search condition
        const searchCondition = searchQuery
            ? { headline: { $regex: new RegExp(searchQuery, 'i') } }
            : {};

        // Fetch the ideas matching the search condition with pagination
        const ideas = await Idea.find(searchCondition)
            .skip(skip)
            .limit(resultsPerPage)
            .sort({ createdAt: -1 })
            .exec();

        // Fetch user details and profile details for each idea
        const ideasWithDetails = await Promise.all(ideas.map(async (idea) => {
            const user = await User.findById(idea.userId).select('fname lname');
            // const profile = await Profile.findOne({ userId: idea.userId }).select('ppicture');
            const profile = await Profile.findOne({ userId: idea.userId  });
            const commentCounts = await fetchCommentAndReplyCounts(idea._id);
            const ideaLikeCount = await getLikeCountForIdea(idea._id);
            const thumbs = await Thumb.find({ ideaId: idea._id }).exec();
            const viewCount = await IdeaView.countDocuments({ideaId: idea._id});
            const wpm = calculateReadingTime(idea.body);
            const originalIdeaId = idea._id; 
            const modifyCount = await ModifiedIdea.countDocuments({ originalIdeaId });
            console.log('originalIdeaId:', originalIdeaId);
            console.log('modifyCount:', modifyCount); // Debugging
            let modified = false;
            if (modifyCount > 0) {
                 modified = true;
            }


            return {
                ...idea.toObject(),
                fname: user?.fname,
                lname: user?.lname,
                ppicture: profile?.ppicture,
                commentCounts: commentCounts,
                ideaLikeCount: ideaLikeCount,
                viewCount : viewCount,
                thumbPath: thumbs.map(thumb => thumb.path), // If you only need paths
                wordpm: wpm,
                modifyCount : modifyCount,
                modified : modified,
                pow: profile?.pow,
                position: profile?.position,
                likeCount: ideaLikeCount,
                count: commentCounts.totalAll


            };
        }));

        // Get the total count of matching ideas
        const totalIdeas = await Idea.countDocuments(searchCondition);

        res.status(200).json({
            message: 'Ideas fetched successfully',
            ideas: ideasWithDetails,
            total: totalIdeas,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalIdeas / resultsPerPage),
        });
    } catch (error) {
        console.error('Error searching ideas:', error);
        res.status(500).json({ message: 'Failed to search ideas' });
    }
};

export const fetchActiveIdeasByCategory = async (req: Request, res: Response): Promise<void> => {
    const { category, page = 1, limit = 10 } = req.query;

    const searchQuery = category ? String(category) : '';

    // Calculate pagination variables
    const pageNumber = parseInt(page as string, 10) || 1;
    const resultsPerPage = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * resultsPerPage;

    // Create the search condition
    const searchCondition = searchQuery
        ? { category: { $regex: new RegExp(searchQuery, 'i') } }
        : {};

    try {
        // Fetch ideas where category matches and status is 'allowed'
        const ideas = await Idea.find({ ...searchCondition, status: 'allowed' })
            .skip(skip)
            .limit(resultsPerPage)
            .sort({ createdAt: -1 })
            .exec();

        if (ideas.length === 0) {
            res.status(404).json({ message: `No active ideas found in category: ${category}` });
        }

        // Fetch the additional data for each idea
        const ideasWithAdditionalData = await Promise.all(
            ideas.map(async (idea) => {
                const commentCounts = await fetchCommentAndReplyCounts(idea._id);
                const ideaLikeCount = await getLikeCountForIdea(idea._id);
                const profile = await Profile.findOne({ userId: idea.userId });
                const thumbs = await Thumb.find({ ideaId: idea._id }).exec();
                const viewCount = await IdeaView.countDocuments({ ideaId: idea._id });
                const user = await User.findById(idea.userId).select('fname lname');
                const wpm = calculateReadingTime(idea.body);
                const originalIdeaId = idea._id; 
                const modifyCount = await ModifiedIdea.countDocuments({ originalIdeaId });

                

                return {
                    ...idea.toObject(),
                    fname: user?.fname || '',
                    lname: user?.lname || '',
                    likes: ideaLikeCount,
                    count: commentCounts.totalAll,
                    profile: profile?.toObject() || null,
                    thumbPath: thumbs.map(thumb => thumb.path), // If you only need paths
                    wordpm: wpm,
                    modifyCount: modifyCount,
                    modified: modifyCount > 0,
                    ppicture: profile?.ppicture || '',
                    pow: profile?.pow,
                    position: profile?.position,
                    likeCount: ideaLikeCount,
                    viewCount: viewCount
                };
            })
        );

        const totalIdeas = await Idea.countDocuments({ ...searchCondition, status: 'allowed' });

        res.status(200).json({
            message: 'Active ideas fetched successfully',
            ideas: ideasWithAdditionalData,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalIdeas / resultsPerPage),
        });
    } catch (error) {
        console.error('Error fetching active ideas by category:', error);
        res.status(500).json({ message: 'Failed to fetch active ideas' });
    }
};


export const fetchTopIdeasByLikes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 10, userId, category } = req.query;

        // Parse pagination parameters
        const pageNumber = parseInt(page as string, 10) || 1;
        const resultsPerPage = parseInt(limit as string, 10) || 10;
        const skip = (pageNumber - 1) * resultsPerPage;

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
                $skip: skip
            },
            {
                $limit: resultsPerPage
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
        const ideasWithDetails = await Idea.aggregate(pipeline);

        // Get the total number of ideas matching the criteria
        const totalIdeas = await Idea.countDocuments(category ? { category: category } : {});

        // Loop through each idea and fetch user details
        const ideasWithUserDetails = await Promise.all(
            ideasWithDetails.map(async (idea) => {
                const user = await User.findById(idea.userId).select('fname lname');
                const thumbs = await Thumb.findOne({ ideaId: idea._id }).select('path');
                const profile = await Profile.findOne({ userId: idea.userId });
                const wpm = calculateReadingTime(idea.body);
                const commentCounts = await fetchCommentAndReplyCounts(idea._id);
                const ideaLikeCount = await getLikeCountForIdea(idea._id);
                const viewCount = await IdeaView.countDocuments({ ideaId: idea._id });
                let userHasLiked = false;
                const originalIdeaId = idea._id; 
                const modifyCount = await ModifiedIdea.countDocuments({ originalIdeaId });

                let modified = false;
                if (modifyCount > 0) {
                    modified = true;
                }

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
                    viewCount: viewCount,
                    modifyCount: modifyCount,
                    modified: modified
                };
            })
        );

        res.status(200).json({
            message: 'Top ideas fetched successfully',
            ideas: ideasWithUserDetails,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalIdeas / resultsPerPage),
        });
    } catch (error) {
        console.error('Error fetching top ideas by likes:', error);
        res.status(500).json({ message: 'Failed to fetch top ideas' });
    }
};

export const fetchTopIdeasByViews = async (req: Request, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 10, userId, category } = req.query;

        // Parse pagination parameters
        const pageNumber = parseInt(page as string, 10) || 1;
        const resultsPerPage = parseInt(limit as string, 10) || 10;
        const skip = (pageNumber - 1) * resultsPerPage;

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
                $skip: skip
            },
            {
                $limit: resultsPerPage
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
        const ideasWithDetails = await Idea.aggregate(pipeline);

        // Get the total number of ideas matching the criteria
        const totalIdeas = await Idea.countDocuments(category ? { category: category } : {});

        // Loop through each idea and fetch user details
        const ideasWithUserDetails = await Promise.all(
            ideasWithDetails.map(async (idea) => {
                const user = await User.findById(idea.userId).select('fname lname');
                const thumbs = await Thumb.findOne({ ideaId: idea._id }).select('path');
                const profile = await Profile.findOne({ userId: idea.userId }).select('ppicture');
                const wpm = calculateReadingTime(idea.body);
                const commentCounts = await fetchCommentAndReplyCounts(idea._id);
                const ideaLikeCount = await getLikeCountForIdea(idea._id);
                const viewCount = await IdeaView.countDocuments({ ideaId: idea._id });
                const originalIdeaId = idea._id; 
                const modifyCount = await ModifiedIdea.countDocuments({ originalIdeaId });

                let modified = false;
                if (modifyCount > 0) {
                    modified = true;
                }

                let userHasLiked = false;
                if (userId) {
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
                    viewCount: viewCount,
                    modifyCount: modifyCount,
                    modified: modified
                };
            })
        );

        res.status(200).json({
            message: 'Top ideas fetched successfully',
            ideas: ideasWithUserDetails,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalIdeas / resultsPerPage),
        });
    } catch (error) {
        console.error('Error fetching top ideas by views:', error);
        res.status(500).json({ message: 'Failed to fetch top ideas' });
    }
};