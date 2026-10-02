"""
Chat API route — primary transaction entry interface.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ChatInput, ChatResponse
from ..services.transaction_service import TransactionService

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatWithCategory(BaseModel):
    message: str
    category_id: str


@router.post("", response_model=ChatResponse)
def process_chat(data: ChatInput, db: Session = Depends(get_db)):
    """
    Process a chat message → parse → save transaction.

    This is the primary endpoint for the chat-style transaction entry.
    """
    service = TransactionService(db)
    return service.process_chat_input(data.message)


@router.post("/with-category", response_model=ChatResponse)
def process_chat_with_category(data: ChatWithCategory, db: Session = Depends(get_db)):
    """
    Process a previously ambiguous chat message with a user-selected category.
    """
    service = TransactionService(db)
    return service.process_chat_with_category(data.message, data.category_id)
