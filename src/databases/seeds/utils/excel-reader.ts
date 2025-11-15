import * as XLSX from 'xlsx';
import * as path from 'path';

export interface ITopicSheets {
    users: any[];
    tweets: any[];
    replies: any[];
}

/**
 * Excel Reader Service
 * Reads topic-based Excel files with standardized tabs: users, tweets, replies
 */
export class ExcelReader {
    private static readonly data_dir = path.join(__dirname, '..', 'data');
    private static readonly required_tabs = ['users', 'tweets', 'replies'];

    /**
     * Read a single topic Excel file
     * @param topic_name - Name of the topic (e.g., 'music', 'football')
     * @returns TopicSheets object containing data from all three tabs
     */
    static readTopic(topic_name: string): ITopicSheets {
        const file_name = topic_name.endsWith('.xlsx') ? topic_name : `${topic_name}.xlsx`;
        const file_path = path.join(this.data_dir, file_name);

        console.log(`📖 Reading topic: ${topic_name}`);

        try {
            const workbook = XLSX.readFile(file_path);

            // Find and read each required tab
            const users = this.readSheet(workbook, 'users');
            const tweets = this.readSheet(workbook, 'tweets');
            const replies = this.readSheet(workbook, 'replies');

            console.log(`   ✓ Users: ${users.length}`);
            console.log(`   ✓ Tweets: ${tweets.length}`);
            console.log(`   ✓ Replies: ${replies.length}`);

            return { users, tweets, replies };
        } catch (error) {
            throw new Error(`Failed to read topic '${topic_name}': ${error.message}`);
        }
    }

    /**
     * Read multiple topics
     * @param topic_names - Array of topic names
     * @returns Map of topic name to TopicSheets
     */
    static readTopics(topic_names: string[]): Map<string, ITopicSheets> {
        const topics_data = new Map<string, ITopicSheets>();

        console.log(`📚 Reading ${topic_names.length} topic(s)...\n`);

        for (const topic_name of topic_names) {
            try {
                const data = this.readTopic(topic_name);
                topics_data.set(topic_name, data);
            } catch (error) {
                console.error(`❌ Error reading ${topic_name}: ${error.message}`);
                console.log(`   Skipping ${topic_name}...\n`);
            }
        }

        return topics_data;
    }

    /**
     * Read a specific sheet from workbook
     * Handles case-insensitive tab names and variations
     */
    private static readSheet(workbook: XLSX.WorkBook, tab_name: string): any[] {
        const sheet_name = this.findSheet(workbook.SheetNames, tab_name);

        if (!sheet_name) {
            console.warn(`   ⚠️  Tab '${tab_name}' not found, returning empty array`);
            return [];
        }

        const worksheet = workbook.Sheets[sheet_name];
        return XLSX.utils.sheet_to_json(worksheet, { defval: null });
    }

    /**
     * Find sheet name (case-insensitive with variations)
     */
    private static findSheet(sheet_names: string[], target_name: string): string | null {
        const variations = [
            target_name,
            target_name.slice(0, -1), // singular form (tweets -> tweet)
            target_name + 's', // plural form
        ];

        for (const variation of variations) {
            const found = sheet_names.find(
                (name) => name.toLowerCase() === variation.toLowerCase()
            );
            if (found) return found;
        }

        return null;
    }
}
