import { Controller } from '@nestjs/common';
import { HashtagJobService } from './hashtag.service';

@Controller('hashtag')
export class HashtagController {
    constructor(private readonly hashtagService: HashtagJobService) {}
}
