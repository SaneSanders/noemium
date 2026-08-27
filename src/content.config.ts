import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { agentSchema, graveyardSchema, jobSchema, modelSchema, skillSchema, stackSchema, toolSchema } from './content-schemas';

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

const graveyard = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/graveyard' }),
  schema: graveyardSchema,
});

const agents = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/agents' }),
  schema: agentSchema,
});

const jobs = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/jobs' }),
  schema: jobSchema,
});

const skills = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/skills' }),
  schema: skillSchema,
});

export const collections = { tools, stacks, models, graveyard, agents, jobs, skills };
