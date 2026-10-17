/** Translates text between Wikipedia/ISO language codes, e.g. "de" → "en". Throws on failure. */
export interface Translator {
  translate(text: string, from: string, to: string): Promise<string>;
}
