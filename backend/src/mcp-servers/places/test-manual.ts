/**
 * Manual test script for Places MCP Server tools
 * Run with: tsx src/mcp-servers/places/test-manual.ts
 */

import 'dotenv/config';
import { openTripMapAPI } from './api.js';

async function testSearchPlaces() {
  console.log('\n🔍 Testing searchPlaces...');
  console.log('Query: "Paris"\n');
  
  const results = await openTripMapAPI.searchPlaces('Paris', 5);
  
  console.log(`Found ${results.length} places:`);
  results.forEach((place, i) => {
    console.log(`${i + 1}. ${place.name}`);
    console.log(`   Location: ${place.location.latitude}, ${place.location.longitude}`);
    console.log(`   Categories: ${place.category.join(', ')}`);
    console.log();
  });
  
  return results[0]; // Return first place for next test
}

async function testGetPlaceDetails(placeId: string) {
  console.log('\n📄 Testing getPlaceDetails...');
  console.log(`Place ID: ${placeId}\n`);
  
  const details = await openTripMapAPI.getEnrichedPlaceDetails(placeId);
  
  if (details) {
    console.log('Place Details:');
    console.log(`Name: ${details.name}`);
    console.log(`Description: ${details.description?.substring(0, 200)}...`);
    console.log(`Rating: ${details.rating}/7`);
    console.log(`Image: ${details.image || 'No image'}`);
    console.log(`Categories: ${details.category.join(', ')}`);
  } else {
    console.log('Place not found');
  }
}

async function testGetNearbyAttractions() {
  console.log('\n📍 Testing getNearbyAttractions...');
  console.log('Location: Eiffel Tower (48.8584, 2.2945)\n');
  
  const results = await openTripMapAPI.getNearbyAttractions(
    48.8584, // Eiffel Tower latitude
    2.2945,  // Eiffel Tower longitude
    2000,    // 2km radius
    10       // 10 results
  );
  
  console.log(`Found ${results.length} nearby attractions:`);
  results.forEach((place, i) => {
    console.log(`${i + 1}. ${place.name}`);
    console.log(`   Distance: ${place.distance ? (place.distance).toFixed(0) + 'm' : 'N/A'}`);
    console.log(`   Categories: ${place.category.slice(0, 3).join(', ')}`);
    console.log();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 Places MCP Server - Manual Tests');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Search places
    const firstPlace = await testSearchPlaces();
    
    // Test 2: Get details (if we found a place)
    if (firstPlace) {
      await testGetPlaceDetails(firstPlace.id);
    }
    
    // Test 3: Get nearby attractions
    await testGetNearbyAttractions();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
