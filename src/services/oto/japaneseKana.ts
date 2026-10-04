const romajiKana: Record<string, string> = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  sa: 'さ', shi: 'し', si: 'し', su: 'す', se: 'せ', so: 'そ',
  ta: 'た', chi: 'ち', ti: 'ち', tsu: 'つ', tu: 'つ', te: 'て', to: 'と',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', fu: 'ふ', hu: 'ふ', he: 'へ', ho: 'ほ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を', n: 'ん',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  za: 'ざ', ji: 'じ', zi: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ', sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', cya: 'ちゃ', cyu: 'ちゅ', cyo: 'ちょ',
  tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  she: 'しぇ', je: 'じぇ', che: 'ちぇ',
  tsa: 'つぁ', tsi: 'つぃ', tse: 'つぇ', tso: 'つぉ',
  kwa: 'くぁ', kwi: 'くぃ', kwe: 'くぇ', kwo: 'くぉ',
  gwa: 'ぐぁ', gwi: 'ぐぃ', gwe: 'ぐぇ', gwo: 'ぐぉ',
  va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
  xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ',
  xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', xtsu: 'っ', ltsu: 'っ',
};

const romajiKeys = Object.keys(romajiKana).sort((left, right) => right.length - left.length);

function toHiragana(character: string): string {
  const codePoint = character.codePointAt(0);
  if (codePoint !== undefined && codePoint >= 0x30a1 && codePoint <= 0x30f6) {
    return String.fromCodePoint(codePoint - 0x60);
  }
  return character;
}

function convertRomajiToken(value: string): string | null {
  const input = Array.from(value);
  let output = '';

  for (let index = 0; index < input.length;) {
    const character = input[index];
    const lower = character.toLowerCase();
    const next = input[index + 1]?.toLowerCase();
    const afterNext = input[index + 2]?.toLowerCase();

    if (/\s/.test(character) || !/[a-z]/i.test(character)) {
      output += toHiragana(character);
      index += 1;
      continue;
    }

    if (lower === 'n' && next === "'") {
      output += 'ん';
      index += 2;
      continue;
    }
    if (lower === 'n' && next === 'n') {
      output += 'ん';
      index += /^[aiueo]$/.test(afterNext || '') ? 1 : 2;
      continue;
    }
    if (lower === 'n' && (!next || (!/[aiueoy]/.test(next)))) {
      output += 'ん';
      index += 1;
      continue;
    }

    if (/[kstnhmyrwgzdbpfcxj]/.test(lower) && (!next || !/[a-z]/i.test(input[index + 1] || ''))) {
      output += character;
      index += 1;
      continue;
    }

    if (next === lower && !/[aiueon]/.test(lower) && romajiKana[input.slice(index + 1, index + 3).join('').toLowerCase()]) {
      output += 'っ';
      index += 1;
      continue;
    }

    const match = romajiKeys.find(key =>
      input.slice(index, index + key.length).join('').toLowerCase() === key
    );
    if (match) {
      output += romajiKana[match];
      index += match.length;
    } else {
      return null;
    }
  }

  return output;
}

export function romajiToHiragana(value: string): string {
  const parts = value.split(/([_\s]+)/);
  return parts.map((part, index) => {
    if (!part) return part;
    if (/^[_\s]+$/.test(part)) {
      if (!part.includes('_')) return part;
      const previous = parts[index - 1] || '';
      const next = parts[index + 1] || '';
      const previousConverts = /[a-z]/i.test(previous) && convertRomajiToken(previous) !== null;
      const nextConverts = /[a-z]/i.test(next) && convertRomajiToken(next) !== null;
      return previousConverts || nextConverts ? part.replace(/_/g, ' ') : part;
    }
    if (!/[a-z]/i.test(part)) return Array.from(part, toHiragana).join('');
    return convertRomajiToken(part) ?? part;
  }).join('');
}
