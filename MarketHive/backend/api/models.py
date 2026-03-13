"""
Data models for the multi-tenant e-commerce platform.

This module defines the core models for businesses and stores,
implementing multi-tenancy with proper data isolation.
"""

from django.db import models


class Business(models.Model):
    """
    Business account owning one or more stores.
    
    A Business represents a registered entity that can create and manage
    product stores. Each business has unique credentials and can operate
    multiple independent storefronts.
    
    Implementation Notes:
        - email: Indexed for fast login lookups, unique constraint prevents duplicates
        - password_hash: Stores bcrypt hash (never plain text), 255 chars sufficient for bcrypt
        - email_verified: Must be True before business can create stores (Req 1.5)
        - verification_token: Single-use token for email verification, cleared after use
    """
    
    id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)  # bcrypt hash with work factor 12
    business_name = models.CharField(max_length=255)
    business_details = models.TextField()
    email_verified = models.BooleanField(default=False)  # Required before store creation
    verification_token = models.CharField(max_length=255, null=True, blank=True)  # Single-use token
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'business'
        verbose_name = 'Business'
        verbose_name_plural = 'Businesses'
        indexes = [
            models.Index(fields=['email'], name='business_email_idx'),
        ]
    
    def __str__(self):
        return f"{self.business_name} ({self.email})"


class Store(models.Model):
    """
    Product store owned by a business.
    
    A Store represents an independent e-commerce storefront with its own
    subdomain, branding, and product catalog. Each store is associated with
    a single business and provides complete data isolation from other stores.
    
    Implementation Notes:
        - subdomain: Unique identifier for store URL (e.g., "nike" -> nike.platform.com)
        - business: CASCADE delete ensures stores are removed when business is deleted
        - color_scheme: JSONField stores {primary, secondary, accent} hex colors
        - logo_url: AWS S3 URL for store logo image
        - Indexed on subdomain for fast routing, business_id for tenant filtering
    """
    
    id = models.AutoField(primary_key=True)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,  # Delete stores when business is deleted
        related_name='stores',
        db_index=True  # Index for tenant filtering queries
    )
    name = models.CharField(max_length=255)
    subdomain = models.CharField(max_length=100, unique=True, db_index=True)  # URL identifier
    description = models.TextField()
    logo_url = models.URLField(null=True, blank=True)  # AWS S3 URL
    color_scheme = models.JSONField(default=dict)  # {primary: "#hex", secondary: "#hex", accent: "#hex"}
    theme = models.CharField(max_length=50, default='default')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'store'
        verbose_name = 'Store'
        verbose_name_plural = 'Stores'
        indexes = [
            models.Index(fields=['subdomain'], name='store_subdomain_idx'),
            models.Index(fields=['business'], name='store_business_idx'),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.subdomain})"


class Product(models.Model):
    """
    Product listed in a store.
    
    A Product represents an item available for sale in a store's catalog.
    Each product belongs to a single store and includes pricing, inventory,
    and categorization information. Products are isolated by store for
    multi-tenant data separation.
    
    Implementation Notes:
        - store: CASCADE delete removes products when store is deleted
        - price: Must be positive (validated in clean()), max 99,999,999.99
        - quantity: Must be non-negative (validated in clean()), 0 = out of stock
        - weight_grams: Used for shipping cost calculation in checkout
        - Composite indexes on (store, category) and (store, name) for fast filtering
        - updated_at: Automatically updated on save, used for cache invalidation
    """
    
    id = models.AutoField(primary_key=True)
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,  # Delete products when store is deleted
        related_name='products',
        db_index=True  # Index for tenant filtering
    )
    name = models.CharField(max_length=255, db_index=True)  # Indexed for search
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Max: 99,999,999.99
    quantity = models.IntegerField(default=0)  # 0 = out of stock
    category = models.CharField(max_length=100, db_index=True)  # Indexed for filtering
    weight_grams = models.IntegerField(default=0)  # For shipping cost calculation
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # Auto-updated on save
    
    class Meta:
        db_table = 'product'
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        indexes = [
            models.Index(fields=['store', 'category'], name='product_store_category_idx'),
            models.Index(fields=['store', 'name'], name='product_store_name_idx'),
        ]
    
    def clean(self):
        """
        Validate product data.
        
        Ensures that:
        - Price is positive (> 0) - Requirement 5.5
        - Quantity is non-negative (>= 0) - Requirement 5.6
        
        Implementation Notes:
            - Called automatically by save() via full_clean()
            - Raises ValidationError with field-specific messages
            - Zero quantity is valid (represents out-of-stock items)
            - Zero or negative prices are invalid (products must have value)
        """
        from django.core.exceptions import ValidationError
        
        if self.price is not None and self.price <= 0:
            raise ValidationError({
                'price': 'Price must be a positive value.'
            })
        
        if self.quantity is not None and self.quantity < 0:
            raise ValidationError({
                'quantity': 'Quantity must be a non-negative value.'
            })
    
    def save(self, *args, **kwargs):
        """
        Override save to run validation.
        
        NOTE: This ensures clean() is always called before saving,
        preventing invalid data from entering the database.
        """
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.name} - {self.store.name}"


class ProductImage(models.Model):
    """
    Product images stored in S3.
    
    A ProductImage represents an image associated with a product, stored in
    AWS S3. Multiple sizes (thumbnail, medium, full) are generated for
    optimal web delivery. Images can be marked as primary and ordered for
    display.
    """
    
    id = models.AutoField(primary_key=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images'
    )
    url = models.URLField()  # S3 URL for full-size image
    thumbnail_url = models.URLField()  # S3 URL for thumbnail
    medium_url = models.URLField()  # S3 URL for medium size
    is_primary = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'product_image'
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'
        ordering = ['display_order', 'created_at']
    
    def __str__(self):
        return f"Image for {self.product.name} (Order: {self.display_order})"


class Customer(models.Model):
    """
    Customer account.
    
    A Customer represents an end-user who can browse products and make
    purchases from stores. Each customer has unique credentials and can
    maintain multiple shipping addresses and order history.
    """
    
    id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)  # bcrypt hash
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, null=True, blank=True)
    email_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer'
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'
        indexes = [
            models.Index(fields=['email'], name='customer_email_idx'),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.email})"


class ShippingAddress(models.Model):
    """
    Customer shipping addresses.
    
    A ShippingAddress represents a delivery location associated with a
    customer account. Customers can maintain multiple addresses, with one
    optionally marked as default for convenience during checkout.
    """
    
    id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='addresses'
    )
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'shipping_address'
        verbose_name = 'Shipping Address'
        verbose_name_plural = 'Shipping Addresses'
        ordering = ['-is_default', '-created_at']
    
    def __str__(self):
        return f"{self.address_line1}, {self.city}, {self.state} {self.postal_code}"


class Cart(models.Model):
    """
    Shopping cart.
    
    A Cart represents a collection of products selected for purchase.
    Carts can be associated with authenticated customers (via customer_id)
    or guest users (via session_id). Guest carts expire after 7 days.
    Each cart is scoped to a single store for multi-tenant isolation.
    
    Implementation Notes:
        - customer: Nullable FK for authenticated users, indexed for fast lookups
        - session_id: Nullable, indexed for guest cart retrieval (generated client-side)
        - expires_at: Set to 7 days from creation for guest carts (Req 12.9)
          Authenticated carts don't expire but can be cleaned up periodically
        - store: Each cart is scoped to a single store (can't mix products from different stores)
        - Either customer OR session_id must be set (enforced at application level)
    """
    
    id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,  # Delete carts when customer is deleted
        null=True,  # Nullable for guest carts
        blank=True,
        related_name='carts',
        db_index=True  # Index for fast customer cart lookups
    )
    session_id = models.CharField(
        max_length=255,
        null=True,  # Nullable for authenticated carts
        blank=True,
        db_index=True  # Index for fast guest cart lookups
    )  # For guest carts - generated client-side (UUID recommended)
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,  # Delete carts when store is deleted
        related_name='carts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)  # 7 days for guest carts, null for authenticated
    
    class Meta:
        db_table = 'cart'
        verbose_name = 'Cart'
        verbose_name_plural = 'Carts'
        indexes = [
            models.Index(fields=['customer'], name='cart_customer_idx'),
            models.Index(fields=['session_id'], name='cart_session_idx'),
        ]
    
    def __str__(self):
        if self.customer:
            return f"Cart for {self.customer.name} in {self.store.name}"
        return f"Guest Cart ({self.session_id}) in {self.store.name}"


class CartItem(models.Model):
    """
    Item in shopping cart.
    
    A CartItem represents a single product added to a cart with a specific
    quantity. The price_at_addition field captures the product price at the
    time of addition, preserving pricing information even if the product
    price changes later.
    
    Implementation Notes:
        - price_at_addition: Snapshot of product price when added to cart
          This prevents price changes from affecting items already in cart
        - quantity: Must be positive (> 0), validated in clean()
        - CASCADE delete: Cart items are removed when cart or product is deleted
        - Ordering by created_at: Items appear in the order they were added
    """
    
    id = models.AutoField(primary_key=True)
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,  # Delete items when cart is deleted
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE  # Delete cart items when product is deleted
    )
    quantity = models.IntegerField(default=1)  # Must be positive
    price_at_addition = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )  # Price snapshot - prevents cart total changes when product price updates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cart_item'
        verbose_name = 'Cart Item'
        verbose_name_plural = 'Cart Items'
        ordering = ['created_at']
    
    def clean(self):
        """
        Validate cart item data.
        
        Ensures that:
        - Quantity is positive (> 0)
        - Price at addition is non-negative (>= 0)
        """
        from django.core.exceptions import ValidationError
        
        if self.quantity is not None and self.quantity <= 0:
            raise ValidationError({
                'quantity': 'Quantity must be a positive value.'
            })
        
        if self.price_at_addition is not None and self.price_at_addition < 0:
            raise ValidationError({
                'price_at_addition': 'Price must be a non-negative value.'
            })
    
    def save(self, *args, **kwargs):
        """Override save to run validation."""
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.quantity}x {self.product.name} in cart"


class Order(models.Model):
    """
    Customer order.
    
    An Order represents a confirmed purchase transaction containing products,
    payment information, and delivery details. Orders track the fulfillment
    lifecycle from payment through delivery, with support for cancellation
    and refunds. Each order is associated with a customer and store for
    multi-tenant isolation.
    """
    
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.AutoField(primary_key=True)
    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name='orders',
        db_index=True
    )
    store = models.ForeignKey(
        Store,
        on_delete=models.PROTECT,
        related_name='orders',
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='paid',
        db_index=True
    )
    
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
        db_table = 'order'
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        indexes = [
            models.Index(fields=['customer', '-created_at'], name='order_customer_created_idx'),
            models.Index(fields=['store', '-created_at'], name='order_store_created_idx'),
            models.Index(fields=['status'], name='order_status_idx'),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Order {self.order_number} - {self.customer.name}"


class OrderItem(models.Model):
    """
    Item in an order.
    
    An OrderItem represents a single product within an order, capturing
    the quantity and pricing at the time of purchase. The product_snapshot
    field stores complete product information as JSON, preserving the
    product details even if the product is later modified or deleted.
    """
    
    id = models.AutoField(primary_key=True)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product_snapshot = models.JSONField()  # Snapshot of product at order time
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        db_table = 'order_item'
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'
    
    def clean(self):
        """
        Validate order item data.
        
        Ensures that:
        - Quantity is positive (> 0)
        - Price is non-negative (>= 0)
        - Subtotal is non-negative (>= 0)
        """
        from django.core.exceptions import ValidationError
        
        if self.quantity is not None and self.quantity <= 0:
            raise ValidationError({
                'quantity': 'Quantity must be a positive value.'
            })
        
        if self.price is not None and self.price < 0:
            raise ValidationError({
                'price': 'Price must be a non-negative value.'
            })
        
        if self.subtotal is not None and self.subtotal < 0:
            raise ValidationError({
                'subtotal': 'Subtotal must be a non-negative value.'
            })
    
    def save(self, *args, **kwargs):
        """Override save to run validation."""
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        product_name = self.product_snapshot.get('name', 'Unknown Product')
        return f"{self.quantity}x {product_name} in Order {self.order.order_number}"


class Payment(models.Model):
    """
    Payment transaction.
    
    A Payment represents a financial transaction processed through Stripe
    for an order. It tracks the payment status, amount, currency, and
    payment method used. Each payment is linked to a single order via
    a one-to-one relationship.
    """
    
    id = models.AutoField(primary_key=True)
    order = models.OneToOneField(
        Order,
        on_delete=models.PROTECT,
        related_name='payment'
    )
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=50)  # Stripe payment status
    payment_method = models.CharField(max_length=50)  # card, wallet, etc.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        indexes = [
            models.Index(fields=['stripe_payment_intent_id'], name='payment_stripe_intent_idx'),
        ]
    
    def clean(self):
        """
        Validate payment data.
        
        Ensures that:
        - Amount is positive (> 0)
        """
        from django.core.exceptions import ValidationError
        
        if self.amount is not None and self.amount <= 0:
            raise ValidationError({
                'amount': 'Payment amount must be a positive value.'
            })
    
    def save(self, *args, **kwargs):
        """Override save to run validation."""
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Payment for Order {self.order.order_number} - {self.amount} {self.currency}"


class Refund(models.Model):
    """
    Refund transaction.
    
    A Refund represents a reversal of a payment transaction processed
    through Stripe. Refunds are associated with a payment and track the
    refund amount, reason, and status. Multiple partial refunds can be
    issued for a single payment.
    """
    
    id = models.AutoField(primary_key=True)
    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        related_name='refunds'
    )
    stripe_refund_id = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=255)
    status = models.CharField(max_length=50)  # Stripe refund status
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'refund'
        verbose_name = 'Refund'
        verbose_name_plural = 'Refunds'
        indexes = [
            models.Index(fields=['stripe_refund_id'], name='refund_stripe_id_idx'),
        ]
        ordering = ['-created_at']
    
    def clean(self):
        """
        Validate refund data.
        
        Ensures that:
        - Amount is positive (> 0)
        """
        from django.core.exceptions import ValidationError
        
        if self.amount is not None and self.amount <= 0:
            raise ValidationError({
                'amount': 'Refund amount must be a positive value.'
            })
    
    def save(self, *args, **kwargs):
        """Override save to run validation."""
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Refund {self.stripe_refund_id} - {self.amount} {self.payment.currency}"


class ProductSearchIndex(models.Model):
    """
    Denormalized search index for products.
    
    A ProductSearchIndex provides optimized full-text search capabilities
    for products within a store. It maintains denormalized data including
    lowercase versions of searchable fields and a PostgreSQL full-text
    search vector for efficient query performance. This index is automatically
    updated when products are created, modified, or deleted.
    """
    
    id = models.AutoField(primary_key=True)
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='search_index'
    )
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        related_name='search_indexes',
        db_index=True
    )
    search_vector = models.TextField()  # PostgreSQL full-text search vector
    name_lower = models.CharField(max_length=255, db_index=True)
    category_lower = models.CharField(max_length=100, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_search_index'
        verbose_name = 'Product Search Index'
        verbose_name_plural = 'Product Search Indexes'
        indexes = [
            models.Index(fields=['store', 'name_lower'], name='search_store_name_idx'),
            models.Index(fields=['store', 'category_lower'], name='search_store_category_idx'),
        ]
    
    def __str__(self):
        return f"Search Index for {self.product.name}"


class AuthenticationLog(models.Model):
    """
    Log of authentication attempts for security auditing.
    
    An AuthenticationLog records all authentication attempts (successful
    and failed) for both business and customer accounts. This provides
    an audit trail for security monitoring and incident investigation.
    """
    
    USER_TYPE_CHOICES = [
        ('business', 'Business'),
        ('customer', 'Customer'),
    ]
    
    id = models.AutoField(primary_key=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, db_index=True)
    email = models.EmailField(db_index=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(null=True, blank=True)
    success = models.BooleanField(default=False, db_index=True)
    failure_reason = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'authentication_log'
        verbose_name = 'Authentication Log'
        verbose_name_plural = 'Authentication Logs'
        indexes = [
            models.Index(fields=['user_type', 'email', '-created_at'], name='auth_log_user_email_idx'),
            models.Index(fields=['ip_address', '-created_at'], name='auth_log_ip_idx'),
            models.Index(fields=['success', '-created_at'], name='auth_log_success_idx'),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{status} - {self.user_type} {self.email} from {self.ip_address}"
