import React from 'react';
import { Calendar, Filter, Search, X } from 'lucide-react';
import { Message } from '../../types';

type SearchDateFilter = 'ALL' | 'WEEK' | 'MONTH';
type SearchMediaType = 'ALL' | 'PHOTO' | 'AUDIO';

interface SearchOverlayProps {
  isOpen: boolean;
  matchImageUrl: string;
  searchQuery: string;
  searchDateFilter: SearchDateFilter;
  searchMediaType: SearchMediaType;
  searchResults: Message[];
  onSearchQueryChange: (value: string) => void;
  onSearchDateFilterChange: (value: SearchDateFilter) => void;
  onSearchMediaFilterChange: (value: SearchMediaType) => void;
  onClose: () => void;
  onScrollToMessage: (messageId: string) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  matchImageUrl,
  searchQuery,
  searchDateFilter,
  searchMediaType,
  searchResults,
  onSearchQueryChange,
  onSearchDateFilterChange,
  onSearchMediaFilterChange,
  onClose,
  onScrollToMessage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-4 animate-slide-down relative z-10">
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search in chat..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold-500"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => onSearchQueryChange('')}
              className="absolute right-3 top-3 text-slate-500 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 text-sm font-medium px-2">
          Cancel
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          <Calendar size={14} className="ml-1 text-slate-400" />
          <select
            value={searchDateFilter}
            onChange={(e) => onSearchDateFilterChange(e.target.value as SearchDateFilter)}
            className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none py-1 px-1"
          >
            <option value="ALL">Any Time</option>
            <option value="WEEK">Last Week</option>
            <option value="MONTH">Last Month</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          <Filter size={14} className="ml-1 text-slate-400" />
          <select
            value={searchMediaType}
            onChange={(e) => onSearchMediaFilterChange(e.target.value as SearchMediaType)}
            className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none py-1 px-1"
          >
            <option value="ALL">All Media</option>
            <option value="PHOTO">Photos Only</option>
            <option value="AUDIO">Audio Only</option>
          </select>
        </div>
      </div>

      {(searchQuery || searchDateFilter !== 'ALL' || searchMediaType !== 'ALL') && (
        <div className="absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-2xl max-h-[50vh] overflow-y-auto z-20">
          <div className="p-2">
            <p className="text-xs text-slate-500 uppercase font-bold px-2 py-1">
              {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''} Found
            </p>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No messages found.</div>
            ) : (
              searchResults.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => onScrollToMessage(msg.id)}
                  className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    {msg.senderId === 'me' ? (
                      <div className="text-[10px] font-bold text-white">ME</div>
                    ) : (
                      <img src={matchImageUrl} className="w-full h-full rounded-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-200 line-clamp-1">
                      {msg.text || (msg.imageUrl ? '[Photo]' : msg.audioUrl ? '[Voice Message]' : '[Media]')}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">→</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
