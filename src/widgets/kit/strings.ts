import type { LangCode } from '../../i18n/languages.ts';

/** Strings shared by all widgets (frame buttons). Widget-specific text lives next to each widget. */
export const kitStrings: Record<LangCode, { reset: string; play: string; pause: string }> = {
  en: { reset: 'Start again', play: 'Play', pause: 'Pause' },
  sk: { reset: 'Začať odznova', play: 'Spustiť', pause: 'Zastaviť' },
};
