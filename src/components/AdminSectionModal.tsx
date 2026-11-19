import React, { useState, useEffect } from 'react';
import { 
  Language, 
  ProblemReport, 
  ProblemStatus, 
  LeaderProfile, 
  AreaStat, 
  CategoryStat,
  ManifestoItem,
  ManifestoCategory,
  ManifestoStatus,
  ManifestoMilestone
} from '../types';
import { MANIFESTO_CATEGORIES_CONFIG, INITIAL_MANIFESTO_ITEMS } from '../data/manifestoData';
import { LEADER_PERMANENT_PHOTO_URL, INITIAL_AREAS } from '../data/mockData';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  Download, 
  ShieldCheck,
  Lock,
  Unlock,
  Settings,
  ListFilter,
  Phone,
  Mail,
  MapPin,
  Trash2,
  RefreshCw,
  PlusCircle,
  Lightbulb,
  AlertTriangle,
  Award,
  Edit3,
  Check,
  Layers,
  Sparkles,
  Target,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Database
} from 'lucide-react';
import { sanitizeString, sanitizeForCsv } from '../services/security';
import { api, ApiError, DbStatusInfo } from '../services/api';
import { prepareProfilePhoto, PhotoPrepError } from '../services/photo';

interface AdminSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  problems: ProblemReport[];
  areas: AreaStat[];
  categories: CategoryStat[];
  leaderProfile: LeaderProfile;
  manifestoItems: ManifestoItem[];
  onUpdateLeaderProfile: (updatedProfile: LeaderProfile) => Promise<void>;
  onSetLeaderPhoto: (dataUrl: string | null) => Promise<void>;
  wardVillages: Record<string, string>;
  onSaveWardVillages: (villages: Record<string, string>) => Promise<void>;
  onUpdateProblemStatus: (problemId: string, newStatus: ProblemStatus, noteText: string, officerName: string) => void;
  onDeleteProblem: (problemId: string) => void;
  onUpdateManifestoItem: (updatedItem: ManifestoItem) => void;
  onAddManifestoItem: (newItem: ManifestoItem) => void;
  onDeleteManifestoItem: (itemId: string) => void;
  onDeleteCompletedManifestos?: () => void;
  onResetManifesto: () => void;
}

export const AdminSectionModal: React.FC<AdminSectionModalProps> = ({
  isOpen,
  onClose,
  language,
  problems: publicProblems,
  areas,
  categories,
  leaderProfile,
  manifestoItems,
  onUpdateLeaderProfile,
  onSetLeaderPhoto,
  wardVillages,
  onSaveWardVillages,
  onUpdateProblemStatus,
  onDeleteProblem,
  onUpdateManifestoItem,
  onAddManifestoItem,
  onDeleteManifestoItem,
  onDeleteCompletedManifestos,
  onResetManifesto,
}) => {
  // Admin Authentication State (সার্ভার-সাইড সেশন; ব্রাউজারে কোনো পাসওয়ার্ড/হ্যাশ থাকে না)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [authConfigured, setAuthConfigured] = useState<boolean>(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);

  // প্যানেল খুললে সার্ভারকে জিজ্ঞেস করি লগইন আছে কিনা
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setAuthChecking(true);
    api.adminSession().then((res) => {
      if (!alive) return;
      setIsAuthenticated(res.authenticated);
      setAuthConfigured(res.configured);
      setAuthChecking(false);
    });
    return () => {
      alive = false;
    };
  }, [isOpen]);

  // Active Tab: 'complaints' | 'manifesto' | 'profile_settings'
  const [activeTab, setActiveTab] = useState<'complaints' | 'manifesto' | 'profile_settings'>('complaints');
  const [mobileComplaintView, setMobileComplaintView] = useState<'list' | 'details'>('list');
  const [mobileManifestoView, setMobileManifestoView] = useState<'list' | 'editor'>('list');

  // Complaints / Advice Management State
  const [submissionTypeFilter, setSubmissionTypeFilter] = useState<'all' | 'complaint' | 'advice'>('all');
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');
  const [targetStatus, setTargetStatus] = useState<ProblemStatus>('in_progress');
  const [officerName, setOfficerName] = useState('ধামতী ইউনিয়ন সেবাদল');
  const [actionNote, setActionNote] = useState('');
  const [complaintFilter, setComplaintFilter] = useState<'all' | 'pending' | 'reviewing' | 'in_progress' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Manifesto Manager State
  const [selectedManifestoId, setSelectedManifestoId] = useState<string>('');
  const [isAddingNewManifesto, setIsAddingNewManifesto] = useState(false);
  const [manifestoCategoryFilter, setManifestoCategoryFilter] = useState<string>('all');
  const [manifestoStatusFilter, setManifestoStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'planned'>('all');
  const [newMilestoneText, setNewMilestoneText] = useState('');

  // Inline Confirmation States (100% reliable, no blocked window.confirm)
  const [confirmDeleteManifestoId, setConfirmDeleteManifestoId] = useState<string | null>(null);
  const [confirmDeleteProblemId, setConfirmDeleteProblemId] = useState<string | null>(null);
  const [confirmDeleteAllCompleted, setConfirmDeleteAllCompleted] = useState<boolean>(false);
  const [confirmResetManifesto, setConfirmResetManifesto] = useState<boolean>(false);

  // New Manifesto Form State
  const [newPledgeTitleBn, setNewPledgeTitleBn] = useState('');
  const [newPledgeTitleEn, setNewPledgeTitleEn] = useState('');
  const [newPledgeCategory, setNewPledgeCategory] = useState<ManifestoCategory>('roads_infrastructure');
  const [newPledgeSummaryBn, setNewPledgeSummaryBn] = useState('');
  const [newPledgeDescBn, setNewPledgeDescBn] = useState('');
  const [newPledgeTargetYear, setNewPledgeTargetYear] = useState('২০২৬-২০২৭');
  const [newPledgeScope, setNewPledgeScope] = useState('');
  const [newPledgeProgress, setNewPledgeProgress] = useState(25);
  const [newPledgeStatus, setNewPledgeStatus] = useState<ManifestoStatus>('in_progress');

  // Profile Settings Form State
  const [editName, setEditName] = useState(leaderProfile.name);
  const [editDesignation, setEditDesignation] = useState(leaderProfile.designation);
  const [editPromise, setEditPromise] = useState(leaderProfile.promise);
  const [editMainSlogan, setEditMainSlogan] = useState(leaderProfile.mainSlogan);
  const [editSubSlogan, setEditSubSlogan] = useState(leaderProfile.subSlogan);
  const [editAnnouncement, setEditAnnouncement] = useState(leaderProfile.heroAnnouncement || '');
  const [editPhone, setEditPhone] = useState(leaderProfile.phone);
  const [editEmail, setEditEmail] = useState(leaderProfile.email);
  const [editAddress, setEditAddress] = useState(leaderProfile.officeAddress);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editVillages, setEditVillages] = useState<Record<string, string>>(wardVillages);
  const [isSavingVillages, setIsSavingVillages] = useState(false);
  const [villagesMsg, setVillagesMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Turso Database State
  const [dbStatus, setDbStatus] = useState<DbStatusInfo | null>(null);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      api.getStatus().then(setDbStatus).catch(() => {});
    }
  }, [isOpen, isAuthenticated]);

  // অ্যাডমিন লগইন থাকলে সার্ভার থেকে নাম-ফোনসহ পূর্ণ তালিকা আনি (সাধারণ তালিকায় এগুলো থাকে না)।
  // সাধারণ তালিকা বদলালে (স্ট্যাটাস/মোছা/নতুন জমা) এটিও নতুন করে আনা হয়।
  const [adminProblems, setAdminProblems] = useState<ProblemReport[] | null>(null);
  useEffect(() => {
    if (!isOpen || !isAuthenticated) {
      setAdminProblems(null);
      return;
    }
    let alive = true;
    api
      .adminGetProblems()
      .then((list) => {
        if (alive) setAdminProblems(list);
      })
      .catch(() => {
        // সেশন শেষ হলে সাধারণ তালিকাতেই থাকি
      });
    return () => {
      alive = false;
    };
  }, [isOpen, isAuthenticated, publicProblems]);
  const problems = adminProblems ?? publicProblems;

  useEffect(() => {
    if (problems.length > 0 && !selectedProblemId) {
      setSelectedProblemId(problems[0].id);
    }
  }, [problems, selectedProblemId]);

  useEffect(() => {
    if (manifestoItems.length > 0 && !selectedManifestoId) {
      setSelectedManifestoId(manifestoItems[0].id);
    }
  }, [manifestoItems, selectedManifestoId]);

  useEffect(() => {
    setEditName(leaderProfile.name);
    setEditDesignation(leaderProfile.designation);
    setEditPromise(leaderProfile.promise);
    setEditMainSlogan(leaderProfile.mainSlogan);
    setEditSubSlogan(leaderProfile.subSlogan);
    setEditPhone(leaderProfile.phone);
    setEditEmail(leaderProfile.email);
    setEditAddress(leaderProfile.officeAddress);
    setEditAnnouncement(leaderProfile.heroAnnouncement || '');
  }, [leaderProfile]);

  useEffect(() => {
    setEditVillages(wardVillages);
  }, [wardVillages]);

  if (!isOpen) return null;

  // সার্ভারে পাসওয়ার্ড দিয়ে লগইন
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying || !pinInput) return;

    setIsVerifying(true);
    setPinError('');
    try {
      await api.adminLogin(pinInput);
      setIsAuthenticated(true);
      setPinInput('');
    } catch (err) {
      setPinError(
        err instanceof ApiError
          ? err.message
          : language === 'bn'
          ? 'ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'
          : 'Network problem. Please try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogoutAdmin = async () => {
    await api.adminLogout();
    setIsAuthenticated(false);
    setPinInput('');
  };

  const errText = (err: unknown) =>
    err instanceof ApiError
      ? err.message
      : language === 'bn'
      ? 'ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'
      : 'Network problem. Please try again.';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;
    setProfileError('');
    setProfileSuccessMsg(false);
    setIsSavingProfile(true);
    try {
      // ছবি এখানে বদলায় না; আলাদা বাটনে বদলায়
      await onUpdateLeaderProfile({
        ...leaderProfile,
        name: sanitizeString(editName, 80),
        designation: sanitizeString(editDesignation, 120),
        promise: sanitizeString(editPromise, 150),
        mainSlogan: sanitizeString(editMainSlogan, 150),
        subSlogan: sanitizeString(editSubSlogan, 150),
        heroAnnouncement: sanitizeString(editAnnouncement, 200),
        phone: sanitizeString(editPhone, 30),
        email: sanitizeString(editEmail, 80),
        officeAddress: sanitizeString(editAddress, 200),
      });
      setProfileSuccessMsg(true);
      setTimeout(() => setProfileSuccessMsg(false), 4000);
    } catch (err) {
      setProfileError(errText(err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // একই ছবি আবার বাছাই করা যাবে
    if (!file || isSavingPhoto) return;
    setPhotoMsg(null);
    setIsSavingPhoto(true);
    try {
      const dataUrl = await prepareProfilePhoto(file);
      await onSetLeaderPhoto(dataUrl);
      setPhotoMsg({ ok: true, text: 'ছবি বদলানো হয়েছে।' });
    } catch (err) {
      if (err instanceof PhotoPrepError) {
        setPhotoMsg({
          ok: false,
          text:
            err.code === 'invalid_type'
              ? 'শুধু JPG, PNG বা WEBP ছবি দিন।'
              : err.code === 'too_large'
              ? 'ছবিটি অনেক বড়। ছোট একটি ছবি বাছুন।'
              : 'ছবিটি খোলা যায়নি। অন্য ছবি চেষ্টা করুন।',
        });
      } else {
        setPhotoMsg({ ok: false, text: errText(err) });
      }
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handlePhotoReset = async () => {
    if (isSavingPhoto) return;
    setPhotoMsg(null);
    setIsSavingPhoto(true);
    try {
      await onSetLeaderPhoto(null);
      setPhotoMsg({ ok: true, text: 'আগের মূল ছবিতে ফেরানো হয়েছে।' });
    } catch (err) {
      setPhotoMsg({ ok: false, text: errText(err) });
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleSaveVillages = async () => {
    if (isSavingVillages) return;
    setVillagesMsg(null);
    setIsSavingVillages(true);
    try {
      const cleaned: Record<string, string> = {};
      for (const w of INITIAL_AREAS) {
        const v = sanitizeString(editVillages[w.wardNumber] || '', 80);
        if (v) cleaned[w.wardNumber] = v;
      }
      await onSaveWardVillages(cleaned);
      setVillagesMsg({ ok: true, text: 'ওয়ার্ডের গ্রামের নাম সংরক্ষিত হয়েছে।' });
    } catch (err) {
      setVillagesMsg({ ok: false, text: errText(err) });
    } finally {
      setIsSavingVillages(false);
    }
  };


  // Filter complaints & advice
  const filteredProblems = problems.filter((p) => {
    if (submissionTypeFilter === 'complaint' && p.submissionType === 'advice') return false;
    if (submissionTypeFilter === 'advice' && p.submissionType !== 'advice') return false;
    if (complaintFilter !== 'all' && p.status !== complaintFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.trackingCode.toLowerCase().includes(q) ||
        p.specificLocation.toLowerCase().includes(q) ||
        p.citizenName.toLowerCase().includes(q) ||
        p.phone.includes(q)
      );
    }
    return true;
  });

  const currentProblem = filteredProblems.find((p) => p.id === selectedProblemId) || filteredProblems[0] || problems[0];

  const handleApplyStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProblem) return;

    const isAdvice = currentProblem.submissionType === 'advice';
    const defaultNotes: Record<ProblemStatus, string> = {
      reviewing: isAdvice
        ? 'নাগরিকের পরামর্শটি গুরুত্বসহকারে পর্যালোচনা করা হচ্ছে।'
        : 'ইউনিয়ন প্রতিনিধি কর্তৃক অভিযোগটি সরেজমিনে যাচাই করা হচ্ছে।',
      in_progress: isAdvice
        ? 'পরামর্শটি নীতিগতভাবে গ্রহণ করে বাস্তবায়নের কার্যক্রম চলছে।'
        : 'মাঠপর্যায়ে সংস্কার ও সমাধানের কার্যক্রম চলমান রয়েছে।',
      resolved: isAdvice
        ? 'পরামর্শটি সফলভাবে গ্রহণ ও কার্যকর করা হয়েছে।'
        : 'অভিযোগের স্থান পরিদর্শন করে সমস্যাটির সমাধান সম্পন্ন হয়েছে।',
      pending: 'নতুন আবেদন হিসেবে নথিভুক্ত হয়েছে।',
    };

    const finalNote = actionNote.trim() || defaultNotes[targetStatus];

    onUpdateProblemStatus(
      currentProblem.id,
      targetStatus,
      finalNote,
      officerName.trim() || 'ধামতী ইউনিয়ন সেবাদল'
    );
    setActionNote('');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Type', 'Tracking Code', 'Title', 'Ward', 'Category', 'Urgency', 'Status', 'Location', 'Citizen Name', 'Mobile Number', 'Date'];
    const rows = problems.map((p) => [
      p.submissionType === 'advice' ? 'Advice' : 'Complaint',
      sanitizeForCsv(p.trackingCode),
      `"${sanitizeForCsv(p.title).replace(/"/g, '""')}"`,
      sanitizeForCsv(p.ward),
      sanitizeForCsv(p.category),
      sanitizeForCsv(p.urgency),
      sanitizeForCsv(p.status),
      `"${sanitizeForCsv(p.specificLocation).replace(/"/g, '""')}"`,
      `"${sanitizeForCsv(p.citizenName).replace(/"/g, '""')}"`,
      sanitizeForCsv(p.phone || 'N/A'),
      sanitizeForCsv(new Date(p.createdAt).toLocaleString())
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dhamti-citizen-data-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // MANIFESTO ACTIONS
  const currentManifesto = manifestoItems.find((m) => m.id === selectedManifestoId) || manifestoItems[0];

  const handleUpdateManifestoField = (patch: Partial<ManifestoItem>) => {
    if (!currentManifesto) return;
    const updated: ManifestoItem = {
      ...currentManifesto,
      ...patch,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    onUpdateManifestoItem(updated);
  };

  const handleToggleMilestone = (milestoneId: string) => {
    if (!currentManifesto) return;
    const updatedMilestones = currentManifesto.milestones.map((m) => {
      if (m.id === milestoneId) {
        return { ...m, isDone: !m.isDone };
      }
      return m;
    });

    // Auto-calculate suggested progress if desired
    const doneCount = updatedMilestones.filter((m) => m.isDone).length;
    const totalCount = updatedMilestones.length;
    const suggestedProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : currentManifesto.progressPercentage;

    handleUpdateManifestoField({
      milestones: updatedMilestones,
      progressPercentage: suggestedProgress,
      status: suggestedProgress >= 100 ? 'completed' : suggestedProgress > 0 ? 'in_progress' : 'planned',
    });
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentManifesto || !newMilestoneText.trim()) return;

    const newM: ManifestoMilestone = {
      id: `m-${Date.now()}`,
      textBn: newMilestoneText.trim(),
      textEn: newMilestoneText.trim(),
      isDone: false,
    };

    handleUpdateManifestoField({
      milestones: [...currentManifesto.milestones, newM],
    });
    setNewMilestoneText('');
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    if (!currentManifesto) return;
    handleUpdateManifestoField({
      milestones: currentManifesto.milestones.filter((m) => m.id !== milestoneId),
    });
  };

  const handleCreateNewPledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPledgeTitleBn.trim()) return;

    const newItem: ManifestoItem = {
      id: `man-${Date.now()}`,
      titleBn: sanitizeString(newPledgeTitleBn, 150),
      titleEn: sanitizeString(newPledgeTitleEn, 150) || newPledgeTitleBn,
      category: newPledgeCategory,
      summaryBn: sanitizeString(newPledgeSummaryBn, 200),
      summaryEn: sanitizeString(newPledgeSummaryBn, 200),
      descriptionBn: sanitizeString(newPledgeDescBn, 800),
      descriptionEn: sanitizeString(newPledgeDescBn, 800),
      progressPercentage: Number(newPledgeProgress),
      status: newPledgeStatus,
      targetYear: sanitizeString(newPledgeTargetYear, 30),
      budgetOrScope: sanitizeString(newPledgeScope, 100),
      milestones: [
        { id: `m-${Date.now()}-1`, textBn: 'প্রকল্প প্রস্তাব ও সম্ভাব্যতা যাচাই সম্পন্ন', textEn: 'Feasibility study completed', isDone: true },
        { id: `m-${Date.now()}-2`, textBn: 'মাঠপর্যায়ে প্রাথমিক প্রস্তুতি ও অনুমোদন', textEn: 'Field groundwork initiated', isDone: false },
      ],
      lastUpdated: new Date().toISOString().slice(0, 10),
    };

    onAddManifestoItem(newItem);
    setSelectedManifestoId(newItem.id);
    setIsAddingNewManifesto(false);
    setMobileManifestoView('editor');
    // Reset form
    setNewPledgeTitleBn('');
    setNewPledgeTitleEn('');
    setNewPledgeSummaryBn('');
    setNewPledgeDescBn('');
    setNewPledgeScope('');
  };

  // Safe Deletion Handlers with Automatic Selection Adjustment & State Reset
  const handleDeleteManifesto = (id: string) => {
    const remaining = manifestoItems.filter((m) => m.id !== id);
    setSelectedManifestoId(remaining.length > 0 ? remaining[0].id : '');
    onDeleteManifestoItem(id);
    setConfirmDeleteManifestoId(null);
  };

  const handleDeleteAllCompletedManifestos = () => {
    if (onDeleteCompletedManifestos) {
      onDeleteCompletedManifestos();
    } else {
      const completed = manifestoItems.filter((m) => m.status === 'completed');
      completed.forEach((item) => onDeleteManifestoItem(item.id));
    }
    const remaining = manifestoItems.filter((m) => m.status !== 'completed');
    setSelectedManifestoId(remaining.length > 0 ? remaining[0].id : '');
    setConfirmDeleteAllCompleted(false);
  };

  const handleDeleteProblemEntry = (id: string) => {
    const remaining = problems.filter((p) => p.id !== id);
    setSelectedProblemId(remaining.length > 0 ? remaining[0].id : '');
    onDeleteProblem(id);
    setConfirmDeleteProblemId(null);
  };

  const getWardName = (wardId: string) => {
    const a = areas.find((w) => w.wardNumber === wardId);
    return a ? (language === 'bn' ? a.wardNameBn : a.wardNameEn) : wardId;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      <div className="relative w-full sm:max-w-5xl bg-white h-full sm:h-[92vh] max-h-screen rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-neutral-200 flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-3.5 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-emerald-900 via-neutral-900 to-emerald-950 text-white flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base md:text-lg font-bold tracking-tight truncate">
                {language === 'bn' ? 'ধামতী ইউনিয়ন অ্যাডমিন পোর্টাল' : 'Dhamti Central Admin Portal'}
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-200 truncate hidden xs:block">
                {language === 'bn' ? 'অভিযোগ, উপদেশ, নির্বাচনী ইশতেহার ও সুশাসন নিয়ন্ত্রণ' : 'Governance & Manifesto Control'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogoutAdmin}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white/10 hover:bg-white/20 text-[11px] sm:text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'লগআউট' : 'Logout'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title={language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* LOCKED STATE: PIN LOGIN */}
        {!isAuthenticated ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-neutral-50 overflow-y-auto">
            <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-neutral-200 shadow-xl text-center space-y-6">
              
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-xl font-bold text-neutral-900">
                  {language === 'bn' ? 'সুরক্ষিত প্রশাসনিক প্রবেশাধিকার' : 'Secure Administrator Access'}
                </h4>
                <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                  {language === 'bn'
                    ? 'অননুমোদিত প্রবেশ রোধে এই প্যানেলটি পাসওয়ার্ড দ্বারা সুরক্ষিত। অ্যাডমিন পাসওয়ার্ড দিন।'
                    : 'Encrypted administrative control. Please enter your secure PIN to manage citizen submissions and electoral commitments.'}
                </p>
              </div>

              {!authChecking && !authConfigured && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-sm font-semibold">
                  {language === 'bn'
                    ? 'সার্ভারে অ্যাডমিন পাসওয়ার্ড এখনো সেট করা হয়নি। হোস্টিংয়ে ADMIN_PASSWORD ও SESSION_SECRET দিন।'
                    : 'Admin password is not configured on the server (ADMIN_PASSWORD / SESSION_SECRET).'}
                </div>
              )}

              {pinError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                  {pinError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    maxLength={100}
                    autoComplete="current-password"
                    disabled={isVerifying || authChecking}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder={language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                    autoFocus
                    className="w-full text-center text-lg py-3 px-4 bg-neutral-50 border-2 border-neutral-300 rounded-2xl focus:outline-none focus:border-emerald-600 focus:bg-white disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || authChecking || !pinInput}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isVerifying ? (language === 'bn' ? 'যাচাই হচ্ছে...' : 'Verifying...') : (language === 'bn' ? 'প্যানেলে প্রবেশ করুন' : 'Unlock Dashboard')}</span>
                </button>

                <div className="pt-2 text-[11px] text-neutral-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === 'bn' ? 'সার্ভারে যাচাই ও ভুল চেষ্টার সীমা সুরক্ষিত' : 'Verified on the server with attempt limits'}</span>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* AUTHENTICATED ADMIN CONSOLE */
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Top Navigation Tabs */}
            <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between gap-2 text-xs shrink-0 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto scrollbar-none">
                
                {/* Tab 1: Grievance & Advice */}
                <button
                  type="button"
                  onClick={() => setActiveTab('complaints')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-xs ${
                    activeTab === 'complaints'
                      ? 'bg-white text-emerald-800 shadow-xs border border-neutral-200'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{language === 'bn' ? 'অভিযোগ ও উপদেশ' : 'Complaints & Advice'}</span>
                  <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full font-mono text-[10px]">
                    {problems.length}
                  </span>
                </button>

                {/* Tab 2: Electoral Manifesto */}
                <button
                  type="button"
                  onClick={() => setActiveTab('manifesto')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-xs ${
                    activeTab === 'manifesto'
                      ? 'bg-white text-emerald-800 shadow-xs border border-neutral-200'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{language === 'bn' ? 'নির্বাচনী ইশতেহার' : 'Electoral Manifesto'}</span>
                  <span className="ml-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded-full font-mono text-[10px]">
                    {manifestoItems.length}
                  </span>
                </button>

                {/* Tab 3: Profile & Security */}
                <button
                  type="button"
                  onClick={() => setActiveTab('profile_settings')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-xs ${
                    activeTab === 'profile_settings'
                      ? 'bg-white text-emerald-800 shadow-xs border border-neutral-200'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{language === 'bn' ? 'প্রোফাইল ও পিন' : 'Profile & PIN'}</span>
                </button>
              </div>

              {/* Quick Actions (Direct CSV Export) */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  title="Export CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{language === 'bn' ? 'CSV ডাউনলোড' : 'Export CSV'}</span>
                  <span className="sm:hidden text-[11px]">CSV</span>
                </button>
              </div>
            </div>

            {/* TAB 1: COMPLAINTS & ADVICE MANAGEMENT */}
            {activeTab === 'complaints' && (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Mobile Sub-Navigation Bar */}
                <div className="md:hidden flex items-center justify-between p-2 bg-neutral-100 border-b border-neutral-200 shrink-0">
                  <div className="flex rounded-xl bg-neutral-200/70 p-1 w-full text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setMobileComplaintView('list')}
                      className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                        mobileComplaintView === 'list'
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-neutral-600'
                      }`}
                    >
                      {language === 'bn' ? `তালিকা (${filteredProblems.length})` : `List (${filteredProblems.length})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileComplaintView('details')}
                      className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                        mobileComplaintView === 'details'
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-neutral-600'
                      }`}
                    >
                      {language === 'bn' ? 'পদক্ষেপ ও সমাধান' : 'Action Console'}
                    </button>
                  </div>
                </div>

                {/* Left: Complaints & Advice List */}
                <div
                  className={`w-full md:w-5/12 border-r border-neutral-200 flex flex-col bg-neutral-50 overflow-hidden ${
                    mobileComplaintView === 'list' ? 'flex' : 'hidden md:flex'
                  }`}
                >
                  {/* Search and Sub-filters */}
                  <div className="p-3 border-b border-neutral-200 bg-white space-y-2">
                    
                    {/* Submission Type Filter: All vs Complaint vs Advice */}
                    <div className="flex rounded-lg bg-neutral-100 p-0.5 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setSubmissionTypeFilter('all')}
                        className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
                          submissionTypeFilter === 'all' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500'
                        }`}
                      >
                        {language === 'bn' ? 'সকল' : 'All'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmissionTypeFilter('complaint')}
                        className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
                          submissionTypeFilter === 'complaint' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-neutral-500'
                        }`}
                      >
                        {language === 'bn' ? 'অভিযোগ' : 'Complaints'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmissionTypeFilter('advice')}
                        className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
                          submissionTypeFilter === 'advice' ? 'bg-indigo-700 text-white shadow-2xs' : 'text-neutral-500'
                        }`}
                      >
                        {language === 'bn' ? 'উপদেশ' : 'Advice'}
                      </button>
                    </div>

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={language === 'bn' ? 'কোড, নাম বা এলাকা দিয়ে খুঁজুন...' : 'Search submissions...'}
                      className="w-full px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />

                    {/* Status Filter */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {[
                        { id: 'all', label: language === 'bn' ? 'সকল অবস্থা' : 'All' },
                        { id: 'pending', label: language === 'bn' ? 'নতুন' : 'Pending' },
                        { id: 'reviewing', label: language === 'bn' ? 'যাচাই' : 'Review' },
                        { id: 'in_progress', label: language === 'bn' ? 'চলমান' : 'Ongoing' },
                        { id: 'resolved', label: language === 'bn' ? 'সম্পন্ন' : 'Done' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setComplaintFilter(item.id as any)}
                          className={`px-2 py-0.5 text-[11px] rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                            complaintFilter === item.id
                              ? 'bg-neutral-800 text-white font-bold'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List Content */}
                  <div className="flex-1 overflow-y-auto divide-y divide-neutral-200/80">
                    {filteredProblems.length === 0 ? (
                      <div className="p-8 text-center text-xs text-neutral-400">
                        {language === 'bn' ? 'কোনো বার্তা পাওয়া যায়নি' : 'No matching submissions found'}
                      </div>
                    ) : (
                      filteredProblems.map((p) => {
                        const isSelected = p.id === currentProblem?.id;
                        const isAdv = p.submissionType === 'advice';
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProblemId(p.id);
                              setTargetStatus(p.status);
                              setMobileComplaintView('details');
                            }}
                            className={`w-full text-left p-3.5 transition-colors cursor-pointer flex flex-col gap-1 ${
                              isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-700' : 'hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                  isAdv ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-900'
                                }`}>
                                  {isAdv ? 'উপদেশ' : 'অভিযোগ'}
                                </span>
                                <span className="font-mono font-bold text-neutral-800">{p.trackingCode}</span>
                              </div>
                              <span
                                className={`font-semibold ${
                                  p.status === 'resolved'
                                    ? 'text-emerald-700'
                                    : p.status === 'in_progress'
                                    ? 'text-amber-700'
                                    : 'text-neutral-500'
                                }`}
                              >
                                {p.status === 'resolved'
                                  ? (isAdv ? 'বাস্তবায়িত' : 'সমাধান সম্পন্ন')
                                  : p.status === 'in_progress'
                                  ? 'চলমান'
                                  : p.status === 'reviewing'
                                  ? 'যাচাই চলছে'
                                  : 'নতুন'}
                              </span>
                            </div>

                            <div className="text-xs font-bold text-neutral-900 line-clamp-1 mt-0.5">
                              {p.title}
                            </div>

                            <div className="text-[11px] text-neutral-500 line-clamp-1">
                              {getWardName(p.ward)} · {p.specificLocation}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: Problem / Advice Details & Action Control */}
                <div
                  className={`w-full md:w-7/12 flex-1 flex flex-col bg-white overflow-y-auto p-3.5 sm:p-6 pb-12 sm:pb-6 ${
                    mobileComplaintView === 'details' ? 'flex' : 'hidden md:flex'
                  }`}
                >
                  {currentProblem ? (
                    <div className="space-y-5">
                      
                      {/* Mobile Back Button to Return to List */}
                      <div className="md:hidden flex items-center justify-between pb-2.5 border-b border-neutral-200">
                        <button
                          type="button"
                          onClick={() => setMobileComplaintView('list')}
                          className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-3 py-1.5 rounded-xl cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>{language === 'bn' ? 'তালিকায় ফিরে যান' : 'Back to List'}</span>
                        </button>
                        <span className="font-mono font-bold text-neutral-600 text-xs">
                          {currentProblem.trackingCode}
                        </span>
                      </div>
                      
                      {/* Top Action Bar */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-200">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              currentProblem.submissionType === 'advice' ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {currentProblem.submissionType === 'advice' ? '💡 উপদেশ ও নাগরিক পরামর্শ' : '🚨 নাগরিক অভিযোগ'}
                            </span>
                            <span className="font-mono font-bold text-neutral-900 text-xs">
                              {currentProblem.trackingCode}
                            </span>
                          </div>
                          <h4 className="text-base sm:text-lg font-bold text-neutral-900 leading-snug">
                            {currentProblem.title}
                          </h4>
                        </div>

                        {confirmDeleteProblemId === currentProblem.id ? (
                          <div className="flex items-center gap-1.5 p-1.5 bg-red-50 border border-red-300 rounded-xl text-xs">
                            <span className="text-red-900 font-bold text-[11px]">
                              {language === 'bn' ? 'মুছে ফেলতে চান?' : 'Delete permanently?'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteProblemEntry(currentProblem.id)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer text-[11px] shadow-xs"
                            >
                              {language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteProblemId(null)}
                              className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-medium rounded-lg cursor-pointer text-[11px]"
                            >
                              {language === 'bn' ? 'বাতিল' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteProblemId(currentProblem.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-red-600 hover:bg-red-50 border border-red-200/80 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
                            title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete entry'}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">{language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}</span>
                          </button>
                        )}
                      </div>

                      {/* Citizen and Location metadata */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-neutral-50 rounded-xl text-xs">
                        <div>
                          <span className="text-neutral-500 block text-[11px]">{language === 'bn' ? 'নাগরিক:' : 'Citizen:'}</span>
                          <span className="font-semibold text-neutral-900">
                            {currentProblem.isAnonymous ? (language === 'bn' ? 'গোপন নাগরিক' : 'Anonymous') : currentProblem.citizenName}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-[11px]">{language === 'bn' ? 'মোবাইল নম্বর:' : 'Phone:'}</span>
                          <span className="font-semibold font-mono text-neutral-900">
                            {currentProblem.phone || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-[11px]">{language === 'bn' ? 'ওয়ার্ড ও স্থান:' : 'Ward & Location:'}</span>
                          <span className="font-semibold text-neutral-900">
                            {getWardName(currentProblem.ward)}
                          </span>
                        </div>
                      </div>

                      {/* Full description */}
                      <div>
                        <span className="text-xs font-bold text-neutral-700 block mb-1">
                          {currentProblem.submissionType === 'advice' ? (language === 'bn' ? 'পরামর্শের বিস্তারিত বিবরণ:' : 'Advice Details:') : (language === 'bn' ? 'সমস্যার বিস্তারিত বিবরণ:' : 'Problem Details:')}
                        </span>
                        <div className="p-3.5 bg-neutral-50 rounded-xl text-xs sm:text-sm text-neutral-800 leading-relaxed border border-neutral-200">
                          {currentProblem.description}
                        </div>
                      </div>

                      {/* STATUS UPDATE & ACTION DISPATCH FORM */}
                      <form onSubmit={handleApplyStatusChange} className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <span>{language === 'bn' ? 'পদক্ষেপ হালনাগাদ ও স্ট্যাটাস পরিবর্তন' : 'Official Action & Status Update'}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                              {language === 'bn' ? 'নতুন স্ট্যাটাস নির্বাচন করুন' : 'Select Status'}
                            </label>
                            <select
                              value={targetStatus}
                              onChange={(e) => setTargetStatus(e.target.value as ProblemStatus)}
                              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 font-semibold"
                            >
                              <option value="pending">{language === 'bn' ? 'নতুন আবেদন (Pending)' : 'Pending'}</option>
                              <option value="reviewing">{language === 'bn' ? 'যাচাই-বাছাই চলছে (Under Review)' : 'Under Review'}</option>
                              <option value="in_progress">{language === 'bn' ? 'মাঠপর্যায়ে কার্যক্রম চলমান (In Progress)' : 'In Progress'}</option>
                              <option value="resolved">{language === 'bn' ? 'সম্পূর্ণ সমাধান সম্পন্ন (Resolved / Implemented)' : 'Resolved / Implemented'}</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                              {language === 'bn' ? 'দায়িত্বপ্রাপ্ত কর্মকর্তা / দল' : 'Assigned Official'}
                            </label>
                            <input
                              type="text"
                              value={officerName}
                              onChange={(e) => setOfficerName(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                            {language === 'bn' ? 'পদক্ষেপের বিবরণ ও মন্তব্য (পাবলিক নোটে প্রদর্শিত হবে)' : 'Official Action Note'}
                          </label>
                          <textarea
                            rows={2}
                            value={actionNote}
                            onChange={(e) => setActionNote(e.target.value)}
                            placeholder={language === 'bn' ? 'যেমন: ঘটনাস্থল পরিদর্শন করে তাৎক্ষণিক সংস্কারের নির্দেশনা দেওয়া হয়েছে...' : 'Describe action taken...'}
                            className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'হালনাগাদ নিশ্চিত করুন' : 'Apply Update'}</span>
                          </button>
                        </div>
                      </form>

                      {/* Timeline */}
                      <div>
                        <span className="text-xs font-bold text-neutral-700 block mb-2">
                          {language === 'bn' ? 'পদক্ষেপের টাইমলাইন ইতিহাস:' : 'Timeline Log:'}
                        </span>
                        <div className="space-y-2">
                          {currentProblem.timeline.map((t, idx) => (
                            <div key={t.id || idx} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                              <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-0.5">
                                <span className="font-bold text-neutral-800">{t.author}</span>
                                <span>{new Date(t.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-neutral-700">{language === 'bn' ? t.noteBn : t.noteEn}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
                      {language === 'bn' ? 'বামপাশ থেকে যেকোনো অভিযোগ বা উপদেশ নির্বাচন করুন' : 'Select an item from the list'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ELECTORAL MANIFESTO MANAGEMENT (NEW FULL FEATURE) */}
            {activeTab === 'manifesto' && (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-neutral-50">
                {/* Mobile Sub-Navigation Bar for Manifesto */}
                <div className="md:hidden flex items-center justify-between p-2 bg-neutral-100 border-b border-neutral-200 shrink-0">
                  <div className="flex rounded-xl bg-neutral-200/70 p-1 w-full text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setMobileManifestoView('list')}
                      className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                        mobileManifestoView === 'list'
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-neutral-600'
                      }`}
                    >
                      {language === 'bn' ? `প্রতিশ্রুতি তালিকা (${manifestoItems.length})` : `Pledges (${manifestoItems.length})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileManifestoView('editor')}
                      className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                        mobileManifestoView === 'editor'
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-neutral-600'
                      }`}
                    >
                      {isAddingNewManifesto
                        ? language === 'bn' ? '+ নতুন প্রতিশ্রুতি' : '+ Add New'
                        : language === 'bn' ? 'অগ্রগতি ও বিবরণ' : 'Editor'}
                    </button>
                  </div>
                </div>

                {/* Left Side: Manifesto Items List */}
                <div
                  className={`w-full md:w-5/12 border-r border-neutral-200 flex flex-col bg-white overflow-hidden ${
                    mobileManifestoView === 'list' ? 'flex flex-1' : 'hidden md:flex'
                  }`}
                >
                  
                  {/* Top Header of Left column: Add New Button & Sector Filter */}
                  <div className="p-3.5 border-b border-neutral-200 space-y-2.5 bg-neutral-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                        {language === 'bn' ? 'প্রতিশ্রুতি তালিকা' : 'Manifesto Pledges'} ({manifestoItems.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewManifesto(true);
                          setMobileManifestoView('editor');
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'নতুন যোগ করুন' : 'Add New'}</span>
                      </button>
                    </div>

                    {/* Status Tabs: All, Completed, In Progress, Planned */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                      {[
                        { id: 'all', labelBn: `সব (${manifestoItems.length})`, labelEn: `All (${manifestoItems.length})` },
                        {
                          id: 'completed',
                          labelBn: `বাস্তবায়িত (${manifestoItems.filter((m) => m.status === 'completed').length})`,
                          labelEn: `Done (${manifestoItems.filter((m) => m.status === 'completed').length})`,
                        },
                        {
                          id: 'in_progress',
                          labelBn: `চলমান (${manifestoItems.filter((m) => m.status === 'in_progress').length})`,
                          labelEn: `Active (${manifestoItems.filter((m) => m.status === 'in_progress').length})`,
                        },
                        {
                          id: 'planned',
                          labelBn: `পরিকল্পিত (${manifestoItems.filter((m) => m.status === 'planned').length})`,
                          labelEn: `Planned (${manifestoItems.filter((m) => m.status === 'planned').length})`,
                        },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setManifestoStatusFilter(st.id as any)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                            manifestoStatusFilter === st.id
                              ? 'bg-neutral-900 text-white shadow-2xs'
                              : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {language === 'bn' ? st.labelBn : st.labelEn}
                        </button>
                      ))}
                    </div>

                    {/* Dedicated Button to Delete All Completed Manifestos */}
                    {manifestoItems.some((m) => m.status === 'completed') && (
                      <div>
                        {confirmDeleteAllCompleted ? (
                          <div className="p-2.5 bg-red-50 border border-red-300 rounded-xl space-y-2 animate-fadeIn">
                            <span className="text-[11px] font-bold text-red-950 block leading-tight">
                              {language === 'bn'
                                ? `সকল বাস্তবায়িত (${manifestoItems.filter((m) => m.status === 'completed').length} টি) ইশতেহার স্থায়ীভাবে মুছে ফেলবেন?`
                                : `Permanently delete all ${manifestoItems.filter((m) => m.status === 'completed').length} completed pledges?`}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleDeleteAllCompletedManifestos}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg cursor-pointer shadow-xs"
                              >
                                {language === 'bn' ? 'হ্যাঁ, সব বাস্তবায়িত মুছুন' : 'Yes, Delete Completed'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteAllCompleted(false)}
                                className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[11px] font-medium rounded-lg cursor-pointer"
                              >
                                {language === 'bn' ? 'বাতিল' : 'Cancel'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteAllCompleted(true)}
                            className="w-full flex items-center justify-between px-3 py-1.5 bg-emerald-50 hover:bg-red-50 text-emerald-900 hover:text-red-700 border border-emerald-200 hover:border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            title={language === 'bn' ? 'বাস্তবায়িত ইশতেহারগুলো মুছে ফেলুন' : 'Delete all completed commitments'}
                          >
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>{language === 'bn' ? 'বাস্তবায়িত ইশতেহার ডিলিট করুন' : 'Delete Completed'}</span>
                            </span>
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/80 rounded-md text-[10px] font-extrabold font-mono text-neutral-800">
                              <Trash2 className="w-3 h-3 text-red-600" />
                              <span>{manifestoItems.filter((m) => m.status === 'completed').length}</span>
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Sector Filter */}
                    <select
                      value={manifestoCategoryFilter}
                      onChange={(e) => setManifestoCategoryFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    >
                      <option value="all">{language === 'bn' ? 'সকল খাত (All Sectors)' : 'All Sectors'}</option>
                      {(Object.keys(MANIFESTO_CATEGORIES_CONFIG) as ManifestoCategory[]).map((cat) => (
                        <option key={cat} value={cat}>
                          {language === 'bn' ? MANIFESTO_CATEGORIES_CONFIG[cat].nameBn : MANIFESTO_CATEGORIES_CONFIG[cat].nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-neutral-200">
                    {manifestoItems
                      .filter((m) => {
                        if (manifestoCategoryFilter !== 'all' && m.category !== manifestoCategoryFilter) return false;
                        if (manifestoStatusFilter !== 'all' && m.status !== manifestoStatusFilter) return false;
                        return true;
                      })
                      .map((item) => {
                        const isSelected = item.id === currentManifesto?.id && !isAddingNewManifesto;
                        const catConfig = MANIFESTO_CATEGORIES_CONFIG[item.category] || { nameBn: 'প্রকল্প' };

                        return (
                          <div
                            key={item.id}
                            className={`w-full p-3.5 transition-colors flex items-start justify-between gap-2 ${
                              isSelected ? 'bg-emerald-50 border-l-4 border-emerald-700' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedManifestoId(item.id);
                                setIsAddingNewManifesto(false);
                                setMobileManifestoView('editor');
                              }}
                              className="flex-1 text-left cursor-pointer flex flex-col gap-1.5"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-neutral-500">
                                  {language === 'bn' ? catConfig.nameBn : catConfig.nameEn}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.status === 'in_progress'
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-neutral-100 text-neutral-700'
                                  }`}
                                >
                                  %{item.progressPercentage} · {item.status === 'completed' ? 'বাস্তবায়িত' : item.status === 'in_progress' ? 'চলমান' : 'পরিকল্পিত'}
                                </span>
                              </div>

                              <div className="text-xs font-bold text-neutral-900 line-clamp-1">
                                {language === 'bn' ? item.titleBn : item.titleEn}
                              </div>

                              <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-emerald-600 rounded-full"
                                  style={{ width: `${item.progressPercentage}%` }}
                                />
                              </div>
                            </button>

                            {/* Quick Delete Action directly on list item */}
                            <div className="shrink-0 pt-0.5">
                              {confirmDeleteManifestoId === item.id ? (
                                <div className="flex flex-col items-end gap-1 bg-red-50 p-1.5 rounded-lg border border-red-200">
                                  <span className="text-[10px] font-bold text-red-900">
                                    {language === 'bn' ? 'মুছবেন?' : 'Delete?'}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteManifesto(item.id)}
                                      className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      {language === 'bn' ? 'হ্যাঁ' : 'Yes'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteManifestoId(null)}
                                      className="px-1.5 py-0.5 bg-neutral-200 text-neutral-800 rounded text-[10px] cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteManifestoId(item.id);
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    item.status === 'completed'
                                      ? 'text-red-600 hover:bg-red-50 border border-red-200/60'
                                      : 'text-neutral-400 hover:text-red-600 hover:bg-neutral-100'
                                  }`}
                                  title={
                                    item.status === 'completed'
                                      ? language === 'bn'
                                        ? 'বাস্তবায়িত অঙ্গীকার মুছুন'
                                        : 'Delete completed pledge'
                                      : language === 'bn'
                                      ? 'ইশতেহার মুছুন'
                                      : 'Delete'
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Reset Manifesto Button */}
                  <div className="p-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400">
                      {language === 'bn' ? 'ডিফল্ট ইশতেহার' : 'Default Data'}
                    </span>
                    {confirmResetManifesto ? (
                      <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-lg border border-red-200 animate-fadeIn">
                        <span className="text-[10px] text-red-900 font-bold">
                          {language === 'bn' ? 'মূল ইশতেহারে রিসেট করবেন?' : 'Reset to default?'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onResetManifesto();
                            setConfirmResetManifesto(false);
                          }}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded cursor-pointer"
                        >
                          {language === 'bn' ? 'হ্যাঁ' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmResetManifesto(false)}
                          className="px-2 py-0.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[10px] rounded cursor-pointer"
                        >
                          {language === 'bn' ? 'না' : 'No'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmResetManifesto(true)}
                        className="flex items-center gap-1 text-[11px] font-bold text-neutral-600 hover:text-red-700 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{language === 'bn' ? 'রিসেট করুন' : 'Reset to Default'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Side: Manifesto Pledge Editor / Creator */}
                <div
                  className={`w-full md:w-7/12 flex-1 flex flex-col bg-white overflow-y-auto p-3.5 sm:p-6 pb-14 sm:pb-6 ${
                    mobileManifestoView === 'editor' ? 'flex' : 'hidden md:flex'
                  }`}
                >
                  {/* Mobile Back Button to Return to Manifesto List */}
                  <div className="md:hidden flex items-center justify-between pb-2.5 mb-2.5 border-b border-neutral-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMobileManifestoView('list')}
                      className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-3 py-1.5 rounded-xl cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>{language === 'bn' ? 'তালিকায় ফিরে যান' : 'Back to List'}</span>
                    </button>
                    {isAddingNewManifesto ? (
                      <span className="text-xs font-bold text-emerald-900">
                        {language === 'bn' ? '+ নতুন প্রতিশ্রুতি' : '+ Add New'}
                      </span>
                    ) : currentManifesto ? (
                      <span className="text-[11px] font-mono font-bold text-emerald-800">
                        %{currentManifesto.progressPercentage}
                      </span>
                    ) : null}
                  </div>
                  
                  {isAddingNewManifesto ? (
                    /* CREATE NEW MANIFESTO PLEDGE FORM */
                    <form onSubmit={handleCreateNewPledge} className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                        <div className="flex items-center gap-2">
                          <PlusCircle className="w-5 h-5 text-emerald-700" />
                          <h4 className="text-base font-bold text-neutral-900">
                            {language === 'bn' ? 'নতুন নির্বাচনী প্রতিশ্রুতি অন্তর্ভুক্ত করুন' : 'Add New Manifesto Commitment'}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewManifesto(false);
                            setMobileManifestoView('list');
                          }}
                          className="text-xs text-neutral-500 hover:text-neutral-800"
                        >
                          {language === 'bn' ? 'বাতিল' : 'Cancel'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 mb-1">
                            {language === 'bn' ? 'খাত / সেক্টর' : 'Sector'} <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newPledgeCategory}
                            onChange={(e) => setNewPledgeCategory(e.target.value as ManifestoCategory)}
                            className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl"
                          >
                            {(Object.keys(MANIFESTO_CATEGORIES_CONFIG) as ManifestoCategory[]).map((cat) => (
                              <option key={cat} value={cat}>
                                {language === 'bn' ? MANIFESTO_CATEGORIES_CONFIG[cat].nameBn : MANIFESTO_CATEGORIES_CONFIG[cat].nameEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 mb-1">
                            {language === 'bn' ? 'বাস্তবায়নের মেয়াদ / টার্গেট বছর' : 'Target Year'}
                          </label>
                          <input
                            type="text"
                            value={newPledgeTargetYear}
                            onChange={(e) => setNewPledgeTargetYear(e.target.value)}
                            placeholder="২০২৬-২০২৭"
                            className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          {language === 'bn' ? 'প্রতিশ্রুতির শিরোনাম (বাংলা)' : 'Pledge Title (Bangla)'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newPledgeTitleBn}
                          onChange={(e) => setNewPledgeTitleBn(e.target.value)}
                          placeholder="যেমন: ৯টি ওয়ার্ডের প্রধান ড্রেনেজ মাস্টারপ্ল্যান"
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          {language === 'bn' ? 'সংক্ষিপ্ত সারসংক্ষেপ' : 'Short Summary'}
                        </label>
                        <input
                          type="text"
                          value={newPledgeSummaryBn}
                          onChange={(e) => setNewPledgeSummaryBn(e.target.value)}
                          placeholder="এক বা দুই লাইনে প্রতিশ্রুতির মূল উদ্দেশ্য"
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          {language === 'bn' ? 'বিস্তারিত কর্মপরিকল্পনা' : 'Detailed Plan'}
                        </label>
                        <textarea
                          rows={3}
                          value={newPledgeDescBn}
                          onChange={(e) => setNewPledgeDescBn(e.target.value)}
                          placeholder="কীভাবে বাস্তবায়ন করা হবে তার বিস্তারিত বিবরণ..."
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          {language === 'bn' ? 'আওতাভুক্ত এলাকা বা পরিসর' : 'Scope / Scale'}
                        </label>
                        <input
                          type="text"
                          value={newPledgeScope}
                          onChange={(e) => setNewPledgeScope(e.target.value)}
                          placeholder="যেমন: ইউনিয়নের ৯টি ওয়ার্ড ও বাজার এলাকা"
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-xl">
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 mb-1">
                            {language === 'bn' ? 'বর্তমান স্ট্যাটাস' : 'Status'}
                          </label>
                          <select
                            value={newPledgeStatus}
                            onChange={(e) => setNewPledgeStatus(e.target.value as ManifestoStatus)}
                            className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl"
                          >
                            <option value="planned">{language === 'bn' ? 'পরিকল্পনাধীন (Planned)' : 'Planned'}</option>
                            <option value="in_progress">{language === 'bn' ? 'বাস্তবায়নাধীন (In Progress)' : 'In Progress'}</option>
                            <option value="completed">{language === 'bn' ? 'সম্পূর্ণ বাস্তবায়িত (Completed)' : 'Completed'}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 mb-1">
                            {language === 'bn' ? `অগ্রগতি শতকরা হার: %${newPledgeProgress}` : `Progress: %${newPledgeProgress}`}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={newPledgeProgress}
                            onChange={(e) => setNewPledgeProgress(Number(e.target.value))}
                            className="w-full accent-emerald-700"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 pb-6 sm:pb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewManifesto(false);
                            setMobileManifestoView('list');
                          }}
                          className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                        >
                          {language === 'bn' ? 'বাতিল' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          {language === 'bn' ? 'ইশতেহারে যুক্ত করুন' : 'Add Commitment'}
                        </button>
                      </div>
                    </form>
                  ) : currentManifesto ? (
                    /* EDIT EXISTING MANIFESTO PLEDGE */
                    <div className="space-y-6">
                      
                      {/* Header with Title and Delete */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-200">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                            {MANIFESTO_CATEGORIES_CONFIG[currentManifesto.category]?.nameBn || 'সেক্টর'}
                          </span>
                          <h4 className="text-base sm:text-lg font-bold text-neutral-900 leading-snug mt-0.5">
                            {currentManifesto.titleBn}
                          </h4>
                        </div>

                        {confirmDeleteManifestoId === currentManifesto.id ? (
                          <div className="flex items-center gap-1.5 p-1.5 bg-red-50 border border-red-300 rounded-xl text-xs">
                            <span className="text-red-900 font-bold text-[11px]">
                              {language === 'bn' ? 'মুছে ফেলতে চান?' : 'Delete commitment?'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteManifesto(currentManifesto.id)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer text-[11px] shadow-xs"
                            >
                              {language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteManifestoId(null)}
                              className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-medium rounded-lg cursor-pointer text-[11px]"
                            >
                              {language === 'bn' ? 'বাতিল' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteManifestoId(currentManifesto.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-200/80 rounded-xl transition-colors cursor-pointer text-xs font-bold"
                            title={language === 'bn' ? 'প্রতিশ্রুতি মুছে ফেলুন' : 'Delete commitment'}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>{language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}</span>
                          </button>
                        )}
                      </div>

                      {/* Dedicated Completed Manifesto Banner & Instant Delete Option */}
                      {currentManifesto.status === 'completed' && (
                        <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                                  {language === 'bn' ? 'সম্পূর্ণ বাস্তবায়িত নির্বাচনী প্রতিশ্রুতি' : 'Fully Completed Pledge'}
                                </span>
                                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-md text-[10px] font-extrabold font-mono">
                                  100%
                                </span>
                              </div>
                              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                                {language === 'bn'
                                  ? 'এই প্রতিশ্রুতিটির বাস্তবায়ন সফলভাবে সমাপ্ত হয়েছে। আপনি চাইলে এটি সরাসরি ইশতেহার তালিকা থেকে মুছে ফেলতে পারেন।'
                                  : 'This commitment has been successfully achieved. You can remove it from active records.'}
                              </p>
                            </div>
                          </div>

                          {confirmDeleteManifestoId === currentManifesto.id ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDeleteManifesto(currentManifesto.id)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                              >
                                {language === 'bn' ? 'হ্যাঁ, বাস্তবায়িতটি মুছুন' : 'Yes, Delete'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteManifestoId(null)}
                                className="px-2.5 py-1.5 bg-neutral-200 text-neutral-800 rounded-xl text-xs font-medium cursor-pointer"
                              >
                                {language === 'bn' ? 'বাতিল' : 'Cancel'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteManifestoId(currentManifesto.id)}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{language === 'bn' ? 'বাস্তবায়িত অঙ্গীকার মুছুন' : 'Delete Completed Pledge'}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Interactive Progress Slider Console */}
                      <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider">
                            <Sliders className="w-4 h-4 text-emerald-700" />
                            <span>{language === 'bn' ? 'লাইভ অগ্রগতি নিয়ন্ত্রণ (Progress Slider)' : 'Live Progress Controller'}</span>
                          </span>
                          <span className="text-lg font-extrabold text-emerald-800 font-mono">
                            %{currentManifesto.progressPercentage}
                          </span>
                        </div>

                        {/* Slider */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={currentManifesto.progressPercentage}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            handleUpdateManifestoField({
                              progressPercentage: val,
                              status: val >= 100 ? 'completed' : val > 0 ? 'in_progress' : 'planned',
                            });
                          }}
                          className="w-full h-2.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                        />

                        {/* Quick Preset Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                          <span className="text-neutral-500">{language === 'bn' ? 'দ্রুত সেট করুন:' : 'Quick Set:'}</span>
                          <div className="flex items-center gap-1.5">
                            {[0, 25, 50, 75, 100].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  handleUpdateManifestoField({
                                    progressPercentage: preset,
                                    status: preset >= 100 ? 'completed' : preset > 0 ? 'in_progress' : 'planned',
                                  });
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                  currentManifesto.progressPercentage === preset
                                    ? 'bg-emerald-700 text-white border-emerald-700'
                                    : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                                }`}
                              >
                                %{preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Status Switcher */}
                        <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 text-xs">
                          <span className="font-bold text-neutral-700">
                            {language === 'bn' ? 'বাস্তবায়ন অবস্থা:' : 'Execution Status:'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {[
                              { id: 'planned', labelBn: 'পরিকল্পনাধীন' },
                              { id: 'in_progress', labelBn: 'মাঠপর্যায়ে চলমান' },
                              { id: 'completed', labelBn: 'সম্পূর্ণ বাস্তবায়িত' },
                            ].map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => handleUpdateManifestoField({ status: st.id as ManifestoStatus })}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentManifesto.status === st.id
                                    ? st.id === 'completed'
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-amber-600 text-white'
                                    : 'bg-white border border-neutral-300 text-neutral-600 hover:bg-neutral-100'
                                }`}
                              >
                                {st.labelBn}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Milestones Management */}
                      <div className="space-y-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Target className="w-4 h-4 text-emerald-700" />
                            <span>{language === 'bn' ? 'মাইলস্টোন ও ধাপসমূহ' : 'Key Milestones'} ({currentManifesto.milestones.length})</span>
                          </span>
                          <span className="text-[11px] text-neutral-500 font-medium">
                            {language === 'bn' ? 'চেক করলে শতকরা হার স্বয়ংক্রিয়ভাবে সাজবে' : 'Toggle to update'}
                          </span>
                        </div>

                        {/* Milestones checklist */}
                        <ul className="space-y-2">
                          {currentManifesto.milestones.map((m) => (
                            <li
                              key={m.id}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs transition-colors ${
                                m.isDone
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-medium'
                                  : 'bg-white border-neutral-200 text-neutral-700'
                              }`}
                            >
                              <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={m.isDone}
                                  onChange={() => handleToggleMilestone(m.id)}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className={m.isDone ? 'line-through text-neutral-500' : ''}>
                                  {m.textBn}
                                </span>
                              </label>

                              <button
                                type="button"
                                onClick={() => handleDeleteMilestone(m.id)}
                                className="text-neutral-400 hover:text-red-600 p-1 rounded"
                                title="Delete Milestone"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>

                        {/* Add Milestone Inline Form */}
                        <form onSubmit={handleAddMilestone} className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={newMilestoneText}
                            onChange={(e) => setNewMilestoneText(e.target.value)}
                            placeholder={language === 'bn' ? 'নতুন মাইলস্টোন ধাপ লিখুন...' : 'Add milestone step...'}
                            className="flex-1 px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          />
                          <button
                            type="submit"
                            disabled={!newMilestoneText.trim()}
                            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer"
                          >
                            {language === 'bn' ? 'যোগ করুন' : 'Add'}
                          </button>
                        </form>
                      </div>

                      {/* Editable Text Metadata Fields */}
                      <div className="space-y-3 p-4 bg-white rounded-2xl border border-neutral-200">
                        <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block mb-1">
                          {language === 'bn' ? 'বিবরণ ও তথ্যাদি সম্পাদনা' : 'Edit Text Details'}
                        </span>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                            {language === 'bn' ? 'প্রতিশ্রুতির শিরোনাম (বাংলা)' : 'Title'}
                          </label>
                          <input
                            type="text"
                            value={currentManifesto.titleBn}
                            onChange={(e) => handleUpdateManifestoField({ titleBn: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                            {language === 'bn' ? 'সারসংক্ষেপ (বাংলা)' : 'Summary'}
                          </label>
                          <input
                            type="text"
                            value={currentManifesto.summaryBn}
                            onChange={(e) => handleUpdateManifestoField({ summaryBn: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                            {language === 'bn' ? 'বিস্তারিত কর্মপরিকল্পনা' : 'Detailed Plan'}
                          </label>
                          <textarea
                            rows={3}
                            value={currentManifesto.descriptionBn}
                            onChange={(e) => handleUpdateManifestoField({ descriptionBn: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                              {language === 'bn' ? 'মেয়াদ / টার্গেট বছর' : 'Target Year'}
                            </label>
                            <input
                              type="text"
                              value={currentManifesto.targetYear}
                              onChange={(e) => handleUpdateManifestoField({ targetYear: e.target.value })}
                              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                              {language === 'bn' ? 'পরিসর / বাজেট সংকেত' : 'Scope / Scale'}
                            </label>
                            <input
                              type="text"
                              value={currentManifesto.budgetOrScope}
                              onChange={(e) => handleUpdateManifestoField({ budgetOrScope: e.target.value })}
                              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="text-[11px] text-neutral-400 text-right pt-1">
                          {language === 'bn' ? `সর্বশেষ হালনাগাদ: ${currentManifesto.lastUpdated}` : `Last updated: ${currentManifesto.lastUpdated}`}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-neutral-800">
                        {language === 'bn' ? 'কোনো নির্বাচনী প্রতিশ্রুতি নির্বাচন করা হয়নি' : 'No commitment selected'}
                      </h4>
                      <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                        {language === 'bn'
                          ? 'বামপাশের তালিকা থেকে প্রতিশ্রুতি নির্বাচন করুন অথবা নতুন নির্বাচনী প্রতিশ্রুতি যোগ করুন।'
                          : 'Select an item from the list or create a new commitment.'}
                      </p>
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => setIsAddingNewManifesto(true)}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          {language === 'bn' ? 'নতুন প্রতিশ্রুতি যোগ করুন' : 'Add New Commitment'}
                        </button>
                        {manifestoItems.length === 0 && (
                          <button
                            type="button"
                            onClick={onResetManifesto}
                            className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            {language === 'bn' ? 'ডিফল্ট ইশতেহার আনুন' : 'Load Default Pledges'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* TAB 3: PROFILE SLOGANS & SECURITY SETTINGS */}
            {activeTab === 'profile_settings' && (
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 space-y-6 pb-16 sm:pb-8">
                
                {profileSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                    {language === 'bn' ? '✓ সফলভাবে সংরক্ষিত হয়েছে!' : '✓ Leader profile & slogans updated successfully!'}
                  </div>
                )}

                {profileError && (
                  <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold max-w-3xl">
                    {profileError}
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-6 max-w-3xl">
                  
                  {/* 1. Slogans and Announcements */}
                  <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 space-y-4">
                    <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>{language === 'bn' ? 'মূল স্লোগান ও জনবার্তা' : 'Official Slogans & Announcements'}</span>
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        {language === 'bn' ? 'মূল স্লোগান (বড় ব্যানারে প্রদর্শিত)' : 'Primary Slogan'}
                      </label>
                      <input
                        type="text"
                        required
                        value={editMainSlogan}
                        onChange={(e) => setEditMainSlogan(e.target.value)}
                        placeholder="আমাদের ধামতী আমরাই গড়ব"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        {language === 'bn' ? 'ছোট স্লোগান / সাব-স্লোগান' : 'Secondary Sub-Slogan'}
                      </label>
                      <input
                        type="text"
                        required
                        value={editSubSlogan}
                        onChange={(e) => setEditSubSlogan(e.target.value)}
                        placeholder="একসাথে গড়ব আগামীর ধামতী"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1" htmlFor="edit-announcement">
                        {language === 'bn' ? 'হোমপেজের বড় বার্তা (ছবির পাশের বড় লেখা)' : 'Homepage headline message'}
                      </label>
                      <input
                        id="edit-announcement"
                        type="text"
                        maxLength={200}
                        value={editAnnouncement}
                        onChange={(e) => setEditAnnouncement(e.target.value)}
                        placeholder="যেমন: আপনার সমস্যা আমাদের জানান, আমরা পাশে আছি"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  {/* 2. Leader Identity */}
                  <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 space-y-4">
                    <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>{language === 'bn' ? 'জননেতা ও সেবকের পরিচিতি' : 'Leader Representation'}</span>
                    </h4>

                    {/* প্রোফাইল ছবি: অ্যাডমিন বদলাতে পারেন */}
                    <div className="p-3.5 bg-white rounded-xl border border-neutral-200 space-y-3">
                      <div className="flex items-center gap-4">
                        <img
                          src={leaderProfile.profileImage || LEADER_PERMANENT_PHOTO_URL}
                          alt={leaderProfile.name}
                          className="w-20 h-20 rounded-xl object-cover object-top border-2 border-emerald-600 shadow-xs shrink-0"
                        />
                        <div className="text-xs">
                          <div className="font-bold text-neutral-800 text-sm">
                            {language === 'bn' ? 'প্রোফাইল ছবি' : 'Profile Photo'}
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                            {language === 'bn'
                              ? 'ফোন বা কম্পিউটার থেকে ছবি বাছুন। ছবি নিজে থেকেই ছোট হয়ে যাবে। মুখ উপরের দিকে থাকা সোজা ছবি ভালো দেখায়।'
                              : 'Pick a photo from your device. It is resized automatically.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label
                          className={`inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer ${
                            isSavingPhoto ? 'bg-neutral-400 pointer-events-none' : 'bg-emerald-700 hover:bg-emerald-800'
                          }`}
                        >
                          {isSavingPhoto ? 'অপেক্ষা করুন…' : language === 'bn' ? 'নতুন ছবি বাছুন' : 'Choose new photo'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePhotoPicked}
                            disabled={isSavingPhoto}
                            className="sr-only"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handlePhotoReset}
                          disabled={isSavingPhoto}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 cursor-pointer disabled:opacity-50"
                        >
                          {language === 'bn' ? 'মূল ছবিতে ফিরুন' : 'Restore default photo'}
                        </button>
                      </div>
                      {photoMsg && (
                        <div
                          role="status"
                          className={`text-xs font-bold px-3 py-2 rounded-lg border ${
                            photoMsg.ok
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-red-50 border-red-200 text-red-700'
                          }`}
                        >
                          {photoMsg.text}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          {language === 'bn' ? 'জনপ্রতিনিধি / সেবকের নাম' : 'Leader Full Name'}
                        </label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="মোঃ আনোয়ার হোসেন ভূঁইয়া"
                          className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          {language === 'bn' ? 'পদবি / পরিচয়' : 'Designation'}
                        </label>
                        <input
                          type="text"
                          required
                          value={editDesignation}
                          onChange={(e) => setEditDesignation(e.target.value)}
                          placeholder="চেয়ারম্যান পদপ্রার্থী, ১৩ নং ধামতী ইউনিয়ন পরিষদ"
                          className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          {language === 'bn' ? 'অঙ্গীকার / সাবটাইটেল' : 'Leader Promise / Subtitle'}
                        </label>
                        <input
                          type="text"
                          required
                          value={editPromise}
                          onChange={(e) => setEditPromise(e.target.value)}
                          placeholder="কাজ করতে চাই আপনাদের জন্যে"
                          className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Official Contact Info */}
                  <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 space-y-4">
                    <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-700" />
                      <span>{language === 'bn' ? 'অফিসিয়াল যোগাযোগ ও হেল্পলাইন ডেটা' : 'Official Contact & Office Details'}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          {language === 'bn' ? 'জরুরি হেল্পলাইন নম্বর' : 'Helpline Phone'}
                        </label>
                        <input
                          type="text"
                          required
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="01613394074"
                          className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          {language === 'bn' ? 'অফিসিয়াল ইমেইল' : 'Official Email'}
                        </label>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Anwarbhuiyan184@gmail.com"
                          className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          {language === 'bn' ? 'অফিসের ঠিকানা' : 'Office Location'}
                        </label>
                        <input
                          type="text"
                          required
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          placeholder="জনসেবা কার্যালয়, ১৩ নং ধামতী ইউনিয়ন, দেবিদ্বার, কুমিল্লা"
                          className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-400 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
                    >
                      {isSavingProfile
                        ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে…' : 'Saving…')
                        : (language === 'bn' ? 'পরিবর্তনসমূহ সংরক্ষণ করুন' : 'Save Changes')}
                    </button>
                  </div>
                </form>

                {/* ওয়ার্ডের গ্রামের নাম */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 space-y-4 max-w-3xl">
                  <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span>{language === 'bn' ? 'ওয়ার্ড অনুযায়ী গ্রামের নাম' : 'Villages by Ward'}</span>
                  </h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {language === 'bn'
                      ? 'প্রতিটি ওয়ার্ডে কোন কোন গ্রাম পড়ে লিখুন (কমা দিয়ে আলাদা করুন)। অভিযোগের ফর্ম ও তালিকায় ওয়ার্ডের পাশে এগুলো দেখা যাবে। ফাঁকা রাখলে শুধু ওয়ার্ড নম্বর দেখাবে।'
                      : 'List the villages in each ward, separated by commas. They appear next to the ward in the form and lists.'}
                  </p>
                  <div className="space-y-3">
                    {INITIAL_AREAS.map((w) => (
                      <div key={w.wardNumber}>
                        <label className="block text-xs font-bold text-neutral-700 mb-1" htmlFor={`village-${w.wardNumber}`}>
                          {language === 'bn' ? w.wardNameBn : w.wardNameEn}
                        </label>
                        <input
                          id={`village-${w.wardNumber}`}
                          type="text"
                          maxLength={80}
                          value={editVillages[w.wardNumber] || ''}
                          onChange={(e) => setEditVillages((prev) => ({ ...prev, [w.wardNumber]: e.target.value }))}
                          placeholder={language === 'bn' ? 'যেমন: উত্তর ধামতী, দক্ষিণ পাড়া' : 'e.g. North Dhamti, South Para'}
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    ))}
                  </div>
                  {villagesMsg && (
                    <div
                      role="status"
                      className={`text-xs font-bold px-3 py-2 rounded-lg border ${
                        villagesMsg.ok
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}
                    >
                      {villagesMsg.text}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveVillages}
                      disabled={isSavingVillages}
                      className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-400 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
                    >
                      {isSavingVillages ? 'সংরক্ষণ হচ্ছে…' : language === 'bn' ? 'গ্রামের নাম সংরক্ষণ করুন' : 'Save villages'}
                    </button>
                  </div>
                </div>

                {/* Turso Database Information & Architecture Card */}
                <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 text-white p-5 rounded-2xl border border-neutral-800 shadow-md space-y-4 max-w-3xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-white">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'bn' ? 'টারসো ডেটাবেস সংযোগ ও অবস্থা (Turso DB)' : 'Turso Database Architecture & Status'}</span>
                    </h4>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{dbStatus?.isRemote ? (language === 'bn' ? 'টারসো ক্লাউড সক্রিয়' : 'Turso Cloud Active') : (language === 'bn' ? 'libSQL সক্রিয়' : 'libSQL Active')}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-neutral-800/80 p-3 rounded-xl border border-neutral-700/70">
                      <span className="text-[11px] text-neutral-400 block">{language === 'bn' ? 'প্রোভাইডার ইঞ্জিন' : 'Database Provider'}</span>
                      <span className="text-sm font-bold text-emerald-300 mt-0.5 block">Turso (libSQL)</span>
                    </div>
                    <div className="bg-neutral-800/80 p-3 rounded-xl border border-neutral-700/70">
                      <span className="text-[11px] text-neutral-400 block">{language === 'bn' ? 'সংরক্ষিত আবেদন' : 'Stored Reports'}</span>
                      <span className="text-sm font-bold text-amber-300 mt-0.5 block font-mono-num">{problems.length} {language === 'bn' ? 'টি' : 'records'}</span>
                    </div>
                    <div className="bg-neutral-800/80 p-3 rounded-xl border border-neutral-700/70">
                      <span className="text-[11px] text-neutral-400 block">{language === 'bn' ? 'ইশতেহার প্রতিশ্রুতি' : 'Manifesto Pledges'}</span>
                      <span className="text-sm font-bold text-emerald-300 mt-0.5 block font-mono-num">{manifestoItems.length} {language === 'bn' ? 'টি' : 'items'}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-400 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
                    <p className="leading-relaxed">
                      {language === 'bn'
                        ? 'টারসো ক্লাউড ডেটাবেসের সাথে সংযুক্ত করতে .env ফাইলে TURSO_DATABASE_URL এবং TURSO_AUTH_TOKEN কনফিগার করুন।'
                        : 'To connect to your hosted Turso cloud database, configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your environment variables.'}
                    </p>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
