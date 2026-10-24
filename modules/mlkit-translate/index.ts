import { requireOptionalNativeModule } from 'expo-modules-core';

interface MlKitTranslateModule {
  translate(text: string, from: string, to: string): Promise<string>;
}

export default requireOptionalNativeModule<MlKitTranslateModule>('MlKitTranslate');
