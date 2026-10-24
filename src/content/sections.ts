export interface Section {
  heading: string;
  level: number;
  text: string;
}

const HEADING = /^(={2,6})\s*(.+?)\s*\1\s*$/;

const HISTORY_HEADING = /histor|geschicht|histoire|historia|storia|इतिहास/i;

export function parseSections(text: string): Section[] {
  const sections: Section[] = [{ heading: '', level: 1, text: '' }];
  for (const line of text.split('\n')) {
    const match = HEADING.exec(line.trim());
    if (match) {
      sections.push({ heading: match[2], level: match[1].length, text: '' });
    } else {
      sections[sections.length - 1].text += `${line}\n`;
    }
  }
  return sections;
}

export function historyText(sections: Section[]): string {
  const start = sections.findIndex((s) => s.level >= 2 && HISTORY_HEADING.test(s.heading));
  if (start === -1) return '';
  const level = sections[start].level;
  const end = sections.findIndex((s, i) => i > start && s.level <= level);
  return sections
    .slice(start, end === -1 ? undefined : end)
    .map((s) => s.text)
    .join('\n');
}
