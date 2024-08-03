import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/user';
import Group from '../models/Group';
import Idea from '../models/Idea';
import Thumb from '../models/thumb';
import Member from '../models/Member';
import Profile from '../models/Profile';

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