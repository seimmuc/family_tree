import path from 'node:path';
import fs from 'node:fs';

import { MEDIA_ROOT } from '$env/static/private';
import { PUBLIC_MEDIA_IMAGE_MIME_TYPES } from '$env/static/public';
import { Writable } from 'node:stream';

function toFullPath(relPath: string): string {
  return path.posix.join(MEDIA_ROOT, relPath);
}

export async function addOrReplacePhoto(
  personUuid: string,
  file: File,
  oldFileName?: string
): Promise<[string, boolean]> {
  if (!PUBLIC_MEDIA_IMAGE_MIME_TYPES.includes(file.type)) {
    throw Error(`photo's MIME type "${file.type}" is not allowed`);
  }
  const fileName = `${personUuid}|${crypto.randomUUID()}`;
  const writeStream = fs.createWriteStream(toFullPath(fileName));
  await file.stream().pipeTo(Writable.toWeb(writeStream));
  if (oldFileName !== undefined) {
    return [fileName, await tryDeletePhoto(oldFileName)];
  }
  return [fileName, false];
}

export async function tryDeletePhoto(fileName: string): Promise<boolean> {
  try {
    await fs.promises.unlink(toFullPath(fileName));
    return true;
  } catch {
    return false;
  }
}
