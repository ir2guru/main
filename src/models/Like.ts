import mongoose, { Schema, Document } from 'mongoose';

interface LikeDocument extends Document {
    userId: string;
    ideaId: string;
}

const LikeSchema: Schema<LikeDocument> = new Schema({
    userId: { type: String, ref: 'User', required: true },
    ideaId: { type: String, ref: 'Idea', required: true },
}, { timestamps: true });

const Like = mongoose.model<LikeDocument>('Like', LikeSchema);

export default Like;
