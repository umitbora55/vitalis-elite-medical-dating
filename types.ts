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

/** Maps each MedicalRole to the Specialty values it is allowed to select. */
export const ROLE_SPECIALTIES: Record<MedicalRole, Specialty[]> = {
  [MedicalRole.DOCTOR]: [
    Specialty.CARDIOLOGY,
    Specialty.NEUROLOGY,
    Specialty.SURGERY,
    Specialty.PEDIATRICS,
    Specialty.DERMATOLOGY,
    Specialty.ANESTHESIOLOGY,
    Specialty.RADIOLOGY,
    Specialty.EMERGENCY,
    Specialty.PSYCHIATRY,
  ],
  [MedicalRole.NURSE]: [
    Specialty.NURSING,
    Specialty.EMERGENCY,
    Specialty.PEDIATRICS,
    Specialty.PSYCHIATRY,
  ],
  [MedicalRole.PHARMACIST]: [
    Specialty.PHARMACY,
  ],
  [MedicalRole.PHYSIOTHERAPIST]: [
    Specialty.PHYSIOTHERAPY,
  ],
  [MedicalRole.DIETITIAN]: [
    Specialty.DIETETICS,
  ],
  [MedicalRole.DENTIST]: [
    Specialty.DENTISTRY,
  ],
  [MedicalRole.TECHNICIAN]: [
    Specialty.RADIOLOGY,
    Specialty.ANESTHESIOLOGY,
    Specialty.EMERGENCY,
  ],
  [MedicalRole.STUDENT]: [],
};

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

// ── Özellik 2: Neden Eşleştik — Açıklama Sistemi ────────────────────────────
export type MatchFactorKey =
  | 'dating_intention' | 'profession' | 'work_schedule' | 'location'
  | 'values' | 'lifestyle' | 'interests' | 'dealbreaker'
  | 'specialty' | 'career_stage' | 'institution_type';

export type MatchFactorCategory = 'primary' | 'secondary' | 'healthcare_specific';

export interface MatchExplanationItem {
  id: string;
  factorKey: MatchFactorKey;
  category: MatchFactorCategory;
  text: string;
  icon: string;
  iconColor: string;
  priority: number;
  adjustable: boolean;
  adjustPath: string;
  details?: string[];
}

export interface UserFactorWeightRow {
  factorKey: MatchFactorKey;
  multiplier: number;
  disabled: boolean;
}

export type FirstMessagePreference = 'ANYONE' | 'ME_FIRST' | 'THEM_FIRST';
export type PremiumTier = 'FREE' | 'DOSE' | 'FORTE' | 'ULTRA';

export type SwipeAction = 'LIKE' | 'PASS' | 'SUPER_LIKE';

export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

export type VerificationPolicy = 'CORPORATE_ONLY' | 'HYBRID' | 'AUTO_APPROVE';

export type UserRole = 'viewer' | 'moderator' | 'admin' | 'superadmin';

export type VerificationMethod = 'CORPORATE_EMAIL' | 'DOCUMENTS' | 'THIRD_PARTY';

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'AUTO_VERIFIED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'NEED_MORE_INFO'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED'
  // Legacy compatibility during rollout
  | 'PENDING_VERIFICATION'
  | 'EMAIL_VERIFICATION_SENT';

export type UserStatus =
  | 'pending_invite'
  | 'pending_verification'
  | 'verification_rejected'
  | 'profile_incomplete'
  | 'active'
  | 'suspended'
  | 'banned';

// Tier 1 — Registration (Required)
export type GenderPreference = 'MALE' | 'FEMALE' | 'EVERYONE';

// Tier 2 — Registration (Optional)
export type LookingFor = 'SERIOUS' | 'FRIENDSHIP' | 'OPEN';
export type SubstanceUsage = 'YES' | 'NO' | 'SOCIAL';

// Tier 3 — Profile Completion (Post-onboarding)
export type WorkStyle = 'FULL_TIME' | 'PART_TIME' | 'FREELANCE' | 'ACADEMIC';
export type ShiftFrequency = 'NONE' | 'WEEKLY_1_2' | 'WEEKLY_3_4' | 'DAILY';
export type LivingStatus = 'ALONE' | 'FAMILY' | 'ROOMMATE';
export type SalaryRange = 'RANGE_1' | 'RANGE_2' | 'RANGE_3' | 'RANGE_4' | 'PREFER_NOT';

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

export type VerificationDecision = 'approve' | 'reject' | 'need_more_info';

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
  verificationStatus?: VerificationStatus;
  userStatus?: UserStatus;
  verificationMethod?: VerificationMethod;
  riskFlags?: Record<string, unknown>;
  suspendedUntil?: number | null;
  premiumTier?: PremiumTier;
  // Tier 1 — Registration (Required)
  genderPreference: GenderPreference;
  university: string;
  city: string;
  current_lat?: number;
  current_lng?: number;
  // Tier 2 — Registration (Optional)
  graduationYear?: number;
  experienceYears?: number;
  lookingFor?: LookingFor;
  smoking?: SubstanceUsage;
  drinking?: SubstanceUsage;
  // Tier 3 — Profile Completion (Post-onboarding)
  workStyle?: WorkStyle;
  shiftFrequency?: ShiftFrequency;
  livingStatus?: LivingStatus;
  salaryRange?: SalaryRange;
  abroadExperience?: boolean;
  // On-call & Quick Reply
  isOnCall?: boolean;
  onCallEndsAt?: number;
  quickReplyBadge?: boolean;
  userRole?: UserRole;
}

export interface VerificationDocumentRecord {
  id: string;
  requestId: string;
  storagePath: string;
  docType: string;
  mime: string;
  size: number;
  sha256?: string | null;
  createdAt: string;
}

export interface VerificationRequestRecord {
  id: string;
  userId: string;
  requestId?: string;
  method?: VerificationMethod;
  emailType: 'corporate' | 'personal';
  status:
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'NEED_MORE_INFO'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';
  submittedAt: string;
  claimedBy?: string | null;
  claimedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  decision?: string | null;
  reasonCode?: string | null;
  notes?: string | null;
  riskFlags?: Record<string, unknown> | null;
}

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
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
  isFirstMessagePending?: boolean; // Is it waiting for the first move?
  allowedSenderId?: string | null; // 'me', 'them', or null (anyone)
  expiresAt?: number; // Timestamp when match expires if no message sent
  extended?: boolean; // Whether the timer was already extended
  isActive?: boolean; // false = expired or unmatched
  expiredReason?: 'timeout' | 'unmatched'; // Why the match ended
  firstMessageSentAt?: number; // Timestamp of first message for quick reply badge
  messages?: Message[]; // Chat history
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

// ── Faz 4 Moat Feature Types ─────────────────────────────────────────────────

// Feature 6: Clubs
export type ClubCategory = 'running' | 'cycling' | 'yoga' | 'nutrition' | 'research' | 'social';

export interface Club {
  id: string;
  name: string;
  description: string | null;
  category: ClubCategory;
  creator_id: string;
  max_members: number;
  member_count?: number;
  is_member?: boolean;
  city: string | null;
  cover_image: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ClubMember {
  club_id: string;
  user_id: string;
  role: 'creator' | 'admin' | 'member';
  joined_at: string;
  full_name?: string;
  avatar_url?: string;
}

// Feature 7: Peer Vouch
export type VouchRelationship = 'colleague' | 'coworker' | 'classmate' | 'mentor' | 'other';

export interface PeerVouch {
  id: string;
  voucher_id: string;
  vouchee_id: string;
  relationship: VouchRelationship;
  message: string;
  status: 'pending' | 'confirmed' | 'revoked';
  voucher_name?: string;
  created_at: string;
}

// Feature 8: Date Check-in
export interface DateCheckin {
  id: string;
  plan_id: string;
  user_id: string;
  type: 'checkin' | 'checkout';
  created_at: string;
}

// Feature 10: Conference Mode
export interface Conference {
  id: string;
  name: string;
  city: string;
  venue: string | null;
  start_date: string;
  end_date: string;
  specialty_tags: string[];
  max_pool_size: number;
  is_active: boolean;
  created_at: string;
}

export interface ConferenceAttendee {
  conference_id: string;
  user_id: string;
  opted_in_to_pool: boolean;
  verified_attendee: boolean;
  registered_at: string;
  full_name?: string;
  avatar_url?: string;
}

// Feature 11: Voice Intro
export interface VoiceIntro {
  id: string;
  user_id: string;
  storage_path: string;
  duration_seconds: number;
  public_url?: string;
  created_at: string;
  updated_at: string;
}

// Feature 13: Plan Pledge
export interface PlanPledge {
  id: string;
  plan_id: string;
  user_id: string;
  amount_tl: number;
  status: 'held' | 'released' | 'forfeited';
  created_at: string;
  updated_at: string;
}

// Feature 3: Partner Venue + QR Check-in
export interface PartnerVenue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  qr_token: string;
  is_active: boolean;
}

export interface VenueCheckin {
  id: string;
  venue_id: string;
  user_id: string;
  plan_id: string | null;
  qr_token: string;
  checked_in_at: string;
}

// Feature 4: Elite Pool
export interface ElitePoolStatus {
  isMember: boolean;
  isEligible: boolean;
  joinedAt: string | null;
}

export interface ElitePoolMember {
  user_id: string;
  joined_at: string;
  is_active: boolean;
  full_name?: string;
  avatar_url?: string;
}

// ── Özellik 3: Sınırlı Günlük Öneri Sistemi ──────────────────────────────────

/** Which slot in the daily slate a profile occupies */
export type SlateCategory =
  | 'high_compatibility'  // date_prob ≥ 0.7 – guaranteed high fit
  | 'exploration'         // date_prob ≥ 0.4 – controlled filter-bubble break
  | 'serendipity'         // date_prob ≥ 0.3, trust ≥ 0.9 – surprise pick
  | 'fresh_verified';     // joined ≤ 7 days ago – cold-start corridor

export type SlateProfileStatus = 'unseen' | 'seen' | 'liked' | 'passed';
export type SlateViewMode = 'card' | 'grid';

/** One profile entry inside the daily slate */
export interface SlateProfile {
  /** daily_picks row id */
  id: string;
  /** Target user's profile id */
  userId: string;
  category: SlateCategory;
  /** 1-indexed position within the slate */
  position: number;
  status: SlateProfileStatus;
  /** Probability these two will actually go on a date (0–1) */
  dateScore: number;
  /** Probability target replies to first message (0–1) */
  responseScore: number;
  /** Trust score from verification badges (0–1) */
  trustScore: number;
  /** Recency / new-user freshness (0–1) */
  freshnessScore: number;
  /** Combined final ranking score */
  finalScore: number;
  /** Carried over from yesterday's unseen queue */
  carriedOver: boolean;
  /** Extra pick awarded after completing today's slate */
  isBonus: boolean;
  /** Whether target works at the same hospital as the viewer */
  sameHospitalWarning: boolean;
  /** Enriched profile data (populated after DB fetch) */
  profile?: Profile;
}

/** The complete daily slate for a user */
export interface DailySlate {
  /** user_daily_slates row id (null = not yet persisted) */
  slateId: string | null;
  date: string;
  /** Max profiles shown today (0-7 depending on pending matches) */
  slateSize: number;
  profiles: SlateProfile[];
  totalCount: number;
  seenCount: number;
  likedCount: number;
  passedCount: number;
  /** Unseen profiles remaining */
  remainingCount: number;
  /** Profiles moved from yesterday */
  carriedOverCount: number;
  /** Active matches awaiting a reply */
  pendingMatchCount: number;
  /** true when pending count restricts slate size below 7 */
  isRestricted: boolean;
  /** true when the user already used today's +2 bonus */
  bonusUsed: boolean;
  /** ISO timestamp of next 06:00 refresh */
  nextRefreshAt: string;
}

/** Snapshot of session-level stats for the "done" screen */
export interface SlateSessionStats {
  likesSent: number;
  passesDone: number;
  matchesGained: number;
}

/** Pending-match threshold → slate size mapping */
export interface PendingLimitRule {
  minPending: number;
  maxPending: number;
  slateSize: number;
  severity: 'none' | 'info' | 'warning' | 'blocked';
}

// ── Özellik 4: Date Odaklı Akış Sistemi ───────────────────────────────────────

/** Extended plan types including healthcare-specific meetup contexts */
export type ExtendedPlanType =
  | 'coffee'
  | 'dinner'
  | 'walk'
  | 'custom'
  | 'nobet_sonrasi_kahve'  // Post-night-shift morning coffee
  | 'mola_arasi'           // Quick break-time meetup (15–20 min)
  | 'gece_nobeti_oncesi';  // Pre-night-shift dinner

/** Status of a date invitation in the 48h funnel */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

/** A formal date invitation with 48h expiry timer */
export interface DateInvitation {
  id: string;
  match_id: string;
  inviter_id: string;
  invitee_id: string;
  preferred_type: ExtendedPlanType;
  /** Array of ISO timestamp strings the inviter is available */
  preferred_times: string[];
  message: string | null;
  status: InvitationStatus;
  declined_reason: string | null;
  expires_at: string;      // ISO string — drives countdown timer
  accepted_at: string | null;
  plan_id: string | null;  // Set once accepted → date plan created
  created_at: string;
  updated_at: string;
}

/** A single availability slot a user offers in their calendar */
export interface UserAvailabilitySlot {
  id: string;
  user_id: string;
  slot_start: string;      // ISO string
  slot_end: string;        // ISO string
  label: string | null;    // e.g. "Nöbet Sonrası"
  is_recurring: boolean;
  recur_days: number[] | null;
  expires_at: string | null;
  created_at: string;
}

/** A venue option for a date (café, park, restaurant, etc.) */
export interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string;
  district: string | null;
  lat: number | null;
  lng: number | null;
  category: 'cafe' | 'restaurant' | 'park' | 'bar' | 'activity' | 'other';
  tags: string[];
  safety_score: number;    // 0.0–1.0
  is_partner: boolean;
  partner_discount: string | null;
  is_active: boolean;
}

/** A trusted emergency contact for safety features */
export interface TrustedContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relation: string;        // 'friend' | 'family' | 'colleague'
  is_primary: boolean;
  notify_on_date: boolean;
  created_at: string;
  updated_at: string;
}

/** A safety alert record (SOS or overdue check-in) */
export interface SafetyAlert {
  id: string;
  user_id: string;
  plan_id: string | null;
  alert_type: 'sos' | 'checkin_overdue' | 'no_checkout' | 'manual_share';
  status: 'active' | 'resolved' | 'false_alarm';
  location_lat: number | null;
  location_lng: number | null;
  message: string | null;
  notified_contacts: Array<{ name: string; phone: string; notified_at: string }>;
  resolved_at: string | null;
  created_at: string;
}

/** Post-date feedback from one participant about the other */
export interface DateFeedback {
  id: string;
  plan_id: string;
  reviewer_id: string;
  about_user_id: string;
  did_meet: boolean;
  how_was_it: 'great' | 'good' | 'okay' | 'bad' | 'no_show' | null;
  see_again: boolean | null;
  felt_safe: boolean | null;
  would_recommend: boolean | null;
  tags: string[];
  free_text: string | null;
  is_anonymous: boolean;
  created_at: string;
}

/** Payload for submitting post-date feedback */
export interface DateFeedbackPayload {
  planId: string;
  aboutUserId: string;
  didMeet: boolean;
  howWasIt?: DateFeedback['how_was_it'];
  seeAgain?: boolean;
  feltSafe?: boolean;
  wouldRecommend?: boolean;
  tags?: string[];
  freeText?: string;
}

/** Readiness state for date flow in MatchOverlay / invitation context */
export type DateReadiness = 'open' | 'cautious' | 'not_ready';

/** Date type metadata for UI display */
export interface DateTypeOption {
  type: ExtendedPlanType;
  label: string;
  description: string;
  icon: string;
  duration: string;
  isHealthcareSpecific: boolean;
  color: string;             // Tailwind color class
}

// ── Özellik 5: Güvenlik Varsayılan Açık Sistemi ───────────────────────────────

/** Location privacy levels — approximate is the default */
export type LocationPrivacyLevel = 'approximate' | 'city_only' | 'hidden';

/** Distance band displayed to the user (never exact distance) */
export type DistanceBand =
  | 'nearby'       // < 1 km
  | '1_3'          // 1–3 km
  | '3_5'          // 3–5 km
  | '5_10'         // 5–10 km
  | '10_20'        // 10–20 km
  | 'far';         // 20+ km

/** All per-user security settings (all default ON in DB) */
export interface UserSecuritySettings {
  user_id: string;
  // Location
  location_privacy_level: LocationPrivacyLevel;
  // Content moderation
  harassment_filter: boolean;
  threat_filter: boolean;
  scam_filter: boolean;
  spam_filter: boolean;
  review_before_send: boolean;
  // Visual safety
  explicit_image_blur: boolean;
  screenshot_notify: boolean;
  // Chat safety
  link_safety_check: boolean;
  personal_info_warning: boolean;
  financial_warning: boolean;
  external_app_warning: boolean;
  // Discovery
  show_risk_warnings: boolean;
  // Healthcare-specific
  hide_same_institution: boolean;
  hide_profession_detail: boolean;
  patient_privacy_reminder: boolean;
  updated_at: string;
}

/** Toxicity / moderation category for a message */
export type ModerationCategory =
  | 'harassment'
  | 'threat'
  | 'sexual_coercion'
  | 'scam'
  | 'spam'
  | 'personal_info'
  | 'financial'
  | 'external_link'
  | 'safe';

/** Action taken on a moderated message */
export type ModerationAction =
  | 'allow'
  | 'soft_warn'
  | 'warn_sender'
  | 'block_with_override'
  | 'block_and_escalate';

/** Result of running the moderation engine on a message */
export interface ModerationResult {
  score: number;               // 0.0–1.0
  category: ModerationCategory;
  action: ModerationAction;
  reasons: string[];           // Human-readable reason strings for UI
}

/** Risk level of a profile */
export type ProfileRiskLevel = 'safe' | 'normal' | 'caution' | 'high' | 'critical';

/** Profile risk score record */
export interface ProfileRiskScore {
  user_id: string;
  risk_score: number;           // 0–100
  risk_level: ProfileRiskLevel;
  risk_reasons: string[];       // Transparent reason strings shown to user
  calculated_at: string;
  is_discovery_hidden: boolean;
}

/** Image safety category */
export type ImageSafetyCategory = 'safe' | 'suggestive' | 'explicit' | 'violent';

/** Result of image safety check */
export interface ImageSafetyResult {
  category: ImageSafetyCategory;
  score: number;                // 0.0–1.0
  shouldBlur: boolean;
}

/** Obfuscated location data shown to other users */
export interface DisplayLocation {
  display_latitude: number;
  display_longitude: number;
  display_radius_m: number;
  city: string | null;
  district: string | null;
  privacy_level: LocationPrivacyLevel;
}

// ── Özellik 6: Etik Monetizasyon Sistemi ──────────────────────────────────────

/**
 * Ethical plan IDs.
 * Legacy plans (DOSE/FORTE/ULTRA) still exist in DB but map to PREMIUM_FULL capabilities.
 */
export type EthicalPlanId =
  | 'FREE'
  | 'CONVENIENCE'
  | 'PRIVACY'
  | 'PREMIUM_FULL'
  | 'PREMIUM_COACHING'
  | 'TRIP_ADDON'
  | 'FILTERS_ADDON'
  | 'INCOGNITO_ADDON'
  | 'COACHING_ONCE'
  | 'CONCIERGE_ONCE';

/** What the user can do (capability flags resolved from active subscriptions) */
export interface UserCapabilities {
  canUseTripMode: boolean;
  canUseAdvancedFilters: boolean;
  canUseIncognito: boolean;
  canHideActivity: boolean;
  canControlReadReceipts: boolean;
  canGetCoaching: boolean;
  canUseConcierge: boolean;
  canAccessPrioritySupport: boolean;
}

/** Metadata for a single ethical plan option */
export interface EthicalPlanConfig {
  id: EthicalPlanId;
  name: string;
  description: string;
  priceMonthly: number;   // TL
  isOneTime: boolean;
  capabilities: Partial<UserCapabilities>;
  isPopular?: boolean;
}

/** An active trip mode session */
export interface TripModeSession {
  id: string;
  user_id: string;
  destination_city: string;
  destination_lat: number | null;
  destination_lng: number | null;
  start_date: string;   // ISO date
  end_date: string;
  status: 'planned' | 'active' | 'ended' | 'cancelled';
  created_at: string;
}

/** Advanced filter payload (premium filter state) */
export interface AdvancedFilterPayload {
  // Lifestyle
  smoking?: 'yes' | 'no' | 'sometimes' | null;
  alcohol?: 'yes' | 'no' | 'sometimes' | null;
  sport?: 'active' | 'moderate' | 'none' | null;
  diet?: 'vegan' | 'vegetarian' | 'omnivore' | null;
  pets?: boolean | null;
  // Advanced preferences
  height_min?: number | null;
  height_max?: number | null;
  wants_children?: 'yes' | 'no' | 'open' | null;
  // Career
  profession_filter?: string[];
  specialty_filter?: string[];
  career_stage?: 'resident' | 'specialist' | 'professor' | null;
  institution_type?: 'public' | 'private' | 'university' | null;
  // Activity
  last_active?: 'today' | 'this_week' | 'this_month' | null;
  profile_completeness?: number | null;
  verified_only?: boolean;
}

/** A saved filter set (named preset) */
export interface SavedFilterSet {
  id: string;
  user_id: string;
  name: string;
  filters: AdvancedFilterPayload;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Profile coaching request and its report */
export interface ProfileCoachingRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'in_review' | 'completed' | 'refunded';
  photo_feedback: string | null;
  bio_feedback: string | null;
  preferences_feedback: string | null;
  improved_bio: string | null;
  overall_score: number | null;   // 0–10
  coach_notes: string | null;
  sla_deadline: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Date concierge service request */
export interface DateConciergeRequest {
  id: string;
  user_id: string;
  match_id: string | null;
  preferred_date: string;   // ISO date
  time_range: string;   // e.g. "18:00-22:00"
  date_type: string;
  budget: 'under_200' | '200_500' | 'over_500';
  special_requests: string | null;
  status: 'pending' | 'planning' | 'ready' | 'accepted' | 'completed' | 'cancelled';
  plan_details: Record<string, unknown> | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

/** Paywall context — describes what feature triggered the paywall */
export interface PaywallContext {
  featureId: keyof UserCapabilities;
  featureName: string;
  description: string;
  /** Which plans unlock this feature */
  suggestedPlans: EthicalPlanId[];
  /** true = user can still dismiss and use a free fallback */
  isSoftWall: boolean;
}

/** Monetization feedback from user */
export interface MonetizationFeedback {
  is_fair: 'yes' | 'somewhat' | 'no';
  unfair_feature: string | null;
  free_text: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 7: Şeffaf Moderasyon — Types
// DSA Article 17 (açık gerekçe + itiraz yolu)
// DSA Article 20 (ücretsiz elektronik şikayet sistemi)
// ─────────────────────────────────────────────────────────────────────────────

export type ModerationReasonCategory =
  | 'harassment'
  | 'scam'
  | 'identity'
  | 'content'
  | 'zero_tolerance'
  | 'system';

export type ModerationReasonCode =
  // Taciz
  | 'HAR-01' | 'HAR-02' | 'HAR-03' | 'HAR-04'
  // Dolandırıcılık
  | 'SCM-01' | 'SCM-02' | 'SCM-03'
  // Kimlik
  | 'IMP-01' | 'IMP-02'
  // İçerik
  | 'CON-01' | 'CON-02' | 'CON-03'
  // Sıfır tolerans
  | 'SPL-01' | 'SPL-02' | 'SPL-03'
  // Sistem
  | 'SYS-01' | 'SYS-02' | 'SYS-03';

export interface ModerationReasonCodeInfo {
  code: ModerationReasonCode;
  category: ModerationReasonCategory;
  title_tr: string;
  description_tr: string;
  user_guidance: string;
  typical_action: string;
  is_zero_tolerance: boolean;
  dsa_article?: string;
}

export type ModerationNotificationType =
  | 'action_taken'
  | 'restriction_lifted'
  | 'appeal_received'
  | 'appeal_decided'
  | 'warning_issued';

export type ModerationActionType =
  | 'warning'
  | 'temp_ban'
  | 'perm_ban'
  | 'messaging_disabled'
  | 'matching_disabled'
  | 'shadow_limit'
  | 'badge_revoked'
  | 'restriction_lifted';

export interface ModerationNotification {
  id: string;
  user_id: string;
  notification_type: ModerationNotificationType;
  action_type: ModerationActionType;
  reason_code: ModerationReasonCode | null;
  title_tr: string;
  body_tr: string;
  evidence_summary: string | null;
  is_automated: boolean;
  related_action_id: string | null;
  related_appeal_id: string | null;
  action_taken_at: string;
  expires_at: string | null;
  appeal_deadline: string | null;
  read_at: string | null;
  created_at: string;
}

export type AppealStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'denied'
  | 'escalated';

export interface UserAppeal {
  id: string;
  user_id: string;
  notification_id: string | null;
  appeal_type: string;
  user_statement: string;
  evidence_paths: string[];
  status: AppealStatus;
  priority: string;
  submitted_at: string;
  sla_deadline: string | null;
  reviewed_at: string | null;
  decided_at: string | null;
  decision: string | null;
  decision_reason: string | null;
  reviewer_notes: string | null;
  dsa_compliant: boolean;
}

export interface AppealSubmitPayload {
  notification_id: string;
  appeal_type: 'ban_appeal' | 'restriction_appeal' | 'report_dispute' | 'badge_revocation';
  user_statement: string; // min 100 chars (DSA Article 20)
  evidence_paths?: string[];
}

export interface UserReportStatus {
  id: string;
  report_type: string;
  reported_user_display: string; // "Kullanıcı #XY" — no PII
  status: string;
  severity: string | null;
  created_at: string;
  resolved_at: string | null;
  resolution_summary: string | null; // Genel bilgi, PII yok
}

export interface TransparencyStats {
  period: string;                          // e.g. '2026-Q1'
  total_notifications: number;
  bans_issued: number;
  warnings_issued: number;
  automated_pct: number;
  appeals_submitted: number;
  appeal_approval_pct: number | null;
  avg_appeal_hours: number | null;
  avg_fairness_score: number | null;
}

export interface ModerationDecisionRating {
  notification_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

/** Appeal queue item used in admin panel */
export interface AppealQueueItem {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  appeal_type: string;
  status: AppealStatus;
  priority: string;
  submitted_at: string;
  sla_deadline: string | null;
  is_sla_breached: boolean;
  user_statement_preview: string;
  notification_action_type: ModerationActionType | null;
  reason_code: ModerationReasonCode | null;
}

/** A link safety classification */
export type LinkSafetyStatus = 'safe' | 'suspicious' | 'dangerous' | 'unknown';

/** Result of link safety check */
export interface LinkSafetyResult {
  url: string;
  status: LinkSafetyStatus;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 8: Privacy-First AI
// GDPR Article 22 & 25, EU AI Act, DSA Article 27 compliance
// ─────────────────────────────────────────────────────────────────────────────

/** All AI/ML feature identifiers — mirrors ai_model_registry.feature_key */
export type AIFeatureKey =
  | 'content_moderation'      // Security AI — cannot be disabled
  | 'slate_recommendation'    // Daily 7 profile ranking
  | 'explanation_engine'      // "Why we matched" chips
  | 'liveness_check'          // Biometric liveness (GDPR Art.9)
  | 'name_email_match'        // Institutional email match
  | 'risk_scoring'            // Account trust score
  | 'compatibility_scoring';  // Profile card % (UI only)

/** Model type enum */
export type AIModelType = 'rule_based' | 'statistical' | 'neural';

/** Output type enum */
export type AIOutputType = 'classification' | 'ranking' | 'score' | 'flag';

/** Registered AI model card (from ai_model_registry) */
export interface ModelCard {
  model_id: string;
  feature_key: AIFeatureKey;
  display_name_tr: string;
  description_tr: string;
  model_type: AIModelType;
  input_fields: string[];
  output_type: AIOutputType;
  is_security: boolean;             // Cannot be disabled if true
  gdpr_article_22: boolean;         // Automated decision-making?
  human_review_required_for: string | null;
  data_retention_days: number;
  last_bias_audit: string | null;
  version: string;
  created_at: string;
}

/** User's consent state per feature */
export interface AIConsentRecord {
  id: string;
  user_id: string;
  feature_key: AIFeatureKey;
  consented: boolean;
  consented_at: string;
  revoked_at: string | null;
  consent_version: string;
}

/** Aggregate consent map (feature_key → consented) */
export type AIConsentMap = Partial<Record<AIFeatureKey, boolean>>;

/** AI usage log entry (user's own record) */
export interface AIUsageLogEntry {
  id: string;
  feature_key: AIFeatureKey;
  model_id: string;
  output_summary: string;    // Human-readable, no raw PII
  confidence: number | null; // 0.000 – 1.000
  action_taken: string;      // 'allow' | 'warn' | 'block' | 'flag' | 'rank'
  human_override: boolean;
  consent_given: boolean;
  created_at: string;
  expires_at: string | null;
}

/** Payload for updating consent for one feature */
export interface AIConsentUpdatePayload {
  feature_key: AIFeatureKey;
  consented: boolean;
}

/** Bias audit summary for admin */
export interface AIBiasAuditRow {
  feature_key: AIFeatureKey;
  month: string;
  total_uses: number;
  blocks: number;
  warns: number;
  human_overrides: number;
  uses_without_consent: number;
  avg_confidence: number | null;
}

/** Explanation tooltip data for slate recommendation */
export interface SlateExplanationData {
  feature_key: 'slate_recommendation';
  factors: SlateExplanationFactor[];
  model_version: string;
  generated_at: string;
}

export interface SlateExplanationFactor {
  label_tr: string;
  weight: number;   // 0.0 – 1.0, relative contribution
  value_tr: string; // Human-readable value
}

/** Message moderation explanation data */
export interface MessageModerationExplanationData {
  feature_key: 'content_moderation';
  action_taken: 'allow' | 'warn' | 'block' | 'flag';
  reason_code: string | null;
  reason_tr: string;
  confidence: number | null;
  is_automated: boolean;
  human_review_available: boolean;
}
