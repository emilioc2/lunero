"""
Unit tests for store management functionality.

Tests store creation, updates, and configuration.
"""

import pytest
from django.test import Client
from api.models import Business, Store
from api.services import OnboardingService, StoreManagementService


@pytest.fixture
def client():
    """Django test client fixture."""
    return Client()


@pytest.fixture
def verified_business(db):
    """Create a verified business account."""
    data = {
        'business_name': 'Test Business',
        'email': 'business@example.com',
        'password': 'SecurePass123',
        'business_details': 'Test business'
    }
    business = OnboardingService.register_business(data)
    business.email_verified = True
    business.save()
    return business


@pytest.fixture
def test_store(verified_business):
    """Create a test store."""
    data = {
        'name': 'Test Store',
        'subdomain': 'teststore',
        'description': 'A test store'
    }
    return StoreManagementService.create_store(verified_business.id, data)


@pytest.fixture(autouse=True)
def cleanup_test_data(db):
    """Clean up test data."""
    Store.objects.filter(subdomain__contains='test').delete()
    Business.objects.filter(email__contains='test').delete()
    yield
    Store.objects.filter(subdomain__contains='test').delete()
    Business.objects.filter(email__contains='test').delete()


@pytest.mark.django_db
class TestStoreCreation:
    """Test suite for store creation."""
    
    def test_verified_business_can_create_store(self, verified_business):
        """Test that verified business can create store."""
        data = {
            'name': 'New Store',
            'subdomain': 'newstore',
            'description': 'A new store'
        }
        
        store = StoreManagementService.create_store(verified_business.id, data)
        
        assert store.id is not None
        assert store.name == 'New Store'
        assert store.subdomain == 'newstore'
        assert store.business_id == verified_business.id
    
    def test_duplicate_subdomain_rejected(self, verified_business, test_store):
        """Test that duplicate subdomain is rejected."""
        from rest_framework.exceptions import ValidationError
        
        data = {
            'name': 'Another Store',
            'subdomain': 'teststore',  # Duplicate
            'description': 'Another store'
        }
        
        with pytest.raises(ValidationError) as exc_info:
            StoreManagementService.create_store(verified_business.id, data)
        
        assert 'subdomain' in str(exc_info.value).lower()
    
    def test_unverified_business_cannot_create_store(self, db):
        """Test that unverified business cannot create store."""
        from rest_framework.exceptions import ValidationError
        
        data = {
            'business_name': 'Unverified Business',
            'email': 'unverified@example.com',
            'password': 'SecurePass123',
            'business_details': 'Test'
        }
        business = OnboardingService.register_business(data)
        
        store_data = {
            'name': 'Test Store',
            'subdomain': 'teststore2',
            'description': 'Test'
        }
        
        with pytest.raises(ValidationError) as exc_info:
            StoreManagementService.create_store(business.id, store_data)
        
        assert 'verified' in str(exc_info.value).lower()


@pytest.mark.django_db
class TestStoreUpdates:
    """Test suite for store updates."""
    
    def test_store_settings_can_be_updated(self, test_store):
        """Test that store settings can be updated."""
        update_data = {
            'name': 'Updated Store Name',
            'description': 'Updated description',
            'color_scheme': {'primary': '#FF0000', 'secondary': '#00FF00'}
        }
        
        updated_store = StoreManagementService.update_store(
            test_store.id, 
            test_store.business_id, 
            update_data
        )
        
        assert updated_store.name == 'Updated Store Name'
        assert updated_store.description == 'Updated description'
        assert updated_store.color_scheme['primary'] == '#FF0000'
    
    def test_store_accessible_via_subdomain(self, client, test_store):
        """Test that store is accessible via subdomain."""
        response = client.get(f'/api/v1/stores/by-subdomain/{test_store.subdomain}')
        
        assert response.status_code == 200
        response_data = response.json()
        assert response_data['subdomain'] == test_store.subdomain
        assert response_data['name'] == test_store.name
