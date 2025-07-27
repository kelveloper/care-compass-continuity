# Dashboard Status Accuracy Fix

## Problem
The dashboard was showing patient status based on the `patients.referral_status` field, while the patient detail view was showing the accurate status from the actual `referrals.status` field. This caused inconsistencies where Margaret Thompson appeared as "Scheduled" in the dashboard but the timeline didn't reflect this status.

## Root Cause
- **Dashboard**: Used `patients.referral_status` field (potentially stale)
- **Patient Detail View**: Used `referrals.status` field (always accurate)

The `patients.referral_status` field could become out of sync with the actual referral record due to:
- Partial update failures
- Race conditions
- Manual database changes
- Legacy data inconsistencies

## Solution
Modified the dashboard to use the same accurate data source as the patient detail view by:

### 1. Updated Patient Data Query
Changed the patients hook to join with the referrals table:

```typescript
// Before: Only patient data
.from('patients')
.select('*')

// After: Patient data with referral status
.from('patients')
.select(`
  *,
  referrals!current_referral_id (
    id,
    status,
    scheduled_date,
    completed_date
  )
`)
```

### 2. Enhanced Data Processing
Updated the `enhancePatients` function to use actual referral status:

```typescript
// Use actual referral status if available, otherwise fall back to patient referral_status
let actualReferralStatus = dbPatient.referral_status;
if (row.referrals && row.referrals.status) {
  // Map referral status to patient status for consistency
  actualReferralStatus = mapReferralStatusToPatientStatus(row.referrals.status);
}

const patient: Patient = {
  ...dbPatient,
  referral_status: actualReferralStatus, // Use the actual referral status
  // ... other fields
};
```

### 3. Updated Real-time Subscriptions
Enhanced real-time updates to listen to both tables:

```typescript
// Before: Only patients table
.channel('patients-changes')
.on('postgres_changes', { table: 'patients' }, ...)

// After: Both patients and referrals tables
.channel('patients-and-referrals-changes')
.on('postgres_changes', { table: 'patients' }, ...)
.on('postgres_changes', { table: 'referrals' }, ...)
```

### 4. Status Mapping Consistency
Added the same status mapping function used in other parts of the app:

```typescript
const mapReferralStatusToPatientStatus = (referralStatus: string) => {
  switch (referralStatus) {
    case 'pending':
    case 'sent':
      return 'sent';
    case 'scheduled':
      return 'scheduled';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'needed';
    default:
      return 'needed';
  }
};
```

## Benefits

### ✅ **Accurate Status Display**
- Dashboard now shows the same status as patient detail view
- Status is always based on the actual referral record
- No more inconsistencies between views

### ✅ **Real-time Accuracy**
- Dashboard updates immediately when referral status changes
- Both patient and referral changes trigger updates
- Consistent experience across all views

### ✅ **Fallback Protection**
- If no referral exists, falls back to patient referral_status
- Graceful handling of edge cases
- Maintains backward compatibility

### ✅ **Performance Optimized**
- Single query joins both tables efficiently
- Debounced real-time updates prevent excessive refreshes
- Minimal additional overhead

## Files Modified

1. **`src/hooks/use-patients.ts`**
   - Updated main patients query to join with referrals table
   - Enhanced data processing to use actual referral status
   - Updated real-time subscriptions for both tables
   - Added status mapping function
   - Applied same changes to single patient hook

## Result

Now both the dashboard and patient detail view show identical, accurate status information:

- **Margaret Thompson**: Will show the correct status based on her actual referral record
- **All Patients**: Status consistency across all views
- **Real-time Updates**: Immediate status updates when referrals change
- **Data Integrity**: Single source of truth for referral status

The dashboard is now the authoritative source for accurate patient referral status, matching exactly what users see in the detailed patient view.