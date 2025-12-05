import { Controller, Get, Query } from '@nestjs/common';
import { TrendService } from './trend.service';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SUCCESS_MESSAGES } from 'src/constants/swagger-messages';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { trending_swagger } from 'src/explore/explore.swagger';
import { TrendsDto } from './dto/trends.dto';

@Controller('trend')
export class TrendController {
    constructor(private readonly trend_service: TrendService) {}

    @ApiOperation(trending_swagger.operation)
    @ApiOkResponse(trending_swagger.responses.success)
    @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_TRENDING_RETRIEVED)
    @ApiQuery(trending_swagger.queries.category)
    @Get('')
    async getTrending(@Query() trends_dto?: TrendsDto) {
        return await this.trend_service.getTrending(trends_dto?.category, trends_dto?.limit);
    }
}
