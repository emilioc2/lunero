# Full Stack Application

## Tech Stack

- **Frontend**: Next.js (TypeScript) - Deployed on Vercel
- **Backend**: Django REST Framework - Deployed on Render
- **Database**: PostgreSQL - Hosted on Neon
- **Payments**: Stripe Integration
- **Storage**: AWS S3 for images

## Project Structure

- `/frontend` - Next.js application
- `/backend` - Django API

## Getting Started

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Configure your .env file
python manage.py migrate
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Configure your .env.local file
npm run dev
```

## Environment Variables

See `.env.example` files in each directory for required configuration.
