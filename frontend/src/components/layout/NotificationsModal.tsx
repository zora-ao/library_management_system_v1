import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useBorrowHistory, useBorrows } from "@/hooks/useBorrows";
import { borrowState, formatBorrowDate } from "@/features/borrows/borrow-view";
import type { Borrow } from "@/features/borrows/types/borrow.types";

export interface UserNotification {
  id: string;
  borrowId: string;
  bookId: string;
  bookTitle: string;
  kind:
    | "overdue"
    | "ready"
    | "soon"
    | "pending"
    | "pending-return"
    | "rejected"
    | "returned"
    | "borrowed";
  title: string;
  message: string;
  dateLabel: string;
  priority: number;
}

const STORAGE_PREFIX = "booky-read-notifications:";

function loadReadIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveReadIds(userId: string, ids: string[]) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors
  }
}

function buildUserNotifications(
  active: Borrow[],
  history: Borrow[],
  now = new Date()
): UserNotification[] {
  const items: UserNotification[] = [];

  for (const borrow of active) {
    const state = borrowState(borrow, now);
    const title = borrow.book_title || "Unknown book";
    const kind = state.kind as UserNotification["kind"];

    if (kind === "overdue") {
      items.push({
        id: `${borrow.id}:overdue`,
        borrowId: borrow.id,
        bookId: borrow.book_id,
        bookTitle: title,
        kind: "overdue",
        title: "Book overdue",
        message: `“${title}” is ${state.label.toLowerCase()}. Please return it to the library desk.`,
        dateLabel: borrow.due_date ? `Due ${formatBorrowDate(borrow.due_date)}` : "Overdue",
        priority: 1,
      });
    } else if (kind === "ready") {
      items.push({
        id: `${borrow.id}:ready`,
        borrowId: borrow.id,
        bookId: borrow.book_id,
        bookTitle: title,
        kind: "ready",
        title: "Ready for pickup",
        message: `Your request for “${title}” was approved and is ready for pickup at the library desk.`,
        dateLabel: formatBorrowDate(borrow.approved_at || borrow.created_at),
        priority: 2,
      });
    } else if (kind === "soon") {
      items.push({
        id: `${borrow.id}:soon`,
        borrowId: borrow.id,
        bookId: borrow.book_id,
        bookTitle: title,
        kind: "soon",
        title: "Book due soon",
        message: `“${title}” is ${state.label.toLowerCase()} (due ${formatBorrowDate(borrow.due_date)}).`,
        dateLabel: `Due ${formatBorrowDate(borrow.due_date)}`,
        priority: 3,
      });
    } else if (kind === "pending") {
      items.push({
        id: `${borrow.id}:pending`,
        borrowId: borrow.id,
        bookId: borrow.book_id,
        bookTitle: title,
        kind: "pending",
        title: "Borrow request submitted",
        message: `Your request to borrow “${title}” is awaiting librarian approval.`,
        dateLabel: formatBorrowDate(borrow.created_at),
        priority: 4,
      });
    } else if (kind === "pending-return") {
      items.push({
        id: `${borrow.id}:pending-return`,
        borrowId: borrow.id,
        bookId: borrow.book_id,
        bookTitle: title,
        kind: "pending-return",
        title: "Return awaiting confirmation",
        message: `Your return for “${title}” is awaiting librarian confirmation at the desk.`,
        dateLabel: formatBorrowDate(borrow.borrowed_at || borrow.created_at),
        priority: 5,
      });
    } else {
      items.push({
        id: `${borrow.id}:borrowed`,
        borrowId: borrow.id,
        bookId: borrow.book_id,
        bookTitle: title,
        kind: "borrowed",
        title: "Active borrow",
        message: `You borrowed “${title}”. Due on ${formatBorrowDate(borrow.due_date)}.`,
        dateLabel: borrow.due_date ? `Due ${formatBorrowDate(borrow.due_date)}` : formatBorrowDate(borrow.borrowed_at),
        priority: 6,
      });
    }
  }

  for (const borrow of history.slice(0, 8)) {
    const title = borrow.book_title || "Unknown book";
    if (borrow.status === "REJECTED") {
      items.push({
        id: `${borrow.id}:rejected`,
        borrowId: borrow.id,
        bookId: borrow.book_id,
        bookTitle: title,
        kind: "rejected",
        title: "Borrow request declined",
        message: `Your request for “${title}” was declined${borrow.rejection_reason ? `: ${borrow.rejection_reason}` : "."}`,
        dateLabel: formatBorrowDate(borrow.created_at),
        priority: 7,
      });
    } else if (borrow.status === "RETURNED") {
      items.push({
        id: `${borrow.id}:returned`,
        borrowId: borrow.id,
        bookId: borrow.book_id,
        bookTitle: title,
        kind: "returned",
        title: "Return confirmed",
        message: `Your return of “${title}” has been confirmed by the library.`,
        dateLabel: formatBorrowDate(borrow.returned_at),
        priority: 8,
      });
    }
  }

  return items.sort((a, b) => a.priority - b.priority);
}

function NotificationIcon({ kind }: { kind: UserNotification["kind"] }) {
  switch (kind) {
    case "overdue":
      return <AlertTriangle size={18} aria-hidden="true" />;
    case "rejected":
      return <XCircle size={18} aria-hidden="true" />;
    case "ready":
      return <Sparkles size={18} aria-hidden="true" />;
    case "returned":
      return <CheckCircle2 size={18} aria-hidden="true" />;
    case "soon":
    case "pending":
    case "pending-return":
      return <Clock size={18} aria-hidden="true" />;
    default:
      return <BookOpen size={18} aria-hidden="true" />;
  }
}

export default function NotificationsModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const active = useBorrows();
  const history = useBorrowHistory();
  const [open, setOpen] = useState(false);
  const userKey = user?.id || user?.username || "guest";
  const [readIds, setReadIds] = useState<string[]>(() => loadReadIds(userKey));
  // Reload read state when a different user signs in, during render rather than
  // in an effect, so the bell never shows the previous user's read markers.
  const [readIdsUser, setReadIdsUser] = useState(userKey);
  if (readIdsUser !== userKey) {
    setReadIdsUser(userKey);
    setReadIds(loadReadIds(userKey));
  }

  const notifications = useMemo(
    () => buildUserNotifications(active.data ?? [], history.data ?? []),
    [active.data, history.data]
  );

  const readSet = useMemo(() => new Set(readIds), [readIds]);
  const unreadCount = useMemo(
    () => notifications.filter((item) => !readSet.has(item.id)).length,
    [notifications, readSet]
  );

  const markAsRead = (id: string) => {
    if (readSet.has(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    saveReadIds(userKey, next);
  };

  const markAllAsRead = () => {
    const next = Array.from(new Set([...readIds, ...notifications.map((n) => n.id)]));
    setReadIds(next);
    saveReadIds(userKey, next);
  };

  const handleSelectNotification = (item: UserNotification) => {
    markAsRead(item.id);
    setOpen(false);
    navigate("/my-borrows");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className="booky-notifications"
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
      >
        <img src="/catalog/bell.svg" alt="" />
        {unreadCount > 0 && (
          <span className="booky-notifications-badge" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="booky-notifications-dialog"
        overlayClassName="booky-notifications-backdrop"
      >
        <div className="booky-notifications-header">
          <div>
            <div className="booky-notifications-title-row">
              <DialogTitle className="booky-notifications-title">
                Notifications
              </DialogTitle>
              {unreadCount > 0 && (
                <span className="booky-notifications-count-pill">
                  {unreadCount} new
                </span>
              )}
            </div>
            <DialogDescription className="booky-notifications-subtitle">
              Updates on your borrow requests, pickups, and due dates.
            </DialogDescription>
          </div>

          <div className="booky-notifications-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="booky-notifications-mark-all"
                onClick={markAllAsRead}
              >
                <CheckCheck size={15} aria-hidden="true" />
                <span>Mark all read</span>
              </button>
            )}
            <DialogClose
              className="booky-notifications-close"
              aria-label="Close notifications"
            >
              <X size={18} aria-hidden="true" />
            </DialogClose>
          </div>
        </div>

        <div className="booky-notifications-body">
          {notifications.length === 0 ? (
            <div className="booky-notifications-empty">
              <span className="booky-notifications-empty-icon" aria-hidden="true">
                <Bell size={24} />
              </span>
              <h3>You’re all caught up</h3>
              <p>
                New updates about your borrow requests, pickups, and due dates
                will appear here.
              </p>
            </div>
          ) : (
            <ul className="booky-notifications-list" role="list">
              {notifications.map((item) => {
                const isUnread = !readSet.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`booky-notification-item ${isUnread ? "is-unread" : ""}`}
                      onClick={() => handleSelectNotification(item)}
                    >
                      <span
                        className={`booky-notification-icon ${item.kind}`}
                        aria-hidden="true"
                      >
                        <NotificationIcon kind={item.kind} />
                      </span>
                      <span className="booky-notification-copy">
                        <span className="booky-notification-top">
                          <strong>{item.title}</strong>
                          <time>{item.dateLabel}</time>
                        </span>
                        <span className="booky-notification-message">
                          {item.message}
                        </span>
                      </span>
                      {isUnread && (
                        <span
                          className="booky-notification-dot"
                          aria-label="Unread notification"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
