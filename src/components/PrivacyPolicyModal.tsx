import React from 'react';
import { Language } from '../types';
import { X, ShieldCheck } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

/** গোপনীয়তা নীতি: অভিযোগ জমা দেওয়ার আগে নাগরিক পড়তে পারেন (জমার ফর্ম থেকেও খোলে) */
export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;
  const bn = language === 'bn';

  const sections: { title: string; items: string[] }[] = bn
    ? [
        {
          title: 'আমরা কোন তথ্য নিই',
          items: [
            'আপনার নাম, মোবাইল নম্বর ও ওয়ার্ড।',
            'অভিযোগ বা পরামর্শের শিরোনাম, বিবরণ ও নির্দিষ্ট স্থান।',
            'আপনি কখন সম্মতি দিয়েছেন তার সময়।',
          ],
        },
        {
          title: 'কেন নিই',
          items: [
            'আপনার অভিযোগ বা পরামর্শ পর্যালোচনা করতে এবং প্রয়োজনে আপনার সঙ্গে যোগাযোগ করতে।',
            'কোন এলাকায় কোন ধরনের সমস্যা বেশি, তার সমষ্টিগত পরিসংখ্যান তৈরি করতে।',
            'এই তথ্য শুধু এই কাজেই ব্যবহার হবে।',
          ],
        },
        {
          title: 'কে দেখতে পারে',
          items: [
            'আপনার নাম, নম্বর ও অভিযোগের লেখা শুধু প্রার্থী নিজে (মূল প্রশাসক) দেখতে পারেন। আর কোনো অ্যাডমিন বা কর্মী দেখতে পারেন না।',
            'সাধারণ মানুষ কখনোই আপনার নাম, নম্বর বা অভিযোগের লেখা দেখতে পায় না।',
            'ওয়েবসাইটে শুধু সংখ্যা ও শতকরা হারের পরিসংখ্যান দেখানো হয় (যেমন কোন ওয়ার্ডে কোন বিষয়ে কতটি অভিযোগ)। কে অভিযোগ করেছেন বা কী লিখেছেন তা কখনো প্রকাশ করা হয় না।',
            'আপনার মোবাইল নম্বর লিখে অবস্থা দেখলে শুধু অবস্থা, ধরন, ওয়ার্ড ও তারিখ দেখা যায়, অভিযোগের লেখা নয়। তাই অন্য কাউকে আপনার নম্বর জানালে সে আপনার অভিযোগের অবস্থা দেখতে পারবে।',
          ],
        },
        {
          title: 'কীভাবে সুরক্ষিত রাখা হয়',
          items: [
            'সংবেদনশীল তথ্য এনক্রিপ্ট করে (কোড করে) ডেটাবেসে রাখা হয়।',
            'অ্যাডমিন প্যানেলে ঢুকতে গোপন পাসওয়ার্ড ও দুই ধাপের যাচাই লাগে। কে কখন কী করেছেন তার খাতা রাখা হয়।',
            'ওয়েবসাইটটি নিরাপদ সংযোগে (https) চলে। তথ্য রাখার জন্য নির্ভরযোগ্য ক্লাউড সেবা ব্যবহার করা হয়।',
          ],
        },
        {
          title: 'কতদিন রাখা হয়',
          items: [
            'নির্বাচনের ফলাফলের পর আনুমানিক ১ বছর পর্যন্ত রাখা হবে। এরপর ব্যক্তিগত তথ্য মুছে ফেলা হবে; শুধু নামহীন মোট সংখ্যা থাকতে পারে।',
          ],
        },
        {
          title: 'আপনার অধিকার',
          items: [
            'আপনি চাইলে আপনার তথ্য মুছে ফেলতে বা ভুল শোধরাতে বলতে পারেন। পাতার নিচে দেওয়া ফোন বা ঠিকানায় যোগাযোগ করুন।',
            'অভিযোগ জমা দেওয়ার সময় সম্মতি দেওয়া বাধ্যতামূলক। সম্মতি না দিলে জমা নেওয়া সম্ভব নয়।',
          ],
        },
      ]
    : [
        { title: 'What we collect', items: ['Your name, mobile number and ward.', 'The title, details and location of your report.', 'The time you gave consent.'] },
        {
          title: 'Why',
          items: [
            'To review your report and contact you if needed.',
            'To produce aggregate statistics on which problems are common where.',
            'The data is used only for these purposes.',
          ],
        },
        {
          title: 'Who can see it',
          items: [
            'Only the candidate himself (main administrator) can see your name, number and report text. No other admin or staff can.',
            'The public never sees your name, number or report text.',
            'The website shows only counts and percentages (for example, how many reports per topic in each ward). Who complained or what they wrote is never published.',
            'Entering a mobile number on the status page shows only status, type, ward and date, not the report text. Anyone who knows your number can therefore see the status of your report.',
          ],
        },
        {
          title: 'How it is protected',
          items: [
            'Sensitive data is stored encrypted in the database.',
            'The admin panel needs a secret password and two-step verification, and every action is logged.',
            'The site runs over a secure connection (https) on reliable cloud services.',
          ],
        },
        { title: 'How long we keep it', items: ['About 1 year after the election result. After that personal data is deleted; only anonymous totals may remain.'] },
        {
          title: 'Your rights',
          items: [
            'You may ask us to delete or correct your data using the phone or address in the page footer.',
            'Consent is required to submit a report. Without it we cannot accept the submission.',
          ],
        },
      ];

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-label={bn ? 'গোপনীয়তা নীতি' : 'Privacy policy'}>
      <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="px-5 sm:px-6 py-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-200" aria-hidden="true" />
            <h3 className="text-base sm:text-lg font-bold font-serif-bangla">{bn ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={bn ? 'বন্ধ করুন' : 'Close'} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-neutral-800">
          <p className="text-base leading-relaxed">
            {bn
              ? 'আপনার তথ্যের গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ। অভিযোগ বা পরামর্শ জমা দেওয়ার আগে নিচের কথাগুলো পড়ুন।'
              : 'Your privacy matters to us. Please read the following before submitting a report.'}
          </p>
          {sections.map((sec) => (
            <section key={sec.title}>
              <h4 className="text-base font-bold text-emerald-900 mb-1.5">{sec.title}</h4>
              <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base leading-relaxed">
                {sec.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="px-5 sm:px-6 py-3 border-t border-neutral-200 shrink-0">
          <button type="button" onClick={onClose} className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer">
            {bn ? 'বুঝেছি' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
