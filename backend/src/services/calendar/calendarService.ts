import { google } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { User } from '../../models/User.js';

export class CalendarService {
  private createOAuthClient(): OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing Google OAuth env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getOAuthUrl(jwtToken: string): string {
    const oauth2Client = this.createOAuthClient();
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'openid',
      'email',
      'profile',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: jwtToken,
    });
  }

  async exchangeCodeAndStoreTokens(code: string, userId: string): Promise<void> {
    const oauth2Client = this.createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    await User.findByIdAndUpdate(userId, { googleTokens: tokens as any });
  }

  private async getAuthorizedClient(userId: string): Promise<OAuth2Client | null> {
    const user = await User.findById(userId);
    if (!user || !user.googleTokens) return null;

    const client = this.createOAuthClient();
    client.setCredentials(user.googleTokens as any);
    return client;
  }

  async listUpcomingEvents(userId: string, maxResults: number = 20): Promise<any[]> {
    const authClient = await this.getAuthorizedClient(userId);
    if (!authClient) throw new Error('Google not connected');

    const calendar = google.calendar({ version: 'v3', auth: authClient });
    const nowIso = new Date().toISOString();
    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: nowIso,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return data.items || [];
  }

  async createEvent(
    userId: string,
    event: { summary: string; description?: string; location?: string; start: string; end: string; timeZone?: string }
  ): Promise<any> {
    const authClient = await this.getAuthorizedClient(userId);
    if (!authClient) throw new Error('Google not connected');

    const calendar = google.calendar({ version: 'v3', auth: authClient });
    const { data } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: { dateTime: event.start, timeZone: event.timeZone },
        end: { dateTime: event.end, timeZone: event.timeZone },
      },
    });

    return data;
  }
}

export const calendarService = new CalendarService();
