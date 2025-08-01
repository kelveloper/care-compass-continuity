# Deployment Guide - Healthcare Continuity MVP

## Overview

This guide covers the deployment process for the Healthcare Continuity MVP to Vercel with proper environment variable configuration.

## Prerequisites

1. **Vercel Account**: Ensure you have a Vercel account
2. **Vercel CLI**: Install globally with `npm i -g vercel`
3. **Environment Variables**: Properly configured in `vercel.json`

## Environment Configuration

### Production Environment Variables

The following environment variables are configured for production deployment:

```bash
NODE_ENV=production
VITE_SUPABASE_URL=https://lnjxrvcukzxhmtvnhsia.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_NAME=Healthcare Continuity MVP
VITE_APP_VERSION=1.0.0
VITE_ENABLE_DEBUG_PANEL=false
VITE_ENABLE_MOCK_DATA=false
```

### Vercel Configuration

The `vercel.json` file is configured with:

- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Embedded in configuration
- **Rewrites**: SPA routing support

## Deployment Steps

### Method 1: Using Deployment Script

1. **Run the deployment preparation script**:

   ```bash
   npm run deploy
   ```

2. **Deploy to Vercel**:
   ```bash
   npm run deploy:vercel
   ```

### Method 2: Manual Deployment

1. **Build the project**:

   ```bash
   npm run build:prod
   ```

2. **Login to Vercel** (if not already logged in):

   ```bash
   vercel login
   ```

3. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Method 3: GitHub Integration

1. **Push to GitHub**: Ensure your code is pushed to a GitHub repository
2. **Connect to Vercel**: Import your repository in the Vercel dashboard
3. **Configure Environment Variables**: Set them in the Vercel dashboard
4. **Deploy**: Vercel will automatically deploy on push to main branch

## Verification Steps

After deployment, verify the following:

### 1. Application Loads

- [ ] Application loads without errors
- [ ] Dashboard displays patient data
- [ ] Navigation works correctly

### 2. Database Connection

- [ ] Patient data loads from Supabase
- [ ] Provider matching works
- [ ] Risk calculations display correctly

### 3. Environment Variables

- [ ] Supabase connection established
- [ ] Debug panel is disabled
- [ ] Mock data is disabled
- [ ] Application name displays correctly

### 4. Performance

- [ ] Initial load time < 3 seconds
- [ ] Navigation is responsive
- [ ] Database queries perform well

## Troubleshooting

### Common Issues

1. **Build Failures**

   - Check for TypeScript errors
   - Verify all dependencies are installed
   - Ensure environment variables are set

2. **Database Connection Issues**

   - Verify Supabase URL and key
   - Check RLS policies are configured
   - Ensure database is accessible

3. **Environment Variable Issues**
   - Verify variables are prefixed with `VITE_`
   - Check vercel.json configuration
   - Ensure production values are correct

### Debug Commands

```bash
# Test build locally
npm run build:prod

# Preview production build
npm run preview

# Verify environment variables
npm run verify-env

# Check Vercel deployment logs
vercel logs [deployment-url]
```

## Post-Deployment

### 1. Domain Configuration

- Configure custom domain in Vercel dashboard (optional)
- Set up SSL certificate (automatic with Vercel)

### 2. Monitoring

- Set up error tracking (Sentry integration available)
- Configure analytics (Google Analytics integration available)
- Monitor performance metrics

### 3. Backup and Recovery

- Database backups are handled by Supabase
- Code is version controlled in Git
- Vercel maintains deployment history

## Security Considerations

1. **Environment Variables**: Sensitive data is properly configured
2. **HTTPS**: Enforced by Vercel
3. **Database Security**: RLS policies are enabled
4. **API Keys**: Anon key is used (read-only access)

## Performance Optimization

1. **Bundle Size**: Monitor and optimize large chunks
2. **Caching**: Vercel provides automatic caching
3. **CDN**: Global distribution via Vercel Edge Network
4. **Database**: Indexes are configured for optimal performance

## Maintenance

### Regular Tasks

- Monitor deployment logs
- Update dependencies regularly
- Review performance metrics
- Update environment variables as needed

### Emergency Procedures

- Rollback: Use Vercel dashboard to rollback to previous deployment
- Hotfix: Deploy directly from local environment
- Database Issues: Contact Supabase support or use backup

## Support

For deployment issues:

1. Check Vercel documentation
2. Review deployment logs
3. Verify environment configuration
4. Test locally first

---

**Last Updated**: January 2025
**Version**: 1.0.0
