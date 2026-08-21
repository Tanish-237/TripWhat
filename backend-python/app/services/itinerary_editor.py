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
            for slot in day.get("timeSlots", []):
                activities = slot.get("activities", [])
                for i, act in enumerate(activities):
                    if (activity_id and act.get("id") == activity_id) or \
                       (activity_name and act.get("title", "").lower() == activity_name.lower()):
                        removed = activities.pop(i)
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
            for slot in day.get("timeSlots", []):
                activities = slot.get("activities", [])
                for i, act in enumerate(activities):
                    if act.get("id") == activity_id:
                        moved_activity = activities.pop(i)
                        break
                if moved_activity:
                    break

        if moved_activity and new_day and 1 <= new_day <= len(days):
            target = days[new_day - 1]
            slot = next((s for s in target.get("timeSlots", []) if s.get("period") == new_slot), None)
            if slot:
                slot.setdefault("activities", [])
                slot["activities"].append(moved_activity)
            else:
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


itinerary_editor = ItineraryEditor()
