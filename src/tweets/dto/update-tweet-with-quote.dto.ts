import { PartialType } from "@nestjs/swagger";
import { CreateTweetWithQuoteDTO } from "./create-tweet-with-quote.dto";

export class UpdateTweetWithQuoteDTO extends PartialType(CreateTweetWithQuoteDTO) {}