import type { AIProvider, ChatMessage, ChatOpts, DocumentInput, StreamChunk } from './types';
import { NotImplementedError } from './types';

/** Phase 2.
 *
 *  Expo Go ships only the native modules Expo has prebuilt, so it cannot load
 *  react-native-executorch, llama.rn, op-sqlite or any other inference runtime.
 *  Wiring one up means leaving Expo Go for an EAS dev build:
 *
 *      npx expo install expo-dev-client
 *      eas build --profile development --platform ios
 *
 *  When that happens, fill in the three methods below and set
 *  SOMA_PROVIDER=ondevice. Nothing above src/ai/index.ts changes. */
export class OnDeviceProvider implements AIProvider {
  readonly id = 'ondevice';
  readonly supportsVision = false;

  embed(_texts: string[]): Promise<Float32Array[]> {
    throw new NotImplementedError(
      'On-device embeddings need a native inference module, which Expo Go cannot load. Build a dev client first.',
    );
  }

  // eslint-disable-next-line require-yield -- stub; the throw is the whole body
  async *chat(_messages: ChatMessage[], _opts: ChatOpts): AsyncIterable<StreamChunk> {
    throw new NotImplementedError(
      'On-device chat needs a native inference module, which Expo Go cannot load. Build a dev client first.',
    );
  }

  extractDocumentText(_doc: DocumentInput): Promise<string> {
    throw new NotImplementedError('On-device document extraction is not implemented yet.');
  }
}
