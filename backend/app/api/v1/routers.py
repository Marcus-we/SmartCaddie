from fastapi import APIRouter
from app.api.v1.core.user_endpoints.users import router as user_router
from app.api.v1.core.user_endpoints.authentication import router as auth_router
from app.api.v1.core.ai_endpoints.ai import router as ai_router
from app.api.v1.core.course_endpoints.rounds_endpoints import router as rounds_router
from app.api.v1.core.course_endpoints.courses import router as course_router


router = APIRouter()

router.include_router(user_router)
router.include_router(auth_router)
router.include_router(ai_router)
router.include_router(rounds_router)
router.include_router(course_router)