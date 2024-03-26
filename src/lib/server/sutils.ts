import { PERSON_SCHEMA, RELATIVES_SINGLE_TYPE_CHANGE_SCHEMA } from '$lib/types';
import type { RelativesChangeRequest, UpdatablePerson } from '$lib/types';
import { ValidationError } from 'yup';
import { Result, err, ok } from 'neverthrow';

export type FailError = { code: number; message: string };

export function parseUpdatePerson(updateJson?: FormDataEntryValue | null): Result<UpdatablePerson, FailError> {
  if (typeof updateJson !== 'string') {
    return err({ code: 422, message: 'missing person update data' });
  }
  let dangerousPerson: { [k: string]: any };
  try {
    dangerousPerson = JSON.parse(updateJson);
    if (typeof dangerousPerson !== 'object') {
      throw new Error();
    }
  } catch {
    return err({ code: 400, message: 'invalid json' });
  }
  try {
    return ok(PERSON_SCHEMA.validateSync(dangerousPerson, { abortEarly: true, stripUnknown: true }));
  } catch (error) {
    if (error instanceof ValidationError) {
      return err({ code: 422, message: error.message });
    }
    throw error;
  }
}

export function parseUpdateRelatives(
  updateJson: FormDataEntryValue | null,
  personId: string
): Result<RelativesChangeRequest, FailError> {
  if (typeof updateJson !== 'string') {
    return err({ code: 422, message: 'missing relatives update data' });
  }
  let dangerReq: RelativesChangeRequest;
  try {
    dangerReq = JSON.parse(updateJson);
    if (typeof dangerReq !== 'object') {
      throw new Error();
    }
  } catch {
    return err({ code: 400, message: 'invalid json' });
  }
  try {
    const res = Object.fromEntries(
      Object.entries(dangerReq).map(([k, v]) => [
        k,
        RELATIVES_SINGLE_TYPE_CHANGE_SCHEMA.validateSync(v, { abortEarly: true, stripUnknown: true })
      ])
    );
    for (const ch of Object.values(res)) {
      if (ch.added.includes(personId) || ch.removed.includes(personId)) {
        return err({ code: 422, message: 'circular relations are not allowed' });
      }
      for (const rid of ch.removed) {
        if (ch.added.includes(rid)) {
          return err({ code: 422, message: 'conflicting relation directives' });
        }
      }
    }
    return ok(res);
  } catch (error) {
    if (error instanceof ValidationError) {
      return err({ code: 422, message: error.message });
    }
    throw error;
  }
}
