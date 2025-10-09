import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Web Search API
 * Uses DuckDuckGo HTML scraping as a free alternative to paid APIs
 * For production, consider using SerpAPI or Brave Search API
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export class WebSearchAPI {
  /**
   * Search the web using DuckDuckGo
   * Free, no API key required
   */
  async searchWeb(query: string, numResults: number = 5): Promise<SearchResult[]> {
    try {
      console.log(`🔍 [WEB SEARCH] Searching for: ${query}`);
      
      // Use DuckDuckGo HTML interface
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: {
          q: query,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const results: SearchResult[] = [];

      // Parse search results
      $('.result').each((index, element) => {
        if (index >= numResults) return false; // Stop after numResults

        const title = $(element).find('.result__title').text().trim();
        const link = $(element).find('.result__url').attr('href') || '';
        const snippet = $(element).find('.result__snippet').text().trim();

        if (title && link) {
          results.push({
            title,
            link: this.cleanDuckDuckGoLink(link),
            snippet,
            position: index + 1,
          });
        }
      });

      console.log(`✅ [WEB SEARCH] Found ${results.length} results`);
      return results;
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
  }

  /**
   * Search for travel-specific information
   */
  async searchTravelInfo(destination: string, topic: string): Promise<SearchResult[]> {
    const query = `${destination} ${topic} travel guide best`;
    return this.searchWeb(query, 5);
  }

  /**
   * Get top travel tips for a destination
   */
  async getTravelTips(destination: string): Promise<SearchResult[]> {
    return this.searchTravelInfo(destination, 'tips things to know');
  }

  /**
   * Search for restaurant recommendations
   */
  async searchRestaurants(destination: string, cuisine?: string): Promise<SearchResult[]> {
    const query = cuisine 
      ? `best ${cuisine} restaurants in ${destination}`
      : `best restaurants in ${destination}`;
    return this.searchWeb(query, 5);
  }

  /**
   * Search for hotel reviews
   */
  async searchHotelReviews(hotelName: string, destination: string): Promise<SearchResult[]> {
    const query = `${hotelName} ${destination} hotel reviews`;
    return this.searchWeb(query, 5);
  }

  /**
   * Clean DuckDuckGo redirect links
   */
  private cleanDuckDuckGoLink(link: string): string {
    try {
      // DuckDuckGo uses redirect links, extract the actual URL
      const url = new URL(link, 'https://html.duckduckgo.com');
      const uddg = url.searchParams.get('uddg');
      return uddg || link;
    } catch {
      return link;
    }
  }

  /**
   * Fetch and summarize a webpage (simple version)
   */
  async fetchPageSummary(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, header, footer').remove();
      
      // Get main content (try common selectors)
      const content = $('article, main, .content, .post-content, .entry-content')
        .first()
        .text()
        .trim();

      if (content) {
        // Truncate to first 500 characters
        return content.substring(0, 500) + '...';
      }

      return null;
    } catch (error) {
      console.error('Page fetch error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const webSearchAPI = new WebSearchAPI();
