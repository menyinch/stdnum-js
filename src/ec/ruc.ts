/**
 * RUC (Registro Único de Contribuyentes, Ecuadorian company tax number).
 *
 * The RUC is a tax identification number for legal entities. It has 13 digits
 * where the third digit is a number denoting the type of entity.
 *
 * Company RUCs (third digit 6 = public, 9 = private/juridical) are issued by
 * the SRI without any check-digit algorithm, so only structural checks apply
 * to them; the historical mod-11 scheme rejects real registry-valid numbers.
 * Cedula-based RUCs (third digit 0-5) do carry the cedula's check digit.
 *
 * Source
 *   https://minka.gob.ec/mintel/ge/rutr/gobec_forms/-/issues/32
 *   https://www.sri.gob.ec/en/web/intersri/consulta-al-ruc
 *
 * TAX/VAT
 */

import * as exceptions from '../exceptions';
import * as ci from './ci';
import { strings } from '../util';
import { Validator, ValidateReturn } from '../types';

function clean(input: string): ReturnType<typeof strings.cleanUnicode> {
  return strings.cleanUnicode(input, ' -.');
}

const impl: Validator = {
  name: 'Ecuadorian Company Tax Number',
  localName: 'Registro Único de Contribuyentes',
  abbreviation: 'RUC',
  compact(input: string): string {
    const [value, err] = clean(input);

    if (err) {
      throw err;
    }

    return value;
  },

  format(input: string): string {
    const [value] = clean(input);

    return strings.splitAt(value, 10).join('-');
  },

  validate(input: string): ValidateReturn {
    const [value, error] = clean(input);

    if (error) {
      return { isValid: false, error };
    }
    if (value.length !== 13) {
      return { isValid: false, error: new exceptions.InvalidLength() };
    }
    if (!strings.isdigits(value)) {
      return { isValid: false, error: new exceptions.InvalidFormat() };
    }
    if (!ci.validPrefix(value)) {
      // Invalid province
      return { isValid: false, error: new exceptions.InvalidComponent() };
    }

    if (parseInt(value[2], 10) < 6) {
      //  Natural RUC: CI plus establishment number
      const [front, end] = strings.splitAt(value, 10);
      if (end === '000') {
        return { isValid: false, error: new exceptions.InvalidComponent() };
      }

      return ci.validate(front);
    }

    if (value[2] === '6') {
      // Public RUC: SRI issues these without a check-digit algorithm, so
      // only the establishment number is checked.
      const [, end] = strings.splitAt(value, 9);
      if (end === '0000') {
        return { isValid: false, error: new exceptions.InvalidComponent() };
      }
    } else if (value[2] === '9') {
      // Juridical RUC: SRI issues these without a check-digit algorithm, so
      // only the establishment number is checked.
      const [, end] = strings.splitAt(value, 10);
      if (end === '000') {
        return { isValid: false, error: new exceptions.InvalidComponent() };
      }
    } else {
      return { isValid: false, error: new exceptions.InvalidComponent() };
    }

    return {
      isValid: true,
      compact: value,
      isIndividual: false,
      isCompany: true,
    };
  },
};

export const { name, localName, abbreviation, validate, format, compact } =
  impl;
