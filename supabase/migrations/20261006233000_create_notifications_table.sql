-- Migration: Create app_notifications table with Realtime support
-- CreAPP Suite • Full Strategic Notifications Engine

CREATE TABLE IF NOT EXISTS public.app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT DEFAULT '/admin',
    target_role TEXT DEFAULT 'all', -- 'all', 'admin', 'sales'
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_by JSONB DEFAULT '[]'::jsonb, -- Array of user IDs who marked read
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.app_notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON public.app_notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.app_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- 1. Read policy: Users can see notifications directed to 'all', their role, or their specific userId
CREATE POLICY "Users can read relevant notifications"
    ON public.app_notifications
    FOR SELECT
    USING (
        target_role = 'all' OR
        target_user_id = auth.uid() OR
        auth.uid() IS NULL OR -- Allows public/anon proposal view & contract signs to fetch if needed
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid() AND (
                (app_notifications.target_role = 'admin' AND user_profiles.role = 'admin') OR
                (app_notifications.target_role = 'sales')
            )
        )
    );

-- 2. Insert policy: Any authenticated user, service role or edge function can insert
CREATE POLICY "Allow notification inserts"
    ON public.app_notifications
    FOR INSERT
    WITH CHECK (true);

-- 3. Update policy: Users can update read_by status
CREATE POLICY "Allow read status updates"
    ON public.app_notifications
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Enable Realtime for app_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
