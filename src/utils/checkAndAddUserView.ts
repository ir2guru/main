import { Request, Response } from 'express';
import IdeaView from '../models/IdeaView';
import mongoose from 'mongoose';

export const checkAndAddUserView = async (ideaId: String, userId: String): Promise<void> => {
    try {
        const existingView = await IdeaView.findOne({ ideaId, userId });

        if (!existingView) {
            const newView = new IdeaView({ ideaId, userId });
            await newView.save();
        }
    } catch (error) {
        console.error('Error checking and adding user view:', error);
        throw error;
    }
};
