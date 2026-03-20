import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ProposalEssence(Base):
    __tablename__ = "proposal_essences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(String, ForeignKey("analysis_tasks.id"), unique=True)
    problem: Mapped[dict] = mapped_column(JSONB, default=dict)
    method: Mapped[dict] = mapped_column(JSONB, default=dict)
    architecture: Mapped[dict] = mapped_column(JSONB, default=dict)
    innovation: Mapped[dict] = mapped_column(JSONB, default=dict)
    evidence: Mapped[dict] = mapped_column(JSONB, default=dict)
