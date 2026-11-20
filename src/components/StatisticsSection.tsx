import React from 'react';
import { Language, PublicStats } from '../types';
import { CATEGORIES, INITIAL_AREAS } from '../data/mockData';
import { Users, CheckCircle, Clock, MapPin, Layers, ShieldCheck } from 'lucide-react';

interface StatisticsSectionProps {
  language: Language;
  stats: PublicStats | null;
  wardVillages: Record<string, string>;
}

/** ৫-এর কম হলে সার্ভার সংখ্যা পাঠায় না (null); আমরা "৫-এর কম" লিখি */
const fmt = (n: number | null | undefined, bn: boolean): string => {
  if (n === null || n === undefined) return bn ? '৫-এর কম' : 'Fewer than 5';
  return n.toLocaleString(bn ? 'bn-BD' : 'en-US');
};

const monthLabel = (m: string, bn: boolean): string => {
  const [y, mo] = m.split('-').map(Number);
  if (!y || !mo) return m;
  return new Date(y, mo - 1, 1).toLocaleDateString(bn ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'long' });
};

export const StatisticsSection: React.FC<StatisticsSectionProps> = ({ language, stats, wardVillages }) => {
  const bn = language === 'bn';
  const catName = (id: string) => {
    const c = CATEGORIES.find((x) => x.id === id);
    return c ? (bn ? c.nameBn : c.nameEn) : id;
  };
  const maxCat = Math.max(1, ...(stats?.categories.map((c) => c.count) || [1]));
  const maxMonth = Math.max(1, ...(stats?.monthly.map((m) => m.count) || [1]));

  return (
    <section id="statistics" className="py-12 sm:py-16 bg-neutral-50/70 border-b border-neutral-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
            {bn ? 'স্বচ্ছ নাগরিক তথ্য' : 'Citizen Transparency'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mt-1 font-serif-bangla leading-[1.3]">
            {bn ? 'ধামতী ইউনিয়নের অভিযোগ ও পরামর্শের পরিসংখ্যান' : 'Complaints & Suggestions Statistics, Dhamti Union'}
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 mt-2 leading-relaxed">
            {bn
              ? 'এখানে শুধু মোট সংখ্যা দেখানো হয়। কারও নাম, নম্বর বা অভিযোগের লেখা কখনো প্রকাশ করা হয় না।'
              : 'Only overall counts are shown. No name, number or report text is ever published.'}
          </p>
        </div>

        {!stats ? (
          <p className="text-center text-neutral-500 py-10">{bn ? 'পরিসংখ্যান লোড হচ্ছে…' : 'Loading statistics…'}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-10">
              {[
                { icon: Users, label: bn ? 'মোট জমা' : 'Total received', value: fmt(stats.total, bn), tone: 'text-neutral-900' },
                { icon: Layers, label: bn ? 'জমা হয়েছে (নতুন)' : 'New', value: fmt(stats.submitted, bn), tone: 'text-neutral-900' },
                { icon: Clock, label: bn ? 'পর্যালোচনাধীন' : 'Under review', value: fmt(stats.underReview, bn), tone: 'text-blue-800' },
                { icon: CheckCircle, label: bn ? 'পর্যালোচনা সম্পন্ন' : 'Review done', value: fmt(stats.reviewDone, bn), tone: 'text-emerald-800' },
              ].map((c) => (
                <div key={c.label} className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs">
                  <div className="flex items-center gap-1.5 text-neutral-500 mb-2">
                    <c.icon className="w-4 h-4" aria-hidden="true" />
                    <span className="text-xs font-medium">{c.label}</span>
                  </div>
                  <div className={`text-2xl sm:text-3xl font-bold ${c.tone}`}>{c.value}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200">
                <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900 mb-4">
                  <MapPin className="w-4 h-4 text-emerald-700" aria-hidden="true" /> {bn ? 'ওয়ার্ড অনুযায়ী' : 'By ward'}
                </h3>
                <p className="text-xs text-neutral-500 mb-3">
                  {bn ? 'ওয়ার্ডে চাপুন, কোন বিষয়ে কতটি অভিযোগ তা দেখুন।' : 'Tap a ward to see how many reports per topic.'}
                </p>
                <ul className="space-y-2">
                  {stats.wards.map((w) => {
                    const area = INITIAL_AREAS.find((a) => a.wardNumber === w.ward);
                    const villages = (wardVillages[w.ward] || '').trim();
                    const top = w.categories[0];
                    const maxW = Math.max(1, ...w.categories.map((c) => c.count), w.otherCount || 0);
                    return (
                      <li key={w.ward} className="rounded-xl border border-neutral-200 overflow-hidden">
                        <details>
                          <summary className="cursor-pointer list-none px-3 py-3 flex items-start justify-between gap-3 active:bg-neutral-50">
                            <span className="min-w-0">
                              <span className="block text-sm font-bold text-neutral-900">{area ? (bn ? area.wardNameBn : area.wardNameEn) : w.ward}</span>
                              {villages && <span className="block text-xs text-neutral-500 truncate">{villages}</span>}
                              {top && (
                                <span className="block text-xs text-emerald-800 font-semibold mt-0.5">
                                  {bn ? 'সবচেয়ে বেশি: ' : 'Top: '}
                                  {catName(top.id)} ({fmt(top.count, bn)})
                                </span>
                              )}
                            </span>
                            <span className="text-base font-extrabold text-neutral-900 shrink-0">{fmt(w.total, bn)}</span>
                          </summary>
                          <div className="px-3 pb-3 pt-1 border-t border-neutral-100 bg-neutral-50/60">
                            {w.categories.length === 0 && (w.otherCount === 0 || w.otherCount === null) ? (
                              <p className="text-xs text-neutral-500 py-2">
                                {bn ? 'বিষয়ভিত্তিক সংখ্যা দেখাতে যথেষ্ট অভিযোগ এখনো জমা হয়নি।' : 'Not enough reports yet to show a topic breakdown.'}
                              </p>
                            ) : (
                              <ul className="space-y-2.5 pt-2">
                                {w.categories.map((c) => (
                                  <li key={c.id}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="font-semibold text-neutral-800">{catName(c.id)}</span>
                                      <span className="font-bold text-neutral-900">{fmt(c.count, bn)}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                                      <div className="h-full bg-emerald-600" style={{ width: `${Math.round((c.count / maxW) * 100)}%` }} />
                                    </div>
                                  </li>
                                ))}
                                {(w.otherCount || 0) > 0 && (
                                  <li className="flex justify-between text-sm text-neutral-600">
                                    <span>{bn ? 'অন্যান্য বিষয় (কম সংখ্যক)' : 'Other (small counts)'}</span>
                                    <span className="font-bold">{fmt(w.otherCount, bn)}</span>
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl border border-neutral-200">
                  <h3 className="text-base font-bold text-neutral-900 mb-4">{bn ? 'সমস্যার ধরন অনুযায়ী' : 'By type'}</h3>
                  {stats.categories.length === 0 && !stats.otherSmallCategories ? (
                    <p className="text-sm text-neutral-500">{bn ? 'যথেষ্ট সংখ্যক অভিযোগ জমা হলে এখানে দেখা যাবে।' : 'Shown once enough reports are received.'}</p>
                  ) : (
                    <ul className="space-y-3">
                      {stats.categories.map((c) => (
                        <li key={c.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-semibold text-neutral-800">{catName(c.id)}</span>
                            <span className="font-bold text-neutral-900">{fmt(c.count, bn)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                            <div className="h-full bg-emerald-600" style={{ width: `${Math.round((c.count / maxCat) * 100)}%` }} />
                          </div>
                        </li>
                      ))}
                      {(stats.otherSmallCategories ?? 0) > 0 && (
                        <li className="flex justify-between text-sm text-neutral-600">
                          <span>{bn ? 'অন্যান্য (কম সংখ্যক বিষয়)' : 'Other (small counts)'}</span>
                          <span className="font-bold">{fmt(stats.otherSmallCategories, bn)}</span>
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {stats.monthly.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-neutral-200">
                    <h3 className="text-base font-bold text-neutral-900 mb-4">{bn ? 'মাস অনুযায়ী' : 'By month'}</h3>
                    <ul className="space-y-2">
                      {stats.monthly.map((m) => (
                        <li key={m.month} className="flex items-center gap-3 text-sm">
                          <span className="w-28 shrink-0 text-neutral-700">{monthLabel(m.month, bn)}</span>
                          <span className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                            <span className="block h-full bg-emerald-600" style={{ width: `${Math.round((m.count / maxMonth) * 100)}%` }} />
                          </span>
                          <span className="w-10 text-right font-bold text-neutral-900">{fmt(m.count, bn)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-6 flex items-start justify-center gap-1.5 text-xs text-neutral-500 text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>
                {bn
                  ? 'পাঁচটির কম হলে সংখ্যা লুকানো থাকে, যাতে কোনো ব্যক্তিকে চেনা না যায়।'
                  : 'Counts below five are hidden so that no individual can be identified.'}
              </span>
            </p>
          </>
        )}
      </div>
    </section>
  );
};
