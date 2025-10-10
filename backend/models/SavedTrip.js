import mongoose from "mongoose";

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    days: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    total: { type: Number, required: true, min: 0 },
    travel: { type: Number, required: true, min: 0 },
    accommodation: { type: Number, required: true, min: 0 },
    food: { type: Number, required: true, min: 0 },
    events: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: ["capped", "flexible"], default: "capped" },
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    duration: { type: String },
    estimatedCost: { type: String },
    location: { type: mongoose.Schema.Types.Mixed }, // Allow both string and object coordinates
    rating: { type: Number },
    imageUrl: { type: String },
    // Completion tracking for this activity
    isCompleted: { type: Boolean, default: false },
  },
  { _id: false }
);

const timeSlotSchema = new mongoose.Schema(
  {
    period: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    activities: { type: [activitySchema], default: [] },
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true },
    title: { type: String, required: true },
    timeSlots: { type: [timeSlotSchema], default: [] },
  },
  { _id: false }
);

const tripMetadataSchema = new mongoose.Schema(
  {
    destination: { type: String, required: true },
    numberOfPeople: { type: Number, required: true },
    travelers: { type: Number },
    budget: {
      perDay: { type: Number },
      breakdown: {
        activities: { type: Number },
        accommodation: { type: Number },
        food: { type: Number },
        travel: { type: Number },
      },
    },
  },
  { _id: false }
);

const itinerarySchema = new mongoose.Schema(
  {
    days: { type: [daySchema], required: true },
    tripMetadata: { type: tripMetadataSchema, required: true },
  },
  { _id: false }
);

const savedTripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Original trip data
    startDate: { type: Date, required: true },
    cities: {
      type: [citySchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    totalDays: { type: Number, required: true, min: 1 },
    people: { type: Number, required: true, min: 1 },
    travelType: { type: String, required: true },
    budget: { type: budgetSchema, required: true },
    budgetMode: {
      type: String,
      enum: ["capped", "flexible"],
      default: "capped",
    },
    // Generated itinerary data
    generatedItinerary: {
      type: itinerarySchema,
      required: true,
    },
    // Additional metadata
    isPublic: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    // Upcoming trip status
    isUpcoming: { type: Boolean, default: false },
    tripStartDate: { type: Date }, // When the actual trip starts
    tripEndDate: { type: Date }, // When the actual trip ends
    // Completion tracking
    isCompleted: { type: Boolean, default: false },
    // percentage from 0-100 rounded integer
    completionPercent: { type: Number, default: 0, min: 0, max: 100 },
    // Flat list of activity identifiers like "dayIndex-timeSlotIndex-activityIndex"
    completedActivities: { type: [String], default: [] },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for better query performance
savedTripSchema.index({ user: 1, createdAt: -1 });
savedTripSchema.index({ title: "text", description: "text" });
savedTripSchema.index({ user: 1, isUpcoming: 1, tripStartDate: 1 });
savedTripSchema.index({ user: 1, isCompleted: 1, completionPercent: 1 });

const SavedTrip = mongoose.model("SavedTrip", savedTripSchema);
export default SavedTrip;
