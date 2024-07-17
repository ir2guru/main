// src/models/thumb.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IThumb extends Document {
    originalName: string;
    mimeType: string;
    size: number;
    ideaId: string;
    path: string;
}

const thumbSchema: Schema<IThumb> = new Schema({
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    ideaId: { type: String, required: true }, // Change this to string
    path: { type: String, required: true },
});

const Thumb = mongoose.model<IThumb>('Thumb', thumbSchema);

export default Thumb;
