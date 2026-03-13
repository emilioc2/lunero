from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenRefreshView
from .serializers import (
    BusinessRegistrationSerializer,
    BusinessResponseSerializer,
    EmailVerificationSerializer,
    BusinessLoginSerializer,
    StoreCreationSerializer,
    StoreResponseSerializer,
    StoreUpdateSerializer,
    ProductCreationSerializer,
    ProductUpdateSerializer,
    ProductResponseSerializer,
    ProductImageSerializer,
    CustomerRegistrationSerializer,
    CustomerResponseSerializer,
    CustomerLoginSerializer,
    CustomerProfileUpdateSerializer
)
from .services import (
    OnboardingService,
    AuthenticationService,
    StoreManagementService,
    ProductManagementService,
    SearchService,
    CustomerService
)


@api_view(['GET'])
def health_check(request):
    return Response({'status': 'ok'})


@api_view(['POST'])
def business_register(request):
    """
    Register a new business account.
    
    Endpoint: POST /api/v1/business/register
    
    Request Body:
        {
            "business_name": "My Business",
            "email": "business@example.com",
            "password": "securepassword123",
            "business_details": "Optional business details"
        }
    
    Responses:
        201 Created: Business account created successfully
        400 Bad Request: Invalid input data
        409 Conflict: Email already exists
    """
    # Validate request data
    serializer = BusinessRegistrationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Register business using service layer
        business = OnboardingService.register_business(serializer.validated_data)
        
        # Send verification email
        OnboardingService.send_verification_email(business)
        
        # Return created business data
        response_serializer = BusinessResponseSerializer(business)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    except ValidationError as e:
        # Handle duplicate email or other validation errors
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        # Check if it's a duplicate email error
        if isinstance(error_detail, dict) and 'email' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'RESOURCE_CONFLICT',
                        'message': 'Email already registered',
                        'details': error_detail
                    }
                },
                status=status.HTTP_409_CONFLICT
            )
        
        # Other validation errors
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
def business_verify_email(request):
    """
    Verify business email address.
    
    Endpoint: POST /api/v1/business/verify-email
    
    Request Body:
        {
            "token": "verification_token_from_email"
        }
    
    Responses:
        200 OK: Email verified successfully
        400 Bad Request: Invalid or expired token
    """
    # Validate request data
    serializer = EmailVerificationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Verify email using service layer
        business = OnboardingService.verify_email(serializer.validated_data['token'])
        
        # Return verified business data
        response_serializer = BusinessResponseSerializer(business)
        return Response(
            {
                'message': 'Email verified successfully',
                'business': response_serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    except ValidationError as e:
        # Handle invalid token errors
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid or expired verification token',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )



@api_view(['POST'])
def business_login(request):
    """
    Authenticate business and generate JWT tokens.
    
    Endpoint: POST /api/v1/business/login
    
    Request Body:
        {
            "email": "business@example.com",
            "password": "securepassword123"
        }
    
    Responses:
        200 OK: Authentication successful, returns tokens
        401 Unauthorized: Invalid credentials
        400 Bad Request: Invalid input data
    """
    # Validate request data
    serializer = BusinessLoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Extract IP address and user agent for logging
    ip_address = AuthenticationService.get_client_ip(request)
    user_agent = AuthenticationService.get_user_agent(request)
    
    try:
        # Authenticate business using service layer
        auth_result = AuthenticationService.authenticate_business(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Return tokens and business data
        business_serializer = BusinessResponseSerializer(auth_result['business'])
        return Response(
            {
                'access_token': auth_result['access_token'],
                'refresh_token': auth_result['refresh_token'],
                'token_type': 'Bearer',
                'expires_in': 86400,  # 24 hours in seconds
                'business': business_serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    except ValidationError as e:
        # Handle authentication errors
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        return Response(
            {
                'error': {
                    'code': 'AUTHENTICATION_FAILED',
                    'message': 'Invalid credentials',
                    'details': error_detail
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )



@api_view(['POST'])
def store_create(request):
    """
    Create a new store for an authenticated business.
    
    Endpoint: POST /api/v1/stores
    
    Authentication: Required (JWT Bearer token)
    
    Request Body:
        {
            "name": "My Store",
            "subdomain": "mystore",
            "description": "Optional store description",
            "color_scheme": {"primary": "#000000", "secondary": "#ffffff"},
            "theme": "default"
        }
    
    Responses:
        201 Created: Store created successfully
        400 Bad Request: Invalid input data
        401 Unauthorized: Missing or invalid authentication
        403 Forbidden: Email not verified
        409 Conflict: Subdomain already exists
    
    Implementation Notes:
        - Requires JWT authentication with business_id claim
        - Business email must be verified before store creation (Req 1.5)
        - Subdomain uniqueness is enforced (Req 3.4)
        - Store gets unique identifier automatically (Req 3.5)
    """
    from rest_framework.permissions import IsAuthenticated
    from rest_framework.decorators import permission_classes
    
    # Check authentication
    if not request.user.is_authenticated:
        # Extract business_id from JWT token
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return Response(
                {
                    'error': {
                        'code': 'AUTHENTICATION_REQUIRED',
                        'message': 'Authentication required to create a store'
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Decode JWT to get business_id
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            token = auth_header.split(' ')[1]
            access_token = AccessToken(token)
            business_id = access_token.get('business_id')
            
            if not business_id:
                return Response(
                    {
                        'error': {
                            'code': 'INVALID_TOKEN',
                            'message': 'Invalid authentication token'
                        }
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except Exception as e:
            return Response(
                {
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid or expired authentication token'
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
    else:
        # For Django admin users, reject the request
        return Response(
            {
                'error': {
                    'code': 'INVALID_USER_TYPE',
                    'message': 'This endpoint is for business accounts only'
                }
            },
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Validate request data
    serializer = StoreCreationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Create store using service layer
        store = StoreManagementService.create_store(
            business_id=business_id,
            data=serializer.validated_data
        )
        
        # Return created store data
        response_serializer = StoreResponseSerializer(store)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    except ValidationError as e:
        # Handle validation errors (email not verified, duplicate subdomain, etc.)
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        # Check if it's an email verification error
        if isinstance(error_detail, dict) and 'email_verified' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'EMAIL_NOT_VERIFIED',
                        'message': 'Email must be verified before creating a store',
                        'details': error_detail
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if it's a duplicate subdomain error
        if isinstance(error_detail, dict) and 'subdomain' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'RESOURCE_CONFLICT',
                        'message': 'Subdomain already exists',
                        'details': error_detail
                    }
                },
                status=status.HTTP_409_CONFLICT
            )
        
        # Other validation errors
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )



@api_view(['GET'])
def store_get_by_subdomain(request, subdomain):
    """
    Get store details by subdomain (public endpoint).
    
    Endpoint: GET /api/v1/stores/:subdomain
    
    Authentication: Not required (public access)
    
    Path Parameters:
        subdomain (str): Store subdomain identifier
    
    Responses:
        200 OK: Store found and returned
        404 Not Found: Store with subdomain not found
    
    Implementation Notes:
        - Public endpoint for customer-facing storefront access
        - Returns store branding and configuration
        - Used for subdomain routing (Req 3.6)
    """
    from .models import Store
    
    try:
        # Find store by subdomain (case-insensitive)
        store = Store.objects.get(subdomain=subdomain.lower())
        
        # Return store data
        serializer = StoreResponseSerializer(store)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    
    except Store.DoesNotExist:
        return Response(
            {
                'error': {
                    'code': 'RESOURCE_NOT_FOUND',
                    'message': f'Store with subdomain "{subdomain}" not found'
                }
            },
            status=status.HTTP_404_NOT_FOUND
        )



@api_view(['GET', 'PUT'])
def store_detail(request, store_id):
    """
    Get or update store details.
    
    Endpoint: GET /api/v1/stores/:id
    Endpoint: PUT /api/v1/stores/:id
    
    Authentication: Required for PUT (JWT Bearer token)
    
    Path Parameters:
        store_id (int): Store ID
    
    GET Response:
        200 OK: Store details returned
        404 Not Found: Store not found
    
    PUT Request Body:
        {
            "name": "Updated Store Name",
            "description": "Updated description",
            "color_scheme": {"primary": "#000000"},
            "theme": "dark"
        }
    
    PUT Responses:
        200 OK: Store updated successfully
        400 Bad Request: Invalid input data
        401 Unauthorized: Missing or invalid authentication
        403 Forbidden: Not authorized to update this store
        404 Not Found: Store not found
    
    Implementation Notes:
        - GET is public for customer access
        - PUT requires authentication and ownership validation
        - Only the owning business can update store settings (Req 4.1, 4.2)
        - Changes apply within 5 seconds (immediate database update)
    """
    from .models import Store
    
    # Handle GET request (public)
    if request.method == 'GET':
        try:
            store = Store.objects.get(id=store_id)
            serializer = StoreResponseSerializer(store)
            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )
        except Store.DoesNotExist:
            return Response(
                {
                    'error': {
                        'code': 'RESOURCE_NOT_FOUND',
                        'message': f'Store with ID {store_id} not found'
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
    
    # Handle PUT request (requires authentication)
    if request.method == 'PUT':
        # Extract business_id from JWT token
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return Response(
                {
                    'error': {
                        'code': 'AUTHENTICATION_REQUIRED',
                        'message': 'Authentication required to update a store'
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            token = auth_header.split(' ')[1]
            access_token = AccessToken(token)
            business_id = access_token.get('business_id')
            
            if not business_id:
                return Response(
                    {
                        'error': {
                            'code': 'INVALID_TOKEN',
                            'message': 'Invalid authentication token'
                        }
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except Exception as e:
            return Response(
                {
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid or expired authentication token'
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Validate request data
        serializer = StoreUpdateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': 'Invalid input data',
                        'details': serializer.errors
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update store using service layer
            store = StoreManagementService.update_store(
                store_id=store_id,
                business_id=business_id,
                data=serializer.validated_data
            )
            
            # Return updated store data
            response_serializer = StoreResponseSerializer(store)
            return Response(
                response_serializer.data,
                status=status.HTTP_200_OK
            )
        
        except ValidationError as e:
            # Handle validation errors (ownership, not found, etc.)
            error_detail = e.detail if hasattr(e, 'detail') else str(e)
            
            # Check if it's an ownership error
            if isinstance(error_detail, dict) and 'ownership' in error_detail:
                return Response(
                    {
                        'error': {
                            'code': 'FORBIDDEN',
                            'message': 'You do not have permission to update this store',
                            'details': error_detail
                        }
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if it's a not found error
            if isinstance(error_detail, dict) and 'store' in error_detail:
                return Response(
                    {
                        'error': {
                            'code': 'RESOURCE_NOT_FOUND',
                            'message': 'Store not found',
                            'details': error_detail
                        }
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Other validation errors
            return Response(
                {
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': 'Invalid input data',
                        'details': error_detail
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )



@api_view(['POST'])
def store_upload_logo(request, store_id):
    """
    Upload store logo image.
    
    Endpoint: POST /api/v1/stores/:id/logo
    
    Authentication: Required (JWT Bearer token)
    
    Path Parameters:
        store_id (int): Store ID
    
    Request Body (multipart/form-data):
        logo: Image file (JPEG, PNG, or WebP, max 5MB)
    
    Responses:
        200 OK: Logo uploaded successfully
        400 Bad Request: Invalid image file
        401 Unauthorized: Missing or invalid authentication
        403 Forbidden: Not authorized to upload logo for this store
        404 Not Found: Store not found
    
    Implementation Notes:
        - Validates image format (JPEG, PNG, WebP) and size (< 5MB) - Req 4.4
        - Generates unique filename to prevent collisions - Req 18.2
        - Uploads to AWS S3 - Req 4.3, 18.1
        - Only the owning business can upload logo
    """
    # Extract business_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {
                'error': {
                    'code': 'AUTHENTICATION_REQUIRED',
                    'message': 'Authentication required to upload logo'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        business_id = access_token.get('business_id')
        
        if not business_id:
            return Response(
                {
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid authentication token'
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception as e:
        return Response(
            {
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Invalid or expired authentication token'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Get uploaded file
    if 'logo' not in request.FILES:
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'No logo file provided',
                    'details': {'logo': 'This field is required.'}
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    logo_file = request.FILES['logo']
    
    try:
        # Upload logo using service layer
        result = StoreManagementService.upload_logo(
            store_id=store_id,
            business_id=business_id,
            image_file=logo_file
        )
        
        # Return updated store data
        response_serializer = StoreResponseSerializer(result['store'])
        return Response(
            {
                'message': 'Logo uploaded successfully',
                'logo_url': result['logo_url'],
                'store': response_serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    except ValidationError as e:
        # Handle validation errors (ownership, not found, image validation, etc.)
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        # Check if it's an ownership error
        if isinstance(error_detail, dict) and 'ownership' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': 'You do not have permission to upload logo for this store',
                        'details': error_detail
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if it's a not found error
        if isinstance(error_detail, dict) and 'store' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'RESOURCE_NOT_FOUND',
                        'message': 'Store not found',
                        'details': error_detail
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Image validation or upload errors
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid image file',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )



@api_view(['POST'])
def product_create(request, store_id):
    """
    Create a new product in a store.
    
    Endpoint: POST /api/v1/stores/:store_id/products
    
    Authentication: Required (JWT Bearer token)
    
    Request Body:
        {
            "name": "Product Name",
            "description": "Product description",
            "price": "29.99",
            "quantity": 100,
            "category": "Electronics",
            "weight_grams": 500
        }
    
    Responses:
        201 Created: Product created successfully
        400 Bad Request: Invalid input data
        401 Unauthorized: Missing or invalid authentication
        403 Forbidden: Business doesn't own the store
    
    Implementation Notes:
        - Requires JWT authentication with business_id claim
        - Validates business owns the store (Req 5.1, 5.2)
        - Price must be positive (Req 5.5)
        - Quantity must be non-negative (Req 5.6)
        - Triggers search index update within 10 seconds (Req 5.7)
    """
    # Extract business_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {
                'error': {
                    'code': 'AUTHENTICATION_REQUIRED',
                    'message': 'Authentication required to create a product'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        business_id = access_token.get('business_id')
        
        if not business_id:
            return Response(
                {
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid authentication token'
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception as e:
        return Response(
            {
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Invalid or expired authentication token'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Validate request data
    serializer = ProductCreationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Create product using service layer
        product = ProductManagementService.create_product(
            store_id=store_id,
            business_id=business_id,
            data=serializer.validated_data
        )
        
        # Return created product data
        product_serializer = ProductResponseSerializer(product)
        return Response(
            product_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    except ValidationError as e:
        error_detail = e.detail if hasattr(e, 'detail') else e.message_dict
        
        # Check if it's an ownership error
        if isinstance(error_detail, dict) and 'ownership' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': 'You do not have permission to create products in this store',
                        'details': error_detail
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Product creation failed',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['PUT', 'PATCH'])
def product_update(request, product_id):
    """
    Update an existing product.
    
    Endpoint: PUT/PATCH /api/v1/products/:product_id
    
    Authentication: Required (JWT Bearer token)
    
    Request Body (all fields optional):
        {
            "name": "Updated Product Name",
            "description": "Updated description",
            "price": "39.99",
            "quantity": 50,
            "category": "Electronics",
            "weight_grams": 600
        }
    
    Responses:
        200 OK: Product updated successfully
        400 Bad Request: Invalid input data
        401 Unauthorized: Missing or invalid authentication
        403 Forbidden: Business doesn't own the product
        404 Not Found: Product not found
    
    Implementation Notes:
        - Requires JWT authentication with business_id claim
        - Validates business owns the product's store (Req 6.1, 6.2, 6.4)
        - Returns 403 for cross-tenant access (Req 6.3)
        - Supports partial updates
        - updated_at timestamp automatically updated (Req 6.5)
        - Triggers search re-indexing within 10 seconds (Req 6.5)
    """
    # Extract business_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {
                'error': {
                    'code': 'AUTHENTICATION_REQUIRED',
                    'message': 'Authentication required to update a product'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        business_id = access_token.get('business_id')
        
        if not business_id:
            return Response(
                {
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid authentication token'
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception as e:
        return Response(
            {
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Invalid or expired authentication token'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Validate request data
    serializer = ProductUpdateSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Update product using service layer
        product = ProductManagementService.update_product(
            product_id=product_id,
            business_id=business_id,
            data=serializer.validated_data
        )
        
        # Return updated product data
        product_serializer = ProductResponseSerializer(product)
        return Response(
            product_serializer.data,
            status=status.HTTP_200_OK
        )
    
    except ValidationError as e:
        error_detail = e.detail if hasattr(e, 'detail') else e.message_dict
        
        # Check if it's an ownership error
        if isinstance(error_detail, dict) and 'ownership' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': 'You do not have permission to update this product',
                        'details': error_detail
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if product not found
        if isinstance(error_detail, dict) and 'product' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'NOT_FOUND',
                        'message': 'Product not found',
                        'details': error_detail
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Product update failed',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['DELETE'])
def product_delete(request, product_id):
    """
    Delete a product.
    
    Endpoint: DELETE /api/v1/products/:product_id
    
    Authentication: Required (JWT Bearer token)
    
    Responses:
        200 OK: Product deleted successfully
        401 Unauthorized: Missing or invalid authentication
        403 Forbidden: Business doesn't own the product
        404 Not Found: Product not found
        409 Conflict: Product is in active carts or pending orders
    
    Implementation Notes:
        - Requires JWT authentication with business_id claim
        - Validates business owns the product's store (Req 7.1, 7.2)
        - Prevents deletion if product in active carts (Req 7.3, 7.6)
        - Prevents deletion if product in pending orders (Req 7.4)
        - Removes associated images from S3 (Req 7.5)
        - Triggers search index removal within 10 seconds (Req 7.5)
    """
    # Extract business_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {
                'error': {
                    'code': 'AUTHENTICATION_REQUIRED',
                    'message': 'Authentication required to delete a product'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        business_id = access_token.get('business_id')
        
        if not business_id:
            return Response(
                {
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid authentication token'
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception as e:
        return Response(
            {
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Invalid or expired authentication token'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        # Delete product using service layer
        result = ProductManagementService.delete_product(
            product_id=product_id,
            business_id=business_id
        )
        
        return Response(
            result,
            status=status.HTTP_200_OK
        )
    
    except ValidationError as e:
        error_detail = e.detail if hasattr(e, 'detail') else e.message_dict
        
        # Check if it's an ownership error
        if isinstance(error_detail, dict) and 'ownership' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': 'You do not have permission to delete this product',
                        'details': error_detail
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if it's a constraint error
        if isinstance(error_detail, dict) and 'constraint' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'CONFLICT',
                        'message': 'Cannot delete product',
                        'details': error_detail
                    }
                },
                status=status.HTTP_409_CONFLICT
            )
        
        # Check if product not found
        if isinstance(error_detail, dict) and 'product' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'NOT_FOUND',
                        'message': 'Product not found',
                        'details': error_detail
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Product deletion failed',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
def product_upload_images(request, product_id):
    """
    Upload images for a product.
    
    Endpoint: POST /api/v1/products/:product_id/images
    
    Authentication: Required (JWT Bearer token)
    
    Request: multipart/form-data with image files
    
    Responses:
        201 Created: Images uploaded successfully
        400 Bad Request: Invalid image data
        401 Unauthorized: Missing or invalid authentication
        403 Forbidden: Business doesn't own the product
        404 Not Found: Product not found
    
    Implementation Notes:
        - Requires JWT authentication with business_id claim
        - Validates image format (JPEG, PNG, WebP) and size (< 5MB) - Req 5.4, 18.4, 18.5
        - Generates thumbnail (200x200), medium (600x600), large (1200x1200) - Req 18.7
        - Generates unique filenames to prevent collisions - Req 18.2
        - Uploads to AWS S3 - Req 18.1
    """
    # Extract business_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {
                'error': {
                    'code': 'AUTHENTICATION_REQUIRED',
                    'message': 'Authentication required to upload images'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        business_id = access_token.get('business_id')
        
        if not business_id:
            return Response(
                {
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid authentication token'
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception as e:
        return Response(
            {
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Invalid or expired authentication token'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Get image files from request
    image_files = request.FILES.getlist('images')
    
    if not image_files:
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'No image files provided'
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Upload images using service layer
        product_images = ProductManagementService.upload_images(
            product_id=product_id,
            business_id=business_id,
            image_files=image_files
        )
        
        # Return created image data
        images_serializer = ProductImageSerializer(product_images, many=True)
        return Response(
            {
                'images': images_serializer.data,
                'count': len(product_images)
            },
            status=status.HTTP_201_CREATED
        )
    
    except ValidationError as e:
        error_detail = e.detail if hasattr(e, 'detail') else e.message_dict
        
        # Check if it's an ownership error
        if isinstance(error_detail, dict) and 'ownership' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': 'You do not have permission to upload images for this product',
                        'details': error_detail
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if product not found
        if isinstance(error_detail, dict) and 'product' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'NOT_FOUND',
                        'message': 'Product not found',
                        'details': error_detail
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Image upload failed',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
def product_list(request, store_id):
    """
    List products in a store with pagination.
    
    Endpoint: GET /api/v1/stores/:store_id/products
    
    Query Parameters:
        - page (int): Page number (default: 1)
        - page_size (int): Results per page (default: 24)
    
    Responses:
        200 OK: Returns paginated product list
    
    Implementation Notes:
        - Public endpoint (no authentication required)
        - Filters products by store_id for tenant isolation (Req 11.1)
        - Pagination with 24 per page (Req 11.3)
        - Products with quantity > 0 marked as available (Req 11.5)
    """
    from .models import Product
    
    # Get pagination parameters
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 24))
    
    # Get products for store
    products = Product.objects.filter(store_id=store_id).prefetch_related('images').order_by('-created_at')
    
    # Calculate pagination
    total = products.count()
    start = (page - 1) * page_size
    end = start + page_size
    page_results = products[start:end]
    
    # Serialize results
    products_serializer = ProductResponseSerializer(page_results, many=True)
    
    return Response(
        {
            'products': products_serializer.data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_next': end < total
        },
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
def product_detail(request, product_id):
    """
    Get product details.
    
    Endpoint: GET /api/v1/products/:product_id
    
    Responses:
        200 OK: Returns product details
        404 Not Found: Product not found
    
    Implementation Notes:
        - Public endpoint (no authentication required)
        - Returns full product details with images (Req 11.4)
        - Product marked as available if quantity > 0 (Req 11.5)
    """
    from .models import Product
    
    try:
        product = Product.objects.prefetch_related('images').get(id=product_id)
        
        # Serialize product
        product_serializer = ProductResponseSerializer(product)
        
        return Response(
            product_serializer.data,
            status=status.HTTP_200_OK
        )
    
    except Product.DoesNotExist:
        return Response(
            {
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Product not found'
                }
            },
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
def product_search(request, store_id):
    """
    Search products in a store.
    
    Endpoint: GET /api/v1/stores/:store_id/search
    
    Query Parameters:
        - q (str): Search query
        - page (int): Page number (default: 1)
        - page_size (int): Results per page (default: 24)
    
    Responses:
        200 OK: Returns search results
    
    Implementation Notes:
        - Public endpoint (no authentication required)
        - Filters by store_id for tenant isolation (Req 10.3)
        - Ranks exact name matches highest, then description, then category (Req 10.4, 10.5)
        - Returns results within 500ms for queries under 100 characters (Req 10.6)
        - Returns empty result set when no matches (Req 10.6)
    """
    # Get search parameters
    query = request.GET.get('q', '')
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 24))
    
    # Search using service layer
    results = SearchService.search(
        store_id=store_id,
        query=query,
        page=page,
        page_size=page_size
    )
    
    # Serialize results
    products_serializer = ProductResponseSerializer(results['results'], many=True)
    
    return Response(
        {
            'products': products_serializer.data,
            'total': results['total'],
            'page': results['page'],
            'page_size': results['page_size'],
            'has_next': results['has_next'],
            'query': query
        },
        status=status.HTTP_200_OK
    )



@api_view(['POST'])
def customer_register(request):
    """
    Register a new customer account.
    
    Endpoint: POST /api/v1/customers/register
    
    Request Body:
        {
            "name": "John Doe",
            "email": "customer@example.com",
            "password": "securepassword123"
        }
    
    Responses:
        201 Created: Customer account created successfully
        400 Bad Request: Invalid input data
        409 Conflict: Email already exists
    
    Implementation Notes:
        - Email uniqueness validated (Req 8.2)
        - Password hashed with bcrypt work factor 12 (Req 20.1)
        - Verification email sent after registration (Req 8.4)
    """
    # Validate request data
    serializer = CustomerRegistrationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Register customer using service layer
        customer = CustomerService.register_customer(serializer.validated_data)
        
        # Send verification email
        CustomerService.send_verification_email(customer)
        
        # Return created customer data
        response_serializer = CustomerResponseSerializer(customer)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    except ValidationError as e:
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        # Check if it's a duplicate email error
        if isinstance(error_detail, dict) and 'email' in error_detail:
            return Response(
                {
                    'error': {
                        'code': 'RESOURCE_CONFLICT',
                        'message': 'Email already registered',
                        'details': error_detail
                    }
                },
                status=status.HTTP_409_CONFLICT
            )
        
        # Other validation errors
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
def customer_verify_email(request):
    """
    Verify customer email address.
    
    Endpoint: POST /api/v1/customers/verify-email
    
    Request Body:
        {
            "token": "verification_token_from_email"
        }
    
    Responses:
        200 OK: Email verified successfully
        400 Bad Request: Invalid or expired token
    """
    # Validate request data
    serializer = EmailVerificationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Verify email using service layer
        customer = CustomerService.verify_email(serializer.validated_data['token'])
        
        # Return verified customer data
        response_serializer = CustomerResponseSerializer(customer)
        return Response(
            {
                'message': 'Email verified successfully',
                'customer': response_serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    except ValidationError as e:
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid or expired verification token',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
def customer_login(request):
    """
    Authenticate customer and generate JWT tokens.
    
    Endpoint: POST /api/v1/customers/login
    
    Request Body:
        {
            "email": "customer@example.com",
            "password": "securepassword123"
        }
    
    Responses:
        200 OK: Authentication successful, returns tokens
        401 Unauthorized: Invalid credentials
        400 Bad Request: Invalid input data
    
    Implementation Notes:
        - JWT tokens with customer_id claim and 7-day expiration (Req 9.2, 9.4)
        - All authentication attempts logged (Req 20.7)
    """
    # Validate request data
    serializer = CustomerLoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid input data',
                    'details': serializer.errors
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Extract IP address and user agent for logging
    ip_address = AuthenticationService.get_client_ip(request)
    user_agent = AuthenticationService.get_user_agent(request)
    
    try:
        # Authenticate customer using service layer
        auth_result = CustomerService.authenticate_customer(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Return tokens and customer data
        customer_serializer = CustomerResponseSerializer(auth_result['customer'])
        return Response(
            {
                'access_token': auth_result['access_token'],
                'refresh_token': auth_result['refresh_token'],
                'token_type': 'Bearer',
                'expires_in': 604800,  # 7 days in seconds
                'customer': customer_serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    except ValidationError as e:
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        return Response(
            {
                'error': {
                    'code': 'AUTHENTICATION_FAILED',
                    'message': 'Invalid credentials',
                    'details': error_detail
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['GET', 'PUT'])
def customer_profile(request):
    """
    Get or update customer profile.
    
    Endpoint: GET /api/v1/customers/profile
    Endpoint: PUT /api/v1/customers/profile
    
    Authentication: Required (JWT Bearer token)
    
    GET Response:
        200 OK: Returns customer profile
        401 Unauthorized: Missing or invalid authentication
    
    PUT Request Body:
        {
            "name": "Updated Name",
            "email": "newemail@example.com"
        }
    
    PUT Responses:
        200 OK: Profile updated successfully
        400 Bad Request: Invalid input data
        401 Unauthorized: Missing or invalid authentication
    """
    # Extract customer_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {
                'error': {
                    'code': 'AUTHENTICATION_REQUIRED',
                    'message': 'Authentication required'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        customer_id = access_token.get('customer_id')
        
        if not customer_id:
            return Response(
                {
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid authentication token'
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception as e:
        return Response(
            {
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Invalid or expired authentication token'
                }
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Handle GET request
    if request.method == 'GET':
        from .models import Customer
        try:
            customer = Customer.objects.get(id=customer_id)
            serializer = CustomerResponseSerializer(customer)
            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )
        except Customer.DoesNotExist:
            return Response(
                {
                    'error': {
                        'code': 'NOT_FOUND',
                        'message': 'Customer not found'
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
    
    # Handle PUT request
    if request.method == 'PUT':
        # Validate request data
        serializer = CustomerProfileUpdateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': 'Invalid input data',
                        'details': serializer.errors
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update profile using service layer
            customer = CustomerService.update_profile(
                customer_id=customer_id,
                data=serializer.validated_data
            )
            
            # Return updated customer data
            response_serializer = CustomerResponseSerializer(customer)
            return Response(
                response_serializer.data,
                status=status.HTTP_200_OK
            )
        
        except ValidationError as e:
            error_detail = e.detail if hasattr(e, 'detail') else str(e)
            
            return Response(
                {
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': 'Profile update failed',
                        'details': error_detail
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
