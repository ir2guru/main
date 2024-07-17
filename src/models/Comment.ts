import { Schema, model, Document, Types } from 'mongoose';

interface CommentDocument extends Document {
    ideaId: string;
    userId: string;
    content: string;
    replies: Types.ObjectId[];
    createdAt: Date;
}

const commentSchema = new Schema<CommentDocument>({
    ideaId: { type: String, ref: 'Idea', required: true },
    userId: { type: String, ref: 'User', required: true },
    content: { type: String, required: true },
    replies: [{ type: Schema.Types.ObjectId, ref: 'Reply' }],
    createdAt: { type: Date, default: Date.now }
});

export default model<CommentDocument>('Comment', commentSchema);
