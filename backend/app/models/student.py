from app.extensions import db
from app.models.base import BaseEntity
from sqlalchemy.dialects.postgresql import UUID


class Student(BaseEntity):
    __tablename__ = "students"

    user_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    student_number = db.Column(
        db.String(50),
        unique=True,
        nullable=True
    )

    course = db.Column(
        db.String(100),
        nullable=True
    )

    year_level = db.Column(
        db.String(50),
        nullable=True
    )

    enrollment_status = db.Column(
        db.String(50),
        nullable=False,
        default="Enrolled"
    )

    user = db.relationship(
        "User",
        back_populates="student"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "student_number": self.student_number,
            "course": self.course,
            "year_level": self.year_level,
            "enrollment_status": self.enrollment_status,
        }