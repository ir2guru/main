import { Request, Response } from 'express';
import User from '../models/user'; // Adjust the path according to your project structure
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import generateToken from '../utils/generateToken';
import Profile from '../models/Profile'; // Adjust the import path
import nodemailer from 'nodemailer';
import randomstring from 'randomstring';
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import { sendNotification } from '../middleware/sendNotification';
import ModifiedIdea from '../models/modifiedIdea';
import Thumb from '../models/thumb';
import { fetchCommentAndReplyCounts } from '../middleware/CommentCounter';
import { getLikeCountForIdea } from '../middleware/LikeCount';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Function to send email
const sendEmail = async (email: string, subject: string, htmlContent: string) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
            user: '74bf26001@smtp-brevo.com',
            pass: 'zQgEa7c2HhGCtU6k',
        },
    });

    const mailOptions = {
        from: 'hello@ideaafrica.com',
        to: email,
        subject: subject,
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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

// User login function
export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ message: "User account is inactive. Please verify your account." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            message: "User logged in successfully",
            token,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

// User registration function
export const reguser = async (req: Request, res: Response) => {
    const { email, password, fname, lname} = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const vcode = randomstring.generate({ length: 12, charset: 'alphanumeric' });

        const user = new User({ email, password, fname, lname, vcode });
        await user.save();

        const token = generateToken(user._id.toString());

        res.status(201).json({
            message: 'User registered successfully',
            userId: user._id,
            vcode: vcode,
            token,
        });

        const emailSubject = 'Welcome to Idea Africa';
        const emailMessage = `
        <!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1, width=device-width" />

    <link rel="stylesheet" href="https://duducomics.com/public/index.css" />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap"
    />
  </head>
  <body>
    <div class="frame-parent">
      <div class="frame-group">
        <div class="black-white-minimalist-busin-wrapper">
          <img
            class="black-white-minimalist-busin"
            alt=""
            src="https://duducomics.com/public/black--white-minimalist-business-logo-1-1@2x.png"
          />
        </div>
        <div class="frame-wrapper">
          <div class="rectangle-parent">
            <img class="frame-child" alt="" src="https://duducomics.com/public/rectangle-1@2x.png" />

            <div class="rectangle-parent">
              <div class="hi-seun-parent">
                <div class="hi-seun">Hi, ${email}</div>
                <div class="welcome-aboard-to-container">
                  <p class="welcome-aboard-to">
                    Welcome aboard to Ideas for Africa! 🚀
                  </p>
                  <p>
                    We're so glad to have you join us and embark on this journey
                    of sharing awesome ideas. Whether you're here to read ideas,
                    engage in discussions, start a brainstorm group, or just
                    have some fun, you're in the right place!
                  </p>
                  <p>
                    You've almost completed the registration process. The only
                    thing left to do is verify your account. Please click the
                    verify button below to complete your registration.
                  </p>
                  <p>
                    You're already on your way to making an impact in our
                    community. If there's anything you need, our team will be
                    here every step of the way.
                  </p>
                  <p>
                    Let's dive in and create something amazing together!
                  </p>
                  <p>
                    Thanks,
                  </p>
                  <p style="margin: 0">The Team</p>
                </div>
              </div>
              <a href="https://ideas-for-africa-deploy.vercel.app/auth/verify?userId=${user._id}&vcode=${vcode}" class="button">
                            <div class="label">Verify Account</div>
              </a>
            </div>
          </div>
        </div>
        <div class="frame-div">
          <div class="rectangle-parent">
            <div class="this-email-was-container">
              <p class="welcome-aboard-to">
                This email was sent to ${email}. If you’d rather not
                receive this email, you can unsubscribe or manage your email
                preferences
              </p>
              <p class="the-team">© 2024 Idea for Africa</p>
            </div>
            <div class="black-white-minimalist-busin-parent">
              <img
                class="black-white-minimalist-busin"
                alt=""
                src="https://duducomics.com/public/black--white-minimalist-business-logo-1-1@2x.png"
              />

              <div class="social-icon-parent">
                <div class="social-icon">
                  <img
                    class="instagram-761608-icon"
                    alt=""
                    src="https://duducomics.com/public/instagram761608.svg"
                  />
                </div>
                <div class="social-icon">
                  <img
                    class="instagram-761608-icon"
                    alt=""
                    src="https://duducomics.com/public/twitter761629.svg"
                  />
                </div>
                <div class="social-icon">
                  <img
                    class="instagram-761608-icon"
                    alt=""
                    src="https://duducomics.com/public/linkedin761611.svg"
                  />
                </div>
                <div class="social-icon">
                  <img
                    class="instagram-761608-icon"
                    alt=""
                    src="https://duducomics.com/public/facebook761598.svg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>  
        `;

        await sendEmail(email, emailSubject, emailMessage);
        
    } catch (error) {
        console.error('Error registering new user: ', error);
        res.status(500).send({ message: 'Failed to register user' });
    }
};

// Function to update user details and send email
export const updateUserDetails = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { phone, address, state, country, title, pow, position, url, pic } = req.body;
    
    const updatedFields: { [key: string]: any } = {};
    if (phone !== undefined) updatedFields.phone = phone;
    if (address !== undefined) updatedFields.address = address;
    if (state !== undefined) updatedFields.state = state;
    if (country !== undefined) updatedFields.country = country;
    if (title !== undefined) updatedFields.title = title;
    if (pow !== undefined) updatedFields.pow = pow;
    if (position !== undefined) updatedFields.position = position;
    if (url !== undefined) updatedFields.url = url;
    if (pic !== undefined && pic === "reg" ){
      const ppicture = 'uploads/ppicture.jpg'
      updatedFields.ppicture = ppicture;
    }
  

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, { $set: updatedFields }, { new: true }).select('-password');

        if (!updatedUser) {
            return res.status(404).send({ message: "User not found." });
        }

        let profile = await Profile.findOneAndUpdate({ userId }, updatedFields, { upsert: true, new: true });

        const user = await User.findById(userId);
        const userEmail = user?.email || '';

        const emailSubject = 'Updated User Details';
        const emailMessage = `
        <!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1, width=device-width" />

    <link rel="stylesheet" href="https://duducomics.com/public/index.css" />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap"
    />
  </head>
  <body>
    <div class="frame-parent">
      <div class="frame-group">
        <div class="black-white-minimalist-busin-wrapper">
          <img
            class="black-white-minimalist-busin"
            alt=""
            src="https://duducomics.com/public/black--white-minimalist-business-logo-1-1@2x.png"
          />
        </div>
        <div class="frame-wrapper">
          <div class="rectangle-parent">
            <img class="frame-child" alt="" src="https://duducomics.com/public/rectangle-1@2x.png" />

            <div class="rectangle-parent">
              <div class="hi-seun-parent">
                <div class="hi-seun">Hi, ${phone}</div>
                <div class="welcome-aboard-to-container">
                  <p class="welcome-aboard-to">
                    Your profile has been updated successfully! 🎉
                  </p>
                  <p>
                    We're so glad to have you continue this journey with us at Ideas for Africa. Whether you're here to read ideas, engage in discussions, start a brainstorm group, or just have some fun, you're in the right place!
                  </p>
                  <p>
                    Your updated profile helps us tailor a better experience for you. If there's anything you need, our team will be here every step of the way.
                  </p>
                  <p>
                    Let's dive in and create something amazing together!
                  </p>
                  <p>
                    Thanks,
                  </p>
                  <p style="margin: 0">The Team</p>
                </div>
              </div>
              <div class="button">
              <div class="label">Keep Exploring</div>
            </div>
            </div>
          </div>
        </div>
        <div class="frame-div">
          <div class="rectangle-parent">
            <div class="this-email-was-container">
              <p class="welcome-aboard-to">
                This email was sent to ${phone}. If you’d rather not
                receive this email, you can unsubscribe or manage your email
                preferences
              </p>
              <p class="the-team">© 2024 Idea for Africa</p>
            </div>
            <div class="black-white-minimalist-busin-parent">
              <img
                class="black-white-minimalist-busin"
                alt=""
                src="https://duducomics.com/public/black--white-minimalist-business-logo-1-1@2x.png"
              />

              <div class="social-icon-parent">
                <div class="social-icon">
                  <img
                    class="instagram-761608-icon"
                    alt=""
                    src="https://duducomics.com/public/instagram761608.svg"
                  />
                </div>
                <div class="social-icon">
                  <img
                    class="instagram-761608-icon"
                    alt=""
                    src="https://duducomics.com/public/twitter761629.svg"
                  />
                </div>
                <div class="social-icon">
                  <img
                    class="instagram-761608-icon"
                    alt=""
                    src="https://duducomics.com/public/linkedin761611.svg"
                  />
                </div>
                <div class="social-icon">
                  <img
                    class="instagram-761608-icon"
                    alt=""
                    src="https://duducomics.com/public/facebook761598.svg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>

        `;

        await sendEmail(userEmail, emailSubject, emailMessage);

        console.log('Email sent successfully');

        res.json({
            message: "Profile updated successfully",
            data: profile,
        });
    } catch (error) {
        console.error("Error updating user details: ", error);
        res.status(500).send({ message: "Internal server error" });
    }
};

// Function to verify user account
export const verifyUserAccount = async (req: Request, res: Response) => {
  const { userId, vcode } = req.body;

  try {
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      const profile = await Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      const emailAddy: string = user?.email ?? '';

      if (user.vcode !== vcode) {
          return res.status(400).json({ message: 'Invalid user ID or verification code' });
      }

      user.status = 'active';
      user.vcode = ''; // Clear the verification code after successful verification
      await user.save();

      const emailSubject = 'Account Verified Successfully';
      const emailMessage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1, width=device-width" />
  <link rel="stylesheet" href="https://duducomics.com/public/index.css" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" />
</head>
<body>
  <div class="frame-parent">
    <div class="frame-group">
      <div class="black-white-minimalist-busin-wrapper">
        <img class="black-white-minimalist-busin" alt="" src="https://duducomics.com/public/black--white-minimalist-business-logo-1-1@2x.png" />
      </div>
      <div class="frame-wrapper">
        <div class="rectangle-parent">
          <img class="frame-child" alt="" src="https://duducomics.com/public/rectangle-1@2x.png" />
          <div class="rectangle-parent">
            <div class="hi-seun-parent">
              <div class="hi-seun">Hi, ${emailAddy}</div>
              <div class="welcome-aboard-to-container">
                <p class="welcome-aboard-to">Your Account Verified Successfully! 🎉</p>
                <p>We're so glad to have you continue this journey with us at Ideas for Africa. Whether you're here to read ideas, engage in discussions, start a brainstorm group, or just have some fun, you're in the right place!</p>
                <p>Your updated profile helps us tailor a better experience for you. If there's anything you need, our team will be here every step of the way.</p>
                <p>Let's dive in and create something amazing together!</p>
                <p>Thanks,</p>
                <p style="margin: 0">The Team</p>
              </div>
            </div>
            <a href="https://ideas-for-africa-deploy.vercel.app" class="button">
                            <div class="label">Explore Ideas</div>
              </a>
          </div>
        </div>
      </div>
      <div class="frame-div">
        <div class="rectangle-parent">
          <div class="this-email-was-container">
            <p class="welcome-aboard-to">This email was sent to ${emailAddy}. If you’d rather not receive this email, you can unsubscribe or manage your email preferences</p>
            <p class="the-team">© 2024 Idea for Africa</p>
          </div>
          <div class="black-white-minimalist-busin-parent">
            <img class="black-white-minimalist-busin" alt="" src="https://duducomics.com/public/black--white-minimalist-business-logo-1-1@2x.png" />
            <div class="social-icon-parent">
              <div class="social-icon">
                <img class="instagram-761608-icon" alt="" src="https://duducomics.com/public/instagram761608.svg" />
              </div>
              <div class="social-icon">
                <img class="instagram-761608-icon" alt="" src="https://duducomics.com/public/twitter761629.svg" />
              </div>
              <div class="social-icon">
                <img class="instagram-761608-icon" alt="" src="https://duducomics.com/public/linkedin761611.svg" />
              </div>
              <div class="social-icon">
                <img class="instagram-761608-icon" alt="" src="https://duducomics.com/public/facebook761598.svg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

      await sendEmail(emailAddy, emailSubject, emailMessage);

      // Redirect the user to the web link after sending the email
      return res.redirect('https://ideas-for-africa-deploy.vercel.app/');

  } catch (error) {
      console.error('Error verifying user account: ', error);
      res.status(500).send({ message: 'Failed to verify user account' });
  }
};

export const verifyUser = async (userId: string, vcode: string) => {
  const user = await User.findById(userId);
  if (!user) {
      throw new Error('User not found');
  }

  if (user.vcode !== vcode) {
      throw new Error('Invalid verification code');
  }

  user.status = 'active';
  user.vcode = ''; // Clear the verification code after successful verification
  await user.save();

  const profile = await Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  const emailAddy: string = user.email;

  const emailSubject = 'Account Verified Successfully';
  const emailMessage = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="initial-scale=1, width=device-width" />
          <link rel="stylesheet" href="https://duducomics.com/public/index.css" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" />
      </head>
      <body>
          <div class="frame-parent">
              <div class="frame-group">
                  <div class="black-white-minimalist-busin-wrapper">
                      <img class="black-white-minimalist-busin" alt="" src="https://duducomics.com/public/black--white-minimalist-business-logo-1-1@2x.png" />
                  </div>
                  <div class="frame-wrapper">
                      <div class="rectangle-parent">
                          <img class="frame-child" alt="" src="https://duducomics.com/public/rectangle-1@2x.png" />
                          <div class="rectangle-parent">
                              <div class="hi-seun-parent">
                                  <div class="hi-seun">Hi, ${emailAddy}</div>
                                  <div class="welcome-aboard-to-container">
                                      <p class="welcome-aboard-to">Your Account Verified Successfully! 🎉</p>
                                      <p>We're so glad to have you continue this journey with us at Ideas for Africa. Whether you're here to read ideas, engage in discussions, start a brainstorm group, or just have some fun, you're in the right place!</p>
                                      <p>Your updated profile helps us tailor a better experience for you. If there's anything you need, our team will be here every step of the way.</p>
                                      <p>Let's dive in and create something amazing together!</p>
                                      <p>Thanks,</p>
                                      <p style="margin: 0">The Team</p>
                                  </div>
                              </div>
                              <a href="https://yourdomain.com/explore" class="button">
                                  <div class="label">Explore Ideas</div>
                              </a>
                          </div>
                      </div>
                  </div>
                  <div class="frame-div">
                      <div class="rectangle-parent">
                          <div class="this-email-was-container">
                              <p class="welcome-aboard-to">This email was sent to ${emailAddy}. If you’d rather not receive this email, you can unsubscribe or manage your email preferences</p>
                              <p class="the-team">© 2024 Idea for Africa</p>
                          </div>
                          <div class="black-white-minimalist-busin-parent">
                              <img class="black-white-minimalist-busin" alt="" src="https://duducomics.com/public/black--white-minimalist-business-logo-1-1@2x.png" />
                              <div class="social-icon-parent">
                                  <div class="social-icon">
                                      <img class="instagram-761608-icon" alt="" src="https://duducomics.com/public/instagram761608.svg" />
                                  </div>
                                  <div class="social-icon">
                                      <img class="instagram-761608-icon" alt="" src="https://duducomics.com/public/twitter761629.svg" />
                                  </div>
                                  <div class="social-icon">
                                      <img class="instagram-761608-icon" alt="" src="https://duducomics.com/public/linkedin761611.svg" />
                                  </div>
                                  <div class="social-icon">
                                      <img class="instagram-761608-icon" alt="" src="https://duducomics.com/public/facebook761598.svg" />
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </body>
      </html>`;

  await sendEmail(emailAddy, emailSubject, emailMessage);

  return {
      userId: user._id,
      status: user.status,
      profile
  };
};

export const fetchUserProfile = async (req: Request, res: Response) => {
  try {
      // Extract the userId from the URL parameters
      const { userId } = req.params;

      // Fetch the user profile using the userId
      const user = await User.findById(userId);
      if(!user){
        return res.status(404).json({ message: 'User does not exist' });
      }

      const profile = await Profile.findOne({ userId: userId });
      if (!profile) {
          //return res.status(404).json({ message: 'Profile not found' });
      }

      res.status(200).json({
          message: 'Profile fetched successfully',
          email: user.email,
          fname: user.fname,
          lname: user.lname,
          profile
      });
  } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<Response> => {
  try {
      const { userId, oldPassword, newPassword } = req.body;

      // Validate the inputs
      if (!userId || !oldPassword || !newPassword) {
          console.log(userId);
          console.log(oldPassword);
          console.log(newPassword);
          return res.status(400).json({ message: 'User ID, old password, and new password are required' });
      }

      // Fetch the user from the database
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Compare the provided old password with the stored hashed password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
          return res.status(401).json({ message: 'Old password is incorrect' });
      }

      // // Hash the new password
      // const saltRounds = 10;
      // const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update the user's password
      user.password = newPassword;
      await user.save();

      return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
      console.error('Error changing password:', error);
      return res.status(500).json({ message: 'Failed to change password' });
  }
};

export const fetchUnreadNotificationsByUserId = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        // Fetch notifications where userId matches and status is 'unread'
        const notifications = await Notification.find({ 'action.userId': userId, status: 'unread' });

        if (notifications.length === 0) {
            return res.status(404).json({ message: `No unread notifications found for userId: ${userId}`,notifications });
        }

        res.status(200).json({
            message: 'Unread notifications fetched successfully',
            notifications
        });
    } catch (error) {
        console.error('Error fetching notifications by userId:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

export const checkAndSetFcmToken = async (req: Request, res: Response) => {
    const { userId, fcmtoken } = req.body;

    if (!userId || !fcmtoken) {
        return res.status(400).json({ message: 'User ID and FCM token are required' });
    }

    try {
        // Fetch the user's profile
        const profile = await Profile.findOne({ userId });

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Check if the fcmtoken is already set
        // if (profile.fcmtoken) {
        //     return res.status(200).json({ message: 'FCM token is already set' });
        // }

        // Update the profile with the new fcmtoken
        profile.fcmtoken = fcmtoken;
        await profile.save();

        res.status(200).json({ message: 'FCM token set successfully', profile });
    } catch (error) {
        console.error('Error checking/setting FCM token:', error);
        res.status(500).json({ message: 'Failed to check/set FCM token' });
    }
};


export const checkFcmToken = async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
      return res.status(400).json({ message: 'User ID and FCM token are required' });
  }

  try {
      // Fetch the user's profile
      const profile = await Profile.findOne({ userId });

      if (!profile) {
          return res.status(404).json({ message: 'Profile not found' });
      }

      // Check if the fcmtoken is already set
      if (profile.fcmtoken) {
        res.status(200).json({ message: 'FCM Token Found', tokenStatus: true });
      }else{
        res.status(200).json({ message: 'FCM Token Found', tokenStatus: false });
      }

  } catch (error) {
      console.error('Error checking FCM token:', error);
      res.status(500).json({ message: 'Failed to check FCM token' });
  }
};

export const ReturnUserToken = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
  }

  try {
      // Fetch the user's profile
      const profile = await Profile.findOne({ userId });

      if (!profile) {
          return res.status(404).json({ message: 'Profile not found' });
      }

      // Check if the fcmtoken is already set
      if (profile.fcmtoken) {
        res.status(200).json({ message: 'FCM Token Found', fcmtoken: profile.fcmtoken });
      } else {
        res.status(404).json({ message: 'FCM Token not found' });
      }

  } catch (error) {
      console.error('Error checking FCM token:', error);
      res.status(500).json({ message: 'Failed to check FCM token' });
  }
};

export const fetchModifiedIdeasByIdeaId = async (req: Request, res: Response) => {
  const { ideaId } = req.query;

  if (!ideaId) {
      return res.status(400).json({ message: 'Idea ID is required' });
  }

  try {
      // Fetch modified ideas where ideaId matches the provided ideaId
      const modifiedIdeas = await ModifiedIdea.find({ originalIdeaId: ideaId });

      if (modifiedIdeas.length === 0) {
          return res.status(200).json({ message: `No modified ideas found for ideaId: ${ideaId}` });
      }

      const modifiedIdeasDetails = await Promise.all(modifiedIdeas.map(async (modified) => {
        const user = await User.findById(modified.userId).select('fname lname');
        const profile = await Profile.findOne({ userId: modified.userId }).select('pow');
        const thumbs = await Thumb.findOne({ ideaId: modified.id }).select('path');
        const commentCounts = await fetchCommentAndReplyCounts(modified.id);
        const ideaLikeCount = await getLikeCountForIdea(modified.id);

        return {
            ...modified.toObject(),
            fname: user?.fname,
            lname: user?.lname,
            pow: profile?.pow,
            banner: thumbs?.path,
            likes: ideaLikeCount,
            count: commentCounts.totalAll
        };
    }));

    res.status(200).json({
        message: 'Modified ideas fetched successfully',
        modifiedIdeas: modifiedIdeasDetails
    });
  } catch (error) {
      console.error('Error fetching modified ideas by ideaId:', error);
      res.status(500).json({ message: 'Failed to fetch modified ideas' });
  }
};

export const fetchModifiedIdeasByUserId = async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId) {
      return res.status(400).json({ message: 'UserId ID is required' });
  }

  try {
      // Fetch modified ideas where ideaId matches the provided ideaId
      const modifiedIdeas = await ModifiedIdea.find({ userId: userId });

      if (modifiedIdeas.length === 0) {
          return res.status(200).json({ message: `No modified ideas found for ideaId: ${userId}` });
      }

      const modifiedIdeasDetails = await Promise.all(modifiedIdeas.map(async (modified) => {
        const user = await User.findById(modified.userId).select('fname lname');
        const profile = await Profile.findOne({ userId: modified.userId }).select('pow');
        const thumbs = await Thumb.findOne({ ideaId: modified.id }).select('path');
        const commentCounts = await fetchCommentAndReplyCounts(modified.id);
        const ideaLikeCount = await getLikeCountForIdea(modified.id);
        const Originalthumbs = await Thumb.findOne({ ideaId: modified.originalIdeaId }).select('path');

        return {
            ...modified.toObject(),
            fname: user?.fname,
            lname: user?.lname,
            pow: profile?.pow,
            banner: thumbs,
            likes: ideaLikeCount,
            count: commentCounts.totalAll,
            OriginalThumb : Originalthumbs
        };
    }));

    res.status(200).json({
        message: 'Modified ideas fetched successfully',
        modifiedIdeas: modifiedIdeasDetails
    });
  } catch (error) {
      console.error('Error fetching modified ideas by ideaId:', error);
      res.status(500).json({ message: 'Failed to fetch modified ideas' });
  }
};
