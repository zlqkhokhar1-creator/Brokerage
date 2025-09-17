-- Migration to add a profile image URL to the users table

ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
