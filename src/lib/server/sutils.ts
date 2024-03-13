import { PERSON_SCHEMA, type UpdatablePerson } from '$lib/types';
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
