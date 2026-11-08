from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models import Book, Borrow, Category, User


class DashboardService:
    ATTENTION_STATUSES = (
        Borrow.STATUS_PENDING_RETURN,
        Borrow.STATUS_PENDING_BORROW,
        Borrow.STATUS_READY_FOR_PICKUP,
    )

    @staticmethod
    def _as_utc(value: datetime | None) -> datetime:
        if value is None:
            return datetime.now(timezone.utc)
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def get_summary(
        include_user_count: bool,
        timezone_offset_minutes: int,
        timezone_name: str | None = None,
        now_utc: datetime | None = None,
    ) -> dict:
        now = DashboardService._as_utc(now_utc)
        now_for_db = now.replace(tzinfo=None)
        try:
            local_timezone = (
                ZoneInfo(timezone_name)
                if timezone_name
                else timezone(-timedelta(minutes=timezone_offset_minutes))
            )
        except (ZoneInfoNotFoundError, ValueError) as error:
            raise ValueError("Invalid timezone") from error
        local_today = now.astimezone(local_timezone).date()
        local_dates = [local_today - timedelta(days=days) for days in range(6, -1, -1)]

        local_today_start = datetime.combine(
            local_today, time.min, tzinfo=local_timezone
        ).astimezone(timezone.utc).replace(tzinfo=None)

        # Keep these definitions aligned with the Loans & Returns page
        # (frontend/src/features/borrows/lib/loanView.ts): a loan is active
        # until it is returned, and a pending return whose due date has passed
        # (by local calendar day) is still overdue.
        active_condition = Borrow.status.in_((
            Borrow.STATUS_BORROWED,
            Borrow.STATUS_PENDING_RETURN,
            Borrow.STATUS_OVERDUE,
        ))
        overdue_condition = or_(
            Borrow.status == Borrow.STATUS_OVERDUE,
            and_(
                Borrow.status == Borrow.STATUS_BORROWED,
                Borrow.due_date.is_not(None),
                Borrow.due_date < now_for_db,
            ),
            and_(
                Borrow.status == Borrow.STATUS_PENDING_RETURN,
                Borrow.due_date.is_not(None),
                Borrow.due_date < local_today_start,
            ),
        )

        metric_columns = [
            func.count(case((Borrow.status == Borrow.STATUS_PENDING_BORROW, 1))).label("pending"),
            func.count(case((Borrow.status == Borrow.STATUS_READY_FOR_PICKUP, 1))).label("waiting_for_pickup"),
            func.count(case((active_condition, 1))).label("active"),
            func.count(case((overdue_condition, 1))).label("overdue"),
            func.count(case((Borrow.status == Borrow.STATUS_RETURNED, 1))).label("returned"),
            select(func.count(Book.id)).where(Book.is_deleted.is_(False)).scalar_subquery().label("book_titles"),
            select(func.coalesce(func.sum(Book._total_copies), 0)).where(Book.is_deleted.is_(False)).scalar_subquery().label("total_copies"),
            select(func.coalesce(func.sum(Book._available_copies), 0)).where(Book.is_deleted.is_(False)).scalar_subquery().label("available_copies"),
            select(func.count(Category.id)).scalar_subquery().label("categories"),
        ]
        if include_user_count:
            metric_columns.append(select(func.count(User.id)).scalar_subquery().label("total_users"))

        for index, local_date in enumerate(local_dates):
            start = datetime.combine(local_date, time.min, tzinfo=local_timezone).astimezone(timezone.utc).replace(tzinfo=None)
            end = datetime.combine(
                local_date + timedelta(days=1),
                time.min,
                tzinfo=local_timezone,
            ).astimezone(timezone.utc).replace(tzinfo=None)
            metric_columns.extend(
                [
                    func.count(case((and_(Borrow.borrowed_at >= start, Borrow.borrowed_at < end), 1))).label(f"loans_{index}"),
                    func.count(case((and_(Borrow.returned_at >= start, Borrow.returned_at < end), 1))).label(f"returns_{index}"),
                ]
            )

        metrics = db.session.query(*metric_columns).one()._mapping
        urgency = case(
            (overdue_condition, 0),
            (Borrow.status == Borrow.STATUS_PENDING_RETURN, 1),
            (Borrow.status == Borrow.STATUS_PENDING_BORROW, 2),
            (Borrow.status == Borrow.STATUS_READY_FOR_PICKUP, 3),
            else_=4,
        )
        event_date = func.coalesce(
            Borrow.returned_at,
            Borrow.borrowed_at,
            Borrow.approved_at,
            Borrow.created_at,
            Borrow.due_date,
        )
        attention_condition = or_(
            overdue_condition,
            Borrow.status.in_(DashboardService.ATTENTION_STATUSES),
        )
        base_options = (
            joinedload(Borrow.book),
            joinedload(Borrow.user),
        )
        attention = (
            Borrow.query.options(*base_options)
            .filter(attention_condition)
            .order_by(urgency, event_date.desc())
            .limit(3)
            .all()
        )
        recent = (
            Borrow.query.options(*base_options)
            .order_by(event_date.desc())
            .limit(4)
            .all()
        )

        result = {
            "book_titles": int(metrics["book_titles"] or 0),
            "total_copies": int(metrics["total_copies"] or 0),
            "available_copies": int(metrics["available_copies"] or 0),
            "categories": int(metrics["categories"] or 0),
            "pending": int(metrics["pending"] or 0),
            "waiting_for_pickup": int(metrics["waiting_for_pickup"] or 0),
            "active": int(metrics["active"] or 0),
            "overdue": int(metrics["overdue"] or 0),
            "returned": int(metrics["returned"] or 0),
            "returned_today": int(metrics["returns_6"] or 0),
            "attention": [borrow.to_dict() for borrow in attention],
            "recent": [borrow.to_dict() for borrow in recent],
            "activity": [
                {
                    "date": local_date.isoformat(),
                    "loans": int(metrics[f"loans_{index}"] or 0),
                    "returns": int(metrics[f"returns_{index}"] or 0),
                }
                for index, local_date in enumerate(local_dates)
            ],
        }
        if include_user_count:
            result["total_users"] = int(metrics["total_users"] or 0)
        return result
