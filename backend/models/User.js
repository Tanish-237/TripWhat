import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
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
      interests: {
        type: [String],
        default: []
      },
      notificationsEnabled: {
        type: Boolean,
        default: true
      },
      darkMode: {
        type: Boolean,
        default: false
      }
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
