/**
 * Seed DestinationBaseline collection with top ~200 destinations
 * 
 * Usage:
 *   npx tsx scripts/seed-baselines.ts --dry-run   # Preview
 *   npx tsx scripts/seed-baselines.ts              # Execute
 */

import mongoose from 'mongoose';
import { DestinationBaseline } from '../src/models/DestinationBaseline.js';

const TOP_DESTINATIONS = [
  // Japan
  { name: 'Tokyo', country: 'Japan', popularityScore: 98, routeTemplates: [{ nights: 7, cities: ['Tokyo', 'Kyoto', 'Osaka'], rationale: 'Classic Japan golden route' }, { nights: 10, cities: ['Tokyo', 'Hakone', 'Kyoto', 'Osaka'], rationale: 'Extended with Hakone' }] },
  { name: 'Kyoto', country: 'Japan', popularityScore: 95, routeTemplates: [{ nights: 7, cities: ['Tokyo', 'Kyoto', 'Osaka'], rationale: 'Classic Japan golden route' }] },
  { name: 'Osaka', country: 'Japan', popularityScore: 90, routeTemplates: [{ nights: 7, cities: ['Tokyo', 'Kyoto', 'Osaka'], rationale: 'Classic Japan golden route' }] },
  { name: 'Hakone', country: 'Japan', popularityScore: 70, routeTemplates: [{ nights: 10, cities: ['Tokyo', 'Hakone', 'Kyoto', 'Osaka'], rationale: 'Extended with hot springs' }] },
  { name: 'Nara', country: 'Japan', popularityScore: 65 },
  { name: 'Hiroshima', country: 'Japan', popularityScore: 60 },
  { name: 'Sapporo', country: 'Japan', popularityScore: 55 },
  { name: 'Fukuoka', country: 'Japan', popularityScore: 50 },

  // France
  { name: 'Paris', country: 'France', popularityScore: 99, routeTemplates: [{ nights: 7, cities: ['Paris', 'Nice', 'Lyon'], rationale: 'Classic France tour' }, { nights: 5, cities: ['Paris', 'Versailles'], rationale: 'Paris + Versailles' }] },
  { name: 'Nice', country: 'France', popularityScore: 80 },
  { name: 'Lyon', country: 'France', popularityScore: 72 },
  { name: 'Bordeaux', country: 'France', popularityScore: 68 },
  { name: 'Marseille', country: 'France', popularityScore: 60 },
  { name: 'Avignon', country: 'France', popularityScore: 55 },

  // Italy
  { name: 'Rome', country: 'Italy', popularityScore: 97, routeTemplates: [{ nights: 10, cities: ['Rome', 'Florence', 'Venice'], rationale: 'Classic Italy trio' }, { nights: 7, cities: ['Rome', 'Amalfi'], rationale: 'Rome + Amalfi coast' }] },
  { name: 'Florence', country: 'Italy', popularityScore: 92, routeTemplates: [{ nights: 10, cities: ['Rome', 'Florence', 'Venice'], rationale: 'Classic Italy trio' }] },
  { name: 'Venice', country: 'Italy', popularityScore: 90, routeTemplates: [{ nights: 10, cities: ['Rome', 'Florence', 'Venice'], rationale: 'Classic Italy trio' }] },
  { name: 'Milan', country: 'Italy', popularityScore: 85 },
  { name: 'Naples', country: 'Italy', popularityScore: 75 },
  { name: 'Amalfi', country: 'Italy', popularityScore: 78 },
  { name: 'Cinque Terre', country: 'Italy', popularityScore: 70 },

  // Spain
  { name: 'Barcelona', country: 'Spain', popularityScore: 95, routeTemplates: [{ nights: 7, cities: ['Barcelona', 'Madrid', 'Seville'], rationale: 'Classic Spain tour' }] },
  { name: 'Madrid', country: 'Spain', popularityScore: 88, routeTemplates: [{ nights: 7, cities: ['Barcelona', 'Madrid', 'Seville'], rationale: 'Classic Spain tour' }] },
  { name: 'Seville', country: 'Spain', popularityScore: 78 },
  { name: 'Valencia', country: 'Spain', popularityScore: 70 },
  { name: 'Granada', country: 'Spain', popularityScore: 72 },
  { name: 'Bilbao', country: 'Spain', popularityScore: 60 },

  // UK
  { name: 'London', country: 'United Kingdom', popularityScore: 99, routeTemplates: [{ nights: 7, cities: ['London', 'Edinburgh'], rationale: 'London + Edinburgh' }, { nights: 10, cities: ['London', 'Bath', 'Edinburgh'], rationale: 'Extended UK tour' }] },
  { name: 'Edinburgh', country: 'United Kingdom', popularityScore: 85, routeTemplates: [{ nights: 7, cities: ['London', 'Edinburgh'], rationale: 'London + Edinburgh' }] },
  { name: 'Manchester', country: 'United Kingdom', popularityScore: 65 },
  { name: 'Bath', country: 'United Kingdom', popularityScore: 70, routeTemplates: [{ nights: 10, cities: ['London', 'Bath', 'Edinburgh'], rationale: 'Extended UK tour' }] },
  { name: 'Liverpool', country: 'United Kingdom', popularityScore: 55 },

  // USA
  { name: 'New York', country: 'United States', popularityScore: 99 },
  { name: 'Los Angeles', country: 'United States', popularityScore: 92 },
  { name: 'San Francisco', country: 'United States', popularityScore: 90 },
  { name: 'Las Vegas', country: 'United States', popularityScore: 88 },
  { name: 'Miami', country: 'United States', popularityScore: 85 },
  { name: 'Chicago', country: 'United States', popularityScore: 80 },
  { name: 'New Orleans', country: 'United States', popularityScore: 75 },
  { name: 'Seattle', country: 'United States', popularityScore: 72 },
  { name: 'Boston', country: 'United States', popularityScore: 70 },
  { name: 'Washington DC', country: 'United States', popularityScore: 75 },
  { name: 'Honolulu', country: 'United States', popularityScore: 82 },

  // Thailand
  { name: 'Bangkok', country: 'Thailand', popularityScore: 92, routeTemplates: [{ nights: 10, cities: ['Bangkok', 'Chiang Mai', 'Phuket'], rationale: 'Classic Thailand tour' }] },
  { name: 'Chiang Mai', country: 'Thailand', popularityScore: 80, routeTemplates: [{ nights: 10, cities: ['Bangkok', 'Chiang Mai', 'Phuket'], rationale: 'Classic Thailand tour' }] },
  { name: 'Phuket', country: 'Thailand', popularityScore: 85, routeTemplates: [{ nights: 10, cities: ['Bangkok', 'Chiang Mai', 'Phuket'], rationale: 'Classic Thailand tour' }] },
  { name: 'Krabi', country: 'Thailand', popularityScore: 70 },
  { name: 'Pattaya', country: 'Thailand', popularityScore: 60 },

  // India
  { name: 'Delhi', country: 'India', popularityScore: 90, routeTemplates: [{ nights: 7, cities: ['Delhi', 'Agra', 'Jaipur'], rationale: 'Golden Triangle' }, { nights: 14, cities: ['Delhi', 'Agra', 'Jaipur', 'Udaipur', 'Goa'], rationale: 'Extended India tour' }] },
  { name: 'Mumbai', country: 'India', popularityScore: 88 },
  { name: 'Jaipur', country: 'India', popularityScore: 82, routeTemplates: [{ nights: 7, cities: ['Delhi', 'Agra', 'Jaipur'], rationale: 'Golden Triangle' }] },
  { name: 'Agra', country: 'India', popularityScore: 85, routeTemplates: [{ nights: 7, cities: ['Delhi', 'Agra', 'Jaipur'], rationale: 'Golden Triangle' }] },
  { name: 'Goa', country: 'India', popularityScore: 78 },
  { name: 'Udaipur', country: 'India', popularityScore: 75, routeTemplates: [{ nights: 14, cities: ['Delhi', 'Agra', 'Jaipur', 'Udaipur', 'Goa'], rationale: 'Extended India tour' }] },
  { name: 'Kerala', country: 'India', popularityScore: 72 },
  { name: 'Varanasi', country: 'India', popularityScore: 65 },
  { name: 'Bangalore', country: 'India', popularityScore: 60 },
  { name: 'Chennai', country: 'India', popularityScore: 58 },
  { name: 'Kolkata', country: 'India', popularityScore: 55 },

  // Germany
  { name: 'Berlin', country: 'Germany', popularityScore: 88 },
  { name: 'Munich', country: 'Germany', popularityScore: 82 },
  { name: 'Hamburg', country: 'Germany', popularityScore: 65 },
  { name: 'Cologne', country: 'Germany', popularityScore: 60 },
  { name: 'Frankfurt', country: 'Germany', popularityScore: 55 },

  // Netherlands
  { name: 'Amsterdam', country: 'Netherlands', popularityScore: 90, routeTemplates: [{ nights: 7, cities: ['Amsterdam', 'Brussels', 'Paris'], rationale: 'Benelux + Paris' }] },
  { name: 'Rotterdam', country: 'Netherlands', popularityScore: 60 },

  // Greece
  { name: 'Athens', country: 'Greece', popularityScore: 88, routeTemplates: [{ nights: 7, cities: ['Athens', 'Santorini', 'Mykonos'], rationale: 'Classic Greece island hop' }] },
  { name: 'Santorini', country: 'Greece', popularityScore: 92, routeTemplates: [{ nights: 7, cities: ['Athens', 'Santorini', 'Mykonos'], rationale: 'Classic Greece island hop' }] },
  { name: 'Mykonos', country: 'Greece', popularityScore: 85, routeTemplates: [{ nights: 7, cities: ['Athens', 'Santorini', 'Mykonos'], rationale: 'Classic Greece island hop' }] },
  { name: 'Crete', country: 'Greece', popularityScore: 75 },

  // Portugal
  { name: 'Lisbon', country: 'Portugal', popularityScore: 88, routeTemplates: [{ nights: 7, cities: ['Lisbon', 'Porto'], rationale: 'Classic Portugal' }] },
  { name: 'Porto', country: 'Portugal', popularityScore: 78, routeTemplates: [{ nights: 7, cities: ['Lisbon', 'Porto'], rationale: 'Classic Portugal' }] },

  // Turkey
  { name: 'Istanbul', country: 'Turkey', popularityScore: 92, routeTemplates: [{ nights: 7, cities: ['Istanbul', 'Cappadocia'], rationale: 'Istanbul + Cappadocia' }] },
  { name: 'Cappadocia', country: 'Turkey', popularityScore: 85, routeTemplates: [{ nights: 7, cities: ['Istanbul', 'Cappadocia'], rationale: 'Istanbul + Cappadocia' }] },

  // South Korea
  { name: 'Seoul', country: 'South Korea', popularityScore: 90, routeTemplates: [{ nights: 7, cities: ['Seoul', 'Busan'], rationale: 'Seoul + Busan' }] },
  { name: 'Busan', country: 'South Korea', popularityScore: 72, routeTemplates: [{ nights: 7, cities: ['Seoul', 'Busan'], rationale: 'Seoul + Busan' }] },

  // China
  { name: 'Beijing', country: 'China', popularityScore: 90, routeTemplates: [{ nights: 7, cities: ['Beijing', 'Shanghai', 'Xi\'an'], rationale: 'Classic China triangle' }] },
  { name: 'Shanghai', country: 'China', popularityScore: 88, routeTemplates: [{ nights: 7, cities: ['Beijing', 'Shanghai', 'Xi\'an'], rationale: 'Classic China triangle' }] },
  { name: 'Xi\'an', country: 'China', popularityScore: 75, routeTemplates: [{ nights: 7, cities: ['Beijing', 'Shanghai', 'Xi\'an'], rationale: 'Classic China triangle' }] },
  { name: 'Chengdu', country: 'China', popularityScore: 65 },
  { name: 'Guangzhou', country: 'China', popularityScore: 60 },

  // Australia
  { name: 'Sydney', country: 'Australia', popularityScore: 92, routeTemplates: [{ nights: 10, cities: ['Sydney', 'Melbourne', 'Cairns'], rationale: 'East coast Australia' }] },
  { name: 'Melbourne', country: 'Australia', popularityScore: 88, routeTemplates: [{ nights: 10, cities: ['Sydney', 'Melbourne', 'Cairns'], rationale: 'East coast Australia' }] },
  { name: 'Cairns', country: 'Australia', popularityScore: 75, routeTemplates: [{ nights: 10, cities: ['Sydney', 'Melbourne', 'Cairns'], rationale: 'East coast Australia' }] },
  { name: 'Brisbane', country: 'Australia', popularityScore: 70 },

  // New Zealand
  { name: 'Auckland', country: 'New Zealand', popularityScore: 80 },
  { name: 'Queenstown', country: 'New Zealand', popularityScore: 78 },
  { name: 'Wellington', country: 'New Zealand', popularityScore: 60 },

  // Singapore, Malaysia, Indonesia, Vietnam, Cambodia
  { name: 'Singapore', country: 'Singapore', popularityScore: 90 },
  { name: 'Kuala Lumpur', country: 'Malaysia', popularityScore: 78 },
  { name: 'Penang', country: 'Malaysia', popularityScore: 65 },
  { name: 'Bali', country: 'Indonesia', popularityScore: 90 },
  { name: 'Jakarta', country: 'Indonesia', popularityScore: 60 },
  { name: 'Hanoi', country: 'Vietnam', popularityScore: 80, routeTemplates: [{ nights: 10, cities: ['Hanoi', 'Hoi An', 'Ho Chi Minh City'], rationale: 'Classic Vietnam' }] },
  { name: 'Ho Chi Minh City', country: 'Vietnam', popularityScore: 78, routeTemplates: [{ nights: 10, cities: ['Hanoi', 'Hoi An', 'Ho Chi Minh City'], rationale: 'Classic Vietnam' }] },
  { name: 'Hoi An', country: 'Vietnam', popularityScore: 75, routeTemplates: [{ nights: 10, cities: ['Hanoi', 'Hoi An', 'Ho Chi Minh City'], rationale: 'Classic Vietnam' }] },
  { name: 'Siem Reap', country: 'Cambodia', popularityScore: 82 },
  { name: 'Phnom Penh', country: 'Cambodia', popularityScore: 55 },

  // Mexico, Brazil, Argentina
  { name: 'Mexico City', country: 'Mexico', popularityScore: 85 },
  { name: 'Cancun', country: 'Mexico', popularityScore: 82 },
  { name: 'Tulum', country: 'Mexico', popularityScore: 75 },
  { name: 'Oaxaca', country: 'Mexico', popularityScore: 65 },
  { name: 'Rio de Janeiro', country: 'Brazil', popularityScore: 90 },
  { name: 'São Paulo', country: 'Brazil', popularityScore: 75 },
  { name: 'Buenos Aires', country: 'Argentina', popularityScore: 88 },

  // Egypt, Morocco, South Africa
  { name: 'Cairo', country: 'Egypt', popularityScore: 85 },
  { name: 'Luxor', country: 'Egypt', popularityScore: 72 },
  { name: 'Marrakech', country: 'Morocco', popularityScore: 85 },
  { name: 'Casablanca', country: 'Morocco', popularityScore: 60 },
  { name: 'Cape Town', country: 'South Africa', popularityScore: 88 },
  { name: 'Johannesburg', country: 'South Africa', popularityScore: 65 },

  // UAE, Qatar
  { name: 'Dubai', country: 'United Arab Emirates', popularityScore: 92 },
  { name: 'Abu Dhabi', country: 'United Arab Emirates', popularityScore: 80 },
  { name: 'Doha', country: 'Qatar', popularityScore: 65 },

  // Russia, Czech, Austria, Hungary, Poland
  { name: 'Moscow', country: 'Russia', popularityScore: 80 },
  { name: 'St. Petersburg', country: 'Russia', popularityScore: 78 },
  { name: 'Prague', country: 'Czech Republic', popularityScore: 90, routeTemplates: [{ nights: 7, cities: ['Prague', 'Vienna', 'Budapest'], rationale: 'Central Europe trio' }] },
  { name: 'Vienna', country: 'Austria', popularityScore: 85, routeTemplates: [{ nights: 7, cities: ['Prague', 'Vienna', 'Budapest'], rationale: 'Central Europe trio' }] },
  { name: 'Budapest', country: 'Hungary', popularityScore: 85, routeTemplates: [{ nights: 7, cities: ['Prague', 'Vienna', 'Budapest'], rationale: 'Central Europe trio' }] },
  { name: 'Krakow', country: 'Poland', popularityScore: 70 },
  { name: 'Warsaw', country: 'Poland', popularityScore: 60 },

  // Ireland, Scotland (separate from UK)
  { name: 'Dublin', country: 'Ireland', popularityScore: 80 },
  { name: 'Galway', country: 'Ireland', popularityScore: 60 },

  // Switzerland, Belgium
  { name: 'Zurich', country: 'Switzerland', popularityScore: 78 },
  { name: 'Geneva', country: 'Switzerland', popularityScore: 72 },
  { name: 'Interlaken', country: 'Switzerland', popularityScore: 70 },
  { name: 'Lucerne', country: 'Switzerland', popularityScore: 65 },
  { name: 'Brussels', country: 'Belgium', popularityScore: 75, routeTemplates: [{ nights: 7, cities: ['Amsterdam', 'Brussels', 'Paris'], rationale: 'Benelux + Paris' }] },
  { name: 'Bruges', country: 'Belgium', popularityScore: 68 },

  // Nordic
  { name: 'Copenhagen', country: 'Denmark', popularityScore: 82 },
  { name: 'Stockholm', country: 'Sweden', popularityScore: 80 },
  { name: 'Oslo', country: 'Norway', popularityScore: 72 },
  { name: 'Helsinki', country: 'Finland', popularityScore: 68 },
  { name: 'Reykjavik', country: 'Iceland', popularityScore: 78 },

  // Canada
  { name: 'Toronto', country: 'Canada', popularityScore: 85 },
  { name: 'Vancouver', country: 'Canada', popularityScore: 82 },
  { name: 'Montreal', country: 'Canada', popularityScore: 78 },
  { name: 'Quebec City', country: 'Canada', popularityScore: 65 },
  { name: 'Banff', country: 'Canada', popularityScore: 70 },

  // Peru, Chile
  { name: 'Lima', country: 'Peru', popularityScore: 78 },
  { name: 'Cusco', country: 'Peru', popularityScore: 80 },
  { name: 'Santiago', country: 'Chile', popularityScore: 65 },
  { name: 'Valparaíso', country: 'Chile', popularityScore: 55 },
];

function slugifyCity(city: string): string {
  return city.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function seedBaselines(dryRun: boolean = true) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tripwhat';

  console.log(`\n🌱 Destination Baseline Seeding`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes)' : 'EXECUTE'}`);
  console.log(`   DB: ${mongoUri}`);
  console.log(`   Destinations: ${TOP_DESTINATIONS.length}\n`);

  await mongoose.connect(mongoUri);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const dest of TOP_DESTINATIONS) {
    const key = slugifyCity(dest.name);

    if (dryRun) {
      console.log(`  📋 ${key}: ${dest.name}, ${dest.country} (popularity: ${dest.popularityScore})`);
      continue;
    }

    const existing = await (DestinationBaseline as any).findOne({ key });
    if (existing) {
      await (DestinationBaseline as any).findOneAndUpdate(
        { key },
        {
          name: dest.name,
          country: dest.country,
          popularityScore: dest.popularityScore,
          routeTemplates: dest.routeTemplates || [],
          refreshedAt: new Date(),
        }
      );
      updated++;
    } else {
      await (DestinationBaseline as any).create({
        key,
        name: dest.name,
        country: dest.country,
        popularityScore: dest.popularityScore,
        topAttractions: [],
        topRestaurants: [],
        neighborhoods: [],
        routeTemplates: dest.routeTemplates || [],
        refreshedAt: new Date(),
        ttlDays: 30,
      });
      created++;
    }
  }

  if (!dryRun) {
    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}\n`);
  } else {
    console.log(`\n📊 Dry run complete — ${TOP_DESTINATIONS.length} destinations would be seeded\n`);
  }

  await mongoose.disconnect();
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

seedBaselines(dryRun).catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
