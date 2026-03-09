import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const test = async () => {
  const response = await client.responses.create({
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content: `
          You are an indoor air quality analyst.

          Your task is to explain the overall IAQ (Indoor Air Quality) score based strictly on provided aggregated sensor data.

          Rules:
          - Do NOT invent values.
          - Focus on interpretation.
          - Highlight main contributing factors.
          - Provide actionable recommendations.
          - Respond in structured markdown with sections:
            - Main Factors
            - Trend Insight
            - Recommendations
        `,
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            iaq_score: 62,
            time_window: "last 60 minutes",
            trend_percent: -5,
            subscores: {
              co2: 85,
              pm1: 40,
              pm25: 38,
              pm10: 70,
              humidity: 55,
              voc: 90,
            },
            averages: {
              co2_ppm: 720,
              humidity_percent: 64,
              pm1_ug_m3: 28,
              pm25_ug_m3: 32,
              pm10_ug_m3: 18,
              voc_index: 12,
            },
          },
          null,
          2,
        ),
      },
    ],
  });

  console.log(response.output_text);
};

test();
