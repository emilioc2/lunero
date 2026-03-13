"""
Unit tests for email verification functionality.

Tests Requirements 1.4 and 1.5 from the specification.
"""

import pytest
from django.test import Client
from django.core import mail
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


@pytest.fixture
def registered_business(db):
    """Create a registered business with unverified email."""
    data = {
        'business_name': 'Test Business',
        'email': 'test@example.com',
        'password': 'SecurePass123',
        'business_details': 'Test business'
    }
    business = OnboardingService.register_business(data)
    OnboardingService.send_verification_email(business)
    return business


@pytest.mark.django_db
class TestEmailVerification:
    """Test suite for email verification functionality."""
    
    def test_verification_email_sent_on_registration(self, client):
        """
        Test that verification email is sent when Business_Account is created.
        
        Validates Requirement 1.4: WHEN a Business_Account is created,
        THE Onboarding_System SHALL send a verification email to the
        provided email address.
        """
        # Clear any existing emails
        mail.outbox = []
        
        response = client.post(
            '/api/v1/business/register',
            data={
                'business_name': 'Email Test Business',
                'email': 'emailtest@example.com',
                'password': 'SecurePass123',
                'business_details': 'Testing email'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 201
        
        # Verify email was sent
        assert len(mail.outbox) == 1
        email = mail.outbox[0]
        assert email.to == ['emailtest@example.com']
        assert 'verify' in email.subject.lower()
        assert 'verify-email?token=' in email.body
    
    def test_verification_token_generated_and_stored(self, registered_business):
        """
        Test that unique verification token is generated and stored.
        
        Validates that the system generates unique verification tokens
        for email verification.
        """
        # Refresh from database
        business = Business.objects.get(id=registered_business.id)
        
        # Verify token was generated and stored
        assert business.verification_token is not None
        assert len(business.verification_token) > 20  # URL-safe tokens are long
        assert business.email_verified is False
    
    def test_valid_token_verifies_email(self, client, registered_business):
        """
        Test that valid verification token successfully verifies email.
        
        Validates that the verify-email endpoint correctly processes
        valid tokens and updates the email_verified flag.
        """
        token = registered_business.verification_token
        
        response = client.post(
            '/api/v1/business/verify-email',
            data={'token': token},
            content_type='application/json'
        )
        
        assert response.status_code == 200
        response_data = response.json()
        assert 'message' in response_data
        assert 'verified' in response_data['message'].lower()
        
        # Verify database was updated
        business = Business.objects.get(id=registered_business.id)
        assert business.email_verified is True
        assert business.verification_token is None  # Token cleared after use
    
    def test_invalid_token_rejected(self, client):
        """
        Test that invalid verification token is rejected.
        
        Validates that the system rejects invalid or non-existent tokens.
        """
        response = client.post(
            '/api/v1/business/verify-email',
            data={'token': 'invalid-token-12345'},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        response_data = response.json()
        assert 'error' in response_data
        assert 'invalid' in response_data['error']['message'].lower()
    
    def test_already_verified_token_rejected(self, client, registered_business):
        """
        Test that token cannot be reused after verification.
        
        Validates that tokens are single-use and cannot be used
        to verify email multiple times.
        """
        token = registered_business.verification_token
        
        # First verification - should succeed
        response1 = client.post(
            '/api/v1/business/verify-email',
            data={'token': token},
            content_type='application/json'
        )
        assert response1.status_code == 200
        
        # Second verification with same token - should fail
        response2 = client.post(
            '/api/v1/business/verify-email',
            data={'token': token},
            content_type='application/json'
        )
        assert response2.status_code == 400
        response_data = response2.json()
        assert 'invalid' in response_data['error']['message'].lower()
    
    def test_empty_token_rejected(self, client):
        """Test that empty token is rejected."""
        response = client.post(
            '/api/v1/business/verify-email',
            data={'token': ''},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        response_data = response.json()
        assert 'token' in response_data['error']['details']
    
    def test_missing_token_rejected(self, client):
        """Test that missing token field is rejected."""
        response = client.post(
            '/api/v1/business/verify-email',
            data={},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        response_data = response.json()
        assert 'token' in response_data['error']['details']
    
    def test_verification_email_contains_token(self, registered_business):
        """
        Test that verification email contains the correct token.
        
        Validates that the email sent contains the token stored in database.
        """
        # Get the email that was sent
        assert len(mail.outbox) == 1
        email = mail.outbox[0]
        
        # Verify token is in email body
        assert registered_business.verification_token in email.body
    
    def test_verification_email_contains_business_name(self, registered_business):
        """Test that verification email is personalized with business name."""
        assert len(mail.outbox) == 1
        email = mail.outbox[0]
        
        # Verify business name is in email
        assert registered_business.business_name in email.body
    
    def test_multiple_businesses_get_unique_tokens(self, db):
        """
        Test that each business gets a unique verification token.
        
        Validates that tokens are unique across different businesses.
        """
        # Create first business
        business1 = OnboardingService.register_business({
            'business_name': 'Business 1',
            'email': 'business1@example.com',
            'password': 'SecurePass123',
            'business_details': 'First'
        })
        OnboardingService.send_verification_email(business1)
        
        # Create second business
        business2 = OnboardingService.register_business({
            'business_name': 'Business 2',
            'email': 'business2@example.com',
            'password': 'SecurePass123',
            'business_details': 'Second'
        })
        OnboardingService.send_verification_email(business2)
        
        # Verify tokens are different
        assert business1.verification_token != business2.verification_token
        assert business1.verification_token is not None
        assert business2.verification_token is not None


@pytest.mark.django_db
class TestOnboardingServiceEmailVerification:
    """Test suite for OnboardingService email verification methods."""
    
    def test_send_verification_email_generates_token(self, db):
        """Test that send_verification_email generates and stores token."""
        business = OnboardingService.register_business({
            'business_name': 'Service Test',
            'email': 'service@example.com',
            'password': 'SecurePass123',
            'business_details': 'Test'
        })
        
        # Initially no token
        assert business.verification_token is None
        
        # Send verification email
        OnboardingService.send_verification_email(business)
        
        # Refresh from database
        business.refresh_from_db()
        
        # Verify token was generated
        assert business.verification_token is not None
        assert len(business.verification_token) > 20
    
    def test_verify_email_with_valid_token(self, db):
        """Test that verify_email successfully verifies with valid token."""
        business = OnboardingService.register_business({
            'business_name': 'Verify Test',
            'email': 'verify@example.com',
            'password': 'SecurePass123',
            'business_details': 'Test'
        })
        OnboardingService.send_verification_email(business)
        
        token = business.verification_token
        
        # Verify email
        verified_business = OnboardingService.verify_email(token)
        
        assert verified_business.id == business.id
        assert verified_business.email_verified is True
        assert verified_business.verification_token is None
    
    def test_verify_email_with_invalid_token_raises_error(self, db):
        """Test that verify_email raises ValidationError for invalid token."""
        from rest_framework.exceptions import ValidationError
        
        with pytest.raises(ValidationError) as exc_info:
            OnboardingService.verify_email('invalid-token')
        
        assert 'token' in str(exc_info.value)
    
    def test_verify_email_with_empty_token_raises_error(self, db):
        """Test that verify_email raises ValidationError for empty token."""
        from rest_framework.exceptions import ValidationError
        
        with pytest.raises(ValidationError) as exc_info:
            OnboardingService.verify_email('')
        
        assert 'token' in str(exc_info.value)
    
    def test_verify_email_returns_business_instance(self, db):
        """Test that verify_email returns the verified Business instance."""
        business = OnboardingService.register_business({
            'business_name': 'Return Test',
            'email': 'return@example.com',
            'password': 'SecurePass123',
            'business_details': 'Test'
        })
        OnboardingService.send_verification_email(business)
        
        verified_business = OnboardingService.verify_email(business.verification_token)
        
        assert isinstance(verified_business, Business)
        assert verified_business.id == business.id
        assert verified_business.email == business.email
