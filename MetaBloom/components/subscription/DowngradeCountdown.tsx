"use client";

import React, { useState, useEffect } from 'react';
import { PiClock, PiArrowDown } from 'react-icons/pi';

interface DowngradeCountdownProps {
  endDate: Date;
  targetPlan: string;
  className?: string;
  variant?: 'minimal' | 'compact';
}

function DowngradeCountdown({ 
  endDate, 
  targetPlan, 
  className = '',
  variant = 'minimal'
}: DowngradeCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = endDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  const formatTimeUnit = (value: number, unit: string): string => {
    if (value === 0) return '';
    return `${value}${unit}`;
  };

  const getTimeDisplay = (): string => {
    const { days, hours, minutes, seconds } = timeLeft;
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else if (seconds > 0) {
      return `${seconds}s`;
    } else {
      return 'Expired';
    }
  };

  const getUrgencyColor = (): string => {
    const { days, hours } = timeLeft;
    
    if (days === 0 && hours <= 6) {
      return 'text-red-600 dark:text-red-400';
    } else if (days <= 1) {
      return 'text-orange-600 dark:text-orange-400';
    } else if (days <= 3) {
      return 'text-yellow-600 dark:text-yellow-400';
    } else {
      return 'text-blue-600 dark:text-blue-400';
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-xs ${getUrgencyColor()} ${className}`}>
        <PiClock className="text-xs" />
        <span className="font-medium">{getTimeDisplay()}</span>
        <PiArrowDown className="text-xs opacity-60" />
        <span className="capitalize opacity-80">{targetPlan}</span>
      </div>
    );
  }

  // Minimal variant (default)
  return (
    <div className={`flex items-center gap-1 text-xs ${getUrgencyColor()} ${className}`}>
      <PiClock className="text-xs opacity-80" />
      <span className="font-medium">{getTimeDisplay()}</span>
      <span className="opacity-60">→ {targetPlan}</span>
    </div>
  );
}

export default DowngradeCountdown;
