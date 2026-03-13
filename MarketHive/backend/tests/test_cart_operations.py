"""
Unit tests for shopping cart operations.

Tests cart management, item additions, and calculations.
"""

import pytest
from decimal import Decimal
from django.test import Client
from api.models import Business, Store, Product, Customer, Cart, CartItem
from api.services import (
    OnboardingService, StoreManagementService, 
    ProductManagementService, CustomerService, CartService
)


@pytest.fixture
def client():
    """Django test client fixture."""
    return Client()


@pytest.fixture
def test_store(db):
    """Create a test store."""
    business_data = {
        'business_name': 'Test Business',
        'email': 'business@example.com',
        'password': 'SecurePass123',
        'business_details': 'Test'
    }
    business = OnboardingService.register_business(business_data)
    business.email_verified = True
    business.save()
    
    store_data = {
        'name': 'Test Store',
        'subdomain': 'teststore',
        'description': 'Test store'
    }
    return StoreManagementService.create_store(business.id, store_data)


@pytest.fixture
def test_product(test_store):
    """Create a test product."""
    data = {
        'name': 'Test Product',
        'description': 'A test product',
        'price': Decimal('19.99'),
        'quantity': 100,
        'category': 'Electronics'
    }
    return ProductManagementService.create_product(
        test_store.id, 
        test_store.business_id, 
        data
    )


@pytest.fixture
def test_customer(db):
    """Create a test customer."""
    data = {
        'name': 'Test Customer',
        'email': 'customer@example.com',
        'password': 'SecurePass123',
        'phone': '555-1234'
    }
    return CustomerService.register_customer(data)


@pytest.fixture(autouse=True)
def cleanup_test_data(db):
    """Clean up test data."""
    CartItem.objects.all().delete()
    Cart.objects.all().delete()
    Product.objects.all().delete()
    Store.objects.all().delete()
    Customer.objects.all().delete()
    Business.objects.all().delete()
    yield
    CartItem.objects.all().delete()
    Cart.objects.all().delete()
    Product.objects.all().delete()
    Store.objects.all().delete()
    Customer.objects.all().delete()
    Business.objects.all().delete()


@pytest.mark.django_db
class TestCartOperations:
    """Test suite for cart operations."""
    
    def test_add_item_to_cart(self, test_customer, test_product):
        """Test adding item to cart."""
        cart_item = CartService.add_item(
            store_id=test_product.store_id,
            product_id=test_product.id,
            quantity=2,
            customer_id=test_customer.id
        )
        
        assert cart_item.id is not None
        assert cart_item.product_id == test_product.id
        assert cart_item.quantity == 2
        assert cart_item.price_at_addition == test_product.price
    
    def test_quantity_exceeding_stock_rejected(self, test_customer, test_product):
        """Test that quantity exceeding stock is rejected."""
        from rest_framework.exceptions import ValidationError
        
        with pytest.raises(ValidationError) as exc_info:
            CartService.add_item(
                store_id=test_product.store_id,
                product_id=test_product.id,
                quantity=test_product.quantity + 10,
                customer_id=test_customer.id
            )
        
        assert 'quantity' in str(exc_info.value).lower() or 'stock' in str(exc_info.value).lower()
    
    def test_cart_item_quantity_can_be_updated(self, test_customer, test_product):
        """Test that cart item quantity can be updated."""
        cart_item = CartService.add_item(
            store_id=test_product.store_id,
            product_id=test_product.id,
            quantity=2,
            customer_id=test_customer.id
        )
        
        updated_item = CartService.update_item_quantity(
            cart_item.id, 
            5, 
            customer_id=test_customer.id
        )
        
        assert updated_item.quantity == 5
    
    def test_cart_item_can_be_removed(self, test_customer, test_product):
        """Test that cart item can be removed."""
        cart_item = CartService.add_item(
            store_id=test_product.store_id,
            product_id=test_product.id,
            quantity=2,
            customer_id=test_customer.id
        )
        
        CartService.remove_item(cart_item.id, customer_id=test_customer.id)
        
        assert not CartItem.objects.filter(id=cart_item.id).exists()
    
    def test_cart_total_calculated_correctly(self, test_customer, test_product, test_store):
        """Test that cart total is calculated correctly."""
        # Create another product
        product2_data = {
            'name': 'Product 2',
            'description': 'Second product',
            'price': Decimal('15.00'),
            'quantity': 50,
            'category': 'Books'
        }
        product2 = ProductManagementService.create_product(
            test_store.id, 
            test_store.business_id, 
            product2_data
        )
        
        CartService.add_item(
            test_store.id, 
            test_product.id, 
            2, 
            customer_id=test_customer.id
        )
        CartService.add_item(
            test_store.id, 
            product2.id, 
            3, 
            customer_id=test_customer.id
        )
        
        cart_data = CartService.get_cart(
            test_store.id, 
            customer_id=test_customer.id
        )
        
        expected_total = (test_product.price * 2) + (product2.price * 3)
        assert cart_data['subtotal'] == expected_total


@pytest.mark.django_db
class TestGuestCart:
    """Test suite for guest cart functionality."""
    
    def test_guest_cart_can_be_created(self, test_product):
        """Test that guest cart can be created with session ID."""
        cart_item = CartService.add_item(
            store_id=test_product.store_id,
            product_id=test_product.id,
            quantity=1,
            session_id='guest-session-123'
        )
        
        assert cart_item.id is not None
        assert cart_item.cart.session_id == 'guest-session-123'
        assert cart_item.cart.customer_id is None
    
    def test_guest_can_add_items_to_cart(self, test_product):
        """Test that guest can add items to cart."""
        cart_item = CartService.add_item(
            store_id=test_product.store_id,
            product_id=test_product.id,
            quantity=1,
            session_id='guest-session-456'
        )
        
        assert cart_item.id is not None
        assert cart_item.cart.session_id == 'guest-session-456'
