import React from 'react';
import { Play } from 'lucide-react';
import { Message } from '../../types';

interface VideoBubbleProps {
  msg: Message;
  thumbnailUrl: string;
  onViewImage: (url: string) => void;
}

export const VideoBubble: React.FC<VideoBubbleProps> = ({
  msg,
  thumbnailUrl,
  onViewImage,
}) => {
  return (
    <div
      className="relative rounded-xl overflow-hidden aspect-[3/4] max-w-[160px] cursor-pointer group"
      onClick={() => onViewImage(thumbnailUrl)}
    >
      <img src={thumbnailUrl} className="w-full h-full object-cover opacity-80" alt="Video message" />
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/50 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play size={24} fill="white" className="text-white ml-1" />
        </div>
      </div>
      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white font-mono font-bold">
        {msg.duration}
      </div>
    </div>
  );
};
