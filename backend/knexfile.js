require('dotenv').config({ path: '../.env' }); // Load from root .env if running from backend dir

module.exports = {
  development: {
    client: 'mysql2',
    connection: process.env.DATABASE_URL || {
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'mindmate'
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 10000
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations'
    }
  },

  production: {
    client: 'mysql2',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 10000
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations'
    }
  }
};
