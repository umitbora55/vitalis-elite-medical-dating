import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

/**
 * LoadingSpinner Component
 *
 * Mobile Audit Fix: Agent 12 Finding - LoadingScreen shows only "Loading..." text
 * Provides visual feedback with animated spinner and optional message.
 */
import { BrandLogo } from './BrandLogo';

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = 'Loading...',
  fullScreen = false,
}) => {
  const logoSize = size === 'sm' ? 32 : size === 'md' ? 56 : 80;

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Brand Logo with Animation */}
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gold-400/20 blur-2xl rounded-full animate-pulse-soft" />

        <BrandLogo size={logoSize} className="relative z-10 animate-scale-in" />

        {/* Ring animation */}
        <div className="absolute -inset-2 border border-gold-500/20 rounded-[30%] animate-spin-slow" />
      </div>

      {/* Loading Message */}
      {message && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-white font-serif italic text-lg tracking-wide opacity-90">
            Vitalis
          </p>
          <p className="text-gold-500/60 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
            {message}
          </p>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="min-h-screen bg-slate-950 flex items-center justify-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {spinner}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center p-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {spinner}
    </div>
  );
};

/**
 * LoadingSkeleton Component
 *
 * Provides skeleton loading UI for content placeholders
 */
export const LoadingSkeleton: React.FC<{
  className?: string;
  variant?: 'text' | 'circle' | 'rect' | 'card';
  width?: string;
  height?: string;
}> = ({ className = '', variant = 'rect', width, height }) => {
  const baseClasses = 'bg-slate-800 animate-pulse';

  const variantClasses = {
    text: 'h-4 rounded',
    circle: 'rounded-full',
    rect: 'rounded-lg',
    card: 'rounded-xl',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * ProfileCardSkeleton Component
 *
 * Skeleton placeholder for ProfileCard loading state
 */
export const ProfileCardSkeleton: React.FC = () => (
  <div className="w-full aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden animate-pulse">
    {/* Image skeleton */}
    <div className="w-full h-3/4 bg-slate-800" />

    {/* Content skeleton */}
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <LoadingSkeleton variant="text" className="w-32 h-6" />
        <LoadingSkeleton variant="circle" className="w-5 h-5" />
      </div>
      <LoadingSkeleton variant="text" className="w-24 h-4" />
      <div className="flex gap-2">
        <LoadingSkeleton variant="rect" className="w-16 h-6" />
        <LoadingSkeleton variant="rect" className="w-20 h-6" />
      </div>
    </div>
  </div>
);

/**
 * MatchCardSkeleton Component
 *
 * Skeleton placeholder for match cards in list
 */
export const MatchCardSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-3 animate-pulse">
    <LoadingSkeleton variant="circle" className="w-14 h-14 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <LoadingSkeleton variant="text" className="w-24 h-4" />
      <LoadingSkeleton variant="text" className="w-36 h-3" />
    </div>
    <LoadingSkeleton variant="text" className="w-10 h-3" />
  </div>
);

/**
 * MessageSkeleton Component
 *
 * Skeleton placeholder for chat messages
 */
export const MessageSkeleton: React.FC<{ isMe?: boolean }> = ({ isMe = false }) => (
  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-pulse`}>
    <div
      className={`max-w-[70%] p-3 rounded-2xl ${isMe
          ? 'bg-gold-500/20 rounded-tr-none'
          : 'bg-slate-800 rounded-tl-none'
        }`}
    >
      <LoadingSkeleton variant="text" className="w-32 h-4 mb-1" />
      <LoadingSkeleton variant="text" className="w-20 h-3" />
    </div>
  </div>
);

export default LoadingSpinner;
