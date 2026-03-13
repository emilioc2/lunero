"""
Serializers for API request/response data.

This module contains Django REST Framework serializers for validating
and transforming data between JSON and Python objects.
"""

from rest_framework import serializers
from .models import Business, Store


class BusinessRegistrationSerializer(serializers.Serializer):
    """
    Serializer for business registration requests.
    
    Validates business registration data including email format,
    password requirements, and required fields.
    """
    
    business_name = serializers.CharField(
        max_length=255,
        required=True,
        help_text="Name of the business"
    )
    
    email = serializers.EmailField(
        required=True,
        help_text="Business email address"
    )
    
    password = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
        required=True,
        help_text="Password (minimum 8 characters)"
    )
    
    business_details = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Additional business information"
    )
    
    def validate_email(self, value):
        """
        Validate email format and normalize.
        
        Args:
            value (str): Email address to validate
        
        Returns:
            str: Normalized email address (lowercase)
        """
        return value.lower().strip()
    
    def validate_business_name(self, value):
        """
        Validate business name.
        
        Args:
            value (str): Business name to validate
        
        Returns:
            str: Trimmed business name
        
        Raises:
            ValidationError: If business name is empty after trimming
        """
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Business name cannot be empty.")
        return value


class BusinessResponseSerializer(serializers.ModelSerializer):
    """
    Serializer for business response data.
    
    Returns business information without sensitive fields like password_hash.
    """
    
    class Meta:
        model = Business
        fields = [
            'id',
            'business_name',
            'email',
            'business_details',
            'email_verified',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields


class EmailVerificationSerializer(serializers.Serializer):
    """
    Serializer for email verification requests.
    
    Validates the verification token provided by the user.
    """
    
    token = serializers.CharField(
        required=True,
        help_text="Email verification token"
    )
    
    def validate_token(self, value):
        """
        Validate token format.
        
        Args:
            value (str): Token to validate
        
        Returns:
            str: Trimmed token
        
        Raises:
            ValidationError: If token is empty after trimming
        """
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Verification token cannot be empty.")
        return value


class BusinessLoginSerializer(serializers.Serializer):
    """
    Serializer for business login requests.
    
    Validates login credentials including email and password.
    """
    
    email = serializers.EmailField(
        required=True,
        help_text="Business email address"
    )
    
    password = serializers.CharField(
        required=True,
        write_only=True,
        help_text="Business password"
    )
    
    def validate_email(self, value):
        """
        Validate email format and normalize.
        
        Args:
            value (str): Email address to validate
        
        Returns:
            str: Normalized email address (lowercase)
        """
        return value.lower().strip()



class StoreCreationSerializer(serializers.Serializer):
    """
    Serializer for store creation requests.
    
    Validates store creation data including subdomain format,
    required fields, and optional branding configuration.
    """
    
    name = serializers.CharField(
        max_length=255,
        required=True,
        help_text="Store name"
    )
    
    subdomain = serializers.CharField(
        max_length=100,
        required=True,
        help_text="Unique subdomain identifier (e.g., 'mystore' for mystore.platform.com)"
    )
    
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Store description"
    )
    
    color_scheme = serializers.JSONField(
        required=False,
        help_text="Color scheme configuration {primary, secondary, accent}"
    )
    
    theme = serializers.CharField(
        max_length=50,
        required=False,
        default='default',
        help_text="Theme name"
    )
    
    def validate_name(self, value):
        """
        Validate store name.
        
        Args:
            value (str): Store name to validate
        
        Returns:
            str: Trimmed store name
        
        Raises:
            ValidationError: If store name is empty after trimming
        """
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Store name cannot be empty.")
        return value
    
    def validate_subdomain(self, value):
        """
        Validate subdomain format.
        
        Args:
            value (str): Subdomain to validate
        
        Returns:
            str: Normalized subdomain (lowercase, trimmed)
        
        Raises:
            ValidationError: If subdomain is invalid
        
        Implementation Notes:
            - Subdomain must be alphanumeric with hyphens only
            - Cannot start or end with hyphen
            - Must be 3-100 characters long
            - Normalized to lowercase for consistency
        """
        import re
        
        value = value.lower().strip()
        
        # Check length
        if len(value) < 3:
            raise serializers.ValidationError(
                "Subdomain must be at least 3 characters long."
            )
        
        # Check format: alphanumeric and hyphens only, cannot start/end with hyphen
        if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$', value):
            raise serializers.ValidationError(
                "Subdomain must contain only lowercase letters, numbers, and hyphens. "
                "Cannot start or end with a hyphen."
            )
        
        return value


class StoreResponseSerializer(serializers.ModelSerializer):
    """
    Serializer for store response data.
    
    Returns store information including branding configuration.
    """
    
    business_id = serializers.IntegerField(source='business.id', read_only=True)
    business_name = serializers.CharField(source='business.business_name', read_only=True)
    
    class Meta:
        model = Store
        fields = [
            'id',
            'business_id',
            'business_name',
            'name',
            'subdomain',
            'description',
            'logo_url',
            'color_scheme',
            'theme',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields


class StoreUpdateSerializer(serializers.Serializer):
    """
    Serializer for store update requests.
    
    Validates store configuration updates including name, description,
    color scheme, and theme changes.
    """
    
    name = serializers.CharField(
        max_length=255,
        required=False,
        help_text="Store name"
    )
    
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Store description"
    )
    
    color_scheme = serializers.JSONField(
        required=False,
        help_text="Color scheme configuration {primary, secondary, accent}"
    )
    
    theme = serializers.CharField(
        max_length=50,
        required=False,
        help_text="Theme name"
    )
    
    def validate_name(self, value):
        """
        Validate store name.
        
        Args:
            value (str): Store name to validate
        
        Returns:
            str: Trimmed store name
        
        Raises:
            ValidationError: If store name is empty after trimming
        """
        if value is not None:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Store name cannot be empty.")
        return value


class ProductCreationSerializer(serializers.Serializer):
    """
    Serializer for product creation requests.
    
    Validates product creation data including name, description, price,
    quantity, category, and weight for shipping calculations.
    """
    
    name = serializers.CharField(
        max_length=255,
        required=True,
        help_text="Product name"
    )
    
    description = serializers.CharField(
        required=True,
        help_text="Product description"
    )
    
    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=True,
        help_text="Product price (must be positive)"
    )
    
    quantity = serializers.IntegerField(
        required=True,
        help_text="Product quantity (must be non-negative)"
    )
    
    category = serializers.CharField(
        max_length=100,
        required=True,
        help_text="Product category"
    )
    
    weight_grams = serializers.IntegerField(
        required=False,
        default=0,
        help_text="Product weight in grams for shipping calculation"
    )
    
    def validate_name(self, value):
        """Validate product name is not empty."""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Product name cannot be empty.")
        return value
    
    def validate_price(self, value):
        """Validate price is positive (Requirement 5.5)."""
        if value <= 0:
            raise serializers.ValidationError("Price must be a positive value.")
        return value
    
    def validate_quantity(self, value):
        """Validate quantity is non-negative (Requirement 5.6)."""
        if value < 0:
            raise serializers.ValidationError("Quantity must be a non-negative value.")
        return value
    
    def validate_category(self, value):
        """Validate category is not empty."""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Category cannot be empty.")
        return value
    
    def validate_weight_grams(self, value):
        """Validate weight is non-negative."""
        if value < 0:
            raise serializers.ValidationError("Weight must be a non-negative value.")
        return value


class ProductUpdateSerializer(serializers.Serializer):
    """
    Serializer for product update requests.
    
    Validates product update data. All fields are optional for partial updates.
    """
    
    name = serializers.CharField(
        max_length=255,
        required=False,
        help_text="Product name"
    )
    
    description = serializers.CharField(
        required=False,
        help_text="Product description"
    )
    
    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        help_text="Product price (must be positive)"
    )
    
    quantity = serializers.IntegerField(
        required=False,
        help_text="Product quantity (must be non-negative)"
    )
    
    category = serializers.CharField(
        max_length=100,
        required=False,
        help_text="Product category"
    )
    
    weight_grams = serializers.IntegerField(
        required=False,
        help_text="Product weight in grams for shipping calculation"
    )
    
    def validate_name(self, value):
        """Validate product name is not empty."""
        if value is not None:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Product name cannot be empty.")
        return value
    
    def validate_price(self, value):
        """Validate price is positive (Requirement 5.5)."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Price must be a positive value.")
        return value
    
    def validate_quantity(self, value):
        """Validate quantity is non-negative (Requirement 5.6)."""
        if value is not None and value < 0:
            raise serializers.ValidationError("Quantity must be a non-negative value.")
        return value
    
    def validate_category(self, value):
        """Validate category is not empty."""
        if value is not None:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Category cannot be empty.")
        return value
    
    def validate_weight_grams(self, value):
        """Validate weight is non-negative."""
        if value is not None and value < 0:
            raise serializers.ValidationError("Weight must be a non-negative value.")
        return value


class ProductResponseSerializer(serializers.Serializer):
    """
    Serializer for product response data.
    
    Returns product information including store context and images.
    """
    
    id = serializers.IntegerField(read_only=True)
    store_id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    quantity = serializers.IntegerField(read_only=True)
    category = serializers.CharField(read_only=True)
    weight_grams = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    images = serializers.SerializerMethodField()
    
    def get_images(self, obj):
        """Get product images."""
        from .models import Product
        if isinstance(obj, Product):
            return [
                {
                    'id': img.id,
                    'url': img.url,
                    'thumbnail_url': img.thumbnail_url,
                    'medium_url': img.medium_url,
                    'is_primary': img.is_primary,
                    'display_order': img.display_order
                }
                for img in obj.images.all()
            ]
        return []



class ProductCreationSerializer(serializers.Serializer):
    """
    Serializer for product creation requests.
    
    Validates product creation data including required fields,
    price and quantity validation, and optional fields.
    """
    
    name = serializers.CharField(
        max_length=255,
        required=True,
        help_text="Product name"
    )
    
    description = serializers.CharField(
        required=True,
        help_text="Product description"
    )
    
    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=True,
        help_text="Product price (must be positive)"
    )
    
    quantity = serializers.IntegerField(
        required=True,
        help_text="Product quantity (must be non-negative)"
    )
    
    category = serializers.CharField(
        max_length=100,
        required=True,
        help_text="Product category"
    )
    
    weight_grams = serializers.IntegerField(
        required=False,
        default=0,
        help_text="Product weight in grams for shipping calculation"
    )
    
    def validate_price(self, value):
        """Validate price is positive."""
        if value <= 0:
            raise serializers.ValidationError("Price must be a positive value.")
        return value
    
    def validate_quantity(self, value):
        """Validate quantity is non-negative."""
        if value < 0:
            raise serializers.ValidationError("Quantity must be a non-negative value.")
        return value


class ProductUpdateSerializer(serializers.Serializer):
    """
    Serializer for product update requests.
    
    All fields are optional for partial updates.
    """
    
    name = serializers.CharField(
        max_length=255,
        required=False,
        help_text="Product name"
    )
    
    description = serializers.CharField(
        required=False,
        help_text="Product description"
    )
    
    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        help_text="Product price (must be positive)"
    )
    
    quantity = serializers.IntegerField(
        required=False,
        help_text="Product quantity (must be non-negative)"
    )
    
    category = serializers.CharField(
        max_length=100,
        required=False,
        help_text="Product category"
    )
    
    weight_grams = serializers.IntegerField(
        required=False,
        help_text="Product weight in grams"
    )
    
    def validate_price(self, value):
        """Validate price is positive."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Price must be a positive value.")
        return value
    
    def validate_quantity(self, value):
        """Validate quantity is non-negative."""
        if value is not None and value < 0:
            raise serializers.ValidationError("Quantity must be a non-negative value.")
        return value


class ProductImageSerializer(serializers.Serializer):
    """
    Serializer for product image responses.
    """
    
    id = serializers.IntegerField(read_only=True)
    url = serializers.URLField(read_only=True)
    thumbnail_url = serializers.URLField(read_only=True)
    medium_url = serializers.URLField(read_only=True)
    is_primary = serializers.BooleanField(read_only=True)
    display_order = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class ProductResponseSerializer(serializers.Serializer):
    """
    Serializer for product responses.
    """
    
    id = serializers.IntegerField(read_only=True)
    store_id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    quantity = serializers.IntegerField(read_only=True)
    category = serializers.CharField(read_only=True)
    weight_grams = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    
    # Computed field
    available = serializers.SerializerMethodField()
    
    def get_available(self, obj):
        """Product is available if quantity > 0."""
        return obj.quantity > 0



class CustomerRegistrationSerializer(serializers.Serializer):
    """
    Serializer for customer registration requests.
    """
    
    name = serializers.CharField(
        max_length=255,
        required=True,
        help_text="Customer name"
    )
    
    email = serializers.EmailField(
        required=True,
        help_text="Customer email address"
    )
    
    password = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
        required=True,
        help_text="Password (minimum 8 characters)"
    )
    
    def validate_email(self, value):
        """Normalize email to lowercase."""
        return value.lower().strip()
    
    def validate_name(self, value):
        """Validate name is not empty."""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Customer name cannot be empty.")
        return value


class CustomerResponseSerializer(serializers.Serializer):
    """
    Serializer for customer response data.
    """
    
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    email_verified = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class CustomerLoginSerializer(serializers.Serializer):
    """
    Serializer for customer login requests.
    """
    
    email = serializers.EmailField(
        required=True,
        help_text="Customer email address"
    )
    
    password = serializers.CharField(
        required=True,
        write_only=True,
        help_text="Customer password"
    )
    
    def validate_email(self, value):
        """Normalize email to lowercase."""
        return value.lower().strip()


class CustomerProfileUpdateSerializer(serializers.Serializer):
    """
    Serializer for customer profile update requests.
    """
    
    name = serializers.CharField(
        max_length=255,
        required=False,
        help_text="Customer name"
    )
    
    email = serializers.EmailField(
        required=False,
        help_text="Customer email address"
    )
    
    def validate_name(self, value):
        """Validate name is not empty."""
        if value is not None:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Customer name cannot be empty.")
        return value
    
    def validate_email(self, value):
        """Normalize email to lowercase."""
        if value is not None:
            return value.lower().strip()
        return value



class CartItemAddSerializer(serializers.Serializer):
    """
    Serializer for adding items to cart.
    """
    
    product_id = serializers.IntegerField(
        required=True,
        help_text="ID of the product to add"
    )
    
    quantity = serializers.IntegerField(
        required=True,
        help_text="Quantity to add"
    )
    
    def validate_quantity(self, value):
        """Validate quantity is positive."""
        if value <= 0:
            raise serializers.ValidationError("Quantity must be positive.")
        return value


class CartItemUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating cart item quantity.
    """
    
    quantity = serializers.IntegerField(
        required=True,
        help_text="New quantity (0 to remove)"
    )
    
    def validate_quantity(self, value):
        """Validate quantity is non-negative."""
        if value < 0:
            raise serializers.ValidationError("Quantity must be non-negative.")
        return value


class CartItemResponseSerializer(serializers.Serializer):
    """
    Serializer for cart item responses.
    """
    
    id = serializers.IntegerField(read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    quantity = serializers.IntegerField(read_only=True)
    price_at_addition = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    subtotal = serializers.SerializerMethodField()
    available_quantity = serializers.IntegerField(source='product.quantity', read_only=True)
    
    def get_product_image(self, obj):
        """Get primary product image thumbnail."""
        primary_image = obj.product.images.filter(is_primary=True).first()
        if primary_image:
            return primary_image.thumbnail_url
        # Return first image if no primary
        first_image = obj.product.images.first()
        if first_image:
            return first_image.thumbnail_url
        return None
    
    def get_subtotal(self, obj):
        """Calculate item subtotal."""
        return obj.price_at_addition * obj.quantity


class CartResponseSerializer(serializers.Serializer):
    """
    Serializer for cart responses.
    """
    
    cart_id = serializers.IntegerField(source='cart.id', read_only=True)
    store_id = serializers.IntegerField(source='cart.store_id', read_only=True)
    items = serializers.SerializerMethodField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    
    def get_items(self, obj):
        """Serialize cart items."""
        items = obj.get('items', [])
        return CartItemResponseSerializer(items, many=True).data
