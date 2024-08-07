import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
    email: string;
    password: string;
    fname: string;
    lname: string;
    status: string; // Status field
    vcode: string; // Verification code field
    comparePassword: (candidatePassword: string) => Promise<boolean>;
}

const userSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    fname:{type: String, required: true},
    lname:{type: String, required: true},
    status: { type: String, default: 'inactive' }, // Default status is 'inactive'
    vcode: { type: String, default: '' } // Default verification code is empty
});

// Pre-save hook to hash the password
userSchema.pre<IUser>('save', async function(next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
