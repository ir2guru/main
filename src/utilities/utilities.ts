// utilities/utilities.js
import mongoose, { Schema } from 'mongoose';

export const metadataSchema = new Schema({
    groupId: { type: String },
    userId: { type: String },
    memberId: { type: String },
    iniciatorId: { type: String },
    username: { type: String },
    typeId: { type: String }
});


