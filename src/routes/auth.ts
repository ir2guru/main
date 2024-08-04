import express from 'express';
import { googleLogin, appleLogin} from '../controllers/authController';

const router = express.Router();

// Google OAuth login
router.post('/auth/google', googleLogin);

// Apple OAuth login
router.post('/auth/apple', appleLogin);

module.exports = router;
