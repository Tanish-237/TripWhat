import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  apiTriggerAutoCompletion,
  apiGetAutoCompletionStatus,
} from "../lib/api";
import {
  Clock,
  Play,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";

const TripAutoCompletionAdmin = () => {
  const { user, getToken } = useAuth();
  const [status, setStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch service status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await apiGetAutoCompletionStatus(token);
      setStatus(response);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual auto-completion
  const triggerAutoCompletion = async () => {
    try {
      setIsRunning(true);
      setError(null);
      const token = await getToken();
      const response = await apiTriggerAutoCompletion(token);
      setLastResult(response);

      // Refresh status after completion
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      setError(err.message || "Failed to trigger auto-completion");
    } finally {
      setIsRunning(false);
    }
  };

  // Load status on component mount
  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Trip Auto-Completion Service
        </h2>
      </div>

      {/* Service Status */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Service Status
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading status...
          </div>
        ) : status ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {status.isRunning ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span
                className={`font-medium ${
                  status.isRunning ? "text-green-700" : "text-red-700"
                }`}
              >
                {status.isRunning ? "Running" : "Stopped"}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                <strong>Schedule:</strong> {status.schedule} (Daily at midnight
                UTC)
              </p>
              {status.nextRun && (
                <p>
                  <strong>Next Run:</strong>{" "}
                  {new Date(status.nextRun).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ) : (
          error && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )
        )}
      </div>

      {/* Manual Trigger */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Manual Control
        </h3>
        <button
          onClick={triggerAutoCompletion}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isRunning ? "Running Check..." : "Run Manual Check"}
        </button>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="ml-2 flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Last Manual Run Result
          </h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">{lastResult.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">How Auto-Completion Works:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Runs automatically every day at midnight UTC</li>
              <li>Checks for trips that ended more than 24 hours ago</li>
              <li>Automatically marks all activities as completed (100%)</li>
              <li>
                Sets trips as completed but keeps them in upcoming (user
                controls removal)
              </li>
              <li>Also checks in real-time when users view trips</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Error: {error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripAutoCompletionAdmin;
