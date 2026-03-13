"""
Checkout and payment view endpoints.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.views.decorators.csrf import csrf_exempt
from .services_checkout import CheckoutService, PaymentService, OrderManagementService


@api_view(['POST'])
def checkout_validate(request):
    """
    Validate cart for checkout.
    
    Endpoint: POST /api/v1/checkout/validate
    
    Authentication: Required (JWT Bearer token)
    
    Request Body:
        {
            "cart_id": 123
        }
    
    Responses:
        200 OK: Cart is valid for checkout
        400 Bad Request: Cart invalid or items unavailable
        401 Unauthorized: Missing or invalid authentication
    """
    # Extract customer_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {'error': {'code': 'AUTHENTICATION_REQUIRED', 'message': 'Authentication required'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        customer_id = access_token.get('customer_id')
        
        if not customer_id:
            return Response(
                {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid authentication token'}},
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception:
        return Response(
            {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid or expired authentication token'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    cart_id = request.data.get('cart_id')
    if not cart_id:
        return Response(
            {'error': {'code': 'VALIDATION_ERROR', 'message': 'cart_id is required'}},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        validation = CheckoutService.validate_cart(cart_id, customer_id)
        return Response(
            {'message': 'Cart is valid', 'item_count': len(validation['items'])},
            status=status.HTTP_200_OK
        )
    except ValidationError as e:
        return Response(
            {'error': {'code': 'VALIDATION_ERROR', 'message': 'Cart validation failed', 'details': e.detail}},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
def checkout_calculate(request):
    """
    Calculate checkout totals.
    
    Endpoint: POST /api/v1/checkout/calculate
    
    Authentication: Required (JWT Bearer token)
    
    Request Body:
        {
            "cart_id": 123,
            "shipping_address": {
                "country": "US",
                "state": "CA",
                "zip": "90210"
            }
        }
    
    Responses:
        200 OK: Returns calculated totals
        400 Bad Request: Invalid input
        401 Unauthorized: Missing or invalid authentication
    """
    # Extract customer_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {'error': {'code': 'AUTHENTICATION_REQUIRED', 'message': 'Authentication required'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        customer_id = access_token.get('customer_id')
        
        if not customer_id:
            return Response(
                {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid authentication token'}},
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception:
        return Response(
            {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid or expired authentication token'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    cart_id = request.data.get('cart_id')
    shipping_address = request.data.get('shipping_address', {})
    
    if not cart_id:
        return Response(
            {'error': {'code': 'VALIDATION_ERROR', 'message': 'cart_id is required'}},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        totals = CheckoutService.calculate_totals(cart_id, shipping_address)
        return Response(totals, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': {'code': 'CALCULATION_ERROR', 'message': str(e)}},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
def checkout_create_payment_intent(request):
    """
    Create Stripe payment intent.
    
    Endpoint: POST /api/v1/checkout/payment
    
    Authentication: Required (JWT Bearer token)
    
    Request Body:
        {
            "cart_id": 123,
            "shipping_address": {
                "name": "John Doe",
                "line1": "123 Main St",
                "city": "Los Angeles",
                "state": "CA",
                "zip": "90210",
                "country": "US"
            }
        }
    
    Responses:
        200 OK: Returns Stripe client secret
        400 Bad Request: Invalid input or cart validation failed
        401 Unauthorized: Missing or invalid authentication
    """
    # Extract customer_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {'error': {'code': 'AUTHENTICATION_REQUIRED', 'message': 'Authentication required'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        customer_id = access_token.get('customer_id')
        
        if not customer_id:
            return Response(
                {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid authentication token'}},
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception:
        return Response(
            {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid or expired authentication token'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    cart_id = request.data.get('cart_id')
    shipping_address = request.data.get('shipping_address', {})
    
    if not cart_id:
        return Response(
            {'error': {'code': 'VALIDATION_ERROR', 'message': 'cart_id is required'}},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        result = CheckoutService.create_payment_intent(cart_id, customer_id, shipping_address)
        return Response(result, status=status.HTTP_200_OK)
    except ValidationError as e:
        return Response(
            {'error': {'code': 'PAYMENT_ERROR', 'message': 'Failed to create payment intent', 'details': e.detail}},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@csrf_exempt
def stripe_webhook(request):
    """
    Handle Stripe webhook events.
    
    Endpoint: POST /api/v1/webhooks/stripe
    
    Authentication: Stripe signature verification
    
    Responses:
        200 OK: Event processed successfully
        400 Bad Request: Invalid signature or payload
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    if not sig_header:
        return Response(
            {'error': 'Missing Stripe signature'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        result = PaymentService.handle_webhook(payload, sig_header)
        return Response(result, status=status.HTTP_200_OK)
    except ValidationError as e:
        return Response(
            {'error': e.detail},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
def order_list(request):
    """
    List customer orders.
    
    Endpoint: GET /api/v1/orders
    
    Authentication: Required (JWT Bearer token)
    
    Responses:
        200 OK: Returns list of orders
        401 Unauthorized: Missing or invalid authentication
    """
    # Extract customer_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {'error': {'code': 'AUTHENTICATION_REQUIRED', 'message': 'Authentication required'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        customer_id = access_token.get('customer_id')
        
        if not customer_id:
            return Response(
                {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid authentication token'}},
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception:
        return Response(
            {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid or expired authentication token'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    from .models import Order
    
    # Get orders for customer, sorted by most recent first
    orders = Order.objects.filter(customer_id=customer_id).order_by('-created_at')
    
    # Serialize orders
    orders_data = [
        {
            'id': order.id,
            'order_number': order.order_number,
            'status': order.status,
            'total': str(order.total),
            'created_at': order.created_at.isoformat(),
            'store_id': order.store_id
        }
        for order in orders
    ]
    
    return Response({'orders': orders_data}, status=status.HTTP_200_OK)


@api_view(['GET'])
def order_detail(request, order_id):
    """
    Get order details.
    
    Endpoint: GET /api/v1/orders/:order_id
    
    Authentication: Required (JWT Bearer token)
    
    Responses:
        200 OK: Returns order details
        401 Unauthorized: Missing or invalid authentication
        403 Forbidden: Order doesn't belong to customer
        404 Not Found: Order not found
    """
    # Extract customer_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {'error': {'code': 'AUTHENTICATION_REQUIRED', 'message': 'Authentication required'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        customer_id = access_token.get('customer_id')
        
        if not customer_id:
            return Response(
                {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid authentication token'}},
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception:
        return Response(
            {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid or expired authentication token'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    from .models import Order, OrderItem
    
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response(
            {'error': {'code': 'NOT_FOUND', 'message': 'Order not found'}},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Validate ownership
    if order.customer_id != customer_id:
        return Response(
            {'error': {'code': 'FORBIDDEN', 'message': 'You do not have permission to view this order'}},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get order items
    items = OrderItem.objects.filter(order=order).select_related('product')
    
    # Serialize order
    order_data = {
        'id': order.id,
        'order_number': order.order_number,
        'status': order.status,
        'subtotal': str(order.subtotal),
        'shipping_cost': str(order.shipping_cost),
        'tax': str(order.tax),
        'total': str(order.total),
        'created_at': order.created_at.isoformat(),
        'store_id': order.store_id,
        'items': [
            {
                'id': item.id,
                'product_id': item.product_id,
                'product_name': item.product_snapshot.get('name', item.product.name if item.product else 'Unknown'),
                'quantity': item.quantity,
                'price': str(item.price)
            }
            for item in items
        ]
    }
    
    return Response(order_data, status=status.HTTP_200_OK)


@api_view(['POST'])
def order_cancel(request, order_id):
    """
    Cancel order.
    
    Endpoint: POST /api/v1/orders/:order_id/cancel
    
    Authentication: Required (JWT Bearer token)
    
    Responses:
        200 OK: Order cancelled successfully
        400 Bad Request: Order cannot be cancelled
        401 Unauthorized: Missing or invalid authentication
        403 Forbidden: Order doesn't belong to customer
        404 Not Found: Order not found
    """
    # Extract customer_id from JWT token
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return Response(
            {'error': {'code': 'AUTHENTICATION_REQUIRED', 'message': 'Authentication required'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = auth_header.split(' ')[1]
        access_token = AccessToken(token)
        customer_id = access_token.get('customer_id')
        
        if not customer_id:
            return Response(
                {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid authentication token'}},
                status=status.HTTP_401_UNAUTHORIZED
            )
    except Exception:
        return Response(
            {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid or expired authentication token'}},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        order = OrderManagementService.cancel_order(order_id, customer_id)
        return Response(
            {
                'message': 'Order cancelled successfully',
                'order_id': order.id,
                'status': order.status
            },
            status=status.HTTP_200_OK
        )
    except ValidationError as e:
        error_detail = e.detail if hasattr(e, 'detail') else str(e)
        
        if isinstance(error_detail, dict) and 'order' in error_detail:
            if 'not found' in str(error_detail['order']).lower():
                return Response(
                    {'error': {'code': 'NOT_FOUND', 'message': 'Order not found', 'details': error_detail}},
                    status=status.HTTP_404_NOT_FOUND
                )
            elif 'belong' in str(error_detail['order']).lower():
                return Response(
                    {'error': {'code': 'FORBIDDEN', 'message': 'Order does not belong to you', 'details': error_detail}},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return Response(
            {'error': {'code': 'CANCELLATION_ERROR', 'message': 'Failed to cancel order', 'details': error_detail}},
            status=status.HTTP_400_BAD_REQUEST
        )
