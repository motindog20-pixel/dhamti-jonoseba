import React, { useState } from 'react';
import { Language, LeaderProfile } from '../types';
import { UI_STRINGS, LEADER_PERMANENT_PHOTO_URL } from '../data/mockData';
import { 
  ArrowRight, 
  Search, 
  CheckCircle2, 
  MessageSquareText, 
  PhoneCall, 
  Clock, 
  ShieldCheck, 
  Maximize2,
  X,
  FileCheck2,
  Sparkles,
  Users
} from 'lucide-react';

interface HeroSectionProps {
  language: Language;
  onOpenReportModal: () => void;
  onOpenTrackModal: () => void;
  totalProblemsCount: number;
  resolvedProblemsCount: number;
  leaderProfile: LeaderProfile;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  language,
  onOpenReportModal,
  onOpenTrackModal,
  totalProblemsCount,
  resolvedProblemsCount,
  leaderProfile,
}) => {
  const strings = UI_STRINGS[language];
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  // Split slogan into two parts to match the reference banner style ("আমাদের ধামতী" in green, "আমরাই গড়বো" in red)
  const sloganText = leaderProfile.mainSlogan || 'আমাদের ধামতী আমরাই গড়বো';
  const sloganParts = React.useMemo(() => {
    if (sloganText.includes('আমাদের ধামতী')) {
      const rest = sloganText.replace('আমাদের ধামতী', '').trim();
      return {
        part1: 'আমাদের ধামতী',
        part2: rest.length > 0 ? rest : 'আমরাই গড়বো'
      };
    }
    const words = sloganText.split(' ');
    if (words.length >= 2) {
      const mid = Math.ceil(words.length / 2);
      return {
        part1: words.slice(0, mid).join(' '),
        part2: words.slice(mid).join(' ')
      };
    }
    return { part1: sloganText, part2: '' };
  }, [sloganText]);

  return (
    <section id="hero-banner" className="relative overflow-hidden bg-[#faf9f5] border-b border-neutral-200">
      
      {/* ======================================================== */}
      {/* ARTISTIC BACKGROUND: Red, Yellow & Green Brushstrokes */}
      {/* Inspired directly by the Open Graph reference image */}
      {/* ======================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        
        {/* Top-Left to Top-Right Dynamic Tricolor Brushstrokes (Red, Yellow, Green) */}
        <svg
          viewBox="0 0 1600 700"
          className="absolute -top-6 -left-10 w-[115%] h-auto min-h-[350px] object-cover opacity-90"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Dynamic Gradients for the Brush Strokes */}
            <linearGradient id="brushRed" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#dc2626" stopOpacity="0.92" />
              <stop offset="85%" stopColor="#ef4444" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id="brushYellow" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#eab308" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#facc15" stopOpacity="0.95" />
              <stop offset="85%" stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id="brushGreen" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#14532d" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#15803d" stopOpacity="0.92" />
              <stop offset="80%" stopColor="#16a34a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.75" />
            </linearGradient>

            {/* Subtle filter for organic painted edges */}
            <filter id="paintTurbulence" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" />
            </filter>
          </defs>

          {/* 1. Top Red Paint Swash with rough brush ends */}
          <path
            d="M -30,0 
               L 420,0 
               C 490,40 560,90 680,120 
               C 810,150 950,110 1150,60 
               C 1280,30 1420,20 1630,0 
               L 1630,70 
               C 1450,110 1310,150 1120,180 
               C 920,210 740,195 580,140 
               C 440,90 320,80 -30,120 Z"
            fill="url(#brushRed)"
            filter="url(#paintTurbulence)"
          />

          {/* 2. Middle Golden Yellow Paint Swash */}
          <path
            d="M -30,70 
               C 160,80 320,110 460,170 
               C 620,230 790,240 990,210 
               C 1180,180 1360,130 1630,70 
               L 1630,135 
               C 1390,200 1200,240 980,265 
               C 770,290 590,280 430,220 
               C 280,165 140,150 -30,160 Z"
            fill="url(#brushYellow)"
            filter="url(#paintTurbulence)"
          />

          {/* 3. Lower Green Paint Swash */}
          <path
            d="M -30,140 
               C 140,150 290,190 420,260 
               C 560,335 730,345 920,315 
               C 1120,285 1320,225 1630,140 
               L 1630,205 
               C 1340,290 1130,340 910,360 
               C 700,380 520,365 370,295 
               C 220,225 100,205 -30,210 Z"
            fill="url(#brushGreen)"
            filter="url(#paintTurbulence)"
          />

          {/* Decorative artistic brush splatters & energetic accent streaks */}
          <circle cx="480" cy="190" r="7" fill="#dc2626" opacity="0.6" />
          <circle cx="510" cy="225" r="5" fill="#facc15" opacity="0.7" />
          <circle cx="450" cy="285" r="8" fill="#15803d" opacity="0.6" />
          <circle cx="940" cy="245" r="6" fill="#facc15" opacity="0.6" />
          <circle cx="1030" cy="220" r="9" fill="#dc2626" opacity="0.5" />
          <circle cx="980" cy="320" r="7" fill="#16a34a" opacity="0.6" />
        </svg>

        {/* Peaceful rural village watermark on bottom right matching reference art */}
        <div className="absolute right-0 bottom-0 w-full sm:w-2/3 lg:w-1/2 h-44 sm:h-56 pointer-events-none opacity-20 overflow-hidden">
          <svg viewBox="0 0 800 240" className="w-full h-full object-cover object-right-bottom" fill="none">
            {/* Morning sun */}
            <circle cx="460" cy="110" r="32" fill="#047857" opacity="0.3" />
            {/* Soft river curves */}
            <path d="M 0,210 Q 250,170 500,200 T 800,190 L 800,240 L 0,240 Z" fill="#065f46" opacity="0.15" />
            <path d="M 120,225 Q 380,195 620,220 T 800,210" stroke="#047857" strokeWidth="2" opacity="0.3" />
            {/* Country boat */}
            <path d="M 420,212 Q 445,216 470,212 Q 450,222 420,212 Z" fill="#047857" opacity="0.5" />
            <path d="M 445,200 L 445,214" stroke="#047857" strokeWidth="1.5" opacity="0.5" />
            {/* Palm trees and thatched village houses */}
            <path d="M 580,205 Q 585,160 590,130" stroke="#047857" strokeWidth="3" opacity="0.4" />
            <path d="M 590,130 Q 565,115 550,135 M 590,130 Q 580,105 570,110 M 590,130 Q 610,105 620,120 M 590,130 Q 615,120 625,140" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
            {/* Village houses */}
            <polygon points="630,205 655,185 680,205" fill="#047857" opacity="0.4" />
            <rect x="635" y="200" width="40" height="15" fill="#047857" opacity="0.3" />
            <polygon points="675,205 695,188 715,205" fill="#047857" opacity="0.35" />
            <rect x="680" y="200" width="30" height="15" fill="#047857" opacity="0.25" />
          </svg>
        </div>

      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: Image at TOP -> Name of Person -> Slogan */}
          {/* With Expand Animation Originating From The Name Plinth */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 flex flex-col items-center text-center">
            
            {/* Top Civic Authority Seal Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-emerald-950 text-xs sm:text-sm font-semibold mb-4 border border-emerald-300 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="bengali-text">
                {leaderProfile.designation || (language === 'bn' ? 'চেয়ারম্যান পদপ্রার্থী, ১৩ নং ধামতী ইউনিয়ন পরিষদ' : 'Chairman Candidate, 13 No. Dhamti Union Parishad')}
              </span>
            </div>

            {/* ======================================================== */}
            {/* 1. THE IMAGE AT THE TOP OF THE NAME */}
            {/* Expanding upward with smooth expand animation from the name */}
            {/* ======================================================== */}
            <div className="relative z-20 w-full flex flex-col items-center">
              
              <div 
                className="relative group cursor-pointer transition-all duration-700 ease-out transform hover:scale-[1.03] active:scale-[0.99] origin-bottom"
                onClick={() => setIsImageExpanded(true)}
                title={language === 'bn' ? 'ছবিটি বড় করে দেখতে ক্লিক করুন' : 'Click to enlarge image'}
              >
                {/* Multi-color ambient background halo (Red, Yellow, Green inspired) */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-600/35 via-amber-400/30 to-rose-600/30 rounded-[3rem] blur-2xl opacity-75 group-hover:opacity-100 transition-all duration-700 pointer-events-none animate-subtle-glow"></div>

                {/* Arched Portrait Container with Expand Animation from the Name below */}
                <div className="relative w-56 h-64 sm:w-64 sm:h-72 md:w-72 md:h-80 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-b from-stone-100 to-stone-200 animate-expand-from-name">
                  
                  {/* Decorative golden and emerald inner ring */}
                  <div className="absolute inset-0 rounded-[2.5rem] border-2 border-emerald-600/40 pointer-events-none z-10"></div>

                  <img
                    src={leaderProfile.profileImage || LEADER_PERMANENT_PHOTO_URL}
                    alt={leaderProfile.name}
                    className="w-full h-full object-cover object-top filter contrast-[1.03] group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="eager"
                    decoding="async"
                  />

                  {/* Soft bottom gradient blending into the name plate */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-emerald-950/80 via-emerald-950/30 to-transparent pointer-events-none z-10"></div>

                  {/* Expand icon button badge */}
                  <div className="absolute top-3 right-3 z-20 bg-neutral-900/80 backdrop-blur-md text-amber-300 p-2 rounded-full opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-md">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Pedestal connector between image and name plate */}
                <div className="mx-auto w-24 h-2 bg-gradient-to-r from-emerald-600 via-amber-400 to-rose-600 rounded-full blur-[1px] mt-1 shadow-xs"></div>
              </div>

            </div>

            {/* ======================================================== */}
            {/* 2. THE NAME OF THE PERSON (Under the Image) */}
            {/* The image expanded upwards from here */}
            {/* ======================================================== */}
            <div className="relative z-10 w-full mt-3 px-2">
              
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-emerald-200/90 shadow-md">
                
                {/* Authoritative Bengali Name */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 font-serif-bangla tracking-tight leading-tight">
                  {leaderProfile.name || strings.leaderGreeting}
                </h1>

                {/* Sub-promise beneath the name */}
                <p className="text-base sm:text-lg font-semibold text-emerald-800 mt-1.5 font-serif-bangla leading-relaxed">
                  {leaderProfile.promise || strings.leaderPromise}
                </p>

                {/* Golden accent bar */}
                <div className="mx-auto w-16 h-1 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full mt-2.5"></div>
              </div>

            </div>

            {/* ======================================================== */}
            {/* 3. THE SLOGAN (Under the Name) */}
            {/* Designed faithfully after the reference banner: */}
            {/* "আমাদের ধামতী" in Green + "আমরাই গড়বো" in Red + Dual curved swoosh */}
            {/* ======================================================== */}
            <div className="relative z-10 w-full mt-4">
              
              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-lg text-center relative overflow-hidden group">
                
                {/* Top border tri-color hairline */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-600 via-amber-400 to-rose-600"></div>

                {/* Slogan Text: Two-tone Green & Red */}
                <div className="flex flex-col items-center justify-center font-serif-bangla">
                  
                  {/* First line: "আমাদের ধামতী" in Forest Green */}
                  <span className="text-2xl sm:text-3xl md:text-[2.2rem] font-black text-emerald-800 tracking-wide leading-tight">
                    {sloganParts.part1}
                  </span>

                  {/* Second line: "আমরাই গড়বো" in Bold Crimson Red */}
                  {sloganParts.part2 && (
                    <span className="text-3xl sm:text-4xl md:text-[2.6rem] font-black text-rose-600 tracking-wide leading-tight mt-0.5">
                      {sloganParts.part2}
                    </span>
                  )}

                  {/* Signature Curved Dual Underline (Green and Yellow) like in the reference image */}
                  <div className="w-48 sm:w-60 h-3 sm:h-4 mt-1.5 flex flex-col justify-center items-center">
                    <svg viewBox="0 0 240 16" className="w-full h-full" fill="none">
                      {/* Green curved swoosh */}
                      <path
                        d="M 10,6 Q 120,16 230,4"
                        stroke="#059669"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      {/* Yellow/amber accent swoosh */}
                      <path
                        d="M 35,11 Q 130,19 220,9"
                        stroke="#facc15"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Sub-slogan Card under the main slogan */}
                <div className="mt-4 pt-3.5 border-t border-neutral-100">
                  <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50 rounded-xl py-2 px-3 border border-emerald-200/80">
                    <p className="text-sm sm:text-base font-semibold text-emerald-950 font-serif-bangla">
                      {leaderProfile.subSlogan || 'একসাথে গড়ব আগামীর ধামতী'}
                    </p>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Civic Engagement Hub, Call to Action, */}
          {/* Live Transparency Statistics, and Official Direct Helpline */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-5 pt-2 lg:pt-0">
            
            {/* 1. Civic Mission Announcement */}
            <div className="p-6 sm:p-7 bg-white/95 backdrop-blur-md rounded-3xl border border-emerald-200/90 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>{language === 'bn' ? 'নাগরিক সেবা ও উন্নয়ন অঙ্গীকার' : 'Citizen Service & Development Mission'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-[1.85rem] font-bold text-neutral-900 leading-snug font-serif-bangla">
                {leaderProfile.heroAnnouncement || strings.heroSlogan}
              </h2>
              <p className="text-sm sm:text-base text-neutral-700 mt-2.5 leading-relaxed font-sans-bangla">
                {language === 'bn'
                  ? 'আপনার এলাকার যেকোনো দুর্ভোগ বা উন্নয়ন প্রয়োজনের কথা সরাসরি জানান। প্রতিটি আবেদন পর্যবেক্ষণ করে সর্বোচ্চ গুরুত্বের সাথে সমাধান করা হবে।'
                  : 'Report any infrastructure, water, sanitation, or safety issue in your ward. Every submission is directly inspected and acted upon.'}
              </p>
            </div>

            {/* 2. Interactive Action Box & Buttons */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/90 shadow-sm">
              <div className="text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-bold text-neutral-900 font-serif-bangla">
                  {strings.heroActionPrompt}
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenReportModal}
                  className="w-full sm:flex-1 py-4 px-6 text-base sm:text-lg font-extrabold text-white bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 active:scale-98 rounded-2xl shadow-lg shadow-emerald-900/25 flex items-center justify-center gap-3 transition-all cursor-pointer group"
                >
                  <MessageSquareText className="w-5 h-5 text-emerald-200 group-hover:scale-110 transition-transform" />
                  <span>{strings.reportButton}</span>
                  <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={onOpenTrackModal}
                  className="w-full sm:w-auto py-4 px-6 text-sm sm:text-base font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:scale-98 rounded-2xl border border-neutral-300 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Search className="w-4 h-4 text-neutral-600" />
                  <span>{strings.trackButton}</span>
                </button>
              </div>

              {/* Three Civic Guarantees */}
              <div className="mt-5 pt-4 border-t border-neutral-100 grid grid-cols-3 gap-2 text-center text-xs sm:text-sm text-neutral-700 font-medium">
                <div className="flex flex-col items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
                  <span>{language === 'bn' ? 'সরাসরি তদারকি' : 'Direct Oversight'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <Clock className="w-4 h-4 text-emerald-600 mb-1" />
                  <span>{language === 'bn' ? 'যাচাই ও সমাধান' : 'Union Action'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
                  <span>{language === 'bn' ? '১০০% গোপনীয়' : 'Anonymous Option'}</span>
                </div>
              </div>
            </div>

            {/* 3. Real-Time Civic Transparency Strip */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/90 backdrop-blur-md border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                    {language === 'bn' ? 'মোট নাগরিক আবেদন' : 'Total Submissions'}
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950 font-mono-num mt-1 block">
                    {totalProblemsCount}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100/90 flex items-center justify-center text-emerald-800 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-md border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                    {language === 'bn' ? 'সফল সমাধানকৃত' : 'Resolved Grievances'}
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono-num mt-1 block">
                    {resolvedProblemsCount}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100/90 flex items-center justify-center text-emerald-700 shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* 4. Official Civic Helpline & Direct Contact */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-3xl border border-emerald-800 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                    <PhoneCall className="w-4 h-4 text-amber-400" />
                    <span>{language === 'bn' ? 'জরুরি নাগরিক হেল্পলাইন ও পরামর্শ কেন্দ্র' : 'Direct Civic Helpline'}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-100 max-w-md leading-relaxed font-sans-bangla">
                    {language === 'bn'
                      ? 'ধামতীর যেকোনো সমস্যা, পরামর্শ বা সরাসরি যোগাযোগে আমাদের সাথে যুক্ত হোন:'
                      : 'For immediate assistance, advice, or community inquiries, contact directly:'}
                  </p>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-800/80">
                  <a
                    href={`tel:${leaderProfile.phone.replace(/\s+/g, '')}`}
                    className="text-lg sm:text-xl md:text-2xl font-extrabold text-amber-300 font-mono-num hover:underline"
                  >
                    {leaderProfile.phone}
                  </a>
                  <a
                    href={`mailto:${leaderProfile.email}`}
                    className="text-xs sm:text-sm text-emerald-200 hover:text-white hover:underline transition-colors break-all"
                  >
                    {leaderProfile.email}
                  </a>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-800/80 flex flex-col min-[480px]:flex-row items-start min-[480px]:items-center justify-between gap-2 text-xs sm:text-sm text-emerald-200">
                <span>{leaderProfile.officeAddress}</span>
                <span className="font-semibold text-amber-300 bg-emerald-900/90 px-2.5 py-0.5 rounded-full border border-emerald-700/60">
                  {language === 'bn' ? 'সর্বদা জনগণের পাশে' : 'Dedicated Civic Service'}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Expanded Image Lightbox Modal */}
      {isImageExpanded && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsImageExpanded(false)}
        >
          <div 
            className="relative max-w-lg w-full bg-neutral-900 rounded-3xl overflow-hidden border border-emerald-600/60 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsImageExpanded(false)}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors cursor-pointer border border-neutral-600"
              aria-label="Close Expanded Image"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Expanded Image */}
            <div className="relative w-full aspect-[4/5] bg-neutral-950">
              <img
                src={leaderProfile.profileImage || LEADER_PERMANENT_PHOTO_URL}
                alt={leaderProfile.name}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black via-black/70 to-transparent">
                <p className="text-xl sm:text-2xl font-bold text-white font-serif-bangla">
                  {leaderProfile.name}
                </p>
                <div className="mt-1 flex items-center gap-2 font-serif-bangla text-lg font-bold">
                  <span className="text-emerald-400">আমাদের ধামতী</span>
                  <span className="text-rose-400">আমরাই গড়বো</span>
                </div>
                <p className="text-xs text-neutral-300 mt-1">
                  {leaderProfile.subSlogan}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
