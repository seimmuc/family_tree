import { MEDIA_ROOT } from '$env/static/private';
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';

export const GET = async ({ params }) => {
  console.log('path: ', params.path);
  // normalize the path, then remove any "../" and "/" parts from the beginning of the path
  const safeRelPath = path.posix.normalize(params.path).replace(/^(\.\.(\/|\\|$)|\/)+/i, '');
  const fullPath = path.posix.join(MEDIA_ROOT, safeRelPath);
  try {
    const fileStream = fs.createReadStream(fullPath);
    const webStream = Readable.toWeb(fileStream);
    return new Response(webStream as ReadableStream); // Looks like typescript pulls definitions of what should be the same nodejs built-in type from 2 different places which slightly differ.
  } catch (e: any) {
    if (e?.code === 'ENOENT') {
      throw error(404);
    }
    throw e;
  }
};
