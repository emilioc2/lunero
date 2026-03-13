"""
Cart-related view endpoints.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .serializers import (
    CartItemAddSerializer,
    CartItemUpdateSerializer,
    CartResponseSerializer
)
from .services import CartService, AuthenticationService


def get_user_context(request):
    """
    Extract customer_id or session_id from request.
    
    Returns:
        dict: Dictionary with 'customer_id' or 'session_id'
    """
    # Try to get customer_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Bearer '):
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            token = auth_header.split(' ')[1]
            access_token = AccessToken(token)
            customer_id = access_token.get('customer_id')
            
            if customer_id:
                return {'customer_id': customer_id}
        except:
            pass
    
    # Fall back to session_id from cookie or header
    session_id = request.COOKIES.get('session_id') or request.META.get('HTTP_X_SESSION_ID')
    
    if not session_id:
        # Generate new session_id
        import uuid
        session_id = str(uuid.uuid4())
    
    return {'session_id': session_id}


@api_view(['POST'])
def cart_add_item(request, store_id):
    """
    Add item to cart.
    
    Endpoint: POST /api/v1/stores/:store_id/cart/items
    
    Authentication: Optional (supports both authenticated and guest users)
    
    Request Body:
        {
            "product_id": 123,
            "quantity": 2
        }
    
    Responses:
        201 Created: Item added to cart
        400 Bad Request: Invalid input or insufficient stock
    
    Implementation Notes:
        - Supports both authenticated (customer_id) and guest (session_id) carts
        - Validates quantity doesn't exceed product stock (Req 12.3, 12.4)
        - Creates or updates cart item with price snapshot (Req 12.9)
    """
    # Validate request data
    serializer = CartItemAddSerializer(data=request.data)
    
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
    
    # Get user context
    user_context = get_user_context(request)
    
    try:
        # Add item to cart
        cart_item = CartService.add_item(
            store_id=store_id,
            product_id=serializer.validated_data['product_id'],
            quantity=serializer.validated_data['quantity'],
            **user_context
        )
        
        # Get updated cart
        cart_data = CartService.get_cart(store_id=store_id, **user_context)
        
        # Serialize response
        cart_serializer = CartResponseSerializer(cart_data)
        
        response = Response(
            {
                'message': 'Item added to cart',
                'cart': cart_serializer.data
            },
            status=status.HTTP_201_CREATED
        )
        
        # Set session_id cookie if guest user
        if 'session_id' in user_context:
            response.set_cookie(
                'session_id',
                user_context['session_id'],
                max_age=7*24*60*60,  # 7 days
                httponly=True,
                samesite='Lax'
            )
        
        return response
    
    except ValidationError as e:
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Failed to add item to cart',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['PUT'])
def cart_update_item(request, cart_item_id):
    """
    Update cart item quantity.
    
    Endpoint: PUT /api/v1/cart/items/:cart_item_id
    
    Authentication: Optional (supports both authenticated and guest users)
    
    Request Body:
        {
            "quantity": 3
        }
    
    Responses:
        200 OK: Item quantity updated
        400 Bad Request: Invalid input or insufficient stock
        403 Forbidden: User doesn't own this cart item
        404 Not Found: Cart item not found
    """
    # Validate request data
    serializer = CartItemUpdateSerializer(data=request.data)
    
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
    
    # Get user context
    user_context = get_user_context(request)
    
    try:
        # Update cart item
        cart_item = CartService.update_item_quantity(
            cart_item_id=cart_item_id,
            quantity=serializer.validated_data['quantity'],
            **user_context
        )
        
        if cart_item is None:
            # Item was removed (quantity = 0)
            return Response(
                {'message': 'Item removed from cart'},
                status=status.HTTP_200_OK
            )
        
        # Get updated cart
        from .models import CartItem
        cart_item_obj = CartItem.objects.select_related('cart').get(id=cart_item_id)
        cart_data = CartService.get_cart(
            store_id=cart_item_obj.cart.store_id,
            **user_context
        )
        
        # Serialize response
        cart_serializer = CartResponseSerializer(cart_data)
        
        return Response(
            {
                'message': 'Cart item updated',
                'cart': cart_serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    except ValidationError as e:
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        # Check if it's a permission error
        if isinstance(error_detail, dict) and 'cart_item' in error_detail:
            if 'permission' in str(error_detail['cart_item']).lower():
                return Response(
                    {
                        'error': {
                            'code': 'FORBIDDEN',
                            'message': 'You do not have permission to update this cart item',
                            'details': error_detail
                        }
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return Response(
                {
                    'error': {
                        'code': 'NOT_FOUND',
                        'message': 'Cart item not found',
                        'details': error_detail
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Failed to update cart item',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['DELETE'])
def cart_remove_item(request, cart_item_id):
    """
    Remove item from cart.
    
    Endpoint: DELETE /api/v1/cart/items/:cart_item_id
    
    Authentication: Optional (supports both authenticated and guest users)
    
    Responses:
        200 OK: Item removed from cart
        403 Forbidden: User doesn't own this cart item
        404 Not Found: Cart item not found
    """
    # Get user context
    user_context = get_user_context(request)
    
    try:
        # Remove cart item
        CartService.remove_item(
            cart_item_id=cart_item_id,
            **user_context
        )
        
        return Response(
            {'message': 'Item removed from cart'},
            status=status.HTTP_200_OK
        )
    
    except ValidationError as e:
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        # Check if it's a permission error
        if isinstance(error_detail, dict) and 'cart_item' in error_detail:
            if 'permission' in str(error_detail['cart_item']).lower():
                return Response(
                    {
                        'error': {
                            'code': 'FORBIDDEN',
                            'message': 'You do not have permission to remove this cart item',
                            'details': error_detail
                        }
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return Response(
                {
                    'error': {
                        'code': 'NOT_FOUND',
                        'message': 'Cart item not found',
                        'details': error_detail
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Failed to remove cart item',
                    'details': error_detail
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
def cart_get(request, store_id):
    """
    Get cart with calculated totals.
    
    Endpoint: GET /api/v1/stores/:store_id/cart
    
    Authentication: Optional (supports both authenticated and guest users)
    
    Responses:
        200 OK: Returns cart with items and totals
    
    Implementation Notes:
        - Returns empty cart if no cart exists
        - Calculates subtotal from price_at_addition * quantity (Req 12.7)
        - Supports both authenticated and guest carts (Req 12.8)
    """
    # Get user context
    user_context = get_user_context(request)
    
    # Get cart
    cart_data = CartService.get_cart(store_id=store_id, **user_context)
    
    # Serialize response
    cart_serializer = CartResponseSerializer(cart_data)
    
    response = Response(
        cart_serializer.data,
        status=status.HTTP_200_OK
    )
    
    # Set session_id cookie if guest user
    if 'session_id' in user_context:
        response.set_cookie(
            'session_id',
            user_context['session_id'],
            max_age=7*24*60*60,  # 7 days
            httponly=True,
            samesite='Lax'
        )
    
    return response


@api_view(['POST'])
def cart_merge(request, store_id):
    """
    Merge guest cart into customer cart on login.
    
    Endpoint: POST /api/v1/stores/:store_id/cart/merge
    
    Authentication: Required (JWT Bearer token)
    
    Request Body:
        {
            "session_id": "guest-session-id"
        }
    
    Responses:
        200 OK: Carts merged successfully
        401 Unauthorized: Missing or invalid authentication
    
    Implementation Notes:
        - Merges guest cart items into customer cart (Req 12.8)
        - If same product exists in both carts, adds quantities
        - Validates merged quantities don't exceed stock
        - Deletes guest cart after merge
    """
    # Extract customer_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {
                'error': {
                    'code': 'AUTHENTICATION_REQUIRED',
                    'message': 'Authentication required to merge carts'
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
    
    # Get session_id from request
    session_id = request.data.get('session_id') or request.COOKIES.get('session_id')
    
    if not session_id:
        return Response(
            {
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'session_id is required'
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Merge carts
    CartService.merge_carts(
        customer_id=customer_id,
        session_id=session_id,
        store_id=store_id
    )
    
    # Get merged cart
    cart_data = CartService.get_cart(store_id=store_id, customer_id=customer_id)
    
    # Serialize response
    cart_serializer = CartResponseSerializer(cart_data)
    
    return Response(
        {
            'message': 'Carts merged successfully',
            'cart': cart_serializer.data
        },
        status=status.HTTP_200_OK
    )
