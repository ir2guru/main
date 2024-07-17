import mongoose, { Schema, Document } from 'mongoose';

interface IGroup extends Document {
    ideaId: string;
    name: string;
    admin: string;
    createdAt: Date;
}

const GroupSchema: Schema = new Schema({
    ideaId: { type: String, required: true, ref: 'Idea' },
    name: { type: String, required: true },
    admin: { type: String, required: true, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IGroup>('Group', GroupSchema);
