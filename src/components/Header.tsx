import React, { useState } from 'react';
import { Language } from '../types';
import { 
  Globe, 
  PlusCircle, 
  Menu, 
  X, 
  Compass, 
  FileCheck2, 
  BarChart3, 
  MessageSquareText, 
  Search,
  Siren
} from 'lucide-react';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenReportModal: () => void;
  onOpenTrackModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onOpenReportModal,
  onOpenTrackModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileNavClick = (callback?: () => void) => {
    setMobileMenuOpen(false);
    if (callback) {
      callback();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-2xs">
      {/* Primary Top Bar - Engineered to fit seamlessly on all viewports from 320px to 4K */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4 lg:gap-6">
        
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-neutral-600 hover:text-emerald-800 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-neutral-800" /> : <Menu className="w-5 h-5" />}
          </button>

          <a 
            href="#hero-banner" 
            className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-emerald-950 hover:text-emerald-800 transition-colors font-serif-bangla truncate"
          >
            <span className="hidden sm:inline">ধামতী জনসেবা মঞ্চ</span>
            <span className="sm:hidden">{language === 'bn' ? 'ধামতী জনসেবা' : 'Jonoseba'}</span>
          </a>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-6 text-sm lg:text-base font-medium text-neutral-600">
          <a href="#hero-banner" className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0">
            {language === 'bn' ? 'মূলবার্তা' : 'Overview'}
          </a>
          <a href="#emergency" className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0 font-semibold text-red-700">
            {language === 'bn' ? 'জরুরি সেবা' : 'Emergency'}
          </a>
          <a href="#manifesto" className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 font-semibold text-emerald-900">
            {language === 'bn' ? 'আমাদের অঙ্গীকার' : 'Our Pledge'}
          </a>
          <a href="#statistics" className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0">
            {language === 'bn' ? 'পরিসংখ্যান' : 'Statistics'}
          </a>
          <button 
            type="button"
            onClick={onOpenTrackModal} 
            className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Search className="w-4 h-4 text-neutral-500" />
            <span>{language === 'bn' ? 'ট্র্যাকিং' : 'Track Status'}</span>
          </button>
        </nav>

        {/* Right: Language Switcher & Primary Action Button (Zero Horizontal Overflow) */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={() => onLanguageChange(language === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200/90 rounded-lg transition-colors whitespace-nowrap cursor-pointer border border-neutral-200/80"
            aria-label="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-neutral-500" />
            <span className="font-semibold">{language === 'bn' ? 'EN' : 'বাংলা'}</span>
          </button>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={onOpenReportModal}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-98 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span className="hidden min-[480px]:inline">{language === 'bn' ? 'অভিযোগ / উপদেশ দিন' : 'Report / Advise'}</span>
            <span className="min-[480px]:hidden">{language === 'bn' ? 'অভিযোগ' : 'Report'}</span>
          </button>
        </div>
      </div>

      {/* MOBILE INTEGRATED NAV STRIP: Fits the entire navigation into mobile screens with zero clipping */}
      <div className="md:hidden border-t border-neutral-200/80 bg-neutral-50/95 backdrop-blur-md px-1 py-1 shadow-2xs">
        <div className="grid grid-cols-5 gap-0.5 sm:gap-1 text-center">
          <a
            href="#hero-banner"
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-xs sm:text-xs font-semibold text-neutral-700 hover:text-emerald-900 hover:bg-emerald-50/80 transition-colors min-w-0"
          >
            <Compass className="w-4 h-4 text-emerald-700 mb-0.5 shrink-0" />
            <span className="truncate w-full leading-tight">{language === 'bn' ? 'মূলবার্তা' : 'Overview'}</span>
          </a>

          <a
            href="#emergency"
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-xs sm:text-xs font-bold text-red-800 bg-red-50 border border-red-200 transition-colors min-w-0"
          >
            <Siren className="w-4 h-4 text-red-600 mb-0.5 shrink-0" />
            <span className="truncate w-full leading-tight">{language === 'bn' ? 'জরুরি' : 'Urgent'}</span>
          </a>

          <a
            href="#manifesto"
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-xs sm:text-xs font-bold text-emerald-950 bg-emerald-100/70 border border-emerald-200/80 transition-colors min-w-0"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-800 mb-0.5 shrink-0" />
            <span className="truncate w-full leading-tight">{language === 'bn' ? 'অঙ্গীকার' : 'Pledge'}</span>
          </a>

          <a
            href="#statistics"
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-xs sm:text-xs font-semibold text-neutral-700 hover:text-emerald-900 hover:bg-emerald-50/80 transition-colors min-w-0"
          >
            <BarChart3 className="w-4 h-4 text-emerald-700 mb-0.5 shrink-0" />
            <span className="truncate w-full leading-tight">{language === 'bn' ? 'পরিসংখ্যান' : 'Stats'}</span>
          </a>

          <button
            type="button"
            onClick={onOpenTrackModal}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-xs sm:text-xs font-semibold text-neutral-700 hover:text-emerald-900 hover:bg-emerald-50/80 transition-colors cursor-pointer min-w-0"
          >
            <Search className="w-4 h-4 text-emerald-700 mb-0.5 shrink-0" />
            <span className="truncate w-full leading-tight">{language === 'bn' ? 'ট্র্যাকিং' : 'Track'}</span>
          </button>
        </div>
      </div>

      {/* MOBILE EXPANDED MENU DRAWER (When toggled via hamburger) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-3 shadow-lg space-y-2 animate-in slide-in-from-top-2 duration-200">
          <a
            href="#hero-banner"
            onClick={() => handleMobileNavClick()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-800 hover:bg-neutral-100 hover:text-emerald-800 transition-colors"
          >
            <Compass className="w-4 h-4 text-emerald-700" />
            <span>{language === 'bn' ? 'মূলবার্তা (সারসংক্ষেপ)' : 'Overview'}</span>
          </a>

          <a
            href="#emergency"
            onClick={() => handleMobileNavClick()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-800 bg-red-50 hover:bg-red-100/70 transition-colors"
          >
            <Siren className="w-4 h-4 text-red-600" />
            <span>{language === 'bn' ? 'জরুরি সেবা' : 'Emergency Services'}</span>
          </a>

          <a
            href="#manifesto"
            onClick={() => handleMobileNavClick()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-emerald-950 bg-emerald-50 hover:bg-emerald-100/70 transition-colors"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-700" />
            <span>{language === 'bn' ? 'আমাদের অঙ্গীকার ও রূপকল্প' : 'Our Pledge'}</span>
          </a>

          <a
            href="#statistics"
            onClick={() => handleMobileNavClick()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-800 hover:bg-neutral-100 hover:text-emerald-800 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-emerald-700" />
            <span>{language === 'bn' ? 'এলাকাভিত্তিক পরিসংখ্যান' : 'Ward Statistics'}</span>
          </a>

          <button
            type="button"
            onClick={() => handleMobileNavClick(onOpenTrackModal)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-800 hover:bg-neutral-100 hover:text-emerald-800 transition-colors cursor-pointer text-left"
          >
            <Search className="w-4 h-4 text-emerald-700" />
            <span>{language === 'bn' ? 'আবেদনের অবস্থা ট্র্যাকিং' : 'Track Application Status'}</span>
          </button>
        </div>
      )}
    </header>
  );
};
