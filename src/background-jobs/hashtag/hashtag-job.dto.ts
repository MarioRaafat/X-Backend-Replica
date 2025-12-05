export class HashtagJobDto {
    hashtags: string[];
    timestamp: number;
    categories: { name: string; percent: number }[];
}
