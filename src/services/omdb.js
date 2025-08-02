import fetch from 'node-fetch';

const API_KEY = process.env.OMDB_API_KEY;
const BASE_URL = 'https://www.omdbapi.com/';

// Check if API key is available
const checkApiKey = () => {
  if (!API_KEY) {
    console.warn('⚠️  OMDB_API_KEY not configured. OMDB features will be limited.');
    return false;
  }
  return true;
};

export class OMDBService {
  static async searchMovies(query, page = 1) {
    try {
      if (!checkApiKey()) {
        return {
          Search: [],
          totalResults: '0',
          Response: 'False',
          Error: 'OMDB API key not configured'
        };
      }

      const response = await fetch(
        `${BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(query)}&page=${page}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        Search: data.Search || [],
        totalResults: data.totalResults || '0',
        Response: data.Response || 'False',
        Error: data.Error
      };
    } catch (error) {
      console.error('OMDB search error:', error.message);
      return {
        Search: [],
        totalResults: '0',
        Response: 'False',
        Error: `Failed to fetch from OMDB: ${error.message}`
      };
    }
  }

  static async getMovieById(id) {
    try {
      if (!checkApiKey()) {
        return {
          Response: 'False',
          Error: 'OMDB API key not configured'
        };
      }

      const response = await fetch(
        `${BASE_URL}?apikey=${API_KEY}&i=${id}&plot=full`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('OMDB movie details error:', error.message);
      return {
        Response: 'False',
        Error: `Failed to fetch movie details from OMDB: ${error.message}`
      };
    }
  }

  static async getFeaturedMovies() {
    if (!checkApiKey()) {
      console.warn('OMDB API not available, returning empty featured movies list');
      return [];
    }

    const popularSearches = ['Batman', 'Marvel', 'Star Wars', 'Inception', 'Avatar', 'Titanic'];
    const results = [];
    
    for (const search of popularSearches) {
      try {
        const response = await this.searchMovies(search);
        if (response.Search && response.Search.length > 0) {
          const movie = response.Search[0];
          // Get full details for better ratings
          const details = await this.getMovieById(movie.imdbID);
          if (details.Response === 'True') {
            results.push(details);
          }
        }
      } catch (error) {
        console.error(`Error fetching movies for ${search}:`, error.message);
      }
    }
    
    return results;
  }

  static async getTopRatedMovies(page = 1) {
    const searchTerms = [
      'Godfather', 'Shawshank', 'Dark Knight', 'Pulp Fiction', 'Lord of the Rings',
      'Fight Club', 'Forrest Gump', 'Inception', 'Matrix', 'Goodfellas',
      'Silence of the Lambs', 'Saving Private Ryan', 'Terminator', 'Alien',
      'Casablanca', 'Citizen Kane', 'Vertigo', 'Psycho', 'Taxi Driver',
      'Apocalypse Now', 'Chinatown', 'Once Upon a Time', 'Interstellar'
    ];
    
    const moviesPerPage = 16;
    const startIndex = (page - 1) * moviesPerPage;
    const endIndex = startIndex + moviesPerPage;
    const pageSearchTerms = searchTerms.slice(startIndex, endIndex);
    
    const results = [];
    
    for (const term of pageSearchTerms) {
      try {
        const response = await this.searchMovies(term);
        if (response.Search && response.Search.length > 0) {
          // Get the first (usually most relevant) movie
          const movie = response.Search[0];
          const details = await this.getMovieById(movie.imdbID);
          
          // Only include movies with good ratings
          if (details.Response === 'True' && details.imdbRating && parseFloat(details.imdbRating) >= 7.0) {
            results.push(details);
          }
        }
      } catch (error) {
        console.error(`Error fetching movie for ${term}:`, error);
      }
    }
    
    // Sort by rating (highest first)
    results.sort((a, b) => parseFloat(b.imdbRating || '0') - parseFloat(a.imdbRating || '0'));
    
    const totalPages = Math.ceil(searchTerms.length / moviesPerPage);
    return { movies: results, totalPages };
  }

  static async getNewReleases() {
    const currentYear = new Date().getFullYear();
    const searches = ['action', 'drama', 'comedy', 'thriller'];
    const results = [];
    
    for (const search of searches) {
      try {
        const response = await fetch(
          `${BASE_URL}?apikey=${API_KEY}&s=${search}&y=${currentYear}`
        );
        const data = await response.json();
        if (data.Search && data.Search.length > 0) {
          const movie = data.Search[0];
          const details = await this.getMovieById(movie.imdbID);
          if (details.Response === 'True') {
            results.push(details);
          }
        }
      } catch (error) {
        console.error(`Error fetching new releases for ${search}:`, error);
      }
    }
    
    return results;
  }
}