import cron from "node-cron";
import SavedTrip from "../models/SavedTrip.js";

class TripAutoCompletionService {
  constructor() {
    this.isRunning = false;
    this.schedule = "0 0 * * *"; // Run daily at midnight
    this.job = null;
  }

  /**
   * Start the auto-completion scheduler
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️ Trip auto-completion service is already running");
      return;
    }

    console.log("🚀 Starting trip auto-completion service...");

    this.job = cron.schedule(
      this.schedule,
      async () => {
        await this.checkAndCompleteTrips();
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    this.isRunning = true;
    console.log(
      "✅ Trip auto-completion service started (runs daily at midnight UTC)"
    );

    // Run once immediately on startup to catch any trips that should already be completed
    setTimeout(() => this.checkAndCompleteTrips(), 5000);
  }

  /**
   * Stop the auto-completion scheduler
   */
  stop() {
    if (this.job) {
      this.job.destroy();
      this.job = null;
    }
    this.isRunning = false;
    console.log("🛑 Trip auto-completion service stopped");
  }

  /**
   * Check for trips that should be marked as completed
   */
  async checkAndCompleteTrips() {
    try {
      console.log("🔍 Checking for trips to auto-complete...");

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Find upcoming trips that have passed their end date
      const expiredTrips = await SavedTrip.find({
        isUpcoming: true,
        isCompleted: false,
        tripEndDate: {
          $lte: yesterday, // Trip ended at least 24 hours ago
        },
      });

      if (expiredTrips.length === 0) {
        console.log("✅ No trips found that need auto-completion");
        return;
      }

      console.log(`📋 Found ${expiredTrips.length} trip(s) to auto-complete`);

      const results = {
        completed: 0,
        errors: 0,
      };

      for (const trip of expiredTrips) {
        try {
          await this.markTripAsCompleted(trip);
          results.completed++;
          console.log(
            `✅ Auto-completed trip: "${trip.title}" (ID: ${trip._id})`
          );
        } catch (error) {
          results.errors++;
          console.error(
            `❌ Failed to auto-complete trip "${trip.title}" (ID: ${trip._id}):`,
            error.message
          );
        }
      }

      console.log(
        `🎉 Auto-completion summary: ${results.completed} completed, ${results.errors} errors`
      );
    } catch (error) {
      console.error("❌ Error in trip auto-completion service:", error);
    }
  }

  /**
   * Mark a specific trip as completed
   */
  async markTripAsCompleted(trip) {
    // Set all activities as completed
    const days = trip.generatedItinerary?.days || [];
    const completedActivities = [];

    days.forEach((day, dayIndex) => {
      (day.timeSlots || []).forEach((slot, timeSlotIndex) => {
        (slot.activities || []).forEach((activity, activityIndex) => {
          const key = `${dayIndex}-${timeSlotIndex}-${activityIndex}`;
          completedActivities.push(key);

          // Mark activity as completed in the nested structure
          if (activity) {
            activity.isCompleted = true;
          }
        });
      });
    });

    // Update the trip
    await SavedTrip.findByIdAndUpdate(trip._id, {
      isCompleted: true,
      completionPercent: 100,
      completedActivities: completedActivities,
      completedAt: new Date(),
      // Keep it as upcoming until user manually removes it
      // isUpcoming: false
    });

    return trip;
  }

  /**
   * Manually trigger completion check (for testing or admin use)
   */
  async runManualCheck() {
    console.log("🔧 Running manual trip completion check...");
    await this.checkAndCompleteTrips();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      schedule: this.schedule,
      nextRun: this.job ? this.job.nextDate() : null,
    };
  }
}

// Create singleton instance
const tripAutoCompletionService = new TripAutoCompletionService();

export default tripAutoCompletionService;
