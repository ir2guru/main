import mongoose, { Schema, Document } from 'mongoose';

interface IMember extends Document {
    groupId: string;
    userId: string;
    status: string; // 'invited', 'accepted'
    joinedAt: Date | null;
}

const MemberSchema: Schema = new Schema({
    groupId: { type: String, required: true, ref: 'Group' },
    userId: { type: String, required: true, ref: 'User' },
    status: { type: String, required: true, enum: ['invited', 'accepted', 'pending', 'suspended', 'requested', 'declined'], default: 'invited' },
    joinedAt: { type: Date, default: null },
});

export default mongoose.model<IMember>('Member', MemberSchema);

