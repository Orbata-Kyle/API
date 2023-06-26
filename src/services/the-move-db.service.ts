import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TheMovieDb {
  private apiKey: string;
  private apiBaseUrl = `https://api.themoviedb.org/3/`;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('THE_MOVIE_DB_API_KEY');
  }

  async searchForMovieByTitle(title: string) {
    const url = new URL(`${this.apiBaseUrl}search/movie`);
    url.searchParams.set('query', title);

    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    return response.data;
  }

  async getMovieById(id: number) {
    const url = new URL(`${this.apiBaseUrl}movie/${id}`);
    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    return response.data;
  }
}
