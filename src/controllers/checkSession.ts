import { Request, Response } from 'express';

// Function to check if a user has a valid session
export const checkSession = (req: Request, res: Response) => {
    // Check if user is attached to request object (set by verifyToken middleware)
    const user = (req as any).user;

    if (user) {
        // User is authenticated
        res.status(200).json({ message: 'User has a valid session', user, status: true });
    } else {
        // User is not authenticated
        res.status(401).json({ message: 'User does not have a valid session', status: false });
    }
};
