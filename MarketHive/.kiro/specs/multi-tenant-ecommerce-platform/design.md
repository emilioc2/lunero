# Design Document: Multi-Tenant E-Commerce Platform

## Overview

This design document specifies the technical architecture for a multi-tenant e-commerce platform that enables businesses to create and manage independent product stores while allowing customers to browse, search, and purchase products. The platform implements strict data isolation between tenants, integrated payment processing via Stripe, and comprehensive order management capabilities.

### System Architecture

The platform follows a decoupled architecture with:

- **Frontend**: Next.js (TypeScript) application deployed on Vercel, providing server-side rendering for optimal performance and SEO
- **Backend**: Django REST Framework API deployed on Render, handling business logic, authentication, and data management
- **Database**: PostgreSQL hosted on Neon, providing relational data storage with multi-tenancy support
- **Payment Processing**: Stripe integration for secure payment handling
- **Storage**: AWS S3 for product and branding images with CDN delivery

### Key Design Principles

1. **Multi-Tenancy**: Each business operates an isolated store with complete data separation at the database level
2. **RESTful API Design**: Clean, resource-oriented API endpoints following REST conventions
3. **Security-First**: Authentication, authorization, input validation, and encryption at all layers
4. **Performance**: Caching strategies, optimized queries, and CDN delivery for sub-second response times
5. **Scalability**: Stateless API design enabling horizontal scaling

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
    end
    
    subgraph "Frontend - Vercel"
        NextJS[Next.js Application]
        SSR[Server-Side Rendering]
    end
    
    subgraph "Backend - Render"
        API[Django REST Framework]
        Auth[Authentication Service]
        Business[Business Logic Layer]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL - Neon)]
        S3[AWS S3 Storage]
        Stripe[Stripe API]
    end
    
    Browser --> NextJS
    NextJS --> SSR
    SSR --> API
    API --> Auth
    API --> Business
    Business --> DB
    Business --> S3
    Business --> Stripe
```

### Multi-Tenancy Architecture

The platform implements a shared database, shared schema multi-tenancy model with tenant isolation enforced through:

1. **Tenant Identifier**: Every data model includes a `store_id` or `business_id` foreign key
2. **Query Filtering**: Django middleware automatically filters all queries by tenant context
3. **API Authorization**: JWT tokens include tenant claims validated on every request
4. **Subdomain Routing**: Each store is accessible via unique subdomain (e.g., `store-name.platform.com`)

```mermaid
graph LR
    subgraph "Request Flow"
        Request[HTTP Request] --> Subdomain[Subdomain Parser]
        Subdomain --> TenantID[Tenant ID Resolution]
        TenantID --> Middleware[Tenant Middleware]
        Middleware --> View[API View]
        View --> QueryFilter[Filtered Query]
        QueryFilter --> DB[(Database)]
    end
```

### Authentication & Authorization

**Two-Track Authentication System**:

1. **Business Authentication**:
   - JWT-based authentication with 24-hour token expiration
   - Tokens include business_id claim for tenant context
   - Refresh tokens stored in HTTP-only cookies

2. **Customer Authentication**:
   - JWT-based authentication with 7-day token expiration
   - Tokens include customer_id claim
   - Optional authentication for browsing, required for checkout

**Authorization Model**:
- Business users can only access/modify resources belonging to their stores
- Customers can only access their own orders and cart data
- Django REST Framework permissions enforce authorization at the view level

## Components and Interfaces

### Frontend Components (Next.js)

#### Business Dashboard Components

1. **StoreManagement**
   - Store configuration interface
   - Branding customization (logo, colors, theme)
   - Subdomain management

2. **ProductManagement**
   - Product CRUD operations
   - Image upload with preview
   - Inventory management
   - Category assignment

3. **BusinessAuth**
   - Registration and login forms
   - Email verification flow
   - Session management

#### Customer-Facing Components

1. **StoreFront**
   - Product catalog display with pagination
   - Category filtering
   - Product detail views
   - Responsive design

2. **SearchInterface**
   - Real-time search with debouncing
   - Search result display
   - Relevance-based ranking

3. **ShoppingCart**
   - Cart item management
   - Quantity updates
   - Price calculation
   - Persistent storage (localStorage for guests, API for authenticated)

4. **CheckoutFlow**
   - Multi-step checkout process
   - Address confirmation
   - Order summary
   - Stripe payment integration

5. **CustomerAuth**
   - Registration and login forms
   - Email verification
   - Session management

6. **OrderHistory**
   - Order list display
   - Order detail views
   - Cancellation interface

### Backend API Endpoints (Django REST Framework)

#### Business Endpoints

```
POST   /api/v1/business/register          # Business registration
POST   /api/v1/business/login             # Business authentication
POST   /api/v1/business/verify-email      # Email verification
GET    /api/v1/business/profile           # Get business profile
PUT    /api/v1/business/profile           # Update business profile

POST   /api/v1/stores                     # Create store
GET    /api/v1/stores/:id                 # Get store details
PUT    /api/v1/stores/:id                 # Update store settings
POST   /api/v1/stores/:id/logo            # Upload store logo

GET    /api/v1/stores/:id/products        # List products
POST   /api/v1/stores/:id/products        # Create product
GET    /api/v1/products/:id               # Get product details
PUT    /api/v1/products/:id               # Update product
DELETE /api/v1/products/:id               # Delete product
POST   /api/v1/products/:id/images        # Upload product images
```

#### Customer Endpoints

```
POST   /api/v1/customers/register         # Customer registration
POST   /api/v1/customers/login            # Customer authentication
POST   /api/v1/customers/verify-email     # Email verification
GET    /api/v1/customers/profile          # Get customer profile
PUT    /api/v1/customers/profile          # Update customer profile

GET    /api/v1/stores/:subdomain          # Get store by subdomain
GET    /api/v1/stores/:id/products        # Browse products (public)
GET    /api/v1/stores/:id/search          # Search products

GET    /api/v1/cart                       # Get cart contents
POST   /api/v1/cart/items                 # Add item to cart
PUT    /api/v1/cart/items/:id             # Update cart item quantity
DELETE /api/v1/cart/items/:id             # Remove cart item

POST   /api/v1/checkout                   # Initiate checkout
POST   /api/v1/checkout/payment           # Process payment (Stripe)
POST   /api/v1/webhooks/stripe            # Stripe webhook handler

GET    /api/v1/orders                     # List customer orders
GET    /api/v1/orders/:id                 # Get order details
POST   /api/v1/orders/:id/cancel          # Cancel order
```

### Service Layer Components

#### OnboardingService

```python
class OnboardingService:
    def register_business(self, data: dict) -> Business:
        """
        Create business account with validation
        Returns: Business instance
        Raises: ValidationError if email exists or data invalid
        """
        
    def send_verification_email(self, business: Business) -> None:
        """Send email verification link"""
        
    def verify_email(self, token: str) -> bool:
        """Verify email token and activate account"""
```

#### StoreManagementService

```python
class StoreManagementService:
    def create_store(self, business_id: int, data: dict) -> Store:
        """
        Create product store with unique subdomain
        Returns: Store instance
        Raises: ValidationError if subdomain exists
        """
        
    def update_store(self, store_id: int, data: dict) -> Store:
        """Update store configuration"""
        
    def upload_logo(self, store_id: int, image: File) -> str:
        """
        Upload logo to S3 and return URL
        Returns: S3 URL
        Raises: ValidationError if image invalid
        """
```

#### ProductManagementService

```python
class ProductManagementService:
    def create_product(self, store_id: int, data: dict) -> Product:
        """
        Create product with validation
        Triggers search index update
        """
        
    def update_product(self, product_id: int, data: dict) -> Product:
        """
        Update product and re-index for search
        Validates ownership
        """
        
    def delete_product(self, product_id: int) -> None:
        """
        Delete product, remove images from S3, update search index
        Prevents deletion if in active carts/orders
        """
        
    def upload_images(self, product_id: int, images: List[File]) -> List[str]:
        """
        Upload images to S3, generate thumbnails
        Returns: List of S3 URLs
        """
```

#### SearchService

```python
class SearchService:
    def index_product(self, product: Product) -> None:
        """Add or update product in search index"""
        
    def remove_product(self, product_id: int) -> None:
        """Remove product from search index"""
        
    def search(self, store_id: int, query: str) -> List[Product]:
        """
        Search products within store
        Returns results ranked by relevance
        """
```

#### CartService

```python
class CartService:
    def add_item(self, cart_id: str, product_id: int, quantity: int) -> CartItem:
        """
        Add item to cart with quantity validation
        Raises: ValidationError if insufficient stock
        """
        
    def update_quantity(self, item_id: int, quantity: int) -> CartItem:
        """Update cart item quantity"""
        
    def remove_item(self, item_id: int) -> None:
        """Remove item from cart"""
        
    def get_cart(self, cart_id: str) -> Cart:
        """Get cart with calculated totals"""
        
    def merge_carts(self, guest_cart_id: str, customer_id: int) -> Cart:
        """Merge guest cart into customer cart on login"""
```

#### CheckoutService

```python
class CheckoutService:
    def validate_cart(self, cart_id: str) -> bool:
        """
        Validate all items still available with sufficient quantity
        Returns: True if valid
        Raises: ValidationError with details if invalid
        """
        
    def calculate_totals(self, cart: Cart, address: dict) -> dict:
        """
        Calculate subtotal, shipping, tax, and total
        Returns: Dict with breakdown
        """
        
    def create_payment_intent(self, cart: Cart, customer: Customer) -> str:
        """
        Create Stripe payment intent
        Returns: Client secret for frontend
        """
```

#### PaymentService

```python
class PaymentService:
    def process_payment(self, payment_intent_id: str) -> Payment:
        """Process payment through Stripe"""
        
    def handle_webhook(self, event: dict) -> None:
        """
        Handle Stripe webhook events
        Updates order status based on payment events
        """
        
    def initiate_refund(self, payment_id: str, amount: Decimal) -> Refund:
        """Initiate refund through Stripe"""
```

#### OrderManagementService

```python
class OrderManagementService:
    def create_order(self, cart: Cart, payment: Payment, address: dict) -> Order:
        """
        Create order from cart after successful payment
        Decrements product quantities
        Clears cart
        Sends confirmation email
        """
        
    def get_customer_orders(self, customer_id: int) -> List[Order]:
        """Get all orders for customer"""
        
    def cancel_order(self, order_id: int) -> Order:
        """
        Cancel order if eligible
        Initiates refund
        Restores inventory
        Sends cancellation email
        Raises: ValidationError if order cannot be cancelled
        """
```

## Data Models

### Business Domain

```python
class Business(models.Model):
    """Business account owning one or more stores"""
    id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)  # bcrypt
    business_name = models.CharField(max_length=255)
    business_details = models.TextField()
    email_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=255, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

```python
class Store(models.Model):
    """Product store owned by a business"""
    id = models.AutoField(primary_key=True)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='stores')
    name = models.CharField(max_length=255)
    subdomain = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField()
    logo_url = models.URLField(null=True)
    color_scheme = models.JSONField(default=dict)  # {primary, secondary, accent}
    theme = models.CharField(max_length=50, default='default')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Product Domain

```python
class Product(models.Model):
    """Product listed in a store"""
    id = models.AutoField(primary_key=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products', db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField(default=0)
    category = models.CharField(max_length=100, db_index=True)
    weight_grams = models.IntegerField(default=0)  # For shipping calculation
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['store', 'category']),
            models.Index(fields=['store', 'name']),
        ]
```

```python
class ProductImage(models.Model):
    """Product images stored in S3"""
    id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    url = models.URLField()  # S3 URL
    thumbnail_url = models.URLField()
    medium_url = models.URLField()
    is_primary = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Customer Domain

```python
class Customer(models.Model):
    """Customer account"""
    id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)  # bcrypt
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, null=True)
    email_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=255, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

```python
class ShippingAddress(models.Model):
    """Customer shipping addresses"""
    id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='addresses')
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Cart Domain

```python
class Cart(models.Model):
    """Shopping cart"""
    id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, related_name='carts')
    session_id = models.CharField(max_length=255, null=True, db_index=True)  # For guest carts
    store = models.ForeignKey(Store, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()  # 7 days for guest carts
```

```python
class CartItem(models.Model):
    """Item in shopping cart"""
    id = models.AutoField(primary_key=True)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    price_at_addition = models.DecimalField(max_digits=10, decimal_places=2)  # Snapshot price
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Order Domain

```python
class Order(models.Model):
    """Customer order"""
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.AutoField(primary_key=True)
    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='orders')
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='paid', db_index=True)
    
    # Pricing
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Shipping
    shipping_address = models.JSONField()  # Snapshot of address at order time
    
    # Payment
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['customer', '-created_at']),
            models.Index(fields=['store', '-created_at']),
        ]
```

```python
class OrderItem(models.Model):
    """Item in an order"""
    id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product_snapshot = models.JSONField()  # Snapshot of product at order time
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
```

```python
class Payment(models.Model):
    """Payment transaction"""
    id = models.AutoField(primary_key=True)
    order = models.OneToOneField(Order, on_delete=models.PROTECT, related_name='payment')
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=50)  # Stripe payment status
    payment_method = models.CharField(max_length=50)  # card, wallet, etc.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

```python
class Refund(models.Model):
    """Refund transaction"""
    id = models.AutoField(primary_key=True)
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name='refunds')
    stripe_refund_id = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=255)
    status = models.CharField(max_length=50)  # Stripe refund status
    created_at = models.DateTimeField(auto_now_add=True)
```

### Search Index

```python
class ProductSearchIndex(models.Model):
    """Denormalized search index for products"""
    id = models.AutoField(primary_key=True)
    product = models.OneToOneField(Product, on_delete=models.CASCADE)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    search_vector = models.TextField()  # PostgreSQL full-text search vector
    name_lower = models.CharField(max_length=255, db_index=True)
    category_lower = models.CharField(max_length=100, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['store', 'name_lower']),
            models.Index(fields=['store', 'category_lower']),
        ]
```

### Database Indexes Strategy

Key indexes for performance:
- `store_id` on all tenant-scoped tables for query filtering
- `email` on Business and Customer for login lookups
- `subdomain` on Store for routing
- `(store_id, category)` on Product for category browsing
- `(customer_id, created_at DESC)` on Order for order history
- `session_id` on Cart for guest cart retrieval
- Full-text search indexes on ProductSearchIndex


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies to eliminate:

- **12.3 and 12.4**: Both test cart quantity validation - combined into single property
- **13.4 and 13.5**: Both test checkout validation - combined into single property
- **6.4 and 7.3**: Both test product authorization - combined into single cross-tenant access property
- **17.1, 17.2, and 17.5**: All test data isolation - combined into comprehensive isolation property
- **18.4 and 18.5**: Both test image validation - combined into single validation property

### Property 1: Business Registration Creates Account

*For any* valid business registration data (business name, email, password, business details), submitting the data should create a Business_Account with the provided information.

**Validates: Requirements 1.2**

### Property 2: Duplicate Business Email Rejection

*For any* email address that already exists in the system, attempting to register a new business with that email should return an error and prevent account creation.

**Validates: Requirements 1.3**

### Property 3: Business Verification Email Sent

*For any* newly created Business_Account, the system should send a verification email to the provided email address.

**Validates: Requirements 1.4**

### Property 4: Unverified Business Cannot Create Stores

*For any* Business_Account with email_verified=false, attempting to create a Product_Store should be rejected.

**Validates: Requirements 1.5**

### Property 5: Valid Business Credentials Authenticate

*For any* Business_Account with valid email and password combination, authentication should succeed and return a valid session token.

**Validates: Requirements 2.2**

### Property 6: Invalid Business Credentials Rejected

*For any* invalid email/password combination (wrong password, non-existent email, or incorrect format), authentication should fail and return an error.

**Validates: Requirements 2.3**

### Property 7: Business Session Token Valid for 24 Hours

*For any* authenticated Business_Account, the session token should remain valid for requests made within 24 hours of issuance.

**Validates: Requirements 2.4**

### Property 8: Expired Business Session Rejected

*For any* Business_Account session token older than 24 hours, requests should be rejected and require re-authentication.

**Validates: Requirements 2.5**

### Property 9: Valid Store Data Creates Store

*For any* authenticated Business_Account and valid store data (name, subdomain, description), creating a store should result in a Product_Store associated with the Business_Account.

**Validates: Requirements 3.3**

### Property 10: Duplicate Subdomain Rejection

*For any* subdomain that already exists in the system, attempting to create a new store with that subdomain should return an error and prevent store creation.

**Validates: Requirements 3.4**

### Property 11: Store IDs Are Unique

*For any* set of created Product_Stores, all store identifiers should be unique.

**Validates: Requirements 3.5**

### Property 12: Created Store Accessible via Subdomain

*For any* newly created Product_Store with subdomain S, making a request to S.platform.com should return the store's data.

**Validates: Requirements 3.6**

### Property 13: Store Settings Update Persists

*For any* Product_Store and valid update data (name, description, logo, color scheme, theme), applying the update should persist the changes to the store.

**Validates: Requirements 4.1, 4.2**

### Property 14: Logo Upload Stores in S3

*For any* valid image file uploaded as a store logo, the image should be stored in AWS S3 and the store's logo_url should reference the S3 location.

**Validates: Requirements 4.3**

### Property 15: Image Upload Validation

*For any* uploaded image, the system should accept only JPEG, PNG, or WebP formats under 5MB, and reject all other files with an appropriate error.

**Validates: Requirements 4.4, 18.4, 18.5**

### Property 16: Valid Product Data Creates Product

*For any* authenticated Business_Account, Product_Store owned by that business, and valid product data (name, description, positive price, non-negative quantity, category), creating a product should result in a Product associated with the Product_Store.

**Validates: Requirements 5.3**

### Property 17: Product Images Stored in S3

*For any* product image upload, the images should be stored in AWS S3 and associated with the Product via ProductImage records.

**Validates: Requirements 5.4**

### Property 18: Product Price Validation

*For any* product creation or update, the system should accept only positive decimal values for price and reject zero, negative, or non-numeric values.

**Validates: Requirements 5.5**

### Property 19: Product Quantity Validation

*For any* product creation or update, the system should accept only non-negative integer values for quantity and reject negative or non-integer values.

**Validates: Requirements 5.6**

### Property 20: Product Update Persists and Updates Timestamp

*For any* Product and valid update data, applying the update should persist the changes and update the last_modified timestamp to the current time.

**Validates: Requirements 6.3**

### Property 21: Cross-Tenant Product Access Prevented

*For any* Business_Account and Product not belonging to any of their Product_Stores, attempting to update or delete that Product should be rejected with an authorization error.

**Validates: Requirements 6.4, 7.3**

### Property 22: Product Deletion Removes Product

*For any* Product not in active Shopping_Carts or pending Orders, deleting the product should remove it from the database and make it inaccessible.

**Validates: Requirements 7.2**

### Property 23: Product Deletion Removes S3 Images

*For any* Product with associated images, deleting the product should remove all associated images from AWS S3.

**Validates: Requirements 7.4**

### Property 24: Products in Carts Cannot Be Deleted

*For any* Product that exists in at least one active Shopping_Cart or pending Order, attempting to delete the product should be rejected with an error.

**Validates: Requirements 7.6**

### Property 25: Customer Registration Creates Account

*For any* valid customer registration data (name, email, password, shipping address), submitting the data should create a Customer_Account with the provided information.

**Validates: Requirements 8.2**

### Property 26: Duplicate Customer Email Rejection

*For any* email address that already exists in the customer system, attempting to register a new customer with that email should return an error and prevent account creation.

**Validates: Requirements 8.3**

### Property 27: Customer Verification Email Sent

*For any* newly created Customer_Account, the system should send a verification email to the provided email address.

**Validates: Requirements 8.4**

### Property 28: Browsing Without Authentication Allowed

*For any* unauthenticated user, browsing products and adding items to cart should succeed, but attempting checkout should require authentication.

**Validates: Requirements 8.5**

### Property 29: Valid Customer Credentials Authenticate

*For any* Customer_Account with valid email and password combination, authentication should succeed and return a valid session token.

**Validates: Requirements 9.2**

### Property 30: Invalid Customer Credentials Rejected

*For any* invalid email/password combination for customers, authentication should fail and return an error.

**Validates: Requirements 9.3**

### Property 31: Customer Session Token Valid for 7 Days

*For any* authenticated Customer_Account, the session token should remain valid for requests made within 7 days of issuance.

**Validates: Requirements 9.4**

### Property 32: Expired Customer Session Rejected for Checkout

*For any* Customer_Account session token older than 7 days, checkout requests should be rejected and require re-authentication.

**Validates: Requirements 9.5**

### Property 33: Search Returns Matching Products

*For any* search query and Product_Store, the search should return all products where the query text appears in the product name, description, or category, and only products from that store.

**Validates: Requirements 10.2, 10.5**

### Property 34: Search Results Ranked by Relevance

*For any* search query with results, products with exact name matches should be ranked higher than products with matches in description or category.

**Validates: Requirements 10.4**

### Property 35: Product Pagination

*For any* product listing request with pagination, each page should contain at most 24 products, and all products should be accessible across pages without duplication.

**Validates: Requirements 11.3**

### Property 36: Out-of-Stock Products Marked Unavailable

*For any* Product with quantity = 0, the product should be marked as unavailable for purchase.

**Validates: Requirements 11.5**

### Property 37: Adding Product to Cart Updates Cart

*For any* Customer (authenticated or guest) and Product with sufficient quantity, adding the product with a specified quantity should create or update a CartItem in the Shopping_Cart.

**Validates: Requirements 12.1**

### Property 38: Cart Quantity Validation

*For any* Product with available quantity Q, attempting to add more than Q items to the cart should be rejected with an error message.

**Validates: Requirements 12.3, 12.4**

### Property 39: Cart Total Calculation

*For any* Shopping_Cart with items, the total price should equal the sum of (quantity × price_at_addition) for all CartItems.

**Validates: Requirements 12.7**

### Property 40: Authenticated Cart Persists Across Sessions

*For any* authenticated Customer_Account with a Shopping_Cart, logging out and logging back in should preserve all cart items and quantities.

**Validates: Requirements 12.8**

### Property 41: Checkout Requires Authentication

*For any* unauthenticated user with items in cart, attempting to initiate checkout should be rejected and require authentication.

**Validates: Requirements 13.1**

### Property 42: Checkout Validates Product Availability

*For any* Shopping_Cart with at least one product that is unavailable or has insufficient quantity, attempting checkout should be rejected with an error identifying the problematic products.

**Validates: Requirements 13.4, 13.5**

### Property 43: Shipping Cost Calculation

*For any* checkout with shipping address and cart items, the shipping cost should be calculated based on the total weight of all products and the destination address.

**Validates: Requirements 13.6**

### Property 44: Checkout Total Calculation

*For any* checkout, the final total should equal subtotal + shipping_cost + tax, where subtotal is the sum of all cart item prices.

**Validates: Requirements 13.7**

### Property 45: Successful Payment Creates Order

*For any* successful Stripe payment for a Shopping_Cart, an Order should be created with status "paid", associated with the Customer_Account, and containing all cart items.

**Validates: Requirements 14.5**

### Property 46: Failed Payment Preserves Cart

*For any* failed payment attempt, the Shopping_Cart contents should remain unchanged and available for retry.

**Validates: Requirements 14.7**

### Property 47: Order Creation Sends Confirmation Email

*For any* newly created Order, a confirmation email should be sent to the customer's email address containing order details.

**Validates: Requirements 14.9**

### Property 48: Customer Sees Only Their Orders

*For any* authenticated Customer_Account, querying orders should return only orders associated with that customer, and no orders from other customers.

**Validates: Requirements 15.1, 17.3**

### Property 49: Orders Sorted Chronologically

*For any* customer's order list, orders should be sorted in reverse chronological order with the most recent order first.

**Validates: Requirements 15.5**

### Property 50: Only Eligible Orders Can Be Cancelled

*For any* Order, cancellation should succeed only if the order status is "paid" or "processing", and should be rejected for orders with status "shipped", "delivered", or "cancelled".

**Validates: Requirements 16.1, 16.3**

### Property 51: Order Cancellation Updates Status

*For any* eligible Order that is cancelled, the order status should be updated to "cancelled".

**Validates: Requirements 16.2**

### Property 52: Order Cancellation Initiates Refund

*For any* cancelled Order, a refund should be initiated through Stripe for the full order amount.

**Validates: Requirements 16.4**

### Property 53: Cancellation Sends Confirmation Email

*For any* cancelled Order, a cancellation confirmation email should be sent to the customer.

**Validates: Requirements 16.5**

### Property 54: Cancellation Restores Inventory

*For any* cancelled Order, the quantities of all products in the order should be restored to inventory.

**Validates: Requirements 16.6**

### Property 55: Multi-Tenant Data Isolation

*For any* Business_Account, all queries for stores, products, and orders should return only data associated with that business's stores, and no data from other businesses' stores.

**Validates: Requirements 17.1, 17.2, 17.5**

### Property 56: Image Filenames Are Unique

*For any* set of uploaded images, all generated filenames should be unique to prevent collisions.

**Validates: Requirements 18.2**

### Property 57: Image Upload Generates Multiple Sizes

*For any* uploaded product or store image, the system should generate and store thumbnail, medium, and large versions.

**Validates: Requirements 18.7**

### Property 58: Passwords Hashed with Bcrypt

*For any* Business_Account or Customer_Account, the stored password should be hashed using bcrypt with a work factor of at least 12, and the plaintext password should never be stored.

**Validates: Requirements 20.1**

### Property 59: SQL Injection Prevention

*For any* user input used in database queries, SQL injection attempts (e.g., inputs containing SQL keywords and special characters) should be sanitized and not execute as SQL code.

**Validates: Requirements 20.3**

### Property 60: XSS Attack Prevention

*For any* user input displayed in web pages, XSS attempts (e.g., inputs containing script tags or JavaScript) should be sanitized and rendered as plain text, not executed as code.

**Validates: Requirements 20.4**

### Property 61: Credit Card Numbers Never Stored

*For any* payment transaction, the platform's database should never contain complete credit card numbers - all payment data should be handled exclusively by Stripe.

**Validates: Requirements 20.5**

### Property 62: Rate Limiting Enforced

*For any* IP address making more than 100 requests per minute, subsequent requests should be rejected with a rate limit error until the rate falls below the threshold.

**Validates: Requirements 20.6**

### Property 63: Authentication Attempts Logged

*For any* authentication attempt (successful or failed) for Business_Accounts or Customer_Accounts, an audit log entry should be created with timestamp, IP address, and outcome.

**Validates: Requirements 20.7**


## Error Handling

### Error Response Format

All API errors follow a consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific_field",
      "reason": "detailed explanation"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "uuid"
  }
}
```

### Error Categories

#### 1. Validation Errors (400 Bad Request)

**Scenarios**:
- Invalid email format
- Password too short
- Negative product price
- Quantity exceeds available stock
- Unsupported image format
- Image file too large
- Missing required fields

**Handling**:
- Django REST Framework serializers validate input
- Return specific field-level errors
- Client displays errors inline on forms

**Example**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "price": ["Price must be a positive decimal value"],
      "quantity": ["Quantity cannot be negative"]
    }
  }
}
```

#### 2. Authentication Errors (401 Unauthorized)

**Scenarios**:
- Invalid credentials
- Expired session token
- Missing authentication token
- Invalid JWT signature

**Handling**:
- Return 401 with error message
- Client redirects to login page
- Refresh token flow for expired sessions

**Example**:
```json
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid email or password"
  }
}
```

#### 3. Authorization Errors (403 Forbidden)

**Scenarios**:
- Business attempting to access another business's store
- Customer attempting to view another customer's orders
- Unverified email attempting to create store
- Attempting to delete product in active cart

**Handling**:
- Django permissions check ownership
- Return 403 with clear message
- Log authorization failures for security audit

**Example**:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource"
  }
}
```

#### 4. Resource Not Found (404 Not Found)

**Scenarios**:
- Product ID doesn't exist
- Store subdomain not found
- Order ID doesn't exist

**Handling**:
- Return 404 with resource type
- Client displays "not found" page

**Example**:
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Product with ID 12345 not found"
  }
}
```

#### 5. Conflict Errors (409 Conflict)

**Scenarios**:
- Duplicate email registration
- Duplicate subdomain
- Attempting to delete product in active cart
- Insufficient inventory during checkout

**Handling**:
- Check uniqueness constraints before operations
- Return 409 with conflict details
- Client suggests alternatives (e.g., different subdomain)

**Example**:
```json
{
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Email already registered",
    "details": {
      "field": "email",
      "value": "user@example.com"
    }
  }
}
```

#### 6. Rate Limiting (429 Too Many Requests)

**Scenarios**:
- More than 100 requests per minute from single IP
- Brute force login attempts

**Handling**:
- Django middleware tracks request counts
- Return 429 with retry-after header
- Client implements exponential backoff

**Example**:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds",
    "retry_after": 60
  }
}
```

#### 7. External Service Errors (502 Bad Gateway, 503 Service Unavailable)

**Scenarios**:
- Stripe API unavailable
- AWS S3 upload failure
- Database connection timeout
- Email service failure

**Handling**:
- Implement retry logic with exponential backoff
- Return 502/503 with service name
- Queue operations for retry (e.g., email sending)
- Circuit breaker pattern for external services

**Example**:
```json
{
  "error": {
    "code": "EXTERNAL_SERVICE_ERROR",
    "message": "Payment service temporarily unavailable. Please try again.",
    "service": "stripe"
  }
}
```

#### 8. Server Errors (500 Internal Server Error)

**Scenarios**:
- Unhandled exceptions
- Database constraint violations
- Unexpected null values

**Handling**:
- Django exception middleware catches all errors
- Log full stack trace with context
- Return generic error to client (don't expose internals)
- Alert monitoring system (e.g., Sentry)

**Example**:
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Please try again later.",
    "request_id": "abc-123-def"
  }
}
```

### Error Handling Strategies

#### Database Transactions

All multi-step operations use database transactions:

```python
from django.db import transaction

@transaction.atomic
def create_order(cart, payment, address):
    # Create order
    order = Order.objects.create(...)
    
    # Create order items and decrement inventory
    for item in cart.items.all():
        product = item.product
        product.quantity -= item.quantity
        product.save()
        OrderItem.objects.create(order=order, ...)
    
    # Clear cart
    cart.items.all().delete()
    
    # If any step fails, entire transaction rolls back
    return order
```

#### Idempotency

Payment and order operations are idempotent using idempotency keys:

- Stripe payment intents include idempotency key
- Duplicate order creation requests return existing order
- Webhook events processed only once using event ID tracking

#### Graceful Degradation

When non-critical services fail:

- **Email service down**: Queue emails for later delivery, don't block order creation
- **Search index unavailable**: Fall back to database queries
- **Image optimization fails**: Store original image, retry optimization async

#### Logging and Monitoring

All errors are logged with:
- Request ID for tracing
- User ID (if authenticated)
- Timestamp
- Stack trace
- Request parameters (sanitized)

Critical errors trigger alerts:
- Payment processing failures
- Database connection issues
- High error rates (>5% of requests)

## Testing Strategy

### Overview

The testing strategy employs a dual approach combining unit tests for specific scenarios and property-based tests for comprehensive input coverage. This ensures both concrete correctness and general behavioral guarantees.

### Testing Pyramid

```
        /\
       /  \      E2E Tests (10%)
      /____\     - Critical user flows
     /      \    - Payment integration
    /        \   - Multi-tenant isolation
   /__________\  
  /            \ Integration Tests (20%)
 /              \ - API endpoints
/______________\ - Database operations
/                \ - External services
/                  \
/____________________\ Unit + Property Tests (70%)
                       - Business logic
                       - Validation
                       - Calculations
```

### Property-Based Testing

**Framework**: Hypothesis (Python)

**Configuration**:
- Minimum 100 iterations per property test
- Deterministic seed for reproducibility
- Shrinking enabled to find minimal failing cases

**Property Test Structure**:

```python
from hypothesis import given, strategies as st
import pytest

@given(
    business_name=st.text(min_size=1, max_size=255),
    email=st.emails(),
    password=st.text(min_size=8, max_size=128)
)
def test_property_1_business_registration_creates_account(business_name, email, password):
    """
    Feature: multi-tenant-ecommerce-platform
    Property 1: For any valid business registration data, submitting the data 
    should create a Business_Account with the provided information.
    """
    # Arrange
    data = {
        'business_name': business_name,
        'email': email,
        'password': password,
        'business_details': 'Test business'
    }
    
    # Act
    response = client.post('/api/v1/business/register', data)
    
    # Assert
    assert response.status_code == 201
    business = Business.objects.get(email=email)
    assert business.business_name == business_name
    assert business.email == email
    assert bcrypt.checkpw(password.encode(), business.password_hash.encode())
```

**Custom Strategies**:

```python
# Generate valid product data
@st.composite
def product_data(draw):
    return {
        'name': draw(st.text(min_size=1, max_size=255)),
        'description': draw(st.text(max_size=5000)),
        'price': draw(st.decimals(min_value=0.01, max_value=999999.99, places=2)),
        'quantity': draw(st.integers(min_value=0, max_value=10000)),
        'category': draw(st.sampled_from(['Electronics', 'Clothing', 'Books', 'Home']))
    }

# Generate shopping carts with items
@st.composite
def cart_with_items(draw):
    store = draw(stores())
    products = draw(st.lists(products_for_store(store), min_size=1, max_size=10))
    items = []
    for product in products:
        quantity = draw(st.integers(min_value=1, max_value=min(5, product.quantity)))
        items.append({'product': product, 'quantity': quantity})
    return {'store': store, 'items': items}
```

### Unit Testing

**Framework**: pytest with Django test client

**Focus Areas**:
- Specific edge cases (empty cart, zero quantity products)
- Error conditions (duplicate email, invalid credentials)
- Integration points (Stripe webhooks, S3 uploads)
- Business logic (price calculations, shipping costs)

**Example Unit Tests**:

```python
def test_empty_cart_checkout_rejected():
    """Test that checkout with empty cart returns error"""
    customer = create_customer()
    cart = Cart.objects.create(customer=customer, store=store)
    
    response = client.post('/api/v1/checkout', headers=auth_headers(customer))
    
    assert response.status_code == 400
    assert 'empty' in response.json()['error']['message'].lower()

def test_shipped_order_cannot_be_cancelled():
    """Test that orders with status 'shipped' cannot be cancelled"""
    order = create_order(status='shipped')
    
    response = client.post(f'/api/v1/orders/{order.id}/cancel', 
                          headers=auth_headers(order.customer))
    
    assert response.status_code == 400
    assert 'cannot cancel' in response.json()['error']['message'].lower()
```

### Integration Testing

**Focus**: API endpoints with database and external services

**Test Database**: Separate PostgreSQL test database with same schema

**External Service Mocking**:
- Stripe API: Use Stripe test mode with mock payment methods
- AWS S3: Use moto library to mock S3 operations
- Email: Capture emails in memory for verification

**Example Integration Test**:

```python
@pytest.mark.integration
def test_complete_checkout_flow():
    """Test full checkout flow from cart to order creation"""
    # Setup
    customer = create_customer(verified=True)
    store = create_store()
    product = create_product(store=store, price=Decimal('29.99'), quantity=10)
    cart = create_cart(customer=customer, store=store)
    add_to_cart(cart, product, quantity=2)
    
    # Initiate checkout
    checkout_response = client.post('/api/v1/checkout', 
                                    json={'address_id': customer.addresses.first().id},
                                    headers=auth_headers(customer))
    assert checkout_response.status_code == 200
    payment_intent = checkout_response.json()['payment_intent_id']
    
    # Simulate successful Stripe payment
    stripe_webhook_data = create_payment_success_webhook(payment_intent)
    webhook_response = client.post('/api/v1/webhooks/stripe', 
                                   json=stripe_webhook_data,
                                   headers={'Stripe-Signature': 'test_sig'})
    assert webhook_response.status_code == 200
    
    # Verify order created
    order = Order.objects.get(stripe_payment_intent_id=payment_intent)
    assert order.status == 'paid'
    assert order.customer == customer
    assert order.items.count() == 1
    assert order.items.first().quantity == 2
    
    # Verify inventory decremented
    product.refresh_from_db()
    assert product.quantity == 8
    
    # Verify cart cleared
    assert cart.items.count() == 0
    
    # Verify email sent
    assert len(mail.outbox) == 1
    assert order.order_number in mail.outbox[0].body
```

### End-to-End Testing

**Framework**: Playwright (TypeScript)

**Focus**: Critical user journeys through the UI

**Key Scenarios**:
1. Business registration → store creation → product creation
2. Customer registration → product search → add to cart → checkout → payment
3. Customer order history → order cancellation
4. Multi-tenant isolation (two businesses cannot see each other's data)

**Example E2E Test**:

```typescript
test('customer can complete purchase flow', async ({ page }) => {
  // Register and login
  await page.goto('/register');
  await page.fill('[name="email"]', 'customer@test.com');
  await page.fill('[name="password"]', 'SecurePass123');
  await page.fill('[name="name"]', 'Test Customer');
  await page.click('button[type="submit"]');
  
  // Browse store
  await page.goto('/stores/test-store');
  await expect(page.locator('h1')).toContainText('Test Store');
  
  // Search for product
  await page.fill('[name="search"]', 'laptop');
  await page.press('[name="search"]', 'Enter');
  await expect(page.locator('.product-card')).toHaveCount(3);
  
  // Add to cart
  await page.click('.product-card:first-child');
  await page.fill('[name="quantity"]', '2');
  await page.click('button:has-text("Add to Cart")');
  await expect(page.locator('.cart-badge')).toContainText('2');
  
  // Checkout
  await page.click('[href="/cart"]');
  await page.click('button:has-text("Checkout")');
  
  // Payment (Stripe test mode)
  await page.frameLocator('iframe[name*="stripe"]').fill('[name="cardnumber"]', '4242424242424242');
  await page.frameLocator('iframe[name*="stripe"]').fill('[name="exp-date"]', '12/25');
  await page.frameLocator('iframe[name*="stripe"]').fill('[name="cvc"]', '123');
  await page.click('button:has-text("Pay")');
  
  // Verify order confirmation
  await expect(page.locator('h1')).toContainText('Order Confirmed');
  await expect(page.locator('.order-number')).toBeVisible();
});
```

### Test Data Management

**Fixtures**: Use pytest fixtures for reusable test data

```python
@pytest.fixture
def business():
    return Business.objects.create(
        email='business@test.com',
        password_hash=bcrypt.hashpw('password'.encode(), bcrypt.gensalt()),
        business_name='Test Business',
        email_verified=True
    )

@pytest.fixture
def store(business):
    return Store.objects.create(
        business=business,
        name='Test Store',
        subdomain='test-store',
        description='A test store'
    )

@pytest.fixture
def product(store):
    return Product.objects.create(
        store=store,
        name='Test Product',
        description='A test product',
        price=Decimal('19.99'),
        quantity=100,
        category='Electronics'
    )
```

**Database Reset**: Each test runs in a transaction that rolls back

**Factory Pattern**: Use factory_boy for complex object creation

```python
import factory

class BusinessFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Business
    
    email = factory.Sequence(lambda n: f'business{n}@test.com')
    business_name = factory.Faker('company')
    password_hash = factory.LazyFunction(lambda: bcrypt.hashpw('password'.encode(), bcrypt.gensalt()))
    email_verified = True

class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product
    
    store = factory.SubFactory(StoreFactory)
    name = factory.Faker('word')
    description = factory.Faker('text')
    price = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True)
    quantity = factory.Faker('pyint', min_value=0, max_value=1000)
    category = factory.Faker('word')
```

### Test Coverage Goals

- **Overall**: 85% code coverage
- **Business Logic**: 95% coverage
- **API Endpoints**: 90% coverage
- **Models**: 100% coverage

### Continuous Integration

**Pipeline** (GitHub Actions):

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-django hypothesis pytest-cov
      
      - name: Run unit tests
        run: pytest tests/unit --cov=src --cov-report=xml
      
      - name: Run property tests
        run: pytest tests/properties --hypothesis-seed=12345
      
      - name: Run integration tests
        run: pytest tests/integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test_db
          STRIPE_TEST_KEY: ${{ secrets.STRIPE_TEST_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Performance Testing

**Tool**: Locust

**Scenarios**:
- 100 concurrent users browsing products
- 50 concurrent users adding to cart
- 20 concurrent checkouts

**Acceptance Criteria**:
- 95th percentile response time < 500ms for reads
- 95th percentile response time < 2s for writes
- Zero errors under normal load

### Security Testing

**Static Analysis**: Bandit for Python security issues

**Dependency Scanning**: Safety for known vulnerabilities

**Penetration Testing**:
- SQL injection attempts
- XSS attempts
- CSRF protection verification
- Rate limiting verification
- Authentication bypass attempts

### Test Organization

```
tests/
├── unit/
│   ├── test_business_registration.py
│   ├── test_product_management.py
│   ├── test_cart_operations.py
│   └── test_order_management.py
├── properties/
│   ├── test_property_business.py
│   ├── test_property_products.py
│   ├── test_property_cart.py
│   ├── test_property_orders.py
│   └── test_property_security.py
├── integration/
│   ├── test_api_business.py
│   ├── test_api_products.py
│   ├── test_api_checkout.py
│   └── test_stripe_webhooks.py
├── e2e/
│   ├── test_business_flow.spec.ts
│   ├── test_customer_flow.spec.ts
│   └── test_multi_tenant.spec.ts
├── conftest.py  # Shared fixtures
└── factories.py  # Factory definitions
```

### Testing Best Practices

1. **Isolation**: Each test is independent and can run in any order
2. **Clarity**: Test names describe what is being tested
3. **Arrange-Act-Assert**: Clear test structure
4. **Fast Feedback**: Unit tests run in < 5 minutes
5. **Deterministic**: Tests produce same results every run
6. **Meaningful Assertions**: Assert on business outcomes, not implementation details
7. **Property Tags**: All property tests reference design document properties

