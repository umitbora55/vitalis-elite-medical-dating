export enum Specialty {
  CARDIOLOGY = 'Cardiology',
  NEUROLOGY = 'Neurology',
  SURGERY = 'General Surgery',
  PEDIATRICS = 'Pediatrics',
  DERMATOLOGY = 'Dermatology',
  ANESTHESIOLOGY = 'Anesthesiology',
  RADIOLOGY = 'Radiology',
  EMERGENCY = 'Emergency Medicine',
  PSYCHIATRY = 'Psychiatry',
  PHYSIOTHERAPY = 'Physiotherapy',
  NURSING = 'Nursing',
  PHARMACY = 'Pharmacy',
  DENTISTRY = 'Dentistry',
  DIETETICS = 'Dietetics'
}

export enum MedicalRole {
  DOCTOR = 'Doctor',
  NURSE = 'Nurse',
  PHARMACIST = 'Pharmacist',
  PHYSIOTHERAPIST = 'Physiotherapist',
  DIETITIAN = 'Dietitian',
  DENTIST = 'Dentist',
  TECHNICIAN = 'Technician',
  STUDENT = 'Medical Student'
}

export enum SwipeDirection {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  SUPER = 'SUPER'
}

export enum NotificationType {
  LIKE = 'LIKE',
  MATCH = 'MATCH',
  SUPER_LIKE = 'SUPER_LIKE'
}

export enum ReportReason {
  INAPPROPRIATE = 'Inappropriate Photo',
  HARASSMENT = 'Harassment',
  SPAM = 'Spam',
  FAKE = 'Fake Profile',
  OTHER = 'Other'
}

export enum MatchSortOption {
  NEWEST = 'NEWEST',
  ALPHABETICAL = 'ALPHABETICAL',
  LAST_MESSAGE = 'LAST_MESSAGE',
  COMPATIBLE = 'COMPATIBLE'
}

export type FirstMessagePreference = 'ANYONE' | 'ME_FIRST' | 'THEM_FIRST';

export type SwipeAction = 'LIKE' | 'PASS' | 'SUPER_LIKE';

export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

export interface SwipeHistoryItem {
  id: string;
  profile: Profile;
  action: SwipeAction;
  timestamp: number;
}

export interface ProfileVisitor {
  id: string;
  profile: Profile;
  timestamp: number;
  viewCount: number;
}

export interface MessageTemplate {
  id: string;
  text: string;
  isCustom: boolean;
}

export interface ChatTheme {
  id: string;
  name: string;
  primaryColor: string; // User's bubble color class
  secondaryColor: string; // Match's bubble color class
  textColor: string; // Text color inside bubbles
  backgroundColorClass: string; // Tailwind class for background
  backgroundImage?: string; // URL for custom or pattern background
  isDark: boolean; // To determine text color on background
}

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'scheduled';

export interface StoryViewer {
  id: string;
  name: string;
  avatar: string;
  timestamp: number;
  reaction?: string; // e.g., '❤️', '🔥'
}

export interface Story {
  id: string;
  imageUrl: string;
  timestamp: number;
  seen: boolean;
  viewers?: StoryViewer[]; // New: List of people who viewed/reacted
}

export type StoryPrivacy = 'ALL_MATCHES' | 'SELECTED';

export type NotificationSound = 'Vitalis' | 'Chime' | 'Pulse' | 'Soft';

export interface NotificationSettings {
  newMatches: boolean;
  messages: boolean;
  likes: boolean;
  stories: boolean;
  superLikes: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g., "23:00"
  quietHoursEnd: string; // e.g., "07:00"
  onlyMatches: boolean;
  sound: NotificationSound;
  vibration: boolean;
}

export interface PrivacySettings {
  ghostMode: boolean; // Only visible to people you liked
  hideSameInstitution: boolean;
  hiddenProfileIds: string[]; // List of IDs manually hidden
  showInNearby: boolean; // Allow visibility in Nearby Active Users feature
  recordProfileVisits: boolean; // Allow recording visits to other profiles (and seeing own visitors)
}

export interface PhotoMetadata {
  id: string;
  url: string;
  performanceScore: number; // 0-100 score relative to others
  likeRateDifference: number; // e.g., +34 or -10 (percentage)
  isBlurry: boolean;
  isBest: boolean;
}

export interface ProfileQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface ReferralData {
  code: string;
  invitedCount: number;
  joinedCount: number;
  totalRewardsEarned: number; // in days
  referrals: {
      name: string;
      status: 'PENDING' | 'VERIFIED';
      timestamp: number;
  }[];
}

export interface VerificationBadges {
  photo: boolean;
  phone: boolean;
  email: boolean;
  license: boolean; // Main professional verification
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  role: MedicalRole;
  specialty: Specialty;
  subSpecialty: string;
  hospital: string;
  institutionHidden: boolean;
  bio: string;
  education: string;
  images: string[];
  photoMetadata?: PhotoMetadata[]; // Detailed stats for photos
  verified: boolean; // Keeps backward compatibility, acts as License Verified
  verificationBadges?: VerificationBadges; // New: Detailed badges
  interests: string[];
  personalityTags: string[]; // IDs of selected personality tags
  questions?: ProfileQuestion[]; // New: Q&A Section
  hasLikedUser: boolean;
  distance: number;
  location: string;
  isLocationHidden: boolean;
  lastActive: number;
  isOnlineHidden: boolean;
  isAvailable: boolean; 
  availabilityExpiresAt?: number; 
  readReceiptsEnabled: boolean;
  stories: Story[]; 
  storyPrivacy: StoryPrivacy;
  notificationSettings?: NotificationSettings;
  privacySettings?: PrivacySettings;
  isFrozen?: boolean; // Account frozen state
  freezeReason?: string; // Reason for freezing
  firstMessagePreference?: FirstMessagePreference; // New: First message rule
  referralData?: ReferralData; // New: Referral system data
  themePreference?: ThemePreference; // New: App theme preference
}

export interface CallInfo {
  type: 'VOICE' | 'VIDEO';
  duration?: string; // e.g. "05:23" or "Missed"
  status: 'MISSED' | 'COMPLETED' | 'DECLINED';
}

export interface Message {
  id: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  duration?: string;
  callInfo?: CallInfo; // New: For Call Logs
  senderId: string;
  timestamp: number;
  status: MessageStatus;
  scheduledFor?: number; // Timestamp for when the message should be sent
  isScheduled?: boolean; // Flag to indicate it is a pending scheduled message
}

export interface Match {
  profile: Profile;
  timestamp: number;
  lastMessage?: string;
  theme?: ChatTheme; // Custom theme for this chat
  isFirstMessagePending?: boolean; // New: Is it waiting for the first move?
  allowedSenderId?: string | null; // New: 'me', 'them', or null (anyone)
  expiresAt?: number; // New: Timestamp when match expires if no message sent
}

export interface Notification {
  id: string;
  type: NotificationType;
  senderProfile: Profile;
  timestamp: number;
  isRead: boolean;
}

export interface IcebreakerState {
  loading: boolean;
  text: string | null;
  error: string | null;
}

export interface FilterPreferences {
  ageRange: [number, number];
  maxDistance: number;
  specialties: Specialty[];
  showAvailableOnly: boolean;
}