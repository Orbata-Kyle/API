import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CastDto, CrewDto, MovieDto } from '../../../../api-modules/movie/dto/response';

export class PersonDto {
  @ApiProperty({ example: 123, description: 'The unique identifier of the person' })
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'The name of the person' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '1990-01-01', description: 'The birthday of the person', required: false })
  @IsDate()
  @IsOptional()
  birthday?: Date;

  @ApiPropertyOptional({ example: '2070-01-01', description: 'The deathday of the person', required: false })
  @IsDate()
  @IsOptional()
  deathday?: Date;

  @ApiPropertyOptional({ example: 'This is a biography', description: 'The biography of the person', required: false })
  @IsString()
  @IsOptional()
  biography?: string;

  @ApiPropertyOptional({ example: 'New York', description: 'The place of birth of the person' })
  @IsString()
  @IsOptional()
  placeOfBirth?: string;

  @ApiPropertyOptional({ example: 'https://www.example.com', description: 'The profile URL of the person', required: false })
  @IsString()
  @IsOptional()
  profileUrl?: string;

  @ApiProperty({ example: true, description: 'Indicates if the person is an adult' })
  @IsNotEmpty()
  @IsBoolean()
  adult: boolean;

  @ApiProperty({ example: 1, description: 'Gender of the person' })
  @IsNotEmpty()
  @IsNumber()
  gender: number;

  @ApiPropertyOptional({ example: 'https://www.example.com', description: 'The homepage of the person', required: false })
  @IsString()
  @IsOptional()
  homepage?: string;

  @ApiProperty({ example: 'Acting', description: 'The department the person is known for' })
  @IsNotEmpty()
  @IsString()
  knownForDepartment: string;

  @ApiProperty({ example: 28.9, description: 'The popularity of the person' })
  @IsNotEmpty()
  @IsNumber()
  popularity: number;

  @ApiProperty({ example: '2021-01-01T00:00:00.000Z', description: 'The date the person was added to DB' })
  @IsNotEmpty()
  @IsDate()
  createdAt: Date;

  @ApiProperty({ example: '2021-01-01T00:00:00.000Z', description: 'The date the person was last updated in DB' })
  @IsNotEmpty()
  @IsDate()
  updatedAt: Date;

  @ValidateNested({ each: true })
  @Type(() => CastMovieDto)
  @ApiProperty({ type: () => [CastMovieDto], description: 'List of movies the person has acted in incl. their role' })
  CastMovies: CastMovieDto[];

  @ValidateNested({ each: true })
  @Type(() => CrewMovieDto)
  @ApiProperty({ type: () => [CrewMovieDto], description: 'List of movies the person has worked on incl. their role' })
  CrewMovies: CrewMovieDto[];
}

class CastMovieDto extends CastDto {
  @ValidateNested()
  @Type(() => MovieDto)
  @ApiProperty({ type: () => MovieDto, description: 'The movie the person has acted in' })
  movie: MovieDto;
}

class CrewMovieDto extends CrewDto {
  @ValidateNested()
  @Type(() => MovieDto)
  @ApiProperty({ type: () => MovieDto, description: 'The movie the person has worked on' })
  movie: MovieDto;
}
