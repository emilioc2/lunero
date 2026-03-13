"""
Unit tests for business registration endpoint.

Tests Requirements 1.1, 1.2, 1.3, and 20.1 from the specification.
"""

import pytest
import bcrypt
from django.test import Client
from api.models import Business
from api.services import OnboardingService


@pytest.fixture
def client():
    """Django test client fixture."""
    return Client()


@pytest.fixture(autouse=True)
def cleanup_test_data(db):
    """Clean up test data before and after each test."""
    Business.objects.filter(email__contains='test').delete()
    yield
    Business.objects.filter(email__contains='test').delete()


@pytest.mark.django_db
class TestBusinessRegistration:
    """Test suite for business registration endpoint."""
    
    def test_successful_registration_creates_account(self, client):
        """
        Test that valid business registration data creates a Business_Account.
        
        Validates Requirement 1.2: WHEN a Business submits valid registration data,
        THE Onboarding_System SHALL create a Business_Account.
        """
        response = client.post(
            '/api/v1/business/register',
            data={
                'business_name': 'Test Business',
                'email': 'test@example.com',
                'password': 'SecurePass123',
                'business_details': 'A test business'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 201
        
        # Verify business was created
        business = Business.objects.get(email='test@example.com')
        assert business.business_name == 'Test Business'
        assert business.email == 'test@example.com'
        assert business.business_details == 'A test business'
        assert business.email_verified is False
    
    def test_duplicate_email_returns_409(self, client):
        """
        Test that duplicate email registration returns 409 Conflict.
        
        Validates Requirement 1.3: WHEN a Business submits registration data with
        an email that already exists, THE Onboarding_System SHALL return an error
        message indicating the email is already registered.
        """
        # Create first business
        client.post(
            '/api/v1/business/register',
            data={
                'business_name': 'First Business',
                'email': 'duplicate@example.com',
                'password': 'SecurePass123',
                'business_details': 'First business'
            },
            content_type='application/json'
        )
        
        # Attempt to create second business with same email
        response = client.post(
            '/api/v1/business/register',
            data={
                'business_name': 'Second Business',
                'email': 'duplicate@example.com',
                'password': 'AnotherPass123',
                'business_details': 'Second business'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 409
        response_data = response.json()
        assert response_data['error']['code'] == 'RESOURCE_CONFLICT'
        assert 'email' in response_data['error']['message'].lower()
    
    def test_password_hashed_with_bcrypt_work_factor_12(self, client):
        """
        Test that passwords are hashed using bcrypt with work factor 12.
        
        Validates Requirement 20.1: THE Platform SHALL encrypt all passwords
        using bcrypt with a work factor of at least 12.
        """
        response = client.post(
            '/api/v1/business/register',
            data={
                'business_name': 'Test Business',
                'email': 'bcrypt@example.com',
                'password': 'MySecurePassword123',
                'business_details': 'Testing bcrypt'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 201
        
        # Verify password hashing
        business = Business.objects.get(email='bcrypt@example.com')
        password_hash = business.password_hash.encode('utf-8')
        
        # Verify password can be checked
        assert bcrypt.checkpw(b'MySecurePassword123', password_hash)
        
        # Verify work factor is 12
        # bcrypt hash format: $2b$12$... where 12 is the work factor
        work_factor = int(business.password_hash.split('$')[2])
        assert work_factor == 12
    
    def test_invalid_email_format_rejected(self, client):
        """Test that invalid email format is rejected with 400."""
        response = client.post(
            '/api/v1/business/register',
            data={
                'business_name': 'Test Business',
                'email': 'not-an-email',
                'password': 'SecurePass123',
                'business_details': 'Test'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 400
        response_data = response.json()
        assert 'email' in response_data['error']['details']
    
    def test_password_too_short_rejected(self, client):
        """Test that passwords shorter than 8 characters are rejected."""
        response = client.post(
            '/api/v1/business/register',
            data={
                'business_name': 'Test Business',
                'email': 'test@example.com',
                'password': 'short',
                'business_details': 'Test'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 400
        response_data = response.json()
        assert 'password' in response_data['error']['details']
    
    def test_missing_required_fields_rejected(self, client):
        """Test that missing required fields are rejected."""
        response = client.post(
            '/api/v1/business/register',
            data={
                'business_name': 'Test Business',
                # Missing email and password
            },
            content_type='application/json'
        )
        
        assert response.status_code == 400
        response_data = response.json()
        assert 'email' in response_data['error']['details']
        assert 'password' in response_data['error']['details']
    
    def test_business_details_optional(self, client):
        """Test that business_details field is optional."""
        response = client.post(
            '/api/v1/business/register',
            data={
                'business_name': 'Test Business',
                'email': 'optional@example.com',
                'password': 'SecurePass123',
                # business_details omitted
            },
            content_type='application/json'
        )
        
        assert response.status_code == 201
        business = Business.objects.get(email='optional@example.com')
        assert business.business_details == ''
    
    def test_email_normalized_to_lowercase(self, client):
        """Test that email addresses are normalized to lowercase."""
        response = client.post(
            '/api/v1/business/register',
            data={
                'business_name': 'Test Business',
                'email': 'Test@EXAMPLE.COM',
                'password': 'SecurePass123',
                'business_details': 'Test'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 201
        business = Business.objects.get(email='test@example.com')
        assert business.email == 'test@example.com'
    
    def test_response_excludes_password_hash(self, client):
        """Test that the response does not include the password hash."""
        response = client.post(
            '/api/v1/business/register',
            data={
                'business_name': 'Test Business',
                'email': 'secure@example.com',
                'password': 'SecurePass123',
                'business_details': 'Test'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 201
        response_data = response.json()
        assert 'password_hash' not in response_data
        assert 'password' not in response_data
        assert 'id' in response_data
        assert 'email' in response_data
        assert 'business_name' in response_data


@pytest.mark.django_db
class TestOnboardingService:
    """Test suite for OnboardingService."""
    
    def test_register_business_creates_account(self):
        """Test that register_business creates a Business account."""
        data = {
            'business_name': 'Service Test Business',
            'email': 'service@example.com',
            'password': 'SecurePass123',
            'business_details': 'Testing service layer'
        }
        
        business = OnboardingService.register_business(data)
        
        assert business.id is not None
        assert business.business_name == 'Service Test Business'
        assert business.email == 'service@example.com'
        assert business.email_verified is False
        
        # Verify password is hashed
        assert business.password_hash != 'SecurePass123'
        assert bcrypt.checkpw(b'SecurePass123', business.password_hash.encode('utf-8'))
    
    def test_register_business_duplicate_email_raises_error(self):
        """Test that duplicate email raises ValidationError."""
        data = {
            'business_name': 'First Business',
            'email': 'duplicate-service@example.com',
            'password': 'SecurePass123',
            'business_details': 'First'
        }
        
        # Create first business
        OnboardingService.register_business(data)
        
        # Attempt to create second with same email
        data['business_name'] = 'Second Business'
        
        from rest_framework.exceptions import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            OnboardingService.register_business(data)
        
        assert 'email' in str(exc_info.value)
