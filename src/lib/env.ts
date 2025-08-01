/**
 * Environment Configuration
 * Centralized environment variable management with validation
 */

interface EnvironmentConfig {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  
  // Application
  appName: string;
  appVersion: string;
  nodeEnv: string;
  
  // Feature Flags
  enableDebugPanel: boolean;
  enableMockData: boolean;
  
  // Optional Services
  analyticsId?: string;
  sentryDsn?: string;
}

/**
 * Get environment variable with validation
 */
function getEnvVar(key: string, required = true): string {
  const value = import.meta.env[key];
  
  if (required && (!value || value.trim() === '')) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value || '';
}

/**
 * Get boolean environment variable
 */
function getBooleanEnvVar(key: string, defaultValue = false): boolean {
  const value = import.meta.env[key];
  
  if (!value) return defaultValue;
  
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Validate and export environment configuration
 */
export const env: EnvironmentConfig = {
  // Required Supabase configuration
  supabaseUrl: getEnvVar('VITE_SUPABASE_URL'),
  supabaseAnonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  
  // Application configuration
  appName: getEnvVar('VITE_APP_NAME', false) || 'Healthcare Continuity MVP',
  appVersion: getEnvVar('VITE_APP_VERSION', false) || '1.0.0',
  nodeEnv: import.meta.env.MODE || 'development',
  
  // Feature flags
  enableDebugPanel: getBooleanEnvVar('VITE_ENABLE_DEBUG_PANEL', import.meta.env.MODE === 'development'),
  enableMockData: getBooleanEnvVar('VITE_ENABLE_MOCK_DATA', false),
  
  // Optional services
  analyticsId: getEnvVar('VITE_ANALYTICS_ID', false),
  sentryDsn: getEnvVar('VITE_SENTRY_DSN', false),
};

/**
 * Check if running in development mode
 */
export const isDevelopment = env.nodeEnv === 'development';

/**
 * Check if running in production mode
 */
export const isProduction = env.nodeEnv === 'production';

/**
 * Validate environment configuration on startup
 */
export function validateEnvironment(): void {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => {
    const value = import.meta.env[varName];
    return !value || value.trim() === '';
  });
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
  
  console.log(`✅ Environment validated for ${env.nodeEnv} mode`);
}

// Validate environment on module load
validateEnvironment();