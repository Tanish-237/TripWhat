import "./config/configenv.js";

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import savedTripRoutes from "./routes/savedTripRoutes.js";
import placesRoutes from "./routes/placesRoutes.js";
import auth from "./middleware/auth.js";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import tripAutoCompletionService from "./services/tripAutoCompletionService.js";

const port = 8080;
const mongoUri = process.env.MONGODB_URI;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/saved-trips", savedTripRoutes);
app.use("/api/places", placesRoutes);

// In-memory token store; for production, persist to DB
const userGoogleTokens = new Map();

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
  process.env;
const FRONTEND_APP_URL =
  process.env.FRONTEND_APP_URL || "http://localhost:5173";

function createOAuthClient() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error(
      "Missing Google OAuth env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI"
    );
  }
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

// Generate Google OAuth URL (embed JWT in state for callback association)
app.get("/api/google/oauth/url", auth, (req, res) => {
  try {
    const oauth2Client = createOAuthClient();
    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "openid",
      "email",
      "profile",
    ];

    const authHeader = req.headers.authorization || "";
    const jwtToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
      state: jwtToken || undefined,
    });

    return res.json({ url });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// OAuth callback to exchange code for tokens
// Note: No auth middleware here; we rely on JWT passed via `state` to identify the user
app.get("/api/google/oauth/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ message: "Missing code" });
    const state = req.query.state;
    if (!state) return res.status(400).json({ message: "Missing state" });

    // Verify JWT from state to get userId
    const JWT_SECRET = process.env.JWT_SECRET;
    let userId;
    try {
      const payload = jwt.verify(state, JWT_SECRET);
      userId = payload.sub || payload.userId;
    } catch (e) {
      return res.status(401).json({ message: "Invalid state token" });
    }

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    userGoogleTokens.set(userId, tokens);

    const redirectUrl = `${FRONTEND_APP_URL}/upcoming-trips?gcal=connected`;
    return res.redirect(302, redirectUrl);
  } catch (err) {
    try {
      const redirectUrl = `${FRONTEND_APP_URL}/upcoming-trips?gcal=error&reason=${encodeURIComponent(
        err.message || "unknown"
      )}`;
      return res.redirect(302, redirectUrl);
    } catch (e) {
      return res.status(500).json({ message: err.message });
    }
  }
});

function getAuthorizedOAuthClient(userId) {
  const tokens = userGoogleTokens.get(userId);
  if (!tokens) return null;
  const client = createOAuthClient();
  client.setCredentials(tokens);
  return client;
}

// Check Google Calendar connection status
app.get("/api/google/calendar/status", auth, async (req, res) => {
  try {
    const authClient = getAuthorizedOAuthClient(req.userId);
    if (!authClient) {
      return res.json({ connected: false, message: "Google not connected" });
    }

    // Try to make a simple API call to verify the tokens are still valid
    const calendar = google.calendar({ version: "v3", auth: authClient });
    await calendar.calendarList.list({ maxResults: 1 });

    return res.json({ connected: true, message: "Google Calendar connected" });
  } catch (err) {
    // If the API call fails, the tokens are likely expired or invalid
    console.error("Google Calendar status check failed:", err);

    // Remove invalid tokens from memory
    userGoogleTokens.delete(req.userId);

    return res.json({
      connected: false,
      message: "Google Calendar connection expired or invalid",
    });
  }
});

// List upcoming events from the user's Google Calendar
app.get("/api/google/calendar/upcoming", auth, async (req, res) => {
  try {
    const authClient = getAuthorizedOAuthClient(req.userId);
    if (!authClient)
      return res.status(401).json({ message: "Google not connected" });

    const calendar = google.calendar({ version: "v3", auth: authClient });
    const nowIso = new Date().toISOString();
    const { data } = await calendar.events.list({
      calendarId: "primary",
      timeMin: nowIso,
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    return res.json({ events: data.items || [] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Create a new event in the user's Google Calendar
app.post("/api/google/calendar/events", auth, async (req, res) => {
  try {
    const authClient = getAuthorizedOAuthClient(req.userId);
    if (!authClient)
      return res.status(401).json({ message: "Google not connected" });

    const { summary, description, location, start, end, timeZone } = req.body;
    if (!summary || !start || !end) {
      return res
        .status(400)
        .json({ message: "summary, start, and end are required" });
    }

    const calendar = google.calendar({ version: "v3", auth: authClient });
    const event = {
      summary,
      description,
      location,
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
    };

    const { data } = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return res.status(201).json({ event: data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("API Working");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);

  // Start the trip auto-completion service
  tripAutoCompletionService.start();
});
