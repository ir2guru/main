import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the document
export interface INewsletterSubscriber extends Document {
  email: string;
}

// Define the schema
const NewsletterSubscriberSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (v: string) => /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}/.test(v),
      message: (props: { value: string }) => `${props.value} is not a valid email!`,
    },
  },
});

// Create the model
const NewsletterSubscriber = mongoose.model<INewsletterSubscriber>('NewsletterSubscriber', NewsletterSubscriberSchema);

export default NewsletterSubscriber;
