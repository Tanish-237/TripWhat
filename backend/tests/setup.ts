// Set dummy API keys for unit tests that import modules with side-effects
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key-for-unit-tests';
process.env.GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'test-key-for-unit-tests';
