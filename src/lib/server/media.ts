import path from 'node:path';
import fs from 'node:fs';

import { MEDIA_ROOT, MEDIA_IMAGE_MIME_TYPES } from '$env/static/private';
import { Writable } from 'node:stream';

export async function addOrReplacePhoto(personUuid: string, file: File): Promise<boolean> {
  if (!MEDIA_IMAGE_MIME_TYPES.includes(file.type)) {
    throw Error(`photo's MIME type "${file.type}" is not allowed`);
  }
  const fullPath = path.posix.join(MEDIA_ROOT, `${personUuid}`);
  const writeStream = fs.createWriteStream(fullPath);
  await file.stream().pipeTo(Writable.toWeb(writeStream));
  return true;
}
