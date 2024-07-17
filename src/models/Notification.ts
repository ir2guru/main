// models/Notification.js
import mongoose, { Schema, Document } from 'mongoose';
import { metadataSchema } from '../utilities/utilities';

export interface INotification extends Document {
    title: string;
    type: string;
    status: string;
    body: string;
    time: Date;
    action: typeof metadataSchema
}

const NotificationSchema: Schema = new Schema({
    title: { type: String, required: true },
    type: {type: String},
    status: { type: String, required: true, default: 'unread' },
    body: { type: String, required: true },
    time: { type: Date, required: true, default: Date.now },
    action: metadataSchema
});

export default mongoose.model<INotification>('Notification', NotificationSchema);
