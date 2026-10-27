import { BadRequestException } from '@nestjs/common';

export const HOUR_EXTRA_TYPES = ['pregnancy', 'hot_stone', 'body_scrub', 'request', 'other'] as const;

export type HourExtraType = (typeof HOUR_EXTRA_TYPES)[number];

export interface HourExtraInput {
  massageType: string;
  customMassageType?: string;
  extraPence: number;
}

export interface HourExtraResponse {
  massageType: HourExtraType;
  customMassageType?: string;
  extraPence: number;
}

export interface StoredHourExtra {
  massageType: HourExtraType;
  customMassageType: string | null;
  extraPence: number;
}

export function isHourExtraType(value: string): value is HourExtraType {
  return HOUR_EXTRA_TYPES.some((type) => type === value);
}

export function readHourExtras(input: readonly HourExtraInput[]): StoredHourExtra[] {
  const seen = new Set<string>();
  const rows: StoredHourExtra[] = [];
  for (const extra of input) {
    if (!isHourExtraType(extra.massageType)) {
      throw new BadRequestException('Hour extra massage type is not valid');
    }
    const custom = readCustomName(extra);
    const key = extraKey(extra.massageType, custom);
    if (seen.has(key)) {
      throw new BadRequestException('Hour extra already set for this massage type');
    }
    seen.add(key);
    rows.push({
      massageType: extra.massageType,
      customMassageType: custom,
      extraPence: extra.extraPence,
    });
  }
  return rows;
}

export function hourExtrasResponse(
  rows: readonly {
    massageType: string;
    customMassageType: string | null;
    extraPence: number;
  }[],
): HourExtraResponse[] {
  const known: StoredHourExtra[] = [];
  for (const row of rows) {
    if (isHourExtraType(row.massageType)) {
      known.push({
        massageType: row.massageType,
        customMassageType: row.customMassageType,
        extraPence: row.extraPence,
      });
    }
  }
  known.sort((left, right) => {
    const typeDiff = HOUR_EXTRA_TYPES.indexOf(left.massageType) - HOUR_EXTRA_TYPES.indexOf(right.massageType);
    if (typeDiff !== 0) {
      return typeDiff;
    }
    return (left.customMassageType ?? '').localeCompare(right.customMassageType ?? '', undefined, {
      sensitivity: 'base',
    });
  });
  return known.map((row) => {
    const response: HourExtraResponse = {
      massageType: row.massageType,
      extraPence: row.extraPence,
    };
    if (row.customMassageType !== null && row.customMassageType !== '') {
      response.customMassageType = row.customMassageType;
    }
    return response;
  });
}

function readCustomName(extra: HourExtraInput): string | null {
  const trimmed = extra.customMassageType?.trim() ?? '';
  if (extra.massageType === 'other') {
    if (trimmed.length === 0) {
      throw new BadRequestException('Custom massage type is required');
    }
    if (trimmed.length > 100) {
      throw new BadRequestException('Custom massage type is too long');
    }
    return trimmed;
  }
  if (trimmed.length > 0) {
    throw new BadRequestException('Custom massage type is only valid for other');
  }
  return null;
}

function extraKey(massageType: HourExtraType, customMassageType: string | null): string {
  if (massageType === 'other') {
    return `other:${(customMassageType ?? '').toLowerCase()}`;
  }
  return massageType;
}
