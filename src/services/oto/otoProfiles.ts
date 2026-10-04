import { VoicebankProfile } from "../../types/workstation";

export const VOICEBANK_PROFILES: VoicebankProfile[] = [
  {
    id: 'japanese_cv',
    name: 'Japanese CV (Standard)',
    description: 'Standard Japanese consonant-vowel recording style (e.g. ka, ki, ku, ke, ko).',
    language: 'Japanese',
    recordingStyle: 'CV',
    sampleStructure: '[consonant][vowel].wav',
    defaultOverlapRatio: 0.35,
    expectedPhonemes: [
      'a', 'i', 'u', 'e', 'o',
      'ka', 'ki', 'ku', 'ke', 'ko',
      'sa', 'shi', 'su', 'se', 'so',
      'ta', 'chi', 'tsu', 'te', 'to',
      'na', 'ni', 'nu', 'ne', 'no',
      'ha', 'hi', 'fu', 'he', 'ho',
      'ma', 'mi', 'mu', 'me', 'mo',
      'ya', 'yu', 'yo',
      'ra', 'ri', 'ru', 're', 'ro',
      'wa', 'wo', 'n'
    ],
  },
  {
    id: 'japanese_vcv',
    name: 'Japanese VCV (Continuous)',
    description: 'Japanese vowel-consonant-vowel continuous recordings (e.g. - ka, a ka, i ka).',
    language: 'Japanese',
    recordingStyle: 'VCV',
    sampleStructure: '[vowel] [consonant][vowel]',
    defaultOverlapRatio: 0.45,
    expectedPhonemes: ['- a', 'a a', 'a ka', 'i ka', 'u ka', 'e ka', 'o ka'],
  },
  {
    id: 'japanese_cvvc',
    name: 'Japanese CVVC',
    description: 'Japanese consonant-vowel and vowel-consonant transitions (e.g. ka, a k).',
    language: 'Japanese',
    recordingStyle: 'CVVC',
    sampleStructure: '[consonant][vowel] and [vowel] [consonant]',
    defaultOverlapRatio: 0.30,
    expectedPhonemes: ['ka', 'ki', 'ku', 'ke', 'ko', 'a k', 'i k', 'u k', 'a s', 'i s', 'a t', 'i t'],
  },
  {
    id: 'english_arpasing',
    name: 'English ARPAsing',
    description: 'English phonetic diphones based on the CMU Arpabet dictionary (e.g. [- k], [k ae], [ae t]).',
    language: 'English',
    recordingStyle: 'ARPAsing',
    sampleStructure: '[phone1] [phone2]',
    defaultOverlapRatio: 0.33,
    expectedPhonemes: ['- k', 'k ae', 'ae t', 't -', '- s', 's ey', 'ey v'],
  },
];

export const JAPANESE_VOICEBANK_PROFILES = VOICEBANK_PROFILES.filter(
  profile => profile.language === 'Japanese'
);

export function getProfileById(id: string): VoicebankProfile {
  return VOICEBANK_PROFILES.find(p => p.id === id) || VOICEBANK_PROFILES[0];
}
