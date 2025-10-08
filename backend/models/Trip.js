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

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true },
    cities: {
      type: [citySchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    totalDays: { type: Number, required: true, min: 1 },
    people: { type: Number, required: true, min: 1 },
    travelType: { type: String, required: true },
    budget: { type: budgetSchema, required: true },
  },
  { timestamps: true }
);

const Trip = mongoose.model("Trip", tripSchema);
export default Trip;
