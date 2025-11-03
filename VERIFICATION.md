# Multi-Tenant Verification Guide

This document provides instructions for verifying the multi-tenant architecture implementation.

## Test Companies

Two test companies have been created with sample data:

### Company 1: Elevadores San Martin
- **Join Code**: `SANMARTIN2025`
- **Data**:
  - 2 buildings (Av. San Martin 1500, Calle Thames 2300)
  - 4 elevators
  - 2 technicians (Carlos Rodríguez, María Fernández)
  - 4 work orders (various statuses)

### Company 2: Ascensores Belgrano
- **Join Code**: `BELGRANO2025`
- **Data**:
  - 1 building (Av. Cabildo 3400)
  - 3 elevators
  - 2 technicians (Diego Sánchez, Sofía Torres)
  - 3 work orders (various statuses)

## Verification Steps

### 1. Test Data Isolation

#### Create Test User for Company 1:
1. Navigate to Sign Up page
2. Enter join code: `SANMARTIN2025`
3. Select role: Office or Technician
4. Enter email: `test1@example.com`
5. Create password or use magic link
6. Sign up and verify login

#### Create Test User for Company 2:
1. Sign out from Company 1 user
2. Navigate to Sign Up page
3. Enter join code: `BELGRANO2025`
4. Select role: Office or Technician
5. Enter email: `test2@example.com`
6. Create password or use magic link
7. Sign up and verify login

#### Verify Data Isolation:
1. Sign in as Company 1 user
2. Check that you see:
   - 2 buildings
   - 4 elevators
   - 2 technicians
   - 4 work orders
3. Note specific building names and addresses
4. Sign out and sign in as Company 2 user
5. Check that you see:
   - 1 building
   - 3 elevators
   - 2 technicians
   - 3 work orders
6. Verify building names are different from Company 1

### 2. Test RLS Policies

#### Office Role Permissions:
1. Sign in with office role
2. Verify you can:
   - Create new buildings
   - Create new elevators
   - Create new technicians
   - Create and edit work orders
   - View all company data

#### Technician Role Permissions:
1. Sign in with technician role
2. Verify you can:
   - View buildings and elevators
   - View work orders
   - Update work orders (limited)
3. Verify you cannot:
   - Create new buildings
   - Create new elevators
   - Create new technicians

### 3. Test Invalid Join Code

1. Navigate to Sign Up page
2. Enter invalid code: `INVALID123`
3. Try to sign up
4. Verify error message appears
5. Verify sign up is blocked

### 4. Test Multi-Company Membership (Optional)

To test company switcher:
1. Manually add second company membership via SQL
2. Sign in and verify company switcher appears
3. Switch companies and verify data changes

## Database Verification Queries

Run these queries in Supabase SQL Editor to verify data:

```sql
-- Check company count
SELECT COUNT(*) as company_count FROM companies;
-- Expected: 2

-- Check buildings per company
SELECT
  c.name as company_name,
  COUNT(b.id) as building_count
FROM companies c
LEFT JOIN buildings b ON b.company_id = c.id
GROUP BY c.id, c.name;
-- Expected: Elevadores San Martin: 2, Ascensores Belgrano: 1

-- Check elevators per company
SELECT
  c.name as company_name,
  COUNT(e.id) as elevator_count
FROM companies c
LEFT JOIN elevators e ON e.company_id = c.id
GROUP BY c.id, c.name;
-- Expected: Elevadores San Martin: 4, Ascensores Belgrano: 3

-- Check work orders per company
SELECT
  c.name as company_name,
  COUNT(w.id) as work_order_count
FROM companies c
LEFT JOIN work_orders w ON w.company_id = c.id
GROUP BY c.id, c.name;
-- Expected: Elevadores San Martin: 4, Ascensores Belgrano: 3

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('companies', 'buildings', 'elevators', 'technicians', 'work_orders');
-- Expected: All should have rowsecurity = true
```

## Expected Results

### PASS Criteria:
- Users from different companies cannot see each other's data
- Office users can create/edit all data
- Technician users have read access only
- Invalid join codes are rejected
- Company switcher works for multi-company users
- All RLS policies are enabled and functioning
- Storage is isolated by company_id

### FAIL Criteria:
- Cross-company data is visible
- Unauthorized operations succeed
- Invalid join codes are accepted
- Data queries return data from wrong company
- RLS policies allow unauthorized access

## Troubleshooting

If verification fails:

1. Check RLS policies are enabled:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

2. Check company memberships:
```sql
SELECT
  cm.*,
  c.name as company_name,
  u.email
FROM company_members cm
JOIN companies c ON c.id = cm.company_id
JOIN auth.users u ON u.id = cm.user_id;
```

3. Verify active company in auth context
4. Check browser console for errors
5. Verify Supabase environment variables
