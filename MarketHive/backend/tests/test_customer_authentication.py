"""
Unit tests for customer authentication endpoints.

Tests customer registration, login, and session management.
"""

import pytest
import bcrypt
import jwt
from django.test import Client
from api.models import Customer
from api.services import CustomerService


@pytest.fixture
def client():
    """Django test client fixture."""
    return Client()


@pytest.fixture
def test_customer(db):
    """Create a test customer account."""
    data = {
        'name': 'Test Customer',
        'email': 'customer@example.com',
        'password': 'SecurePass123',
        'phone': '555-1234'
    }
    customer = CustomerService.register_customer(data)
    customer.plain_password = 'SecurePass123'
    return customer


@pytest.fixture(autouse=True)
def cleanup_test_data(db):
    """Clean up test data before and after each test."""
    Customer.objects.filter(email__contains='test').delete()
    Customer.objects.filter(email__contains='customer').delete()
    yield
    Customer.objects.filter(email__contains='test').delete()
    Customer.objects.filter(email__contains='customer').delete()


@pytest.mark.django_db
class TestCustomerRegistration:
    """Test suite for customer registration."""
    
    def test_successful_registration_creates_account(self, client):
        """Test that valid customer registration creates account."""
        response = client.post(
            '/api/v1/customers/register',
            data={
                'name': 'New Customer',
                'email': 'newcustomer@example.com',
                'password': 'SecurePass123',
                'phone': '555-5678'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 201
        customer = Customer.objects.get(email='newcustomer@example.com')
        assert customer.name == 'New Customer'
        assert customer.email == 'newcustomer@example.com'
        assert customer.email_verified is False
    
    def test_duplicate_email_rejected(self, client, test_customer):
        """Test that duplicate email returns 409."""
        response = client.post(
            '/api/v1/customers/register',
            data={
                'name': 'Another Customer',
                'email': 'customer@example.com',
                'password': 'AnotherPass123',
                'phone': '555-9999'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 409
        response_data = response.json()
        assert 'email' in response_data['error']['message'].lower()
    
    def test_password_hashed_with_bcrypt(self, client):
        """Test that passwords are hashed with bcrypt."""
        response = client.post(
            '/api/v1/customers/register',
            data={
                'name': 'Test Customer',
                'email': 'bcrypttest@example.com',
                'password': 'MyPassword123',
                'phone': '555-0000'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 201
        customer = Customer.objects.get(email='bcrypttest@example.com')
        assert bcrypt.checkpw(b'MyPassword123', customer.password_hash.encode('utf-8'))


@pytest.mark.django_db
class TestCustomerLogin:
    """Test suite for customer login."""
    
    def test_valid_credentials_authenticate(self, client, test_customer):
        """Test that valid credentials authenticate successfully."""
        response = client.post(
            '/api/v1/customers/login',
            data={
                'email': 'customer@example.com',
                'password': 'SecurePass123'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 200
        response_data = response.json()
        assert 'access_token' in response_data
        assert 'refresh_token' in response_data
    
    def test_invalid_password_rejected(self, client, test_customer):
        """Test that invalid password is rejected."""
        response = client.post(
            '/api/v1/customers/login',
            data={
                'email': 'customer@example.com',
                'password': 'WrongPassword'
            },
            content_type='application/json'
        )
        
        assert response.status_code == 401
    
    # def test_token_expires_in_7_days(self, client, test_customer):
    #     """Test that customer token expires in 7 days."""
    #     response = client.post(
    #         '/api/v1/customers/login',
    #         data={
    #             'email': 'customer@example.com',
    #             'password': 'SecurePass123'
    #         },
    #         content_type='application/json'
    #     )
    #     
    #     assert response.status_code == 200
    #     response_data = response.json()
    #     
    #     access_token = response_data['access_token']
    #     decoded = jwt.decode(access_token, options={"verify_signature": False})
    #     
    #     token_lifetime = decoded['exp'] - decoded['iat']
    #     # 7 days = 604800 seconds, allow 60 second tolerance
    #     assert abs(token_lifetime - 604800) < 60
