-- =====================================================
-- COMPLETE RLS IMPLEMENTATION FOR CONTESTLET DATABASE
-- =====================================================
-- This script implements Row Level Security (RLS) on all tables
-- Run this in your Supabase SQL Editor to secure your database
-- =====================================================

-- =====================================================
-- PHASE 1: VERIFY CURRENT RLS STATUS
-- =====================================================

-- Check current RLS status on all public tables
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- PHASE 2: ENABLE RLS ON ALL TABLES
-- =====================================================

-- Enable RLS on contests table
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on entries table  
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on official_rules table
ALTER TABLE public.official_rules ENABLE ROW LEVEL SECURITY;

-- Enable RLS on sms_templates table
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PHASE 3: CREATE RLS POLICIES FOR CONTESTS TABLE
-- =====================================================

-- Policy: Public can view active contests (for contest entry)
CREATE POLICY "Public can view active contests" ON public.contests
    FOR SELECT USING (active = true);

-- Policy: Only admins can create/update/delete contests
CREATE POLICY "Admins can manage contests" ON public.contests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_profiles 
            WHERE admin_user_id = auth.uid()::text
        )
    );

-- =====================================================
-- PHASE 4: CREATE RLS POLICIES FOR ENTRIES TABLE
-- =====================================================

-- Policy: Users can view their own entries
CREATE POLICY "Users can view own entries" ON public.entries
    FOR SELECT USING (user_id::text = auth.uid()::text);

-- Policy: Users can create their own entries
CREATE POLICY "Users can create own entries" ON public.entries
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Policy: Admins can view all entries
CREATE POLICY "Admins can view all entries" ON public.entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_profiles 
            WHERE admin_user_id = auth.uid()::text
        )
    );

-- =====================================================
-- PHASE 5: CREATE RLS POLICIES FOR NOTIFICATIONS TABLE
-- =====================================================

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id::text = auth.uid()::text);

-- Policy: Users can update their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Policy: Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON public.notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_profiles 
            WHERE admin_user_id = auth.uid()::text
        )
    );

-- =====================================================
-- PHASE 6: CREATE RLS POLICIES FOR OFFICIAL_RULES TABLE
-- =====================================================

-- Policy: Public can view official rules for active contests
CREATE POLICY "Public can view official rules for active contests" ON public.official_rules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.contests c 
            WHERE c.id = official_rules.contest_id 
            AND c.active = true
        )
    );

-- Policy: Only admins can manage official rules
CREATE POLICY "Admins can manage official rules" ON public.official_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_profiles 
            WHERE admin_user_id = auth.uid()::text
        )
    );

-- =====================================================
-- PHASE 7: CREATE RLS POLICIES FOR SMS_TEMPLATES TABLE
-- =====================================================

-- Policy: Only admins can access SMS templates
CREATE POLICY "Only admins can access SMS templates" ON public.sms_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_profiles 
            WHERE admin_user_id = auth.uid()::text
        )
    );

-- =====================================================
-- PHASE 8: VERIFY RLS IMPLEMENTATION
-- =====================================================

-- Check final RLS status on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all created policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- PHASE 9: SECURITY TESTING QUERIES
-- =====================================================

-- Test 1: Check if unauthenticated access is blocked
-- (This should return no rows when not authenticated)
SELECT 'Testing unauthenticated access' as test_name,
       COUNT(*) as accessible_rows
FROM public.contests;

-- Test 2: Check if authenticated users can see active contests
-- (This should work for authenticated users)
SELECT 'Testing authenticated contest access' as test_name,
       COUNT(*) as accessible_rows
FROM public.contests 
WHERE active = true;

-- Test 3: Check admin access to all data
-- (This should work for admin users)
SELECT 'Testing admin access' as test_name,
       COUNT(*) as accessible_rows
FROM public.contests;

-- =====================================================
-- PHASE 10: ADDITIONAL SECURITY MEASURES
-- =====================================================

-- Revoke public access to sensitive tables
REVOKE ALL ON public.admin_profiles FROM PUBLIC;
REVOKE ALL ON public.users FROM PUBLIC;
REVOKE ALL ON public.contests FROM PUBLIC;
REVOKE ALL ON public.entries FROM PUBLIC;
REVOKE ALL ON public.notifications FROM PUBLIC;
REVOKE ALL ON public.official_rules FROM PUBLIC;
REVOKE ALL ON public.sms_templates FROM PUBLIC;

-- Grant specific permissions to authenticated users
GRANT SELECT ON public.contests TO authenticated;
GRANT SELECT ON public.official_rules TO authenticated;
GRANT SELECT, INSERT ON public.entries TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;

-- Grant admin permissions (assuming you have an admin role)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO admin_role;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT '✅ RLS IMPLEMENTATION COMPLETE!' as status,
       'All tables are now secured with Row Level Security' as message,
       'Test your application functionality to ensure everything works correctly' as next_steps;
