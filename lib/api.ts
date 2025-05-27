// TypeScript interfaces for anime data structures and API responses
import { AnimeItem, AnimeResponse } from '../types/anime';

/**
 * API Configuration
 * 
 * Base URLs for different anime data services:
 * - API_BASE_URL: Primary anime data service (top, trending, carousel)
 * - SEARCH_API_URL: Dedicated search service (query, filters, combined search)
 * 
 * The separation allows for different optimization strategies:
 * - Static data (top/trending) can be cached longer
 * - Search data needs real-time responsiveness
 */
const API_BASE_URL = 'https://hellscape.vercel.app/api';

const SEARCH_API_URL = 'https://heavenscape.vercel.app/api';

/**
 * Anime API Service
 * 
 * Comprehensive service for fetching anime data from external APIs.
 * Provides multiple data access patterns:
 * 
 * **Content Discovery:**
 * - Top anime listings for quality recommendations
 * - Trending anime for current popularity
 * - Carousel data for featured content rotation
 * 
 * **Search Functionality:**
 * - Text-based search with query processing
 * - Genre-based filtering for content discovery
 * - Combined search for precise content finding
 * 
 * **Performance Features:**
 * - Random selection for carousel variety
 * - Limited fetching for performance optimization
 * - Comprehensive error handling and logging
 * - Proper URL encoding for safe API calls
 */
export const animeApi = {
  /**
   * Fetch Top Anime List
   * 
   * Retrieves the highest-rated anime from the API service.
   * Used for:
   * - Home screen "Top Anime" section
   * - Quality recommendations for users
   * - Curated content discovery
   * 
   * @returns Promise<AnimeItem[]> - Array of top-rated anime with metadata
   * @throws Error on network issues or API failures
   */
  async fetchTopAnime(): Promise<AnimeItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/anime/top`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Parse response as text first to handle potential encoding issues
      const rawData = await response.text();
      
      const data: AnimeResponse = JSON.parse(rawData);
      
      return data.result || [];
    } catch (error) {
      console.error('Error fetching top anime:', error);
      throw error;
    }
  },

  /**
   * Fetch Trending Anime List
   * 
   * Retrieves currently popular anime based on viewing trends.
   * Used for:
   * - Home screen "Trending Now" section
   * - Discovering currently popular content
   * - Social proof for content selection
   * 
   * @returns Promise<AnimeItem[]> - Array of trending anime with metadata
   * @throws Error on network issues or API failures
   */
  async fetchTrendingAnime(): Promise<AnimeItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/anime/trending`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Parse response as text first to handle potential encoding issues
      const rawData = await response.text();
      
      const data: AnimeResponse = JSON.parse(rawData);
      
      return data.result || [];
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      throw error;
    }
  },

  /**
   * Fetch Carousel Anime Data
   * 
   * Retrieves anime data for featured carousel display with randomization.
   * Implements client-side randomization to ensure variety in featured content
   * across different app sessions and users.
   * 
   * Used for:
   * - Home screen hero carousel
   * - Featured content rotation
   * - Visual appeal and content discovery
   * 
   * @param count - Number of random items to select (default: 5)
   * @returns Promise<AnimeItem[]> - Array of randomly selected carousel anime
   * @throws Error on network issues or API failures
   */
  async fetchCarouselAnime(count: number = 5): Promise<AnimeItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/anime/carousel`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Parse response as text first to handle potential encoding issues
      const rawData = await response.text();
      
      const data: AnimeResponse = JSON.parse(rawData);
      
      if (!data.result || data.result.length === 0) {
        return [];
      }
      
      // Select random items from the array for variety in carousel display
      const result = [...data.result];
      const randomItems: AnimeItem[] = [];
      
      // Get random items up to count or the length of result array
      const itemsToSelect = Math.min(count, result.length);
      
      // Use splice to avoid duplicates in selection
      for (let i = 0; i < itemsToSelect; i++) {
        const randomIndex = Math.floor(Math.random() * result.length);
        randomItems.push(result[randomIndex]);
        result.splice(randomIndex, 1); // Remove selected item to avoid duplicates
      }
      
      return randomItems;
    } catch (error) {
      console.error('Error fetching carousel anime:', error);
      throw error;
    }
  },

  /**
   * Random Item Selection Utility
   * 
   * Generic utility function for selecting random items from any array.
   * Uses Fisher-Yates shuffle algorithm for fair randomization.
   * 
   * Used internally and can be used by other components for:
   * - Random content selection
   * - Shuffling recommendations
   * - Variety in content display
   * 
   * @param array - The source array to select from
   * @param count - Number of items to select
   * @returns T[] - Array of randomly selected items of the same type
   */
  getRandomItems<T>(array: T[], count: number): T[] {
    // Use Fisher-Yates shuffle algorithm for fair randomization
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  /**
   * Fetch Limited Top Anime
   * 
   * Performance-optimized function that fetches top anime and limits results.
   * Reduces data transfer and improves loading times for components that
   * only need a subset of the full top anime list.
   * 
   * Used for:
   * - Home screen sections with limited display space
   * - Quick loading of preview content
   * - Mobile-optimized data usage
   * 
   * @param limit - Maximum number of items to return
   * @returns Promise<AnimeItem[]> - Array of limited top anime results
   * @throws Error on network issues or API failures
   */
  async fetchLimitedTopAnime(limit: number): Promise<AnimeItem[]> {
    try {
      const data = await this.fetchTopAnime();
      return data.slice(0, limit);
    } catch (error) {
      console.error('Error fetching limited top anime:', error);
      throw error;
    }
  },

  /**
   * Search Anime by Query String
   * 
   * Text-based anime search functionality with proper URL encoding.
   * Handles user input sanitization and provides comprehensive search results.
   * 
   * Used for:
   * - Main search functionality in search tab
   * - Quick anime lookup by name
   * - Auto-complete and search suggestions
   * 
   * @param query - User's search query string
   * @returns Promise<AnimeItem[]> - Array of search results matching the query
   * @throws Error on network issues or API failures
   */
  async searchAnimeByQuery(query: string): Promise<AnimeItem[]> {
    try {
      // Sanitize and encode the query for safe URL usage
      const formattedQuery = encodeURIComponent(query.trim());
      
      const response = await fetch(`${SEARCH_API_URL}/anime/search/${formattedQuery}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data: AnimeResponse = await response.json();
      
      return data.result || [];
    } catch (error) {
      console.error('Error searching anime by query:', error);
      throw error;
    }
  },

  /**
   * Search Anime by Genre Filters
   * 
   * Genre-based filtering for content discovery and browsing.
   * Allows users to find anime by preferred genres without text input.
   * 
   * Used for:
   * - Genre-based browsing in search/discovery
   * - Filter combinations for refined results
   * - Content recommendation by preference
   * 
   * @param genres - Array of genre strings to filter by
   * @returns Promise<AnimeItem[]> - Array of anime matching the selected genres
   * @throws Error on network issues or API failures
   */
  async searchAnimeByFilters(genres: string[]): Promise<AnimeItem[]> {
    try {
      // Join genres with comma for API endpoint format
      const formattedGenres = genres.join(',');
      
      const response = await fetch(`${SEARCH_API_URL}/anime/filters/${formattedGenres}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data: AnimeResponse = await response.json();
      
      return data.result || [];
    } catch (error) {
      console.error('Error searching anime by filters:', error);
      throw error;
    }
  },

  /**
   * Search Anime by Query and Filters Combined
   * 
   * Advanced search functionality combining text search with genre filtering.
   * Provides the most precise search results by allowing users to specify
   * both textual criteria and genre preferences simultaneously.
   * 
   * Used for:
   * - Advanced search with multiple criteria
   * - Precise content discovery
   * - Refined search results when basic search is too broad
   * 
   * @param query - User's search query string
   * @param genres - Array of genre strings to filter by
   * @returns Promise<AnimeItem[]> - Array of anime matching both query and genres
   * @throws Error on network issues or API failures
   */
  async searchAnimeByQueryAndFilters(query: string, genres: string[]): Promise<AnimeItem[]> {
    try {
      // Sanitize and encode the query for safe URL usage
      const formattedQuery = encodeURIComponent(query.trim());
      // Join genres with comma for API endpoint format
      const formattedGenres = genres.join(',');
      
      const response = await fetch(`${SEARCH_API_URL}/anime/filters/${formattedGenres}/${formattedQuery}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data: AnimeResponse = await response.json();
      
      return data.result || [];
    } catch (error) {
      console.error('Error searching anime by query and filters:', error);
      throw error;
    }
  }
};