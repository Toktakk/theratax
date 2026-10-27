import type { ChangeEvent } from 'react';
import type { AddressDraft } from './address.ts';

export function AddressFields({
  draft,
  onChange,
}: {
  draft: AddressDraft;
  onChange: (draft: AddressDraft) => void;
}) {
  function setField(key: keyof AddressDraft) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...draft, [key]: event.target.value });
    };
  }

  return (
    <fieldset>
      <legend>Address</legend>
      <label className="field">
        Address line 1
        <input value={draft.addressLine1} maxLength={100} onChange={setField('addressLine1')} />
      </label>
      <label className="field">
        Address line 2
        <input value={draft.addressLine2} maxLength={100} onChange={setField('addressLine2')} />
      </label>
      <div className="money-fields">
        <label className="field">
          Town
          <input value={draft.town} maxLength={80} onChange={setField('town')} />
        </label>
        <label className="field">
          Postcode
          <input value={draft.postcode} maxLength={8} onChange={setField('postcode')} />
        </label>
      </div>
    </fieldset>
  );
}
