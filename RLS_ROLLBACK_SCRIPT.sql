-- =====================================================
-- RLS ROLLBACK SCRIPT
-- =====================================================
-- Use this script to undo RLS changes if something breaks
-- WARNING: This will remove all security and make tables public again
-- =====================================================

-- =====================================================
-- PHASE 1: DROP ALL RLS POLICIES
-- =====================================================

-- Drop policies from admin_profiles
DROP POLICY IF EXISTS "Allow authenticated access to admin profiles" ON public.admin_profiles;

-- Drop policies from users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Drop policies from contests
DROP POLICY IF EXISTS "Public can view active contests" ON public.contests;
DROP POLICY IF EXISTS "Admins can manage contests" ON public.contests;

-- Drop policies from entries
DROP POLICY IF EXISTS "Users can view own entries" ON public.entries;
DROP POLICY IF EXISTS "Users can create own entries" ON public.entries;
DROP POLICY IF EXISTS "Admins can view all entries" ON public.entries;

-- Drop policies from notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;

-- Drop policies from official_rules
DROP POLICY IF EXISTS "Public can view official rules for active contests" ON public.official_rules;
DROP POLICY IF EXISTS "Admins can manage official rules" ON public.official_rules;

-- Drop policies from sms_templates
DROP POLICY IF EXISTS "Only admins can access SMS templates" ON public.sms_templates;

-- =====================================================
-- PHASE 2: DISABLE RLS ON ALL TABLES
-- =====================================================

-- Disable RLS on all tables
ALTER TABLE public.admin_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_templates DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- PHASE 3: RESTORE PUBLIC ACCESS
-- =====================================================

-- Grant public access to all tables
GRANT ALL ON public.admin_profiles TO PUBLIC;
GRANT ALL ON public.users TO PUBLIC;
GRANT ALL ON public.contests TO PUBLIC;
GRANT ALL ON public.entries TO PUBLIC;
GRANT ALL ON public.notifications TO PUBLIC;
GRANT ALL ON public.official_rules TO PUBLIC;
GRANT ALL ON public.sms_templates TO PUBLIC;

-- =====================================================
-- PHASE 4: VERIFY ROLLBACK
-- =====================================================

-- Check RLS status (should all be disabled)
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '❌ RLS Still Enabled'
        ELSE '✅ RLS Disabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policies (should be none)
SELECT 
    COUNT(*) as remaining_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT '🔄 ROLLBACK COMPLETE!' as status,
       'All RLS policies have been removed and tables are public again' as message,
       'Your database is now in its original unsecured state' as warning;
