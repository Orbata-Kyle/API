import { Controller, Get, Param } from '@nestjs/common';
import { PeopleService } from './people.service';
import { PeopleCacheService } from '../../utility-modules/people-cache/db-people-cache.service';
import { ResponseValidationService } from '../../utility-modules/validation/response-validation.service';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { ValidateStringIdPipe } from '../../pipes/string-id.pipe';
import { PersonDto } from './dto/response';

@ApiTags('People')
@Controller('people')
export class PeopleController {
  constructor(
    private readonly peopleService: PeopleService,
    private readonly dbPeopleCache: PeopleCacheService,
    private readonly responseValidationService: ResponseValidationService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a person by their ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the person', required: true })
  @ApiResponse({ status: 200, description: 'Person details', type: PersonDto })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async getPersonById(@Param('id', new ValidateStringIdPipe()) id: string): Promise<PersonDto> {
    const person = await this.dbPeopleCache.getPersonById(Number(id));
    return this.responseValidationService.validateResponse(person, PersonDto);
  }
}
