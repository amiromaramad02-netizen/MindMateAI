const joi = require('joi');

const envSchema = joi.object({
  PORT: joi.number().default(3000),
  NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
  CORS_ORIGIN: joi.string().optional(),
  DATABASE_URL: joi.string().optional(),
  DB_HOST: joi.string().optional(),
  DB_USER: joi.string().optional(),
  DB_PASSWORD: joi.string().optional(),
  DB_NAME: joi.string().optional(),
  FIREBASE_PROJECT_ID: joi.string().optional(),
  FIREBASE_PRIVATE_KEY: joi.string().optional(),
  FIREBASE_CLIENT_EMAIL: joi.string().optional(),
  GROQ_API_KEY: joi.string().required(),
  SENTRY_DSN: joi.string().optional()
}).unknown(true);

function validateEnv() {
  const { error } = envSchema.validate(process.env);
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
}

module.exports = { validateEnv };