import mongoose from "mongoose";

// Flight segment schema for detailed flight information
const flightSegmentSchema = new mongoose.Schema(
  {
    segmentId: { type: String, required: true },
    airline: {
      carrierCode: { type: String, required: true },
      name: { type: String },
    },
    flight: {
      number: { type: String, required: true },
      aircraft: { type: String },
    },
    departure: {
      airport: {
        iataCode: { type: String, required: true },
        name: { type: String },
        city: { type: String },
        terminal: { type: String },
      },
      time: { type: Date, required: true },
    },
    arrival: {
      airport: {
        iataCode: { type: String, required: true },
        name: { type: String },
        city: { type: String },
        terminal: { type: String },
      },
      time: { type: Date, required: true },
    },
    duration: { type: String, required: true },
    stops: { type: Number, default: 0 },
    cabin: {
      type: String,
      enum: ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"],
    },
    bookingClass: { type: String },
  },
  { _id: false }
);

// Flight offer schema
const flightOfferSchema = new mongoose.Schema(
  {
    offerId: { type: String, required: true },
    price: {
      total: { type: Number, required: true },
      currency: { type: String, required: true, default: "USD" },
      base: { type: Number },
      fees: [
        {
          amount: { type: Number },
          type: { type: String },
        },
      ],
    },
    segments: [flightSegmentSchema],
    validatingAirline: { type: String },
    instantTicketing: { type: Boolean, default: false },
    paymentCardRequired: { type: Boolean, default: false },
    lastTicketingDate: { type: Date },
  },
  { _id: false }
);

// Ground transport option schema
const groundTransportSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["TRAIN", "BUS", "CAR_RENTAL", "TAXI", "RIDE_SHARE"],
      required: true,
    },
    provider: { type: String },
    duration: { type: String, required: true },
    cost: {
      amount: { type: Number, required: true },
      currency: { type: String, required: true, default: "USD" },
    },
    description: { type: String, required: true },
    bookingUrl: { type: String },
    departureLocation: { type: String },
    arrivalLocation: { type: String },
  },
  { _id: false }
);

// Travel route schema for connections between cities
const travelRouteSchema = new mongoose.Schema(
  {
    routeId: { type: String, required: true },
    from: {
      city: { type: String, required: true },
      airport: {
        iataCode: { type: String },
        name: { type: String },
      },
    },
    to: {
      city: { type: String, required: true },
      airport: {
        iataCode: { type: String },
        name: { type: String },
      },
    },
    departureDate: { type: Date, required: true },
    returnDate: { type: Date }, // For round trips
    travelMode: {
      type: String,
      enum: ["FLIGHT", "GROUND", "MIXED"],
      required: true,
    },
    flights: [flightOfferSchema],
    groundTransport: [groundTransportSchema],
    estimatedTravelTime: { type: String },
    estimatedCost: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
      currency: { type: String, required: true, default: "USD" },
    },
    distance: { type: Number }, // in kilometers
    recommended: { type: Boolean, default: false },
    notes: { type: String },
  },
  { _id: false }
);

// Travel plan schema to include all transportation for the trip
const travelPlanSchema = new mongoose.Schema(
  {
    routes: [travelRouteSchema],
    totalEstimatedCost: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
    },
    totalTravelTime: { type: String },
    lastUpdated: { type: Date, default: Date.now },
    preferences: {
      preferredAirlines: [{ type: String }],
      travelClass: {
        type: String,
        enum: ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"],
        default: "ECONOMY",
      },
      maxStops: { type: Number, default: 2 },
      preferDirectFlights: { type: Boolean, default: false },
      preferGroundTransport: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const TravelPlan = mongoose.model("TravelPlan", travelPlanSchema);

export {
  TravelPlan,
  travelPlanSchema,
  travelRouteSchema,
  flightOfferSchema,
  flightSegmentSchema,
  groundTransportSchema,
};
