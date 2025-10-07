#!/usr/bin/env tsx
/**
 * Test script for the Travel Agent
 * 
 * Tests the LangGraph agent with various user queries
 */

import 'dotenv/config';
import { travelAgent } from './travel-agent.js';

// Test queries
const testQueries = [
  'Show me attractions in Paris',
  'Find things to do in Tokyo',
  'What can I see near the Eiffel Tower?',
  'Hello! I want to plan a trip',
];

async function runTests() {
  console.log('============================================================');
  console.log('🤖 Travel Agent - Interactive Tests');
  console.log('============================================================\n');

  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY not found in environment variables');
    console.error('   Please add it to your .env file');
    process.exit(1);
  }

  // Check for OpenTripMap API key
  if (!process.env.OPENTRIPMAP_API_KEY) {
    console.warn('⚠️  Warning: OPENTRIPMAP_API_KEY not found (optional)');
  }

  for (const query of testQueries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 User Query: "${query}"`);
    console.log('='.repeat(60));
    
    try {
      const response = await travelAgent.chat(query);
      
      console.log('\n🤖 Agent Response:');
      console.log('-'.repeat(60));
      console.log(response);
      console.log('-'.repeat(60));
      
      // Wait a bit between queries to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('\n❌ Error:', error);
    }
  }

  console.log('\n============================================================');
  console.log('✅ All tests completed!');
  console.log('============================================================\n');
}

// Run tests
runTests().catch(console.error);
