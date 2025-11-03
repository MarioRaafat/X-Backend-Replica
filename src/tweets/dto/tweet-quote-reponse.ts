import { TweetResponseDTO } from "./tweet-response.dto";

export class TweetQuoteResponseDTO extends TweetResponseDTO {
    quoted_tweet: TweetResponseDTO;
}