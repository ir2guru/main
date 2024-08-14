// src/models/modifiedIdea.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IModifiedIdea extends Document {
    _id: string;
    headline: string;
    summary: string;
    body: string;
    minbud: string;
    maxbud: string;
    category: string;
    createdAt: Date;
    originalIdeaId: string;
    userId: string;
}

const modifiedIdeaSchema: Schema  = new Schema({
    _id: String,
    headline: { type: String, required: true },
    summary: { type: String, required: true },
    body: { type: String, required: true },
    minbud: { type: String, required: false },
    maxbud: { type: String, required: false },
    category: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    originalIdeaId: { type: String, required: true, ref: 'Idea' },
    userId: { type: String, required: true, ref: 'User' },
});

const ModifiedIdea = mongoose.model<IModifiedIdea>('ModifiedIdea', modifiedIdeaSchema);

export default ModifiedIdea;
