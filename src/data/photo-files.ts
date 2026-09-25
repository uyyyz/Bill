import { Directory, File, Paths } from 'expo-file-system';

const photoDirectory = new Directory(Paths.document, 'ledger-photos');
const validName = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|heic|heif|webp|avif|gif)$/;

export function makePhotoName(uri: string, mimeType?: string | null) {
  const fromUri = uri.split('?')[0].match(/\.(jpg|jpeg|png|heic|heif|webp|avif|gif)$/i)?.[1]?.toLowerCase();
  const fromMime = mimeType?.split('/')[1]?.toLowerCase();
  const extension = fromUri ?? (fromMime && /^(jpeg|png|heic|heif|webp|avif|gif)$/.test(fromMime) ? fromMime : 'jpg');
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}.${extension}`;
}

function photoFile(name: string) {
  if (!validName.test(name)) throw new Error('照片文件名无效');
  return new File(photoDirectory, name);
}

export function photoUri(name: string) {
  return photoFile(name).uri;
}

export async function copyPhotoToStorage(sourceUri: string, name: string) {
  if (!sourceUri.startsWith('file://')) throw new Error('无法读取所选照片');
  photoDirectory.create({ idempotent: true });
  await new File(sourceUri).copy(photoFile(name));
}

export function removePhotoFile(name: string) {
  const file = photoFile(name);
  if (file.exists) file.delete();
}

export function removeAllPhotoFiles() {
  if (photoDirectory.exists) photoDirectory.delete();
}
