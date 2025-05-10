// Common anime interface shared across the application
export interface AnimeItem {
  id: string;
  title?: string;
  englishName?: string;
  description?: string;
  thumbnail?: string;
  genres?: string[];
  status?: string;
  type?: string;
  rating?: string;
  score?: number;
  subCount?: number;
  dubCount?: number;
  episodes?: {
    sub: string[];
    dub: string[];
  };
  // Additional fields from the original AnimeItem
  format?: string;
  duration?: number;
  startDate?: {
    year: number;
    month: number;
    day: number;
  };
}

export interface AnimeResponse {
  result: AnimeItem[];
}

export interface AnimeDetailsResponse {
  result: AnimeItem | null;
}