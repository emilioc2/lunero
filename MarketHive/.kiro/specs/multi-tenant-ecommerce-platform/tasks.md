# Implementation Plan: Multi-Tenant E-Commerce Platform

## Overview

This implementation plan breaks down the multi-tenant e-commerce platform into discrete coding tasks. The platform enables businesses to create isolated product stores while allowing customers to browse, search, and purchase products with integrated Stripe payments.

**Tech Stack**: Next.js (TypeScript) frontend on Vercel, Django REST Framework backend on Render, PostgreSQL on Neon, AWS S3 for images, Stripe for payments.

**Architecture**: Multi-tenant with shared database, tenant isolation via middleware, JWT authentication, RESTful API design.

## Tasks

- [x] 1. Set up project infrastructure and core configuration
  - Initialize Django project with PostgreSQL database connection to Neon
  - Configure Django REST Framework with JWT authentication
  - Set up AWS S3 integration for image storage
  - Configure Stripe API integration with test mode
  - Set up CORS for Next.js frontend communication
  - Create base Django middleware for tenant context
  - Configure environment variables for all services
  - _Requirements: 20.2, 18.1_

- [x] 2. Implement database models and migrations
  - [x] 2.1 Create Business and Store models with relationships
    - Implement Business model with email, password_hash, business_name, email_verified fields
    - Implement Store model with business foreign key, subdomain, name, description, branding fields
    - Add database indexes on email, subdomain, and tenant identifiers
    - Create Django migrations
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 4.1_

  - [ ]* 2.2 Write property test for Business registration
    - **Property 1: Business Registration Creates Account**
    - **Validates: Requirements 1.2**

  - [x] 2.3 Create Product and ProductImage models
    - Implement Product model with store foreign key, name, description, price, quantity, category
    - Implement ProductImage model with product foreign key, S3 URLs for multiple sizes
    - Add validation for positive prices and non-negative quantities
    - Add database indexes on store_id, category, and name
    - Create Django migrations
    - _Requirements: 5.1, 5.2, 5.3, 18.1_

  - [ ]* 2.4 Write property tests for Product validation
    - **Property 18: Product Price Validation**
    - **Property 19: Product Quantity Validation**
    - **Validates: Requirements 5.5, 5.6**

  - [x] 2.5 Create Customer and ShippingAddress models
    - Implement Customer model with email, password_hash, name, email_verified fields
    - Implement ShippingAddress model with customer foreign key and address fields
    - Add database indexes on customer email
    - Create Django migrations
    - _Requirements: 8.1, 8.2, 13.3_

  - [x] 2.6 Create Cart and CartItem models
    - Implement Cart model with customer foreign key (nullable), session_id, store foreign key, expires_at
    - Implement CartItem model with cart foreign key, product foreign key, quantity, price_at_addition
    - Add database indexes on session_id and customer_id
    - Create Django migrations
    - _Requirements: 12.1, 12.8, 12.9_

  - [x] 2.7 Create Order, OrderItem, Payment, and Refund models
    - Implement Order model with customer, store, status, pricing fields, shipping_address JSON, stripe_payment_intent_id
    - Implement OrderItem model with order foreign key and product_snapshot JSON
    - Implement Payment model with order foreign key and Stripe fields
    - Implement Refund model with payment foreign key and Stripe refund fields
    - Add database indexes on customer_id, created_at, and order status
    - Create Django migrations
    - _Requirements: 14.5, 15.1, 15.2, 16.1_

  - [x] 2.8 Create ProductSearchIndex model for search functionality
    - Implement ProductSearchIndex model with product foreign key, store foreign key, search_vector, name_lower, category_lower
    - Add database indexes for full-text search
    - Create Django migrations
    - _Requirements: 10.1, 10.2_

- [x] 3. Implement business authentication and onboarding
  - [x] 3.1 Create business registration endpoint
    - Implement OnboardingService.register_business() with email uniqueness validation
    - Hash passwords using bcrypt with work factor 12
    - Create POST /api/v1/business/register endpoint
    - Return 409 for duplicate emails
    - _Requirements: 1.1, 1.2, 1.3, 20.1_

  - [ ]* 3.2 Write property tests for business registration
    - **Property 2: Duplicate Business Email Rejection**
    - **Property 58: Passwords Hashed with Bcrypt**
    - **Validates: Requirements 1.3, 20.1**

  - [x] 3.3 Implement email verification system
    - Implement OnboardingService.send_verification_email() using email service
    - Generate unique verification tokens
    - Create POST /api/v1/business/verify-email endpoint
    - Update email_verified flag on successful verification
    - _Requirements: 1.4, 1.5_

  - [ ]* 3.4 Write property test for email verification
    - **Property 3: Business Verification Email Sent**
    - **Property 4: Unverified Business Cannot Create Stores**
    - **Validates: Requirements 1.4, 1.5**

  - [x] 3.5 Create business authentication endpoints
    - Implement POST /api/v1/business/login with credential validation
    - Generate JWT tokens with business_id claim and 24-hour expiration
    - Return 401 for invalid credentials
    - Implement token refresh endpoint
    - Log all authentication attempts with IP address
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 20.7_

  - [ ]* 3.6 Write property tests for business authentication
    - **Property 5: Valid Business Credentials Authenticate**
    - **Property 6: Invalid Business Credentials Rejected**
    - **Property 7: Business Session Token Valid for 24 Hours**
    - **Property 8: Expired Business Session Rejected**
    - **Property 63: Authentication Attempts Logged**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 20.7**

- [x] 4. Implement store management functionality
  - [x] 4.1 Create store creation endpoint
    - Implement StoreManagementService.create_store() with subdomain uniqueness validation
    - Require email_verified=true for business
    - Create POST /api/v1/stores endpoint with JWT authentication
    - Generate unique store identifiers
    - Return 409 for duplicate subdomains
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.2 Write property tests for store creation
    - **Property 9: Valid Store Data Creates Store**
    - **Property 10: Duplicate Subdomain Rejection**
    - **Property 11: Store IDs Are Unique**
    - **Validates: Requirements 3.3, 3.4, 3.5**

  - [x] 4.3 Implement subdomain routing and store access
    - Create middleware to parse subdomain from request
    - Resolve store_id from subdomain and inject into request context
    - Create GET /api/v1/stores/:subdomain endpoint for public store access
    - _Requirements: 3.6_

  - [ ]* 4.4 Write property test for subdomain access
    - **Property 12: Created Store Accessible via Subdomain**
    - **Validates: Requirements 3.6**

  - [x] 4.5 Create store configuration endpoints
    - Implement StoreManagementService.update_store() with ownership validation
    - Create PUT /api/v1/stores/:id endpoint for updating name, description, color_scheme, theme
    - Validate business owns the store before allowing updates
    - Apply changes with <5 second latency
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]* 4.6 Write property test for store updates
    - **Property 13: Store Settings Update Persists**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 4.7 Implement logo upload functionality
    - Implement StoreManagementService.upload_logo() with S3 integration
    - Validate image format (JPEG, PNG, WebP) and size (<5MB)
    - Generate unique filenames to prevent collisions
    - Create POST /api/v1/stores/:id/logo endpoint
    - Store S3 URL in store.logo_url field
    - _Requirements: 4.3, 4.4, 18.2, 18.3_

  - [ ]* 4.8 Write property tests for image upload
    - **Property 14: Logo Upload Stores in S3**
    - **Property 15: Image Upload Validation**
    - **Property 56: Image Filenames Are Unique**
    - **Validates: Requirements 4.3, 4.4, 18.2, 18.4, 18.5**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement product management functionality
  - [x] 6.1 Create product creation endpoint
    - Implement ProductManagementService.create_product() with validation
    - Validate business owns the store
    - Validate price is positive decimal and quantity is non-negative integer
    - Create POST /api/v1/stores/:id/products endpoint
    - Trigger search index update within 10 seconds
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7_

  - [ ]* 6.2 Write property test for product creation
    - **Property 16: Valid Product Data Creates Product**
    - **Validates: Requirements 5.3**

  - [x] 6.3 Implement product image upload
    - Implement ProductManagementService.upload_images() with S3 integration
    - Generate thumbnail, medium, and large versions of each image
    - Validate image format and size
    - Create POST /api/v1/products/:id/images endpoint
    - Store multiple ProductImage records with different size URLs
    - _Requirements: 5.4, 18.1, 18.4, 18.5, 18.7_

  - [ ]* 6.4 Write property tests for product images
    - **Property 17: Product Images Stored in S3**
    - **Property 57: Image Upload Generates Multiple Sizes**
    - **Validates: Requirements 5.4, 18.7**

  - [x] 6.5 Create product update endpoint
    - Implement ProductManagementService.update_product() with ownership validation
    - Prevent businesses from updating products they don't own (return 403)
    - Update last_modified timestamp
    - Create PUT /api/v1/products/:id endpoint
    - Trigger search re-indexing within 10 seconds
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 6.6 Write property tests for product updates
    - **Property 20: Product Update Persists and Updates Timestamp**
    - **Property 21: Cross-Tenant Product Access Prevented**
    - **Validates: Requirements 6.3, 6.4**

  - [x] 6.7 Create product deletion endpoint
    - Implement ProductManagementService.delete_product() with ownership validation
    - Prevent deletion if product is in active carts or pending orders
    - Remove associated images from S3
    - Create DELETE /api/v1/products/:id endpoint
    - Trigger search index removal within 10 seconds
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 6.8 Write property tests for product deletion
    - **Property 22: Product Deletion Removes Product**
    - **Property 23: Product Deletion Removes S3 Images**
    - **Property 24: Products in Carts Cannot Be Deleted**
    - **Validates: Requirements 7.2, 7.4, 7.6**

  - [x] 6.9 Create product listing and detail endpoints
    - Create GET /api/v1/stores/:id/products with pagination (24 per page)
    - Create GET /api/v1/products/:id for product details
    - Filter products by store_id for tenant isolation
    - Display only products with quantity > 0 as available
    - _Requirements: 11.1, 11.3, 11.4, 11.5_

  - [ ]* 6.10 Write property tests for product browsing
    - **Property 35: Product Pagination**
    - **Property 36: Out-of-Stock Products Marked Unavailable**
    - **Validates: Requirements 11.3, 11.5**

- [x] 7. Implement search functionality
  - [x] 7.1 Create search indexing service
    - Implement SearchService.index_product() to create/update ProductSearchIndex
    - Generate search_vector using PostgreSQL full-text search
    - Populate name_lower and category_lower fields
    - Trigger indexing on product create/update
    - _Requirements: 5.7, 6.5, 10.1_

  - [x] 7.2 Create search endpoint
    - Implement SearchService.search() with relevance ranking
    - Rank exact name matches highest, then description, then category
    - Filter results by store_id for tenant isolation
    - Create GET /api/v1/stores/:id/search endpoint
    - Return results within 500ms for queries under 100 characters
    - Return empty result set with message when no matches found
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 7.3 Write property tests for search
    - **Property 33: Search Returns Matching Products**
    - **Property 34: Search Results Ranked by Relevance**
    - **Validates: Requirements 10.2, 10.4, 10.5**

  - [x] 7.4 Implement search index removal
    - Implement SearchService.remove_product() to delete from ProductSearchIndex
    - Trigger on product deletion
    - _Requirements: 7.5_

- [x] 8. Implement customer authentication and accounts
  - [x] 8.1 Create customer registration endpoint
    - Implement customer registration with email uniqueness validation
    - Hash passwords using bcrypt with work factor 12
    - Create POST /api/v1/customers/register endpoint
    - Return 409 for duplicate emails
    - Send verification email
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 20.1_

  - [ ]* 8.2 Write property tests for customer registration
    - **Property 25: Customer Registration Creates Account**
    - **Property 26: Duplicate Customer Email Rejection**
    - **Property 27: Customer Verification Email Sent**
    - **Validates: Requirements 8.2, 8.3, 8.4**

  - [x] 8.3 Create customer authentication endpoints
    - Implement POST /api/v1/customers/login with credential validation
    - Generate JWT tokens with customer_id claim and 7-day expiration
    - Return 401 for invalid credentials
    - Log all authentication attempts
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 20.7_

  - [ ]* 8.4 Write property tests for customer authentication
    - **Property 29: Valid Customer Credentials Authenticate**
    - **Property 30: Invalid Customer Credentials Rejected**
    - **Property 31: Customer Session Token Valid for 7 Days**
    - **Property 32: Expired Customer Session Rejected for Checkout**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5**

  - [x] 8.5 Create customer profile endpoints
    - Create GET /api/v1/customers/profile endpoint
    - Create PUT /api/v1/customers/profile endpoint for updating customer info
    - Implement shipping address management endpoints
    - _Requirements: 8.1, 13.3_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement shopping cart functionality
  - [x] 10.1 Create cart management service
    - Implement CartService.add_item() with quantity validation
    - Validate requested quantity does not exceed product.quantity
    - Support both authenticated (customer_id) and guest (session_id) carts
    - Create or update CartItem with price_at_addition snapshot
    - Set cart expires_at to 7 days for guest carts
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.9_

  - [ ]* 10.2 Write property tests for cart operations
    - **Property 37: Adding Product to Cart Updates Cart**
    - **Property 38: Cart Quantity Validation**
    - **Validates: Requirements 12.1, 12.3, 12.4**

  - [x] 10.3 Create cart endpoints
    - Create POST /api/v1/cart/items to add items
    - Create PUT /api/v1/cart/items/:id to update quantities
    - Create DELETE /api/v1/cart/items/:id to remove items
    - Create GET /api/v1/cart to retrieve cart with calculated totals
    - Support both authenticated and unauthenticated requests
    - _Requirements: 12.1, 12.5, 12.6, 12.7_

  - [ ]* 10.4 Write property tests for cart calculations
    - **Property 39: Cart Total Calculation**
    - **Validates: Requirements 12.7**

  - [x] 10.5 Implement cart persistence and merging
    - Implement CartService.merge_carts() to merge guest cart into customer cart on login
    - Persist authenticated customer carts across sessions
    - Store guest carts in browser localStorage with 7-day expiration
    - _Requirements: 12.8, 12.9_

  - [ ]* 10.6 Write property test for cart persistence
    - **Property 40: Authenticated Cart Persists Across Sessions**
    - **Validates: Requirements 12.8**

- [x] 11. Implement checkout and payment processing
  - [x] 11.1 Create checkout validation service
    - Implement CheckoutService.validate_cart() to check product availability
    - Validate all products still exist and have sufficient quantity
    - Return detailed error for unavailable products
    - Require customer authentication
    - _Requirements: 13.1, 13.4, 13.5_

  - [ ]* 11.2 Write property tests for checkout validation
    - **Property 41: Checkout Requires Authentication**
    - **Property 42: Checkout Validates Product Availability**
    - **Validates: Requirements 13.1, 13.4, 13.5**

  - [x] 11.3 Implement checkout calculation service
    - Implement CheckoutService.calculate_totals() for subtotal, shipping, tax, and total
    - Calculate shipping cost based on total weight and destination address
    - Collect or confirm shipping address from customer
    - Create POST /api/v1/checkout endpoint
    - Display order summary with all pricing details
    - _Requirements: 13.2, 13.3, 13.6, 13.7_

  - [ ]* 11.4 Write property tests for checkout calculations
    - **Property 43: Shipping Cost Calculation**
    - **Property 44: Checkout Total Calculation**
    - **Validates: Requirements 13.6, 13.7**

  - [x] 11.5 Integrate Stripe payment processing
    - Implement CheckoutService.create_payment_intent() with Stripe API
    - Create POST /api/v1/checkout/payment endpoint
    - Return Stripe client secret to frontend
    - Support credit card, debit card, and digital wallet payment methods
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 11.6 Implement Stripe webhook handler
    - Implement PaymentService.handle_webhook() for payment events
    - Verify Stripe webhook signatures
    - Create POST /api/v1/webhooks/stripe endpoint
    - Process payment_intent.succeeded events
    - Process payment_intent.payment_failed events
    - Ensure idempotent processing using event IDs
    - _Requirements: 14.8_

  - [x] 11.7 Create order on successful payment
    - Implement OrderManagementService.create_order() in database transaction
    - Create Order with status "paid" and unique order_number
    - Create OrderItem records with product_snapshot JSON
    - Decrement product quantities
    - Clear cart items
    - Send order confirmation email with order details
    - _Requirements: 14.4, 14.5, 14.9_

  - [ ]* 11.8 Write property tests for payment and order creation
    - **Property 45: Successful Payment Creates Order**
    - **Property 46: Failed Payment Preserves Cart**
    - **Property 47: Order Creation Sends Confirmation Email**
    - **Validates: Requirements 14.5, 14.7, 14.9**

- [x] 12. Implement order management functionality
  - [x] 12.1 Create order listing and detail endpoints
    - Create GET /api/v1/orders endpoint with customer authentication
    - Filter orders by customer_id for data isolation
    - Sort orders in reverse chronological order (most recent first)
    - Create GET /api/v1/orders/:id endpoint for order details
    - Display order status, items, pricing, and shipping information
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 17.3_

  - [ ]* 12.2 Write property tests for order access
    - **Property 48: Customer Sees Only Their Orders**
    - **Property 49: Orders Sorted Chronologically**
    - **Validates: Requirements 15.1, 15.5, 17.3**

  - [x] 12.3 Implement order cancellation
    - Implement OrderManagementService.cancel_order() with status validation
    - Allow cancellation only for orders with status "paid" or "processing"
    - Reject cancellation for "shipped", "delivered", or "cancelled" orders
    - Update order status to "cancelled"
    - Create POST /api/v1/orders/:id/cancel endpoint
    - Process cancellation within 60 seconds
    - _Requirements: 16.1, 16.2, 16.3, 16.7_

  - [ ]* 12.4 Write property tests for order cancellation
    - **Property 50: Only Eligible Orders Can Be Cancelled**
    - **Property 51: Order Cancellation Updates Status**
    - **Validates: Requirements 16.1, 16.2, 16.3**

  - [x] 12.5 Implement refund processing
    - Implement PaymentService.initiate_refund() with Stripe API
    - Initiate full refund for cancelled orders
    - Create Refund record with stripe_refund_id
    - Send cancellation confirmation email to customer
    - _Requirements: 16.4, 16.5_

  - [ ]* 12.6 Write property tests for refunds
    - **Property 52: Order Cancellation Initiates Refund**
    - **Property 53: Cancellation Sends Confirmation Email**
    - **Validates: Requirements 16.4, 16.5**

  - [x] 12.7 Restore inventory on cancellation
    - Restore product quantities for all items in cancelled order
    - Execute in database transaction with order status update
    - _Requirements: 16.6_

  - [ ]* 12.8 Write property test for inventory restoration
    - **Property 54: Cancellation Restores Inventory**
    - **Validates: Requirements 16.6**

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement security and data isolation
  - [x] 14.1 Create tenant isolation middleware
    - Implement Django middleware to inject tenant context from JWT claims
    - Automatically filter all queries by store_id or business_id
    - Enforce data isolation at database query level
    - _Requirements: 17.1, 17.2, 17.4, 17.5_

  - [ ]* 14.2 Write property test for multi-tenant isolation
    - **Property 55: Multi-Tenant Data Isolation**
    - **Validates: Requirements 17.1, 17.2, 17.5**

  - [x] 14.3 Implement input validation and sanitization
    - Add SQL injection prevention using Django ORM parameterized queries
    - Add XSS prevention using Django template escaping
    - Validate and sanitize all user inputs
    - _Requirements: 20.3, 20.4_

  - [ ]* 14.4 Write property tests for security
    - **Property 59: SQL Injection Prevention**
    - **Property 60: XSS Attack Prevention**
    - **Property 61: Credit Card Numbers Never Stored**
    - **Validates: Requirements 20.3, 20.4, 20.5**

  - [x] 14.5 Implement rate limiting
    - Add Django middleware for rate limiting (100 requests per minute per IP)
    - Return 429 status code when limit exceeded
    - Include retry-after header in response
    - _Requirements: 20.6_

  - [ ]* 14.6 Write property test for rate limiting
    - **Property 62: Rate Limiting Enforced**
    - **Validates: Requirements 20.6**

  - [x] 14.7 Configure HTTPS and TLS
    - Configure Django to require HTTPS
    - Set TLS 1.2 or higher as minimum version
    - Configure secure cookie settings
    - _Requirements: 20.2_

- [x] 15. Build Next.js frontend components
  - [x] 15.1 Create business dashboard pages
    - Build business registration and login pages with form validation
    - Build store creation and configuration pages
    - Build product management interface with CRUD operations
    - Implement image upload with preview
    - Connect to Django API endpoints
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1_

  - [x] 15.2 Create customer-facing storefront pages
    - Build store homepage with product catalog and pagination
    - Build product detail pages with image gallery
    - Build category filtering interface
    - Implement responsive design
    - Connect to Django API endpoints
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 15.3 Implement search interface
    - Build search input with real-time debouncing
    - Build search results page with relevance ranking display
    - Connect to Django search API
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 15.4 Build shopping cart interface
    - Build cart page with item list, quantity controls, and total display
    - Implement add to cart functionality
    - Store guest carts in localStorage
    - Sync authenticated carts with API
    - _Requirements: 12.1, 12.5, 12.6, 12.7, 12.8, 12.9_

  - [x] 15.5 Create checkout flow pages
    - Build multi-step checkout interface
    - Build address confirmation step
    - Build order summary with pricing breakdown
    - Integrate Stripe Elements for payment
    - Handle payment success and failure states
    - _Requirements: 13.1, 13.2, 13.3, 13.7, 14.2, 14.3_

  - [x] 15.6 Build customer account pages
    - Build customer registration and login pages
    - Build order history page with order list
    - Build order detail page with cancellation button
    - Connect to Django API endpoints
    - _Requirements: 8.1, 9.1, 15.1, 15.2, 16.1_

- [x] 16. Implement email notification system
  - [x] 16.1 Set up email service integration
    - Configure Django email backend (e.g., SendGrid, AWS SES)
    - Create email templates for verification, order confirmation, and cancellation
    - Implement email sending with error handling and retry logic
    - _Requirements: 1.4, 8.4, 14.9, 16.5_

  - [x] 16.2 Implement email queue for reliability
    - Queue email sending for async processing
    - Retry failed email sends with exponential backoff
    - Log email delivery status
    - _Requirements: 1.4, 8.4, 14.9, 16.5_

- [x] 17. Deploy and configure infrastructure
  - [x] 17.1 Deploy Django backend to Render
    - Configure Render service with environment variables
    - Set up PostgreSQL connection to Neon
    - Configure AWS S3 credentials
    - Configure Stripe API keys
    - Set up health check endpoints
    - _Requirements: 20.2_

  - [x] 17.2 Deploy Next.js frontend to Vercel
    - Configure Vercel project with environment variables
    - Set up API base URL for Django backend
    - Configure custom domain and subdomains
    - Enable HTTPS with automatic certificate renewal
    - _Requirements: 20.2_

  - [x] 17.3 Configure AWS S3 bucket
    - Create S3 bucket with appropriate permissions
    - Configure CORS for frontend uploads
    - Set up CDN with CloudFront for image delivery
    - Configure caching headers
    - _Requirements: 18.1, 18.3_

  - [x] 17.4 Set up monitoring and logging
    - Configure application logging with structured logs
    - Set up error tracking (e.g., Sentry)
    - Configure performance monitoring
    - Set up alerts for critical errors
    - _Requirements: 20.7_

- [x] 18. Final checkpoint - Ensure all tests pass
  - Run full test suite including unit, property, integration, and E2E tests
  - Verify all 63 correctness properties pass
  - Ensure test coverage meets 85% threshold
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties from the design document
- All implementation uses Python/Django for backend and TypeScript/Next.js for frontend
- Multi-tenant isolation is enforced at every layer: middleware, API, and database
- All sensitive operations (payments, authentication) include comprehensive error handling
- The platform supports both authenticated and guest user flows
