# Deployment Guide

## Environment Variables Setup

### Required Environment Variables

The following environment variables are required for production deployment:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_APP_NAME` | Application name | `Healthcare Continuity MVP` |
| `VITE_APP_VERSION` | Application version | `1.0.0` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_ENABLE_DEBUG_PANEL` | Enable debug panel | `false` |
| `VITE_ENABLE_MOCK_DATA` | Use mock data instead of database | `false` |
| `VITE_ANALYTICS_ID` | Analytics tracking ID | - |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | - |

## Vercel Deployment

### 1. Environment Variables in Vercel

Set up the following environment variables in your Vercel project settings:

```bash
# Required
VITE_SUPABASE_URL=https://lnjxrvcukzxhmtvnhsia.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_NAME=Healthcare Continuity MVP
VITE_APP_VERSION=1.0.0

# Optional
VITE_ENABLE_DEBUG_PANEL=false
VITE_ENABLE_MOCK_DATA=false
```

### 2. Build Configuration

The project is configured to build automatically with:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### 3. Domain Configuration

Configure your custom domain in Vercel dashboard if needed.

## Other Deployment Platforms

### Netlify

1. Set environment variables in Netlify dashboard
2. Build command: `npm run build`
3. Publish directory: `dist`

### AWS Amplify

1. Connect your repository
2. Set environment variables in Amplify console
3. Build settings are automatically detected

## Local Development

### 1. Environment Setup

Copy the example environment file:
```bash
cp .env.example .env.local
```

Fill in your actual values in `.env.local`.

### 2. Development Server

```bash
npm install
npm run dev
```

## Production Build Testing

Test the production build locally:

```bash
npm run build
npm run preview
```

## Environment Validation

The application automatically validates required environment variables on startup. If any required variables are missing, the application will throw an error with details about what's missing.

## Security Notes

- Never commit `.env.local` or `.env.production.local` files
- Use Vercel's environment variable encryption for sensitive data
- Rotate Supabase keys regularly
- Enable Row Level Security (RLS) in Supabase for production

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**: Check that all required variables are set in your deployment platform
2. **Supabase Connection Issues**: Verify your Supabase URL and key are correct
3. **Build Failures**: Ensure all dependencies are properly installed

### Debug Mode

Enable debug mode in development by setting:
```
VITE_ENABLE_DEBUG_PANEL=true
```

This will show additional debugging information in the UI.