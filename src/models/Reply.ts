import { Schema, model, Document, Types } from 'mongoose';

interface ReplyDocument extends Document {
    commentId: string;
    userId: string;
    repliedToUserId: string;
    content: string;
    createdAt: Date;
}

const replySchema = new Schema<ReplyDocument>({
    commentId: { type: String, ref: 'Comment', required: true },
    userId: { type: String, ref: 'User', required: true },
    repliedToUserId: { type: String, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default model<ReplyDocument>('Reply', replySchema);
