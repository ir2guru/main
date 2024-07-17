// src/models/IdeaView.ts
import mongoose, { Document, Schema } from 'mongoose';

interface IIdeaView extends Document {
    ideaId: String;
    userId: String;
    viewedAt: Date;
}

const ideaViewSchema: Schema = new Schema({
    ideaId: { type: String, ref: 'Idea', required: true },
    userId: { type: String, ref: 'User', required: true },
    viewedAt: { type: Date, default: Date.now }
});

const IdeaView = mongoose.model<IIdeaView>('IdeaView', ideaViewSchema);

export default IdeaView;
