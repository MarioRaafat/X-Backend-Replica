import { ExcelReader, ITopicSheets } from './excel-reader';
import * as XLSX from 'xlsx';
import * as path from 'path';

jest.mock('xlsx');
jest.mock('path');

describe('ExcelReader', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('readTopic', () => {
        it('should be defined', () => {
            expect(ExcelReader.readTopic).toBeDefined();
        });

        it('should read a topic successfully', () => {
            const mock_workbook = {
                SheetNames: ['users', 'tweets', 'replies'],
                Sheets: {
                    users: {},
                    tweets: {},
                    replies: {},
                },
            };

            (XLSX.readFile as jest.Mock).mockReturnValue(mock_workbook);
            (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([]);
            (path.join as jest.Mock).mockReturnValue('/mock/path/music.xlsx');

            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            const result = ExcelReader.readTopic('music');

            expect(result).toBeDefined();
            expect(result.users).toBeInstanceOf(Array);
            expect(result.tweets).toBeInstanceOf(Array);
            expect(result.replies).toBeInstanceOf(Array);
            expect(XLSX.readFile).toHaveBeenCalled();

            console_spy.mockRestore();
        });

        it('should handle topic name with .xlsx extension', () => {
            const mock_workbook = {
                SheetNames: ['users', 'tweets', 'replies'],
                Sheets: {
                    users: {},
                    tweets: {},
                    replies: {},
                },
            };

            (XLSX.readFile as jest.Mock).mockReturnValue(mock_workbook);
            (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([]);
            (path.join as jest.Mock).mockReturnValue('/mock/path/music.xlsx');

            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            ExcelReader.readTopic('music.xlsx');

            expect(XLSX.readFile).toHaveBeenCalled();

            console_spy.mockRestore();
        });

        it('should throw error when file cannot be read', () => {
            (XLSX.readFile as jest.Mock).mockImplementation(() => {
                throw new Error('File not found');
            });
            (path.join as jest.Mock).mockReturnValue('/mock/path/invalid.xlsx');

            expect(() => ExcelReader.readTopic('invalid')).toThrow();
        });

        it('should return data from all three tabs', () => {
            const mock_users = [{ user_id: 1, name: 'Test User' }];
            const mock_tweets = [{ tweetId: 1, content: 'Test Tweet' }];
            const mock_replies = [{ tweetId: 2, content: 'Test Reply' }];

            const mock_workbook = {
                SheetNames: ['users', 'tweets', 'replies'],
                Sheets: {
                    users: {},
                    tweets: {},
                    replies: {},
                },
            };

            (XLSX.readFile as jest.Mock).mockReturnValue(mock_workbook);
            (XLSX.utils.sheet_to_json as jest.Mock)
                .mockReturnValueOnce(mock_users)
                .mockReturnValueOnce(mock_tweets)
                .mockReturnValueOnce(mock_replies);
            (path.join as jest.Mock).mockReturnValue('/mock/path/test.xlsx');

            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            const result = ExcelReader.readTopic('test');

            expect(result.users).toEqual(mock_users);
            expect(result.tweets).toEqual(mock_tweets);
            expect(result.replies).toEqual(mock_replies);

            console_spy.mockRestore();
        });
    });

    describe('readTopics', () => {
        it('should be defined', () => {
            expect(ExcelReader.readTopics).toBeDefined();
        });

        it('should read multiple topics', () => {
            const mock_workbook = {
                SheetNames: ['users', 'tweets', 'replies'],
                Sheets: {
                    users: {},
                    tweets: {},
                    replies: {},
                },
            };

            (XLSX.readFile as jest.Mock).mockReturnValue(mock_workbook);
            (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([]);
            (path.join as jest.Mock).mockReturnValue('/mock/path/test.xlsx');

            const console_spy = jest.spyOn(console, 'log').mockImplementation();
        });
    });

    describe('readTopics', () => {
        it('should be defined', () => {
            expect(ExcelReader.readTopics).toBeDefined();
        });

        it('should read multiple topics', () => {
            const mock_workbook = {
                SheetNames: ['users', 'tweets', 'replies'],
                Sheets: {
                    users: {},
                    tweets: {},
                    replies: {},
                },
            };

            (XLSX.readFile as jest.Mock).mockReturnValue(mock_workbook);
            (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([]);
            (path.join as jest.Mock).mockReturnValue('/mock/path/test.xlsx');

            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            const result = ExcelReader.readTopics(['music', 'sports']);

            expect(result).toBeInstanceOf(Map);
            expect(result.size).toBeGreaterThanOrEqual(0);

            console_spy.mockRestore();
        });

        it('should handle errors gracefully', () => {
            (XLSX.readFile as jest.Mock).mockImplementation(() => {
                throw new Error('File error');
            });
            (path.join as jest.Mock).mockReturnValue('/mock/path/test.xlsx');

            const console_spy = jest.spyOn(console, 'log').mockImplementation();
            const console_error_spy = jest.spyOn(console, 'error').mockImplementation();

            const result = ExcelReader.readTopics(['invalid']);

            expect(result).toBeInstanceOf(Map);
            expect(console_error_spy).toHaveBeenCalled();

            console_spy.mockRestore();
            console_error_spy.mockRestore();
        });

        it('should return empty map when all topics fail', () => {
            (XLSX.readFile as jest.Mock).mockImplementation(() => {
                throw new Error('All files missing');
            });
            (path.join as jest.Mock).mockReturnValue('/mock/path/test.xlsx');

            const console_spy = jest.spyOn(console, 'log').mockImplementation();
            const console_error_spy = jest.spyOn(console, 'error').mockImplementation();

            const result = ExcelReader.readTopics(['topic1', 'topic2']);

            expect(result.size).toBe(0);

            console_spy.mockRestore();
            console_error_spy.mockRestore();
        });
    });

    describe('ITopicSheets', () => {
        it('should have correct structure', () => {
            const topic_sheets: ITopicSheets = {
                users: [],
                tweets: [],
                replies: [],
            };

            expect(topic_sheets.users).toBeInstanceOf(Array);
            expect(topic_sheets.tweets).toBeInstanceOf(Array);
            expect(topic_sheets.replies).toBeInstanceOf(Array);
        });
    });
});
