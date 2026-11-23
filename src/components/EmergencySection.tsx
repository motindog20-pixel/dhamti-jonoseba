import React from 'react';
import { Flame, HeartPulse, PhoneCall, ShieldAlert, Siren } from 'lucide-react';
import { Language } from '../types';
import { EMERGENCY_ITEMS, EmergencyContacts, EmergencyId } from '../data/emergencyData';

interface EmergencySectionProps {
  language: Language;
  contacts: EmergencyContacts;
}

const ICONS: Record<EmergencyId, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  national: Siren,
  fire: Flame,
  police: ShieldAlert,
  health: HeartPulse,
};

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const toBnDigits = (s: string) => s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);

/**
 * জরুরি সেবা: বড় বাটন, ট্যাপ করলেই ফোন-ডায়ালার খোলে।
 * নম্বর ফাঁকা থাকলে মিথ্যা নম্বর না দেখিয়ে সৎভাবে "শীঘ্রই যুক্ত হবে" দেখায়।
 */
export const EmergencySection: React.FC<EmergencySectionProps> = ({ language, contacts }) => {
  const bn = language === 'bn';
  return (
    <section id="emergency" className="py-8 sm:py-10 bg-red-50 border-y border-red-100 scroll-mt-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-red-900 font-serif-bangla leading-[1.3]">
            {bn ? 'জরুরি সেবা' : 'Emergency Services'}
          </h2>
          <p className="mt-1 text-sm sm:text-base text-red-900/80">
            {bn ? 'বিপদে নম্বরে চাপ দিলেই সরাসরি ফোন যাবে।' : 'Tap a number to call directly.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {EMERGENCY_ITEMS.map((item) => {
            const Icon = ICONS[item.id];
            const number = (contacts[item.id] || '').trim();
            const tel = number.replace(/[^0-9+]/g, '');
            const shown = bn ? toBnDigits(number) : number;
            const title = bn ? item.bn : item.en;
            const note = bn ? item.noteBn : item.noteEn;
            const body = (
              <>
                <span className="w-12 h-12 shrink-0 rounded-xl bg-red-600 text-white flex items-center justify-center">
                  <Icon className="w-6 h-6" aria-hidden={true} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base sm:text-lg font-bold text-neutral-900 leading-snug">{title}</span>
                  {number ? (
                    <span className="block text-2xl sm:text-3xl font-extrabold text-red-700 font-mono-num tracking-wide leading-tight">
                      {shown}
                    </span>
                  ) : (
                    <span className="block text-base font-semibold text-neutral-500">
                      {bn ? 'নম্বর শীঘ্রই যুক্ত হবে' : 'Number coming soon'}
                    </span>
                  )}
                  <span className="block text-xs sm:text-sm text-neutral-600 leading-snug mt-0.5">{note}</span>
                </span>
                {number && <PhoneCall className="w-6 h-6 shrink-0 text-red-600" aria-hidden={true} />}
              </>
            );
            const base = 'flex items-center gap-3 sm:gap-4 rounded-2xl bg-white border p-4 shadow-sm';
            return number ? (
              <a
                key={item.id}
                href={`tel:${tel}`}
                aria-label={`${title}: ${number}`}
                className={`${base} border-red-200 hover:border-red-400 active:bg-red-50 transition-colors`}
              >
                {body}
              </a>
            ) : (
              <div key={item.id} className={`${base} border-neutral-200 opacity-90`}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
