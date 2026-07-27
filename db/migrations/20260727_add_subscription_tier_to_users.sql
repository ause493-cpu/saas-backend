-- Migration: add subscription_tier column to users table
-- Ref: Notion task "Feature: Add Subscription Tier" (Engineering_Sprint_Board)
-- https://app.notion.com/p/396d473a25a480389bd9f4a1a2cfcdcc

ALTER TABLE users
  ADD COLUMN subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free';
