export interface Category {
  value: string;
  label: string;
  icon: string;
}

export const STOP_CATEGORIES: Category[] = [
  { value: 'arrival', label: 'Arrival City', icon: '🛬' },
  { value: 'departure', label: 'Departure City', icon: '🛫' },
  { value: 'transfer', label: 'Transfer / Multi-city', icon: '🔄' },
  { value: 'flight', label: 'Flight', icon: '✈️' },
  { value: 'train', label: 'Train', icon: '🚂' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'car_rental', label: 'Car Rental', icon: '🚗' },
  { value: 'ferry', label: 'Ferry / Cruise', icon: '🚢' },
  { value: 'accommodation', label: 'Hotel / Stay', icon: '🏨' },
  { value: 'food', label: 'Food & Dining', icon: '🍽️' },
  { value: 'attraction', label: 'Attraction', icon: '🏛️' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎭' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'souvenirs', label: 'Souvenirs', icon: '🎁' },
  { value: 'outdoors', label: 'Outdoors / Nature', icon: '🏞️' },
  { value: 'beach', label: 'Beach', icon: '🏖️' },
  { value: 'spa', label: 'Spa / Wellness', icon: '💆' },
  { value: 'sports', label: 'Sports / Adventure', icon: '🧗' },
  { value: 'nightlife', label: 'Nightlife', icon: '🎉' },
  { value: 'medical', label: 'Medical', icon: '🏥' },
  { value: 'other', label: 'Other', icon: '📍' },
];

export const EXPENSE_CATEGORIES: Category[] = [
  { value: 'flight', label: 'Flights', icon: '✈️' },
  { value: 'accommodation', label: 'Accommodation', icon: '🏨' },
  { value: 'food', label: 'Food & Dining', icon: '🍽️' },
  { value: 'transportation', label: 'Transportation', icon: '🚗' },
  { value: 'train', label: 'Train / Rail', icon: '🚂' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'ferry', label: 'Ferry / Cruise', icon: '🚢' },
  { value: 'car_rental', label: 'Car Rental', icon: '🚗' },
  { value: 'fuel', label: 'Gas / Fuel', icon: '⛽' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎭' },
  { value: 'activities', label: 'Activities / Tours', icon: '🎟️' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'souvenirs', label: 'Souvenirs', icon: '🎁' },
  { value: 'groceries', label: 'Groceries', icon: '🛒' },
  { value: 'drinks', label: 'Drinks / Bar', icon: '🍻' },
  { value: 'coffee', label: 'Coffee / Café', icon: '☕' },
  { value: 'tips', label: 'Tips', icon: '💵' },
  { value: 'medical', label: 'Medical', icon: '💊' },
  { value: 'communication', label: 'SIM / Data', icon: '📱' },
  { value: 'visa', label: 'Visa / Entry Fees', icon: '🛂' },
  { value: 'insurance', label: 'Travel Insurance', icon: '🛡️' },
  { value: 'other', label: 'Other', icon: '💰' },
];

export function getCategoryIcon(value: string | null, categories: Category[]): string {
  if (!value) return '';
  return categories.find((c) => c.value === value)?.icon ?? '';
}

export function getCategoryLabel(value: string | null, categories: Category[]): string {
  if (!value) return '';
  return categories.find((c) => c.value === value)?.label ?? value;
}
