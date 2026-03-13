'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

interface CheckoutFormProps {
  clientSecret: string
  subdomain: string
  storeId: number
}

export default function CheckoutForm({ clientSecret, subdomain, storeId }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()

  const [processing, setProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setErrorMessage(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/store/${subdomain}/checkout/success`,
        },
        redirect: 'if_required'
      })

      if (error) {
        // Payment failed
        setErrorMessage(error.message || 'Payment failed. Please try again.')
        setProcessing(false)
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        router.push(`/store/${subdomain}/checkout/success?payment_intent=${paymentIntent.id}`)
      } else {
        // Payment requires additional action or is processing
        setErrorMessage('Payment is processing. Please wait...')
        setProcessing(false)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Processing...' : 'Pay Now'}
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        Your payment information is securely processed by Stripe
      </p>
    </form>
  )
}
