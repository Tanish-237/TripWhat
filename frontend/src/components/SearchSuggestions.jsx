import React from "react";
import { MapPin, Calendar, Compass, Globe, Building, Mountain } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SearchSuggestions({ suggestions, loading, onSelectSuggestion, visible, error }) {
  const navigate = useNavigate();
  
  if (!visible) return null;
  
  // Show loading, error, or no results states
  if (loading || error || (!loading && suggestions.length === 0)) {
    // Continue to render the dropdown for these states
  }
  
  const getCategoryIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "country": 
        return <Globe className="w-4 h-4 text-green-600" />;
      case "state": 
        return <Building className="w-4 h-4 text-blue-600" />;
      case "capital":
        return <MapPin className="w-4 h-4 text-red-500" />;
      case "city": 
        return <MapPin className="w-4 h-4 text-blue-500" />;
      case "museum": 
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case "historic": 
        return <Calendar className="w-4 h-4 text-amber-500" />;
      case "natural": 
        return <Mountain className="w-4 h-4 text-green-500" />;
      default:
        return <MapPin className="w-4 h-4 text-gray-500" />;
    }
  };
  
  const getTypeLabel = (type) => {
    switch (type?.toLowerCase()) {
      case "country": return "Country";
      case "state": return "State";
      case "capital": return "Capital City";
      case "city": return "City";
      case "museum": return "Museum";
      case "historic": return "Historic Site";
      case "natural": return "Natural Attraction";
      default: return "Place";
    }
  };
  
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
      {loading ? (
        <div className="p-4 text-center text-gray-500">
          <div className="animate-pulse flex items-center justify-center space-x-1">
            <div className="h-1 w-1 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="h-1 w-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="h-1 w-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          <p className="mt-2 text-sm">Searching...</p>
        </div>
      ) : error ? (
        <div className="p-4 text-center text-red-500">
          <p className="text-sm">Unable to fetch suggestions</p>
          <p className="text-xs text-gray-500 mt-1">Please try again</p>
        </div>
      ) : suggestions.length > 0 ? (
        <div>
          {suggestions.map((suggestion, index) => (
            <div 
              key={suggestion.id} 
              className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''
              }`}
              onMouseDown={(e) => {
                // Prevent the input from losing focus
                e.preventDefault();
                onSelectSuggestion(suggestion);
              }}
            >
              <div className="mr-3 flex-shrink-0">
                {getCategoryIcon(suggestion.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 truncate">{suggestion.name}</h4>
                  <span className="ml-2 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full flex-shrink-0">
                    {getTypeLabel(suggestion.type)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {suggestion.state && suggestion.country !== suggestion.state 
                    ? `${suggestion.state}, ${suggestion.country}`
                    : suggestion.country}
                </p>
              </div>
            </div>
          ))}
          {suggestions.length > 0 && (
            <div className="p-2 bg-gray-50 border-t border-gray-200 text-center">
              <button 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const firstSuggestion = suggestions[0];
                  navigate(`/search?q=${encodeURIComponent(firstSuggestion.name)}`);
                }}
              >
                View all results for "{suggestions[0]?.name}"
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500">
          <p className="text-sm">No destinations found</p>
          <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}