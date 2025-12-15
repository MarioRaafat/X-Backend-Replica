export const TOPICS = ['Sports', 'Entertainment', 'News'];

export const categorize_prompt = (content: string, hashtags: string[]) => {
    const hashtags_section =
        hashtags.length > 0
            ? `\n\nHashtags to categorize separately:\n${hashtags.map((h) => `- ${h}`).join('\n')}`
            : '';
    return `
You are an expert text classifier.

Analyze the following text and assign a percentage (0-100) to EACH of these topics:
${TOPICS.join(', ')}.

IMPORTANT RULES:
- Always return ALL topics.
- Percentages MUST sum to 100.
- If a topic is not relevant, assign 0 to it (do NOT omit it).
- Return ONLY a JSON object. No explanations. No extra text.
- Categorize the text content AND each hashtag separately.


Structure your response as:
{
  "text": { "Sports": 80, "Entertainment": 20, "News": 0, ... },
  "hashtag1": { "Sports": 100, "Entertainment": 0, "News": 0, ... },
  "hashtag2": { "Sports": 0, "Entertainment": 90, "News": 10, ... }
}

Text:
"${content}" ${hashtags_section}

Return ONLY the JSON object.
`;
};

export const summarize_prompt = (content: string) => `
You are an expert tweet summarizer.

Summarize the tweet below. 
If the tweet is already very short or simple, produce a **more concise rewrite** rather than repeating it.
If the tweet contains multiple ideas, summarize in **1–2 short sentences**.

Rules:
- Begin the summary with "The tweet talks about…" (use Arabic equivalent "التغريدة تتحدث عن…" if the tweet is in Arabic).
- Provide a summary that is **meaningfully shorter** than the original.
- Do NOT repeat the original phrasing or structure.
- Do NOT add any new information.
- Keep the tone neutral and simple.
- Remove emojis, hashtags, and usernames.
- If the tweet is in Arabic, return the summary in Arabic. For all other languages, return the summary in English.

Tweet:
"${content}"

Return only the summary text.
`;
