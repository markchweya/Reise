import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { createNote, deleteNote, listNotes, logEvent, type NoteSummary } from '../db/repo';
import { ingestNote, resumeUnfinished, type IngestProgress } from '../ingest/pipeline';
import { isPlainText } from '../ingest/extract';

interface LibraryState {
  notes: NoteSummary[];
  loading: boolean;
  progress: Record<string, IngestProgress>;
  refresh: () => Promise<void>;
  bootstrap: () => Promise<void>;
  importDocument: () => Promise<void>;
  importPhoto: () => Promise<void>;
  retry: (noteId: string) => Promise<void>;
  remove: (noteId: string) => Promise<void>;
}

const NOTES_DIR = `${FileSystem.documentDirectory ?? ''}soma-notes/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(NOTES_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(NOTES_DIR, { intermediates: true });
}

export const useLibrary = create<LibraryState>((set, get) => ({
  notes: [],
  loading: true,
  progress: {},

  refresh: async () => {
    set({ notes: await listNotes(), loading: false });
  },

  bootstrap: async () => {
    await get().refresh();
    // Anything a previous session left half-indexed picks up here.
    await resumeUnfinished((p) => {
      set((s) => ({ progress: { ...s.progress, [p.noteId]: p } }));
      if (p.phase === 'done' || p.phase === 'failed') void get().refresh();
    });
    await get().refresh();
  },

  importDocument: async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/plain', 'text/markdown', 'application/pdf',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'public.item'],
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    await ensureDir();

    for (const asset of result.assets) {
      const dest = `${NOTES_DIR}${Date.now()}-${asset.name.replace(/[^\w.\-]/g, '_')}`;
      await FileSystem.copyAsync({ from: asset.uri, to: dest });
      const noteId = await createNote({
        title: asset.name.replace(/\.[^.]+$/, ''),
        sourceType: isPlainText(asset.name, asset.mimeType) ? 'text' : 'document',
        originalUri: dest,
        byteSize: asset.size ?? 0,
      });
      await get().refresh();
      void runIngest(noteId, set, get);
    }
  },

  importPhoto: async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('Soma needs photo access to read pictures of your notes.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true });
    if (result.canceled) return;
    await ensureDir();

    for (const asset of result.assets) {
      const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
      const dest = `${NOTES_DIR}${Date.now()}-${name.replace(/[^\w.\-]/g, '_')}`;
      await FileSystem.copyAsync({ from: asset.uri, to: dest });
      const noteId = await createNote({
        title: name.replace(/\.[^.]+$/, ''),
        sourceType: 'image',
        originalUri: dest,
        byteSize: asset.fileSize ?? 0,
      });
      await get().refresh();
      void runIngest(noteId, set, get);
    }
  },

  retry: async (noteId) => {
    await runIngest(noteId, set, get);
  },

  remove: async (noteId) => {
    await deleteNote(noteId);
    await logEvent('note_deleted');
    await get().refresh();
  },
}));

type Setter = (fn: (s: LibraryState) => Partial<LibraryState>) => void;

async function runIngest(noteId: string, set: Setter, get: () => LibraryState): Promise<void> {
  await ingestNote(noteId, (p) => set((s) => ({ progress: { ...s.progress, [noteId]: p } })));
  await get().refresh();
}
