import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Language, ProblemReport, AreaStat, CategoryStat, LeaderProfile, ManifestoItem, PublicStats } from './types';
import { INITIAL_AREAS, CATEGORIES, DEFAULT_PROFILE } from './data/mockData';
import { INITIAL_MANIFESTO_ITEMS } from './data/manifestoData';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ManifestoSection } from './components/ManifestoSection';
import { StatisticsSection } from './components/StatisticsSection';
import { SubmitProblemModal } from './components/SubmitProblemModal';
import { TrackProblemModal } from './components/TrackProblemModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { MobileActionBar } from './components/MobileActionBar';

// অ্যাডমিন প্যানেল ভারী (১২০ KB+); সাধারণ ভিজিটরের ফোনে লোড না করে শুধু খুললে আনা হয়
const AdminSectionModal = lazy(() =>
  import('./components/AdminSectionModal').then((m) => ({ default: m.AdminSectionModal }))
);
import { Footer } from './components/Footer';
import { api, ApiError } from './services/api';

// আগের সংস্করণ এই চাবিতে অভিযোগের তালিকা ব্রাউজারে রাখত; গোপনীয়তার জন্য এখন মুছে দেওয়া হয়
const LEGACY_KEY_PROBLEMS = 'dhamti_real_problems_v1';
const STORAGE_KEY_PROFILE = 'dhamti_leader_profile_v1';
const STORAGE_KEY_VILLAGES = 'dhamti_ward_villages_v1';
const STORAGE_KEY_MANIFESTO = 'dhamti_electoral_manifesto_v2';

export default function App() {
  const [language, setLanguage] = useState<Language>('bn');

  // সবার জন্য শুধু সমষ্টিগত পরিসংখ্যান (কোনো ব্যক্তিগত অভিযোগ ব্রাউজারে আসে না)
  const [stats, setStats] = useState<PublicStats | null>(null);
  const loadStats = () => {
    api
      .getStats()
      .then(setStats)
      .catch(() => undefined);
  };

  // Persistent Leader Profile with Hardcoded Permanent Portrait
  const [leaderProfile, setLeaderProfile] = useState<LeaderProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_PROFILE, ...parsed };
      }
    } catch {
      // ignore
    }
    return DEFAULT_PROFILE;
  });

  // ওয়ার্ডের গ্রামের নাম (অ্যাডমিন বদলাতে পারেন): { 'ward-01': 'গ্রাম১, গ্রাম২' }
  const [wardVillages, setWardVillages] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VILLAGES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Persistent Electoral Manifesto (updated directly by admin)
  const [manifestoItems, setManifestoItems] = useState<ManifestoItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MANIFESTO);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_MANIFESTO_ITEMS;
  });


  // ছোট বার্তা-বার (সার্ভারে কাজ ব্যর্থ হলে অ্যাডমিন/নাগরিক জানতে পারবেন)
  const [notice, setNotice] = useState<string>('');
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  const failMessage = (err: unknown, fallback: string) =>
    err instanceof ApiError ? err.message : fallback;

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Initial Fetch from Turso DB
  useEffect(() => {
    let isMounted = true;
    async function fetchFromTurso() {
      try {
        try {
          localStorage.removeItem(LEGACY_KEY_PROBLEMS);
          localStorage.removeItem('dhamti_my_reports_v1');
        } catch {
          // ignore
        }
        const [dbStats, dbManifesto, dbProfile, dbSettings] = await Promise.all([
          api.getStats().catch(() => null),
          api.getManifesto().catch(() => null),
          api.getProfile().catch(() => null),
          api.getSettings().catch(() => null),
        ]);
        if (!isMounted) return;

        if (dbStats) setStats(dbStats);
        // ফাঁকা তালিকাও সত্য (ইশতেহার এখনো প্রকাশিত হয়নি), তাই পুরনো ক্যাশ ঝেড়ে ফেলি
        if (dbManifesto && Array.isArray(dbManifesto)) {
          setManifestoItems(dbManifesto);
        }
        if (dbSettings && dbSettings.wardVillages && typeof dbSettings.wardVillages === 'object') {
          setWardVillages(dbSettings.wardVillages);
        }
        if (dbProfile && dbProfile.name) {
          setLeaderProfile((prev) => ({
            ...prev,
            ...dbProfile,
            phone: dbProfile.phone || DEFAULT_PROFILE.phone,
            email: dbProfile.email || DEFAULT_PROFILE.email,
            profileImage: dbProfile.profileImage || '/leader.jpg',
          }));
        }
      } catch (err) {
        console.warn('Initial load from Turso DB notice:', err);
      }
    }
    fetchFromTurso();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync leader profile to localStorage as local cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(leaderProfile));
    } catch {
      // storage unavailable
    }
  }, [leaderProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VILLAGES, JSON.stringify(wardVillages));
    } catch {
      // storage unavailable
    }
  }, [wardVillages]);

  // Sync manifesto to localStorage as local cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MANIFESTO, JSON.stringify(manifestoItems));
    } catch {
      // storage unavailable
    }
  }, [manifestoItems]);

  // Ward list with villages (counts come from the public stats, never from private records)
  const computedAreas: AreaStat[] = useMemo(() => {
    return INITIAL_AREAS.map((area) => {
      const villages = (wardVillages[area.wardNumber] || '').trim();
      return {
        ...area,
        wardNameBn: villages ? `${area.wardNameBn} (${villages})` : area.wardNameBn,
        wardNameEn: villages ? `${area.wardNameEn} (${villages})` : area.wardNameEn,
        totalProblems: stats?.wards.find((w) => w.ward === area.wardNumber)?.total ?? 0,
        resolvedProblems: 0,
      };
    });
  }, [stats, wardVillages]);

  const computedCategories: CategoryStat[] = useMemo(
    () => CATEGORIES.map((cat) => ({ ...cat, count: stats?.categories.find((c) => c.id === cat.id)?.count ?? 0 })),
    [stats]
  );

  // নতুন অভিযোগ/পরামর্শ: আগে সার্ভারে সংরক্ষণ, সফল হলে তবেই পর্দায় ও কোড দেখানো।
  // ব্যর্থ হলে ত্রুটি ছুঁড়ে দেওয়া হয়, ফর্ম সেটা দেখাবে।
  const handleAddNewProblem = async (newProblem: ProblemReport & { consent: boolean }): Promise<ProblemReport> => {
    const created = await api.createProblem(newProblem);
    loadStats();
    return created;
  };

  // Manifesto Admin handlers with Turso DB sync
  const handleUpdateManifestoItem = async (updated: ManifestoItem) => {
    try {
      const saved = await api.updateManifestoItem(updated);
      setManifestoItems((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
    } catch (err) {
      console.error('Failed to update manifesto item in Turso DB:', err);
      setNotice(failMessage(err, 'সংরক্ষণ করা যায়নি। আবার লগইন করে চেষ্টা করুন।'));
    }
  };

  const handleAddManifestoItem = async (newItem: ManifestoItem) => {
    try {
      const saved = await api.createManifestoItem(newItem);
      setManifestoItems((prev) => [saved, ...prev]);
    } catch (err) {
      console.error('Failed to create manifesto item in Turso DB:', err);
      setNotice(failMessage(err, 'সংরক্ষণ করা যায়নি। আবার লগইন করে চেষ্টা করুন।'));
    }
  };

  const handleDeleteManifestoItem = async (itemId: string) => {
    try {
      await api.deleteManifestoItem(itemId);
      setManifestoItems((prev) => prev.filter((m) => m.id !== itemId));
    } catch (err) {
      console.error('Failed to delete manifesto item in Turso DB:', err);
      setNotice(failMessage(err, 'মোছা যায়নি। আবার লগইন করে চেষ্টা করুন।'));
    }
  };

  const handleDeleteCompletedManifestos = async () => {
    try {
      await api.deleteCompletedManifestos();
      setManifestoItems((prev) => prev.filter((m) => m.status !== 'completed'));
    } catch (err) {
      console.error('Failed to delete completed manifestos in Turso DB:', err);
      setNotice(failMessage(err, 'মোছা যায়নি। আবার লগইন করে চেষ্টা করুন।'));
    }
  };

  const handleResetManifesto = async () => {
    try {
      const items = await api.resetManifesto();
      setManifestoItems(items);
    } catch (err) {
      console.error('Failed to reset manifesto in Turso DB:', err);
      setNotice(failMessage(err, 'রিসেট করা যায়নি। আবার লগইন করে চেষ্টা করুন।'));
    }
  };

  // অ্যাডমিন ফর্মের জন্য: ব্যর্থ হলে ত্রুটি ছুঁড়ি, ফর্ম নিজেই কারণ দেখায়
  const handleUpdateLeaderProfile = async (updated: LeaderProfile) => {
    const saved = await api.updateProfile(updated);
    setLeaderProfile((prev) => ({ ...prev, ...saved }));
  };

  // ছবি বদলানো (dataUrl) বা মুছে আগের ছবিতে ফেরা (null)
  const handleSetLeaderPhoto = async (dataUrl: string | null) => {
    const saved = dataUrl ? await api.setProfilePhoto(dataUrl) : await api.resetProfilePhoto();
    setLeaderProfile((prev) => ({ ...prev, ...saved }));
  };

  const handleSaveWardVillages = async (villages: Record<string, string>) => {
    const saved = await api.updateSettings({ wardVillages: villages });
    setWardVillages(saved.wardVillages || {});
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 pb-24 md:pb-0">
      {/* Top Bar Header (Clean Citizen View) */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenTrackModal={() => setIsTrackModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section matching sketch with Leader Representation & Slogan Pedestal */}
        <HeroSection
          language={language}
          onOpenReportModal={() => setIsReportModalOpen(true)}
          onOpenTrackModal={() => setIsTrackModalOpen(true)}
          totalProblemsCount={stats?.total ?? 0}
          resolvedProblemsCount={stats ? stats.reviewDone : null}
          leaderProfile={leaderProfile}
        />

        {/* Dedicated Electoral Manifesto Section (Updated live by Admin) */}
        <ManifestoSection
          language={language}
          manifestoItems={manifestoItems}
          onOpenAdmin={() => setIsAdminModalOpen(true)}
          onOpenReportModal={() => setIsReportModalOpen(true)}
        />

        {/* সমষ্টিগত পরিসংখ্যান (৫-এর কম লুকানো) */}
        <StatisticsSection language={language} stats={stats} wardVillages={wardVillages} />
      </main>

      {/* Modals & Overlays */}
      <SubmitProblemModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        language={language}
        areas={computedAreas}
        categories={computedCategories}
        onSubmit={handleAddNewProblem}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
      />

      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} language={language} />

      <TrackProblemModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        language={language}
      />

      {/* Complete Dedicated Admin Section Modal */}
      {isAdminModalOpen && (
        <Suspense fallback={null}>
          <AdminSectionModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
            language={language}
            areas={computedAreas}
            categories={computedCategories}
            leaderProfile={leaderProfile}
            manifestoItems={manifestoItems}
            onUpdateLeaderProfile={handleUpdateLeaderProfile}
            onSetLeaderPhoto={handleSetLeaderPhoto}
            wardVillages={wardVillages}
            onSaveWardVillages={handleSaveWardVillages}
            onStatsChanged={loadStats}
            onUpdateManifestoItem={handleUpdateManifestoItem}
            onAddManifestoItem={handleAddManifestoItem}
            onDeleteManifestoItem={handleDeleteManifestoItem}
            onDeleteCompletedManifestos={handleDeleteCompletedManifestos}
            onResetManifesto={handleResetManifesto}
          />
        </Suspense>
      )}

      {notice && (
        <div
          role="alert"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-md z-[60] bg-red-700 text-white text-base font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-start gap-3"
        >
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="shrink-0 px-2 text-xl leading-none" aria-label="বন্ধ করুন">
            ×
          </button>
        </div>
      )}

      <MobileActionBar
        language={language}
        phone={leaderProfile.phone}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenTrackModal={() => setIsTrackModalOpen(true)}
      />

      {/* Quiet Footer with Admin access */}
      <Footer
        language={language}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenTrackModal={() => setIsTrackModalOpen(true)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        leaderProfile={leaderProfile}
      />
    </div>
  );
}
