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
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  avatarUrl: {
    type: String,
    default: function() {
      return `https://api.dicebear.com/7.x/adventurer/svg?seed=${this.name || 'Traveler'}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    }
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
    }],
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  conversations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  }]
}, {
  timestamps: true
});

export const User = mongoose.model('User', userSchema);