import React, { useState } from 'react';
import { Language, ProblemReport, ProblemStatus } from '../types';
import { UI_STRINGS, CATEGORIES, INITIAL_AREAS } from '../data/mockData';
import { STATUS_LABEL_BN, STATUS_LABEL_EN } from '../data/statuses';
import { X, Search, CheckCircle2, Clock, AlertCircle, MapPin, Calendar, ShieldCheck } from 'lucide-react';
import { readContact } from '../services/myReports';
import { api } from '../services/api';

interface TrackProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

/** তিন ধাপের মূল পথ; "তথ্য প্রয়োজন / দিকনির্দেশনা / যোগাযোগ" মাঝের ধাপের ভেতরের অবস্থা */
const MAIN_STEPS: { id: ProblemStatus; bn: string; en: string }[] = [
  { id: 'submitted', bn: 'জমা হয়েছে', en: 'Submitted' },
  { id: 'under_review', bn: 'পর্যালোচনাধীন', en: 'Under review' },
  { id: 'review_done', bn: 'পর্যালোচনা সম্পন্ন', en: 'Review done' },
];

const stepIndex = (status: ProblemStatus): number => {
  if (status === 'submitted') return 0;
  if (status === 'review_done') return 2;
  return 1;
};

export const TrackProblemModal: React.FC<TrackProblemModalProps> = ({ isOpen, onClose, language }) => {
  const strings = UI_STRINGS[language];
  const bn = language === 'bn';
  const [phone, setPhone] = useState(() => readContact().phone);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<ProblemReport[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  if (!isOpen) return null;

  const result = results.find((p) => p.id === selectedId) || results[0] || null;
  const label = (s: ProblemStatus) => (bn ? STATUS_LABEL_BN[s] : STATUS_LABEL_EN[s]) || s;
  const categoryName = (id: string) => {
    const c = CATEGORIES.find((x) => x.id === id);
    return c ? (bn ? c.nameBn : c.nameEn) : id;
  };
  const wardName = (id: string) => {
    const w = INITIAL_AREAS.find((x) => x.wardNumber === id);
    return w ? (bn ? w.wardNameBn : w.wardNameEn) : id;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || loading) return;
    setSearched(false);
    setSearchError('');
    setLoading(true);
    try {
      const list = await api.track(phone.trim());
      setResults(list);
      setSelectedId(list[0]?.id || '');
    } catch (err) {
      setResults([]);
      setSelectedId('');
      setSearchError(
        err instanceof Error && err.message ? err.message : bn ? 'ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।' : 'Network problem. Please try again.'
      );
    } finally {
      setSearched(true);
      setLoading(false);
    }
  };

  const badge = (status: ProblemStatus) => {
    if (status === 'review_done') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {label(status)}
        </span>
      );
    }
    if (status === 'submitted') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
          <AlertCircle className="w-4 h-4 text-neutral-500" /> {label(status)}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
        <Clock className="w-4 h-4 text-blue-600" /> {label(status)}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="px-5 sm:px-6 py-4 sm:py-5 bg-neutral-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base sm:text-lg font-bold font-serif-bangla leading-snug">{strings.trackModalTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={bn ? 'বন্ধ করুন' : 'Close'}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={bn ? 'মোবাইল নম্বর (০১৭XXXXXXXX)' : 'Mobile number (017XXXXXXXX)'}
              className="flex-1 min-w-0 px-3 sm:px-4 py-3 text-base bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 disabled:opacity-60 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-base rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              {loading ? (bn ? 'খোঁজা হচ্ছে…' : 'Searching…') : strings.searchBtn}
            </button>
          </form>

          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
            {bn
              ? 'অভিযোগ করার সময় যে মোবাইল নম্বর দিয়েছিলেন সেটি লিখুন। আর কিছু লাগবে না।'
              : 'Enter the mobile number you used when reporting. Nothing else is needed.'}
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-neutral-500 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {bn
                ? 'গোপনীয়তার জন্য এখানে শুধু অবস্থা, ধরন, ওয়ার্ড ও তারিখ দেখা যায়। আপনার নাম, নম্বর বা অভিযোগের লেখা কখনো দেখানো হয় না।'
                : 'For privacy, only the status, type, ward and date are shown here. Your name, number and report text are never displayed.'}
            </span>
          </p>

          {searchError && (
            <div role="alert" className="mt-5 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-sm font-semibold">
              {searchError}
            </div>
          )}

          {searched && !result && !searchError && (
            <div className="mt-6 p-6 text-center bg-neutral-50 rounded-2xl border border-neutral-200">
              <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-base font-semibold text-neutral-800">
                {bn ? 'এই নম্বরে কোনো অভিযোগ পাওয়া যায়নি।' : 'No report found for this number.'}
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                {bn ? 'অভিযোগের সময় যে নম্বর দিয়েছিলেন ঠিক সেটি লিখুন।' : 'Use the exact number you reported with.'}
              </p>
            </div>
          )}

          {results.length > 1 && (
            <div className="mt-5">
              <p className="text-sm font-bold text-neutral-800 mb-2">
                {bn ? `এই নম্বরে ${results.length}টি অভিযোগ পাওয়া গেছে, বেছে নিন:` : `${results.length} reports found, choose one:`}
              </p>
              <div className="space-y-2">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 ${
                      result?.id === p.id ? 'border-emerald-600 bg-emerald-50' : 'border-neutral-200 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-neutral-900 truncate">
                        {categoryName(p.category)} · {new Date(p.createdAt).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                      </span>
                      <span className="block text-xs font-mono text-neutral-500">{p.trackingCode}</span>
                    </span>
                    <span className="shrink-0">{badge(p.status)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className="mt-6 p-5 bg-neutral-50/70 rounded-2xl border border-neutral-200 space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        result.submissionType === 'advice' ? 'bg-indigo-600 text-white' : 'bg-emerald-700 text-white'
                      }`}
                    >
                      {result.submissionType === 'advice' ? (bn ? 'উপদেশ ও পরামর্শ' : 'Advice') : bn ? 'অভিযোগ' : 'Complaint'}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-800">{result.trackingCode}</span>
                  </div>
                  <h4 className="text-base font-bold text-neutral-900 mt-0.5">{categoryName(result.category)}</h4>
                </div>
                <div>{badge(result.status)}</div>
              </div>

              <div>
                <p className="text-sm font-bold text-neutral-800 mb-3">{bn ? 'এখন যে ধাপে আছে' : 'Where it stands now'}</p>
                <ol className="grid grid-cols-3 gap-1">
                  {MAIN_STEPS.map((st, i) => {
                    const current = stepIndex(result.status);
                    const done = i <= current;
                    const isNow = i === current;
                    return (
                      <li key={st.id} className="flex flex-col items-center text-center">
                        <div className="flex items-center w-full">
                          <span className={`flex-1 h-1 ${i === 0 ? 'bg-transparent' : done ? 'bg-emerald-600' : 'bg-neutral-200'}`} />
                          <span
                            className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                              done ? 'bg-emerald-700 text-white' : 'bg-neutral-200 text-neutral-500'
                            } ${isNow ? 'ring-4 ring-emerald-200' : ''}`}
                          >
                            {done ? '✓' : i + 1}
                          </span>
                          <span className={`flex-1 h-1 ${i === MAIN_STEPS.length - 1 ? 'bg-transparent' : i < current ? 'bg-emerald-600' : 'bg-neutral-200'}`} />
                        </div>
                        <span className={`mt-1.5 text-xs leading-tight ${isNow ? 'font-bold text-emerald-800' : 'text-neutral-600'}`}>
                          {bn ? st.bn : st.en}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {stepIndex(result.status) === 1 && result.status !== 'under_review' && (
                  <p className="mt-3 text-center text-sm font-semibold text-blue-800 bg-blue-50 border border-blue-100 rounded-xl py-2 px-3">
                    {label(result.status)}
                  </p>
                )}
              </div>

              <div className="text-xs text-neutral-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{wardName(result.ward)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{new Date(result.createdAt).toLocaleString(bn ? 'bn-BD' : 'en-US')}</span>
                </div>
              </div>

              {result.resolutionNote && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                  <span className="font-bold block mb-0.5">{strings.officialNotes}:</span>
                  {result.resolutionNote}
                </div>
              )}

              <div className="pt-3 border-t border-neutral-200">
                <h5 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3">
                  {bn ? 'পদক্ষেপের ইতিহাস' : 'Action Timeline'}
                </h5>
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-neutral-200">
                  {result.timeline.map((step, idx) => (
                    <div key={step.id || idx} className="relative flex items-start gap-3 pl-1">
                      <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold z-10 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 bg-white p-2.5 rounded-xl border border-neutral-200 text-xs shadow-2xs">
                        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                          <span className="font-semibold text-neutral-700">{label(step.status)}</span>
                          <span>{new Date(step.timestamp).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}</span>
                        </div>
                        <p className="text-neutral-700">{bn ? step.noteBn : step.noteEn}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
