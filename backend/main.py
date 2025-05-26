from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from app.api.v1.core.schemas import
from app.api.v1.routers import router
from app.db_setup import init_db


# Funktion som körs när vi startar FastAPI -
# perfekt ställe att skapa en uppkoppling till en databas
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # Vi ska skapa denna funktion
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(router, prefix="/v1", tags=["v1"])

origins = [
    "http://localhost:3000",  # React app URL
    "http://localhost:8000",  # FastAPI app URL
    "http://localhost:5173",  # Another development URL
    "http://192.168.0.129:8000",  # Local network access
    "http://192.168.0.129:8081",  # Expo dev server
    "http://192.168.0.129:19000",  # Expo dev server alternative
    "http://192.168.0.129:19001",  # Expo dev server alternative
    "http://192.168.0.129:19002",  # Expo dev server alternative
    "*",  # Allow all origins for development (remove in production)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)