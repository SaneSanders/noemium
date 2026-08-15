import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { modelSchema, stackSchema, toolSchema } from './content-schemas';

const tools = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/tools' }),
  schema: toolSchema,
});

const stacks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stacks' }),
  schema: stackSchema,
});

const models = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/models' }),
  schema: modelSchema,
});

export const collections = { tools, stacks, models };
