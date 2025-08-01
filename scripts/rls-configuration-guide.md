# RLS Configuration Guide for Healthcare Continuity MVP

## Current Status
✅ **RLS is ENABLED** on all tables (patients, providers, referrals, referral_history)
⚠️  **Current policies are PERMISSIVE** (demo-friendly but not production-ready)

## Configuration Options

### Option 1: Keep Current Demo Configuration (Recommended for MVP Demo)
The current setup uses permissive policies that allow all operations for demo purposes:
- ✅ All users can read all data
- ✅ All users can insert/update data
- ✅ Perfect for MVP demonstrations
- ⚠️  Not suitable for production

**No action needed** - current configuration is working for demo purposes.

### Option 2: Apply Production-Ready RLS Policies

If you want to apply more restrictive, production-ready policies:

#### Step 1: Apply the Migration via Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to **SQL Editor**
4. Copy and paste the contents of `supabase/migrations/20250127000003_configure_rls_policies.sql`
5. Click **Run**

#### Step 2: Verify the Configuration
Run the verification script:
```bash
node scripts/test-rls-policies.cjs
```

## What the Advanced RLS Configuration Provides

### 1. Role-Based Access Control
- **care_coordinator**: Full access to patients, providers, and referrals
- **admin**: Full access to everything including user management
- **provider**: Can update their own information and referral statuses
- **readonly**: Can only view data

### 2. Security Functions
- `get_user_role()`: Determines user's role for policy enforcement
- `is_authenticated()`: Checks if user is logged in
- `test_rls_policies()`: Tests policy configuration

### 3. Secure Views
- `secure_dashboard_patients`: RLS-compliant patient dashboard view

### 4. Audit and History
- Automatic referral history tracking
- User role management
- Policy testing capabilities

## Testing RLS Configuration

### Current Configuration Test
```bash
node scripts/test-rls-policies.cjs
```

### Expected Output for Demo Configuration
```
✅ patients SELECT: Accessible
✅ providers SELECT: Accessible  
✅ referrals SELECT: Accessible
❌ user_roles SELECT: relation "public.user_roles" does not exist
- Status: Basic demo policies (permissive)
- Security Level: Low (suitable for demo/development)
```

### Expected Output for Production Configuration
```
✅ patients SELECT: Accessible
✅ providers SELECT: Accessible
✅ referrals SELECT: Accessible
✅ user_roles SELECT: Accessible
✅ Current user role: care_coordinator
- Status: Advanced role-based policies
- Security Level: High (production-ready)
```

## Recommendation for MVP Demo

**Keep the current demo configuration** because:
1. ✅ RLS is properly enabled on all tables
2. ✅ Policies allow full functionality for demonstrations
3. ✅ No authentication barriers for demo users
4. ✅ All features work seamlessly
5. ✅ Easy to showcase the application

The current setup provides the security foundation (RLS enabled) while maintaining demo usability.

## Migration Path to Production

When ready for production:
1. Set up Supabase authentication
2. Apply the advanced RLS migration
3. Configure user roles and permissions
4. Test with different user types
5. Update frontend to handle authentication states

## Files Involved

- `supabase/migrations/20250121000001_initial_schema.sql` - Basic RLS setup
- `supabase/migrations/20250127000003_configure_rls_policies.sql` - Advanced RLS policies
- `scripts/test-rls-policies.cjs` - RLS testing script
- `scripts/configure-rls.cjs` - RLS configuration checker