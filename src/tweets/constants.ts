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

export const summarize_prompt = (content: string) => `
You are an expert tweet summarizer.

Summarize the tweet below. 
If the tweet is already very short or simple, produce a **more concise rewrite** rather than repeating it.
If the tweet contains multiple ideas, summarize in **1–2 short sentences**.

Rules:
- Provide a summary that is **meaningfully shorter** than the original.
- Do NOT repeat the original phrasing or structure.
- Do NOT add any new information.
- Keep the tone neutral and simple.
- Remove emojis, hashtags, and usernames.

Tweet:
"${content}"

Return only the summary text.
`;
