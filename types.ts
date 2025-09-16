export enum AppState {
  SETUP,
  OUTLINE,
  WRITING,
  FINAL,
}

export interface BookDetails {
  theme: string;
  genre: 'fiction' | 'non-fiction';
  audience: string;
  writingStyle: 'conversational' | 'storytelling' | 'practical' | 'hybrid' | 'research' | 'inspirational' | 'raw';
  paragraphLength: 'short' | 'standard' | 'long';
  chapters: string;
  penName: string;
  numChapters: number;
  numPagesPerChapter: number;
  language: 'english' | 'polish';
}

export interface ChapterOutline {
  title: string;
  description: string;
}

export interface BookOutline {
  titleOptions: string[];
  summary: string;
  chapters: ChapterOutline[];
}

export interface BookMatter {
  copyright: string;
  dedication: string;
  acknowledgments: string;
  introduction: string;
  conclusion: string;
  appendix: string;
  glossary: string;
  authorBio: string;
}
