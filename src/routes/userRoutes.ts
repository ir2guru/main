import express, { Request, Response } from 'express';
import { checkUserExistence, loginUser, reguser, verifyUserAccount, updateUserDetails, verifyUser, fetchUserProfile, changePassword, fetchUnreadNotificationsByUserId, markNotificationAsRead, checkAndSetFcmToken, checkFcmToken, ReturnUserToken, fetchModifiedIdeasByIdeaId, fetchModifiedIdeasByUserId } from '../controllers/userController';
import { verifyToken } from '../middleware/verifyToken';
import { checkSession } from '../controllers/checkSession';
import { getIdeaWithDocuments, postIdea, modifyIdea, fetchIdeaByStatus, fetchIdeas, likeIdea, fetchActiveIdeasByCategory, fetchGroupsByIdeaId, getModifiedIdeaWithDocuments, fetchTopIdeasByLikes, fetchTopIdeasByViews, fetchModifiedIdeasByUser } from '../controllers/ideaController';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client, PutObjectCommand, GetObjectAclCommand} from '@aws-sdk/client-s3';
import fs from 'fs';
import Profile from '../models/Profile';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary';
import sharp from 'sharp';
import { get } from 'http';
import { sendNotification } from "../middleware/sendNotification";
import { fetchRepliesByCommentId } from '../controllers/commentController';

const router = express.Router();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  
  const upload = multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.AWS_S3_BUCKET_NAME!,
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
      },
    }),
  });

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './src/uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const uploads = multer({ storage: storage });

router.post('/ideas', upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'files', maxCount: 10 }]), postIdea);
router.post('/login', loginUser);
router.post('/reg', reguser);
router.post('/verify', verifyUserAccount);
router.put('/user/:userId', updateUserDetails);
router.get('/check-session', verifyToken, checkSession);
router.get('/ideas', fetchIdeas);
router.get('/ideas/:id', getIdeaWithDocuments);
router.get('/mideas/:id', getModifiedIdeaWithDocuments);
router.put('/ideas/:ideaId/modify', upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'files', maxCount: 10 }]), modifyIdea);
router.get('/:userId/profile', fetchUserProfile);
router.get('/idea/post', fetchIdeaByStatus);
router.post('/password', changePassword);
router.post('/ideas/:ideaId/like', likeIdea);
router.get('/ideas/active/:category', fetchActiveIdeasByCategory);
router.get('/groups/idea/:ideaId', fetchGroupsByIdeaId);
router.get('/notifications/unread/:userId/:status', fetchUnreadNotificationsByUserId);
router.post('/profile/fcmtoken', checkAndSetFcmToken);
router.get('/profile/fcmcheck', checkFcmToken);
router.get('/profile/returnfcm/:userId', ReturnUserToken);
router.get('/modified-ideas', fetchModifiedIdeasByIdeaId);
router.get('/modified-user', fetchModifiedIdeasByUserId);
router.get('/liked/ideas/', fetchTopIdeasByLikes);
router.get('/viewed/ideas/', fetchTopIdeasByViews);
router.get('/modifiedIdeas/user/:userId', fetchModifiedIdeasByUser);
router.get('/replies/comment/:commentId', fetchRepliesByCommentId);
router.patch('/notifications/:notificationId/read', markNotificationAsRead);
router.get('/check-user', checkUserExistence);


// router.post('/submit', handleFormSubmission);


router.get('/verify', async (req, res) => {
    const userId = req.query.userId as string;
    const vcode = req.query.vcode as string;

    if (!userId || !vcode) {
        return res.status(400).json({ message: 'Missing userId or vcode' });
    }

    try {
        const result = await verifyUser(userId, vcode);
        res.status(200).json({
            message: 'Account verified successfully',
            ...result
        });
    } catch (error) {
        console.error('Error verifying user account:', error);
        res.status(500).send({ message: 'Failed to verify user account' });
    }
});

router.post('/upload/:userId', upload.single('ppicture'), async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // Check if the file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const s3Url = (req.file as Express.MulterS3.File).location;

    // Update the user's profile picture
    const profile = await Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    profile.ppicture = s3Url; // Update the profile picture with S3 URL
    await profile.save();

    res.status(200).json({
      message: 'Profile picture updated successfully',
      ppicture: profile.ppicture,
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ message: 'Failed to update profile picture' });
  }
});

router.post('/send-notification', async (req, res) => {
    const { token, title, body } = req.body;

    //const profile = await Profile.findOne({ userId });

    // const token = profile?.fcmtoken;
  
    if (!token || !title || !body) {
      return res.status(400).json({ error: 'Token, title, and body are required.' });
    }
  
    try {
      await sendNotification(token, { title, body });
      res.status(200).json({ message: 'Notification sent successfully.' });
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({ error: 'Failed to send notification.' });
    }
  });
  

module.exports = router;
