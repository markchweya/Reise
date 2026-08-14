import * as FileSystem from 'expo-file-system/legacy';
import { ai } from '../ai';
import type { NoteRow } from '../db/repo';

const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.json'];

export function isPlainText(nameOrUri: string, mimeType?: string | null): boolean {
  if (mimeType?.startsWith('text/')) return true;
  const lower = nameOrUri.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function guessMediaType(nameOrUri: string, fallback = 'application/octet-stream'): string {
  const lower = nameOrUri.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.webp')) return 'image/webp';
  return fallback;
}

/**
 * The one place file bytes become text.
 *
 * Plain text is read locally. PDF, DOCX and photos go to the provider's
 * document/vision path — pure-JS PDF parsing on React Native is fragile and
 * pdfjs-dist does not run under Expo Go at all. Swap this function's body when
 * a native extractor is available on a dev build; nothing else changes.
 */
export async function extractText(note: NoteRow): Promise<string> {
  if (note.text.trim().length > 0) return note.text;
  if (!note.original_uri) throw new Error('This note has no file attached to read.');

  if (isPlainText(note.original_uri)) {
    return FileSystem.readAsStringAsync(note.original_uri, { encoding: FileSystem.EncodingType.UTF8 });
  }

  const base64 = await FileSystem.readAsStringAsync(note.original_uri, { encoding: FileSystem.EncodingType.Base64 });
  const provider = ai();
  if (!provider.supportsVision) {
    throw new Error('This file type needs a provider that can read documents. Switch SOMA_PROVIDER back to proxy.');
  }
  return provider.extractDocumentText({
    base64,
    mediaType: guessMediaType(note.original_uri),
    filename: note.title,
  });
}
