import { PERSON_SCHEMA, type UpdatablePerson } from "$lib/types";
import { ValidationError } from "yup";

export type FailError = { code: number, message: string };

export function parseUpdatePerson(updateJson?: FormDataEntryValue | null): UpdatablePerson | FailError {
  if (typeof updateJson !== 'string') {
    return { code: 422, message: 'missing person update data' };
  }
  let dangerousPerson: { [k: string]: any };
  try {
    dangerousPerson = JSON.parse(updateJson);
    if (typeof dangerousPerson !== 'object') {
      throw new Error();
    }
  } catch {
    return { code: 400, message: 'invalid json' };
  }
  try {
    return PERSON_SCHEMA.validateSync(dangerousPerson, { abortEarly: true, stripUnknown: true });
  } catch (err) {
    if (err instanceof ValidationError) {
      return { code: 422, message: err.message };
    }
    throw err;
  }
}
