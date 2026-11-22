export type Language = 'bn' | 'en';

export type SubmissionType = 'complaint' | 'advice';

export type ProblemStatus =
  | 'submitted' // জমা হয়েছে
  | 'under_review' // পর্যালোচনাধীন
  | 'need_info' // অতিরিক্ত তথ্য প্রয়োজন
  | 'guidance_given' // প্রয়োজনীয় তথ্য বা দিকনির্দেশনা দেওয়া হয়েছে
  | 'contacted' // যোগাযোগ করা হয়েছে
  | 'review_done'; // পর্যালোচনা সম্পন্ন

export type StaffRole = 'owner';

/** পাবলিক পরিসংখ্যান: শুধু সংখ্যা, ব্যক্তিগত তথ্য নয় */
export interface PublicStats {
  generatedAt: string;
  total: number;
  reviewDone: number;
  underReview: number;
  submitted: number;
  /** প্রতিটি ওয়ার্ডে ফর্মের সব বিষয়ের সংখ্যা (বেশি থেকে কম, ০ সহ) */
  wards: { ward: string; total: number; categories: { id: string; count: number }[] }[];
  /** সব বিষয়ের মোট সংখ্যা (বেশি থেকে কম, ০ সহ) */
  categories: { id: string; count: number }[];
  monthly: { month: string; count: number }[];
}

export type UrgencyLevel = 'normal' | 'high' | 'critical';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  status: ProblemStatus;
  noteEn: string;
  noteBn: string;
  author: string;
}

export interface ProblemReport {
  id: string;
  trackingCode: string; // e.g. JNS-2026-1042 or ADV-2026-1042
  submissionType: SubmissionType; // 'complaint' = অভিযোগ, 'advice' = উপদেশ / পরামর্শ
  title: string;
  description: string;
  category: string;
  ward: string; // e.g. "Ward 1" or "ওয়ার্ড ১"
  specificLocation: string;
  citizenName: string;
  phone: string;
  isAnonymous: boolean;
  urgency: UrgencyLevel;
  status: ProblemStatus;
  createdAt: string;
  upvotes: number;
  userUpvoted?: boolean;
  timeline: TimelineEvent[];
  assignedOfficer?: string;
  resolutionNote?: string;
}

export interface AreaStat {
  wardNumber: string;
  wardNameBn: string;
  wardNameEn: string;
  totalProblems: number;
  resolvedProblems: number;
  topCategoryBn: string;
  topCategoryEn: string;
}

export interface CategoryStat {
  id: string;
  nameBn: string;
  nameEn: string;
  iconName: string;
  count: number;
  color: string;
}

export interface LeaderProfile {
  name: string;
  designation: string;
  promise: string;
  mainSlogan: string;
  subSlogan: string;
  heroAnnouncement: string;
  profileImage: string | null;
  phone: string;
  email: string;
  officeAddress: string;
}

export type ManifestoStatus = 'planned' | 'in_progress' | 'completed';

export type ManifestoCategory =
  | 'roads_infrastructure'
  | 'education_culture'
  | 'healthcare_wellbeing'
  | 'digital_youth'
  | 'agriculture_drainage'
  | 'social_safety'
  | 'environment_clean';

export interface ManifestoMilestone {
  id: string;
  textBn: string;
  textEn: string;
  isDone: boolean;
}

export interface ManifestoItem {
  id: string;
  titleBn: string;
  titleEn: string;
  category: ManifestoCategory;
  summaryBn: string;
  summaryEn: string;
  descriptionBn: string;
  descriptionEn: string;
  progressPercentage: number; // 0 - 100
  status: ManifestoStatus;
  targetYear: string;
  budgetOrScope: string;
  milestones: ManifestoMilestone[];
  lastUpdated: string;
}
