# Patient Hooks Documentation

## usePatient Hook

The `usePatient` hook fetches a single patient by ID with comprehensive patient information display and graceful error handling.

### Usage

```typescript
import { usePatient } from '@/hooks/use-patients';

function PatientComponent({ patientId }: { patientId: string }) {
  const { data: patient, isLoading, error, isNotFound, refetch } = usePatient(patientId);

  if (isLoading) return <div>Loading...</div>;
  if (isNotFound) return <div>Patient not found</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!patient) return <div>No patient data</div>;

  return (
    <div>
      <h1>{patient.name}</h1>
      <p>Risk Score: {patient.leakageRisk.score}</p>
      <p>Age: {patient.age}</p>
      <p>Days Since Discharge: {patient.daysSinceDischarge}</p>
    </div>
  );
}
```

### Features

- **Comprehensive Data**: Returns enhanced patient data with computed fields (age, days since discharge, detailed risk factors)
- **Graceful Error Handling**: Distinguishes between "not found" errors and other database errors
- **Loading States**: Provides detailed loading and fetching states
- **Caching**: Implements intelligent caching with 5-minute stale time
- **Retry Logic**: Automatically retries failed requests (except for "not found" errors)
- **Type Safety**: Full TypeScript support with detailed return types

### Return Values

- `data`: Enhanced patient object or null/undefined
- `isLoading`: True when initially loading data
- `isFetching`: True when refetching data in background
- `isInitialLoading`: True only for the first load
- `error`: Error object if request failed
- `isNotFound`: True if patient was not found (convenience flag)
- `refetch`: Function to manually refetch the data

### Error Handling

The hook handles different error scenarios:

1. **Patient Not Found**: Returns `isNotFound: true` and a descriptive error message
2. **Database Errors**: Returns general error with the database error message
3. **Network Errors**: Automatically retries with exponential backoff
4. **Missing Patient ID**: Returns null data without making a request

### Requirements Satisfied

- **2.1**: Navigates to detailed patient view when patient ID is provided
- **2.2**: Displays comprehensive patient information including demographics, diagnosis, insurance, and location
- **2.4**: Clearly indicates missing information and handles incomplete data gracefully
- **5.4**: Provides appropriate error messages and recovery options

### Example with Error Handling

```typescript
import { usePatient } from '@/hooks/use-patients';

function PatientDetailPage({ patientId }: { patientId: string }) {
  const { 
    data: patient, 
    isLoading, 
    error, 
    isNotFound, 
    refetch 
  } = usePatient(patientId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isNotFound) {
    return (
      <div>
        <h1>Patient Not Found</h1>
        <p>Patient with ID {patientId} could not be found.</p>
        <button onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>Error Loading Patient</h1>
        <p>{error.message}</p>
        <button onClick={() => refetch()}>Try Again</button>
      </div>
    );
  }

  if (!patient) {
    return <div>No patient data available</div>;
  }

  return <PatientDetailView patient={patient} />;
}
```

## usePatients Hook

The `usePatients` hook fetches all patients sorted by leakage risk score.

### Usage

```typescript
import { usePatients } from '@/hooks/use-patients';

function PatientList() {
  const { data: patients, isLoading, error } = usePatients();

  if (isLoading) return <div>Loading patients...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {patients?.map(patient => (
        <div key={patient.id}>
          {patient.name} - Risk: {patient.leakageRisk.score}
        </div>
      ))}
    </div>
  );
}
```