// src/models/Profile.ts
import mongoose, { Document, Schema } from 'mongoose';

interface IProfile extends Document {
    userId: string;
    phone?: string;
    address?: string;
    state?: string;
    country?: string;
    title?: string;
    pow?: string;
    position?: string;
    url?: string;
    ppicture?: string;
    fcmtoken ?: string;
}

const profileSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    phone: { type: String },
    address: { type: String },
    state: { type: String },
    country: { type: String },
    title: { type: String },
    pow: { type: String },
    position: { type: String },
    url: { type: String },
    ppicture : {type: String},
    fcmtoken : {type: String}
});

const Profile = mongoose.model<IProfile>('Profile', profileSchema);

export default Profile;
