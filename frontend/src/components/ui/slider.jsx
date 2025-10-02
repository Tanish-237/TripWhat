import React from "react";
import { cn } from "@/lib/utils";

const Slider = ({
  value = [0],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled = false,
  color = "blue", // Add color prop for theming
  ...props
}) => {
  // Handle both array and single value formats
  const currentValue = Array.isArray(value) ? value[0] : value;
  const percentage = ((currentValue - min) / (max - min)) * 100;

  const handleChange = (e) => {
    const newValue = Number(e.target.value);
    if (onValueChange) {
      onValueChange([newValue]);
    }
  };

  // Color configurations to match the app theme
  const colorConfigs = {
    blue: {
      track: '#3b82f6', // blue-500
      background: '#e5e7eb', // gray-200
      ring: '#3b82f6', // blue-500
      thumb: '#1d4ed8', // blue-700
    },
    green: {
      track: '#10b981', // green-500
      background: '#e5e7eb', // gray-200
      ring: '#10b981', // green-500
      thumb: '#047857', // green-700
    },
    orange: {
      track: '#f97316', // orange-500
      background: '#e5e7eb', // gray-200
      ring: '#f97316', // orange-500
      thumb: '#c2410c', // orange-700
    },
    purple: {
      track: '#8b5cf6', // purple-500
      background: '#e5e7eb', // gray-200
      ring: '#8b5cf6', // purple-500
      thumb: '#6d28d9', // purple-700
    }
  };

  const colors = colorConfigs[color] || colorConfigs.blue;

  return (
    <div className={cn("relative w-full", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          "w-full h-3 rounded-lg appearance-none cursor-pointer transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-opacity-50",
          `slider-${color}`,
          disabled && "cursor-not-allowed opacity-50"
        )}
        style={{
          background: `linear-gradient(to right, ${colors.track} 0%, ${colors.track} ${percentage}%, ${colors.background} ${percentage}%, ${colors.background} 100%)`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
        {...props}
      />
    </div>
  );
};

export { Slider };
