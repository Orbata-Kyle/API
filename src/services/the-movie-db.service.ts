import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Cast, Crew, Keyword, MovieDetails, MovieGenre, MovieSpokenLanguage, Prisma, Video } from '@prisma/client';
import { PrismaService } from '../utility-modules/prisma/prisma.service';
interface MovieDbMovie {
  adult: boolean;
  backdrop_path: string;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

type MovieDbMovieDetailsResponse = {
  id: number;
  title: string;
  original_title: string;
  poster_path?: string;
  backdrop_path?: string;
  overview: string;
  release_date: string;
  adult: boolean;
  popularity: number;
  vote_count: number;
  vote_average: number;
  genres: MovieDbGenre[];
  spoken_languages: MovieDbLanguage[];
  budget: number;
  revenue: number;
  runtime: number;
  status: string;
  tagline: string;
  keywords: { keywords: MovieDbKeyword[] };
  videos: { results: MovieDbVideo[] };
  credits: { cast: MovieDbCastMember[]; crew: MovieDbCrewMember[] };
};

type MovieDbGenre = {
  id: number;
  name: string;
};

type MovieDbKeyword = {
  id: number;
  name: string;
};

type MovieDbVideo = {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
};

type MovieDbCastMember = {
  cast_id: number;
  character: string;
  credit_id: string;
  gender: number | null;
  id: number;
  name: string;
  order: number;
  profile_path: string | null;
  original_name: string;
  popularity: number;
  known_for_department: string;
  adult: boolean;
};

type MovieDbCrewMember = {
  credit_id: string;
  department: string;
  gender: number | null;
  id: number;
  job: string;
  name: string;
  profile_path: string | null;
  original_name: string;
  adult: boolean;
  popularity: number;
  known_for_department: string;
};

interface MovieDbLanguage {
  iso_639_1: string;
  name: string;
  english_name: string;
}

interface MovieDbPerson {
  id: number;
  name: string;
  adult: boolean;
  also_known_as: string[] | null;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  gender: number; // 0: not known, 1: female, 2: male
  homepage: string | null;
  imdb_id: string | null;
  known_for_department: string;
  place_of_birth: string | null;
  popularity: number;
  profile_path: string | null;
  movie_credits: {
    cast: MovieDbPersonCastCredit[] | null;
    crew: MovieDbPersonCrewCredit[] | null;
  };
}

interface MovieDbPersonCastCredit {
  id: number;
  adult: boolean;
  backdrop_path: string | null;
  character: string | null;
  credit_id: string;
  genre_ids: number[];
  original_language: string;
  popularity: number;
  original_title: string;
  overview: string | null;
  poster_path: string | null;
  release_date: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
  order: number | null; // The order of the cast member
}

interface MovieDbPersonCrewCredit {
  id: number;
  adult: boolean;
  backdrop_path: string | null;
  credit_id: string;
  department: string | null;
  genre_ids: number[];
  job: string | null;
  popularity: number;
  original_language: string;
  original_title: string;
  overview: string | null;
  poster_path: string | null;
  release_date: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export interface MovieCreateInputAndRelations {
  movieCreateInput: Prisma.MovieCreateInput;
  movieGenreCreateInputs: Omit<MovieGenre, 'id'>[];
  movieSpokenLanguagesCreateInputs: Omit<MovieSpokenLanguage, 'id'>[];
  keywordsCreateInputs: Keyword[];
  castCreateInputs: Cast[];
  crewCreateInputs: Crew[];
  videosCreateInputs: Omit<Video, 'id'>[];
  detailsCreateInput: Omit<MovieDetails, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface PersonCreateInputAndRelations {
  personCreateInput: Prisma.PersonCreateInput;
  castMovieCreateInputs: { cast: Cast; movie: Prisma.MovieCreateInput }[];
  crewMovieCreateInputs: { crew: Crew; movie: Prisma.MovieCreateInput }[];
}

@Injectable()
export class TheMovieDb {
  private apiKey: string;
  private apiBaseUrl = `https://api.themoviedb.org/3/`;
  private maxPages = 500;

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    this.apiKey = this.config.get<string>('THE_MOVIE_DB_API_KEY');
  }

  private toPrismaMovieCreateInput(movie: MovieDbMovie): Prisma.MovieCreateInput {
    return {
      id: movie.id,
      title: movie.title,
      backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : undefined,
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : undefined,
      releaseDate: movie.release_date
        ? isNaN(new Date(movie.release_date).getTime())
          ? undefined
          : new Date(movie.release_date)
        : undefined,
      synopsis: movie.overview,
      voteAverage: movie.vote_average,
      voteCount: movie.vote_count,
      popularity: movie.popularity,
      adult: movie.adult,
    };
  }

  private toPrismaMovieCreateInputAndRelations(movie: MovieDbMovieDetailsResponse): MovieCreateInputAndRelations {
    return {
      movieCreateInput: {
        id: movie.id,
        title: movie.title,
        backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : undefined,
        posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : undefined,
        releaseDate: movie.release_date
          ? isNaN(new Date(movie.release_date).getTime())
            ? undefined
            : new Date(movie.release_date)
          : undefined,
        synopsis: movie.overview,
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count,
        popularity: movie.popularity,
        adult: movie.adult,
      },
      movieGenreCreateInputs: movie.genres.map((genre) => {
        return { movieId: movie.id, genreId: genre.id };
      }),
      movieSpokenLanguagesCreateInputs: movie.spoken_languages.map((spokenLanguage) => {
        return { movieId: movie.id, spokenLanguageIso: spokenLanguage.iso_639_1 };
      }),
      keywordsCreateInputs: movie.keywords.keywords.map((keyword) => {
        return { id: keyword.id, name: keyword.name };
      }),
      castCreateInputs: movie.credits.cast.map((castMember) => {
        return {
          personId: castMember.id,
          name: castMember.name,
          character: castMember.character,
          profileUrl: castMember.profile_path ? `https://image.tmdb.org/t/p/original${castMember.profile_path}` : undefined,
          order: castMember.order,
          movieId: movie.id,
          originalName: castMember.original_name,
          popularity: castMember.popularity,
          knownForDepartment: castMember.known_for_department,
          adult: castMember.adult,
          gender: castMember.gender,
          creditId: castMember.credit_id,
        };
      }),
      crewCreateInputs: movie.credits.crew.map((crewMember) => {
        return {
          personId: crewMember.id,
          name: crewMember.name,
          job: crewMember.job,
          profileUrl: crewMember.profile_path ? `https://image.tmdb.org/t/p/original${crewMember.profile_path}` : undefined,
          movieId: movie.id,
          originalName: crewMember.original_name,
          popularity: crewMember.popularity,
          knownForDepartment: crewMember.known_for_department,
          adult: crewMember.adult,
          department: crewMember.department,
          creditId: crewMember.credit_id,
        };
      }),
      videosCreateInputs: movie.videos.results.map((video) => {
        return {
          iso6391: video.iso_639_1,
          iso31661: video.iso_3166_1,
          name: video.name,
          site: video.site,
          size: video.size,
          type: video.type,
          key: video.key,
          movieId: movie.id,
          official: video.official,
          published: video.published_at
            ? isNaN(new Date(video.published_at).getTime())
              ? undefined
              : new Date(video.published_at)
            : undefined,
        };
      }),
      detailsCreateInput: {
        budget: movie.budget,
        revenue: movie.revenue,
        runtime: movie.runtime,
        status: movie.status,
        tagline: movie.tagline,
        movieId: movie.id,
      },
    };
  }

  private toPrismaPersonCreateInput(person: MovieDbPerson): PersonCreateInputAndRelations {
    return {
      personCreateInput: {
        id: person.id,
        name: person.name,
        adult: person.adult,
        biography: person.biography ? person.biography : undefined,
        birthday: person.birthday ? (isNaN(new Date(person.birthday).getTime()) ? undefined : new Date(person.birthday)) : undefined,
        deathday: person.deathday ? (isNaN(new Date(person.deathday).getTime()) ? undefined : new Date(person.deathday)) : undefined,
        placeOfBirth: person.place_of_birth ? person.place_of_birth : undefined,
        profileUrl: person.profile_path ? `https://image.tmdb.org/t/p/original${person.profile_path}` : undefined,
        gender: person.gender,
        homepage: person.homepage ? person.homepage : undefined,
        knownForDepartment: person.known_for_department,
        popularity: person.popularity,
      },
      castMovieCreateInputs: person.movie_credits.cast?.map((movie) => {
        return {
          cast: {
            personId: person.id,
            name: person.name,
            character: movie.character,
            profileUrl: person.profile_path ? `https://image.tmdb.org/t/p/original${person.profile_path}` : undefined,
            order: movie.order,
            movieId: movie.id,
            popularity: person.popularity,
            knownForDepartment: person.known_for_department,
            adult: person.adult,
            gender: person.gender,
            creditId: movie.credit_id,
            originalName: undefined,
          },
          movie: {
            id: movie.id,
            title: movie.title,
            backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : undefined,
            posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : undefined,
            releaseDate: movie.release_date
              ? isNaN(new Date(movie.release_date).getTime())
                ? undefined
                : new Date(movie.release_date)
              : undefined,
            synopsis: movie.overview,
            voteAverage: movie.vote_average,
            voteCount: movie.vote_count,
            popularity: movie.popularity,
            adult: movie.adult,
          },
        };
      }),
      crewMovieCreateInputs: person.movie_credits.crew?.map((movie) => {
        return {
          crew: {
            personId: person.id,
            name: person.name,
            job: movie.job,
            profileUrl: person.profile_path ? `https://image.tmdb.org/t/p/original${person.profile_path}` : undefined,
            movieId: movie.id,
            popularity: person.popularity,
            knownForDepartment: person.known_for_department,
            adult: person.adult,
            department: movie.department,
            creditId: movie.credit_id,
            originalName: undefined,
          },
          movie: {
            id: movie.id,
            title: movie.title,
            backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : undefined,
            posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : undefined,
            releaseDate: movie.release_date
              ? isNaN(new Date(movie.release_date).getTime())
                ? undefined
                : new Date(movie.release_date)
              : undefined,
            synopsis: movie.overview,
            voteAverage: movie.vote_average,
            voteCount: movie.vote_count,
            popularity: movie.popularity,
            adult: movie.adult,
          },
        };
      }),
    };
  }

  private toPrismaGenreCreateInput(genre: MovieDbGenre): Prisma.GenreCreateInput {
    return {
      id: genre.id,
      name: genre.name,
    };
  }

  private toPrismaLangugageCreateInput(spokenLangugage: MovieDbLanguage): Prisma.LanguageCreateInput {
    return {
      iso6391: spokenLangugage.iso_639_1,
      englishName: spokenLangugage.english_name,
      name: spokenLangugage.name,
    };
  }

  async getPopularMovies(page: number, onlyReleased = true): Promise<Prisma.MovieCreateInput[]> {
    if (page > this.maxPages) throw new NotFoundException('No more popular movies');
    const url = new URL(`${this.apiBaseUrl}movie/popular?page=${page}`);

    const response = await axios.get<{ page: number; results: MovieDbMovie[] }>(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });
    if (response.data.results.length === 0) throw new NotFoundException(`No popular movies found on page ${page}`);

    const results: Prisma.MovieCreateInput[] = [];
    response.data.results.forEach((movie) => {
      // If date invalid or if voteAverage/voteCount/popularity are undefined, skip
      if (!movie.release_date || !movie.vote_average || !movie.vote_count || !movie.popularity) {
        return;
      }
      if (onlyReleased && new Date(movie.release_date) > new Date()) {
        return;
      }
      if (movie.vote_count < 200) {
        return;
      }
      results.push(this.toPrismaMovieCreateInput(movie));
    });
    return results;
  }

  async getTopRatedMovies(page: number, onlyReleased = true): Promise<Prisma.MovieCreateInput[]> {
    if (page > this.maxPages) throw new NotFoundException('No more popular movies');
    const url = new URL(`${this.apiBaseUrl}movie/top_rated?page=${page}`);

    const response = await axios.get<{ page: number; results: MovieDbMovie[] }>(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });
    if (response.data.results.length === 0) throw new NotFoundException(`No top rated movies found on page ${page}`);

    const results: Prisma.MovieCreateInput[] = [];
    response.data.results.forEach((movie) => {
      if (!movie.release_date || !movie.vote_average || !movie.vote_count || !movie.popularity) {
        return;
      }
      if (onlyReleased && new Date(movie.release_date) > new Date()) {
        return;
      }
      if (movie.vote_count < 200) {
        return;
      }
      results.push(this.toPrismaMovieCreateInput(movie));
    });

    return results;
  }

  async searchForMovieByTitle(title: string, page: number, onlyReleased = true): Promise<Prisma.MovieCreateInput[]> {
    const url = new URL(`${this.apiBaseUrl}search/movie`);
    url.searchParams.set('query', title);
    if (page) {
      url.searchParams.set('page', page.toString());
    }

    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    const results: Prisma.MovieCreateInput[] = [];
    response.data.results.forEach((movie) => {
      if (onlyReleased && new Date(movie.release_date) > new Date()) {
        return;
      }
      if (movie.popularity < 5) {
        return;
      }
      results.push(this.toPrismaMovieCreateInput(movie));
    });

    return results;
  }

  async getMovieById(id: number): Promise<MovieCreateInputAndRelations> {
    const url = new URL(`${this.apiBaseUrl}movie/${id}?append_to_response=keywords%2Ccredits%2Cvideos`);
    try {
      const response = await axios.get(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
      });

      return this.toPrismaMovieCreateInputAndRelations(response.data);
    } catch (error) {
      throw error;
    }
  }

  async getGenres(): Promise<Prisma.GenreCreateInput[]> {
    const url = new URL(`${this.apiBaseUrl}genre/movie/list`);

    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    const genres = response.data.genres;

    const results: Prisma.GenreCreateInput[] = [];
    genres.forEach((genre) => {
      results.push(this.toPrismaGenreCreateInput(genre));
    });
    return results;
  }

  async getLanguages(): Promise<Prisma.LanguageCreateInput[]> {
    const url = new URL(`${this.apiBaseUrl}configuration/languages`);

    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });
    const languages = response.data;

    const results: Prisma.LanguageCreateInput[] = [];
    languages.forEach((language) => {
      results.push(this.toPrismaLangugageCreateInput(language));
    });
    return results;
  }

  async getRecommendationsForMovie(id: number, onlyReleased = true): Promise<Prisma.MovieCreateInput[]> {
    const url = new URL(`${this.apiBaseUrl}movie/${id}/recommendations`);
    // Only gets half of recommendations, 20/40, next would be on new page

    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    const results: Prisma.MovieCreateInput[] = [];
    response.data.results.forEach((movie) => {
      if (onlyReleased && new Date(movie.release_date) > new Date()) {
        return;
      }
      if (movie.popularity < 5) {
        return;
      }
      results.push(this.toPrismaMovieCreateInput(movie));
    });
    return results;
  }

  // --- People ---
  async getPersonById(id: number): Promise<PersonCreateInputAndRelations> {
    const url = new URL(`${this.apiBaseUrl}person/${id}`);
    url.searchParams.set('append_to_response', 'movie_credits');

    try {
      const response = await axios.get(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
      });

      return this.toPrismaPersonCreateInput(response.data);
    } catch (error) {
      throw error;
    }
  }
}
