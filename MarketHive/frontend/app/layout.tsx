import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/context/AuthContext'
import { CustomerAuthProvider } from '@/lib/context/CustomerAuthContext'
import { CartProvider } from '@/lib/context/CartContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Multi-Tenant E-Commerce Platform',
  description: 'Create and manage your online store',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CustomerAuthProvider>
            <CartProvider>{children}</CartProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
