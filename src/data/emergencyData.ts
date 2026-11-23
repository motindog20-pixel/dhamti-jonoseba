// জরুরি সেবার নম্বর। জাতীয় নম্বরগুলো ডিফল্ট (সরকারি ঘোষণা অনুযায়ী);
// থানা ও স্থানীয় হেলথ ডেস্কের নম্বর অ্যাডমিন "পেজের তথ্য" ট্যাব থেকে বসান।
// (server/app.ts-এ DEFAULT_EMERGENCY আছে; দুই জায়গায় মিলিয়ে রাখুন)
export type EmergencyId = 'national' | 'fire' | 'police' | 'health';
export type EmergencyContacts = Record<EmergencyId, string>;

export const DEFAULT_EMERGENCY: EmergencyContacts = {
  national: '999',
  fire: '102',
  police: '',
  health: '16263',
};

export const EMERGENCY_ITEMS: {
  id: EmergencyId;
  bn: string;
  en: string;
  noteBn: string;
  noteEn: string;
}[] = [
  {
    id: 'national',
    bn: 'জাতীয় জরুরি সেবা',
    en: 'National Emergency',
    noteBn: 'পুলিশ, ফায়ার সার্ভিস ও অ্যাম্বুলেন্স; যেকোনো বিপদে, বিনা খরচে',
    noteEn: 'Police, fire and ambulance, any emergency',
  },
  {
    id: 'fire',
    bn: 'ফায়ার সার্ভিস',
    en: 'Fire Service',
    noteBn: 'আগুন লাগলে বা উদ্ধার দরকার হলে',
    noteEn: 'For fires and rescue',
  },
  {
    id: 'police',
    bn: 'পুলিশ স্টেশন (দেবিদ্বার থানা)',
    en: 'Police Station (Debidwar)',
    noteBn: 'স্থানীয় থানা। বিপদে সরাসরি ৯৯৯-এ ফোন করুন',
    noteEn: 'Local station. In danger, call 999 directly',
  },
  {
    id: 'health',
    bn: 'হেলথ ডেস্ক',
    en: 'Health Desk',
    noteBn: 'স্বাস্থ্য পরামর্শ ও চিকিৎসা-তথ্য',
    noteEn: 'Health advice and medical information',
  },
];
