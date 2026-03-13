# Frontend Design - Multi-Tenant E-Commerce Platform

## Overview

The frontend consists of two distinct applications:
1. **Business Dashboard** - For businesses to manage their stores and products
2. **Customer Storefront** - For customers to browse and purchase products

Both are built with Next.js 14 (App Router), TypeScript, and Tailwind CSS.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │  Business Portal │      │ Customer Stores  │        │
│  │  /dashboard/*    │      │ /store/*         │        │
│  └──────────────────┘      └──────────────────┘        │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Shared Components & Utilities             │  │
│  │  - API Client  - Auth Context  - UI Components   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                  Django REST API Backend
```

## Design System

### Color Palette
- **Primary**: Indigo (#4F46E5) - CTAs, links, active states
- **Secondary**: Purple (#7C3AED) - Accents, highlights
- **Success**: Green (#10B981) - Success messages, available stock
- **Warning**: Amber (#F59E0B) - Warnings, low stock
- **Error**: Red (#EF4444) - Errors, out of stock
- **Neutral**: Gray scale (#F9FAFB to #111827)

### Typography
- **Headings**: Inter font family, bold weights
- **Body**: Inter font family, regular/medium weights
- **Code/Numbers**: JetBrains Mono for order numbers, prices

### Spacing
- Base unit: 4px (Tailwind's default)
- Container max-width: 1280px
- Section padding: 64px vertical, 16px horizontal (mobile)

## 1. Business Dashboard

### Authentication Pages

#### `/business/register`
```
┌─────────────────────────────────────────┐
│  [Logo]    Create Your Business Account │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Business Name                      │ │
│  │ [________________________]         │ │
│  │                                    │ │
│  │ Email                              │ │
│  │ [________________________]         │ │
│  │                                    │ │
│  │ Password                           │ │
│  │ [________________________] [👁]    │ │
│  │                                    │ │
│  │ Business Details (optional)        │ │
│  │ [________________________]         │ │
│  │ [________________________]         │ │
│  │                                    │ │
│  │ [Create Account →]                 │ │
│  │                                    │ │
│  │ Already have an account? Sign in   │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Features**:
- Real-time validation
- Password strength indicator
- Email format validation
- Loading states on submit
- Success message with email verification prompt

#### `/business/login`
```
┌─────────────────────────────────────────┐
│  [Logo]    Sign In to Your Dashboard    │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Email                              │ │
│  │ [________________________]         │ │
│  │                                    │ │
│  │ Password                           │ │
│  │ [________________________] [👁]    │ │
│  │                                    │ │
│  │ [☐] Remember me                    │ │
│  │                                    │ │
│  │ [Sign In →]                        │ │
│  │                                    │ │
│  │ Don't have an account? Register    │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Dashboard Layout

#### `/dashboard`
```
┌──────────────────────────────────────────────────────────┐
│ [Logo] Dashboard    [🔔] [👤 Business Name ▼]            │
├──────────────────────────────────────────────────────────┤
│ ┌────────┐                                               │
│ │ Stores │  Products  Orders  Analytics  Settings       │
│ └────────┘                                               │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  My Stores                              [+ Create Store] │
│                                                           │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ [Store Logo]    │  │ [Store Logo]    │              │
│  │                 │  │                 │              │
│  │ Store Name      │  │ Store Name      │              │
│  │ mystore.com     │  │ shop.com        │              │
│  │                 │  │                 │              │
│  │ 45 Products     │  │ 23 Products     │              │
│  │ 12 Orders       │  │ 8 Orders        │              │
│  │                 │  │                 │              │
│  │ [Manage →]      │  │ [Manage →]      │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Store Management

#### `/dashboard/stores/[id]`
```
┌──────────────────────────────────────────────────────────┐
│ ← Back to Dashboard                                       │
│                                                           │
│ Store Settings                                            │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ General  │ Branding │ Products │ Orders │ Analytics │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ Store Information                                         │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Store Name                                        │   │
│ │ [_______________________________]                 │   │
│ │                                                   │   │
│ │ Subdomain                                         │   │
│ │ [_______________].markethive.com                  │   │
│ │                                                   │   │
│ │ Description                                       │   │
│ │ [_______________________________]                 │   │
│ │ [_______________________________]                 │   │
│ │                                                   │   │
│ │ [Save Changes]                                    │   │
│ └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Product Management

#### `/dashboard/stores/[id]/products`
```
┌──────────────────────────────────────────────────────────┐
│ Products                    [🔍 Search] [+ Add Product]   │
│                                                           │
│ ┌──────────────────────────────────────────────────────┐│
│ │ [Image] │ Name        │ Price  │ Stock │ Actions    ││
│ ├──────────────────────────────────────────────────────┤│
│ │ [📷]    │ Product 1   │ $29.99 │ 45   │ [✏️] [🗑️] ││
│ │ [📷]    │ Product 2   │ $49.99 │ 12   │ [✏️] [🗑️] ││
│ │ [📷]    │ Product 3   │ $19.99 │ 0    │ [✏️] [🗑️] ││
│ └──────────────────────────────────────────────────────┘│
│                                                           │
│ Showing 1-10 of 45 products        [← 1 2 3 ... 5 →]    │
└──────────────────────────────────────────────────────────┘
```

#### `/dashboard/stores/[id]/products/new`
```
┌──────────────────────────────────────────────────────────┐
│ ← Back to Products                                        │
│                                                           │
│ Add New Product                                           │
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Product Images                                    │   │
│ │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                 │   │
│ │ │ [+] │ │     │ │     │ │     │                 │   │
│ │ │ Add │ │     │ │     │ │     │                 │   │
│ │ └─────┘ └─────┘ └─────┘ └─────┘                 │   │
│ │                                                   │   │
│ │ Product Name *                                    │   │
│ │ [_______________________________]                 │   │
│ │                                                   │   │
│ │ Description *                                     │   │
│ │ [_______________________________]                 │   │
│ │ [_______________________________]                 │   │
│ │ [_______________________________]                 │   │
│ │                                                   │   │
│ │ Price * │ Quantity * │ Category *                │   │
│ │ [$____] │ [_______]  │ [Electronics ▼]           │   │
│ │                                                   │   │
│ │ Weight (grams)                                    │   │
│ │ [_______]                                         │   │
│ │                                                   │   │
│ │ [Cancel] [Save Product]                           │   │
│ └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## 2. Customer Storefront

### Store Homepage

#### `/store/[subdomain]`
```
┌──────────────────────────────────────────────────────────┐
│ [Store Logo]  Store Name          [🔍] [🛒 3] [👤 Login] │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ [Hero Banner / Featured Products]                        │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Categories: [All] [Electronics] [Clothing] [Home]        │
│                                                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ [Image]  │ │ [Image]  │ │ [Image]  │ │ [Image]  │   │
│ │          │ │          │ │          │ │          │   │
│ │ Product  │ │ Product  │ │ Product  │ │ Product  │   │
│ │ $29.99   │ │ $49.99   │ │ $19.99   │ │ $39.99   │   │
│ │ ⭐⭐⭐⭐⭐  │ │ ⭐⭐⭐⭐    │ │ ⭐⭐⭐⭐⭐  │ │ ⭐⭐⭐⭐    │   │
│ │ [Add 🛒] │ │ [Add 🛒] │ │ [Add 🛒] │ │ [Add 🛒] │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                           │
│ [Load More Products]                                      │
│                                                           │
├──────────────────────────────────────────────────────────┤
│ Footer: About | Contact | Terms | Privacy                │
└──────────────────────────────────────────────────────────┘
```

### Product Detail Page

#### `/store/[subdomain]/products/[id]`
```
┌──────────────────────────────────────────────────────────┐
│ [Store Logo]  Store Name          [🔍] [🛒 3] [👤 Login] │
├──────────────────────────────────────────────────────────┤
│ ← Back to Store                                           │
│                                                           │
│ ┌─────────────────────┐  Product Name                    │
│ │                     │  ⭐⭐⭐⭐⭐ (24 reviews)            │
│ │   [Main Image]      │                                  │
│ │                     │  $29.99                          │
│ │                     │  ✓ In Stock (45 available)       │
│ └─────────────────────┘                                  │
│ [📷][📷][📷][📷]        Description:                      │
│                         Lorem ipsum dolor sit amet...     │
│                                                           │
│                         Category: Electronics             │
│                         Weight: 500g                      │
│                                                           │
│                         Quantity: [- 1 +]                 │
│                                                           │
│                         [Add to Cart 🛒]                  │
│                         [Buy Now →]                       │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Shopping Cart

#### `/store/[subdomain]/cart`
```
┌──────────────────────────────────────────────────────────┐
│ Shopping Cart (3 items)                                   │
│                                                           │
│ ┌──────────────────────────────────────────────────────┐│
│ │ [Image] Product 1                                    ││
│ │         $29.99                                       ││
│ │         Qty: [- 2 +]  [Remove]          $59.98      ││
│ ├──────────────────────────────────────────────────────┤│
│ │ [Image] Product 2                                    ││
│ │         $49.99                                       ││
│ │         Qty: [- 1 +]  [Remove]          $49.99      ││
│ └──────────────────────────────────────────────────────┘│
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Subtotal:                              $109.97    │   │
│ │ Shipping:                              $5.00      │   │
│ │ Tax:                                   $11.00     │   │
│ │ ─────────────────────────────────────────────────│   │
│ │ Total:                                 $125.97    │   │
│ │                                                   │   │
│ │ [Continue Shopping] [Proceed to Checkout →]      │   │
│ └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Checkout Flow

#### `/store/[subdomain]/checkout`
```
┌──────────────────────────────────────────────────────────┐
│ Checkout                                                  │
│                                                           │
│ [1. Shipping] → [2. Payment] → [3. Confirm]              │
│                                                           │
│ Shipping Address                                          │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Full Name                                         │   │
│ │ [_______________________________]                 │   │
│ │                                                   │   │
│ │ Address Line 1                                    │   │
│ │ [_______________________________]                 │   │
│ │                                                   │   │
│ │ City          │ State    │ ZIP Code              │   │
│ │ [___________] │ [_____]  │ [_______]             │   │
│ │                                                   │   │
│ │ [Continue to Payment →]                           │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ Order Summary                                             │
│ ┌───────────────────────────────────────────────────┐   │
│ │ 3 items                              $109.97      │   │
│ │ Shipping                             $5.00        │   │
│ │ Tax                                  $11.00       │   │
│ │ ─────────────────────────────────────────────────│   │
│ │ Total                                $125.97      │   │
│ └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

#### Payment Step (Stripe Elements)
```
┌──────────────────────────────────────────────────────────┐
│ [1. Shipping] → [2. Payment] → [3. Confirm]              │
│                                                           │
│ Payment Method                                            │
│ ┌───────────────────────────────────────────────────┐   │
│ │ [Stripe Card Element]                             │   │
│ │ Card Number                                       │   │
│ │ [____  ____  ____  ____]                          │   │
│ │                                                   │   │
│ │ Expiry        │ CVC                               │   │
│ │ [MM/YY]       │ [___]                             │   │
│ │                                                   │   │
│ │ [☐] Save card for future purchases                │   │
│ │                                                   │   │
│ │ [← Back] [Place Order - $125.97 →]               │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ 🔒 Secure payment powered by Stripe                      │
└──────────────────────────────────────────────────────────┘
```

### Order Confirmation

#### `/store/[subdomain]/orders/[id]/success`
```
┌──────────────────────────────────────────────────────────┐
│                                                           │
│                    ✓ Order Confirmed!                     │
│                                                           │
│              Thank you for your purchase                  │
│                                                           │
│ Order #ORD-ABC123DEF456                                   │
│ Confirmation email sent to customer@email.com            │
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Order Details                                     │   │
│ │                                                   │   │
│ │ Product 1 x2                         $59.98      │   │
│ │ Product 2 x1                         $49.99      │   │
│ │                                                   │   │
│ │ Subtotal:                            $109.97     │   │
│ │ Shipping:                            $5.00       │   │
│ │ Tax:                                 $11.00      │   │
│ │ Total:                               $125.97     │   │
│ │                                                   │   │
│ │ Shipping to:                                     │   │
│ │ John Doe                                         │   │
│ │ 123 Main St, Los Angeles, CA 90210              │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ [View Order Details] [Continue Shopping]                 │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Customer Account

#### `/account/orders`
```
┌──────────────────────────────────────────────────────────┐
│ My Account                                                │
│                                                           │
│ [Orders] Profile Settings                                 │
│                                                           │
│ Order History                                             │
│                                                           │
│ ┌──────────────────────────────────────────────────────┐│
│ │ Order #ORD-ABC123DEF456          Dec 15, 2024       ││
│ │ 3 items • $125.97 • ✓ Delivered                     ││
│ │ [View Details]                                       ││
│ ├──────────────────────────────────────────────────────┤│
│ │ Order #ORD-XYZ789GHI012          Dec 10, 2024       ││
│ │ 1 item • $49.99 • 📦 Shipped                        ││
│ │ [Track Order] [Cancel Order]                         ││
│ ├──────────────────────────────────────────────────────┤│
│ │ Order #ORD-LMN456OPQ789          Dec 5, 2024        ││
│ │ 2 items • $79.98 • ⏳ Processing                    ││
│ │ [View Details] [Cancel Order]                        ││
│ └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

## Key Features & Interactions

### 1. Real-time Search
- Debounced search input (300ms)
- Search as you type
- Highlight matching terms
- Show recent searches

### 2. Image Upload
- Drag & drop support
- Multiple image selection
- Image preview before upload
- Progress indicators
- Automatic resizing on backend

### 3. Cart Management
- Add to cart animation
- Cart badge with item count
- Persistent cart (localStorage for guests)
- Cart sync on login
- Stock validation

### 4. Responsive Design
- Mobile-first approach
- Breakpoints: 640px, 768px, 1024px, 1280px
- Touch-friendly buttons (min 44x44px)
- Collapsible navigation on mobile

### 5. Loading States
- Skeleton screens for content
- Spinner for actions
- Optimistic UI updates
- Error boundaries

### 6. Notifications
- Toast notifications (success, error, info)
- Position: top-right
- Auto-dismiss after 5 seconds
- Action buttons for undo

## Technology Stack

### Core
- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **React 18** (Server Components where possible)

### Styling
- **Tailwind CSS** (utility-first)
- **Headless UI** (accessible components)
- **Heroicons** (icon library)

### State Management
- **React Context** (auth, cart)
- **SWR** or **TanStack Query** (server state)
- **Zustand** (client state if needed)

### Forms
- **React Hook Form** (form management)
- **Zod** (validation schemas)

### Payments
- **@stripe/stripe-js** (Stripe integration)
- **@stripe/react-stripe-js** (React components)

### API Client
- **Axios** (HTTP client)
- Interceptors for auth tokens
- Request/response transformers

## File Structure

```
frontend/
├── app/
│   ├── (business)/
│   │   ├── business/
│   │   │   ├── register/page.tsx
│   │   │   └── login/page.tsx
│   │   └── dashboard/
│   │       ├── page.tsx
│   │       └── stores/
│   │           └── [id]/
│   │               ├── page.tsx
│   │               └── products/
│   │                   ├── page.tsx
│   │                   └── new/page.tsx
│   ├── (customer)/
│   │   ├── store/
│   │   │   └── [subdomain]/
│   │   │       ├── page.tsx
│   │   │       ├── products/[id]/page.tsx
│   │   │       ├── cart/page.tsx
│   │   │       └── checkout/page.tsx
│   │   └── account/
│   │       ├── orders/page.tsx
│   │       └── profile/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── business/
│   │   ├── StoreCard.tsx
│   │   ├── ProductForm.tsx
│   │   └── OrderTable.tsx
│   ├── customer/
│   │   ├── ProductCard.tsx
│   │   ├── CartItem.tsx
│   │   └── CheckoutForm.tsx
│   ├── shared/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Toast.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Sidebar.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── business.ts
│   │   ├── products.ts
│   │   ├── cart.ts
│   │   └── orders.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   └── useProducts.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── CartContext.tsx
│   └── utils/
│       ├── format.ts
│       └── validation.ts
├── public/
│   ├── images/
│   └── icons/
└── styles/
    └── globals.css
```

This design provides a modern, user-friendly interface that matches the robust backend we've built. Would you like me to start implementing any specific part of the frontend?