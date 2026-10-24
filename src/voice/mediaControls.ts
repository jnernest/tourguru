import GuideAudio, { type MediaAction } from '../../modules/guide-audio';

export type { MediaAction };

export function startMediaControls(onAction: (action: MediaAction) => void): () => void {
  if (!GuideAudio) return () => undefined;
  GuideAudio.activate('TourGuide', 'Guiding your walk');
  const subscription = GuideAudio.addListener('onMediaButton', (event) => onAction(event.action));
  return () => {
    subscription.remove();
    GuideAudio?.deactivate();
  };
}

export function showNowPlaying(title: string, playing: boolean): void {
  GuideAudio?.activate(title, 'TourGuide');
  GuideAudio?.setPlaying(playing);
}

export function duckOtherAudio(duck: boolean): void {
  if (duck) GuideAudio?.duck();
  else GuideAudio?.unduck();
}
