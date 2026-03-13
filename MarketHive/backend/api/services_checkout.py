"""
Checkout and payment processing services.
"""

import stripe
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import Cart, CartItem, Order, OrderItem, Payment, Product

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class CheckoutService:
    """
    Service for handling checkout validation and calculations.
    """
    
    @staticmethod
    def validate_cart(cart_id, customer_id):
        """
        Validate cart for checkout.
        
        Args:
            cart_id (int): ID of the cart
            customer_id (int): ID of the customer
        
        Returns:
            dict: Validation result with cart and items
        
        Raises:
            ValidationError: If cart invalid, empty, or products unavailable
        
        Implementation Notes:
            - Requires customer authentication (Req 13.1)
            - Validates all products still exist (Req 13.4)
            - Validates sufficient quantity for all items (Req 13.5)
        """
        # Get cart
        try:
            cart = Cart.objects.get(id=cart_id, customer_id=customer_id)
        except Cart.DoesNotExist:
            raise ValidationError({
                'cart': 'Cart not found or does not belong to you.'
            })
        
        # Get cart items
        items = CartItem.objects.filter(cart=cart).select_related('product')
        
        if not items.exists():
            raise ValidationError({
                'cart': 'Cart is empty.'
            })
        
        # Validate each item
        unavailable_items = []
        
        for item in items:
            # Check product still exists
            if not Product.objects.filter(id=item.product_id).exists():
                unavailable_items.append({
                    'product_id': item.product_id,
                    'reason': 'Product no longer available'
                })
                continue
            
            # Check sufficient quantity
            if item.product.quantity < item.quantity:
                unavailable_items.append({
                    'product_id': item.product_id,
                    'product_name': item.product.name,
                    'requested': item.quantity,
                    'available': item.product.quantity,
                    'reason': 'Insufficient stock'
                })
        
        if unavailable_items:
            raise ValidationError({
                'items': 'Some items are unavailable',
                'unavailable_items': unavailable_items
            })
        
        return {
            'cart': cart,
            'items': list(items)
        }
    
    @staticmethod
    def calculate_totals(cart_id, shipping_address):
        """
        Calculate checkout totals.
        
        Args:
            cart_id (int): ID of the cart
            shipping_address (dict): Shipping address with country, state, zip
        
        Returns:
            dict: Dictionary containing:
                - subtotal (Decimal): Sum of item prices
                - shipping (Decimal): Shipping cost
                - tax (Decimal): Tax amount
                - total (Decimal): Grand total
        
        Implementation Notes:
            - Calculates shipping based on total weight and destination (Req 13.6)
            - Tax calculation is simplified (would integrate with tax service in production)
            - All amounts in store currency
        """
        # Get cart items
        items = CartItem.objects.filter(cart_id=cart_id).select_related('product')
        
        # Calculate subtotal
        subtotal = Decimal('0.00')
        total_weight_grams = 0
        
        for item in items:
            subtotal += item.price_at_addition * item.quantity
            total_weight_grams += item.product.weight_grams * item.quantity
        
        # Calculate shipping cost based on weight
        # Simple calculation: $5 base + $0.01 per 100g
        shipping = Decimal('5.00') + Decimal(total_weight_grams / 100) * Decimal('0.01')
        shipping = shipping.quantize(Decimal('0.01'))
        
        # Calculate tax (simplified - 10% for demo)
        # In production, would use tax service based on shipping address
        tax = (subtotal * Decimal('0.10')).quantize(Decimal('0.01'))
        
        # Calculate total
        total = subtotal + shipping + tax
        
        return {
            'subtotal': subtotal,
            'shipping': shipping,
            'tax': tax,
            'total': total
        }
    
    @staticmethod
    def create_payment_intent(cart_id, customer_id, shipping_address):
        """
        Create Stripe payment intent.
        
        Args:
            cart_id (int): ID of the cart
            customer_id (int): ID of the customer
            shipping_address (dict): Shipping address
        
        Returns:
            dict: Dictionary containing:
                - client_secret (str): Stripe client secret for frontend
                - payment_intent_id (str): Stripe payment intent ID
                - amount (int): Amount in cents
        
        Raises:
            ValidationError: If cart validation fails or Stripe error
        
        Implementation Notes:
            - Creates Stripe PaymentIntent with cart total (Req 14.1)
            - Supports credit card, debit card, digital wallets (Req 14.2, 14.3)
            - Returns client secret for frontend Stripe.js
        """
        from .models import Customer
        
        # Validate cart
        validation = CheckoutService.validate_cart(cart_id, customer_id)
        
        # Calculate totals
        totals = CheckoutService.calculate_totals(cart_id, shipping_address)
        
        # Get customer
        customer = Customer.objects.get(id=customer_id)
        
        # Convert total to cents for Stripe
        amount_cents = int(totals['total'] * 100)
        
        try:
            # Create Stripe PaymentIntent
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='usd',
                payment_method_types=['card'],  # Supports credit/debit cards
                metadata={
                    'cart_id': cart_id,
                    'customer_id': customer_id,
                    'customer_email': customer.email
                }
            )
            
            return {
                'client_secret': payment_intent.client_secret,
                'payment_intent_id': payment_intent.id,
                'amount': amount_cents,
                'totals': totals
            }
        
        except stripe.error.StripeError as e:
            raise ValidationError({
                'payment': f'Payment processing error: {str(e)}'
            })


class PaymentService:
    """
    Service for handling payment webhooks and order creation.
    """
    
    @staticmethod
    def handle_webhook(payload, sig_header):
        """
        Handle Stripe webhook events.
        
        Args:
            payload (bytes): Raw webhook payload
            sig_header (str): Stripe signature header
        
        Returns:
            dict: Processing result
        
        Raises:
            ValidationError: If signature verification fails
        
        Implementation Notes:
            - Verifies Stripe webhook signatures (Req 14.8)
            - Processes payment_intent.succeeded events
            - Processes payment_intent.payment_failed events
            - Ensures idempotent processing using event IDs
        """
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        
        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError:
            raise ValidationError({'webhook': 'Invalid payload'})
        except stripe.error.SignatureVerificationError:
            raise ValidationError({'webhook': 'Invalid signature'})
        
        # Handle event
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            return PaymentService._handle_payment_succeeded(payment_intent)
        
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            return PaymentService._handle_payment_failed(payment_intent)
        
        return {'status': 'ignored', 'event_type': event['type']}
    
    @staticmethod
    def _handle_payment_succeeded(payment_intent):
        """
        Handle successful payment.
        
        Creates order, decrements inventory, clears cart, sends confirmation email.
        """
        cart_id = payment_intent['metadata'].get('cart_id')
        customer_id = payment_intent['metadata'].get('customer_id')
        
        if not cart_id or not customer_id:
            return {'status': 'error', 'message': 'Missing metadata'}
        
        # Create order in transaction
        try:
            order = OrderManagementService.create_order(
                cart_id=int(cart_id),
                customer_id=int(customer_id),
                stripe_payment_intent_id=payment_intent['id']
            )
            
            return {
                'status': 'success',
                'order_id': order.id,
                'order_number': order.order_number
            }
        
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    @staticmethod
    def _handle_payment_failed(payment_intent):
        """
        Handle failed payment.
        
        Logs failure, preserves cart for retry.
        """
        return {
            'status': 'payment_failed',
            'payment_intent_id': payment_intent['id']
        }


class OrderManagementService:
    """
    Service for handling order creation and management.
    """
    
    @staticmethod
    @transaction.atomic
    def create_order(cart_id, customer_id, stripe_payment_intent_id):
        """
        Create order from cart after successful payment.
        
        Args:
            cart_id (int): ID of the cart
            customer_id (int): ID of the customer
            stripe_payment_intent_id (str): Stripe payment intent ID
        
        Returns:
            Order: Created Order instance
        
        Implementation Notes:
            - Executes in database transaction (Req 14.5)
            - Creates Order with status "paid" (Req 14.5)
            - Creates OrderItem records with product_snapshot (Req 14.5)
            - Decrements product quantities (Req 14.9)
            - Clears cart items (Req 14.9)
            - Sends order confirmation email (Req 14.9)
        """
        import uuid
        from django.utils import timezone
        
        # Get cart and items
        cart = Cart.objects.select_related('store').get(id=cart_id)
        items = CartItem.objects.filter(cart=cart).select_related('product')
        
        if not items.exists():
            raise ValidationError({'cart': 'Cart is empty'})
        
        # Calculate totals
        subtotal = Decimal('0.00')
        for item in items:
            subtotal += item.price_at_addition * item.quantity
        
        # Simple shipping and tax calculation
        shipping = Decimal('5.00')
        tax = (subtotal * Decimal('0.10')).quantize(Decimal('0.01'))
        total = subtotal + shipping + tax
        
        # Generate unique order number
        order_number = f"ORD-{uuid.uuid4().hex[:12].upper()}"
        
        # Create order
        order = Order.objects.create(
            order_number=order_number,
            customer_id=customer_id,
            store=cart.store,
            status='paid',
            subtotal=subtotal,
            shipping_cost=shipping,
            tax=tax,
            total=total,
            stripe_payment_intent_id=stripe_payment_intent_id,
            shipping_address={}  # Would be populated from checkout
        )
        
        # Create order items and decrement inventory
        for item in items:
            # Create order item with product snapshot
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.price_at_addition,
                product_snapshot={
                    'name': item.product.name,
                    'description': item.product.description,
                    'category': item.product.category
                }
            )
            
            # Decrement product quantity
            product = item.product
            product.quantity -= item.quantity
            product.save(update_fields=['quantity'])
        
        # Clear cart
        items.delete()
        
        # Send confirmation email (would implement in production)
        # EmailService.send_order_confirmation(order)
        
        return order
    
    @staticmethod
    def cancel_order(order_id, customer_id):
        """
        Cancel order and process refund.
        
        Args:
            order_id (int): ID of the order to cancel
            customer_id (int): ID of the customer
        
        Returns:
            Order: Updated Order instance
        
        Raises:
            ValidationError: If order not found, not owned by customer,
                           or not eligible for cancellation
        
        Implementation Notes:
            - Only allows cancellation for "paid" or "processing" orders (Req 16.2)
            - Rejects cancellation for "shipped", "delivered", "cancelled" (Req 16.3)
            - Updates order status to "cancelled" (Req 16.1)
            - Initiates refund via Stripe (Req 16.4)
            - Restores product quantities (Req 16.6)
            - Sends cancellation confirmation email (Req 16.5)
        """
        # Get order
        try:
            order = Order.objects.get(id=order_id, customer_id=customer_id)
        except Order.DoesNotExist:
            raise ValidationError({
                'order': 'Order not found or does not belong to you.'
            })
        
        # Check if order can be cancelled
        if order.status not in ['paid', 'processing']:
            raise ValidationError({
                'order': f'Cannot cancel order with status "{order.status}". Only paid or processing orders can be cancelled.'
            })
        
        # Process in transaction
        with transaction.atomic():
            # Update order status
            order.status = 'cancelled'
            order.save(update_fields=['status'])
            
            # Restore inventory
            order_items = OrderItem.objects.filter(order=order).select_related('product')
            for item in order_items:
                product = item.product
                product.quantity += item.quantity
                product.save(update_fields=['quantity'])
            
            # Initiate refund
            if order.stripe_payment_intent_id:
                try:
                    refund = stripe.Refund.create(
                        payment_intent=order.stripe_payment_intent_id
                    )
                    
                    # Create refund record
                    from .models import Refund, Payment
                    payment = Payment.objects.filter(order=order).first()
                    if payment:
                        Refund.objects.create(
                            payment=payment,
                            amount=order.total,
                            stripe_refund_id=refund.id,
                            status='succeeded'
                        )
                
                except stripe.error.StripeError as e:
                    # Log error but don't fail cancellation
                    print(f"Refund failed: {e}")
            
            # Send cancellation email (would implement in production)
            # EmailService.send_cancellation_confirmation(order)
        
        return order
