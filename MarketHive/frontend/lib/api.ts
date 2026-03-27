import axios from 'axios'

const api = axios.create({
  // Falls back to the production URL if env var isn't set
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://markethive-backend.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
