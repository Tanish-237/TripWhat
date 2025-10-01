import React from "react";
import { cn } from "@/lib/utils";

const Slider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled = false,
  ...props
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
        }}
        {...props}
      />
      <div
        className="absolute top-0 left-0 h-2 bg-blue-500 rounded-lg pointer-events-none"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export { Slider };
