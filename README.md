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
- **Dual map views** - Toggle between satellite and golf-optimized views
- **Real-time location tracking** - High-accuracy GPS positioning
- **Interactive target selection** - Tap map to measure distances
- **Wind direction overlay** - Visual wind arrows with speed indicators
- **Distance measurement** - Precise yardage calculations

### 🏌️ Complete Round Management
- **Round tracking** - Start and manage full golf rounds
- **Hole-by-hole scoring** - Track shots and par for each hole
- **Dynamic par adjustment** - Customize par for each hole
- **Score analytics** - Real-time score relative to par
- **Round completion** - Save rounds with optional notes
- **Round history** - View past performance and trends

### 📊 Statistics & Analytics
- **Performance tracking** - Monitor improvement over time
- **9 vs 18-hole stats** - Toggle between different round formats
- **Score distribution** - Analyze your scoring patterns
- **Course-specific data** - Track performance by course

### 👤 User Profile Management
- **Secure authentication** - Token-based login system
- **Profile customization** - Manage personal golf information
- **Club management** - Store and organize your golf clubs
- **Password management** - Secure account controls

### 🎯 Shot Feedback System
- **Recommendation rating** - Thumbs up/down for AI suggestions
- **Club usage tracking** - Record actual clubs used
- **Shot outcome logging** - Track shot results for learning
- **Personalized improvements** - AI learns from your feedback

## Technology Stack

### Frontend (React Native/Expo)
- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Styling**: NativeWind (Tailwind CSS)
- **Maps**: React Native Maps
- **Location**: Expo Location
- **State Management**: Zustand stores
- **Icons**: Expo Vector Icons (Ionicons)

### Backend (FastAPI)
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **AI Integration**: LangSmith + custom agent system
- **Authentication**: JWT token-based system
- **Weather API**: Open-Meteo integration
- **Real-time data**: WebSocket support

### Key Libraries & Services
- **Mapping**: React Native Maps with satellite/standard views
- **Weather**: Open-Meteo API for real-time conditions
- **GPS**: High-accuracy location services
- **AI**: Custom golf recommendation engine
- **Analytics**: Performance tracking and statistics

## API Endpoints

### Core Features
- `POST /v1/agent/query` - Get personalized caddie recommendations
- `POST /shots/feedback` - Submit feedback on recommendations

### User Management
- `POST /auth/register` - Create new user account
- `POST /auth/login` - User authentication
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile

### Round Management
- `POST /rounds/start` - Start a new golf round
- `GET /rounds/active` - Get current active round
- `PUT /rounds/{id}/complete` - Complete a round
- `GET /rounds/history` - Get round history

### Club Management
- `GET /clubs` - Get user's clubs
- `POST /clubs` - Add new club
- `PUT /clubs/{id}` - Update club information
- `DELETE /clubs/{id}` - Remove club

## Setup & Installation

### Prerequisites
- Node.js 18+ and npm/yarn
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

5. **Run database migrations**
   ```bash
   # Add your migration commands here
   ```

6. **Start server**
   ```bash
   uvicorn main:app --reload
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

3. **Configure API endpoint**
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

