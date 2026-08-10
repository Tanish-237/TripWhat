import { describe, it, expect } from 'vitest';
import { IntentSchema } from '../../../src/agents/intent-detector';

describe('Intent Detector Schema', () => {
  it('accepts all new intents', () => {
    const newIntents = [
      'add_city', 'remove_city', 'adjust_nights', 'reorder_cities', 'rebalance',
      'start_planning', 'defer_planning', 'propose_route', 'confirm_route',
      'set_dates', 'set_travelers', 'save_place', 'show_bookings', 'needs_info',
    ];
    for (const intent of newIntents) {
      expect(() => IntentSchema.parse({
        primary_intent: intent,
        classification: 'discovery',
        entities: {},
        tools_to_call: [],
        confidence: 0.8,
        reasoning: 'test',
      })).not.toThrow();
    }
  });

  it('accepts all classification values', () => {
    const classifications = ['discovery', 'plannable', 'ready_to_search', 'chitchat', 'nonsensical'];
    for (const cls of classifications) {
      expect(() => IntentSchema.parse({
        primary_intent: 'casual_chat',
        classification: cls,
        entities: {},
        tools_to_call: [],
        confidence: 0.8,
        reasoning: 'test',
      })).not.toThrow();
    }
  });

  it('accepts cities[] entity with name and nights', () => {
    const parsed = IntentSchema.parse({
      primary_intent: 'plan_trip',
      classification: 'plannable',
      entities: {
        cities: [
          { name: 'Tokyo', nights: 3 },
          { name: 'Kyoto', nights: 2 },
        ],
      },
      tools_to_call: [],
      confidence: 0.9,
      reasoning: 'multi-city trip',
    });
    expect(parsed.entities.cities).toHaveLength(2);
    expect(parsed.entities.cities![0].name).toBe('Tokyo');
    expect(parsed.entities.cities![0].nights).toBe(3);
  });

  it('accepts change_summary_target entity', () => {
    const parsed = IntentSchema.parse({
      primary_intent: 'adjust_nights',
      classification: 'ready_to_search',
      entities: {
        change_summary_target: 'osaka nights',
      },
      tools_to_call: [],
      confidence: 0.85,
      reasoning: 'user wants to adjust nights in Osaka',
    });
    expect(parsed.entities.change_summary_target).toBe('osaka nights');
  });

  it('accepts extended action_type enum values', () => {
    const newActionTypes = ['add_city', 'remove_city', 'adjust_nights', 'reorder_cities', 'rebalance'];
    for (const actionType of newActionTypes) {
      expect(() => IntentSchema.parse({
        primary_intent: 'add_city',
        classification: 'ready_to_search',
        entities: { action_type: actionType },
        tools_to_call: [],
        confidence: 0.8,
        reasoning: 'test',
      })).not.toThrow();
    }
  });

  it('rejects unknown intents', () => {
    expect(() => IntentSchema.parse({
      primary_intent: 'unknown_intent',
      classification: 'chitchat',
      entities: {},
      tools_to_call: [],
      confidence: 0.5,
      reasoning: 'test',
    })).toThrow();
  });

  it('rejects unknown classification', () => {
    expect(() => IntentSchema.parse({
      primary_intent: 'casual_chat',
      classification: 'unknown_class',
      entities: {},
      tools_to_call: [],
      confidence: 0.5,
      reasoning: 'test',
    })).toThrow();
  });

  it('preserves all existing intents', () => {
    const existingIntents = [
      'search_destination', 'search_attractions', 'search_hotels',
      'search_flights', 'search_restaurants', 'plan_trip',
      'get_details', 'find_nearby', 'calculate_distance',
      'get_directions', 'web_search', 'get_weather',
      'convert_currency', 'estimate_budget',
      'add_activity', 'remove_activity', 'replace_activity',
      'modify_activity', 'move_activity', 'add_day', 'remove_day',
      'find_and_add', 'casual_chat', 'unknown',
    ];
    for (const intent of existingIntents) {
      expect(() => IntentSchema.parse({
        primary_intent: intent,
        classification: 'chitchat',
        entities: {},
        tools_to_call: [],
        confidence: 0.7,
        reasoning: 'test',
      })).not.toThrow();
    }
  });
});
