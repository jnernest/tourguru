import { requireOptionalNativeModule } from 'expo-modules-core';

interface MlKitTranslateModule {
  /** Translates `text` between BCP-47 language tags, e.g. "de" → "en". Rejects with a detailed reason. */
  translate(text: string, from: string, to: string): Promise<string>;
}

/** Null where the native module is absent: web, Expo Go, iOS (Android-only for now). */
export default requireOptionalNativeModule<MlKitTranslateModule>('MlKitTranslate');
