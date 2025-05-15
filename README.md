# SmartCaddie

A golf caddie assistant powered by AI that provides personalized recommendations for golf shots based on current conditions.

## Features

- **AI Golf Caddie**: Get personalized club and shot recommendations based on:
  - Distance to flag
  - Wind conditions (speed and direction)
  - Lie conditions (fairway, rough, bunker, etc.)
  - Ground conditions (wet, firm)
  - Slope factors (uphill, downhill, ball above/below feet)

- **User Management**: Create and manage your golf profile
  - Authentication system
  - Store your preferred clubs and typical distances

## Technology Stack

- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **AI Integration**: LangSmith + custom agent system
- **Authentication**: Database token-based system

## API Endpoints

- `/v1/agent/query`: Get personalized caddie recommendations
- User authentication endpoints (login, register, etc.)
- Club management endpoints

## Setup

Requires PostgreSQL and Python 3.x. Configure database connection in .env file.

## Development

1. Create virtual environment: `python -m venv venv`
2. Activate environment: `source venv/bin/activate` (Unix) or `venv\Scripts\activate` (Windows)
3. Install dependencies: `pip install -r app/requirements.txt`
4. Run server: `uvicorn main:app --reload`
