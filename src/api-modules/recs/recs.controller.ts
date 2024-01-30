import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guard';
import { GetUser } from '../auth/decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RecommendationsDto } from './dto/response';
import { RecsService } from './recs.service';
import { ResponseValidationService } from '../../utility-modules/validation/response-validation.service';

@ApiTags('Reccommendations')
@Controller('recs')
export class RecsController {
  constructor(private readonly recsService: RecsService, private readonly responseValidationService: ResponseValidationService) {}

  @UseGuards(JwtGuard)
  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get movie recommendations for a user' })
  @ApiResponse({ status: 200, description: 'Movies recommended', type: RecommendationsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not enough user data' })
  async getRecommendations(@GetUser('id') userId: number): Promise<RecommendationsDto> {
    const result = await this.recsService.getRecommendations(userId);
    return this.responseValidationService.validateResponse(result, RecommendationsDto);
  }
}
