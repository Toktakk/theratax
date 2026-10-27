export interface AddressDraft {
  addressLine1: string;
  addressLine2: string;
  town: string;
  postcode: string;
}

export interface AddressRecord {
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  postcode?: string;
}

export function emptyAddress(): AddressDraft {
  return { addressLine1: '', addressLine2: '', town: '', postcode: '' };
}

export function addressFromRecord(record: AddressRecord): AddressDraft {
  return {
    addressLine1: record.addressLine1 ?? '',
    addressLine2: record.addressLine2 ?? '',
    town: record.town ?? '',
    postcode: record.postcode ?? '',
  };
}

export function hasAddress(record: AddressRecord): boolean {
  return (
    record.addressLine1 !== undefined &&
    record.addressLine1.length > 0 &&
    record.town !== undefined &&
    record.town.length > 0 &&
    record.postcode !== undefined &&
    record.postcode.length > 0
  );
}

export function formatAddress(record: AddressRecord): string {
  return [record.addressLine1, record.addressLine2, record.town, record.postcode]
    .filter((part) => part !== undefined && part.length > 0)
    .join(', ');
}

export function addressPayload(draft: AddressDraft): {
  addressLine1: string;
  addressLine2?: string;
  town: string;
  postcode: string;
} {
  const addressLine1 = draft.addressLine1.trim();
  const town = draft.town.trim();
  const postcode = draft.postcode.trim();
  const addressLine2 = draft.addressLine2.trim();
  if (addressLine2.length > 0) {
    return { addressLine1, addressLine2, town, postcode };
  }
  return { addressLine1, town, postcode };
}

export function addressError(draft: AddressDraft): string {
  if (
    draft.addressLine1.trim().length < 1 ||
    draft.town.trim().length < 1 ||
    draft.postcode.trim().length < 1
  ) {
    return 'Enter the address.';
  }
  return '';
}
