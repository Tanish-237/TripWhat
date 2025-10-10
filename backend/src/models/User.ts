import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  preferences: {
    budget: {
      type: String,
      enum: ['budget', 'mid-range', 'luxury'],
      default: 'mid-range'
    },
    travelStyle: {
      type: String,
      enum: ['adventure', 'relaxation', 'cultural', 'business'],
      default: 'cultural'
    },
    interests: [{
      type: String,
      enum: ['museums', 'nightlife', 'nature', 'food', 'shopping', 'history', 'art']
    }]
  },
  conversations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  }]
}, {
  timestamps: true
});

export const User = mongoose.model('User', userSchema);