'use server';

/**
 * @fileOverview An AI agent that generates personalized anime recommendations based on user watch history.
 *
 * - generateAnimeRecommendations - A function that generates anime recommendations.
 * - GenerateAnimeRecommendationsInput - The input type for the generateAnimeRecommendations function.
 * - GenerateAnimeRecommendationsOutput - The return type for the generateAnimeRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAnimeRecommendationsInputSchema = z.object({
  watchHistory: z
    .array(z.string())
    .describe('An array of anime titles the user has watched.'),
});
export type GenerateAnimeRecommendationsInput =
  z.infer<typeof GenerateAnimeRecommendationsInputSchema>;

const GenerateAnimeRecommendationsOutputSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe('An array of anime titles recommended for the user.'),
});
export type GenerateAnimeRecommendationsOutput =
  z.infer<typeof GenerateAnimeRecommendationsOutputSchema>;

export async function generateAnimeRecommendations(
  input: GenerateAnimeRecommendationsInput
): Promise<GenerateAnimeRecommendationsOutput> {
  return generateAnimeRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAnimeRecommendationsPrompt',
  input: {schema: GenerateAnimeRecommendationsInputSchema},
  output: {schema: GenerateAnimeRecommendationsOutputSchema},
  prompt:
    `You are an AI anime recommendation engine. You will receive a list of anime titles the user has watched, and you will return a list of anime titles that the user might enjoy.

Here is the user's watch history:
{{#each watchHistory}}
- {{this}}
{{/each}}

Here are some anime recommendations for the user:
`,
});

const generateAnimeRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateAnimeRecommendationsFlow',
    inputSchema: GenerateAnimeRecommendationsInputSchema,
    outputSchema: GenerateAnimeRecommendationsOutputSchema,
  },
  async (input): Promise<GenerateAnimeRecommendationsOutput> => {
    try {
      const result = await prompt(input);
      if (!result || !result.output) {
        console.error("AI prompt for recommendations did not return a valid output. Result:", result);
        // Return empty recommendations to satisfy the schema, UI will handle "no recommendations".
        return { recommendations: [] };
      }
      return result.output;
    } catch (error) {
      console.error("Error calling AI prompt for recommendations:", error);
      // Rethrow the error so it can be caught by the calling component's error handler
      // This will trigger the `setError("Could not load recommendations. Please try again.");`
      // in the RecommendationsSection component.
      throw error;
    }
  }
);