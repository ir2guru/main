// src/utils/generateToken.ts
import jwt from 'jsonwebtoken';

const generateToken = (userId: string) => {
    const secretKey = process.env.JWT_SECRET || 'your_very_secret_key';  // Ensure you have this in your environment variables or configure it securely
    const expiresIn = process.env.JWT_EXPIRES_IN;  // Token expiration time

    return jwt.sign({ id: userId }, secretKey, { expiresIn });
};

export default generateToken;
