/**
 * Migration script: Conversations with itinerary → Trip documents
 * 
 * Usage:
 *   npx tsx scripts/migrate-trips.ts --dry-run   # Preview changes
 *   npx tsx scripts/migrate-trips.ts              # Execute migration
 */

import mongoose from 'mongoose';
import { Trip } from '../src/models/Trip.js';
import { Conversation } from '../src/models/Conversation.js';

async function migrateTrips(dryRun: boolean = true) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tripwhat';

  console.log(`\n🔄 Trip Migration Script`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes)' : 'EXECUTE'}`);
  console.log(`   DB: ${mongoUri}\n`);

  await mongoose.connect(mongoUri);

  // Find all conversations that have an itinerary
  const conversations = await (Conversation as any).find({
    itinerary: { $exists: true, $ne: null },
  });

  console.log(`Found ${conversations.length} conversations with itineraries\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const conv of conversations) {
    try {
      const itin = conv.itinerary;
      if (!itin || !itin.days || itin.days.length === 0) {
        skipped++;
        continue;
      }

      const userId = conv.userId || conv.user;
      if (!userId) {
        console.log(`  ⚠️  Skipping conversation ${conv.conversationId}: no userId`);
        skipped++;
        continue;
      }

      const tripData = {
        user: userId,
        title: itin.tripMetadata?.destination || `Trip ${conv.conversationId}`,
        description: '',
        startDate: itin.tripMetadata?.startDate || new Date(),
        startLocation: itin.tripMetadata?.startLocation || '',
        cities: (itin.tripMetadata?.cities || [{ name: itin.tripMetadata?.destination, days: itin.days.length }]).map((c: any) => ({
          name: c.name,
          days: c.days,
        })),
        totalDays: itin.days.length,
        people: itin.tripMetadata?.travelers || 1,
        travelType: itin.tripMetadata?.travelType || 'leisure',
        budget: {
          total: itin.tripMetadata?.budget?.total || 0,
          travel: 0,
          accommodation: 0,
          food: 0,
          events: 0,
          mode: 'capped',
        },
        budgetMode: 'capped',
        generatedItinerary: {
          days: itin.days.map((d: any) => ({
            dayNumber: d.dayNumber,
            title: d.title || `Day ${d.dayNumber}`,
            timeSlots: (d.timeSlots || []).map((ts: any) => ({
              period: ts.period || ts.label || 'morning',
              startTime: ts.startTime || '09:00',
              endTime: ts.endTime || '12:00',
              activities: (ts.activities || []).map((a: any) => ({
                name: a.name || a.title || '',
                description: a.description || '',
                category: a.type || '',
                duration: a.duration || '',
                estimatedCost: typeof a.cost === 'string' ? a.cost : `${a.cost?.amount || 0} ${a.cost?.currency || 'USD'}`,
                location: a.location || a.coordinates || null,
                rating: a.rating,
                imageUrl: a.imageUrl || (a.photos && a.photos[0]) || '',
              })),
            })),
          })),
          tripMetadata: {
            destination: itin.tripMetadata?.destination || '',
            numberOfPeople: itin.tripMetadata?.travelers || 1,
            startLocation: itin.tripMetadata?.startLocation || '',
          },
        },
        isUpcoming: false,
        isCompleted: false,
      };

      if (dryRun) {
        console.log(`  📋 Would migrate: "${tripData.title}" (${tripData.totalDays} days, ${tripData.cities.length} cities)`);
      } else {
        const trip = new Trip(tripData);
        await trip.save();
        console.log(`  ✅ Migrated: "${tripData.title}" → Trip ${trip._id}`);
      }
      migrated++;
    } catch (err: any) {
      console.error(`  ❌ Error migrating conversation ${conv.conversationId}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Errors:   ${errors}\n`);

  await mongoose.disconnect();
}

// CLI entry point
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

migrateTrips(dryRun).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
