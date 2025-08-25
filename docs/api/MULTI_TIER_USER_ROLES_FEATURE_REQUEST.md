# 🏗️ Multi-Tier User Roles - Backend Feature Request

## 📋 Overview
Implement a comprehensive role-based access control system with three distinct user tiers: Admin, Sponsor, and User. Each tier has specific permissions and access levels to different parts of the Contestlet platform.

## 🎯 User Roles & Permissions

### **1. Admin Role**
- **Full platform access** - CRUD operations on all contests, users, and system data
- **User management** - Create, read, update, delete all user accounts
- **Sponsor management** - Oversee sponsor accounts and contest approvals
- **System analytics** - Access to platform-wide statistics and reports
- **Content moderation** - Review and approve contest content

### **2. Sponsor Role**
- **Own contest management** - CRUD operations on contests they create
- **Sponsor profile management** - Update company information, branding, contact details
- **Contest analytics** - View performance metrics for their contests
- **Entry management** - View and manage entries for their contests
- **Limited user access** - Cannot access other users' data

### **3. User Role**
- **Contest participation** - Enter available contests
- **Profile management** - Update personal information
- **Entry history** - View contests they've entered
- **Limited access** - Cannot create or manage contests

## 🔧 Required Backend Implementation

### **Database Schema Changes**

#### **1. Users Table Updates**
```sql
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN created_by_user_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN role_assigned_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN role_assigned_by UUID REFERENCES users(id);

-- Add constraints
ALTER TABLE users ADD CONSTRAINT valid_roles CHECK (role IN ('admin', 'sponsor', 'user'));
```

#### **2. Sponsor Profiles Table**
```sql
CREATE TABLE sponsor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    website_url VARCHAR(500),
    logo_url VARCHAR(500),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    industry VARCHAR(100),
    description TEXT,
    is_verified BOOLEAN DEFAULT false,
    verification_document_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX idx_sponsor_profiles_user_id ON sponsor_profiles(user_id);
CREATE INDEX idx_sponsor_profiles_company_name ON sponsor_profiles(company_name);
```

#### **3. Contests Table Updates**
```sql
ALTER TABLE contests ADD COLUMN created_by_user_id UUID REFERENCES users(id);
ALTER TABLE contests ADD COLUMN sponsor_profile_id UUID REFERENCES sponsor_profiles(id);
ALTER TABLE contests ADD COLUMN is_approved BOOLEAN DEFAULT false;
ALTER TABLE contests ADD COLUMN approved_by_user_id UUID REFERENCES users(id);
ALTER TABLE contests ADD COLUMN approved_at TIMESTAMP;

-- Add indexes
CREATE INDEX idx_contests_created_by ON contests(created_by_user_id);
CREATE INDEX idx_contests_sponsor_profile ON contests(sponsor_profile_id);
```

### **New API Endpoints**

#### **1. Authentication & Role Management**
```python
# User registration with role assignment
POST /auth/register
{
    "phone": "+1234567890",
    "role": "user|sponsor|admin",  # admin requires special approval
    "company_name": "Company Name",  # required for sponsor role
    "verification_code": "123456"
}

# Role upgrade request (user -> sponsor)
POST /auth/upgrade-role
{
    "target_role": "sponsor",
    "company_name": "Company Name",
    "website_url": "https://company.com",
    "verification_document": "base64_encoded_document"
}

# Admin role assignment
POST /admin/users/{user_id}/assign-role
{
    "role": "admin|sponsor|user",
    "reason": "Role assignment reason"
}
```

#### **2. Sponsor-Specific Endpoints**
```python
# Get sponsor's contests
GET /sponsor/contests
GET /sponsor/contests/{contest_id}

# Create/edit sponsor's contest
POST /sponsor/contests
PUT /sponsor/contests/{contest_id}
DELETE /sponsor/contests/{contest_id}

# Sponsor profile management
GET /sponsor/profile
PUT /sponsor/profile

# Sponsor analytics
GET /sponsor/analytics
GET /sponsor/contests/{contest_id}/analytics
```

#### **3. User-Specific Endpoints**
```python
# Get available contests for users
GET /contests/available

# User contest entries
GET /user/entries
POST /user/contests/{contest_id}/enter

# User profile
GET /user/profile
PUT /user/profile
```

#### **4. Admin Management Endpoints**
```python
# User management
GET /admin/users
GET /admin/users/{user_id}
PUT /admin/users/{user_id}
DELETE /admin/users/{user_id}

# Sponsor management
GET /admin/sponsors
GET /admin/sponsors/{sponsor_id}
PUT /admin/sponsors/{sponsor_id}/verify
DELETE /admin/sponsors/{sponsor_id}

# Contest approval
PUT /admin/contests/{contest_id}/approve
PUT /admin/contests/{contest_id}/reject

# System analytics
GET /admin/analytics
GET /admin/analytics/users
GET /admin/analytics/contests
GET /admin/analytics/sponsors
```

### **RLS Policy Updates**

#### **1. Contests Table Policies**
```sql
-- Public can view approved contests
CREATE POLICY "Public can view approved contests" ON contests
    FOR SELECT USING (is_approved = true);

-- Sponsors can manage their own contests
CREATE POLICY "Sponsors can manage own contests" ON contests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sponsor_profiles sp
            JOIN users u ON sp.user_id = u.id
            WHERE u.id = auth.uid() 
            AND u.role = 'sponsor'
            AND contests.created_by_user_id = u.id
        )
    );

-- Admins can manage all contests
CREATE POLICY "Admins can manage all contests" ON contests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );
```

#### **2. Sponsor Profiles Table Policies**
```sql
-- Sponsors can manage their own profile
CREATE POLICY "Sponsors can manage own profile" ON sponsor_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'sponsor'
            AND sponsor_profiles.user_id = auth.uid()
        )
    );

-- Admins can manage all sponsor profiles
CREATE POLICY "Admins can manage all sponsor profiles" ON sponsor_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );
```

#### **3. Users Table Policies**
```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- Admins can manage all users
CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );
```

### **Business Logic Requirements**

#### **1. Role Assignment Rules**
- **Default role**: All new users start as 'user'
- **Sponsor upgrade**: Requires admin approval and company verification
- **Admin role**: Can only be assigned by existing admins
- **Role downgrade**: Admins can downgrade users (with audit trail)

#### **2. Contest Creation Rules**
- **Users**: Cannot create contests
- **Sponsors**: Can create contests (requires admin approval)
- **Admins**: Can create contests (auto-approved)
- **Contest ownership**: Tied to creating user's sponsor profile

#### **3. Data Access Rules**
- **Users**: Can only see approved contests and their own data
- **Sponsors**: Can see their contests, entries, and limited analytics
- **Admins**: Can see all platform data and analytics

#### **4. Approval Workflow**
- **Sponsor contests**: Require admin approval before going live
- **Role upgrades**: Require admin approval and verification
- **Content moderation**: Admins can flag/reject inappropriate content

### **Security Considerations**

#### **1. Authentication**
- **JWT tokens**: Include user role and permissions
- **Token refresh**: Validate role changes on token refresh
- **Session management**: Handle role changes during active sessions

#### **2. Authorization**
- **Route protection**: Validate role access on all protected endpoints
- **Data filtering**: Ensure users only see data they're authorized to access
- **Action validation**: Prevent unauthorized CRUD operations

#### **3. Audit Trail**
- **Role changes**: Log all role assignments and changes
- **Permission changes**: Track permission modifications
- **Admin actions**: Log all admin operations for accountability

### **Testing Requirements**

#### **1. Unit Tests**
- **Role validation**: Test role assignment and validation logic
- **Permission checks**: Test access control on all endpoints
- **Data filtering**: Test that users only see authorized data

#### **2. Integration Tests**
- **End-to-end workflows**: Test complete user journeys for each role
- **Cross-role interactions**: Test interactions between different user types
- **API security**: Test that unauthorized access is properly blocked

#### **3. Security Tests**
- **Role escalation**: Test prevention of unauthorized role changes
- **Data leakage**: Test that users cannot access other users' data
- **API abuse**: Test rate limiting and abuse prevention

## 🚀 Implementation Priority

### **Phase 1: Core Role System**
1. Database schema updates
2. Basic role assignment and validation
3. Updated authentication endpoints
4. Basic RLS policies

### **Phase 2: Role-Specific Features**
1. Sponsor dashboard and contest management
2. User contest participation
3. Admin user management
4. Enhanced RLS policies

### **Phase 3: Advanced Features**
1. Contest approval workflow
2. Sponsor verification system
3. Advanced analytics
4. Content moderation tools

## 📊 Success Metrics

- **User adoption**: % of users upgrading to sponsor role
- **Contest creation**: Number of contests created by sponsors
- **User engagement**: Contest participation rates
- **Admin efficiency**: Time to approve contests and users
- **Security**: Zero unauthorized access incidents

---

**This multi-tier role system will provide a scalable foundation for Contestlet's growth while maintaining security and user experience standards.**
