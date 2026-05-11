export const CATEGORIES = [
  { id: 'all', label: 'For You', icon: 'Sparkle', sub: 'Personalized picks', emoji: '✨' },
  { id: 'Textbooks', label: 'Textbooks', icon: 'Book', sub: 'Course books & notes', emoji: '📚' },
  { id: 'Furniture', label: 'Furniture', icon: 'Sofa', sub: 'Desks, chairs & more', emoji: '🛋️' },
  { id: 'Electronics', label: 'Electronics', icon: 'Laptop', sub: 'Gadgets & devices', emoji: '💻' },
  { id: 'Clothing', label: 'Clothing', icon: 'Shirt', sub: 'Fashion & accessories', emoji: '👕' },
  { id: 'Sports', label: 'Sports', icon: 'Bike', sub: 'Gear & equipment', emoji: '🏀' },
  { id: 'Appliances', label: 'Appliances', icon: 'Music', sub: 'Hostel essentials', emoji: '🔌' },
  { id: 'Other', label: 'Other', icon: 'Tag', sub: 'Everything else', emoji: '📦' },
];

export const CAT_TILES = [
  { id: 'Textbooks', label: 'Textbooks', icon: 'Book', emoji: '📚' },
  { id: 'Furniture', label: 'Furniture', icon: 'Sofa', emoji: '🛋️' },
  { id: 'Electronics', label: 'Electronics', icon: 'Laptop', emoji: '💻' },
  { id: 'Clothing', label: 'Clothing', icon: 'Shirt', emoji: '👕' },
  { id: 'Appliances', label: 'Appliances', icon: 'Music', emoji: '🔌' },
  { id: 'Sports', label: 'Sports & Bikes', icon: 'Bike', emoji: '🚴' },
  { id: 'Other', label: 'Other', icon: 'Tag', emoji: '📦' },
];

export const CONDITIONS = ['Like New', 'Good', 'Fair', 'For Parts'];

export const PICKUP_LOCATIONS = [
  'FCSE Faculty, GIKI Topi',
  'FEE Faculty, GIKI Topi',
  'FME Faculty, GIKI Topi',
  'Central Library',
  'TUC Cafeteria',
  'Hostel 1',
  'Hostel 3',
  'Hostel 7',
  'Main gate parking',
];

// Pickup slot end times use 24-hour format. `day` is 'today' or 'tomorrow'
// and is resolved against the user's local clock at render time so we can
// hide / disable slots whose window has already passed.
export const PICKUP_SLOTS = [
  { id: 's1', day: 'today',    startH: 16, startM: 0, endH: 17, endM: 0, label: 'Today · 4:00 – 5:00 PM',        sub: 'TUC Cafeteria' },
  { id: 's2', day: 'today',    startH: 18, startM: 0, endH: 19, endM: 0, label: 'Today · 6:00 – 7:00 PM',        sub: 'Central Library' },
  { id: 's3', day: 'tomorrow', startH: 11, startM: 0, endH: 12, endM: 0, label: 'Tomorrow · 11:00 AM – 12:00 PM', sub: 'FCSE Faculty' },
  { id: 's4', day: 'tomorrow', startH: 16, startM: 0, endH: 17, endM: 0, label: 'Tomorrow · 4:00 – 5:00 PM',      sub: 'Hostel 1 entrance' },
];

// Returns the Date marking the END of the slot's window, given a reference
// "now" (defaults to the current moment).
export const slotEndDate = (slot, now = new Date()) => {
  const d = new Date(now);
  d.setHours(slot.endH, slot.endM ?? 0, 0, 0);
  if (slot.day === 'tomorrow') d.setDate(d.getDate() + 1);
  return d;
};

export const isSlotPast = (slot, now = new Date()) =>
  slotEndDate(slot, now).getTime() <= now.getTime();

export const DEPTS = ['CS', 'EE', 'CV', 'ME', 'BBA', 'Other'];
