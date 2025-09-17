# Database Migrations

This directory contains SQL migration files that are applied in order to set up and evolve the database schema.

## Migration Naming Convention
Migrations are named as: `{number}_{description}.sql`

Example: `0001_initial_schema.sql`

## Running Migrations
Use the migration script: `node scripts/migrate.js`