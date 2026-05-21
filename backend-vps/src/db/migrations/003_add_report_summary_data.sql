-- Migration: add structured summary data for report previews
-- Date: 2026-04-25

ALTER TABLE reports ADD COLUMN summary_data TEXT;
