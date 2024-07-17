import mongoose, { Schema } from 'mongoose';

export interface IDocument {
    originalName: string;
    mimeType: string;
    size: number;
    ideaId: string;
    path: string;
}

const documentSchema: Schema = new Schema({
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    ideaId: { type: String, required: true } // Define ideaId as a string
});

const Document = mongoose.model<IDocument>('Document', documentSchema);
export default Document;
