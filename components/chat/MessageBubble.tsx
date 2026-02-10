import React from 'react';
import { Message, MessageStatus, ChatTheme } from '../../types';
import { AudioBubble } from './AudioBubble';
import { VideoBubble } from './VideoBubble';

interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  currentTheme: ChatTheme;
  isHighlighted: boolean;
  searchQuery: string;
  onImageClick: (url: string) => void;
  onVideoClick: (url: string) => void;
  formatTime: (timestamp: number) => string;
  formatDuration: (seconds: number) => string;
  renderStatusIcon: (status: MessageStatus) => React.ReactNode;
  HighlightedText: React.ComponentType<{ text: string; highlight: string }>;
  videoThumbnailUrl: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isMe,
  currentTheme,
  isHighlighted,
  searchQuery,
  onImageClick,
  onVideoClick,
  formatTime,
  formatDuration,
  renderStatusIcon,
  HighlightedText,
  videoThumbnailUrl,
}) => {
  return (
    <div
      key={msg.id}
      id={`msg-${msg.id}`}
      className={`flex flex-col max-w-[80%] ${
        isMe ? 'self-end items-end' : 'self-start items-start'
      } transition-all duration-500 ${isHighlighted ? 'scale-105 z-10' : ''}`}
    >
      {msg.audioUrl ? (
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm ${
            isMe
              ? `${currentTheme.primaryColor} ${currentTheme.textColor} rounded-tr-none`
              : `${currentTheme.secondaryColor} ${currentTheme.textColor} rounded-tl-none`
          } ${isHighlighted ? 'ring-2 ring-gold-500 ring-offset-2 ring-offset-slate-900' : ''}`}
        >
          <AudioBubble
            msg={msg}
            isMe={isMe}
            currentTheme={currentTheme}
            formatDuration={formatDuration}
          />
        </div>
      ) : msg.videoUrl ? (
        <div
          className={`rounded-xl overflow-hidden shadow-sm border ${
            isMe ? 'border-white/20 rounded-tr-none' : 'border-slate-700 rounded-tl-none'
          } ${isHighlighted ? 'ring-2 ring-gold-500' : ''}`}
        >
          <VideoBubble msg={msg} thumbnailUrl={videoThumbnailUrl} onViewImage={onVideoClick} />
        </div>
      ) : msg.imageUrl ? (
        <div
          onClick={() => onImageClick(msg.imageUrl || '')}
          className={`rounded-xl overflow-hidden cursor-pointer border transition-transform hover:scale-[1.02] shadow-sm ${
            isMe ? 'border-white/20 rounded-tr-none' : 'border-slate-700 rounded-tl-none'
          } ${isHighlighted ? 'ring-2 ring-gold-500' : ''}`}
        >
          <img
            src={msg.imageUrl}
            alt="Shared"
            className="w-full h-auto max-w-[240px] max-h-[300px] object-cover"
          />
        </div>
      ) : (
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm relative shadow-sm ${
            isMe
              ? `${currentTheme.primaryColor} ${currentTheme.textColor} rounded-tr-none`
              : `${currentTheme.secondaryColor} ${currentTheme.textColor} rounded-tl-none`
          } ${isHighlighted ? 'ring-2 ring-gold-500 ring-offset-2 ring-offset-slate-900' : ''}`}
        >
          <p className="leading-relaxed">
            <HighlightedText text={msg.text} highlight={searchQuery} />
          </p>
        </div>
      )}
      <div className="flex items-center gap-1 mt-1 px-1">
        <span className="text-[10px] text-slate-500 font-medium">{formatTime(msg.timestamp)}</span>
        {isMe && <span className="ml-0.5">{renderStatusIcon(msg.status)}</span>}
      </div>
    </div>
  );
};
