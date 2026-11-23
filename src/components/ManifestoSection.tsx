import React, { useState, useMemo } from 'react';
import { Language, ManifestoItem, ManifestoCategory, ManifestoStatus } from '../types';
import { MANIFESTO_CATEGORIES_CONFIG } from '../data/manifestoData';
import {
  Award,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Search,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Target,
  Sparkles,
  TrendingUp,
  Hammer,
  GraduationCap,
  HeartPulse,
  Laptop,
  Sprout,
  ShieldCheck,
  Trees,
  HelpCircle,
  FileCheck
} from 'lucide-react';

interface ManifestoSectionProps {
  language: Language;
  manifestoItems: ManifestoItem[];
  onOpenAdmin?: () => void;
  onOpenReportModal?: () => void;
}

export const ManifestoSection: React.FC<ManifestoSectionProps> = ({
  language,
  manifestoItems,
  onOpenAdmin,
  onOpenReportModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Category Icon Resolver
  const getCategoryIcon = (category: ManifestoCategory) => {
    switch (category) {
      case 'roads_infrastructure':
        return <Hammer className="w-4 h-4 text-emerald-700" />;
      case 'education_culture':
        return <GraduationCap className="w-4 h-4 text-blue-700" />;
      case 'healthcare_wellbeing':
        return <HeartPulse className="w-4 h-4 text-rose-700" />;
      case 'digital_youth':
        return <Laptop className="w-4 h-4 text-indigo-700" />;
      case 'agriculture_drainage':
        return <Sprout className="w-4 h-4 text-amber-700" />;
      case 'social_safety':
        return <ShieldCheck className="w-4 h-4 text-teal-700" />;
      case 'environment_clean':
        return <Trees className="w-4 h-4 text-green-700" />;
      default:
        return <Layers className="w-4 h-4 text-neutral-700" />;
    }
  };

  // Stats calculation
  const totalItems = manifestoItems.length;
  const completedItems = manifestoItems.filter((m) => m.status === 'completed').length;
  const inProgressItems = manifestoItems.filter((m) => m.status === 'in_progress').length;
  const plannedItems = manifestoItems.filter((m) => m.status === 'planned').length;

  const overallProgressPercentage = useMemo(() => {
    if (totalItems === 0) return 0;
    const sum = manifestoItems.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0);
    return Math.round(sum / totalItems);
  }, [manifestoItems, totalItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return manifestoItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitleBn = item.titleBn.toLowerCase().includes(q);
        const matchesTitleEn = item.titleEn.toLowerCase().includes(q);
        const matchesSummaryBn = item.summaryBn.toLowerCase().includes(q);
        const matchesDescBn = item.descriptionBn.toLowerCase().includes(q);
        return matchesTitleBn || matchesTitleEn || matchesSummaryBn || matchesDescBn;
      }
      return true;
    });
  }, [manifestoItems, selectedCategory, selectedStatus, searchQuery]);

  const getStatusLabel = (status: ManifestoStatus) => {
    switch (status) {
      case 'completed':
        return language === 'bn' ? 'সফলভাবে বাস্তবায়িত' : 'Fully Completed';
      case 'in_progress':
        return language === 'bn' ? 'মাঠপর্যায়ে বাস্তবায়নাধীন' : 'In Execution';
      case 'planned':
        return language === 'bn' ? 'পরিকল্পনাধীন / অনুমোদন প্রক্রিয়ায়' : 'Under Planning';
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status: ManifestoStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'in_progress':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'planned':
        return 'bg-neutral-100 text-neutral-700 border-neutral-300';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  // ইশতেহার এখনো প্রকাশিত হয়নি: ডেমো সংখ্যা না দেখিয়ে সৎ "শীঘ্রই আসছে" অবস্থা
  if (totalItems === 0) {
    const steps = [
      {
        n: '১',
        bn: 'আপনি জানান',
        textBn: 'ধামতীর কোন সমস্যা আগে সমাধান হওয়া উচিত, তা আপনার মতো করে লিখুন বা জানান।',
      },
      {
        n: '২',
        bn: 'আমরা শুনি',
        textBn: 'প্রতিটি মতামত পড়ে এলাকার প্রয়োজন বুঝে আমাদের অঙ্গীকার সাজানো হবে।',
      },
      {
        n: '৩',
        bn: 'অগ্রগতি দেখুন',
        textBn: 'অঙ্গীকার প্রকাশের পর প্রতিটি প্রতিশ্রুতির অবস্থা (চলছে/সম্পন্ন) এখানেই দেখতে পাবেন।',
      },
    ];
    const bn = language === 'bn';
    return (
      <section id="manifesto" className="py-12 sm:py-16 bg-gradient-to-b from-emerald-950 to-emerald-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-amber-300 text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>{bn ? 'আমাদের অঙ্গীকার' : 'Our Pledge'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold leading-[1.3] font-serif-bangla">
            {bn ? 'আমাদের অঙ্গীকার শীঘ্রই আসছে' : 'Our pledge is coming soon'}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-emerald-100 leading-relaxed max-w-2xl mx-auto">
            {bn
              ? 'অঙ্গীকার ঠিক করার আগে আমরা আপনার কথা শুনতে চাই। আপনার এলাকার সবচেয়ে বড় সমস্যা বা প্রত্যাশা কী?'
              : 'Before writing it, we want to hear from you. What matters most in your area?'}
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-left">
            {steps.map((st) => (
              <div key={st.n} className="rounded-2xl bg-white/10 border border-white/15 p-5">
                <span className="w-9 h-9 rounded-full bg-amber-400 text-emerald-950 font-extrabold text-lg flex items-center justify-center">
                  {st.n}
                </span>
                <h3 className="mt-3 text-lg font-bold">{st.bn}</h3>
                <p className="mt-1 text-sm text-emerald-100 leading-relaxed">{st.textBn}</p>
              </div>
            ))}
          </div>

          {onOpenReportModal && (
            <button
              type="button"
              onClick={onOpenReportModal}
              className="mt-8 inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-emerald-950 font-extrabold text-lg shadow-lg cursor-pointer"
            >
              <Target className="w-5 h-5" aria-hidden="true" />
              <span>{bn ? 'আপনার প্রত্যাশা জানান' : 'Share your expectations'}</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id="manifesto" className="py-12 sm:py-16 bg-neutral-50/70 border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-900 text-xs font-semibold mb-3 border border-emerald-200/80">
            <Award className="w-3.5 h-3.5 text-emerald-700" />
            <span>{language === 'bn' ? 'আমাদের অঙ্গীকার ও উন্নয়ন প্রতিশ্রুতি' : 'Our Pledge & Commitments'}</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 leading-[1.3] font-serif-bangla">
            {language === 'bn' ? 'ধামতী ইউনিয়নের রূপকল্প ও আমাদের অঙ্গীকার' : 'Dhamti Vision & Our Pledge'}
          </h2>
          
          <p className="text-sm sm:text-base text-neutral-600 mt-2.5 leading-relaxed font-sans-bangla">
            {language === 'bn'
              ? 'ধামতীবাসীর উন্নয়ন ও কল্যাণে গৃহীত প্রতিটি উন্নয়ন প্রতিশ্রুতির মাঠপর্যায়ের অগ্রগতি স্বচ্ছতার সাথে সরাসরি পর্যবেক্ষণ করুন।'
              : 'Real-time transparency on every development commitment and community pledge made for the citizens of Dhamti Union.'}
          </p>
        </div>

        {/* Top Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          
          {/* Card 1: Total Commitments */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {language === 'bn' ? 'মোট প্রতিশ্রুতি' : 'Total Pledges'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-mono-num">
                {totalItems}
              </span>
              <span className="text-xs text-neutral-500">{language === 'bn' ? 'টি প্রকল্প' : 'Pledges'}</span>
            </div>
          </div>

          {/* Card 2: Completed */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                {language === 'bn' ? 'সম্পূর্ণ বাস্তবায়িত' : 'Completed'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono-num">
                {completedItems}
              </span>
              <span className="text-xs text-emerald-600">{language === 'bn' ? 'টি অর্জিত' : 'Achieved'}</span>
            </div>
          </div>

          {/* Card 3: In Progress */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/40 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                {language === 'bn' ? 'মাঠপর্যায়ে চলমান' : 'In Progress'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono-num">
                {inProgressItems}
              </span>
              <span className="text-xs text-amber-600">{language === 'bn' ? 'টি চলমান' : 'Active'}</span>
            </div>
          </div>

          {/* Card 4: Overall Progress Rate */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {language === 'bn' ? 'সামগ্রিক বাস্তবায়ন' : 'Overall Rate'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-mono-num">
                  %{overallProgressPercentage}
                </span>
                <span className="text-xs text-neutral-500 font-medium">
                  {language === 'bn' ? 'বাস্তবায়ন সম্পন্ন' : 'Executed'}
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-700"
                  style={{ width: `${overallProgressPercentage}%` }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 mb-6 space-y-3.5 shadow-2xs">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'bn' ? 'অঙ্গীকার বা উন্নয়ন প্রতিশ্রুতি অনুসন্ধান...' : 'Search manifesto pledges & projects...'}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Segment */}
            <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-neutral-500 mr-1 whitespace-nowrap">
                {language === 'bn' ? 'অবস্থা:' : 'Status:'}
              </span>
              {[
                { id: 'all', labelBn: 'সকল', labelEn: 'All' },
                { id: 'completed', labelBn: 'বাস্তবায়িত', labelEn: 'Completed' },
                { id: 'in_progress', labelBn: 'চলমান', labelEn: 'In Progress' },
                { id: 'planned', labelBn: 'পরিকল্পনাধীন', labelEn: 'Planned' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStatus(s.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    selectedStatus === s.id
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {language === 'bn' ? s.labelBn : s.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-neutral-100 pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {language === 'bn' ? 'সকল খাত' : 'All Sectors'}
            </button>

            {(Object.keys(MANIFESTO_CATEGORIES_CONFIG) as ManifestoCategory[]).map((catKey) => {
              const conf = MANIFESTO_CATEGORIES_CONFIG[catKey];
              const isSelected = selectedCategory === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategory(catKey)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-700 text-white font-bold shadow-xs'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {getCategoryIcon(catKey)}
                  <span>{language === 'bn' ? conf.nameBn : conf.nameEn}</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* Dedicated Completed Manifestos Management Bar */}
        {completedItems > 0 && (selectedStatus === 'completed' || selectedStatus === 'all') && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50/90 border border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                  <span>{language === 'bn' ? 'বাস্তবায়িত নির্বাচনী প্রতিশ্রুতি' : 'Completed Commitments'}</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 font-mono-num font-bold text-xs">
                    {completedItems} {language === 'bn' ? 'টি সম্পন্ন' : 'done'}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                  {language === 'bn'
                    ? 'ইতিমধ্যে শতভাগ সম্পন্ন হওয়া উন্নয়ন প্রতিশ্রুতিসমূহ। জনকল্যাণে ধামতী ইউনিয়নের দৃশ্যমান অগ্রগতি।'
                    : 'Fully delivered commitments. Visible progress for Dhamti Union community.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Commitment Cards Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 p-8">
            <HelpCircle className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
            <h4 className="text-base font-bold text-neutral-800">
              {language === 'bn' ? 'কোনো নির্বাচনী প্রতিশ্রুতি পাওয়া যায়নি' : 'No matching commitments found'}
            </h4>
            <p className="text-xs text-neutral-500 mt-1">
              {language === 'bn' ? 'অনুগ্রহ করে ফিল্টার পরিবর্তন করুন।' : 'Try selecting another sector or clearing search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {filteredItems.map((item) => {
              const isExpanded = expandedItemId === item.id;
              const catConfig = MANIFESTO_CATEGORIES_CONFIG[item.category] || {
                nameBn: 'উন্নয়ন প্রকল্প',
                nameEn: 'Development Project',
              };

              const completedMilestones = item.milestones.filter((m) => m.isDone).length;
              const totalMilestones = item.milestones.length;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 hover:border-neutral-300 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Top Meta Line: Category Badge + Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                        {getCategoryIcon(item.category)}
                        <span>{language === 'bn' ? catConfig.nameBn : catConfig.nameEn}</span>
                      </div>

                      <span
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </div>

                    {/* Title in authentic serif */}
                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 leading-[1.4] font-serif-bangla">
                      {language === 'bn' ? item.titleBn : item.titleEn}
                    </h3>

                    {/* Summary with comfortable line-height */}
                    <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-[1.65]">
                      {language === 'bn' ? item.summaryBn : item.summaryEn}
                    </p>

                    {/* Target Year & Scope */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 mt-3 pt-3 border-t border-neutral-100">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{language === 'bn' ? 'মেয়াদ:' : 'Target:'} </span>
                        <span className="font-semibold text-neutral-800">{item.targetYear}</span>
                      </div>
                      {item.budgetOrScope && (
                        <div className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{language === 'bn' ? 'পরিসর:' : 'Scope:'} </span>
                          <span className="font-medium text-neutral-700">{item.budgetOrScope}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar with Percentage */}
                    <div className="mt-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-neutral-700">
                          {language === 'bn' ? 'বাস্তবায়ন অগ্রগতি' : 'Execution Progress'}
                        </span>
                        <span className="font-extrabold text-emerald-800 font-mono-num text-sm">
                          %{item.progressPercentage}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.progressPercentage >= 100
                              ? 'bg-emerald-600'
                              : item.progressPercentage >= 50
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-500'
                              : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, item.progressPercentage)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-neutral-500 mt-1.5">
                        <span>
                          {language === 'bn'
                            ? `মাইলস্টোন অর্জিত: ${completedMilestones}/${totalMilestones}`
                            : `Milestones: ${completedMilestones}/${totalMilestones}`}
                        </span>
                        <span>{language === 'bn' ? `হালনাগাদ: ${item.lastUpdated}` : `Updated: ${item.lastUpdated}`}</span>
                      </div>
                    </div>

                    {/* Expanded Detail View: Full Description & Milestone Checklist */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-neutral-200 space-y-4 animate-fadeIn">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                            {language === 'bn' ? 'বিস্তারিত কর্মপরিকল্পনা ও লক্ষ্য' : 'Strategic Action Plan'}
                          </h4>
                          <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-200/60">
                            {language === 'bn' ? item.descriptionBn : item.descriptionEn}
                          </p>
                        </div>

                        {/* Milestones Checklist */}
                        <div>
                          <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{language === 'bn' ? 'বাস্তবায়নের মূল ধাপসমূহ (মাইলস্টোন)' : 'Key Implementation Milestones'}</span>
                          </h4>
                          <ul className="space-y-2">
                            {item.milestones.map((m) => (
                              <li
                                key={m.id}
                                className={`flex items-start gap-2.5 p-2 rounded-lg text-xs border ${
                                  m.isDone
                                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 font-medium'
                                    : 'bg-white border-neutral-200 text-neutral-600'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                                    m.isDone ? 'bg-emerald-600 text-white' : 'border border-neutral-300 bg-neutral-50'
                                  }`}
                                >
                                  {m.isDone && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="leading-snug">
                                  {language === 'bn' ? m.textBn : m.textEn}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expand/Collapse Toggle Button */}
                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-neutral-400 font-medium">
                        {language === 'bn' ? 'ধামতী ইউনিয়ন পরিষদ ও সেবাদল' : 'Dhamti Civic Leadership'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors cursor-pointer shrink-0"
                    >
                      <span>
                        {isExpanded
                          ? language === 'bn'
                            ? 'সংক্ষিপ্ত করুন'
                            : 'Show Less'
                          : language === 'bn'
                          ? 'মাইলস্টোন ও বিস্তারিত দেখুন'
                          : 'View Milestones & Details'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Commitment Assurance Footer Notice */}
        <div className="mt-10 p-5 bg-gradient-to-r from-emerald-900 to-emerald-950 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white">
                {language === 'bn' ? 'প্রতিটি প্রতিশ্রুতি বাস্তবায়নে আমরা অঙ্গীকারবদ্ধ' : 'Accountable to Every Single Pledge'}
              </h4>
              <p className="text-xs text-emerald-200 mt-0.5 leading-relaxed">
                {language === 'bn'
                  ? 'আপনার কোনো পরামর্শ বা অঙ্গীকারের কাজ নিয়ে মতামত থাকলে সরাসরি আমাদের "উপদেশ ও পরামর্শ" ট্যাবের মাধ্যমে জানাতে পারেন।'
                  : 'Have suggestions or feedback regarding any of our commitments? Share your advice directly through our citizen portal.'}
              </p>
            </div>
          </div>
          <a
            href="#problem-feed"
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-neutral-950 text-xs font-bold rounded-xl whitespace-nowrap transition-all shadow-sm"
          >
            {language === 'bn' ? 'পরামর্শ ও অভিযোগ দেখুন' : 'View Citizen Submissions'}
          </a>
        </div>

      </div>
    </section>
  );
};
