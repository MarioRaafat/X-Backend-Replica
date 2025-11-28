export const TOPICS = ['Sports', 'Entertainment', 'News'];

export const categorize_prompt = (content: string) => {
    return `Analyze the following text and categorize it into these topics: ${TOPICS.join(', ')}.
        Return ONLY a JSON object with topic names as keys and percentage values (0-100) as numbers. The percentages should add up to 100.
        Only include topics that are relevant (percentage > 0).

        Example format:
        { "Sports": 60, "Entertainment": 30, "News": 10 }

        Text to analyze:
        "${content}"

        Return only the JSON object, no additional text or explanation.
    `;
};
