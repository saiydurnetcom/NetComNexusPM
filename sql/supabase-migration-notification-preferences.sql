-- Migration: Notification Preferences
-- Run this SQL in your Supabase SQL Editor to enable notification preferences

-- User Notification Preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  "emailNotifications" BOOLEAN DEFAULT true,
  "taskAssignments" BOOLEAN DEFAULT true,
  "projectUpdates" BOOLEAN DEFAULT true,
  "meetingReminders" BOOLEAN DEFAULT true,
  "pushNotifications" BOOLEAN DEFAULT false,
  "pushSubscription" JSONB, -- Stores browser push subscription for Web Push API
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user ON user_notification_preferences("userId");

-- Enable Row Level Security (RLS)
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view and update their own preferences
CREATE POLICY "Users can view their own notification preferences"
  ON user_notification_preferences FOR SELECT
  USING ("userId" = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
  ON user_notification_preferences FOR INSERT
  WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
  ON user_notification_preferences FOR UPDATE
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

