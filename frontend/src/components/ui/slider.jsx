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
          "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50",
          "slider-thumb",
          disabled && "cursor-not-allowed opacity-50"
        )}
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
        }}
        {...props}
      />
    </div>
  );
};

export { Slider };
