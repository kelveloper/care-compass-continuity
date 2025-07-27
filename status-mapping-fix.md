# Status Mapping Fix

## Problem
The status displayed on the dashboard didn't match the patient status in the detail view. This was causing confusion where users would see different statuses for the same patient depending on which view they were looking at.

## Root Cause
The issue was in the referral creation process and status mapping:

1. **Referral Creation**: Referrals were being created with status `'pending'` but the patient status was being set to `'sent'`
2. **Status Mapping Inconsistency**: The mapping between referral status and patient status wasn't properly synchronized
3. **Database Schema Mismatch**: 
   - Referral status: `"pending" | "sent" | "scheduled" | "completed" | "cancelled"`
   - Patient referral_status: `"needed" | "sent" | "scheduled" | "completed"`

## Solution

### 1. Fixed Referral Creation
Changed referral creation to use `'sent'` status immediately instead of `'pending'`:

```typescript
// Before
const newReferral: ReferralInsert = {
  patient_id: patientId,
  provider_id: providerId,
  service_type: serviceType,
  status: 'pending', // ❌ This caused the mismatch
};

// After
const newReferral: ReferralInsert = {
  patient_id: patientId,
  provider_id: providerId,
  service_type: serviceType,
  status: 'sent', // ✅ Consistent with patient status
};
```

### 2. Clarified Status Mapping
Updated the status mapping function with clear comments:

```typescript
const mapReferralStatusToPatientStatus = (
  referralStatus: Referral['status']
): Patient['referral_status'] => {
  switch (referralStatus) {
    case 'pending':
      return 'sent'; // When referral is created (pending), patient shows as "sent"
    case 'sent':
      return 'sent';
    case 'scheduled':
      return 'scheduled';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'needed'; // When cancelled, patient needs a new referral
    default:
      return 'needed';
  }
};
```

### 3. Fixed TypeScript Errors
- Added missing `latitude` and `longitude` properties to Provider objects
- Fixed component prop mismatches
- Removed unused variables

### 4. Added Tests
Created comprehensive tests to ensure status mapping consistency:
- Status mapping correctness
- Dashboard/detail view consistency
- Complete referral lifecycle handling

## Files Modified

1. **`src/hooks/use-optimistic-updates.ts`**
   - Fixed referral creation status
   - Updated status mapping function

2. **`src/hooks/use-referrals-optimistic.ts`**
   - Fixed referral creation status

3. **`src/hooks/use-referrals.ts`**
   - Fixed referral creation status

4. **`src/components/PatientDetailView.tsx`**
   - Fixed TypeScript errors
   - Added missing Provider properties
   - Fixed component props

5. **`src/hooks/__tests__/status-mapping.test.ts`** (new)
   - Added comprehensive status mapping tests

## Status Flow

Now the status flow is consistent:

1. **Initial State**: Patient has `referral_status: 'needed'`
2. **Referral Created**: 
   - Referral created with `status: 'sent'`
   - Patient updated to `referral_status: 'sent'`
   - Dashboard shows "Referral Sent"
   - Detail view shows "Referral Sent"
3. **Appointment Scheduled**:
   - Referral updated to `status: 'scheduled'`
   - Patient updated to `referral_status: 'scheduled'`
   - Both views show "Scheduled"
4. **Care Completed**:
   - Referral updated to `status: 'completed'`
   - Patient updated to `referral_status: 'completed'`
   - Both views show "Completed"
5. **Referral Cancelled**:
   - Referral updated to `status: 'cancelled'`
   - Patient updated to `referral_status: 'needed'`
   - Both views show "Referral Needed"

## Testing

All tests pass:
- ✅ Optimistic updates tests
- ✅ Status mapping consistency tests
- ✅ Build verification

The fix ensures that users see consistent status information across all views, improving the user experience and reducing confusion.