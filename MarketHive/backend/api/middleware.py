"""
Multi-tenant middleware for isolating data by tenant context.

This middleware extracts tenant information from JWT tokens and request subdomains,
then injects the tenant context into the request for use in views and querysets.

Implementation Notes:
    - Runs on EVERY request before views are executed
    - Provides tenant context (business_id, customer_id, store_id) to all views
    - Enables subdomain-based store routing (e.g., store-name.platform.com)
    - Gracefully handles missing or invalid tokens (sets None values)
    - Token validation errors are handled by DRF authentication, not here
"""
import jwt
from django.conf import settings
from django.http import JsonResponse


class TenantMiddleware:
    """
    Middleware to handle multi-tenant context.
    
    Extracts tenant information from:
    1. JWT token claims (business_id or customer_id)
    2. Subdomain in the request (for store identification)
    
    Injects tenant context into request object for use in views.
    
    Usage in views:
        - request.business_id: ID of authenticated business (or None)
        - request.customer_id: ID of authenticated customer (or None)
        - request.store_id: ID of associated store (or None)
        - request.user_type: 'business' or 'customer' (or None)
        - request.subdomain: Subdomain from URL (or None)
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Extract tenant context from JWT token if present
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                # Decode JWT token to extract claims
                # NOTE: We decode manually here to extract custom claims (business_id, etc.)
                # DRF's JWT authentication will validate the token separately
                payload = jwt.decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=['HS256']
                )
                
                # Inject tenant identifiers into request
                # NOTE: These attributes are used throughout the application for:
                # - Filtering queries by tenant (e.g., Product.objects.filter(store__business_id=request.business_id))
                # - Authorization checks (e.g., ensuring business owns the store)
                # - Audit logging (tracking which user performed an action)
                request.business_id = payload.get('business_id')
                request.customer_id = payload.get('customer_id')
                request.store_id = payload.get('store_id')
                request.user_type = payload.get('user_type')  # 'business' or 'customer'
                
            except jwt.ExpiredSignatureError:
                # Token expired - let the authentication backend handle it
                # NOTE: We don't return an error here; DRF authentication will handle it
                pass
            except jwt.InvalidTokenError:
                # Invalid token - let the authentication backend handle it
                # NOTE: This includes malformed tokens, invalid signatures, etc.
                pass
        
        # Extract subdomain for store routing
        # NOTE: Subdomains enable each store to have its own URL (e.g., nike.platform.com)
        # This is used in customer-facing views to identify which store is being accessed
        host = request.get_host().split(':')[0]  # Remove port if present (e.g., localhost:8000)
        parts = host.split('.')
        
        # If subdomain exists (e.g., store-name.platform.com has 3+ parts)
        # Examples:
        #   - localhost -> no subdomain
        #   - platform.com -> no subdomain
        #   - store-name.platform.com -> subdomain = "store-name"
        if len(parts) > 2:
            request.subdomain = parts[0]
        else:
            request.subdomain = None
        
        # Set default values if not present
        # NOTE: These defaults ensure views can always access these attributes
        # without checking hasattr() or catching AttributeError
        if not hasattr(request, 'business_id'):
            request.business_id = None
        if not hasattr(request, 'customer_id'):
            request.customer_id = None
        if not hasattr(request, 'store_id'):
            request.store_id = None
        if not hasattr(request, 'user_type'):
            request.user_type = None
        
        response = self.get_response(request)
        return response
