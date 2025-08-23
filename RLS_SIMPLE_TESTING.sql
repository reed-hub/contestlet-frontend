-- =====================================================
-- RLS SIMPLE TESTING SCRIPT
-- =====================================================
-- Simplified version for quick RLS verification
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
-- TEST 4: POLICY DETAILS VERIFICATION
-- =====================================================

SELECT 'TEST 4: Policy Details Verification' as test_section;

-- Show all policies with their restrictions
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NULL THEN '❌ NO RESTRICTION'
        ELSE '✅ RESTRICTED'
    END as security_status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- =====================================================
-- TEST 5: BASIC SECURITY ASSESSMENT
-- =====================================================

SELECT 'TEST 5: Basic Security Assessment' as test_section;

-- Simple security check per table
SELECT 
    t.tablename,
    CASE 
        WHEN t.rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status,
    CASE 
        WHEN COUNT(p.policyname) > 0 THEN '✅ Has Policies'
        ELSE '❌ No Policies'
    END as policy_status,
    CASE 
        WHEN t.rowsecurity AND COUNT(p.policyname) > 0 THEN '🔒 SECURE'
        WHEN t.rowsecurity THEN '⚠️ RLS ENABLED BUT NO POLICIES'
        ELSE '❌ UNSECURED'
    END as overall_security
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- =====================================================
-- COMPLETION SUMMARY
-- =====================================================

SELECT '🎯 SIMPLE SECURITY TESTING COMPLETE!' as status,
       'Review the results above to verify your RLS implementation' as message,
       'All tables should show "🔒 SECURE" status for production readiness' as goal;
