"""
Unit tests for product management functionality.

Tests product CRUD operations and validation.
"""

import pytest
from decimal import Decimal
from django.test import Client
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError
from api.models import Business, Store, Product
from api.services import OnboardingService, StoreManagementService, ProductManagementService


@pytest.fixture
def client():
    """Django test client fixture."""
    return Client()


@pytest.fixture
def test_store(db):
    """Create a test store with verified business."""
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


@pytest.fixture(autouse=True)
def cleanup_test_data(db):
    """Clean up test data."""
    Product.objects.all().delete()
    Store.objects.all().delete()
    Business.objects.all().delete()
    yield
    Product.objects.all().delete()
    Store.objects.all().delete()
    Business.objects.all().delete()


@pytest.mark.django_db
class TestProductCreation:
    """Test suite for product creation."""
    
    def test_valid_product_data_creates_product(self, test_store):
        """Test that valid product data creates product."""
        data = {
            'name': 'New Product',
            'description': 'A new product',
            'price': Decimal('29.99'),
            'quantity': 50,
            'category': 'Books'
        }
        
        product = ProductManagementService.create_product(
            test_store.id, 
            test_store.business_id, 
            data
        )
        
        assert product.id is not None
        assert product.name == 'New Product'
        assert product.price == Decimal('29.99')
        assert product.quantity == 50
        assert product.store_id == test_store.id
    
    def test_negative_price_rejected(self, test_store):
        """Test that negative price is rejected."""
        from django.core.exceptions import ValidationError as DjangoValidationError
        
        data = {
            'name': 'Invalid Product',
            'description': 'Test',
            'price': Decimal('-10.00'),
            'quantity': 10,
            'category': 'Test'
        }
        
        with pytest.raises((ValidationError, DjangoValidationError)) as exc_info:
            ProductManagementService.create_product(
                test_store.id, 
                test_store.business_id, 
                data
            )
        
        assert 'price' in str(exc_info.value).lower()
    
    def test_negative_quantity_rejected(self, test_store):
        """Test that negative quantity is rejected."""
        from django.core.exceptions import ValidationError as DjangoValidationError
        
        data = {
            'name': 'Invalid Product',
            'description': 'Test',
            'price': Decimal('10.00'),
            'quantity': -5,
            'category': 'Test'
        }
        
        with pytest.raises((ValidationError, DjangoValidationError)) as exc_info:
            ProductManagementService.create_product(
                test_store.id, 
                test_store.business_id, 
                data
            )
        
        assert 'quantity' in str(exc_info.value).lower()


@pytest.mark.django_db
class TestProductUpdates:
    """Test suite for product updates."""
    
    def test_product_can_be_updated(self, test_product):
        """Test that product can be updated."""
        update_data = {
            'name': 'Updated Product',
            'price': Decimal('24.99'),
            'quantity': 75
        }
        
        updated_product = ProductManagementService.update_product(
            test_product.id,
            test_product.store.business_id,
            update_data
        )
        
        assert updated_product.name == 'Updated Product'
        assert updated_product.price == Decimal('24.99')
        assert updated_product.quantity == 75
    
    def test_product_update_updates_timestamp(self, test_product):
        """Test that product update updates timestamp."""
        original_updated_at = test_product.updated_at
        
        update_data = {'name': 'Updated Name'}
        updated_product = ProductManagementService.update_product(
            test_product.id,
            test_product.store.business_id,
            update_data
        )
        
        assert updated_product.updated_at > original_updated_at


@pytest.mark.django_db
class TestProductDeletion:
    """Test suite for product deletion."""
    
    def test_product_can_be_deleted(self, test_product):
        """Test that product can be deleted."""
        product_id = test_product.id
        business_id = test_product.store.business_id
        
        ProductManagementService.delete_product(product_id, business_id)
        
        assert not Product.objects.filter(id=product_id).exists()
    
    def test_deleted_product_not_accessible(self, client, test_product):
        """Test that deleted product is not accessible."""
        ProductManagementService.delete_product(
            test_product.id,
            test_product.store.business_id
        )
        
        response = client.get(f'/api/v1/products/{test_product.id}')
        assert response.status_code == 404


@pytest.mark.django_db
class TestProductBrowsing:
    """Test suite for product browsing."""
    
    def test_products_can_be_listed(self, client, test_store, test_product):
        """Test that products can be listed."""
        response = client.get(f'/api/v1/stores/{test_store.id}/products')
        
        assert response.status_code == 200
        response_data = response.json()
        assert 'products' in response_data
        assert len(response_data['products']) > 0
    
    def test_product_detail_accessible(self, client, test_product):
        """Test that product detail is accessible."""
        response = client.get(f'/api/v1/products/{test_product.id}')
        
        assert response.status_code == 200
        response_data = response.json()
        assert response_data['id'] == test_product.id
        assert response_data['name'] == test_product.name
