import { itineraryEditor } from '../../services/itinerary/index.js';
import type { ItineraryAction, EditorResult } from '../../services/itinerary/types.js';
import type { ChangeEntry, TripState } from './types.js';

/**
 * Plan Editor Node
 * 
 * Executes ItineraryActions via the itinerary editor service.
 * All mutations are pure functions — zero LLM calls except initial entity extraction.
 * 
 * City-level changes that invalidate days → builder_node (delta only)
 * Activity-level changes → formatter_node (no regeneration)
 */

export interface PlanEditorResult {
  itinerary: EditorResult['itinerary'];
  changeSummary: ChangeEntry[];
  requiresRegeneration: boolean;
  invalidatedCities: string[];
}

/**
 * Execute a plan edit action
 */
export async function executeEdit(
  tripState: TripState,
  action: ItineraryAction,
  destination: string
): Promise<PlanEditorResult> {
  const itinerary = tripState.itinerary;
  if (!itinerary) {
    throw new Error('No itinerary to edit — trip must have a generated itinerary first');
  }

  const result = await itineraryEditor.applyAction(itinerary, action, destination);
  const changeSummary = buildChangeSummary(action, result);
  const { requiresRegeneration, invalidatedCities } = checkRegenerationNeeded(action);

  return {
    itinerary: result.itinerary,
    changeSummary,
    requiresRegeneration,
    invalidatedCities,
  };
}

/**
 * Determine whether the edit requires builder regeneration
 * City-level ops (add_city, remove_city, adjust_nights, reorder_cities, rebalance)
 * invalidate days and require delta-only regeneration.
 * Activity-level ops (add, remove, replace, move, add_day, remove_day) do not.
 */
export function checkRegenerationNeeded(action: ItineraryAction): {
  requiresRegeneration: boolean;
  invalidatedCities: string[];
} {
  const cityLevelOps = ['add_city', 'remove_city', 'adjust_nights', 'reorder_cities', 'rebalance'];

  if (cityLevelOps.includes(action.type)) {
    const invalidatedCities: string[] = [];
    if (action.type === 'add_city' && action.details?.city) {
      invalidatedCities.push(action.details.city);
    }
    if (action.type === 'remove_city' && action.target.city) {
      invalidatedCities.push(action.target.city);
    }
    if (action.type === 'adjust_nights' && action.target.city) {
      invalidatedCities.push(action.target.city);
    }
    if (action.type === 'rebalance') {
      // All cities invalidated
      return { requiresRegeneration: true, invalidatedCities: [] };
    }
    return { requiresRegeneration: true, invalidatedCities };
  }

  return { requiresRegeneration: false, invalidatedCities: [] };
}

export function buildChangeSummary(action: ItineraryAction, result: EditorResult): ChangeEntry[] {
  const entries: ChangeEntry[] = [];

  const summary = result.changeSummary;
  if (!summary) {
    return [{
      type: 'modify',
      description: result.message,
      target: 'itinerary',
    }];
  }

  const typeMap: Record<string, ChangeEntry['type']> = {
    add: 'add',
    remove: 'remove',
    replace: 'modify',
    move: 'move',
    add_city: 'add',
    remove_city: 'remove',
    adjust_nights: 'modify',
    reorder_cities: 'reorder',
    rebalance: 'rebalance',
  };

  const changeType = typeMap[summary.action] || 'modify';

  if (summary.added) {
    for (const item of summary.added) {
      entries.push({
        type: changeType,
        description: `Added ${item}`,
        target: item,
      });
    }
  }

  if (summary.removed) {
    for (const item of summary.removed) {
      entries.push({
        type: changeType,
        description: `Removed ${item}`,
        target: item,
      });
    }
  }

  if (summary.modified) {
    for (const item of summary.modified) {
      entries.push({
        type: changeType,
        description: result.message,
        target: item,
      });
    }
  }

  if (entries.length === 0) {
    entries.push({
      type: changeType,
      description: result.message,
      target: summary.target,
    });
  }

  return entries;
}
