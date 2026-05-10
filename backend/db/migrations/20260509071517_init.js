/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('users', function (table) {
      table.string('id').primary(); // Firebase UID
      table.string('email').notNullable().unique();
      table.string('name');
      table.string('avatar_url');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('conversations', function (table) {
      table.increments('id').primary();
      table.string('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('title');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('messages', function (table) {
      table.increments('id').primary();
      table.integer('conversation_id').unsigned().references('id').inTable('conversations').onDelete('CASCADE');
      table.enum('role', ['user', 'assistant']).notNullable();
      table.text('content', 'longtext').notNullable();
      table.string('detected_emotion');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable(); // Soft delete
    })
    .createTable('analytics', function (table) {
      table.increments('id').primary();
      table.string('user_id').references('id').inTable('users').onDelete('CASCADE').nullable();
      table.string('event_type').notNullable();
      table.json('payload');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('feedback', function (table) {
      table.increments('id').primary();
      table.integer('message_id').unsigned().references('id').inTable('messages').onDelete('CASCADE');
      table.string('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.boolean('is_positive').notNullable();
      table.text('comments');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('feedback')
    .dropTableIfExists('analytics')
    .dropTableIfExists('messages')
    .dropTableIfExists('conversations')
    .dropTableIfExists('users');
};
