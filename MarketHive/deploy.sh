#!/bin/bash

# Multi-Tenant E-Commerce Platform - Deployment Helper Script
# This script helps prepare and verify deployment readiness

set -e

echo "========================================="
echo "MarketHive Deployment Helper"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_info() {
    echo -e "  $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "Step 1: Checking Prerequisites"
echo "-------------------------------"

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    print_success "Python installed: $PYTHON_VERSION"
else
    print_error "Python 3 not found. Please install Python 3.11+"
    exit 1
fi

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm not found. Please install npm"
    exit 1
fi

# Check git
if command_exists git; then
    print_success "Git installed"
else
    print_error "Git not found. Please install Git"
    exit 1
fi

echo ""
echo "Step 2: Checking Backend Setup"
echo "-------------------------------"

# Check if backend directory exists
if [ -d "backend" ]; then
    print_success "Backend directory found"
    
    # Check requirements.txt
    if [ -f "backend/requirements.txt" ]; then
        print_success "requirements.txt found"
    else
        print_error "requirements.txt not found"
    fi
    
    # Check .env.example
    if [ -f "backend/.env.example" ]; then
        print_success ".env.example found"
    else
        print_warning ".env.example not found"
    fi
    
    # Check if .env exists
    if [ -f "backend/.env" ]; then
        print_success ".env file exists"
    else
        print_warning ".env file not found (needed for local testing)"
        print_info "Copy .env.example to .env and fill in values"
    fi
    
else
    print_error "Backend directory not found"
    exit 1
fi

echo ""
echo "Step 3: Checking Frontend Setup"
echo "--------------------------------"

# Check if frontend directory exists
if [ -d "frontend" ]; then
    print_success "Frontend directory found"
    
    # Check package.json
    if [ -f "frontend/package.json" ]; then
        print_success "package.json found"
    else
        print_error "package.json not found"
    fi
    
    # Check if node_modules exists
    if [ -d "frontend/node_modules" ]; then
        print_success "node_modules installed"
    else
        print_warning "node_modules not found"
        print_info "Run: cd frontend && npm install"
    fi
    
else
    print_error "Frontend directory not found"
    exit 1
fi

echo ""
echo "Step 4: Running Backend Tests"
echo "------------------------------"

cd backend

# Check if virtual environment exists
if [ -d "venv" ]; then
    print_success "Virtual environment found"
    source venv/bin/activate
else
    print_warning "Virtual environment not found"
    print_info "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    print_success "Virtual environment created"
fi

# Install dependencies
print_info "Installing backend dependencies..."
pip install -q -r requirements.txt
print_success "Dependencies installed"

# Run tests
print_info "Running backend tests..."
if pytest -q; then
    print_success "All backend tests passed"
else
    print_error "Some backend tests failed"
    print_info "Fix failing tests before deploying"
    exit 1
fi

cd ..

echo ""
echo "Step 5: Building Frontend"
echo "-------------------------"

cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install
fi

# Build frontend
print_info "Building frontend..."
if npm run build > /dev/null 2>&1; then
    print_success "Frontend build successful"
else
    print_error "Frontend build failed"
    print_info "Fix build errors before deploying"
    exit 1
fi

cd ..

echo ""
echo "Step 6: Checking Git Status"
echo "----------------------------"

# Check if git repo
if [ -d ".git" ]; then
    print_success "Git repository initialized"
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "You have uncommitted changes"
        print_info "Commit changes before deploying"
    else
        print_success "No uncommitted changes"
    fi
    
    # Check remote
    if git remote -v | grep -q "origin"; then
        REMOTE_URL=$(git remote get-url origin)
        print_success "Git remote configured: $REMOTE_URL"
    else
        print_warning "No git remote configured"
        print_info "Add remote: git remote add origin <url>"
    fi
else
    print_warning "Not a git repository"
    print_info "Initialize: git init"
fi

echo ""
echo "Step 7: Environment Variables Check"
echo "------------------------------------"

print_info "Required environment variables for production:"
echo ""
echo "Backend (Render):"
echo "  - SECRET_KEY"
echo "  - DEBUG=False"
echo "  - ALLOWED_HOSTS"
echo "  - DATABASE_URL (from Neon)"
echo "  - STRIPE_SECRET_KEY"
echo "  - STRIPE_PUBLISHABLE_KEY"
echo "  - STRIPE_WEBHOOK_SECRET"
echo "  - AWS_ACCESS_KEY_ID"
echo "  - AWS_SECRET_ACCESS_KEY"
echo "  - AWS_STORAGE_BUCKET_NAME"
echo "  - AWS_S3_REGION_NAME"
echo "  - EMAIL_HOST_PASSWORD"
echo "  - FRONTEND_URL"
echo "  - CORS_ALLOWED_ORIGINS"
echo ""
echo "Frontend (Vercel):"
echo "  - NEXT_PUBLIC_API_URL"
echo "  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo ""

echo ""
echo "========================================="
echo "Pre-Deployment Checklist"
echo "========================================="
echo ""
echo "Before deploying, ensure you have:"
echo ""
echo "  [ ] Created Neon PostgreSQL database"
echo "  [ ] Created AWS S3 bucket with CORS configured"
echo "  [ ] Created Stripe account and obtained API keys"
echo "  [ ] Created SendGrid account for email"
echo "  [ ] Pushed code to GitHub"
echo "  [ ] All tests passing"
echo "  [ ] Frontend builds successfully"
echo ""
echo "Next steps:"
echo ""
echo "  1. Follow DEPLOYMENT_CHECKLIST.md for detailed instructions"
echo "  2. Deploy backend to Render"
echo "  3. Deploy frontend to Vercel"
echo "  4. Configure Stripe webhook"
echo "  5. Test production deployment"
echo ""
echo "========================================="
echo "Deployment preparation complete!"
echo "========================================="
