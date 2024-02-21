import { IsBoolean, IsDate, IsNumber, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
import { MovieDto } from './movie.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class Genre {
  @IsNumber()
  @ApiProperty({ type: Number, example: 28 })
  id: number;

  @IsString()
  @ApiProperty({ type: String, example: 'Action' })
  name: string;
}

class GenreContainer {
  @ValidateNested()
  @Type(() => Genre)
  @ApiProperty({ type: () => Genre })
  genre: Genre;
}

class SpokenLanguage {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'English', required: false })
  englishName?: string;

  @IsString()
  @ApiProperty({ type: String, example: 'en' })
  iso6391: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, example: 'Dansk', required: false })
  name?: string;
}

class SpokenLanguageContainer {
  @ValidateNested()
  @Type(() => SpokenLanguage)
  @ApiProperty({ type: () => SpokenLanguage })
  spokenLanguage: SpokenLanguage;
}

class Keyword {
  @IsNumber()
  @ApiProperty({ type: Number, example: 28 })
  id: number;

  @IsString()
  @ApiProperty({ type: String, example: 'denmark' })
  name: string;
}

class KeywordsContainer {
  @ValidateNested()
  @Type(() => Keyword)
  @ApiProperty({ type: () => Keyword })
  keyword: Keyword;
}

class Cast {
  @IsNumber()
  @ApiProperty({ type: Number, example: 28 })
  id: number;

  @IsString()
  @ApiProperty({ type: String, example: 'Tom Holland' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'Jerry', required: false })
  character?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ type: Number, example: 28, required: false })
  order?: number;

  @IsString()
  @IsUrl()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'https://image.tmdb.org/t/p/original/tkYWG9gY2QpoBfOh4OWNz8yQfsw.jpg', required: false })
  profileUrl?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'Tom Hollandaise', required: false })
  originalName?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ type: Number, example: 28.9, required: false })
  popularity?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'Acting', required: false })
  knownForDepartment?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ type: Number, example: 1, description: '1 is Female, 2 Male, 0 Unkown TO BE CONFIRMED!', required: false })
  gender?: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ type: Boolean, example: false, required: false })
  adult?: boolean;

  @IsNumber()
  @ApiProperty({ type: Number, example: 28 })
  movieId: number;
}

class Crew {
  @IsNumber()
  @ApiProperty({ type: Number, example: 28 })
  id: number;

  @IsString()
  @ApiProperty({ type: String, example: 'Tom Holland' })
  name: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'https://image.tmdb.org/t/p/original/tkYWG9gY2QpoBfOh4OWNz8yQfsw.jpg', required: false })
  profileUrl?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'Tom Hollandaise', required: false })
  originalName?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ type: Number, example: 28.9, required: false })
  popularity?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'Acting', required: false })
  department?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'Acting', required: false })
  knownForDepartment?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ type: Boolean, example: false, required: false })
  adult?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'Producer', required: false })
  job?: string;

  @IsNumber()
  @ApiProperty({ type: Number, example: 28 })
  movieId: number;
}

class Video {
  @IsNumber()
  @ApiProperty({ type: Number, example: 28 })
  id: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'en', required: false })
  iso6391?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'US', required: false })
  iso31661?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'Lock, Stock And Two Smoking Barrels - Trailer', required: false })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'YouTube', required: false })
  site?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'imtJYamanh0', required: false })
  key?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ type: Number, example: 1080, required: false })
  size?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'Trailer', required: false })
  type?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ type: Boolean, example: false, required: false })
  official?: boolean;

  @IsDate()
  @IsOptional()
  @ApiPropertyOptional({ type: Date, example: '2021-01-01T00:00:00.000Z', required: false })
  published?: Date;

  @IsNumber()
  @ApiProperty({ type: Number, example: 28 })
  movieId: number;
}

class Details {
  @IsNumber()
  @ApiProperty({ type: Number, example: 28 })
  id: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'Released', required: false })
  status?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ type: Number, example: 120, required: false })
  runtime?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: 'A Disgrace to Criminals Everywhere.', required: false })
  tagline?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ type: Number, example: 12000, required: false })
  revenue?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ type: Number, example: 1200, required: false })
  budget?: number;

  @IsNumber()
  @ApiProperty({ type: Number, example: 28 })
  movieId: number;

  @IsDate()
  @ApiProperty({ type: Date, example: '2021-01-01T00:00:00.000Z', required: false })
  updatedAt?: Date;

  @IsDate()
  @ApiProperty({ type: Date, example: '2021-01-01T00:00:00.000Z', required: false })
  createdAt?: Date;
}

export class DetailedMovieDto extends MovieDto {
  @ValidateNested()
  @Type(() => Details)
  @ApiProperty({ type: () => Details })
  details: Details;

  @ValidateNested({ each: true })
  @Type(() => GenreContainer)
  @ApiProperty({ type: () => [GenreContainer] })
  genres: GenreContainer[];

  @ValidateNested({ each: true })
  @Type(() => SpokenLanguageContainer)
  @ApiProperty({ type: () => [SpokenLanguageContainer] })
  spokenLanguages: SpokenLanguageContainer[];

  @ValidateNested({ each: true })
  @Type(() => KeywordsContainer)
  @ApiProperty({ type: () => [KeywordsContainer] })
  keywords: KeywordsContainer[];

  @ValidateNested({ each: true })
  @Type(() => Cast)
  @ApiProperty({ type: () => [Cast] })
  cast: Cast[];

  @ValidateNested({ each: true })
  @Type(() => Crew)
  @ApiProperty({ type: () => [Crew] })
  crew: Crew[];

  @ValidateNested({ each: true })
  @Type(() => Video)
  @ApiProperty({ type: () => [Video] })
  videos: Video[];
}
