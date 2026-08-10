import { describe, it, expect } from 'vitest';
import { checkRegenerationNeeded, buildChangeSummary } from '../../../../src/agents/nodes/plan-editor';
import type { ItineraryAction, EditorResult } from '../../../../src/services/itinerary/types';

describe('Plan Editor Node', () => {
  describe('checkRegenerationNeeded', () => {
    it('returns requiresRegeneration=true for add_city', () => {
      const action: ItineraryAction = {
        type: 'add_city',
        target: {},
        details: { city: 'Osaka' },
      };
      const result = checkRegenerationNeeded(action);
      expect(result.requiresRegeneration).toBe(true);
      expect(result.invalidatedCities).toContain('Osaka');
    });

    it('returns requiresRegeneration=true for remove_city', () => {
      const action: ItineraryAction = {
        type: 'remove_city',
        target: { city: 'Kyoto' },
        details: {},
      };
      const result = checkRegenerationNeeded(action);
      expect(result.requiresRegeneration).toBe(true);
      expect(result.invalidatedCities).toContain('Kyoto');
    });

    it('returns requiresRegeneration=true for adjust_nights', () => {
      const action: ItineraryAction = {
        type: 'adjust_nights',
        target: { city: 'Tokyo' },
        details: {},
      };
      const result = checkRegenerationNeeded(action);
      expect(result.requiresRegeneration).toBe(true);
      expect(result.invalidatedCities).toContain('Tokyo');
    });

    it('returns requiresRegeneration=true for rebalance with all cities invalidated', () => {
      const action: ItineraryAction = {
        type: 'rebalance',
        target: {},
        details: {},
      };
      const result = checkRegenerationNeeded(action);
      expect(result.requiresRegeneration).toBe(true);
      expect(result.invalidatedCities).toEqual([]);
    });

    it('returns requiresRegeneration=false for add', () => {
      const action: ItineraryAction = {
        type: 'add',
        target: { day: 1 },
        details: {},
      };
      const result = checkRegenerationNeeded(action);
      expect(result.requiresRegeneration).toBe(false);
    });

    it('returns requiresRegeneration=false for move', () => {
      const action: ItineraryAction = {
        type: 'move',
        target: { day: 1 },
        details: {},
      };
      const result = checkRegenerationNeeded(action);
      expect(result.requiresRegeneration).toBe(false);
    });

    it('returns requiresRegeneration=false for remove', () => {
      const action: ItineraryAction = {
        type: 'remove',
        target: { day: 1 },
        details: {},
      };
      const result = checkRegenerationNeeded(action);
      expect(result.requiresRegeneration).toBe(false);
    });
  });

  describe('buildChangeSummary', () => {
    it('builds summary from added items', () => {
      const action: ItineraryAction = {
        type: 'add',
        target: { day: 1 },
        details: {},
      };
      const result: EditorResult = {
        itinerary: {} as any,
        message: 'Added Sensoji Temple',
        changeSummary: {
          action: 'add',
          target: 'Sensoji Temple',
          added: ['Sensoji Temple'],
        },
      };
      const summary = buildChangeSummary(action, result);
      expect(summary).toHaveLength(1);
      expect(summary[0].type).toBe('add');
      expect(summary[0].target).toBe('Sensoji Temple');
    });

    it('builds summary from removed items', () => {
      const action: ItineraryAction = {
        type: 'remove',
        target: { day: 2 },
        details: {},
      };
      const result: EditorResult = {
        itinerary: {} as any,
        message: 'Removed Fushimi Inari',
        changeSummary: {
          action: 'remove',
          target: 'Fushimi Inari',
          removed: ['Fushimi Inari'],
        },
      };
      const summary = buildChangeSummary(action, result);
      expect(summary).toHaveLength(1);
      expect(summary[0].type).toBe('remove');
    });

    it('falls back to message-based summary when no changeSummary', () => {
      const action: ItineraryAction = {
        type: 'modify',
        target: { day: 1 },
        details: {},
      };
      const result: EditorResult = {
        itinerary: {} as any,
        message: 'Modified activity time',
      };
      const summary = buildChangeSummary(action, result);
      expect(summary).toHaveLength(1);
      expect(summary[0].description).toBe('Modified activity time');
    });
  });
});
