import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Multi-Tenant E-Commerce Platform
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Create and manage your online store
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            href="/business/register"
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/business/login"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}
