// filepath: /home/risersama/projects/kaizen-app/lib/api.ts
// API service to fetch anime data

export interface AnimeItem {
  id: string;
  englishName: string;
  thumbnail: string;
  score: number;
  genres: string[];
  format: string;
  status: string;
  episodes: number;
  duration: number;
  startDate: {
    year: number;
    month: number;
    day: number;
  };
}

export interface AnimeResponse {
  result: AnimeItem[]; // Changed from "data" to "result" to match the actual API response
}

const API_BASE_URL = 'https://hellscape.vercel.app/api';

export const animeApi = {
  /**
   * Fetch top anime list
   * @returns Promise with top anime data
   */
  async fetchTopAnime(): Promise<AnimeItem[]> {
    try {
      console.log('Fetching top anime from:', `${API_BASE_URL}/anime/top`);
      
      const response = await fetch(`${API_BASE_URL}/anime/top`);
      
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const rawData = await response.text();
      console.log('Raw API response:', rawData.substring(0, 500) + '...');
      
      const data: AnimeResponse = JSON.parse(rawData);
      
      console.log('Parsed data structure:', 
        data ? 'Valid data object' : 'Null data',
        'Has result array:', data && Array.isArray(data.result),
        'Array length:', data && data.result ? data.result.length : 0
      );
      
      if (data && data.result && data.result.length > 0) {
        console.log('First item sample:', JSON.stringify(data.result[0], null, 2));
      }
      
      return data.result || []; // Changed from data.data to data.result
    } catch (error) {
      console.error('Error fetching top anime:', error);
      throw error;
    }
  },

  /**
   * Fetch trending anime list
   * @returns Promise with trending anime data
   */
  async fetchTrendingAnime(): Promise<AnimeItem[]> {
    try {
      console.log('Fetching trending anime from:', `${API_BASE_URL}/anime/trending`);
      
      const response = await fetch(`${API_BASE_URL}/anime/trending`);
      
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const rawData = await response.text();
      console.log('Raw trending API response:', rawData.substring(0, 500) + '...');
      
      const data: AnimeResponse = JSON.parse(rawData);
      
      console.log('Parsed trending data structure:', 
        data ? 'Valid data object' : 'Null data',
        'Has result array:', data && Array.isArray(data.result),
        'Array length:', data && data.result ? data.result.length : 0
      );
      
      if (data && data.result && data.result.length > 0) {
        console.log('First trending item sample:', JSON.stringify(data.result[0], null, 2));
      }
      
      return data.result || [];
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      throw error;
    }
  },

  /**
   * Fetch carousel anime data
   * @param count Number of random items to select from the response (default: 5)
   * @returns Promise with randomly selected carousel anime data
   */
  async fetchCarouselAnime(count: number = 5): Promise<AnimeItem[]> {
    try {
      console.log('Fetching carousel anime from:', `${API_BASE_URL}/anime/carousel`);
      
      const response = await fetch(`${API_BASE_URL}/anime/carousel`);
      
      console.log('Carousel API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const rawData = await response.text();
      console.log('Raw carousel API response:', rawData.substring(0, 500) + '...');
      
      const data: AnimeResponse = JSON.parse(rawData);
      
      console.log('Parsed carousel data structure:', 
        data ? 'Valid data object' : 'Null data',
        'Has result array:', data && Array.isArray(data.result),
        'Array length:', data && data.result ? data.result.length : 0
      );
      
      if (!data.result || data.result.length === 0) {
        return [];
      }
      
      // Select random items from the array
      const result = [...data.result];
      const randomItems: AnimeItem[] = [];
      
      // Get random items up to count or the length of result array
      const itemsToSelect = Math.min(count, result.length);
      
      for (let i = 0; i < itemsToSelect; i++) {
        const randomIndex = Math.floor(Math.random() * result.length);
        randomItems.push(result[randomIndex]);
        result.splice(randomIndex, 1); // Remove selected item to avoid duplicates
      }
      
      console.log(`Selected ${randomItems.length} random items from carousel data`);
      
      return randomItems;
    } catch (error) {
      console.error('Error fetching carousel anime:', error);
      throw error;
    }
  },

  /**
   * Get random items from an array
   * @param array The array to select from
   * @param count Number of items to select
   * @returns Array of randomly selected items
   */
  getRandomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  /**
   * Fetch limited number of top anime
   * @param limit Number of items to return
   * @returns Promise with limited top anime data
   */
  async fetchLimitedTopAnime(limit: number): Promise<AnimeItem[]> {
    try {
      const data = await this.fetchTopAnime();
      return data.slice(0, limit);
    } catch (error) {
      console.error('Error fetching limited top anime:', error);
      throw error;
    }
  }
};