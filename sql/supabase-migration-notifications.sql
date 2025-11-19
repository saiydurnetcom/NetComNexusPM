-- Migration: Notifications & Alerts System
-- Run this SQL in your Supabase SQL Editor to enable notifications

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'task_assigned', 
    'task_due', 
    'task_overdue', 
    'comment', 
    'mention', 
    'milestone', 
    'dependency_blocked',
    'task_status_changed',
    'project_updated'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  "relatedTaskId" UUID REFERENCES tasks(id) ON DELETE CASCADE,
  "relatedProjectId" UUID REFERENCES projects(id) ON DELETE CASCADE,
  "relatedCommentId" UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications("userId", read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING ("userId" = auth.uid());

-- System can create notifications (via service role or functions)
-- Note: In production, you might want to use a service role for creating notifications
-- For now, we'll allow users to create notifications for themselves (for testing)
CREATE POLICY "Users can create notifications for themselves"
  ON notifications FOR INSERT
  WITH CHECK ("userId" = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING ("userId" = auth.uid());

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true, "readAt" = NOW()
  WHERE id = p_notification_id
  AND "userId" = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true, "readAt" = NOW()
  WHERE "userId" = auth.uid()
  AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

