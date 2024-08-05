// services/notificationService.js
import Notification, { INotification } from '../models/Notification';
import Metadata, { IMetadata } from '../models/metadata';

/**
 * Creates and saves a notification for a user.
 * @param title - The title of the notification.
 * @param type - The type of the entity (e.g., 'idea', 'comment', 'group').
 * @param body - Message from System
 * @param action - Metadata object containing additional details.
 */
export const createNotification = async (
    title: string,
    type: string,
    body: string,
    action: IMetadata
): Promise<INotification> => {
    try {
        const newNotification = new Notification({
            title,
            type,
            status: 'unread',
            body,
            time: new Date(),
            action
        });

        await newNotification.save();
        console.log(newNotification);
        return newNotification;
       
    } catch (error) {
        console.error('Error creating notification:', error);
        throw new Error('Failed to create notification');
    }
};
