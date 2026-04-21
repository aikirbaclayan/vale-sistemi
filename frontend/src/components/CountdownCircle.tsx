import React, { useEffect, useState } from 'react';
import { getCountdownPercentage, getCountdownColor, getTimeDifferenceInMinutes } from '../utils';

interface CountdownCircleProps {
  requestedAt: string;
  requestedIn: number;
  className?: string;
}

const CountdownCircle: React.FC<CountdownCircleProps> = ({ 
  requestedAt, 
  requestedIn, 
  className = '' 
}) => {
  // Saniyelik tetikleme ile yeniden hesaplama
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 60), 1000);
    return () => window.clearInterval(id);
  }, []);

  const percentage = getCountdownPercentage(requestedAt, requestedIn);
  const strokeColor = getCountdownColor(percentage);
  const elapsedMinutes = getTimeDifferenceInMinutes(requestedAt);
  
  // SVG circle parametreleri
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* SVG Circle */}
      <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 40 40">
        {/* Background circle */}
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className={strokeColor}
          style={{
            strokeDasharray,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.3s ease-in-out',
          }}
        />
      </svg>
      
      {/* Elapsed time text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-gray-600">
          {Math.floor(elapsedMinutes / 60)}:{(elapsedMinutes % 60).toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

export default CountdownCircle;
