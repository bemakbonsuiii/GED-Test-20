import React from "react";

interface CircularScoreProps {
  label: string;
  score: number;
  color?: string;
  size?: number;
}

export const CircularScore: React.FC<CircularScoreProps> = ({ 
  label, 
  score, 
  color = "#3b82f6",
  size = 80 
}) => {
  const percentage = Math.min(Math.max(score, 0), 100);
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          viewBox="0 0 64 64"
        >
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-slate-200 dark:text-slate-700"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.5s ease",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-slate-900 dark:text-white">
            {Math.round(percentage)}
          </span>
        </div>
      </div>
      <span className="text-xs text-slate-600 dark:text-slate-400 text-center max-w-[80px] leading-tight">
        {label}
      </span>
    </div>
  );
};
