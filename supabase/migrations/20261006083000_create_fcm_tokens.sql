-- Migration: Create user_fcm_tokens table for Firebase Cloud Messaging
-- CreAPP Suite • Push Notification Engine

CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    fcm_token TEXT NOT NULL UNIQUE,
    device_type TEXT DEFAULT 'desktop',
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for ultra fast lookup when dispatching notifications
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.user_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON public.user_fcm_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fcm_token_hash ON public.user_fcm_tokens(fcm_token);

-- Enable RLS
ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can view their own tokens
CREATE POLICY "Users can view their own tokens"
    ON public.user_fcm_tokens
    FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- 2. Anyone authenticated (or anonymous with device token) can insert / upsert tokens
CREATE POLICY "Users can insert their own tokens"
    ON public.user_fcm_tokens
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 3. Users can update their own tokens (e.g. deactivate on logout)
CREATE POLICY "Users can update their own tokens"
    ON public.user_fcm_tokens
    FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 4. Service role / Admins can access all tokens for sending pushes
CREATE POLICY "Admins and Service role full access"
    ON public.user_fcm_tokens
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
        )
    );

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_fcm_token_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_fcm_token_updated_at ON public.user_fcm_tokens;
CREATE TRIGGER set_fcm_token_updated_at
    BEFORE UPDATE ON public.user_fcm_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_fcm_token_updated_at();
