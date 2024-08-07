import { Request, Response } from 'express';
import User from '../models/user';
import { generateToken } from '../utils/tokenUtils';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import randomstring from 'randomstring';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID!);

function generatePassword(length = 9) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters[randomIndex];
    }
    return password;
}



export const googleLogin = async (req: Request, res: Response) => {
    const { fname, lname, email } = req.body;

    if (!fname || !lname || !email) {
        return res.status(400).json({ message: 'Missing credentials' });
    }

    try {
        // Ensure the email is in a valid format
        const emailUse = email.trim().toLowerCase();
        const fnameUse = fname.trim() || '';
        const lnameUse = lname.trim() || '';

        // Check if the user already exists
        let user = await User.findOne({ email: emailUse });

        if (user) {
            // If user exists, return a message indicating so
            return res.status(200).json({
                message: 'User already exists',
            });
        } else {
            // Create a new user if not found
            user = new User({
                email: emailUse,
                password: '',  // Google OAuth typically doesn't require a password
                fname: fnameUse,
                lname: lnameUse,
                status: 'active',
            });
            await user.save();

            // Generate a token for the newly created user
            const token = generateToken(user._id.toString());

            // Respond with success and token
            return res.status(201).json({
                message: 'User created successfully',
                token,
            });
        }
    } catch (error) {
        console.error('Error during login:', error);
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