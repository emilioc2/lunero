from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import views_cart
from . import views_checkout

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    
    # Business endpoints
    path('v1/business/register', views.business_register, name='business_register'),
    path('v1/business/verify-email', views.business_verify_email, name='business_verify_email'),
    path('v1/business/login', views.business_login, name='business_login'),
    path('v1/business/token/refresh', TokenRefreshView.as_view(), name='business_token_refresh'),
    
    # Store endpoints
    path('v1/stores', views.store_create, name='store_create'),
    path('v1/stores/by-subdomain/<str:subdomain>', views.store_get_by_subdomain, name='store_get_by_subdomain'),
    path('v1/stores/<int:store_id>', views.store_detail, name='store_detail'),
    path('v1/stores/<int:store_id>/logo', views.store_upload_logo, name='store_upload_logo'),
    path('v1/stores/<int:store_id>/products', views.product_list, name='product_list'),
    path('v1/stores/<int:store_id>/products/create', views.product_create, name='product_create'),
    path('v1/stores/<int:store_id>/search', views.product_search, name='product_search'),
    
    # Product endpoints
    path('v1/products/<int:product_id>', views.product_detail, name='product_detail'),
    path('v1/products/<int:product_id>/update', views.product_update, name='product_update'),
    path('v1/products/<int:product_id>/delete', views.product_delete, name='product_delete'),
    path('v1/products/<int:product_id>/images', views.product_upload_images, name='product_upload_images'),
    
    # Customer endpoints
    path('v1/customers/register', views.customer_register, name='customer_register'),
    path('v1/customers/verify-email', views.customer_verify_email, name='customer_verify_email'),
    path('v1/customers/login', views.customer_login, name='customer_login'),
    path('v1/customers/profile', views.customer_profile, name='customer_profile'),
    path('v1/customers/token/refresh', TokenRefreshView.as_view(), name='customer_token_refresh'),
    
    # Cart endpoints
    path('v1/stores/<int:store_id>/cart', views_cart.cart_get, name='cart_get'),
    path('v1/stores/<int:store_id>/cart/items', views_cart.cart_add_item, name='cart_add_item'),
    path('v1/stores/<int:store_id>/cart/merge', views_cart.cart_merge, name='cart_merge'),
    path('v1/cart/items/<int:cart_item_id>', views_cart.cart_update_item, name='cart_update_item'),
    path('v1/cart/items/<int:cart_item_id>/delete', views_cart.cart_remove_item, name='cart_remove_item'),
    
    # Checkout endpoints
    path('v1/checkout/validate', views_checkout.checkout_validate, name='checkout_validate'),
    path('v1/checkout/calculate', views_checkout.checkout_calculate, name='checkout_calculate'),
    path('v1/checkout/payment', views_checkout.checkout_create_payment_intent, name='checkout_payment'),
    path('v1/webhooks/stripe', views_checkout.stripe_webhook, name='stripe_webhook'),
    
    # Order endpoints
    path('v1/orders', views_checkout.order_list, name='order_list'),
    path('v1/orders/<int:order_id>', views_checkout.order_detail, name='order_detail'),
    path('v1/orders/<int:order_id>/cancel', views_checkout.order_cancel, name='order_cancel'),
]
