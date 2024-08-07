import { Request, Response } from 'express';
import User from '../models/user';
import { generateToken } from '../utils/tokenUtils';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import randomstring from 'randomstring';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID!);

export const googleLogin = async (req: Request, res: Response) => {
    const { fname, lname, email } = req.body;
    if (!fname || lname || email) {
        return res.status(400).json({ message: 'missing credentials' });
    }
    try {
        // const ticket = await googleClient.verifyIdToken({
        //     idToken,
        //     audience: process.env.GOOGLE_CLIENT_ID!
        // });
        // const payload = ticket.getPayload();
        const emailuse = email;
        const fnameUse = fname || '';
        const lnameUse = lname || '';

        let user = await User.findOne({ email });
        if (!user) {
            user = new User({ email, password: '', fname, lname, status: 'active' });
            await user.save();
        }

        const token = generateToken(user._id.toString());
        res.status(200).json({
            message: 'User logged in successfully',
            token
        });
    } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(500).json({ message: 'Failed to authenticate' });
    }
};

export const appleLogin = async (req: Request, res: Response) => {
    const { idToken } = req.body;
    if (!idToken) {
        return res.status(400).json({ message: 'ID token is required' });
    }
    try {
        const response = await axios.post('https://appleid.apple.com/auth/token', {
            idToken,
            // other necessary params
        });
        const email = response.data.email;
        const fname = ''; // Extract from response if available
        const lname = ''; // Extract from response if available

        let user = await User.findOne({ email });
        if (!user) {
            user = new User({ email, password: '', fname, lname, status: 'active' });
            await user.save();
        }

        const token = generateToken(user._id.toString());
        res.status(200).json({
            message: 'User logged in successfully',
            token
        });
    } catch (error) {
        console.error('Apple OAuth error:', error);
        res.status(500).json({ message: 'Failed to authenticate' });
    }
};