const joi = require('joi');

const envSchema = joi.object({
  PORT: joi.number().default(3000),
  NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
  CORS_ORIGIN: joi.string().optional(),
  DATABASE_URL: joi.string().required(),
  FIREBASE_PROJECT_ID: joi.string().optional(),
  FIREBASE_PRIVATE_KEY: joi.string().optional(),
  FIREBASE_CLIENT_EMAIL: joi.string().optional(),
  AI_PROVIDER: joi.string().valid('groq', 'openrouter').default('groq'),
  GROQ_API_KEY: joi.string().when('AI_PROVIDER', { is: 'groq', then: joi.required() }),
  SENTRY_DSN: joi.string().optional()
}).unknown(true);

function validateEnv() {
  const { error } = envSchema.validate(process.env);
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
}

module.exports = { validateEnv };