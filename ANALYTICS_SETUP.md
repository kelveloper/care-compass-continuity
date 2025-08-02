# Analytics Configuration Guide

## Overview

The Healthcare Continuity MVP includes comprehensive analytics tracking to monitor user behavior, performance, and feature usage. The analytics system is designed with privacy in mind, suitable for healthcare applications.

## Analytics Providers

### 1. Vercel Analytics
- **Purpose**: Performance monitoring and basic page view tracking
- **Setup**: Automatically enabled via `@vercel/analytics` package
- **Privacy**: Fully compliant with privacy regulations
- **Data Collected**: Page views, performance metrics, geographic data (anonymized)

### 2. Google Analytics 4 (GA4)
- **Purpose**: Detailed user behavior tracking and custom events
- **Setup**: Requires `VITE_GA_MEASUREMENT_ID` environment variable
- **Privacy**: Configured with healthcare-appropriate privacy settings
- **Data Collected**: Custom events, user flows, feature usage (anonymized)

## Environment Variables

### Required for GA4
```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # Your GA4 Measurement ID
VITE_ENABLE_ANALYTICS=true           # Enable/disable analytics
VITE_ANALYTICS_DEBUG=false           # Debug mode for development
```

### Development Settings
```bash
# .env.development
VITE_ENABLE_ANALYTICS=false          # Disabled in development
VITE_ANALYTICS_DEBUG=true            # Enable debug logging
```

### Production Settings
```bash
# .env.production
VITE_ENABLE_ANALYTICS=true           # Enabled in production
VITE_ANALYTICS_DEBUG=false           # Disable debug logging
```

## Privacy Configuration

The analytics system is configured with healthcare-appropriate privacy settings:

```typescript
// Privacy-focused GA4 configuration
gtagOptions: {
  anonymize_ip: true,                    // Anonymize IP addresses
  allow_google_signals: false,           // Disable Google Signals
  allow_ad_personalization_signals: false, // Disable ad personalization
}
```

## Tracked Events

### Patient Management
- `patient_view`: When a patient detail is viewed
- `patient_search`: When patient search is performed
- `patient_filter`: When filters are applied to patient list

### Provider Matching
- `provider_search`: When provider matching is initiated
- `provider_match`: When providers are matched to a patient
- `provider_select`: When a provider is selected for referral

### Referral Management
- `referral_create`: When a referral is created
- `referral_update`: When a referral status is updated
- `referral_complete`: When a referral is completed

### Risk Assessment
- `risk_calculated`: When risk scores are calculated
- Risk levels tracked: `low`, `medium`, `high`

### User Flows
- `patient_selected`: Patient selection flow
- `provider_selected`: Provider selection flow
- `referral_sent`: Referral creation flow
- `referral_scheduled`: Referral scheduling flow
- `referral_completed`: Referral completion flow

### Performance Metrics
- Page load times
- API response times
- Component render times
- Database query performance

### Feature Usage
- `patient_search`: Search functionality usage
- `risk_filter`: Risk level filtering
- `status_filter`: Status filtering
- `provider_matching`: Provider matching feature
- `referral_management`: Referral management features

## Implementation Details

### Analytics Hooks

#### `useInteractionTracking()`
```typescript
const { trackPatientAction, trackProviderAction, trackReferralAction } = useInteractionTracking();

// Track patient interactions
trackPatientAction('view');
trackProviderAction('select');
trackReferralAction('create');
```

#### `useEngagementTracking()`
```typescript
const { trackFeatureUse, trackTimeOnPage } = useEngagementTracking();

// Track feature usage
trackFeatureUse('patient_search');

// Track time spent on page
const cleanup = trackTimeOnPage();
// Call cleanup() when component unmounts
```

#### `usePerformanceTracking()`
```typescript
const { trackLoadTime, trackApiCall } = usePerformanceTracking();

// Track component load time
const startTime = performance.now();
// ... component loading logic
trackLoadTime(startTime, 'dashboard');

// Track API call performance
const apiStartTime = performance.now();
// ... API call
trackApiCall(apiStartTime, 'patients', success);
```

### Error Tracking

```typescript
const { trackAppError, trackApiError } = useErrorTracking();

// Track application errors
try {
  // ... application logic
} catch (error) {
  trackAppError(error, 'dashboard');
}

// Track API errors
try {
  await apiCall();
} catch (error) {
  trackApiError(error, 'patients');
}
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install @vercel/analytics react-ga4
```

### 2. Configure Environment Variables
Add the required environment variables to your deployment platform:

**Vercel:**
```bash
vercel env add VITE_GA_MEASUREMENT_ID
vercel env add VITE_ENABLE_ANALYTICS
```

**Local Development:**
```bash
# Add to .env.development
VITE_ENABLE_ANALYTICS=false
VITE_ANALYTICS_DEBUG=true
```

### 3. Google Analytics Setup
1. Create a GA4 property in Google Analytics
2. Get your Measurement ID (format: G-XXXXXXXXXX)
3. Add the Measurement ID to your environment variables
4. Configure data retention and privacy settings in GA4

### 4. Verify Setup
1. Enable analytics in production environment
2. Check browser developer tools for analytics events
3. Verify events appear in GA4 Real-time reports
4. Monitor Vercel Analytics dashboard

## Data Retention and Privacy

### Data Minimization
- Only essential user interactions are tracked
- No personally identifiable information (PII) is collected
- Patient data is never sent to analytics providers
- All tracking is anonymized and aggregated

### Compliance
- HIPAA-compliant configuration
- IP address anonymization enabled
- No cross-site tracking
- User consent mechanisms can be added if required

### Data Retention
- Configure appropriate data retention periods in GA4
- Regularly review and purge old analytics data
- Implement data deletion procedures as needed

## Monitoring and Alerts

### Performance Monitoring
- Track page load times and API response times
- Monitor error rates and types
- Set up alerts for performance degradation

### Usage Analytics
- Monitor feature adoption rates
- Track user flow completion rates
- Identify areas for UX improvement

### Business Metrics
- Patient management efficiency
- Referral completion rates
- Provider matching success rates

## Troubleshooting

### Analytics Not Working
1. Check environment variables are set correctly
2. Verify GA4 Measurement ID format
3. Check browser console for errors
4. Ensure analytics are enabled in production

### Debug Mode
Enable debug mode in development:
```bash
VITE_ANALYTICS_DEBUG=true
```

This will log all analytics events to the browser console.

### Testing Analytics
Use GA4's Real-time reports to verify events are being tracked:
1. Open GA4 Real-time reports
2. Perform actions in the application
3. Verify events appear in real-time

## Best Practices

### Event Naming
- Use consistent naming conventions
- Include context in event names
- Group related events by category

### Performance
- Avoid tracking too many events
- Use debouncing for frequent events
- Batch events when possible

### Privacy
- Regular privacy audits
- Document all tracked data
- Implement user consent if required
- Provide opt-out mechanisms

## Future Enhancements

### Potential Additions
- A/B testing framework
- Custom dashboards
- Advanced user segmentation
- Predictive analytics
- Real-time alerting system

### Integration Opportunities
- EHR system analytics
- Provider feedback tracking
- Patient outcome correlation
- Cost-effectiveness analysis