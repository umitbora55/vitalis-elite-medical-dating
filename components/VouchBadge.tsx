/**
 * VouchBadge
 *
 * Feature 7: Peer Vouch
 * Small purple badge shown on profiles that have ≥ 2 confirmed peer vouches.
 */

import React from 'react';
import { Users } from 'lucide-react';

interface VouchBadgeProps {
  vouchCount: number;
  /** Show full label text (default: true) */
  showLabel?: boolean;
}

export const VouchBadge: React.FC<VouchBadgeProps> = ({
  vouchCount,
  showLabel = true,
}) => {
  if (vouchCount < 2) return null;

  return (
    <span className="inline-flex items-center gap-1 bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
      <Users size={9} />
      {showLabel && 'Meslektaş Onaylı'}
    </span>
  );
};
