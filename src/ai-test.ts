import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const getAiAnalysis = async (content: string): Promise<string> => {
  const response = await client.responses.create({
    model: "gpt-5.4-nano",
    input: [
      {
        role: "system",
        content: `
          You are an indoor air quality analyst.

          Explain the IAQ score using only the provided data.
          Do not invent causes, events, or measurements.
          Prioritize the worst subscores and metrics that materially lowered the final score.
          If data is insufficient for a strong conclusion, say so briefly.

          Output rules:
          - Plain text only
          - Can use emoji
          - 3 sections exactly:
          Trend Insight
          Main Factors
          Recommendations
          - 120-170 words
          - 2-3 recommendations
          - Mention exact metric values when relevant
          - Do not ask follow-up questions
          - Do not use bold markdown

          Interpretation rules:
          - Lower particulate matter and CO2 are better
          - VOC Index in range 0-500 (0 is best)
          - Humidity is best in the mid range, not simply lower
          - Focus first on pm2.5, CO2, VOC, and humidity unless their values are normal
          - Use the provided thresholds to classify metric severity when relevant
          - IAQ Score in range 0-100 (Higher is better)
          `,
      },
      {
        role: "user",
        content,
      },
    ],
  });

  return response.output_text;
};
