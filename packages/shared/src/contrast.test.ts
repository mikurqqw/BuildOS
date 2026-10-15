import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const css = readFileSync(
  new URL('../../ui/src/tokens.css', import.meta.url),
  'utf8',
);
function luminance(hex: string) {
  const values = hex.match(/[a-f\d]{2}/gi)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
}
for (const [index, block] of css
  .split('}')
  .filter((block) => block.includes('--text:'))
  .entries()) {
  const tokens = Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[a-f\d]{3,6})/gi)].map((match) => [
      match[1],
      match[2]!.length === 4
        ? '#' +
          match[2]!
            .slice(1)
            .split('')
            .map((char) => char + char)
            .join('')
        : match[2]!,
    ]),
  );
  it(`meets AA contrast for semantic text pairs in theme ${index}`, () => {
    for (const [foreground, background] of [
      ['text', 'bg'],
      ['text', 'surface'],
      ['text-muted', 'surface'],
      ['text-muted', 'bg'],
      ['accent', 'accent-soft'],
      ['accent-contrast', 'accent'],
      ['signal', 'signal-soft'],
      ['success', 'surface'],
      ['warning', 'surface'],
    ]) {
      const a = luminance(tokens[foreground!]!);
      const b = luminance(tokens[background!]!);
      expect(
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        `${foreground}/${background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
}
