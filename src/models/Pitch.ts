import mongoose, { Schema, Document } from 'mongoose';

// Define the Pitch interface extending Mongoose Document
interface IPitch extends Document {
    ideaId: string;
    step: string;
    count: number;
}

// Create the Pitch schema
const PitchSchema: Schema = new Schema({
    ideaId: { type: String, required: true, ref: 'Idea' }, // Reference to Idea model
    step: { type: String, required: true },
    count: { type: Number, required: true }
});

// Create and export the Pitch model
export default mongoose.model<IPitch>('Pitch', PitchSchema);
