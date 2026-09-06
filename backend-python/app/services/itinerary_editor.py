"""Itinerary editor — add/remove/replace/move activities, add/remove days.

Uses places_search service to look up real place data (coordinates, rating,
description) before adding activities to the itinerary.
"""

import uuid
from app.schemas.itinerary import Activity, ActivityLocation, create_time_slot, create_day_plan
from app.services.places_search import places_search
from app.utils.logger import logger


class ItineraryEditor:

    async def add_activity(self, itinerary: dict, action: dict, destination: str) -> dict:
        target_day = action.get("target", {}).get("day")
        target_slot = action.get("target", {}).get("timeSlot", "morning")
        place_name = action.get("details", {}).get("placeName") or action.get("target", {}).get("activityName", "New Activity")

        # Search for real place data
        place_data = None
        try:
            place_data = await places_search.search_by_name(place_name, destination)
        except Exception as e:
            logger.warning(f"[ITINERARY_EDITOR] Place search failed for '{place_name}': {e}")

        if place_data:
            coords = place_data.get("coordinates", {})
            activity = Activity(
                id=str(uuid.uuid4()),
                title=place_data.get("name", place_name),
                name=place_data.get("name", place_name),
                type=", ".join(place_data.get("types", [])[:2]) if place_data.get("types") else "attraction",
                description=place_data.get("description", ""),
                rating=place_data.get("rating"),
                placeId=place_data.get("placeId"),
                address=place_data.get("address", ""),
                coordinates=coords,
                location=ActivityLocation(
                    name=place_data.get("name", place_name),
                    address=place_data.get("address", ""),
                    coordinates=coords,
                ),
                websiteUrl=place_data.get("website"),
                phoneNumber=place_data.get("phone"),
                metadata={"addedBy": "ai", "source": "user_request"},
            )
            display_name = place_data.get("name", place_name)
        else:
            activity = Activity(
                id=str(uuid.uuid4()),
                title=place_name,
                name=place_name,
                type="attraction",
                metadata={"addedBy": "ai", "source": "user_request"},
            )
            display_name = place_name

        days = itinerary.get("days", [])
        if target_day and 1 <= target_day <= len(days):
            day = days[target_day - 1]
            slots = day.get("timeSlots", [])
            slot = next((s for s in slots if s.get("period") == target_slot), slots[0] if slots else None)
            if slot:
                slot.setdefault("activities", [])
                slot["activities"].append(activity.model_dump())
            else:
                new_slot = create_time_slot(target_slot, activity).model_dump()
                day["timeSlots"].append(new_slot)

        return {
            "itinerary": itinerary,
            "message": f"Added {display_name} to Day {target_day or 1}",
            "changeSummary": {"action": "add", "target": display_name, "added": [display_name]},
        }

    def remove_activity(self, itinerary: dict, action: dict) -> dict:
        target_day = action.get("target", {}).get("day")
        activity_id = action.get("target", {}).get("activityId")
        activity_name = action.get("target", {}).get("activityName")

        days = itinerary.get("days", [])
        removed = None
        if target_day and 1 <= target_day <= len(days):
            day = days[target_day - 1]
            slots = day.get("timeSlots", [])
            for si, slot in enumerate(slots):
                # Check slot.activity (single-activity slots — what the frontend reads)
                slot_act = slot.get("activity")
                if slot_act and (
                    (activity_id and slot_act.get("id") == activity_id) or
                    (activity_name and slot_act.get("title", "").lower() == activity_name.lower())
                ):
                    removed = slot_act
                    # Remove the entire slot since it only held this one activity
                    slots.pop(si)
                    break
                # Also check slot.activities (list format)
                activities = slot.get("activities", [])
                for i, act in enumerate(activities):
                    if (activity_id and act.get("id") == activity_id) or \
                       (activity_name and act.get("title", "").lower() == activity_name.lower()):
                        removed = activities.pop(i)
                        # If this was also slot.activity, clear or update it
                        if slot.get("activity", {}).get("id") == act.get("id"):
                            slot["activity"] = activities[0] if activities else None
                        break
                if removed:
                    break

        name = removed.get("title", "activity") if removed else "activity"
        return {
            "itinerary": itinerary,
            "message": f"Removed {name} from Day {target_day or 1}",
            "changeSummary": {"action": "remove", "target": name, "removed": [name]},
        }

    async def replace_activity(self, itinerary: dict, action: dict, destination: str) -> dict:
        result = self.remove_activity(itinerary, action)
        add_result = await self.add_activity(result["itinerary"], action, destination)
        new_name = action.get("details", {}).get("placeName", "new activity")
        return {
            "itinerary": add_result["itinerary"],
            "message": f"Replaced activity with {new_name}",
            "changeSummary": {"action": "replace", "target": new_name},
        }

    def move_activity(self, itinerary: dict, action: dict) -> dict:
        target_day = action.get("target", {}).get("day")
        new_day = action.get("details", {}).get("newDay", target_day)
        activity_id = action.get("target", {}).get("activityId")
        new_slot = action.get("details", {}).get("newTimeSlot", "morning")

        days = itinerary.get("days", [])
        moved_activity = None

        if target_day and 1 <= target_day <= len(days):
            day = days[target_day - 1]
            slots = day.get("timeSlots", [])
            for si, slot in enumerate(slots):
                # Check slot.activity (single-activity field)
                slot_act = slot.get("activity")
                if slot_act and slot_act.get("id") == activity_id:
                    moved_activity = slot_act
                    # Remove the entire slot since it only held this one activity
                    slots.pop(si)
                    break
                # Also check slot.activities list
                activities = slot.get("activities", [])
                for i, act in enumerate(activities):
                    if act.get("id") == activity_id:
                        moved_activity = activities.pop(i)
                        if slot.get("activity", {}).get("id") == act.get("id"):
                            slot["activity"] = activities[0] if activities else None
                        break
                if moved_activity:
                    break

        if moved_activity and new_day and 1 <= new_day <= len(days):
            target = days[new_day - 1]
            # Always create a new slot for the moved activity
            target["timeSlots"].append(create_time_slot(new_slot, Activity(**moved_activity)).model_dump())

        return {
            "itinerary": itinerary,
            "message": f"Moved activity to Day {new_day}",
            "changeSummary": {"action": "move", "target": moved_activity.get("title", "activity") if moved_activity else "activity"},
        }

    def add_day(self, itinerary: dict) -> dict:
        days = itinerary.get("days", [])
        day_num = len(days) + 1
        last_location = days[-1].get("location", itinerary.get("tripMetadata", {}).get("destination", "Destination")) if days else "Destination"
        new_day = create_day_plan(day_num, "", last_location).model_dump()
        days.append(new_day)
        return {
            "itinerary": itinerary,
            "message": f"Added Day {day_num}",
            "changeSummary": {"action": "add", "target": f"Day {day_num}"},
        }

    def remove_day(self, itinerary: dict, day_number: int) -> dict:
        days = itinerary.get("days", [])
        if 1 <= day_number <= len(days):
            days.pop(day_number - 1)
            for i, d in enumerate(days):
                d["dayNumber"] = i + 1
        return {
            "itinerary": itinerary,
            "message": f"Removed Day {day_number}",
            "changeSummary": {"action": "remove", "target": f"Day {day_number}"},
        }

    def edit_time(self, itinerary: dict, day: int, slot_id: str, start_time: str, end_time: str) -> dict:
        """Update the start/end time of a time slot."""
        days = itinerary.get("days", [])
        if 1 <= day <= len(days):
            for slot in days[day - 1].get("timeSlots", []):
                if slot.get("id") == slot_id:
                    slot["startTime"] = start_time
                    slot["endTime"] = end_time
                    slot["time"] = f"{start_time}-{end_time}"
                    break
        return {
            "itinerary": itinerary,
            "message": f"Updated time for Day {day}",
            "changeSummary": {"action": "edit_time", "target": f"Day {day}"},
        }

    def update_caption(self, itinerary: dict, day: int, activity_id: str, caption: str) -> dict:
        """Update the description/caption of an activity."""
        days = itinerary.get("days", [])
        if 1 <= day <= len(days):
            for slot in days[day - 1].get("timeSlots", []):
                updated = False
                # Check slot.activity (single-activity field — what the frontend reads)
                slot_act = slot.get("activity")
                if slot_act and slot_act.get("id") == activity_id:
                    slot_act["description"] = caption
                    updated = True
                # Also update in slot.activities list (may be a separate dict copy)
                for act in slot.get("activities", []):
                    if act.get("id") == activity_id:
                        act["description"] = caption
                        updated = True
                if updated:
                    return {
                        "itinerary": itinerary,
                        "message": f"Updated caption for activity on Day {day}",
                        "changeSummary": {"action": "caption", "target": activity_id},
                    }
        return {
            "itinerary": itinerary,
            "message": f"Activity not found on Day {day}",
            "changeSummary": {"action": "caption", "target": activity_id},
        }

    def reorder_activity(self, itinerary: dict, day: int, activity_id: str, new_position: int) -> dict:
        """Reorder an activity within a day's time slots."""
        days = itinerary.get("days", [])
        if not (1 <= day <= len(days)):
            return {
                "itinerary": itinerary,
                "message": f"Day {day} not found",
                "changeSummary": {"action": "reorder", "target": activity_id},
            }

        day_data = days[day - 1]
        slots = day_data.get("timeSlots", [])

        # Flatten all activities across slots in order, tracking which slot each came from
        all_activities = []
        slot_map = []  # (slot_index, activity_index_in_slot)
        for si, slot in enumerate(slots):
            acts = slot.get("activities", [])
            for ai, act in enumerate(acts):
                all_activities.append(act)
                slot_map.append((si, ai))

        # Find the activity and move it
        found_idx = None
        for i, act in enumerate(all_activities):
            if act.get("id") == activity_id:
                found_idx = i
                break

        if found_idx is None:
            return {
                "itinerary": itinerary,
                "message": f"Activity not found on Day {day}",
                "changeSummary": {"action": "reorder", "target": activity_id},
            }

        # Clamp new_position
        new_position = max(0, min(new_position, len(all_activities) - 1))
        moved = all_activities.pop(found_idx)
        all_activities.insert(new_position, moved)

        # Rebuild: distribute activities back to slots, preserving slot boundaries
        # We keep the same number of activities per slot as before
        slot_sizes = [len(slot.get("activities", [])) for slot in slots]
        offset = 0
        for si, slot in enumerate(slots):
            count = slot_sizes[si]
            slot["activities"] = all_activities[offset:offset + count]
            # Update slot.activity to the first activity if any
            if slot["activities"]:
                slot["activity"] = slot["activities"][0]
            offset += count

        return {
            "itinerary": itinerary,
            "message": f"Reordered activity on Day {day}",
            "changeSummary": {"action": "reorder", "target": activity_id},
        }


itinerary_editor = ItineraryEditor()
