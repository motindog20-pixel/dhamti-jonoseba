/**
 * এই ফোনে আগে দেওয়া নাম ও মোবাইল নম্বর মনে রাখা (ফর্ম ও 'অবস্থা দেখুন'-এ নিজে থেকে বসে)।
 * এগুলো শুধু এই ফোনের ব্রাউজারেই থাকে, সার্ভারে নয়। অভিযোগের কোনো তথ্য এখানে রাখা হয় না।
 */
const KEY_CONTACT = 'dhamti_contact_v1';

export function readContact(): { name: string; phone: string } {
  try {
    const raw = localStorage.getItem(KEY_CONTACT);
    const v = raw ? JSON.parse(raw) : {};
    return {
      name: typeof v?.name === 'string' ? v.name : '',
      phone: typeof v?.phone === 'string' ? v.phone : '',
    };
  } catch {
    return { name: '', phone: '' };
  }
}

export function rememberContact(name: string, phone: string): void {
  try {
    localStorage.setItem(KEY_CONTACT, JSON.stringify({ name, phone }));
  } catch {
    // উপেক্ষা
  }
}
