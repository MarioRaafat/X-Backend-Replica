import { Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TrendService } from './trend.service';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SUCCESS_MESSAGES } from 'src/constants/swagger-messages';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { trending_swagger } from 'src/explore/explore.swagger';
import { TrendsDto } from './dto/trends.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { FakeTrendService } from './fake-trend.service';
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('trend')
export class TrendController {
    constructor(
        private readonly trend_service: TrendService,
        private readonly fake_trend_service: FakeTrendService
    ) {}

    @ApiOperation(trending_swagger.operation)
    @ApiOkResponse(trending_swagger.responses.success)
    @ResponseMessage(SUCCESS_MESSAGES.EXPLORE_TRENDING_RETRIEVED)
    @ApiQuery(trending_swagger.queries.category)
    @ApiQuery(trending_swagger.queries.limit)
    @Get('')
    async getTrending(@Query() trends_dto?: TrendsDto) {
        return await this.trend_service.getTrending(trends_dto?.category, trends_dto?.limit);
    }

    @Post('/fake-trends')
    async fakeTrends() {
        return await this.fake_trend_service.fakeTrends();
    }

    @Delete('/fake-trends')
    async deleteFakeTrends() {
        return await this.fake_trend_service.deleteFakeTrends();
    }
}
