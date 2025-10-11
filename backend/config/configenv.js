import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

// Amadeus API Configuration
export const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
export const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;
