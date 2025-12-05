export const TOPICS = ['Sports', 'Entertainment', 'News'];

export const categorize_prompt = (content: string) => {
    return `
You are an expert text classifier.

Analyze the following text and assign a percentage (0-100) to EACH of these topics:
${TOPICS.join(', ')}.

IMPORTANT RULES:
- Always return ALL topics.
- Percentages MUST sum to 100.
- If a topic is not relevant, assign 0 to it (do NOT omit it).
- Return ONLY a JSON object. No explanations. No extra text.

Example:
{ "Sports": 80, "Entertainment": 20, "News": 0 }

Text:
"${content}"

Return ONLY the JSON object.
`;
};

export const summarize_prompt = (content: string) => {
    return `
You are an expert text summarizer.
Summarize the following text in 2-3 concise sentences, capturing the main points clearly and accurately.
Text:
"${content}"
`;
};
