import fetch from 'node-fetch';

const API_KEY = process.env.OMDB_API_KEY;
const BASE_URL = 'https://www.omdbapi.com/';

export class OMDBService {
  static async searchMovies(query, page = 1) {
    try {
      const response = await fetch(
        `${BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(query)}&page=${page}`
      );
      const data = await response.json();
      
      return {
        Search: data.Search || [],
        totalResults: data.totalResults || '0',
        Response: data.Response || 'False',
        Error: data.Error
      };
    } catch (error) {
      console.error('OMDB search error:', error);
      return {
        Search: [],
        totalResults: '0',
        Response: 'False',
        Error: 'Failed to fetch from OMDB'
      };
    }
  }

  static async getMovieById(id) {
    try {
      const response = await fetch(
        `${BASE_URL}?apikey=${API_KEY}&i=${id}&plot=full`
      );
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('OMDB movie details error:', error);
      return {
        Response: 'False',
        Error: 'Failed to fetch movie details from OMDB'
      };
    }
  }

  static async getFeaturedMovies() {
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
        console.error(`Error fetching movies for ${search}:`, error);
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