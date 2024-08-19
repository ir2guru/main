import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for Occupation
export interface IOccupation extends Document {
    jobTitle: string;
}

// Create the schema for Occupation
const occupationSchema: Schema = new Schema({
    jobTitle: { type: String, required: true },
});

// Create and export the Occupation model
const Occupation = mongoose.model<IOccupation>('Occupation', occupationSchema);

export default Occupation;
