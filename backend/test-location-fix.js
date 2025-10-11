/**
 * Test script to verify location keyword extraction
 * This tests the fix for the "invalid query parameter format" error
 */

const { amadeusService } = require("./src/services/amadeusService.ts");

async function testLocationExtraction() {
  console.log("🧪 Testing Location Keyword Extraction Fix");
  console.log("==========================================");

  // Test cases that were failing before
  const testCases = [
    "Mumbai, Maharashtra, India",
    "Paris, France",
    "New York, NY, USA",
    "London, UK",
    "Tokyo, Japan",
    "Sydney, Australia",
  ];

  for (const location of testCases) {
    try {
      console.log(`\n🔍 Testing: "${location}"`);

      // This will use the new extractCityKeyword method internally
      const airports = await amadeusService.searchAirports(location);

      if (airports && airports.length > 0) {
        console.log(`✅ Success! Found ${airports.length} airports:`);
        airports.slice(0, 2).forEach((airport) => {
          console.log(
            `   - ${airport.iataCode}: ${airport.name} (${airport.cityName})`
          );
        });
      } else {
        console.log(`⚠️  No airports found for ${location}`);
      }
    } catch (error) {
      console.log(`❌ Error for ${location}:`, error.message);
    }
  }

  console.log("\n🏁 Location keyword extraction test completed!");
}

// Run the test
testLocationExtraction().catch(console.error);
