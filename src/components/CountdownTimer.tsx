import React, { useState, useEffect, useCallback } from 'react';
import { parseBackendUtcDate } from '../utils/timezone';

interface CountdownTimerProps {
  targetDate: string;
  label?: string;
  className?: string;
  onExpire?: () => void; // Callback when timer reaches zero
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  targetDate, 
  label = "Time Remaining",
  className = "",
  onExpire
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });
  const calculateTimeLeft = useCallback((): TimeLeft => {
    const difference = parseBackendUtcDate(targetDate).getTime() - new Date().getTime();
    
    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true
      };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
      isExpired: false
    };
  }, [targetDate]);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(prevTimeLeft => {
        // Only call onExpire when timer transitions from active to expired (not already expired)
        if (!prevTimeLeft.isExpired && newTimeLeft.isExpired && onExpire) {
          // Call onExpire callback after a short delay to ensure state updates
          setTimeout(() => onExpire(), 100);
        }
        return newTimeLeft;
      });
    }, 1000);

    // Initial calculation - don't call onExpire for already expired timers
    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate, calculateTimeLeft]); // Removed onExpire from dependencies to prevent infinite loops

  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  if (timeLeft.isExpired) {
    return (
      <div className={`text-center ${className}`}>
        <div className="text-sm text-gray-500 mb-1">{label}</div>
        <div className="text-red-600 font-semibold">
          ⏰ Expired
        </div>
      </div>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="flex items-center justify-center space-x-1 text-lg font-mono font-bold">
        <div className="flex flex-col items-center">
          <span className="text-2xl text-blue-600">{formatNumber(timeLeft.days)}</span>
          <span className="text-xs text-gray-500">DAYS</span>
        </div>
        <span className="text-gray-400 mx-1">:</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl text-blue-600">{formatNumber(timeLeft.hours)}</span>
          <span className="text-xs text-gray-500">HRS</span>
        </div>
        <span className="text-gray-400 mx-1">:</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl text-blue-600">{formatNumber(timeLeft.minutes)}</span>
          <span className="text-xs text-gray-500">MIN</span>
        </div>
        <span className="text-gray-400 mx-1">:</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl text-blue-600">{formatNumber(timeLeft.seconds)}</span>
          <span className="text-xs text-gray-500">SEC</span>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
