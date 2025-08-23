-- =====================================================
-- RLS SECURITY TESTING SCRIPT
-- =====================================================
-- Run this after implementing RLS to verify security is working
-- =====================================================

-- =====================================================
-- TEST 1: VERIFY RLS STATUS ON ALL TABLES
-- =====================================================

SELECT 'TEST 1: RLS Status Verification' as test_section;

-- Check RLS status on all tables
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- TEST 2: VERIFY POLICIES ARE CREATED
-- =====================================================

SELECT 'TEST 2: Policy Verification' as test_section;

-- Count policies per table
SELECT 
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 1 THEN '✅ Has Policies'
        ELSE '❌ No Policies'
    END as policy_status
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- TEST 3: TEST UNAUTHENTICATED ACCESS (Should Fail)
-- =====================================================

SELECT 'TEST 3: Unauthenticated Access Test' as test_section;

-- Test unauthenticated access to each table
-- These should return no rows when not authenticated
SELECT 'admin_profiles' as table_name, COUNT(*) as accessible_rows FROM public.admin_profiles
UNION ALL
SELECT 'users' as table_name, COUNT(*) as accessible_rows FROM public.users
UNION ALL
SELECT 'contests' as table_name, COUNT(*) as accessible_rows FROM public.contests
UNION ALL
SELECT 'entries' as table_name, COUNT(*) as accessible_rows FROM public.entries
UNION ALL
SELECT 'notifications' as table_name, COUNT(*) as accessible_rows FROM public.notifications
UNION ALL
SELECT 'official_rules' as table_name, COUNT(*) as accessible_rows FROM public.official_rules
UNION ALL
SELECT 'sms_templates' as table_name, COUNT(*) as accessible_rows FROM public.sms_templates;

-- =====================================================
-- TEST 4: TEST AUTHENTICATED ACCESS (Should Work)
-- =====================================================

SELECT 'TEST 4: Authenticated Access Test' as test_section;

-- Test authenticated access to public data
-- These should work for authenticated users
SELECT 'Active Contests' as data_type, COUNT(*) as accessible_rows 
FROM public.contests 
WHERE active = true;

SELECT 'Public Official Rules' as data_type, COUNT(*) as accessible_rows 
FROM public.official_rules 
WHERE EXISTS (
    SELECT 1 FROM public.contests c 
    WHERE c.id = official_rules.contest_id 
    AND c.active = true
);

-- =====================================================
-- TEST 5: TEST ADMIN ACCESS (Should Work for Admins)
-- =====================================================

SELECT 'TEST 5: Admin Access Test' as test_section;

-- Test admin access to all data
-- These should work for admin users
SELECT 'All Contests (Admin)' as data_type, COUNT(*) as accessible_rows FROM public.contests;
SELECT 'All Entries (Admin)' as data_type, COUNT(*) as accessible_rows FROM public.entries;
SELECT 'All SMS Templates (Admin)' as data_type, COUNT(*) as accessible_rows FROM public.sms_templates;

-- =====================================================
-- TEST 6: TEST USER-SPECIFIC ACCESS
-- =====================================================

SELECT 'TEST 6: User-Specific Access Test' as test_section;

-- Test if users can only access their own data
-- This depends on your authentication setup
SELECT 'Own User Profile' as data_type, COUNT(*) as accessible_rows 
FROM public.users 
WHERE phone = auth.jwt() ->> 'phone';

SELECT 'Own Admin Profile' as data_type, COUNT(*) as accessible_rows 
FROM public.admin_profiles 
WHERE admin_user_id = auth.uid()::text;

-- =====================================================
-- TEST 7: SECURITY PERMISSIONS VERIFICATION
-- =====================================================

SELECT 'TEST 7: Security Permissions Test' as test_section;

-- Check if public access has been revoked
SELECT 
    table_schema as schemaname,
    table_name as tablename,
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND grantee = 'PUBLIC'
ORDER BY table_name, privilege_type;

-- =====================================================
-- TEST 8: POLICY DETAILS VERIFICATION
-- =====================================================

SELECT 'TEST 8: Policy Details Verification' as test_section;

-- Show all policies with their restrictions
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NULL THEN '❌ NO RESTRICTION'
        ELSE '✅ RESTRICTED'
    END as security_status,
    qual as restriction_condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- =====================================================
-- TEST 9: COMPREHENSIVE SECURITY ASSESSMENT
-- =====================================================

SELECT 'TEST 9: Comprehensive Security Assessment' as test_section;

-- Overall security score per table
WITH table_security AS (
    SELECT 
        t.tablename,
        t.rowsecurity,
        COUNT(p.policyname) as policy_count,
        COUNT(CASE WHEN p.qual IS NULL THEN 1 END) as unrestricted_policies
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename, t.rowsecurity
)
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status,
    policy_count,
    CASE 
        WHEN policy_count = 0 THEN '❌ No Policies'
        WHEN unrestricted_policies > 0 THEN '⚠️ Some Unrestricted'
        ELSE '✅ Fully Secured'
    END as policy_status,
    CASE 
        WHEN rowsecurity AND policy_count > 0 AND unrestricted_policies = 0 THEN '🔒 SECURE'
        WHEN rowsecurity AND policy_count > 0 THEN '⚠️ PARTIALLY SECURE'
        WHEN rowsecurity THEN '❌ RLS ENABLED BUT NO POLICIES'
        ELSE '❌ UNSECURED'
    END as overall_security
FROM table_security
ORDER BY tablename;

-- =====================================================
-- TEST 10: RECOMMENDATIONS
-- =====================================================

SELECT 'TEST 10: Security Recommendations' as test_section;

-- Generate recommendations based on current status
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = false THEN 'Enable RLS immediately'
        WHEN rowsecurity = true AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t.tablename) THEN 'Create RLS policies'
        WHEN rowsecurity = true AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t.tablename AND qual IS NULL) THEN 'Fix unrestricted policies'
        ELSE 'Security is properly configured'
    END as recommendation
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- COMPLETION SUMMARY
-- =====================================================

SELECT '🎯 SECURITY TESTING COMPLETE!' as status,
       'Review the results above to verify your RLS implementation' as message,
       'All tables should show "🔒 SECURE" status for production readiness' as goal;
