import nodemailer from 'nodemailer';
import User from '../models/user';

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: '74bf26001@smtp-brevo.com',
        pass: 'zQgEa7c2HhGCtU6k',
    },
});

// Function to fetch user email by userId
const getUserEmailById = async (userId: string): Promise<string | null> => {
    try {
        const user = await User.findById(userId);
        return user ? user.email : null;
    } catch (error) {
        console.error('Error fetching user email:', error);
        throw error;
    }
};

// Email sending function
export const sendEmail = async (userId: string, subject: string, text: string, html?: string) => {
    const userEmail = await getUserEmailById(userId);
    if (!userEmail) {
        throw new Error('User email not found');
    }

    const mailOptions = {
        from: '"Your App Name" <your-email@example.com>', // sender address
        to: userEmail, // list of receivers
        subject, // Subject line
        text, // plain text body
        html, // html body (optional)
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email: ', error);
        throw error;
    }
};
