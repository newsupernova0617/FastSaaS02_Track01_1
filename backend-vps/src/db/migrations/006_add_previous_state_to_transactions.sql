-- Migration 006: Add previous_state column to transactions table
-- Enables 1-level undo for update operations by storing pre-update snapshot
-- Column stores JSON: { type, amount, category, memo, date }
ALTER TABLE transactions ADD COLUMN previous_state TEXT;
