import React, { useState } from "react";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

const StartLocationPicker = ({ selected, onSelect, isGoogleMapsLoaded }) => {
  const [selectedPlace, setSelectedPlace] = useState(selected);
  const [manualInput, setManualInput] = useState(selected?.name || "");

  const handlePlaceSelect = (place) => {
    setSelectedPlace(place);
    if (place) {
      onSelect({
        name: place.label,
        placeId: place.value?.place_id,
        description: place.label,
      });
    } else {
      onSelect(null);
    }
  };

  const handleManualInputChange = (e) => {
    const value = e.target.value;
    setManualInput(value);
    if (value.trim()) {
      onSelect({
        name: value.trim(),
        placeId: null,
        description: value.trim(),
      });
    } else {
      onSelect(null);
    }
  };

  return (
    <div className="relative">
      <div className="w-full h-12 relative">
        {isGoogleMapsLoaded ? (
          <GooglePlacesAutocomplete
            selectProps={{
              value: selectedPlace,
              onChange: handlePlaceSelect,
              placeholder: "Enter your starting location...",
              isClearable: true,
              styles: {
                control: (provided, state) => ({
                  ...provided,
                  height: '48px',
                  minHeight: '48px',
                  borderRadius: '0.5rem',
                  borderWidth: '2px',
                  borderColor: state.isFocused ? '#3B82F6' : '#E5E7EB',
                  backgroundColor: 'white',
                  fontSize: '1rem',
                  paddingLeft: '2.5rem',
                  boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
                  '&:hover': {
                    borderColor: '#93C5FD',
                    backgroundColor: '#F9FAFB',
                  },
                }),
                input: (provided) => ({
                  ...provided,
                  color: '#111827',
                  margin: 0,
                  padding: 0,
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: '#6B7280',
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: '#111827',
                }),
                menu: (provided) => ({
                  ...provided,
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  zIndex: 9999,
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? '#DBEAFE' : 'white',
                  color: state.isSelected ? 'white' : '#111827',
                  cursor: 'pointer',
                  '&:active': {
                    backgroundColor: '#2563EB',
                  },
                }),
              },
            }}
            autocompletionRequest={{
              types: ['(cities)'],
            }}
          />
        ) : (
          <Input
            type="text"
            placeholder="Enter your starting location..."
            value={manualInput}
            onChange={handleManualInputChange}
            className="h-12 pl-12 pr-4 text-base bg-white border-2 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:bg-gray-50 hover:border-blue-300 transition-all duration-200"
          />
        )}
        
        {/* Icon overlay */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-blue-500" />
        </div>
      </div>
    </div>
  );
};

export default StartLocationPicker;
