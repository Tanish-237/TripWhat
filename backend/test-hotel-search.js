/**
 * Test script for Amadeus Hotel Search API
 * This script tests the hotel search functionality end-to-end
 */

const { amadeusService } = require("./src/services/amadeusService.ts");

async function testHotelSearch() {
  console.log("🏨 Testing Amadeus Hotel Search API");
  console.log("==================================");

  try {
    // Test 1: Basic connectivity test
    console.log("\n🧪 Test 1: API Connectivity");
    const connectivityTest = await amadeusService.testHotelSearch();

    if (connectivityTest.success) {
      console.log("✅ API Connectivity: SUCCESS");
      console.log(
        "📊 Sample Data:",
        JSON.stringify(connectivityTest.sampleData, null, 2)
      );
    } else {
      console.log("❌ API Connectivity: FAILED");
      console.log("Error:", connectivityTest.message);
      return;
    }

    // Test 2: Search hotels by specific hotel IDs
    console.log("\n🧪 Test 2: Search Hotels by Hotel IDs");
    const hotelSearchParams = {
      hotelIds: ["MCLONGHM"], // JW Marriott Grosvenor House London
      checkInDate: "2024-12-15",
      checkOutDate: "2024-12-16",
      adults: 2,
      roomQuantity: 1,
      currency: "USD",
      bestRateOnly: true,
    };

    const hotelResults = await amadeusService.searchHotels(hotelSearchParams);

    if (hotelResults.data && hotelResults.data.length > 0) {
      console.log(`✅ Hotel Search: Found ${hotelResults.data.length} hotels`);

      const firstHotel = hotelResults.data[0];
      console.log("🏨 First Hotel Details:");
      console.log(`   Name: ${firstHotel.hotel.name}`);
      console.log(`   City: ${firstHotel.hotel.cityCode}`);
      console.log(`   Available: ${firstHotel.available}`);
      console.log(`   Offers: ${firstHotel.offers?.length || 0}`);

      if (firstHotel.offers && firstHotel.offers.length > 0) {
        const offer = firstHotel.offers[0];
        console.log(`   Price: ${offer.price.total} ${offer.price.currency}`);
        console.log(`   Room Type: ${offer.room.type}`);
      }
    } else {
      console.log("⚠️  Hotel Search: No results found");
    }

    // Test 3: Search hotels by city name
    console.log("\n🧪 Test 3: Search Hotels by City");
    const citySearchResults = await amadeusService.searchHotelsByCity(
      "London",
      "2024-12-20",
      "2024-12-21",
      1,
      1,
      {
        currency: "GBP",
        boardType: "ROOM_ONLY",
      }
    );

    if (citySearchResults.data && citySearchResults.data.length > 0) {
      console.log(
        `✅ City Search: Found ${citySearchResults.data.length} hotels in London`
      );

      citySearchResults.data.slice(0, 2).forEach((hotel, index) => {
        console.log(
          `   ${index + 1}. ${hotel.hotel.name} - ${
            hotel.offers?.[0]?.price?.total || "N/A"
          } ${hotel.offers?.[0]?.price?.currency || ""}`
        );
      });
    } else {
      console.log("⚠️  City Search: No results found for London");
    }

    // Test 4: Multiple cities search (as would be used in multi-city trips)
    console.log("\n🧪 Test 4: Multi-City Hotel Search");
    const cities = ["London", "Paris"];
    const multiCityResults = {};

    for (const city of cities) {
      try {
        const cityResult = await amadeusService.searchHotelsByCity(
          city,
          "2024-12-25",
          "2024-12-26",
          2,
          1,
          { currency: "EUR" }
        );

        multiCityResults[city] = {
          success: true,
          hotels: cityResult.data,
          count: cityResult.data.length,
        };

        console.log(`   ${city}: ${cityResult.data.length} hotels found`);
      } catch (error) {
        multiCityResults[city] = {
          success: false,
          error: error.message,
          count: 0,
        };
        console.log(`   ${city}: Error - ${error.message}`);
      }
    }

    console.log("\n📊 Multi-City Search Summary:");
    Object.entries(multiCityResults).forEach(([city, result]) => {
      console.log(
        `   ${city}: ${
          result.success ? `✅ ${result.count} hotels` : `❌ ${result.error}`
        }`
      );
    });

    console.log("\n🎉 Hotel Search API testing completed successfully!");
  } catch (error) {
    console.error("❌ Hotel Search API test failed:", error);
    console.error("Full error:", error.stack);
  }
}

// Run the test
if (require.main === module) {
  testHotelSearch().catch(console.error);
}

module.exports = { testHotelSearch };
