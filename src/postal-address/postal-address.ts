import { BadRequestException } from '@nestjs/common';

const SPACED_POSTCODE = /^(?:GIR 0AA|[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2})$/;

export interface PostalAddressInput {
  addressLine1: string;
  addressLine2?: string;
  town: string;
  postcode: string;
}

export interface PostalAddress {
  addressLine1: string;
  addressLine2?: string;
  town: string;
  postcode: string;
}

export interface AddressColumns {
  addressLine1: string | null;
  addressLine2: string | null;
  town: string | null;
  postcode: string | null;
}

export function normaliseUkPostcode(value: string): string | null {
  const compact = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (compact.length < 5 || compact.length > 7) {
    return null;
  }
  const spaced = `${compact.slice(0, compact.length - 3)} ${compact.slice(-3)}`;
  if (!SPACED_POSTCODE.test(spaced)) {
    return null;
  }
  return spaced;
}

export function readPostalAddress(input: PostalAddressInput): PostalAddress {
  const addressLine1 = input.addressLine1.trim();
  const town = input.town.trim();
  if (addressLine1.length < 1 || town.length < 1) {
    throw new BadRequestException('Address is required');
  }
  const postcode = normaliseUkPostcode(input.postcode);
  if (postcode === null) {
    throw new BadRequestException('Enter a UK postcode');
  }
  const line2 = input.addressLine2?.trim() ?? '';
  const address: PostalAddress = { addressLine1, town, postcode };
  if (line2.length > 0) {
    address.addressLine2 = line2;
  }
  return address;
}

export function storedAddress(row: AddressColumns): PostalAddress | null {
  if (row.addressLine1 === null || row.town === null || row.postcode === null) {
    return null;
  }
  const address: PostalAddress = {
    addressLine1: row.addressLine1,
    town: row.town,
    postcode: row.postcode,
  };
  if (row.addressLine2 !== null && row.addressLine2.length > 0) {
    address.addressLine2 = row.addressLine2;
  }
  return address;
}

export function addressData(address: PostalAddress): {
  addressLine1: string;
  addressLine2: string | null;
  town: string;
  postcode: string;
} {
  return {
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? null,
    town: address.town,
    postcode: address.postcode,
  };
}

export function publicAddress(address: PostalAddress | null): {
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  postcode?: string;
} {
  if (address === null) {
    return {};
  }
  const fields: {
    addressLine1: string;
    addressLine2?: string;
    town: string;
    postcode: string;
  } = {
    addressLine1: address.addressLine1,
    town: address.town,
    postcode: address.postcode,
  };
  if (address.addressLine2 !== undefined) {
    fields.addressLine2 = address.addressLine2;
  }
  return fields;
}

export function addressLines(address: PostalAddress | null): string[] {
  if (address === null) {
    return ['Address not recorded'];
  }
  const lines = [address.addressLine1];
  if (address.addressLine2 !== undefined) {
    lines.push(address.addressLine2);
  }
  lines.push(address.town);
  lines.push(address.postcode);
  return lines;
}
