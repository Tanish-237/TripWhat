import mongoose from 'mongoose';

const placeRefSchema = new mongoose.Schema({
  name: { type: String, required: true },
  placeId: { type: String },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
  category: { type: String },
  rating: { type: Number },
}, { _id: false });

const routeTemplateSchema = new mongoose.Schema({
  nights: { type: Number, required: true },
  cities: [{ type: String }],
  rationale: { type: String },
}, { _id: false });

const destinationBaselineSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  country: { type: String },
  placeId: { type: String },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
  popularityScore: { type: Number, default: 0 },
  topAttractions: { type: [placeRefSchema], default: [] },
  topRestaurants: { type: [placeRefSchema], default: [] },
  neighborhoods: { type: [placeRefSchema], default: [] },
  routeTemplates: { type: [routeTemplateSchema], default: [] },
  refreshedAt: { type: Date, default: Date.now },
  ttlDays: { type: Number, default: 30 },
}, { timestamps: true });

destinationBaselineSchema.index({ name: 'text', country: 'text' });

export const DestinationBaseline = mongoose.model('DestinationBaseline', destinationBaselineSchema);
