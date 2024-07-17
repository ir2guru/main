import nodemailer from 'nodemailer';
import { Request, Response } from 'express';

// Function to send activation email
export const sendActivationEmail = async (req: Request, res: Response) => {
    // Extract the user's email from the request
    const { email } = req.body;

    // Check if the email is provided
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    // Create a transporter to send emails (you need to set up your own SMTP server details)
    const transporter = nodemailer.createTransport({
        host: 'smtp.example.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'your_smtp_username',
            pass: 'your_smtp_password'
        }
    });

    // Email content
    const mailOptions = {
        from: 'your_email@example.com',
        to: email,
        subject: 'Activation Email',
        text: `Hello,\n\nYou have been sent an activation email.\n\nThank you.`
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Activation email sent successfully" });
    } catch (error) {
        console.error("Error sending activation email:", error);
        res.status(500).json({ message: "Failed to send activation email" });
    }
};
