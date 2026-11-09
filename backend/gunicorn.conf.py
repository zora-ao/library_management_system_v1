# Gunicorn loads this file automatically when started from the backend folder
# (for example `gunicorn run:app`). Command-line flags still override it.
import os

# Without this file gunicorn runs one synchronous worker, which handles one
# request at a time. Each request spends most of its time waiting on the
# remote database, so a page that sends four requests waited for all four in
# turn. Threads let those waits overlap.
worker_class = "gthread"

# One process keeps the in-memory rate-limit counters in a single place and
# fits the free Render instance's memory. Raise WEB_CONCURRENCY only together
# with a shared RATELIMIT_STORAGE_URI (for example Redis).
workers = int(os.getenv("WEB_CONCURRENCY", "1"))
threads = int(os.getenv("GUNICORN_THREADS", "8"))

bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"

# Backup export and restore can take longer than gunicorn's 30 second default.
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))
graceful_timeout = 30
keepalive = 5

accesslog = "-"
errorlog = "-"
