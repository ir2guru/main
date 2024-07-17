import mongoose, { Schema, Document } from 'mongoose';

// Interface representing a document in MongoDB.
interface IMessage extends Document {
    roomID: string;
    username: string;
    photourl: string;
    text: string;
    timestamp: Date;
}

// Schema corresponding to the document interface.
const messageSchema: Schema = new Schema({
    roomID: { type: String, required: true },
    username: { type: String, required: true },
    photourl: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

// Model.
export default mongoose.model<IMessage>('Message', messageSchema);
