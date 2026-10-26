export const MASSAGE_TYPES = [
  'deep_tissue',
  'thai_oil',
  'thai_yoga',
  'aroma',
  'pregnancy',
  'lymphatic',
  'foot',
  'swedish',
  'back_neck',
  'sport',
  'hot_stone',
  'other',
] as const;

export type MassageType = (typeof MASSAGE_TYPES)[number];

const MASSAGE_TYPE_NAMES: Record<MassageType, string> = {
  deep_tissue: 'Deep Tissue',
  thai_oil: 'Thai Oil Massage',
  thai_yoga: 'Thai Yoga',
  aroma: 'Aroma',
  pregnancy: 'Pregnancy',
  lymphatic: 'Lymphatic',
  foot: 'Foot Massage',
  swedish: 'Swedish',
  back_neck: 'Back & Neck',
  sport: 'Sport Massage',
  hot_stone: 'Hot Stone',
  other: 'Other',
};

export function massageTypeName(massageType: MassageType): string {
  return MASSAGE_TYPE_NAMES[massageType];
}
