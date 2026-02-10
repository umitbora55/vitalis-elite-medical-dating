import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Match, Message, MessageStatus, Profile, MessageTemplate, ChatTheme } from '../types';
import { Send, X, Check, CheckCheck, Mic, PhoneMissed, Clock, Calendar, Edit2, Phone, Video, UserMinus } from 'lucide-react';
import { CHAT_THEME_PRESETS, BACKGROUND_OPTIONS } from '../constants';
import { ChatHeader } from './chat/ChatHeader';
import { ChatInput } from './chat/ChatInput';
import { MessageBubble } from './chat/MessageBubble';
import { CallOverlay } from './chat/CallOverlay';
import { ThemeModal } from './chat/ThemeModal';
import { SearchOverlay } from './chat/SearchOverlay';
import { TemplatesModal } from './chat/TemplatesModal';
import { useRecording } from '../hooks/useRecording';
import { trackEvent } from '../src/lib/analytics';

interface ChatViewProps {
  match: Match;
  onBack: () => void;
  onUnmatch?: (matchId: string) => void;
  userProfile: Profile;
  templates?: MessageTemplate[];
  onAddTemplate?: (text: string) => void;
  onDeleteTemplate?: (id: string) => void;
  onUpdateMatchTheme?: (matchId: string, theme: ChatTheme) => void;
  isPremium?: boolean;
}

const MOCK_RESPONSES = [
    "Hello! Great to connect with you.",
    "How's your shift going today?",
    "I'm actually just finishing up some rounds.",
    "That's really interesting!",
    "I agree completely.",
    "Have you been working at your hospital long?",
    "It's rare to find someone who understands our schedule haha.",
    "Would you be interested in grabbing a coffee sometime?",
    "I'm doing well, thanks for asking! And you?"
];

// Mock images to simulate gallery selection
const MOCK_SHARED_PHOTOS = [
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800", // Lab
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=800", // Medical vibe
    "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80&w=800", // Hospital
    "https://images.unsplash.com/photo-1511174511562-5f7f18b874f8?auto=format&fit=crop&q=80&w=800"  // Coffee
];

type CallStatus = 'IDLE' | 'OUTGOING' | 'INCOMING' | 'ACTIVE';
type CallType = 'VOICE' | 'VIDEO';
type SearchDateFilter = 'ALL' | 'WEEK' | 'MONTH';
type SearchMediaType = 'ALL' | 'PHOTO' | 'AUDIO';
type BackgroundOption = (typeof BACKGROUND_OPTIONS)[number];

// Helper for highlighting text
const HighlightedText = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim()) {
        return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) => 
                regex.test(part) ? (
                    <span key={i} className="bg-gold-500/50 text-white rounded px-0.5">{part}</span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
};

export const ChatView: React.FC<ChatViewProps> = ({ 
    match, 
    onBack, 
    onUnmatch, 
    userProfile,
    templates = [],
    onAddTemplate,
    onDeleteTemplate,
    onUpdateMatchTheme,
    isPremium = false
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  // Menu States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [newTemplateText, setNewTemplateText] = useState('');
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);

  // Search States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDateFilter, setSearchDateFilter] = useState<SearchDateFilter>('ALL');
  const [searchMediaType, setSearchMediaType] = useState<SearchMediaType>('ALL');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Scheduling States
  const [isScheduleMenuOpen, setIsScheduleMenuOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  
  // Long Press Logic
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  // Theme States
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ChatTheme>(match.theme || CHAT_THEME_PRESETS['DEFAULT']);
  const [tempTheme, setTempTheme] = useState<ChatTheme>(match.theme || CHAT_THEME_PRESETS['DEFAULT']);
  const [activeThemeTab, setActiveThemeTab] = useState<'COLORS' | 'BACKGROUNDS'>('COLORS');

  // Recording States
  const [isMediaMenuOpen, setIsMediaMenuOpen] = useState(false);
  
  // Call States
  const [callStatus, setCallStatus] = useState<CallStatus>('IDLE');
  const [callType, setCallType] = useState<CallType>('VOICE');
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // First Move Logic
  const [isFirstMovePending, setIsFirstMovePending] = useState(match.isFirstMessagePending || false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const schedulerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const simulateReply = useCallback(() => {
    setIsTyping(true);
    setTimeout(() => {
      const randomResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
      const replyMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        senderId: match.profile.id,
        timestamp: Date.now(),
        status: 'read',
      };
      setMessages((prev) => [...prev, replyMessage]);
      setIsTyping(false);
    }, 3500);
  }, [match.profile.id]);

  const handleSendRecording = useCallback(
    ({ durationSeconds, mode }: { durationSeconds: number; mode: 'AUDIO' | 'VIDEO' }) => {
      if (isFirstMovePending) setIsFirstMovePending(false);
      const durationStr = `0:${durationSeconds < 10 ? '0' : ''}${durationSeconds}`;

      const newMessage: Message = {
        id: Date.now().toString(),
        text: '',
        senderId: 'me',
        timestamp: Date.now(),
        status: 'sent',
        duration: durationStr,
        audioUrl: mode === 'AUDIO' ? 'mock_audio.mp3' : undefined,
        videoUrl: mode === 'VIDEO' ? 'mock_video.mp4' : undefined,
      };

      setMessages((prev) => [...prev, newMessage]);
      trackEvent('message', { type: mode.toLowerCase(), matchId: match.profile.id });
      simulateReply();
    },
    [isFirstMovePending, match.profile.id, simulateReply]
  );

  const {
    isRecording,
    recordingMode,
    recordingDuration,
    setRecordingMode,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useRecording({ onSend: handleSendRecording });

  useEffect(() => {
    if (!isSearchOpen && !highlightedMessageId) {
        scrollToBottom();
    }
  }, [messages, isTyping, isRecording, callStatus, isSearchOpen, highlightedMessageId]);

  // Read Receipt Simulation
  useEffect(() => {
    const sentMessages = messages.filter(m => m.senderId === 'me' && m.status === 'sent' && !m.isScheduled);
    if (sentMessages.length > 0) {
        const timer = setTimeout(() => {
            setMessages(prev => prev.map(m => 
                (m.senderId === 'me' && m.status === 'sent' && !m.isScheduled) ? { ...m, status: 'delivered' } : m
            ));
        }, 1000); 
        return () => clearTimeout(timer);
    }
    return undefined;
  }, [messages]);

  useEffect(() => {
    const canSeeReadReceipts = userProfile.readReceiptsEnabled && match.profile.readReceiptsEnabled;
    if (!canSeeReadReceipts) return undefined;
    const deliveredMessages = messages.filter(m => m.senderId === 'me' && m.status === 'delivered' && !m.isScheduled);
    if (deliveredMessages.length > 0) {
        const timer = setTimeout(() => {
            setMessages(prev => prev.map(m => 
                (m.senderId === 'me' && m.status === 'delivered' && !m.isScheduled) ? { ...m, status: 'read' } : m
            ));
        }, 2500); 
        return () => clearTimeout(timer);
    }
    return undefined;
  }, [messages, userProfile.readReceiptsEnabled, match.profile.readReceiptsEnabled]);

  // Scheduled Messages Checker (Every 5 seconds)
  useEffect(() => {
      schedulerIntervalRef.current = setInterval(() => {
          const now = Date.now();
          setMessages(prev => {
              // Check if any scheduled message is due
              const hasDueMessages = prev.some(m => m.isScheduled && m.scheduledFor && m.scheduledFor <= now);
              
              if (!hasDueMessages) return prev;

              // Update messages: Remove scheduled flag, update status and timestamp
              const updated = prev.map(m => {
                  if (m.isScheduled && m.scheduledFor && m.scheduledFor <= now) {
                      // Trigger reply simulation for the newly sent message
                      return { 
                          ...m, 
                          isScheduled: false, 
                          scheduledFor: undefined, 
                          timestamp: now, 
                          status: 'sent' 
                      } as Message;
                  }
                  return m;
              });
              
              setTimeout(simulateReply, 1000); 
              return updated;
          });
      }, 5000);

      return () => {
          if (schedulerIntervalRef.current) {
              clearInterval(schedulerIntervalRef.current);
          }
      };
  }, []);

  // First Move Timer Logic
  useEffect(() => {
      if (isFirstMovePending && match.expiresAt) {
          const updateTimer = () => {
              const now = Date.now();
              const diff = (match.expiresAt || 0) - now;
              
              if (diff <= 0) {
                  setTimeLeft("Expired");
                  // In a real app, this might trigger a unmatch
                  return;
              }

              const hours = Math.floor(diff / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              
              setTimeLeft(`${hours}h ${minutes}m`);
              setIsUrgent(hours < 1);
          };

          updateTimer();
          countdownIntervalRef.current = setInterval(updateTimer, 60000); // Update every minute
      }

      return () => {
          if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
          }
      };
  }, [isFirstMovePending, match.expiresAt]);

  // Determine if input should be blocked
  const isInputBlocked = isFirstMovePending && match.allowedSenderId !== 'me' && match.allowedSenderId !== null;

  // --- Utility for Relative Time ---
  const formatMatchTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days} days ago`;
    return "a while ago";
  };

  const formatScheduledTime = (timestamp: number) => {
      const date = new Date(timestamp);
      const now = new Date();
      const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
      const isTomorrow = new Date(now.getTime() + 86400000).getDate() === date.getDate();
      
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (isToday) return `Today at ${timeStr}`;
      if (isTomorrow) return `Tomorrow at ${timeStr}`;
      return `${date.toLocaleDateString()} at ${timeStr}`;
  };

  // --- Call Logic ---

  useEffect(() => {
    if (callStatus === 'ACTIVE') {
        callTimerRef.current = setInterval(() => {
            setCallDurationSeconds(prev => prev + 1);
        }, 1000);
    } else {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        setCallDurationSeconds(0);
    }
    return () => {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callStatus]);

  const handleStartCall = (type: CallType) => {
      setCallType(type);
      setCallStatus('OUTGOING');
      setIsMicMuted(false);
      setIsCameraOff(false);

      // Simulate connection after 3 seconds
      setTimeout(() => {
          setCallStatus(prev => prev === 'OUTGOING' ? 'ACTIVE' : prev);
      }, 3000);
  };

  const handleIncomingCall = (type: CallType) => {
      setCallType(type);
      setCallStatus('INCOMING');
  };

  const handleAcceptCall = () => {
      setCallStatus('ACTIVE');
  };

  const handleEndCall = () => {
      const durationStr = formatDuration(callDurationSeconds);
      const isMissed = callStatus === 'INCOMING' || (callStatus === 'OUTGOING' && callDurationSeconds === 0);
      
      const callLog: Message = {
          id: Date.now().toString(),
          text: '',
          senderId: 'me',
          timestamp: Date.now(),
          status: 'sent',
          callInfo: {
              type: callType,
              duration: isMissed ? 'Missed' : durationStr,
              status: isMissed ? 'MISSED' : 'COMPLETED'
          }
      };

      if (callStatus !== 'IDLE') {
        setMessages(prev => [...prev, callLog]);
      }
      
      setCallStatus('IDLE');
      setCallDurationSeconds(0);
  };

  const formatDuration = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- Search Logic ---
  const searchResults = useMemo(() => {
      if (!searchQuery && searchDateFilter === 'ALL' && searchMediaType === 'ALL') return [];

      let filtered = messages;

      // 1. Text Search
      if (searchQuery) {
          filtered = filtered.filter(m => m.text && m.text.toLowerCase().includes(searchQuery.toLowerCase()));
      }

      // 2. Date Filter
      const now = Date.now();
      if (searchDateFilter === 'WEEK') {
          filtered = filtered.filter(m => now - m.timestamp < 7 * 24 * 60 * 60 * 1000);
      } else if (searchDateFilter === 'MONTH') {
          filtered = filtered.filter(m => now - m.timestamp < 30 * 24 * 60 * 60 * 1000);
      }

      // 3. Media Filter
      if (searchMediaType === 'PHOTO') {
          filtered = filtered.filter(m => m.imageUrl);
      } else if (searchMediaType === 'AUDIO') {
          filtered = filtered.filter(m => m.audioUrl);
      }

      return filtered.reverse(); // Show newest matches first in results list
  }, [messages, searchQuery, searchDateFilter, searchMediaType]);

  const handleScrollToMessage = (messageId: string) => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedMessageId(messageId);
          setTimeout(() => setHighlightedMessageId(null), 2000); // Remove highlight after 2s
          // Close search overlay but keep "Find" button visible to re-open? No, close search is better UX
          setIsSearchOpen(false); 
      }
  };

  // --- Handlers ---

  const handleSend = () => {
    if (!inputText.trim()) return;

    // Clear First Move Pending state locally on send
    if (isFirstMovePending) {
        setIsFirstMovePending(false);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      senderId: 'me',
      timestamp: Date.now(),
      status: 'sent'
    };

    setMessages((prev) => [...prev, userMessage]);
    trackEvent('message', { type: 'text', matchId: match.profile.id });
    setInputText('');
    simulateReply();
  };

  const handleScheduleConfirm = () => {
      if (!inputText.trim() || !scheduledDate) return;
      
      const scheduledTime = new Date(scheduledDate).getTime();
      
      const scheduledMessage: Message = {
          id: `scheduled-${Date.now()}`,
          text: inputText.trim(),
          senderId: 'me',
          timestamp: Date.now(), // Created now
          status: 'scheduled',
          isScheduled: true,
          scheduledFor: scheduledTime
      };

      setMessages(prev => [...prev, scheduledMessage]);
      setInputText('');
      setIsDatePickerOpen(false);
      setIsScheduleMenuOpen(false);
  };

  const handleCancelScheduled = (id: string) => {
      setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleEditScheduled = (msg: Message) => {
      setInputText(msg.text);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
  };

  // --- Long Press Handlers for Send Button ---
  const handleSendButtonDown = (_event: React.MouseEvent | React.TouchEvent) => {
      if (isInputBlocked) return;
      if (!inputText.trim()) {
          startRecording();
          return;
      }

      isLongPressRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
          isLongPressRef.current = true;
          setIsScheduleMenuOpen(true);
      }, 500); 
  };

  const handleSendButtonUp = (_event: React.MouseEvent | React.TouchEvent) => {
      if (isInputBlocked) return;
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }

      if (isRecording) {
          stopRecording(true);
          return;
      }

      if (!isLongPressRef.current && inputText.trim() && !isScheduleMenuOpen) {
          handleSend();
      }
      isLongPressRef.current = false;
  };

  const handleSendPhoto = () => {
      if (isFirstMovePending) setIsFirstMovePending(false);
      const randomPhoto = MOCK_SHARED_PHOTOS[Math.floor(Math.random() * MOCK_SHARED_PHOTOS.length)];
      const photoMessage: Message = {
          id: Date.now().toString(),
          text: '', 
          imageUrl: randomPhoto,
          senderId: 'me',
          timestamp: Date.now(),
          status: 'sent'
      };
      setMessages((prev) => [...prev, photoMessage]);
      simulateReply();
  };

  // --- Theme Logic ---
  const handleSaveTheme = () => {
      setCurrentTheme(tempTheme);
      if (onUpdateMatchTheme) {
          onUpdateMatchTheme(match.profile.id, tempTheme);
      }
      setIsThemeModalOpen(false);
  };

  const handleSelectBackground = (bg: BackgroundOption) => {
      if (bg.isPremium && !isPremium) return; 

      if (bg.id === 'custom') {
          setTempTheme(prev => ({
              ...prev,
              backgroundImage: 'https://images.unsplash.com/photo-1518098268026-4e1c91a28a63?auto=format&fit=crop&q=80&w=1200' 
          }));
          return;
      }

      setTempTheme(prev => ({
          ...prev,
          backgroundImage: bg.type === 'COLOR' ? undefined : (bg.css || (bg.url ? `url(${bg.url})` : undefined))
      }));
  };

  const handleRecordCancel = () => {
      cancelRecording();
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
      }
  };

  // --- Templates Logic ---
  const handleSelectTemplate = (text: string) => {
      setInputText(text);
      setIsTemplatesOpen(false);
  };

  const handleSaveTemplate = () => {
      if (newTemplateText.trim() && onAddTemplate) {
          onAddTemplate(newTemplateText.trim());
          setNewTemplateText('');
          setIsAddingTemplate(false);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isInputBlocked) {
      handleSend();
    }
  };

  const handleDeleteConversation = () => {
      setMessages([]);
      setIsMenuOpen(false);
      setShowDeleteToast(true);
      setTimeout(() => setShowDeleteToast(false), 2000);
  };

  const handleUnmatchConfirm = () => {
      if (onUnmatch) {
          onUnmatch(match.profile.id);
      }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStatusIcon = (status: MessageStatus) => {
      if (status === 'sent') return <Check size={14} className="text-slate-500" />;
      if (status === 'delivered') return <CheckCheck size={14} className="text-slate-500" />;
      if (status === 'read') return <CheckCheck size={14} className={currentTheme.isDark ? "text-blue-400" : "text-blue-600"} />;
      if (status === 'scheduled') return <Clock size={14} className="text-gold-500" />;
      return null;
  };

  const getStatusInfo = () => {
    const { isOnlineHidden, lastActive } = match.profile;
    if (isOnlineHidden) return { text: "Recently active", color: "bg-slate-500" };
    const diff = Date.now() - lastActive;
    if (diff < 15 * 60 * 1000) return { text: "Active now", color: "bg-green-500" };
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 24) return { text: `Active ${hours}h ago`, color: "bg-orange-500" };
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return { text: `Active ${days}d ago`, color: "bg-slate-500" };
  };

  const status = getStatusInfo();

  return (
    <div className={`flex flex-col h-full animate-fade-in relative ${currentTheme.backgroundColorClass}`} style={{ backgroundImage: currentTheme.backgroundImage, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Background Overlay for better contrast if image is used */}
      {currentTheme.backgroundImage && (
          <div className={`absolute inset-0 ${currentTheme.isDark ? 'bg-black/40' : 'bg-white/40'} pointer-events-none`}></div>
      )}

      {/* FIRST MOVE BANNER */}
      {isFirstMovePending && (
          <div className={`absolute top-16 left-0 right-0 z-30 px-4 py-2 flex items-center justify-center text-xs font-bold shadow-lg backdrop-blur-md transition-colors ${
              isUrgent ? 'bg-red-500/90 text-white animate-pulse' : 
              match.allowedSenderId === 'me' ? 'bg-blue-600/90 text-white' : 'bg-slate-700/90 text-slate-300'
          }`}>
              <div className="flex items-center gap-2">
                  <Clock size={14} className={isUrgent ? 'animate-spin-slow' : ''} />
                  {match.allowedSenderId === 'me' ? (
                      <span>{timeLeft} kaldı! Eşleşme kaybolmadan mesaj at! 💬</span>
                  ) : (
                      <span>{timeLeft} kaldı. {match.profile.name}'in mesaj atmasını bekle. ⏳</span>
                  )}
              </div>
          </div>
      )}

      <ChatHeader
        match={match}
        currentTheme={currentTheme}
        isFirstMovePending={isFirstMovePending}
        status={status}
        isSearchOpen={isSearchOpen}
        onBack={onBack}
        onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
        onStartCall={handleStartCall}
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
        onOpenTheme={() => {
          setIsThemeModalOpen(true);
          setIsMenuOpen(false);
        }}
        onOpenTemplates={() => {
          setIsTemplatesOpen(true);
          setIsMenuOpen(false);
        }}
        onSimulateIncomingCall={() => {
          handleIncomingCall('VIDEO');
          setIsMenuOpen(false);
        }}
        onDeleteConversation={handleDeleteConversation}
        onUnmatch={() => {
          setShowUnmatchConfirm(true);
          setIsMenuOpen(false);
        }}
        formatMatchTime={formatMatchTime}
      />

      <SearchOverlay
        isOpen={isSearchOpen}
        matchImageUrl={match.profile.images[0]}
        searchQuery={searchQuery}
        searchDateFilter={searchDateFilter}
        searchMediaType={searchMediaType}
        searchResults={searchResults}
        onSearchQueryChange={setSearchQuery}
        onSearchDateFilterChange={setSearchDateFilter}
        onSearchMediaFilterChange={setSearchMediaType}
        onClose={() => setIsSearchOpen(false)}
        onScrollToMessage={handleScrollToMessage}
      />

      {/* Internal Toast for Delete Conversation */}
      {showDeleteToast && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-full z-20 animate-fade-in border border-slate-700">
              Conversation deleted locally.
          </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col relative z-0">
        {messages.length === 0 ? (
            <div className="text-center text-slate-500 text-sm my-8 opacity-60">
                <p className="mb-2">This is the beginning of your professional connection with <br/><span className={`font-bold ${currentTheme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>{match.profile.name}</span>.</p>
                <div className={`inline-block px-3 py-1 rounded-full border text-xs ${currentTheme.isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    Verified Healthcare Professional
                </div>
            </div>
        ) : (
            <div className="flex flex-col gap-3 pb-2">
                {messages.map((msg) => {
                    const isMe = msg.senderId === 'me';
                    const isHighlighted = highlightedMessageId === msg.id;
                    
                    // CALL LOG RENDERING
                    if (msg.callInfo) {
                        return (
                            <div key={msg.id} id={`msg-${msg.id}`} className="w-full flex justify-center my-4">
                                <div className={`border rounded-full px-4 py-2 flex items-center gap-3 ${currentTheme.isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${isHighlighted ? 'ring-2 ring-gold-500 shadow-lg scale-105 transition-all duration-500' : ''}`}>
                                    <div className={`p-2 rounded-full ${msg.callInfo.status === 'MISSED' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                        {msg.callInfo.status === 'MISSED' ? <PhoneMissed size={16} /> : (msg.callInfo.type === 'VIDEO' ? <Video size={16} /> : <Phone size={16} />)}
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className={`text-xs font-bold uppercase tracking-wide ${currentTheme.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {msg.callInfo.type} Call {msg.callInfo.status === 'MISSED' ? 'Missed' : 'Ended'}
                                        </span>
                                        {msg.callInfo.duration !== 'Missed' && (
                                            <span className="text-[10px] text-slate-500">{msg.callInfo.duration}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // SCHEDULED MESSAGE RENDERING
                    if (msg.isScheduled) {
                        return (
                            <div key={msg.id} id={`msg-${msg.id}`} className="self-end items-end flex flex-col max-w-[85%]">
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl rounded-tr-none p-3 backdrop-blur-sm">
                                    <p className={`text-sm leading-relaxed ${currentTheme.isDark ? 'text-slate-200' : 'text-slate-800'} italic opacity-90`}>{msg.text}</p>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-yellow-500/20">
                                        <div className="flex items-center gap-1.5 text-yellow-500">
                                            <Clock size={12} className="animate-pulse" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                                {msg.scheduledFor ? formatScheduledTime(msg.scheduledFor) : 'Scheduled'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleEditScheduled(msg)}
                                                className="p-1.5 hover:bg-yellow-500/20 rounded-full text-yellow-500 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button 
                                                onClick={() => handleCancelScheduled(msg.id)}
                                                className="p-1.5 hover:bg-red-500/20 rounded-full text-red-400 transition-colors"
                                                title="Cancel"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isMe={isMe}
                            currentTheme={currentTheme}
                            isHighlighted={isHighlighted}
                            searchQuery={searchQuery}
                            onImageClick={(url) => setViewingImage(url)}
                            onVideoClick={(url) => setViewingImage(url)}
                            formatTime={formatTime}
                            formatDuration={formatDuration}
                            renderStatusIcon={renderStatusIcon}
                            HighlightedText={HighlightedText}
                            videoThumbnailUrl={match.profile.images[0]}
                        />
                    );
                })}
                
                {/* Typing Indicator */}
                {isTyping && (
                    <div className="self-start flex items-center gap-2 mb-2 ml-1 animate-fade-in">
                        <div className={`w-6 h-6 rounded-full overflow-hidden border ${currentTheme.isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <img src={match.profile.images[0]} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className={`px-3 py-2 rounded-2xl rounded-tl-none border flex gap-1 items-center h-8 ${currentTheme.secondaryColor} ${currentTheme.isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <span className={`w-1 h-1 rounded-full animate-bounce ${currentTheme.isDark ? 'bg-slate-400' : 'bg-slate-500'}`}></span>
                            <span className={`w-1 h-1 rounded-full animate-bounce delay-100 ${currentTheme.isDark ? 'bg-slate-400' : 'bg-slate-500'}`}></span>
                            <span className={`w-1 h-1 rounded-full animate-bounce delay-200 ${currentTheme.isDark ? 'bg-slate-400' : 'bg-slate-500'}`}></span>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t pb-8 relative z-20 transition-colors ${currentTheme.isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        
        {/* Schedule Message Popover Menu */}
        {isScheduleMenuOpen && (
            <div className={`absolute bottom-20 right-4 border rounded-xl shadow-2xl p-2 flex flex-col gap-2 animate-fade-in z-30 mb-2 w-48 ${currentTheme.isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button 
                   onClick={() => { handleSend(); setIsScheduleMenuOpen(false); }}
                   className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors ${currentTheme.isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                    <Send size={16} /> Send Now
                </button>
                <div className="h-px bg-slate-600/20 mx-2"></div>
                <button 
                   onClick={() => { setIsDatePickerOpen(true); setIsScheduleMenuOpen(false); }}
                   className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors bg-gold-500 text-white shadow-md`}
                >
                    <Clock size={16} /> Schedule...
                </button>
            </div>
        )}

        {/* Media Type Menu Popup (Only if not in schedule mode) */}
        {isMediaMenuOpen && !isRecording && !isScheduleMenuOpen && (
            <div className={`absolute bottom-20 right-4 border rounded-xl shadow-2xl p-2 flex flex-col gap-2 animate-fade-in z-30 mb-2 ${currentTheme.isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button 
                   onClick={() => { setRecordingMode('AUDIO'); setIsMediaMenuOpen(false); }}
                   className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                       recordingMode === 'AUDIO' ? 'bg-gold-500 text-white' : `${currentTheme.isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`
                   }`}
                >
                    <Mic size={16} /> Voice Message
                </button>
                <button 
                   onClick={() => { setRecordingMode('VIDEO'); setIsMediaMenuOpen(false); }}
                   className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                       recordingMode === 'VIDEO' ? 'bg-gold-500 text-white' : `${currentTheme.isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`
                   }`}
                >
                    <Video size={16} /> Video Message
                </button>
            </div>
        )}

        <ChatInput
          match={match}
          currentTheme={currentTheme}
          isInputBlocked={isInputBlocked}
          isRecording={isRecording}
          recordingMode={recordingMode}
          recordingDuration={recordingDuration}
          inputText={inputText}
          onInputChange={setInputText}
          onKeyDown={handleKeyDown}
          onSendPhoto={handleSendPhoto}
          onSendButtonDown={handleSendButtonDown}
          onSendButtonUp={handleSendButtonUp}
          onRecordCancel={handleRecordCancel}
          onToggleMediaMenu={() => setIsMediaMenuOpen(!isMediaMenuOpen)}
          isScheduleMenuOpen={isScheduleMenuOpen}
        />
      </div>

      {/* --- Schedule Date Picker Modal --- */}
      {isDatePickerOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gold-500/20 rounded-full flex items-center justify-center border border-gold-500/50">
                          <Clock size={24} className="text-gold-500" />
                      </div>
                      <div>
                          <h3 className="text-lg font-serif font-bold text-white">Schedule Message</h3>
                          <p className="text-slate-400 text-xs">When should we send this?</p>
                      </div>
                  </div>

                  <div className="space-y-4 mb-6">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Pick Date & Time</label>
                          <div className="relative">
                              <Calendar className="absolute left-4 top-3.5 text-slate-400" size={18} />
                              <input 
                                  type="datetime-local" 
                                  value={scheduledDate}
                                  onChange={(e) => setScheduledDate(e.target.value)}
                                  min={new Date().toISOString().slice(0, 16)}
                                  max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)} // 7 days max
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-gold-500 focus:outline-none transition-colors text-sm"
                              />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2 ml-1">
                              Max 7 days in advance. Message will be sent automatically.
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button 
                          onClick={() => setIsDatePickerOpen(false)}
                          className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold hover:bg-slate-800 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={handleScheduleConfirm}
                          disabled={!scheduledDate}
                          className="flex-1 py-3 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          Schedule
                      </button>
                  </div>
              </div>
          </div>
      )}

      <TemplatesModal
        isOpen={isTemplatesOpen}
        templates={templates}
        newTemplateText={newTemplateText}
        isAddingTemplate={isAddingTemplate}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        onDeleteTemplate={onDeleteTemplate}
        onNewTemplateChange={setNewTemplateText}
        onToggleAdd={setIsAddingTemplate}
        onAddTemplate={handleSaveTemplate}
      />

      <ThemeModal
        isOpen={isThemeModalOpen}
        tempTheme={tempTheme}
        activeThemeTab={activeThemeTab}
        isPremium={isPremium}
        onClose={() => setIsThemeModalOpen(false)}
        onSelectTab={setActiveThemeTab}
        onSelectTheme={(theme) => setTempTheme((prev) => ({ ...prev, ...theme }))}
        onSelectBackground={handleSelectBackground}
        onApply={handleSaveTheme}
      />

      <CallOverlay
        callStatus={callStatus}
        callType={callType}
        match={match}
        userProfile={userProfile}
        callDurationSeconds={callDurationSeconds}
        isCameraOff={isCameraOff}
        isMicMuted={isMicMuted}
        onToggleMic={() => setIsMicMuted(!isMicMuted)}
        onToggleCamera={() => setIsCameraOff(!isCameraOff)}
        onEndCall={handleEndCall}
        onAcceptCall={handleAcceptCall}
        formatDuration={formatDuration}
      />

      {/* Full Screen Image Viewer (Lightbox) */}
      {viewingImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in p-4">
              <button 
                 onClick={() => setViewingImage(null)}
                 className="absolute top-6 right-6 p-2 rounded-full bg-slate-800/50 text-white hover:bg-slate-700 transition-colors"
              >
                  <X size={24} />
              </button>
              <img 
                 src={viewingImage} 
                 alt="Full screen" 
                 className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
              />
          </div>
      )}

      {/* Unmatch Confirmation Modal */}
      {showUnmatchConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xs w-full shadow-2xl">
                 <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                     <UserMinus size={28} className="text-red-500" />
                 </div>
                 <h3 className="text-xl font-serif text-white text-center mb-2">Unmatch {match.profile.name}?</h3>
                 <p className="text-slate-400 text-center text-sm mb-6">
                    This will remove them from your matches and delete this conversation. They may appear in your feed again.
                 </p>
                 <div className="flex flex-col gap-3">
                     <button 
                        onClick={handleUnmatchConfirm}
                        className="w-full py-3 rounded-xl bg-red-500 text-white font-bold tracking-wide hover:bg-red-600 transition-colors"
                     >
                        Yes, Unmatch
                     </button>
                     <button 
                        onClick={() => setShowUnmatchConfirm(false)}
                        className="w-full py-3 rounded-xl bg-slate-800 text-slate-400 font-medium hover:text-white transition-colors"
                     >
                        Cancel
                     </button>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};
