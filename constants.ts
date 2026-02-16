import { Profile, Specialty, MedicalRole, Notification, NotificationType, SwipeHistoryItem, MessageTemplate, ChatTheme, ProfileVisitor } from './types';

// Helper to get time ago
const minutesAgo = (min: number): number => Date.now() - min * 60 * 1000;
const hoursAgo = (hours: number): number => Date.now() - hours * 60 * 60 * 1000;
const daysAgo = (days: number): number => Date.now() - days * 24 * 60 * 60 * 1000;

// Helper to set future time
const hoursFromNow = (hours: number): number => Date.now() + hours * 60 * 60 * 1000;

const IS_DEV = import.meta.env.DEV;

export const DAILY_SWIPE_LIMIT = 50;

export const AVAILABLE_INTERESTS = [
  'Sports', 'Yoga', 'Running', 'Fitness',
  'Travel', 'Camping', 'Nature',
  'Books', 'Cinema', 'Music',
  'Cooking', 'Coffee', 'Gastronomy',
  'Art', 'Photography', 'Painting',
  'Pets (Cat/Dog)', 'Volunteering',
  'Tennis', 'Sailing', 'Chess', 'Wine',
  'Meditation', 'History', 'Technology'
];

export const PERSONALITY_OPTIONS = [
  // Social
  { id: 'soc_1', label: 'Social Butterfly', emoji: '🎉', category: 'Social' },
  { id: 'soc_2', label: 'Introvert', emoji: '🏠', category: 'Social' },
  { id: 'soc_3', label: 'Balanced', emoji: '⚖️', category: 'Social' },
  // Lifestyle
  { id: 'life_1', label: 'Early Bird', emoji: '🌅', category: 'Lifestyle' },
  { id: 'life_2', label: 'Night Owl', emoji: '🌙', category: 'Lifestyle' },
  { id: 'life_3', label: 'Coffee Addict', emoji: '☕', category: 'Lifestyle' },
  { id: 'life_4', label: 'Athlete', emoji: '🏃', category: 'Lifestyle' },
  { id: 'life_5', label: 'Bookworm', emoji: '📚', category: 'Lifestyle' },
  // Relationship
  { id: 'rel_1', label: 'Serious Relationship', emoji: '💕', category: 'Relationship' },
  { id: 'rel_2', label: 'Friendship First', emoji: '🤝', category: 'Relationship' },
  { id: 'rel_3', label: 'Open to Anything', emoji: '🎯', category: 'Relationship' },
  // Humor
  { id: 'hum_1', label: 'Funny', emoji: '😂', category: 'Humor' },
  { id: 'hum_2', label: 'Intellectual', emoji: '🤓', category: 'Humor' },
  { id: 'hum_3', label: 'Ironic', emoji: '😏', category: 'Humor' },
];

export const PREDEFINED_QUESTIONS = [
  "En sevdiğim kahve çeşidi...",
  "Hafta sonu idealim...",
  "Beni güldüren şey...",
  "Nöbet sonrası ilk yaptığım şey...",
  "Sağlık sektöründe en sevdiğim an...",
  "Hayalindeki tatil...",
  "Stresten kurtulmak için...",
  "En çok gurur duyduğum başarım...",
  "Pazar kahvaltısı olmazsa olmazım...",
  "Gizli yeteneğim...",
  "Asla hayır diyemeyeceğim tatlı...",
  "Favori nöbet atıştırmalığım..."
];

export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  { id: 't1', text: "Nöbetteyim, sonra yazarım 😊", isCustom: false },
  { id: 't2', text: "Ameliyattayım, akşam konuşalım 😷", isCustom: false },
  { id: 't3', text: "Mola verdim, nasılsın? ☕", isCustom: false },
  { id: 't4', text: "Bugün çok yoğunum, yarın müsait misin?", isCustom: false },
  { id: 't5', text: "Acil konsültasyon çıktı, dönüyorum hemen.", isCustom: false },
];

// CHAT THEMES
export const CHAT_THEME_PRESETS: { [key: string]: ChatTheme } = {
  'DEFAULT': {
    id: 'DEFAULT',
    name: 'Vitalis Gold',
    primaryColor: 'bg-gold-500',
    secondaryColor: 'bg-slate-800',
    textColor: 'text-white',
    backgroundColorClass: 'bg-slate-950',
    isDark: true
  },
  'CLASSIC': {
    id: 'CLASSIC',
    name: 'Classic Blue',
    primaryColor: 'bg-blue-600',
    secondaryColor: 'bg-slate-700',
    textColor: 'text-white',
    backgroundColorClass: 'bg-slate-900',
    isDark: true
  },
  'NATURE': {
    id: 'NATURE',
    name: 'Nature',
    primaryColor: 'bg-emerald-600',
    secondaryColor: 'bg-stone-800',
    textColor: 'text-white',
    backgroundColorClass: 'bg-stone-950',
    isDark: true
  },
  'ROMANTIC': {
    id: 'ROMANTIC',
    name: 'Romantic',
    primaryColor: 'bg-rose-500',
    secondaryColor: 'bg-slate-800',
    textColor: 'text-white',
    backgroundColorClass: 'bg-rose-950',
    isDark: true
  },
  'DARK': {
    id: 'DARK',
    name: 'Midnight',
    primaryColor: 'bg-slate-700',
    secondaryColor: 'bg-black',
    textColor: 'text-slate-200',
    backgroundColorClass: 'bg-black',
    isDark: true
  },
  'MINIMAL': {
    id: 'MINIMAL',
    name: 'Minimal',
    primaryColor: 'bg-slate-200',
    secondaryColor: 'bg-white',
    textColor: 'text-slate-900', // Dark text for light bubbles
    backgroundColorClass: 'bg-slate-100',
    isDark: false
  }
};

export const BACKGROUND_OPTIONS = [
  { id: 'solid', name: 'Solid Color', isPremium: false, type: 'COLOR' },
  { id: 'gradient', name: 'Gradient', isPremium: true, type: 'GRADIENT', css: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900' },
  { id: 'pattern_dots', name: 'Dots Pattern', isPremium: true, type: 'PATTERN', url: 'https://www.transparenttextures.com/patterns/stardust.png' },
  { id: 'pattern_lines', name: 'Lines Pattern', isPremium: true, type: 'PATTERN', url: 'https://www.transparenttextures.com/patterns/diagonal-stripes.png' },
  { id: 'custom', name: 'Custom Photo', isPremium: true, type: 'IMAGE' }
];

const PROD_STUB_IMAGE_URLS = [
  'https://picsum.photos/seed/vitalis-stub-1/800/1200',
  'https://picsum.photos/seed/vitalis-stub-2/800/1200',
  'https://picsum.photos/seed/vitalis-stub-3/800/1200',
  'https://picsum.photos/seed/vitalis-stub-4/800/1200',
  'https://picsum.photos/seed/vitalis-stub-5/800/1200',
  'https://picsum.photos/seed/vitalis-stub-6/800/1200',
];

const createStubProfile = (overrides: Partial<Profile>): Profile => {
  const base: Profile = {
    id: 'stub',
    name: 'Demo Profile',
    age: 30,
    role: MedicalRole.DOCTOR,
    specialty: Specialty.CARDIOLOGY,
    subSpecialty: 'General',
    hospital: 'Vitalis',
    institutionHidden: true,
    bio: 'This is a demo profile.',
    education: 'Medical School',
    images: [PROD_STUB_IMAGE_URLS[0]],
    verified: false,
    verificationBadges: { photo: false, phone: false, email: false, license: false },
    interests: [],
    personalityTags: [],
    hasLikedUser: false,
    distance: 10,
    location: 'Nearby',
    isLocationHidden: true,
    lastActive: Date.now(),
    isOnlineHidden: false,
    isAvailable: false,
    readReceiptsEnabled: true,
    stories: [],
    storyPrivacy: 'ALL_MATCHES',
    genderPreference: 'EVERYONE',
    university: '',
    city: '',
  };

  return { ...base, ...overrides };
};

const PROD_STUB_PROFILES: Profile[] = [
  createStubProfile({
    id: 'stub_1',
    name: 'Demo Doctor',
    role: MedicalRole.DOCTOR,
    specialty: Specialty.CARDIOLOGY,
    subSpecialty: 'Interventional',
    images: [PROD_STUB_IMAGE_URLS[0]],
    verified: false,
  }),
  createStubProfile({
    id: 'stub_2',
    name: 'Demo Nurse',
    role: MedicalRole.NURSE,
    specialty: Specialty.EMERGENCY,
    subSpecialty: 'Trauma',
    images: [PROD_STUB_IMAGE_URLS[1]],
    verified: false,
  }),
  createStubProfile({
    id: 'stub_3',
    name: 'Demo Physio',
    role: MedicalRole.PHYSIOTHERAPIST,
    specialty: Specialty.PHYSIOTHERAPY,
    subSpecialty: 'Sports',
    images: [PROD_STUB_IMAGE_URLS[2]],
    verified: false,
  }),
  createStubProfile({
    id: 'stub_4',
    name: 'Demo Dentist',
    role: MedicalRole.DENTIST,
    specialty: Specialty.DENTISTRY,
    subSpecialty: 'Cosmetic',
    images: [PROD_STUB_IMAGE_URLS[3]],
    verified: false,
  }),
  createStubProfile({
    id: 'stub_5',
    name: 'Demo Pharmacist',
    role: MedicalRole.PHARMACIST,
    specialty: Specialty.PHARMACY,
    subSpecialty: 'Clinical',
    images: [PROD_STUB_IMAGE_URLS[4]],
    verified: false,
  }),
  createStubProfile({
    id: 'stub_6',
    name: 'Demo Surgeon',
    role: MedicalRole.DOCTOR,
    specialty: Specialty.SURGERY,
    subSpecialty: 'General Surgery',
    images: [PROD_STUB_IMAGE_URLS[5]],
    verified: false,
  }),
];

const PROD_USER_PROFILE: Profile = createStubProfile({
  id: 'me',
  name: 'User',
  age: 30,
  role: MedicalRole.DOCTOR,
  specialty: Specialty.CARDIOLOGY,
  subSpecialty: 'General',
  hospital: 'My Hospital',
  institutionHidden: false,
  isLocationHidden: false,
  distance: 0,
  verified: false,
});

export const MOCK_PROFILES: Profile[] = IS_DEV ? [
  {
    id: '1',
    name: 'Dr. Sarah',
    age: 29,
    role: MedicalRole.DOCTOR,
    specialty: Specialty.NEUROLOGY,
    subSpecialty: 'Pediatric Neurology',
    hospital: 'City Research Institute',
    institutionHidden: false,
    bio: 'Brain surgeon in training. I love complex puzzles, fine wine, and people who can hold a conversation.',
    education: 'Harvard Medical School',
    genderPreference: 'MALE',
    university: 'Harvard University',
    city: 'Istanbul',
    graduationYear: 2020,
    experienceYears: 5,
    lookingFor: 'SERIOUS',
    smoking: 'NO',
    drinking: 'SOCIAL',
    images: [
      'https://picsum.photos/id/338/800/1200',
      'https://picsum.photos/id/342/800/1200'
    ],
    verified: true,
    verificationBadges: { photo: true, phone: true, email: true, license: true },
    interests: ['Neuroscience', 'Art', 'Yoga', 'Coffee', 'Travel'],
    personalityTags: ['soc_3', 'life_3', 'rel_1', 'hum_2'],
    questions: [
      { id: 'q1', question: "En sevdiğim kahve çeşidi...", answer: "Yulaf sütlü Iced Latte, her sabah!" },
      { id: 'q2', question: "Hafta sonu idealim...", answer: "Sahilde uzun bir yürüyüş ve brunch." },
      { id: 'q3', question: "Nöbet sonrası ilk yaptığım şey...", answer: "Kesintisiz 10 saat uyku moduna geçmek." }
    ],
    hasLikedUser: true,
    distance: 0.8, // Very close for Nearby feature
    location: 'Upper East Side',
    isLocationHidden: false,
    lastActive: minutesAgo(2), // Very active
    isOnlineHidden: false,
    isAvailable: true,
    availabilityExpiresAt: hoursFromNow(6),
    readReceiptsEnabled: true,
    stories: [
      { id: 's1', imageUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80', timestamp: hoursAgo(2), seen: false }
    ],
    storyPrivacy: 'ALL_MATCHES'
  },
  {
    id: '2',
    name: 'James',
    age: 34,
    role: MedicalRole.NURSE,
    specialty: Specialty.EMERGENCY,
    subSpecialty: 'Trauma ICU',
    hospital: 'St. Mary’s Trauma Center',
    institutionHidden: true,
    bio: 'Living life in the fast lane. ER nurse who appreciates slow mornings and good jazz.',
    education: 'UCSF Nursing School',
    genderPreference: 'FEMALE',
    university: 'UCSF',
    city: 'Ankara',
    images: [
      'https://picsum.photos/id/91/800/1200',
      'https://picsum.photos/id/1012/800/1200'
    ],
    verified: true,
    verificationBadges: { photo: false, phone: true, email: true, license: true },
    interests: ['Fitness', 'Music', 'Travel', 'Cooking'],
    personalityTags: ['soc_1', 'life_2', 'life_4', 'rel_3'],
    questions: [
      { id: 'q1', question: "Stresten kurtulmak için...", answer: "Kulaklığımı takıp koşuya çıkarım." },
      { id: 'q2', question: "Hayalindeki tatil...", answer: "İtalya'da bir yemek turu." }
    ],
    hasLikedUser: false,
    distance: 12,
    location: 'West End',
    isLocationHidden: false,
    lastActive: hoursAgo(2),
    isOnlineHidden: false,
    isAvailable: false,
    readReceiptsEnabled: true,
    stories: [],
    storyPrivacy: 'ALL_MATCHES'
  },
  {
    id: '3',
    name: 'Elena',
    age: 28,
    role: MedicalRole.PHYSIOTHERAPIST,
    specialty: Specialty.PHYSIOTHERAPY,
    subSpecialty: 'Sports Injuries',
    hospital: 'Children’s Hope Hospital',
    institutionHidden: false,
    bio: 'Making little lives better. Looking for someone kind, ambitious, and ready for a serious connection.',
    education: 'Stanford Medicine',
    genderPreference: 'MALE',
    university: 'Stanford University',
    city: 'Istanbul',
    images: [
      'https://picsum.photos/id/64/800/1200',
      'https://picsum.photos/id/65/800/1200'
    ],
    verified: true,
    verificationBadges: { photo: true, phone: true, email: false, license: true },
    interests: ['Cooking', 'Volunteering', 'Running', 'Nature'],
    personalityTags: ['soc_2', 'life_1', 'rel_1', 'hum_1'],
    questions: [
      { id: 'q1', question: "Beni güldüren şey...", answer: "Hastaların çocuksu masumiyeti." },
      { id: 'q2', question: "Favori nöbet atıştırmalığım...", answer: "Protein bar ve bolca su." },
      { id: 'q3', question: "Hafta sonu idealim...", answer: "Doğa yürüyüşü ve kamp." }
    ],
    hasLikedUser: true,
    distance: 2.1, // Close
    location: 'Marina District',
    isLocationHidden: false,
    lastActive: minutesAgo(12),
    isOnlineHidden: false,
    isAvailable: true,
    availabilityExpiresAt: hoursFromNow(2),
    readReceiptsEnabled: true,
    stories: [
      { id: 's2', imageUrl: 'https://images.unsplash.com/photo-1576091160550-2187d80a1844?auto=format&fit=crop&q=80', timestamp: hoursAgo(4), seen: false },
      { id: 's3', imageUrl: 'https://images.unsplash.com/photo-1571772996211-2f02c9727629?auto=format&fit=crop&q=80', timestamp: hoursAgo(1), seen: false }
    ],
    storyPrivacy: 'ALL_MATCHES'
  },
  {
    id: '4',
    name: 'Dr. Amet',
    age: 31,
    role: MedicalRole.DOCTOR,
    specialty: Specialty.SURGERY,
    subSpecialty: 'Cardiothoracic Surgery',
    hospital: 'International Medical Center',
    institutionHidden: false,
    bio: 'General Surgeon. Precision is my language. Seeking an intellectual equal.',
    education: 'Imperial College London',
    genderPreference: 'FEMALE',
    university: 'Imperial College London',
    city: 'Izmir',
    images: [
      'https://picsum.photos/id/177/800/1200',
      'https://picsum.photos/id/203/800/1200'
    ],
    verified: true,
    verificationBadges: { photo: true, phone: false, email: true, license: true },
    interests: ['Chess', 'Sailing', 'History', 'Coffee'],
    personalityTags: ['soc_2', 'life_1', 'life_3', 'hum_3'],
    questions: [
      { id: 'q1', question: "En çok gurur duyduğum başarım...", answer: "İlk açık kalp ameliyatım." },
      { id: 'q2', question: "En sevdiğim kahve çeşidi...", answer: "Double Espresso, şekersiz." }
    ],
    hasLikedUser: false,
    distance: 4.5, // Just inside 5km
    location: 'Greater Metropolitan Area',
    isLocationHidden: false,
    lastActive: minutesAgo(5),
    isOnlineHidden: false,
    isAvailable: true,
    availabilityExpiresAt: hoursFromNow(7),
    readReceiptsEnabled: true,
    stories: [],
    storyPrivacy: 'ALL_MATCHES'
  },
  {
    id: '5',
    name: 'Emily',
    age: 30,
    role: MedicalRole.PHARMACIST,
    specialty: Specialty.PHARMACY,
    subSpecialty: 'Clinical Pharmacy',
    hospital: 'Skin & Wellness Clinic',
    institutionHidden: true,
    bio: 'Looking for a soulful connection and someone to travel the world with.',
    education: 'Yale School of Medicine',
    genderPreference: 'EVERYONE',
    university: 'Yale University',
    city: 'Istanbul',
    images: [
      'https://picsum.photos/id/331/800/1200',
      'https://picsum.photos/id/325/800/1200'
    ],
    verified: true,
    verificationBadges: { photo: false, phone: false, email: true, license: true },
    interests: ['Gastronomy', 'Travel', 'Photography', 'Art'],
    personalityTags: ['soc_1', 'life_2', 'rel_3'],
    hasLikedUser: true,
    distance: 8,
    location: 'Hidden Location',
    isLocationHidden: true, // Location hidden
    lastActive: hoursAgo(5),
    isOnlineHidden: true,
    isAvailable: false,
    readReceiptsEnabled: false,
    stories: [
      { id: 's4', imageUrl: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80', timestamp: hoursAgo(10), seen: false }
    ],
    storyPrivacy: 'ALL_MATCHES'
  },
  {
    id: '6',
    name: 'Dr. Raj',
    age: 35,
    role: MedicalRole.DOCTOR,
    specialty: Specialty.PSYCHIATRY,
    subSpecialty: 'Forensic Psychiatry',
    hospital: 'Metropolitan General', // Same hospital as user for testing
    institutionHidden: false,
    bio: 'Understanding the human mind is my profession, understanding yours is my goal.',
    education: 'Oxford University',
    genderPreference: 'FEMALE',
    university: 'Oxford University',
    city: 'Ankara',
    images: [
      'https://picsum.photos/id/1025/800/1200',
      'https://picsum.photos/id/1011/800/1200'
    ],
    verified: true,
    verificationBadges: { photo: true, phone: true, email: true, license: true },
    interests: ['Meditation', 'Books', 'Tea', 'Nature'],
    personalityTags: ['soc_2', 'life_5', 'life_3', 'hum_2'],
    hasLikedUser: false,
    distance: 85,
    location: 'North Hills',
    isLocationHidden: false,
    lastActive: minutesAgo(30),
    isOnlineHidden: false,
    isAvailable: false,
    readReceiptsEnabled: true,
    stories: [],
    storyPrivacy: 'ALL_MATCHES'
  }
] : PROD_STUB_PROFILES;

// MOCK HISTORY
export const MOCK_SWIPE_HISTORY: SwipeHistoryItem[] = IS_DEV ? [
  { id: 'h1', profile: MOCK_PROFILES[3], action: 'PASS', timestamp: minutesAgo(10) },
  { id: 'h2', profile: MOCK_PROFILES[1], action: 'LIKE', timestamp: hoursAgo(1) },
  { id: 'h3', profile: MOCK_PROFILES[5], action: 'PASS', timestamp: hoursAgo(3) },
  { id: 'h4', profile: MOCK_PROFILES[0], action: 'SUPER_LIKE', timestamp: daysAgo(1) },
  { id: 'h5', profile: MOCK_PROFILES[4], action: 'PASS', timestamp: daysAgo(2) },
] : [];

export const MOCK_PROFILE_VISITORS: ProfileVisitor[] = IS_DEV ? [
  { id: 'v1', profile: MOCK_PROFILES[4], timestamp: minutesAgo(45), viewCount: 2 },
  { id: 'v2', profile: MOCK_PROFILES[1], timestamp: hoursAgo(2), viewCount: 1 },
  { id: 'v3', profile: MOCK_PROFILES[3], timestamp: hoursAgo(5), viewCount: 3 },
  { id: 'v4', profile: MOCK_PROFILES[5], timestamp: daysAgo(1), viewCount: 1 },
  { id: 'v5', profile: MOCK_PROFILES[0], timestamp: daysAgo(2), viewCount: 5 },
  { id: 'v6', profile: MOCK_PROFILES[2], timestamp: daysAgo(4), viewCount: 1 },
] : [];

// USER_PROFILE with Story Viewers for testing
export const USER_PROFILE: Profile = IS_DEV ? {
  id: 'me',
  name: 'Dr. John',
  age: 32,
  role: MedicalRole.DOCTOR,
  specialty: Specialty.CARDIOLOGY,
  subSpecialty: 'Interventional Cardiology',
  hospital: 'Metropolitan General',
  institutionHidden: false,
  bio: 'Fixing hearts by day, stealing them by night. Passionate about research and hiking.',
  education: 'Johns Hopkins School of Medicine',
  genderPreference: 'FEMALE',
  university: 'Johns Hopkins University',
  city: 'Istanbul',
  graduationYear: 2018,
  experienceYears: 8,
  lookingFor: 'SERIOUS',
  smoking: 'NO',
  drinking: 'SOCIAL',
  workStyle: 'FULL_TIME',
  shiftFrequency: 'WEEKLY_3_4',
  livingStatus: 'ALONE',
  images: [
    'https://picsum.photos/id/1005/800/1200', // Normal
    'https://picsum.photos/id/1012/800/1200', // Best
    'https://picsum.photos/id/1011/800/1200'  // Blurry/Low
  ],
  photoMetadata: [
    { id: 'img1', url: 'https://picsum.photos/id/1005/800/1200', performanceScore: 65, likeRateDifference: -5, isBlurry: false, isBest: false },
    { id: 'img2', url: 'https://picsum.photos/id/1012/800/1200', performanceScore: 98, likeRateDifference: 34, isBlurry: false, isBest: true },
    { id: 'img3', url: 'https://picsum.photos/id/1011/800/1200', performanceScore: 20, likeRateDifference: -40, isBlurry: true, isBest: false }
  ],
  verified: true,
  verificationBadges: { photo: false, phone: false, email: true, license: true },
  interests: ['Research', 'Hiking', 'Coffee', 'Vinyl Records', 'Travel'],
  personalityTags: ['soc_1', 'life_3', 'life_4', 'rel_1'], // User's own tags
  questions: [
    { id: 'myq1', question: "En sevdiğim kahve çeşidi...", answer: "Double Espresso, şekersiz." },
    { id: 'myq2', question: "Nöbet sonrası ilk yaptığım şey...", answer: "24 saat uyumak." }
  ],
  hasLikedUser: false,
  distance: 0,
  location: 'Downtown Metro',
  isLocationHidden: false,
  lastActive: Date.now(),
  isOnlineHidden: false,
  isAvailable: false,
  readReceiptsEnabled: true,
  stories: [
    {
      id: 'my_story_1',
      imageUrl: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80',
      timestamp: hoursAgo(1),
      seen: true,
      viewers: [
        { id: '1', name: 'Dr. Sarah', avatar: MOCK_PROFILES[0].images[0], timestamp: minutesAgo(10), reaction: '🔥' },
        { id: '3', name: 'Elena', avatar: MOCK_PROFILES[2].images[0], timestamp: minutesAgo(25), reaction: '❤️' },
        { id: '5', name: 'Emily', avatar: MOCK_PROFILES[4].images[0], timestamp: minutesAgo(40) }, // No reaction
      ]
    }
  ],
  storyPrivacy: 'ALL_MATCHES',
  notificationSettings: {
    newMatches: true,
    messages: true,
    likes: true,
    stories: false,
    superLikes: true,
    quietHoursEnabled: false,
    quietHoursStart: "23:00",
    quietHoursEnd: "07:00",
    onlyMatches: false,
    sound: 'Vitalis',
    vibration: true
  },
  privacySettings: {
    ghostMode: false,
    hideSameInstitution: false,
    hiddenProfileIds: [],
    showInNearby: true,
    recordProfileVisits: true // Default true
  },
  firstMessagePreference: 'ANYONE',
  referralData: {
    code: "DRJOHN24",
    invitedCount: 1,
    joinedCount: 1,
    totalRewardsEarned: 7,
    referrals: [
      { name: "Dr. Emily", status: "VERIFIED", timestamp: daysAgo(5) },
      { name: "Nurse Mike", status: "PENDING", timestamp: hoursAgo(4) }
    ]
  },
  themePreference: 'SYSTEM' // Default theme preference
} : PROD_USER_PROFILE;

export const MOCK_LIKES_YOU_PROFILES: Profile[] = IS_DEV ? [
  { ...MOCK_PROFILES[3], id: 'ly1', images: ['https://picsum.photos/id/400/800/1200'] },
  { ...MOCK_PROFILES[5], id: 'ly2', images: ['https://picsum.photos/id/401/800/1200'] },
  { ...MOCK_PROFILES[1], id: 'ly3', images: ['https://picsum.photos/id/402/800/1200'] },
  { ...MOCK_PROFILES[2], id: 'ly4', images: ['https://picsum.photos/id/403/800/1200'] },
  { ...MOCK_PROFILES[0], id: 'ly5', images: ['https://picsum.photos/id/404/800/1200'] },
  { ...MOCK_PROFILES[4], id: 'ly6', images: ['https://picsum.photos/id/405/800/1200'] },
  { ...MOCK_PROFILES[1], id: 'ly7', images: ['https://picsum.photos/id/406/800/1200'] },
  { ...MOCK_PROFILES[3], id: 'ly8', images: ['https://picsum.photos/id/407/800/1200'] },
  { ...MOCK_PROFILES[5], id: 'ly9', images: ['https://picsum.photos/id/408/800/1200'] },
  { ...MOCK_PROFILES[2], id: 'ly10', images: ['https://picsum.photos/id/409/800/1200'] },
  { ...MOCK_PROFILES[0], id: 'ly11', images: ['https://picsum.photos/id/410/800/1200'] },
  { ...MOCK_PROFILES[4], id: 'ly12', images: ['https://picsum.photos/id/411/800/1200'] },
] : [];

export const MOCK_NOTIFICATIONS: Notification[] = IS_DEV ? [
  {
    id: '1',
    type: NotificationType.SUPER_LIKE,
    senderProfile: MOCK_PROFILES[0],
    timestamp: minutesAgo(5),
    isRead: false
  },
  {
    id: '2',
    type: NotificationType.MATCH,
    senderProfile: MOCK_PROFILES[2],
    timestamp: minutesAgo(120),
    isRead: false
  },
  {
    id: '3',
    type: NotificationType.LIKE,
    senderProfile: MOCK_PROFILES[4],
    timestamp: minutesAgo(300),
    isRead: false
  },
  {
    id: '4',
    type: NotificationType.MATCH,
    senderProfile: MOCK_PROFILES[5],
    timestamp: minutesAgo(1440),
    isRead: true
  }
] : [];
