# Deployment Guide

This guide covers deploying the MarketHive multi-tenant e-commerce platform to production.

## Architecture

- **Backend**: Django REST Framework on Render
- **Database**: PostgreSQL on Neon
- **Frontend**: Next.js on Vercel
- **Storage**: AWS S3 for images
- **Payments**: Stripe

## Prerequisites

1. Accounts created on:
   - Render (https://render.com)
   - Neon (https://neon.tech)
   - Vercel (https://vercel.com)
   - AWS (https://aws.amazon.com)
   - Stripe (https://stripe.com)

2. Domain name (optional but recommended)

## Step 1: Set up PostgreSQL on Neon

1. Log in to Neon console
2. Create a new project: "markethive"
3. Create a database: "markethive"
4. Copy the connection string (starts with `postgresql://`)
5. Save for later use as `DATABASE_URL`

## Step 2: Set up AWS S3

1. Log in to AWS Console
2. Navigate to S3
3. Create a new bucket:
   - Name: `markethive-media` (must be globally unique)
   - Region: `us-west-2` (or your preferred region)
   - Block all public access: OFF (we need public read access for images)
4. Configure CORS:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```
5. Create IAM user for programmatic access:
   - Navigate to IAM > Users > Add User
   - User name: `markethive-s3-user`
   - Access type: Programmatic access
   - Attach policy: `AmazonS3FullAccess` (or create custom policy)
   - Save Access Key ID and Secret Access Key

## Step 3: Set up Stripe

1. Log in to Stripe Dashboard
2. Get API keys from Developers > API keys:
   - Publishable key (starts with `pk_`)
   - Secret key (starts with `sk_`)
3. Set up webhook:
   - Navigate to Developers > Webhooks
   - Add endpoint: `https://your-backend-url.onrender.com/api/v1/webhooks/stripe`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy webhook signing secret (starts with `whsec_`)

## Step 4: Deploy Backend to Render

1. Push code to GitHub repository
2. Log in to Render Dashboard
3. Click "New +" > "Web Service"
4. Connect your GitHub repository
5. Configure service:
   - Name: `markethive-backend`
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start Command: `gunicorn config.wsgi:application`
6. Add environment variables:
   ```
   SECRET_KEY=<generate-random-string>
   DEBUG=False
   ALLOWED_HOSTS=markethive-backend.onrender.com
   DATABASE_URL=<neon-connection-string>
   STRIPE_SECRET_KEY=<stripe-secret-key>
   STRIPE_PUBLISHABLE_KEY=<stripe-publishable-key>
   STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
   AWS_ACCESS_KEY_ID=<aws-access-key>
   AWS_SECRET_ACCESS_KEY=<aws-secret-key>
   AWS_STORAGE_BUCKET_NAME=markethive-media
   AWS_S3_REGION_NAME=us-west-2
   FRONTEND_URL=https://markethive.vercel.app
   DEFAULT_FROM_EMAIL=noreply@markethive.com
   ```
7. Click "Create Web Service"
8. Wait for deployment to complete
9. Test health endpoint: `https://markethive-backend.onrender.com/api/health/`

## Step 5: Deploy Frontend to Vercel

1. Push frontend code to GitHub repository
2. Log in to Vercel Dashboard
3. Click "Add New..." > "Project"
4. Import your GitHub repository
5. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
6. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://markethive-backend.onrender.com/api
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<stripe-publishable-key>
   ```
7. Click "Deploy"
8. Wait for deployment to complete
9. Test frontend: `https://markethive.vercel.app`

## Step 6: Configure Custom Domain (Optional)

### Backend (Render)
1. In Render Dashboard, go to your service
2. Navigate to "Settings" > "Custom Domain"
3. Add your domain: `api.yourdomain.com`
4. Add DNS records as instructed by Render

### Frontend (Vercel)
1. In Vercel Dashboard, go to your project
2. Navigate to "Settings" > "Domains"
3. Add your domain: `yourdomain.com`
4. Add DNS records as instructed by Vercel

## Step 7: Update Environment Variables

After setting up custom domains, update:

**Backend (Render)**:
```
ALLOWED_HOSTS=api.yourdomain.com,markethive-backend.onrender.com
FRONTEND_URL=https://yourdomain.com
```

**Frontend (Vercel)**:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

**Stripe Webhook**:
- Update webhook URL to: `https://api.yourdomain.com/api/v1/webhooks/stripe`

## Step 8: Enable HTTPS

Both Render and Vercel automatically provision SSL certificates and enforce HTTPS.

To ensure HTTPS-only:

**Backend**: Already configured in `settings.py`:
```python
SECURE_SSL_REDIRECT = not DEBUG
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
```

## Step 9: Set up Monitoring

### Render
- Built-in metrics available in dashboard
- Set up alerts for service health

### Sentry (Optional but Recommended)
1. Create account at https://sentry.io
2. Create new project for Django
3. Add to `requirements.txt`: `sentry-sdk`
4. Configure in `settings.py`:
   ```python
   import sentry_sdk
   sentry_sdk.init(
       dsn="your-sentry-dsn",
       environment="production"
   )
   ```
5. Add `SENTRY_DSN` to environment variables

## Step 10: Test Production Deployment

1. **Health Check**: Visit `https://api.yourdomain.com/api/health/`
2. **Business Registration**: Test creating a business account
3. **Email Verification**: Check email delivery
4. **Store Creation**: Create a test store
5. **Product Management**: Add products with images
6. **Customer Flow**: Register customer, add to cart, checkout
7. **Payment**: Test Stripe payment with test card `4242 4242 4242 4242`
8. **Order Management**: View orders, test cancellation

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Neon database is active
- Ensure IP whitelist includes Render IPs (usually not needed with Neon)

### S3 Upload Failures
- Verify AWS credentials are correct
- Check bucket permissions and CORS configuration
- Ensure bucket name matches `AWS_STORAGE_BUCKET_NAME`

### Stripe Webhook Not Working
- Verify webhook URL is correct
- Check webhook signing secret matches
- Test webhook with Stripe CLI: `stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`

### CORS Errors
- Verify `FRONTEND_URL` in backend matches actual frontend URL
- Check `CORS_ALLOWED_ORIGINS` in `settings.py`

## Maintenance

### Database Backups
- Neon provides automatic backups
- Configure backup retention in Neon dashboard

### Monitoring Logs
- View logs in Render Dashboard > Logs
- Set up log aggregation with external service if needed

### Scaling
- Upgrade Render plan for more resources
- Consider adding Redis for caching
- Implement CDN for static assets (CloudFront)

## Security Checklist

- [ ] `DEBUG=False` in production
- [ ] Strong `SECRET_KEY` generated
- [ ] HTTPS enforced
- [ ] Database credentials secured
- [ ] AWS credentials secured
- [ ] Stripe keys secured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Regular security updates applied

## Support

For issues or questions:
- Backend: Check Render logs
- Frontend: Check Vercel logs
- Database: Check Neon console
- Payments: Check Stripe dashboard
