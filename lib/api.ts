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