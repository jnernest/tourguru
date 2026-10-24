import { NativeModule, requireOptionalNativeModule } from 'expo-modules-core';

export type MediaAction = 'playPause' | 'next' | 'previous';

type GuideAudioEvents = {
  onMediaButton: (event: { action: MediaAction }) => void;
};

declare class GuideAudioModule extends NativeModule<GuideAudioEvents> {
  activate(title: string, subtitle: string): void;
  setPlaying(playing: boolean): void;
  deactivate(): void;
  duck(): void;
  unduck(): void;
}

export default requireOptionalNativeModule<GuideAudioModule>('GuideAudio');
