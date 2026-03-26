import React from 'react';

export const HeyaLogo = ({ size = 40, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="bubble_gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFB800" />
        <stop offset="100%" stopColor="#FF4D00" />
      </linearGradient>
    </defs>

    {/* Speech Bubble Outline */}
    <path 
      d="M50 20C30.67 20 15 35.67 15 55C15 63.34 17.92 71.01 22.8 77.05L18 88L29.95 84.2C35.85 87.89 42.7 90 50 90C69.33 90 85 74.33 85 55C85 35.67 69.33 20 50 20Z" 
      stroke="url(#bubble_gradient)" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    
    {/* Smiley Face */}
    <circle cx="40" cy="50" r="4" fill="url(#bubble_gradient)" />
    <circle cx="60" cy="50" r="4" fill="url(#bubble_gradient)" />
    <path 
      d="M42 62C42 62 45 66 50 66C55 66 58 62 58 62" 
      stroke="url(#bubble_gradient)" 
      strokeWidth="4" 
      strokeLinecap="round"
    />
  </svg>
);
