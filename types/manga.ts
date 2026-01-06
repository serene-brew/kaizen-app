export interface MangaItem {
  id: string;
  title: string;
  englishName?: string | null;
  thumbnail?: string;
}

export interface MangaListResponse {
  result: MangaItem[];
}

export interface MangaChapterList {
  sub: string[];
  raw: string[];
}

export interface MangaDetails extends MangaItem {
  nativeName?: string | null;
  description?: string | null;
  genres?: string[];
  status?: string | null;
  score?: number | null;
  countryOfOrigin?: string | null;
  subCount?: number | null;
  rawCount?: number | null;
  chapters?: MangaChapterList;
}

export interface MangaDetailsResponse {
  result: MangaDetails | null;
}

export interface MangaChapter {
  name: string;
  description: string;
  thumbnail: string;
  pages: string[];
  chapters: MangaChapterList;
}
