import User from "../models/user";

export const doesUserExistByEmail = async (email: string): Promise<boolean> => {
    try {
        // Check if a user with the specified email exists
        const user = await User.findOne({ email }).exec();
        return user !== null;
    } catch (error) {
        console.error('Error checking if user exists:', error);
        throw new Error('Failed to check user existence');
    }
};
