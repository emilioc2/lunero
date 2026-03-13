# Frontend - Multi-Tenant E-Commerce Platform

This is the Next.js frontend for the multi-tenant e-commerce platform business dashboard.

## Features Implemented

### Task 15.1: Business Dashboard Pages

1. **Business Authentication**
   - Registration page with form validation (`/business/register`)
   - Login page with JWT authentication (`/business/login`)
   - Email verification support
   - Password visibility toggle
   - Error handling for duplicate emails and invalid credentials

2. **Store Management**
   - Store creation page (`/dashboard/stores/new`)
   - Store settings page (`/dashboard/stores/[id]`)
   - Logo upload with preview
   - Subdomain validation
   - Store information updates

3. **Product Management**
   - Product listing page (`/dashboard/stores/[id]/products`)
   - Product creation page (`/dashboard/stores/[id]/products/new`)
   - Product edit page (`/dashboard/stores/[id]/products/[productId]/edit`)
   - Image upload with preview (multiple images)
   - CRUD operations (Create, Read, Update, Delete)
   - Form validation for all fields
   - Stock status indicators

4. **Dashboard**
   - Main dashboard page (`/dashboard`)
   - Store overview
   - Navigation to store management

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Context** for authentication state

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

3. Update environment variables:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

4. Run development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## API Integration

All API calls are made through the following modules:

- `lib/api/business.ts` - Business authentication endpoints
- `lib/api/stores.ts` - Store management endpoints
- `lib/api/products.ts` - Product management endpoints

The API client (`lib/api.ts`) is configured with:
- Base URL from environment variables
- Automatic JSON content-type headers
- JWT token authentication via Authorization headers

## Authentication Flow

1. User registers or logs in via `/business/register` or `/business/login`
2. On successful authentication, JWT tokens are stored in localStorage
3. AuthContext provides authentication state throughout the app
4. Protected routes check authentication and redirect to login if needed
5. API calls include the access token in Authorization headers

## Form Validation

All forms include:
- Client-side validation before submission
- Real-time error display
- Server-side error handling
- Loading states during API calls
- Success messages after successful operations

## Image Upload

Image uploads support:
- Multiple file selection
- Preview before upload
- Format validation (JPEG, PNG, WebP)
- Size validation (max 5MB)
- Progress indicators

## Project Structure

```
frontend/
├── app/
│   ├── business/
│   │   ├── register/page.tsx
│   │   └── login/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── stores/
│   │       ├── new/page.tsx
│   │       └── [id]/
│   │           ├── page.tsx
│   │           └── products/
│   │               ├── page.tsx
│   │               ├── new/page.tsx
│   │               └── [productId]/edit/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── shared/
│       ├── Button.tsx
│       ├── Input.tsx
├── lib/
│   ├── api/
│   │   ├── business.ts
│   │   ├── stores.ts
│   │   └── products.ts
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── api.ts
│   └── stripe.ts
└── package.json
```

## Next Steps

To complete the full platform, implement:
- Customer-facing storefront pages
- Shopping cart functionality
- Checkout flow with Stripe integration
- Order management
- Product search
- Responsive mobile design improvements
