import type { ProblemReport, AreaStat, CategoryStat, LeaderProfile } from '../types';

export const LEADER_PERMANENT_PHOTO_URL = '/leader.jpg';

export const DEFAULT_PROFILE: LeaderProfile = {
  name: 'মোঃ আনোয়ার হোসেন ভূঁইয়া',
  designation: 'চেয়ারম্যান পদপ্রার্থী, ১৩ নং ধামতী ইউনিয়ন পরিষদ',
  promise: 'কাজ করতে চাই আপনাদের জন্যে',
  mainSlogan: 'আমাদের ধামতী আমরাই গড়ব',
  subSlogan: 'একসাথে গড়ব আগামীর ধামতী',
  heroAnnouncement: 'আমরা এখানে আছি আপনাদের সমস্যা সম্পর্কে জানতে',
  profileImage: '/leader.jpg',
  phone: '01613394074',
  email: 'Anwarbhuiyan184@gmail.com',
  officeAddress: 'জনসেবা কার্যালয়, ১৩ নং ধামতী ইউনিয়ন, দেবিদ্বার, কুমিল্লা',
};

// Start with clean authentic areas without artificial mock numbers
// ওয়ার্ডের গ্রাম/পাড়ার নাম নিশ্চিত হয়ে wardNameBn-এ যোগ করুন (যেমন: 'ওয়ার্ড নং ০১ (…গ্রাম)')
export const INITIAL_AREAS: AreaStat[] = [
  {
    wardNumber: 'ward-01',
    wardNameBn: 'ওয়ার্ড নং ০১',
    wardNameEn: 'Ward 01',
    totalProblems: 0,
    resolvedProblems: 0,
    topCategoryBn: '',
    topCategoryEn: ''
  },
  {
    wardNumber: 'ward-02',
    wardNameBn: 'ওয়ার্ড নং ০২',
    wardNameEn: 'Ward 02',
    totalProblems: 0,
    resolvedProblems: 0,
    topCategoryBn: '',
    topCategoryEn: ''
  },
  {
    wardNumber: 'ward-03',
    wardNameBn: 'ওয়ার্ড নং ০৩',
    wardNameEn: 'Ward 03',
    totalProblems: 0,
    resolvedProblems: 0,
    topCategoryBn: '',
    topCategoryEn: ''
  },
  {
    wardNumber: 'ward-04',
    wardNameBn: 'ওয়ার্ড নং ০৪',
    wardNameEn: 'Ward 04',
    totalProblems: 0,
    resolvedProblems: 0,
    topCategoryBn: '',
    topCategoryEn: ''
  },
  {
    wardNumber: 'ward-05',
    wardNameBn: 'ওয়ার্ড নং ০৫',
    wardNameEn: 'Ward 05',
    totalProblems: 0,
    resolvedProblems: 0,
    topCategoryBn: '',
    topCategoryEn: ''
  },
  {
    wardNumber: 'ward-06',
    wardNameBn: 'ওয়ার্ড নং ০৬',
    wardNameEn: 'Ward 06',
    totalProblems: 0,
    resolvedProblems: 0,
    topCategoryBn: '',
    topCategoryEn: ''
  },
  {
    wardNumber: 'ward-07',
    wardNameBn: 'ওয়ার্ড নং ০৭',
    wardNameEn: 'Ward 07',
    totalProblems: 0,
    resolvedProblems: 0,
    topCategoryBn: '',
    topCategoryEn: ''
  },
  {
    wardNumber: 'ward-08',
    wardNameBn: 'ওয়ার্ড নং ০৮',
    wardNameEn: 'Ward 08',
    totalProblems: 0,
    resolvedProblems: 0,
    topCategoryBn: '',
    topCategoryEn: ''
  },
  {
    wardNumber: 'ward-09',
    wardNameBn: 'ওয়ার্ড নং ০৯',
    wardNameEn: 'Ward 09',
    totalProblems: 0,
    resolvedProblems: 0,
    topCategoryBn: '',
    topCategoryEn: ''
  }
];

export const CATEGORIES: CategoryStat[] = [
  {
    id: 'drugs',
    nameBn: 'মাদক',
    nameEn: 'Drugs',
    iconName: 'Pill',
    count: 0,
    color: '#7c3aed'
  },
  {
    id: 'road',
    nameBn: 'সড়ক ও অবকাঠামো',
    nameEn: 'Roads & Infrastructure',
    iconName: 'Hammer',
    count: 0,
    color: '#0284c7'
  },
  {
    id: 'drainage',
    nameBn: 'ড্রেনেজ ও জলাবদ্ধতা',
    nameEn: 'Drainage & Waterlogging',
    iconName: 'Droplets',
    count: 0,
    color: '#0d9488'
  },
  {
    id: 'lighting',
    nameBn: 'সড়ক বাতি ও বিদ্যুৎ',
    nameEn: 'Street Lighting & Power',
    iconName: 'Lightbulb',
    count: 0,
    color: '#d97706'
  },
  {
    id: 'waste',
    nameBn: 'বর্জ্য অপসারণ ও পরিচ্ছন্নতা',
    nameEn: 'Waste & Sanitation',
    iconName: 'Trash2',
    count: 0,
    color: '#16a34a'
  },
  {
    id: 'water',
    nameBn: 'বিশুদ্ধ পানি সরবরাহ',
    nameEn: 'Drinking Water Supply',
    iconName: 'GlassWater',
    count: 0,
    color: '#2563eb'
  },
  {
    id: 'safety',
    nameBn: 'নিরাপত্তা ও জনশৃঙ্খলা',
    nameEn: 'Public Safety & Peace',
    iconName: 'ShieldAlert',
    count: 0,
    color: '#dc2626'
  },
  {
    id: 'other',
    nameBn: 'অন্যান্য',
    nameEn: 'Other',
    iconName: 'MoreHorizontal',
    count: 0,
    color: '#64748b'
  }
];

// Completely clean: Zero mock problems!
export const INITIAL_PROBLEMS: ProblemReport[] = [];

export const UI_STRINGS = {
  bn: {
    portalName: 'ধামতী জনসেবা মঞ্চ',
    portalSubtitle: 'নাগরিক সেবা ও সমস্যা নিরসন পোর্টাল',
    leaderGreeting: 'আমি মোঃ আনোয়ার হোসেন ভূঁইয়া',
    leaderPromise: 'কাজ করতে চাই আপনাদের জন্যে',
    mainSlogan: 'আমাদের ধামতী আমরাই গড়ব',
    subSlogan: 'একসাথে গড়ব আগামীর ধামতী',
    heroSlogan: 'আমরা এখানে আছি আপনাদের সমস্যা সম্পর্কে জানতে',
    heroActionPrompt: 'আপনাদের সমস্যা সম্পর্কে জানান নিচের বাটনে ক্লিক করে',
    reportButton: 'সমস্যা জানান / অভিযোগ দিন',
    trackButton: 'অভিযোগের অবস্থা জানুন',
    adminButton: 'অ্যাডমিন প্যানেল',
    statsHeading: 'ধামতী ইউনিয়নভিত্তিক নাগরিক সমস্যা ও সমাধানের পরিসংখ্যান',
    statsSubheading: 'স্বচ্ছতা ও জবাবদিহিতা নিশ্চিতকরণে প্রতিটি নাগরিক আবেদনের অগ্রগতি',
    totalReported: 'মোট প্রাপ্ত অভিযোগ',
    totalResolved: 'সমাধান সম্পন্ন',
    totalInProgress: 'কার্যক্রম চলমান',
    totalReviewing: 'যাচাই-বাছাই চলছে',
    resolutionRate: 'সমাধানের হার',
    filterByArea: 'এলাকা / ওয়ার্ড অনুযায়ী বাছাই',
    filterByCategory: 'সমস্যার ধরণ অনুযায়ী বাছাই',
    allWards: 'সকল ওয়ার্ড',
    allCategories: 'সকল ধরণ',
    allStatuses: 'সকল স্ট্যাটাস',
    pending: 'নতুন আবেদন',
    reviewing: 'ইউনিয়ন প্রতিনিধি কর্তৃক যাচাই চলছে',
    in_progress: 'মাঠপর্যায়ে কার্যক্রম চলমান',
    resolved: 'সম্পূর্ণ সমাধান সম্পন্ন',
    critical: 'জরুরি',
    high: 'উচ্চ অগ্রাধিকার',
    normal: 'সাধারণ',
    upvote: 'আমিও একমত / সমর্থন',
    viewDetails: 'বিস্তারিত দেখুন',
    submitTitle: 'ধামতীর যেকোনো সমস্যা সরাসরি জানান',
    submitDescription: 'আপনার দেওয়া তথ্য সরাসরি মোঃ আনোয়ার হোসেন ভূঁইয়া ও তাঁর সেবাদলের কাছে পৌঁছাবে।',
    formFullName: 'আপনার নাম',
    formPhone: 'মোবাইল নম্বর',
    formWard: 'ওয়ার্ড / এলাকা নির্বাচন করুন',
    formCategory: 'সমস্যার ধরণ',
    formLocation: 'নির্দিষ্ট রাস্তা বা স্থান',
    formTitle: 'সমস্যার শিরোনাম',
    formDesc: 'বিস্তারিত বর্ণনা লিখুন',
    formUrgency: 'অগ্রাধিকার মাত্রা',
    formAnonymous: 'নাম-নম্বর দিতে চাই না (অ্যাডমিনও দেখবেন না)',
    submitNow: 'অভিযোগ দাখিল করুন',
    cancel: 'বাতিল',
    trackingSuccessTitle: 'আপনার অভিযোগ সফলভাবে গৃহীত হয়েছে!',
    trackingSuccessDesc: 'আপনার রেফারেন্স কোড (অবস্থা দেখতে শুধু মোবাইল নম্বর লাগবে):',
    copyCode: 'কোড কপি করুন',
    copied: 'কপি হয়েছে!',
    trackModalTitle: 'আপনার অভিযোগের বর্তমান অবস্থা জানুন',
    trackInputPlaceholder: 'মোবাইল নম্বর লিখুন',
    searchBtn: 'অনুসন্ধান করুন',
    searchNotFound: 'এই ট্র্যাকিং কোডে কোনো অভিযোগ পাওয়া যায়নি।',
    assignedTo: 'দায়িত্বপ্রাপ্ত কর্মকর্তা / দল',
    officialNotes: 'কর্তৃপক্ষের পদক্ষেপের বিবরণ',
    citizenFeedTitle: 'ধামতীবাসীর সাম্প্রতিক অভিযোগ ও উন্নয়ন অগ্রগতি',
    leaderDirectQuote: '“আমাদের ধামতী আমরাই গড়ব—একসাথে গড়ব আগামীর ধামতী। ধামতীকে একটি আদর্শ, উন্নত ও দুর্নীতিমুক্ত জনপদ হিসেবে গড়ে তুলতে আপনাদের প্রতিটি সমস্যা সমাধানে আমি দৃঢ়প্রতিজ্ঞ।”'
  },
  en: {
    portalName: 'Dhamti Jonoseba Portal',
    portalSubtitle: 'Citizen Voice & Community Action Platform',
    leaderGreeting: 'I am Md. Anwar Hossain Bhuiyan',
    leaderPromise: 'I want to work for you & our community',
    mainSlogan: 'We Will Build Our Dhamti Ourselves',
    subSlogan: 'Together We Build the Future Dhamti',
    heroSlogan: 'We are here to listen and learn about your problems',
    heroActionPrompt: 'Report your community problem by clicking the button below',
    reportButton: 'Report a Problem',
    trackButton: 'Track Status',
    adminButton: 'Admin Panel',
    statsHeading: 'Statistics on Citizen Reports & Area Problems in Dhamti',
    statsSubheading: 'Real-time transparency tracking citizen submissions and community resolutions',
    totalReported: 'Total Reports',
    totalResolved: 'Resolved',
    totalInProgress: 'In Progress',
    totalReviewing: 'Under Review',
    resolutionRate: 'Resolution Rate',
    filterByArea: 'Filter by Ward / Area',
    filterByCategory: 'Filter by Category',
    allWards: 'All Wards',
    allCategories: 'All Categories',
    allStatuses: 'All Statuses',
    pending: 'New Submission',
    reviewing: 'Checking by Union Officials',
    in_progress: 'Field Work Ongoing',
    resolved: 'Resolved / Demolished',
    critical: 'Critical',
    high: 'High',
    normal: 'Normal',
    upvote: 'Me too / Support',
    viewDetails: 'View Details',
    submitTitle: 'Submit a Community Problem Directly',
    submitDescription: 'Your report directly reaches Md. Anwar Hossain Bhuiyan and his dedicated civic action team.',
    formFullName: 'Your Name',
    formPhone: 'Phone Number',
    formWard: 'Select Ward / Area',
    formCategory: 'Problem Category',
    formLocation: 'Specific Street or Landmark',
    formTitle: 'Problem Title',
    formDesc: 'Detailed Description',
    formUrgency: 'Urgency Level',
    formAnonymous: 'Do not share my name/number (even admin)',
    submitNow: 'Submit Grievance',
    cancel: 'Cancel',
    trackingSuccessTitle: 'Your Problem Has Been Successfully Registered!',
    trackingSuccessDesc: 'Your reference code (to check status you only need your mobile number):',
    copyCode: 'Copy Code',
    copied: 'Copied!',
    trackModalTitle: 'Check Your Report Status',
    trackInputPlaceholder: 'Mobile number',
    searchBtn: 'Search',
    searchNotFound: 'No report found for this tracking code.',
    assignedTo: 'Assigned Action Team / Officer',
    officialNotes: 'Official Action & Progress Details',
    citizenFeedTitle: 'Recent Citizen Reports & Progress Feed in Dhamti',
    leaderDirectQuote: '“We will build our Dhamti ourselves — together we build the future Dhamti. My dedication is to build a prosperous and modern community where every citizen concern is heard and addressed.”'
  }
};
