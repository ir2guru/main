import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Middleware to verify JWT token
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    // Get token from request headers, query, or cookies
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authorization token is missing' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, 'IDEA_AFRICA');

        // Attach decoded user data to request object
        (req as any).user = decoded;

        next(); // Move to the next middleware or route handler
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};
