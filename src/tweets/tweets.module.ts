import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TweetsController } from './tweets.controller';
import { TweetsService } from './tweets.service';
import { 
  Tweet, 
  TweetLike, 
  TweetRepost, 
  TweetQuote, 
  TweetReply 
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tweet,
      TweetLike,
      TweetRepost,
      TweetQuote,
      TweetReply,
    ]),
  ],
  controllers: [TweetsController],
  providers: [TweetsService],
  exports: [TweetsService],
})
export class TweetsModule {}
