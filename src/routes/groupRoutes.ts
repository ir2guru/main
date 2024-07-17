import express from 'express';
import { createGroup, inviteMember, requestToJoinGroup, respondToMembershipRequest, acceptGroupInvitation, getGroupMembers, suspendMember, fetchMessagesByRoomID, fetchGroupsByUser } from '../controllers/groupController'; // Adjust path as needed

const router = express.Router();

router.post('/groups', createGroup);
router.post('/groups/invite', inviteMember);
router.post('/groups/request-to-join', requestToJoinGroup); // New route for requesting to join
router.post('/groups/respond-to-request', respondToMembershipRequest); // New route for admin response to requests
router.post('/groups/accept-invite', acceptGroupInvitation); // New route for admin response to requests
router.get('/groups/:groupId/members', getGroupMembers);// New route for admin response to requests
router.patch('/groups/suspend', suspendMember); // Route to suspend a member by memberId
router.get('/messages/:roomID', fetchMessagesByRoomID);
router.get('/user/:userId', fetchGroupsByUser);


module.exports = router;
