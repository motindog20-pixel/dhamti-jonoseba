import type { ProblemStatus } from '../types/index.js';

/** অভিযোগের ছয়টি অবস্থা, ক্রম অনুযায়ী */
export const STATUS_ORDER: ProblemStatus[] = [
  'submitted',
  'under_review',
  'need_info',
  'guidance_given',
  'contacted',
  'review_done',
];

export const STATUS_LABEL_BN: Record<ProblemStatus, string> = {
  submitted: 'জমা হয়েছে',
  under_review: 'পর্যালোচনাধীন',
  need_info: 'অতিরিক্ত তথ্য প্রয়োজন',
  guidance_given: 'তথ্য বা দিকনির্দেশনা দেওয়া হয়েছে',
  contacted: 'যোগাযোগ করা হয়েছে',
  review_done: 'পর্যালোচনা সম্পন্ন',
};

export const STATUS_LABEL_EN: Record<ProblemStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  need_info: 'More information needed',
  guidance_given: 'Information / guidance given',
  contacted: 'Contacted',
  review_done: 'Review completed',
};

/** যেসব অবস্থায় কারণ/ব্যাখ্যা লেখা বাধ্যতামূলক (বাস্তব রেকর্ড থাকতে হবে) */
export const NOTE_REQUIRED_STATUSES: ProblemStatus[] = ['need_info', 'guidance_given', 'contacted', 'review_done'];

/** পুরনো চার অবস্থা → নতুন ছয় অবস্থার মধ্যে (ডেটাবেস মাইগ্রেশনে ব্যবহৃত) */
export const LEGACY_STATUS_MAP: Record<string, ProblemStatus> = {
  pending: 'submitted',
  reviewing: 'under_review',
  in_progress: 'under_review',
  resolved: 'review_done',
};
