# Multi-Tenant E-Commerce Platform - Deployment Checklist

This checklist guides you through deploying the platform to production step-by-step.

## Pre-Deployment Checklist

### 1. Account Setup
- [ ] Create Render account (https://render.com)
- [ ] Create Neon account (https://neon.tech) 
- [ ] Create Vercel account (https://vercel.com)
- [ ] Create AWS account (https://aws.amazon.com)
- [ ] Create Stripe account (https://stripe.com)
- [ ] (Optional) Purchase domain name

### 2. Code Repository
- [ ] Push backend code to GitHub repository
- [ ] Push frontend code to GitHub repository (or same repo with monorepo structure)
- [ ] Ensure `.gitignore` excludes sensitive files (`.env`, `venv/`, `node_modules/`)

### 3. Local Testing
- [ ] Backend tests pass: `cd backend && pytest`
- [ ] Frontend builds successfully: `cd frontend && npm run build`
- [ ] Environment variables documented in `.env.example`

---

## Phase 1: Database Setup (Neon PostgreSQL)

### Steps:
1. [ ] Log in to Neon Console (https://console.neon.tech)
2. [ ] Click "Create Project"
3. [ ] Project settings:
   - Name: `markethive-production`
   - Region: Choose closest to your users (e.g., `US East (Ohio)`)
   - PostgreSQL version: 15 or latest
4. [ ] Click "Create Project"
5. [ ] Copy connection string from dashboard
   - Format: `postgresql://user:password@host/dbname?sslmode=require`
6. [ ] Save as `DATABASE_URL` for later

### Verification:
```bash
# Test connection locally
psql "postgresql://user:password@host/dbname?sslmode=require"
```

---

## Phase 2: AWS S3 Setup

### Steps:
1. [ ] Log in to AWS Console (https://console.aws.amazon.com)
2. [ ] Navigate to S3 service
3. [ ] Click "Create bucket"
4. [ ] Bucket configuration:
   - Bucket name: `markethive-media-prod` (must be globally unique)
   - Region: `us-west-2` (or match your backend region)
   - **Uncheck** "Block all public access"
   - Acknowledge public access warning
5. [ ] Click "Create bucket"

### Configure CORS:
1. [ ] Select your bucket
2. [ ] Go to "Permissions" tab
3. [ ] Scroll to "Cross-origin resource sharing (CORS)"
4. [ ] Click "Edit" and paste:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```
5. [ ] Click "Save changes"

### Create IAM User:
1. [ ] Navigate to IAM service
2. [ ] Click "Users" > "Add users"
3. [ ] User name: `markethive-s3-access`
4. [ ] Select "Access key - Programmatic access"
5. [ ] Click "Next: Permissions"
6. [ ] Click "Attach existing policies directly"
7. [ ] Search and select `AmazonS3FullAccess` (or create custom policy)
8. [ ] Click through to "Create user"
9. [ ] **IMPORTANT**: Download CSV with credentials or copy:
   - Access key ID
   - Secret access key
10. [ ] Save these as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

### Verification:
```bash
# Test upload (requires AWS CLI)
aws s3 cp test.txt s3://markethive-media-prod/test.txt
aws s3 ls s3://markethive-media-prod/
```

---

## Phase 3: Stripe Setup

### Steps:
1. [ ] Log in to Stripe Dashboard (https://dashboard.stripe.com)
2. [ ] Switch to "Test mode" (toggle in top right)
3. [ ] Navigate to "Developers" > "API keys"
4. [ ] Copy keys:
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`) - Click "Reveal test key"
5. [ ] Save as `STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`

### Configure Webhook (after backend deployment):
1. [ ] Navigate to "Developers" > "Webhooks"
2. [ ] Click "Add endpoint"
3. [ ] Endpoint URL: `https://your-backend-url.onrender.com/api/v1/webhooks/stripe`
4. [ ] Select events to listen to:
   - [x] `payment_intent.succeeded`
   - [x] `payment_intent.payment_failed`
5. [ ] Click "Add endpoint"
6. [ ] Click on the webhook to view details
7. [ ] Copy "Signing secret" (starts with `whsec_`)
8. [ ] Save as `STRIPE_WEBHOOK_SECRET`

### Verification:
```bash
# Test with Stripe CLI
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
```

---

## Phase 4: Backend Deployment (Render)

### Steps:
1. [ ] Log in to Render Dashboard (https://dashboard.render.com)
2. [ ] Click "New +" > "Web Service"
3. [ ] Connect GitHub repository
4. [ ] Service configuration:
   - Name: `markethive-backend`
   - Region: `Oregon (US West)` (or closest to users)
   - Branch: `main`
   - Root Directory: `backend` (if monorepo)
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start Command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
5. [ ] Plan: Select appropriate plan (Starter or higher)

### Environment Variables:
Click "Advanced" > "Add Environment Variable" for each:

```bash
# Django Core
SECRET_KEY=<generate-with-python-secrets>  # Generate: python -c "import secrets; print(secrets.token_urlsafe(50))"
DEBUG=False
ALLOWED_HOSTS=markethive-backend.onrender.com
PYTHON_VERSION=3.11.0

# Database
DATABASE_URL=<neon-connection-string>

# Stripe
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_PUBLISHABLE_KEY=<stripe-publishable-key>
STRIPE_WEBHOOK_SECRET=<leave-empty-for-now>

# AWS S3
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
AWS_STORAGE_BUCKET_NAME=markethive-media-prod
AWS_S3_REGION_NAME=us-west-2

# Email (SendGrid example)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=<sendgrid-api-key>
DEFAULT_FROM_EMAIL=noreply@markethive.com

# CORS & Frontend
FRONTEND_URL=https://markethive.vercel.app
CORS_ALLOWED_ORIGINS=https://markethive.vercel.app

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

6. [ ] Click "Create Web Service"
7. [ ] Wait for deployment (5-10 minutes)
8. [ ] Note the URL: `https://markethive-backend.onrender.com`

### Post-Deployment:
1. [ ] Update Stripe webhook URL with actual backend URL
2. [ ] Add `STRIPE_WEBHOOK_SECRET` to Render environment variables
3. [ ] Trigger manual deploy to apply changes

### Verification:
```bash
# Test health endpoint
curl https://markethive-backend.onrender.com/api/health/

# Expected response: {"status":"ok"}
```

---

## Phase 5: Frontend Deployment (Vercel)

### Steps:
1. [ ] Log in to Vercel Dashboard (https://vercel.com)
2. [ ] Click "Add New..." > "Project"
3. [ ] Import GitHub repository
4. [ ] Project configuration:
   - Framework Preset: `Next.js`
   - Root Directory: `frontend` (if monorepo)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
5. [ ] Environment Variables:
```bash
NEXT_PUBLIC_API_URL=https://markethive-backend.onrender.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<stripe-publishable-key>
```
6. [ ] Click "Deploy"
7. [ ] Wait for deployment (2-5 minutes)
8. [ ] Note the URL: `https://markethive.vercel.app`

### Post-Deployment:
1. [ ] Update backend `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` with actual Vercel URL
2. [ ] Redeploy backend on Render

### Verification:
```bash
# Visit frontend
open https://markethive.vercel.app

# Check API connection in browser console
```

---

## Phase 6: Email Service Setup (SendGrid)

### Steps:
1. [ ] Create SendGrid account (https://sendgrid.com)
2. [ ] Verify sender email address
3. [ ] Create API key:
   - Navigate to "Settings" > "API Keys"
   - Click "Create API Key"
   - Name: `markethive-production`
   - Permissions: `Full Access` or `Mail Send`
   - Copy API key
4. [ ] Add to Render environment variables:
```bash
EMAIL_HOST_PASSWORD=<sendgrid-api-key>
```
5. [ ] Redeploy backend

### Verification:
```bash
# Test email sending from Django shell
python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Test message', 'noreply@markethive.com', ['your@email.com'])
```

---

## Phase 7: Custom Domain Setup (Optional)

### Backend Domain (api.yourdomain.com):
1. [ ] In Render Dashboard, go to your service
2. [ ] Navigate to "Settings" > "Custom Domain"
3. [ ] Click "Add Custom Domain"
4. [ ] Enter: `api.yourdomain.com`
5. [ ] Add DNS records to your domain provider:
   - Type: `CNAME`
   - Name: `api`
   - Value: `markethive-backend.onrender.com`
6. [ ] Wait for DNS propagation (5-60 minutes)
7. [ ] Render will auto-provision SSL certificate

### Frontend Domain (yourdomain.com):
1. [ ] In Vercel Dashboard, go to your project
2. [ ] Navigate to "Settings" > "Domains"
3. [ ] Click "Add"
4. [ ] Enter: `yourdomain.com` and `www.yourdomain.com`
5. [ ] Add DNS records to your domain provider:
   - Type: `A`
   - Name: `@`
   - Value: `76.76.21.21` (Vercel IP)
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`
6. [ ] Wait for DNS propagation
7. [ ] Vercel will auto-provision SSL certificate

### Update Environment Variables:
**Backend (Render)**:
```bash
ALLOWED_HOSTS=api.yourdomain.com,markethive-backend.onrender.com
FRONTEND_URL=https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Frontend (Vercel)**:
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

**Stripe**:
- Update webhook URL to: `https://api.yourdomain.com/api/v1/webhooks/stripe`

---

## Phase 8: Production Testing

### Backend Tests:
- [ ] Health check: `curl https://your-backend-url/api/health/`
- [ ] API documentation: `https://your-backend-url/api/docs/` (if enabled)
- [ ] Admin panel: `https://your-backend-url/admin/` (create superuser first)

### End-to-End Tests:
1. [ ] **Business Registration**
   - Register new business account
   - Verify email received
   - Confirm email verification link works
   
2. [ ] **Store Creation**
   - Log in as business
   - Create new store
   - Upload store logo
   - Verify logo displays correctly

3. [ ] **Product Management**
   - Add product with images
   - Verify images upload to S3
   - Edit product details
   - Delete product

4. [ ] **Customer Registration**
   - Register customer account
   - Verify email received
   - Log in as customer

5. [ ] **Shopping Flow**
   - Browse products
   - Search products
   - Filter by category
   - Add items to cart
   - Update cart quantities
   - Remove items from cart

6. [ ] **Checkout Flow**
   - Proceed to checkout
   - Enter shipping address
   - Review order
   - Complete payment with test card: `4242 4242 4242 4242`
   - Verify order confirmation email
   - Check order appears in order history

7. [ ] **Order Management**
   - View order details
   - Cancel order (if eligible)
   - Verify refund initiated
   - Check cancellation email

### Performance Tests:
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Image loading optimized
- [ ] Mobile responsiveness

---

## Phase 9: Monitoring & Maintenance

### Set Up Monitoring:
1. [ ] **Render Monitoring**
   - Enable email alerts for service health
   - Monitor CPU/memory usage
   - Set up log retention

2. [ ] **Sentry (Optional)**
   - Create Sentry account
   - Add Sentry SDK to backend
   - Configure error tracking
   - Set up alerts

3. [ ] **Uptime Monitoring**
   - Use UptimeRobot or similar
   - Monitor health endpoint
   - Set up alerts for downtime

### Database Backups:
- [ ] Verify Neon automatic backups enabled
- [ ] Configure backup retention period
- [ ] Test backup restoration process

### Security Checklist:
- [ ] `DEBUG=False` in production
- [ ] Strong `SECRET_KEY` generated
- [ ] HTTPS enforced on all endpoints
- [ ] Database credentials secured
- [ ] AWS credentials secured
- [ ] Stripe keys secured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured

---

## Phase 10: Go Live!

### Final Checks:
- [ ] All tests passing
- [ ] All environment variables set
- [ ] SSL certificates active
- [ ] Monitoring configured
- [ ] Backups enabled
- [ ] Documentation updated

### Launch:
1. [ ] Announce to stakeholders
2. [ ] Monitor logs for first 24 hours
3. [ ] Be ready for quick fixes
4. [ ] Collect user feedback

### Post-Launch:
- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Review user feedback
- [ ] Plan improvements

---

## Troubleshooting

### Common Issues:

**Database Connection Failed**
```bash
# Check DATABASE_URL format
# Ensure Neon database is active
# Verify SSL mode: ?sslmode=require
```

**S3 Upload Failed**
```bash
# Verify AWS credentials
# Check bucket permissions
# Confirm CORS configuration
# Test with AWS CLI
```

**Stripe Webhook Not Working**
```bash
# Verify webhook URL is correct
# Check signing secret matches
# Test with Stripe CLI
# Review Stripe dashboard logs
```

**CORS Errors**
```bash
# Verify FRONTEND_URL matches actual URL
# Check CORS_ALLOWED_ORIGINS includes frontend
# Ensure no trailing slashes
```

**Email Not Sending**
```bash
# Verify SendGrid API key
# Check sender email is verified
# Review SendGrid activity logs
# Test with Django shell
```

---

## Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Stripe Docs**: https://stripe.com/docs
- **AWS S3 Docs**: https://docs.aws.amazon.com/s3/

---

## Rollback Plan

If deployment fails:

1. **Backend**: Render keeps previous deployments
   - Go to service > "Manual Deploy" > Select previous commit
   
2. **Frontend**: Vercel keeps deployment history
   - Go to project > "Deployments" > Promote previous deployment

3. **Database**: Restore from Neon backup
   - Go to Neon console > Backups > Restore

4. **Notify users** of temporary issues

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Production URL**: _______________
**Status**: _______________
