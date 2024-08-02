import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/user';
import Group from '../models/Group';
import Idea from '../models/Idea';
import Thumb from '../models/thumb';

export const getGroupsByAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search } = req.query;

        // Validate that search is provided
        if (!search || typeof search !== 'string') {
            res.status(400).json({ message: 'Search parameter is required and must be a string' });
            return;
        }

        // Build the query object for user search
        const userQuery: any = {
            $or: [
                { fname: new RegExp(search, 'i') }, // Case-insensitive partial match for fname
                { lname: new RegExp(search, 'i') }  // Case-insensitive partial match for lname
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
            res.status(404).json({ message: 'No groups found matching the criteria' });
            return;
        }

        // Extract idea IDs from the groups
        const ideaIds = Array.from(new Set(groups.map(group => group.ideaId)));

        // Fetch idea headlines
        const ideas = await Idea.find({ _id: { $in: ideaIds } }).exec();
        const ideaMap = new Map(ideas.map(idea => [idea._id.toString(), { headline: idea.headline }]));

        // Fetch thumbnails related to the ideas
        const thumbs = await Thumb.find({ ideaId: { $in: ideaIds } }).exec();
        const thumbMap = new Map(thumbs.map(thumb => [thumb.ideaId, thumb.path]));

        // Create a map of user IDs to their names
        const userMap = new Map(users.map(user => [user._id.toString(), { fname: user.fname, lname: user.lname }]));

        // Include user details, idea headlines, and thumbnail paths in the groups response
        const groupsWithDetails = groups.map(group => ({
            ...group.toObject(),
            adminName: userMap.get(group.admin.toString()) || { fname: 'Unknown', lname: 'Unknown' },
            ideaHeadline: ideaMap.get(group.ideaId.toString())?.headline || 'Unknown',
            thumbnailPath: thumbMap.get(group.ideaId.toString()) || 'No thumbnail available'
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
        const { search } = req.query;

        // Validate that search is provided
        if (!search || typeof search !== 'string') {
            res.status(400).json({ message: 'Search parameter is required and must be a string' });
            return;
        }

        // Find ideas matching the headline
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
        const groups = await Group.find({ ideaId: { $in: ideaData.map(idea => idea.id) } }).exec();

        if (groups.length === 0) {
            res.status(404).json({ message: 'No groups found matching the criteria' });
            return;
        }

        // Extract user IDs for the admins of the groups
        const adminIds = Array.from(new Set(groups.map(group => group.admin)));

        // Fetch user details for the admins
        const users = await User.find({ _id: { $in: adminIds } }).exec();
        const userMap = new Map(users.map(user => [user._id.toString(), { fname: user.fname, lname: user.lname }]));

        // Fetch thumbnails related to the ideas
        const ideaIds = Array.from(new Set(groups.map(group => group.ideaId)));
        const thumbs = await Thumb.find({ ideaId: { $in: ideaIds } }).exec();
        const thumbMap = new Map(thumbs.map(thumb => [thumb.ideaId, thumb.path]));

        // Create a map of idea IDs to headlines
        const ideaMap = new Map(ideaData.map(idea => [idea.id, idea.headline]));

        // Include user details, idea headlines, and thumbnail paths in the groups response
        const groupsWithDetails = groups.map(group => ({
            ...group.toObject(),
            adminName: userMap.get(group.admin.toString()) || { fname: 'Unknown', lname: 'Unknown' },
            ideaHeadline: ideaMap.get(group.ideaId.toString()) || 'Unknown',
            thumbnailPath: thumbMap.get(group.ideaId.toString()) || 'No thumbnail available'
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