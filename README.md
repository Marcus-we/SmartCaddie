# SmartCaddie 🏌️‍♂️

A comprehensive golf companion app powered by AI that provides personalized caddie recommendations, round tracking, and performance analytics.

## Features

### 🤖 Smart AI Caddie
Get personalized club and shot recommendations based on:
- **Distance to flag** - Precise GPS-based measurements
- **Real-time weather conditions** - Wind speed, direction, and gusts
- **Lie conditions** - Fairway, light/heavy rough, hardpan, divots, bunkers
- **Ground conditions** - Wet or firm ground affecting ball roll
- **Slope factors** - Uphill/downhill lies, ball above/below feet
- **Interactive feedback system** - Rate recommendations to improve future suggestions

### 📍 Advanced GPS & Mapping
- **Map views** - Golf-optimized satellite map views
- **Real-time location tracking** - High-accuracy GPS positioning
- **Interactive target selection** - Tap map to measure distances
- **Wind direction overlay** - Visual wind arrows with speed indicators
- **Distance measurement** - Precise meter/yard calculations
- **Hole progression** - Easy navigation between holes

### 🏌️ Complete Round Management
- **Round tracking** - Start and manage full golf rounds
- **Hole-by-hole scoring** - Track shots and par for each hole
- **Dynamic par adjustment** - Customize par for each hole
- **Score analytics** - Real-time score relative to par
- **Round completion** - Save rounds with optional notes
- **Round history** - View past performance and trends
- **Quick scoring** - Efficient shot counting interface

### 📊 Statistics & Analytics
- **Performance tracking** - Monitor improvement over time
- **Time-based filtering** - View stats by week, month, or year
- **Score distribution** - Analyze your scoring patterns
- **Course-specific data** - Track performance by course
- **Visual trends** - Interactive charts and graphs
- **Handicap tracking** - Automatic World Handicap System (WHS) calculations

### ⛳ Handicap System
- **WHS Compliance** - Follows official World Handicap System rules
- **Automatic Calculation** - Updates handicap index after each qualifying round
- **Score Differential** - Calculates using course rating and slope rating
- **Rolling Average** - Uses best 8 of last 20 rounds
- **Course Handicap** - Automatic adjustment based on:
  - Course rating
  - Slope rating
  - Par differential
- **Score Types**
  - 18-hole rounds
  - 9-hole rounds (combined for handicap calculation)
- **Handicap Controls**
  - Soft and hard caps on handicap increases
  - Exceptional score reductions

### 👤 User Profile Management
- **Secure authentication** - Token-based login system
- **Profile customization** - Manage personal golf information
- **Password management** - Secure account controls
- **Data persistence** - Reliable state management

### 🎯 Shot Feedback System
- **Recommendation rating** - Thumbs up/down for AI suggestions
- **Club usage tracking** - Record actual clubs used
- **Shot outcome logging** - Track shot results for learning
- **Personalized improvements** - AI learns from your feedback

## Technology Stack

### Frontend (React Native/Expo)
- **Framework**: React Native with Expo
- **Navigation**: Expo Router (type-safe file-based routing)
- **Styling**: NativeWind (Tailwind CSS)
- **Maps**: React Native Maps
- **Location**: Expo Location
- **State Management**: Zustand stores
- **Icons**: Expo Vector Icons (Ionicons)
- **Charts**: Custom chart components

### Backend (FastAPI)
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **AI Integration**: Custom recommendation engine
- **Authentication**: JWT token-based system
- **Weather API**: Open-Meteo integration
- **Database Migrations**: Alembic

## API Endpoints

### Core Features
- `POST /v1/agent/query` - Get personalized caddie recommendations
- `POST /shots/feedback` - Submit feedback on recommendations
- `GET /weather` - Get current weather conditions

### User Management
- `POST /auth/register` - Create new user account
- `POST /auth/login` - User authentication
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile

### Round Management
- `POST /rounds/start` - Start a new golf round
- `GET /rounds/active` - Get current active round
- `PUT /rounds/{id}/hole/{hole_number}` - Update hole score
- `POST /rounds/{id}/complete` - Complete a round
- `GET /rounds/history` - Get round history
- `GET /handicap/index` - Get current handicap index
- `GET /handicap/history` - Get handicap history
- `GET /handicap/course` - Calculate course handicap

## Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- PostgreSQL 12+
- Expo CLI (`npm install -g @expo/cli`)

### Backend Setup
1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/AICaddie.git
   cd AICaddie/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Unix/macOS
   # or
   venv\Scripts\activate     # Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -r app/requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   ```

5. **Initialize database**
   ```bash
   python -m app.db_setup
   python -m app.api.v1.core.dataset.import_courses
   ```

6. **Start server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup
1. **Navigate to frontend**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Update config/api.js with your backend URL
   ```

4. **Start development server**
   ```bash
   npx expo start
   ```

5. **Run on device**
   - Install Expo Go app on your phone
   - Scan QR code from terminal
   - Or run on iOS/Android simulator

## Development Notes

### Key Features in Progress
- Enhanced statistics visualization
- Course management system
- Advanced weather integration
- Performance optimization

### Best Practices
- Keep virtual environment activated during backend development
- Run backend server before starting frontend
- Test on both iOS and Android for compatibility
- Follow the established code structure and patterns

