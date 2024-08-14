// Idea model (models/Idea.ts)
import mongoose, { Document, Schema } from 'mongoose';

export interface IIdea extends Document {
    _id: string;
    headline: string;
    summary: string;
    body: string;
    minbud: string;
    maxbud: string;
    category: string;
    createdAt: Date;
    status: string;
    userId: string;  // Added userId to the interface
}

const ideaSchema: Schema = new Schema({
    _id: String,
    headline: { type: String, required: true },
    summary: { type: String, required: true },
    body: { type: String, required: true },
    minbud: { type: String, required: false },
    maxbud: { type: String, required: false },
    category: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    status: {type: String, default: 'allowed'},
    userId: { type: String, required: true },  // Added userId to the schema
});

const Idea = mongoose.model<IIdea>('Idea', ideaSchema);
export default Idea;
