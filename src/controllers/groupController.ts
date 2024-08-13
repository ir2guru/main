import { Request, Response } from 'express';
import Group from '../models/Group';
import Member from '../models/Member';
import Idea from '../models/Idea';
import { sendEmail } from '../utilities/emailService';
import User from '../models/user';
import mongoose from 'mongoose';
import Profile from '../models/Profile';
import { sendNotification } from '../middleware/sendNotification';
import { createNotification } from '../utilities/notificationUtils';
import Message from '../models/Messages';
import Metadata, { IMetadata } from '../models/metadata';
import { io } from '..';
import Thumb from '../models/thumb';
import { generateInviteMessage } from '../utils/emails';

// Function to create a group

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
      //await sendNotification(token, { title, body });
      console.log('Notification sent successfully.');
    } catch (error) {
      console.error('Error sending notification:', error);
      console.log('Failed to send notification.');
    }
  };
  

export const createGroup = async (req: Request, res: Response) => {
    const { ideaId, name, userId, text } = req.body;

    try {
        // Ensure the idea exists
        const idea = await Idea.findById(ideaId);
        if (!idea) {
            return res.status(404).json({ message: 'Idea not found' });
        }

        // Create the group
        const group = new Group({
            ideaId,
            name,
            text,
            admin: userId,
        });

        await group.save();

        // Add the creator as a member
        const member = new Member({
            groupId: group._id.toString(),
            userId,
            status: 'accepted',
            invitedBy: userId,
        });

        await member.save();

        // Send email notification to the admin
        await sendEmail(userId, 'Group Created Successfully', `You have successfully created the group: ${name}`);

        res.status(201).json({ message: 'Group created successfully', group });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ message: 'Failed to create group' });
    }
};

// Function to invite a member
export const inviteMember = async (req: Request, res: Response) => {
    const { groupId, email, invitedBy } = req.body;

    try {
        // Ensure the group exists
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Ensure the inviter is the admin
        if (group.admin !== invitedBy) {
            return res.status(403).json({ message: 'Only the admin can invite members' });
        }

        // Fetch the userId from the email
        const user = await User.findOne({ email }).select('_id fname lname');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = user._id;

        // Ensure the idea exists
        const IdeaPosted = await Idea.findById(group.ideaId);
        if (!IdeaPosted) {
            console.error('Idea not found with ID:', group.ideaId);
            return res.status(404).json({ message: 'Idea not found' });
        }

        // Create the member invitation
        const member = new Member({
            groupId,
            userId,
            status: 'pending',
            invitedBy,
        });

        await member.save();

        const datameta = new Metadata({
            groupId: groupId,         // Replace with actual values
            userId: userId,                  // User ID from the User model
            memberId: member._id,                // Assuming memberId is the same as userId
            iniciatorId: invitedBy, // Replace with actual value
            username: `${user.fname} ${user.lname}`, // User's full name
            ideaheadline: IdeaPosted.headline,
            IdeaId: IdeaPosted._id,
            typeId: ''       // Assuming IdeaPosted object has headline property
        });

        const ruserId = userId;
        const rgroupId = groupId;
        const memberId = member._id;
        const groupName = group.name;
        const inviteUrl = 'https://ideasafrica.org/accept-invite';

        const emailContent = generateInviteMessage(ruserId, rgroupId, memberId, groupName, inviteUrl);

        await sendEmail(userId, 'Group Invite', ``, emailContent);

        // Send email notification to the invited user
        await createNotification('Invitation to Join Group', 'Invite', `You have been invited to join the group: ${IdeaPosted.headline}`, datameta);

        // Notify via WebSocket
        const notificationMessage = "New Notification";
        const notificationStatus = "true";
            
        const newNotification = {
            message: notificationMessage,
            status: notificationStatus
        };
            
        io.to(userId.toString()).emit('newNotification', newNotification);
        console.log(newNotification);
        
        res.status(201).json({ message: 'Member invited successfully', member });
    } catch (error) {
        console.error('Error inviting member:', error);
        res.status(500).json({ message: 'Failed to invite member' });
    }
};

// Function to request to join a group
export const requestToJoinGroup = async (req: Request, res: Response) => {
    const { groupId, userId } = req.body;

    try {
        // Ensure the group exists
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if the user is already a member
        const existingMember = await Member.findOne({ groupId, userId });
        if (existingMember) {
            return res.status(400).json({ message: 'User is already a member or has a pending request' });
        }

        // Create a membership request
        const memberRequest = new Member({
            groupId,
            userId,
            status: 'requested',
            invitedBy: null, // Null because it's a user-initiated request
        });

        await memberRequest.save();

        const user = await User.findById(userId).select('fname lname');

        const memberdata = await Member.findOne({groupId: groupId, userId: userId});

        if(!memberdata){
            return res.status(400).json({ message: 'Member Doesn\'t Exist'});
        }

        const IdeaPosted = await Idea.findById(group.ideaId);
        if (!IdeaPosted) {
            console.error('Idea not found with ID:', group.ideaId);
            return res.status(404).json({ message: 'Idea not found' });
        }

        const datameta = new Metadata({
            groupId: groupId,         // Replace with actual values
            userId: group.admin,                  // Assuming IdeaUser is the userId
            memberId: memberdata._id,                // Assuming memberId is the same as userId
            iniciatorId: userId, // Replace with actual value
            username: `${user?.fname} ${user?.lname}`,         // Assuming username object has fname property
            ideaheadline: IdeaPosted.headline,
            IdeaId:IdeaPosted._id,
            typeId: ''       // Assuming IdeaPosted object has headline property
        });


        // Send email notification to the group admin
        await sendEmail(group.admin, 'Request to Join Group', `User ${userId} has requested to join the group: ${group.name}`);
        //await createNotification('Request to Join Group',group.admin, 'Group Request', `User ${userId} has requested to join the group: ${group.name}`);
        await createNotification('Request to Join Group', 'Request',  `${user?.fname} ${user?.lname} has requested to join the group: ${IdeaPosted.headline}`,datameta);
        //sendNotifi(group.admin, 'Request to Join Group',`User ${userId} has requested to join the group: ${group.name}`);
        const notificationMessage = "New Notification";
        const notificationStatus = "true";
            
            const newNotification = {
                message: notificationMessage,
                status: notificationStatus
            };
            
            // Assuming `IdeaUser` is the ID of the user to be notified
            io.to(group.admin).emit('newNotification', newNotification);
        res.status(201).json({ message: 'Request to join group submitted successfully', memberRequest });
    } catch (error) {
        console.error('Error requesting to join group:', error);
        res.status(500).json({ message: 'Failed to request to join group' });
    }
};

// Function to respond to membership requests
export const respondToMembershipRequest = async (req: Request, res: Response) => {
    const { memberId, status, userId } = req.body; // status can be 'accepted' or 'rejected'

    try {
        // Ensure the membership request exists
        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ message: 'Membership request not found' });
        }

        // Ensure the user responding is the admin
        const group = await Group.findById(member.groupId);
        if (!group || group.admin !== userId) {
            return res.status(403).json({ message: 'Only the admin can respond to membership requests' });
        }

        // Update the member status
        member.status = status;
        await member.save();

        const user = await User.findById(group.admin).select('fname lname');

        const IdeaPosted = await Idea.findById(group.ideaId);
        if (!IdeaPosted) {
            console.error('Idea not found with ID:', group.ideaId);
            return res.status(404).json({ message: 'Idea not found' });
        }

        const datameta = new Metadata({
            groupId: member.groupId,         // Replace with actual values
            userId: member.userId,                  // Assuming IdeaUser is the userId
            memberId: member._id,                // Assuming memberId is the same as userId
            iniciatorId: userId, // Replace with actual value
            username: `${user?.fname} ${user?.lname}`,         // Assuming username object has fname property
            ideaheadline: IdeaPosted.headline,
            IdeaId:IdeaPosted._id,
            typeId: ''       // Assuming IdeaPosted object has headline property
        });


        // Send email notification to the user about the response
        await sendEmail(member.userId, 'Membership Request Update', `Your membership request to join the group: ${group.name} has been ${status}.`);
        // await createNotification('Membership Request Update',member.userId, 'Group Request', `Your membership request to join the group: ${group.name} has been ${status}.`);
        await createNotification('Membership Request Update','Response',  `Your membership request to join the group: ${IdeaPosted.headline}  group has been ${status}.`, datameta);
        //sendNotifi(member.userId, 'Membership Request Update',`Your membership request to join the group: ${group.name} has been ${status}.`);
        const notificationMessage = "New Notification";
        const notificationStatus = "true";
            
            const newNotification = {
                message: notificationMessage,
                status: notificationStatus
            };
            
            // Assuming `IdeaUser` is the ID of the user to be notified
            io.to(member.userId).emit('newNotification', newNotification);
        res.status(200).json({ message: `Membership request ${status} successfully`, member });
    } catch (error) {
        console.error('Error responding to membership request:', error);
        res.status(500).json({ message: 'Failed to respond to membership request' });
    }
};

// src/controllers/groupController.ts
export const acceptGroupInvitation = async (req: Request, res: Response) => {
    const { userId, groupId, status } = req.body;

    try {
        const member = await Member.findOne({ userId, groupId, status: 'pending' });
        if (!member) {
            return res.status(404).json({ message: 'Invitation not found' });
        }

        member.status = status;
        member.joinedAt = status === 'accepted' ? new Date() : member.joinedAt;
        await member.save();

        // Fetch user and group details
        const user = await User.findById(userId);
        const group = await Group.findById(groupId);

        if (userId && group) {
            if (status === 'accepted') {
                // Send email notification to the user
                await sendEmail(userId, 'Group Invitation Accepted', `Your request to join ${group.name} was ${status}`);

                const IdeaPosted = await Idea.findById(group.ideaId);
                if (!IdeaPosted) {
                    console.error('Idea not found with ID:', group.ideaId);
                    return res.status(404).json({ message: 'Idea not found' });
                }

                // Optionally, send email notification to the group admin
                const admin = await User.findById(group.admin);
                if (admin) {
                    const datameta = new Metadata({
                        groupId: groupId,
                        userId: admin.id,
                        memberId: member._id,
                        iniciatorId: userId,
                        username: `${user?.fname} ${user?.lname}`,
                        ideaheadline: IdeaPosted.headline,
                        IdeaId: IdeaPosted._id,
                        typeId: ''
                    });

                    await createNotification('New Member Joined', 'Action', `${user?.fname} ${user?.lname} has just ${status} the invitation to join the group: ${IdeaPosted.headline}`, datameta);
                    await sendNotifi(admin.id, 'New Member Joined', `${user?.email} has accepted the invitation to join the group: ${group.name}`);

                    const notificationMessage = "New Notification";
                    const notificationStatus = "true";

                    const newNotification = {
                        message: notificationMessage,
                        status: notificationStatus
                    };

                    io.to(admin.id).emit('newNotification', newNotification);
                }
            } else if (status === 'declined') {
                // Send email notification to the user
                await sendEmail(userId, 'Group Invitation Declined', `Your request to join ${group.name} was ${status}`);

                // Optionally, notify the group admin about the declined invitation
                const admin = await User.findById(group.admin);
                if (admin) {
                    await sendNotifi(admin.id, 'Invitation Declined', `${user?.email} has declined the invitation to join the group: ${group.name}`);
                }
            }
        }

        res.status(200).json({ message: `Invitation ${status} successfully` });
    } catch (error) {
        console.error('Error handling invitation:', error);
        res.status(500).json({ message: 'Failed to handle invitation' });
    }
};

const fetchGroupMembersWithProfile = async (groupId: string) => {
    try {
        // Convert groupId to a mongoose ObjectId
        const groupObjectId = new mongoose.Types.ObjectId(groupId);

        // Use aggregate to perform the lookup and projection
        const members = await Member.aggregate([
            {
                $match: { groupId: groupObjectId } // Match the specified groupId
            },
            {
                $lookup: {
                    from: 'profiles', // Name of the profile collection
                    localField: 'userId', // Field in the members collection
                    foreignField: 'userId', // Field in the profiles collection
                    as: 'profile'
                }
            },
            {
                $unwind: '$profile' // Unwind the profile array to get a single object
            },
            {
                $project: {
                    _id: 0, // Exclude _id field if not needed
                    userId: 1,
                    'profile.fname': 1,
                    'profile.lname': 1
                }
            }
        ]);

        return members;
    } catch (error) {
        console.error('Error fetching group members with profile:', error);
        throw error;
    }
};

const fetchGroupMembers = async (groupId: string) => {
    try {
        // Convert groupId to a mongoose ObjectId
        const groupObjectId = new mongoose.Types.ObjectId(groupId);

        // Find members matching the groupId
        const members = await Member.find({ groupId: groupObjectId });

        return members;
    } catch (error) {
        console.error('Error fetching group members:', error);
        throw error;
    }
};

// Controller function to handle the request to fetch group members
export const getGroupMembers = async (req: Request, res: Response) => {
    const { groupId } = req.params;

    try {
        const members = await Member.find({ groupId, status:'accepted'});

        // Use Promise.all to handle asynchronous operations in parallel
        const membersWithProfiles = await Promise.all(members.map(async member => {
            const uprofile = await User.findOne({ _id: member.userId });
            const profile = await Profile.findOne({ userId: member.userId });

            if(!profile){
                return res.status(200).json({ message: 'Failed to load profile' });
            }

            return {
                ...member.toObject(),
                userId: member.userId,
                profile: uprofile ? { fname: uprofile.fname, lname: uprofile.lname, ppicture: profile.ppicture } : null,
            };
        }));

        res.status(200).json(membersWithProfiles);
    } catch (error) {
        console.error('Error fetching group members:', error);
        res.status(500).json({ message: 'Failed to fetch group members' });
    }
};

// Controller function to suspend a member
export const suspendMember = async (req: Request, res: Response) => {
    const { memberId, userId } = req.body; // status can be 'accepted' or 'rejected'

    const status = 'suspended';

    try {
        // Ensure the membership request exists
        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ message: 'Membership request not found' });
        }

        // Ensure the user responding is the admin
        const group = await Group.findById(member.groupId);
        if (!group || group.admin !== userId) {
            return res.status(403).json({ message: 'Only the admin can perform this action' });
        }

        // Update the member status
        member.status = status;
        await member.save();

        // Send email notification to the user about the response
        //await sendEmail(member.userId, 'Membership Status Update', `Your membership Status in the group: ${group.name} has been ${status}.`);
        //await sendNotifi(member.userId, 'Membership Status Update',`Your membership Status in the group: ${group.name} has been ${status}.`);
        
        res.status(200).json({ message: `Membership status updated to ${status} successfully`, member });
    } catch (error) {
        console.error('Error responding to membership request:', error);
        res.status(500).json({ message: 'Failed to respond to membership request' });
    }
};

export const fetchMessagesByRoomID = async (req: Request, res: Response): Promise<void> => {
    try {
        const { roomID } = req.params;

        if (!roomID) {
            res.status(400).json({ message: 'Room ID is required' });
            return;
        }

        // Fetch messages associated with the roomID and sort by timestamp in ascending order
        const messages = await Message.find({ roomID }).sort({ timestamp: 1 }).exec();

        if (!messages.length) {
            res.status(200).json({ message: `No messages found for roomID: ${roomID}` });
            return;
        }

        res.status(200).json({
            message: 'Messages fetched successfully',
            messages,
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
};

export const fetchGroupsByUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

        if (!userId) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }

        // Fetch groups where the user is the admin
        const groups = await Group.find({ admin: userId }).exec();

        if (!groups.length) {
            res.status(200).json({ message: 'No groups found for this user' });
            return;
        }

        // Optionally, populate related data (e.g., user details, idea details)
        const groupsWithDetails = await Promise.all(
            groups.map(async (group) => {
                const adminUser = await User.findById(group.admin).select('fname lname');
                const idea = await Idea.findById(group.ideaId);
                const thumbs = await Thumb.findOne({ideaId: group.ideaId});

                console.log(group.ideaId);

                return {
                    ...group.toObject(),
                    admin: adminUser ? `${adminUser.fname} ${adminUser.lname}` : 'Unknown',
                    ideaTitle: idea?.headline,
                    ideaDescription: idea?.summary,
                    banner : thumbs?.path

                };
            })
        );

        res.status(200).json({
            message: 'Groups fetched successfully',
            groups: groupsWithDetails
        });
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ message: 'Failed to fetch groups' });
    }
};

export const getGroupById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;

        // Convert groupId to mongoose ObjectId if necessary
        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ message: 'Invalid group ID format' });
            return;
        }

        // Find the group by its _id
        const group = await Group.findById(groupId).exec();

        if (!group) {
            res.status(404).json({ message: 'Group not found' });
            return;
        }

        const user = await User.findById(group.admin).exec();
        const profile = await Profile.findOne({userId: group.admin}).exec();
        const idea = await Idea.findById(group.ideaId).exec();

        res.status(200).json({
            message: 'Group fetched successfully',
            group,
            fname: user?.fname,
            lname: user?.lname,
            profilepic: profile?.ppicture,
            pow: profile?.pow,
            position: profile?.position,
            ideaheadline: idea?.headline,

        });
    } catch (error) {
        console.error(`Error fetching group:`, error);
        res.status(500).json({ message: 'Could not fetch group details' });
    }
};