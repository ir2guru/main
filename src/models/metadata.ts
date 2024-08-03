// models/Metadata.js
import mongoose, { Schema, Document } from 'mongoose';

// Define the schema
export const metadataSchema = new Schema({
    groupId: { type: String, required: false },
    userId: { type: String, required: true },
    memberId: { type: String, required: true },
    iniciatorId: { type: String, required: false },
    username: { type: String, required: false },
    typeId: { type: String, required: true }
});

// Create an interface for the metadata document
export interface IMetadata extends Document {
    groupId?: string;
    userId: string;
    memberId: string;
    iniciatorId?: string;
    username?: string;
    ideaheadline?: string;
    typeId: string;
}

// Create the model from the schema
const Metadata = mongoose.model<IMetadata>('Metadata', metadataSchema);

export default Metadata;
