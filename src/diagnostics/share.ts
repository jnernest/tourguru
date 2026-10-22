import { Platform, Share } from 'react-native';

import { errorText, formatLog, log } from './log';

interface ErrorUtilsLike {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
}

let installed = false;

/** Records uncaught JS errors in the diagnostic log before React Native handles them as usual. */
export function captureUncaughtErrors(): void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (installed || !errorUtils) return;
  installed = true;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    const stack = error instanceof Error && error.stack ? `\n${error.stack.slice(0, 1_500)}` : '';
    log('error', `Uncaught${isFatal ? ' (fatal)' : ''}: ${errorText(error)}${stack}`);
    previous(error, isFatal);
  });
}

/** Opens the system share sheet with the diagnostic log (email, chat, notes…). */
export async function shareDiagnostics(context: Record<string, string>): Promise<void> {
  const details = Object.entries(context).map(([k, v]) => `${k}=${v}`).join(' ');
  const header = `TourGuide diagnostics · ${Platform.OS} ${String(Platform.Version)} · ${details}`;
  await Share.share({ title: 'TourGuide log', message: formatLog(header) });
}
