"""
Unit tests for business authentication endpoints.

Tests Requirements 2.1, 2.2, 2.3, 2.4, 2.5, and 20.7 from the specification.
"""

import pytest
import bcrypt
import jwt
from datetime import datetime, timedelta
from django.test import Client
from django.conf import settings
from api.models import Business, AuthenticationLog
from api.services import OnboardingService, AuthenticationService


@pytest.fixture
def client():
    """Django test client fixture."""
    return Client()


@pytest.fixture
def test_business(db):
    """Create a test business account."""
    data = {
        'business_name': 'Test Business',
        'email': 'auth@example.com',
        'password': 'SecurePass123',
        'business_details': 'Test business for authentication'
    }
    business = OnboardingService.register_business(data)
    # Store the plain password for testing
    business.plain_password = 'SecurePass123'
    return business


@pytest.fixture(autouse=True)
def cleanup_test_data(db):
    """Clean up test data before and after each test."""
    Business.objects.filter(email__contains='test').delete()
    Business.objects.filter(email__contains='auth').delete()
    AuthenticationLog.objects.all().delete()
    yield
    Business.objects.filter(email__contains='test').delete()
    Business.objects.filter(email__contains='auth').delete()
    AuthenticationLog.objects.all().delete()


@pytest.mark.django_db
class TestBusinessLogin:
    """Test suite for business login endpoint."""
    
    def test_valid_credentials_authenticate_successfully(self, client, test_business):
        """
        Test that valid credentials authenticate successfully.
        
        Validates Requirement 2.2: WHEN a Business provides valid credentials,
        THE Platform SHALL authenticate the Business_Account and grant access
        to the management dashboard.
        """
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'auth@example.com',
                'password': 'SecurePass123'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 200
        response_data = response.json()
        
        # Verify response contains tokens
        assert 'access_token' in response_data
        assert 'refresh_token' in response_data
        assert 'token_type' in response_data
        assert response_data['token_type'] == 'Bearer'
        assert 'expires_in' in response_data
        assert response_data['expires_in'] == 86400  # 24 hours
        
        # Verify business data is returned
        assert 'business' in response_data
        assert response_data['business']['email'] == 'auth@example.com'
        assert response_data['business']['business_name'] == 'Test Business'
    
    def test_invalid_password_rejected(self, client, test_business):
        """
        Test that invalid password is rejected with 401.
        
        Validates Requirement 2.3: WHEN a Business provides invalid credentials,
        THE Platform SHALL return an error message and deny access.
        """
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'auth@example.com',
                'password': 'WrongPassword123'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 401
        response_data = response.json()
        assert response_data['error']['code'] == 'AUTHENTICATION_FAILED'
        assert 'credentials' in response_data['error']['message'].lower()
    
    def test_nonexistent_email_rejected(self, client):
        """
        Test that non-existent email is rejected with 401.
        
        Validates Requirement 2.3: WHEN a Business provides invalid credentials,
        THE Platform SHALL return an error message and deny access.
        """
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'nonexistent@example.com',
                'password': 'SomePassword123'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 401
        response_data = response.json()
        assert response_data['error']['code'] == 'AUTHENTICATION_FAILED'
    
    def test_jwt_token_contains_business_id_claim(self, client, test_business):
        """
        Test that JWT token contains business_id claim.
        
        Validates that tokens include business_id for tenant context.
        """
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'auth@example.com',
                'password': 'SecurePass123'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 200
        response_data = response.json()
        
        # Decode token without verification to check claims
        access_token = response_data['access_token']
        decoded = jwt.decode(
            access_token,
            options={"verify_signature": False}
        )
        
        # Verify business_id claim
        assert 'business_id' in decoded
        assert decoded['business_id'] == test_business.id
        assert decoded['email'] == 'auth@example.com'
        assert decoded['user_type'] == 'business'
    
    def test_token_expires_in_24_hours(self, client, test_business):
        """
        Test that access token expires in 24 hours.
        
        Validates Requirement 2.4: THE Platform SHALL maintain authenticated
        Business_Account sessions for 24 hours.
        """
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'auth@example.com',
                'password': 'SecurePass123'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 200
        response_data = response.json()
        
        # Decode token to check expiration
        access_token = response_data['access_token']
        decoded = jwt.decode(
            access_token,
            options={"verify_signature": False}
        )
        
        # Verify expiration is approximately 24 hours from now
        exp_timestamp = decoded['exp']
        iat_timestamp = decoded['iat']
        token_lifetime = exp_timestamp - iat_timestamp
        
        # Should be 24 hours (86400 seconds), allow 60 second tolerance
        assert abs(token_lifetime - 86400) < 60
    
    def test_authentication_attempt_logged_with_ip(self, client, test_business):
        """
        Test that authentication attempts are logged with IP address.
        
        Validates Requirement 20.7: THE Platform SHALL log all authentication
        attempts for security auditing.
        """
        # Clear existing logs
        AuthenticationLog.objects.all().delete()
        
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'auth@example.com',
                'password': 'SecurePass123'
            },
            content_type='application/json',
            REMOTE_ADDR='192.168.1.100'
        )
        
        assert response.status_code == 200
        
        # Verify authentication was logged
        logs = AuthenticationLog.objects.filter(email='auth@example.com')
        assert logs.count() == 1
        
        log = logs.first()
        assert log.user_type == 'business'
        assert log.email == 'auth@example.com'
        assert log.ip_address == '192.168.1.100'
        assert log.success is True
        assert log.failure_reason is None
    
    def test_failed_authentication_logged(self, client, test_business):
        """
        Test that failed authentication attempts are logged.
        
        Validates Requirement 20.7: THE Platform SHALL log all authentication
        attempts for security auditing.
        """
        # Clear existing logs
        AuthenticationLog.objects.all().delete()
        
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'auth@example.com',
                'password': 'WrongPassword'
            },
            content_type='application/json',
            REMOTE_ADDR='192.168.1.200'
        )
        
        assert response.status_code == 401
        
        # Verify failed attempt was logged
        logs = AuthenticationLog.objects.filter(email='auth@example.com')
        assert logs.count() == 1
        
        log = logs.first()
        assert log.user_type == 'business'
        assert log.email == 'auth@example.com'
        assert log.ip_address == '192.168.1.200'
        assert log.success is False
        assert log.failure_reason == 'Invalid password'
    
    def test_nonexistent_email_logged(self, client):
        """Test that attempts with non-existent email are logged."""
        # Clear existing logs
        AuthenticationLog.objects.all().delete()
        
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'nonexistent@example.com',
                'password': 'SomePassword'
            },
            content_type='application/json',
            REMOTE_ADDR='192.168.1.300'
        )
        
        assert response.status_code == 401
        
        # Verify attempt was logged
        logs = AuthenticationLog.objects.filter(email='nonexistent@example.com')
        assert logs.count() == 1
        
        log = logs.first()
        assert log.success is False
        assert log.failure_reason == 'Email not found'
    
    def test_invalid_email_format_rejected(self, client):
        """Test that invalid email format is rejected with 400."""
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'not-an-email',
                'password': 'SomePassword123'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 400
        response_data = response.json()
        assert 'email' in response_data['error']['details']
    
    def test_missing_credentials_rejected(self, client):
        """Test that missing credentials are rejected."""
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'test@example.com'
                # Missing password
            },
            content_type='application/json'
        )
        
        assert response.status_code == 400
        response_data = response.json()
        assert 'password' in response_data['error']['details']
    
    def test_email_normalized_to_lowercase(self, client, test_business):
        """Test that email is normalized to lowercase during login."""
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'AUTH@EXAMPLE.COM',
                'password': 'SecurePass123'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 200
        response_data = response.json()
        assert response_data['business']['email'] == 'auth@example.com'
    
    def test_response_excludes_password_hash(self, client, test_business):
        """Test that response does not include password hash."""
        response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'auth@example.com',
                'password': 'SecurePass123'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 200
        response_data = response.json()
        assert 'password_hash' not in response_data['business']
        assert 'password' not in response_data['business']


@pytest.mark.django_db
class TestTokenRefresh:
    """Test suite for token refresh endpoint."""
    
    def test_refresh_token_generates_new_access_token(self, client, test_business):
        """
        Test that refresh token can generate a new access token.
        
        Validates that token refresh mechanism works correctly.
        """
        # First, login to get tokens
        login_response = client.post(
            '/api/v1/business/login',
            data={
                'email': 'auth@example.com',
                'password': 'SecurePass123'
            },
            content_type='application/json'
        )
        
        assert login_response.status_code == 200
        login_data = login_response.json()
        refresh_token = login_data['refresh_token']
        original_access_token = login_data['access_token']
        
        # Use refresh token to get new access token
        refresh_response = client.post(
            '/api/v1/business/token/refresh',
            data={
                'refresh': refresh_token
            },
            content_type='application/json'
        )
        
        assert refresh_response.status_code == 200
        refresh_data = refresh_response.json()
        
        # Verify new access token is returned
        assert 'access' in refresh_data
        new_access_token = refresh_data['access']
        
        # Verify new token is different from original
        assert new_access_token != original_access_token
        
        # Verify new token contains business_id claim
        decoded = jwt.decode(
            new_access_token,
            options={"verify_signature": False}
        )
        assert decoded['business_id'] == test_business.id
    
    def test_invalid_refresh_token_rejected(self, client):
        """Test that invalid refresh token is rejected."""
        response = client.post(
            '/api/v1/business/token/refresh',
            data={
                'refresh': 'invalid.token.here'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 401
    
    def test_missing_refresh_token_rejected(self, client):
        """Test that missing refresh token is rejected."""
        response = client.post(
            '/api/v1/business/token/refresh',
            data={},
            content_type='application/json'
        )
        
        assert response.status_code == 400


@pytest.mark.django_db
class TestAuthenticationService:
    """Test suite for AuthenticationService."""
    
    def test_authenticate_business_returns_tokens(self, test_business):
        """Test that authenticate_business returns tokens and business."""
        result = AuthenticationService.authenticate_business(
            email='auth@example.com',
            password='SecurePass123',
            ip_address='127.0.0.1'
        )
        
        assert 'business' in result
        assert 'access_token' in result
        assert 'refresh_token' in result
        assert result['business'].id == test_business.id
    
    def test_authenticate_business_invalid_password_raises_error(self, test_business):
        """Test that invalid password raises ValidationError."""
        from rest_framework.exceptions import ValidationError
        
        with pytest.raises(ValidationError) as exc_info:
            AuthenticationService.authenticate_business(
                email='auth@example.com',
                password='WrongPassword',
                ip_address='127.0.0.1'
            )
        
        assert 'credentials' in str(exc_info.value)
    
    def test_authenticate_business_nonexistent_email_raises_error(self):
        """Test that non-existent email raises ValidationError."""
        from rest_framework.exceptions import ValidationError
        
        with pytest.raises(ValidationError) as exc_info:
            AuthenticationService.authenticate_business(
                email='nonexistent@example.com',
                password='SomePassword',
                ip_address='127.0.0.1'
            )
        
        assert 'credentials' in str(exc_info.value)
    
    def test_get_client_ip_from_remote_addr(self):
        """Test extracting IP from REMOTE_ADDR."""
        from django.test import RequestFactory
        
        factory = RequestFactory()
        request = factory.get('/')
        request.META['REMOTE_ADDR'] = '192.168.1.100'
        
        ip = AuthenticationService.get_client_ip(request)
        assert ip == '192.168.1.100'
    
    def test_get_client_ip_from_x_forwarded_for(self):
        """Test extracting IP from X-Forwarded-For header."""
        from django.test import RequestFactory
        
        factory = RequestFactory()
        request = factory.get('/')
        request.META['HTTP_X_FORWARDED_FOR'] = '10.0.0.1, 192.168.1.100'
        request.META['REMOTE_ADDR'] = '192.168.1.200'
        
        # Should use first IP from X-Forwarded-For
        ip = AuthenticationService.get_client_ip(request)
        assert ip == '10.0.0.1'
    
    def test_get_user_agent(self):
        """Test extracting user agent from request."""
        from django.test import RequestFactory
        
        factory = RequestFactory()
        request = factory.get('/')
        request.META['HTTP_USER_AGENT'] = 'Mozilla/5.0 Test Browser'
        
        user_agent = AuthenticationService.get_user_agent(request)
        assert user_agent == 'Mozilla/5.0 Test Browser'


@pytest.mark.django_db
class TestAuthenticationLog:
    """Test suite for AuthenticationLog model."""
    
    def test_authentication_log_creation(self):
        """Test creating an authentication log entry."""
        log = AuthenticationLog.objects.create(
            user_type='business',
            email='test@example.com',
            ip_address='192.168.1.100',
            user_agent='Test Browser',
            success=True
        )
        
        assert log.id is not None
        assert log.user_type == 'business'
        assert log.email == 'test@example.com'
        assert log.ip_address == '192.168.1.100'
        assert log.success is True
        assert log.failure_reason is None
    
    def test_failed_authentication_log(self):
        """Test logging failed authentication attempt."""
        log = AuthenticationLog.objects.create(
            user_type='business',
            email='test@example.com',
            ip_address='192.168.1.100',
            success=False,
            failure_reason='Invalid password'
        )
        
        assert log.success is False
        assert log.failure_reason == 'Invalid password'
