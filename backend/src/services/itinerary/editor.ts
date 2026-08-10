import type {
  Itinerary,
  DayPlan,
  Activity,
  ItineraryAction,
  EditorResult,
} from './types.js';
import { createDayPlan } from './types.js';

export class ItineraryEditor {
  addCity(
    itinerary: Itinerary,
    city: { name: string; days: number },
    insertAtIndex?: number
  ): EditorResult {
    const newDays: DayPlan[] = [];
    const startDate = itinerary.tripMetadata.startDate;
    for (let d = 0; d < city.days; d++) {
      const dayNum = itinerary.days.length + d + 1;
      const date = startDate
        ? new Date(new Date(startDate).getTime() + (itinerary.days.length + d) * 86400000)
            .toISOString().split('T')[0]
        : '';
      const day = createDayPlan(dayNum, date, city.name, `Day ${dayNum} - ${city.name}`);
      newDays.push(day);
    }

    if (insertAtIndex !== undefined) {
      // Count days before insertion point
      const cities = this.getCityGroups(itinerary);
      let dayOffset = 0;
      for (let i = 0; i < insertAtIndex; i++) {
        dayOffset += cities[i].days.length;
      }
      itinerary.days.splice(dayOffset, 0, ...newDays);
    } else {
      itinerary.days.push(...newDays);
    }

    this.renumberDays(itinerary);
    itinerary.tripMetadata.duration = itinerary.days.length;
    itinerary.updatedAt = new Date();

    return {
      itinerary,
      message: `Added ${city.name} (${city.days} day${city.days > 1 ? 's' : ''}) to itinerary`,
      changeSummary: {
        action: 'add_city',
        target: city.name,
        added: [city.name],
      },
    };
  }

  removeCity(itinerary: Itinerary, cityName: string): EditorResult {
    const daysToRemove = itinerary.days.filter(d => d.location === cityName);
    if (daysToRemove.length === 0) {
      throw new Error(`City "${cityName}" not found in itinerary`);
    }

    itinerary.days = itinerary.days.filter(d => d.location !== cityName);
    this.renumberDays(itinerary);
    itinerary.tripMetadata.duration = itinerary.days.length;
    itinerary.updatedAt = new Date();

    return {
      itinerary,
      message: `Removed ${cityName} (${daysToRemove.length} day${daysToRemove.length > 1 ? 's' : ''}) from itinerary`,
      changeSummary: {
        action: 'remove_city',
        target: cityName,
        removed: [cityName],
      },
    };
  }

  adjustNights(itinerary: Itinerary, cityName: string, newNights: number): EditorResult {
    const cityDays = itinerary.days.filter(d => d.location === cityName);
    if (cityDays.length === 0) {
      throw new Error(`City "${cityName}" not found in itinerary`);
    }

    const currentNights = cityDays.length;
    const diff = newNights - currentNights;

    if (diff > 0) {
      // Add days
      const startDate = itinerary.tripMetadata.startDate;
      const lastDay = cityDays[cityDays.length - 1];
      const lastDayIndex = itinerary.days.indexOf(lastDay);
      const newDays: DayPlan[] = [];
      for (let d = 0; d < diff; d++) {
        const dayNum = lastDay.dayNumber + d + 1;
        const date = startDate
          ? new Date(new Date(startDate).getTime() + (lastDayIndex + d + 1) * 86400000)
              .toISOString().split('T')[0]
          : '';
        newDays.push(createDayPlan(dayNum, date, cityName, `Day ${dayNum} - ${cityName}`));
      }
      itinerary.days.splice(lastDayIndex + 1, 0, ...newDays);
    } else if (diff < 0) {
      // Remove days, preserving pinned activities
      const toRemove = Math.abs(diff);
      const pinnedActivities: Activity[] = [];

      // Collect pinned activities from days being removed
      const removingDays = cityDays.slice(-toRemove);
      for (const day of removingDays) {
        for (const ts of day.timeSlots) {
          const activities = ts.activities || [ts.activity];
          for (const act of activities) {
            if (act?.metadata?.pinned) {
              pinnedActivities.push(act);
            }
          }
        }
      }

      // Remove the days
      for (const day of removingDays) {
        const idx = itinerary.days.indexOf(day);
        if (idx !== -1) {
          itinerary.days.splice(idx, 1);
        }
      }

      // Redistribute pinned activities to remaining days of this city
      if (pinnedActivities.length > 0) {
        const remainingCityDays = itinerary.days.filter(d => d.location === cityName);
        for (let i = 0; i < pinnedActivities.length && i < remainingCityDays.length; i++) {
          const day = remainingCityDays[i];
          const slot = day.timeSlots.find(ts => !ts.activity?.name && (!ts.activities || ts.activities.length === 0));
          if (slot) {
            slot.activity = pinnedActivities[i];
            slot.activities = [pinnedActivities[i]];
          }
        }
      }
    }

    this.renumberDays(itinerary);
    itinerary.tripMetadata.duration = itinerary.days.length;
    itinerary.updatedAt = new Date();

    return {
      itinerary,
      message: `Adjusted ${cityName} from ${currentNights} to ${newNights} nights`,
      changeSummary: {
        action: 'adjust_nights',
        target: cityName,
        modified: [cityName],
      },
    };
  }

  reorderCities(itinerary: Itinerary, newOrder: string[]): EditorResult {
    const currentCities = this.getCityGroups(itinerary).map(g => g.name);
    const currentSet = new Set(currentCities);
    const newSet = new Set(newOrder);

    if (currentSet.size !== newSet.size || !newOrder.every(c => currentSet.has(c))) {
      throw new Error('City mismatch: new order must contain exactly the same cities');
    }

    const groups = this.getCityGroups(itinerary);
    const groupMap = new Map(groups.map(g => [g.name, g]));

    const newDays: DayPlan[] = [];
    for (const cityName of newOrder) {
      const group = groupMap.get(cityName)!;
      newDays.push(...group.days);
    }

    itinerary.days = newDays;
    this.renumberDays(itinerary);
    itinerary.updatedAt = new Date();

    return {
      itinerary,
      message: `Reordered cities: ${newOrder.join(' → ')}`,
      changeSummary: {
        action: 'reorder_cities',
        target: newOrder.join(' → '),
        modified: newOrder,
      },
    };
  }

  rebalance(itinerary: Itinerary): EditorResult {
    const groups = this.getCityGroups(itinerary);
    if (groups.length === 0) return { itinerary, message: 'No cities to rebalance' };

    const totalDays = itinerary.days.length;
    const perCity = Math.ceil(totalDays / groups.length);

    // Collect pinned activities before rebalancing
    const pinnedByCity = new Map<string, Activity[]>();
    for (const group of groups) {
      const pinned: Activity[] = [];
      for (const day of group.days) {
        for (const ts of day.timeSlots) {
          const activities = ts.activities || [ts.activity];
          for (const act of activities) {
            if (act?.metadata?.pinned) {
              pinned.push(act);
            }
          }
        }
      }
      if (pinned.length > 0) {
        pinnedByCity.set(group.name, pinned);
      }
    }

    // Redistribute days
    const newDays: DayPlan[] = [];
    const startDate = itinerary.tripMetadata.startDate;
    let dayCounter = 0;
    let remaining = totalDays;

    for (let i = 0; i < groups.length; i++) {
      const isLast = i === groups.length - 1;
      const daysForThisCity = isLast ? remaining : Math.min(perCity, remaining);
      remaining -= daysForThisCity;

      for (let d = 0; d < daysForThisCity; d++) {
        const date = startDate
          ? new Date(new Date(startDate).getTime() + dayCounter * 86400000)
              .toISOString().split('T')[0]
          : '';
        const day = createDayPlan(dayCounter + 1, date, groups[i].name, `Day ${dayCounter + 1} - ${groups[i].name}`);
        newDays.push(day);
        dayCounter++;
      }
    }

    // Redistribute pinned activities
    for (const group of groups) {
      const pinned = pinnedByCity.get(group.name);
      if (pinned) {
        const cityDays = newDays.filter(d => d.location === group.name);
        for (let i = 0; i < pinned.length && i < cityDays.length; i++) {
          const slot = cityDays[i].timeSlots[0];
          slot.activity = pinned[i];
          slot.activities = [pinned[i]];
        }
      }
    }

    itinerary.days = newDays;
    this.renumberDays(itinerary);
    itinerary.updatedAt = new Date();

    return {
      itinerary,
      message: `Rebalanced itinerary: ${groups.length} cities, ${perCity} days each (approx)`,
      changeSummary: {
        action: 'rebalance',
        target: 'all cities',
        modified: groups.map(g => g.name),
      },
    };
  }

  applyAction(itinerary: Itinerary, action: ItineraryAction, _destination?: string): EditorResult | Promise<EditorResult> {
    switch (action.type) {
      case 'add_city':
        if (!action.details?.city || !action.details?.cityDays) {
          throw new Error('City name and days are required for add_city');
        }
        return this.addCity(itinerary, { name: action.details.city, days: action.details.cityDays }, action.target.cityIndex);

      case 'remove_city':
        if (!action.target.city) {
          throw new Error('City name is required for remove_city');
        }
        return this.removeCity(itinerary, action.target.city);

      case 'adjust_nights':
        if (!action.target.city || !action.details?.nights) {
          throw new Error('City name and nights are required for adjust_nights');
        }
        return this.adjustNights(itinerary, action.target.city, action.details.nights);

      case 'reorder_cities':
        // details.newCityIndex contains the new order as array of city names
        if (!action.details?.preferences) {
          throw new Error('New city order is required for reorder_cities');
        }
        return this.reorderCities(itinerary, action.details.preferences);

      case 'rebalance':
        return this.rebalance(itinerary);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private getCityGroups(itinerary: Itinerary): { name: string; days: DayPlan[] }[] {
    const groups: { name: string; days: DayPlan[] }[] = [];
    let currentCity = '';
    for (const day of itinerary.days) {
      if (day.location !== currentCity) {
        currentCity = day.location;
        groups.push({ name: currentCity, days: [] });
      }
      groups[groups.length - 1].days.push(day);
    }
    return groups;
  }

  private renumberDays(itinerary: Itinerary): void {
    itinerary.days.forEach((day, idx) => {
      day.dayNumber = idx + 1;
      if (!day.title.includes(' - ')) {
        day.title = `Day ${idx + 1}`;
      } else {
        day.title = `Day ${idx + 1} - ${day.location}`;
      }
    });
  }
}

export const itineraryEditor = new ItineraryEditor();
