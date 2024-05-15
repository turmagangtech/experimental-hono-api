import { serve } from '@hono/node-server';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { swaggerUI } from '@hono/swagger-ui';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';

dotenv.config();

// TODO further additional instructions https://dev.to/bimaadi/integrate-hono-with-openapiswagger-3dem

const app = new OpenAPIHono();

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '0.1.0',
    title: 'Experimental Hono API',
  },
});

// Hardcode data
const hardcodedData = {
  inputs: 'Does tiiuae/falcon-7b-instruct support streaming answers?',
};

app.get('/ui', swaggerUI({ url: '/doc' }));

const testRoute = createRoute({
  method: 'get',
  path: '/test',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            hello: z.string(),
          }),
        },
      },
      description: 'say hello',
    },
  },
});

app.openapi(testRoute, (c) => {
  return c.json({ hello: 'world' }, 200);
});

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

// Define a suitable service method to operate on the request data
async function query(data: any = hardcodedData) {
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${process.env.HF_MODEL_ID}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACEHUB_API_KEY}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(data),
    }
  );

  // Parse the result to JSON
  return await response.json();
}

const queryRoute = createRoute({
  method: 'get',
  path: '/query',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(
            z.object({
              generated_text: z.string(),
            })
          ),
        },
      },
      description: 'query llm with hardcoded request string',
    },
  },
});

app.openapi(queryRoute, async (c) => {
  const result: any = await query();
  return c.json(result, 200);
});

const port = 3000;

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port: port,
});
