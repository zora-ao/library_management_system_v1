import json
import time
from contextlib import contextmanager

from flask import current_app, g, has_request_context, request
from sqlalchemy import event


_METRICS_KEY = "_performance_metrics"


def _request_metrics():
  if not has_request_context():
    return None
  return getattr(g, _METRICS_KEY, None)


@contextmanager
def measure_authentication():
  metrics = _request_metrics()
  if metrics is None:
    yield
    return

  started = time.perf_counter()
  try:
    yield
  finally:
    metrics["auth_ms"] += (time.perf_counter() - started) * 1000


def install_performance_diagnostics(app, db) -> None:
  """Install opt-in, request-scoped timing logs for local diagnosis."""
  if not app.config.get("PERFORMANCE_DIAGNOSTICS"):
    return

  with app.app_context():
    engine = db.engine

  @event.listens_for(engine, "connect")
  def record_new_connection(_dbapi_connection, _connection_record):
    metrics = _request_metrics()
    if metrics is not None:
      metrics["db_connect_count"] += 1

  @event.listens_for(engine, "checkout")
  def record_checkout(_dbapi_connection, _connection_record, _connection_proxy):
    metrics = _request_metrics()
    if metrics is None:
      return
    metrics["db_checkout_count"] += 1
    if metrics["db_checkout_count"] == 1:
      metrics["db_checkout_ms"] = (
        time.perf_counter() - metrics["started_at"]
      ) * 1000

  @event.listens_for(engine, "before_cursor_execute")
  def start_query(
    _connection, _cursor, statement, _parameters, context, _executemany
  ):
    if _request_metrics() is None:
      return
    context._performance_started_at = time.perf_counter()
    context._performance_statement = " ".join(statement.split())[:240]

  @event.listens_for(engine, "after_cursor_execute")
  def finish_query(
    _connection, _cursor, _statement, _parameters, context, _executemany
  ):
    metrics = _request_metrics()
    started = getattr(context, "_performance_started_at", None)
    if metrics is None or started is None:
      return

    duration_ms = (time.perf_counter() - started) * 1000
    metrics["query_count"] += 1
    metrics["db_query_ms"] += duration_ms
    if len(metrics["queries"]) < 20:
      metrics["queries"].append({
        "ms": round(duration_ms, 1),
        "sql": getattr(context, "_performance_statement", ""),
      })

  @app.before_request
  def start_request_performance_metrics():
    setattr(g, _METRICS_KEY, {
      "started_at": time.perf_counter(),
      "auth_ms": 0.0,
      "db_checkout_count": 0,
      "db_checkout_ms": 0.0,
      "db_connect_count": 0,
      "db_query_ms": 0.0,
      "query_count": 0,
      "queries": [],
    })

  @app.after_request
  def log_request_performance_metrics(response):
    metrics = _request_metrics()
    if metrics is None:
      return response

    payload = {
      "method": request.method,
      "path": request.path,
      "status": response.status_code,
      "total_ms": round(
        (time.perf_counter() - metrics["started_at"]) * 1000, 1
      ),
      "db_checkout_count": metrics["db_checkout_count"],
      "db_checkout_ms": round(metrics["db_checkout_ms"], 1),
      "db_connect_count": metrics["db_connect_count"],
      "db_query_ms": round(metrics["db_query_ms"], 1),
      "query_count": metrics["query_count"],
      "auth_ms": round(metrics["auth_ms"], 1),
      "slow_queries": sorted(
        metrics["queries"], key=lambda item: item["ms"], reverse=True
      )[:5],
    }
    current_app.logger.info("PERF %s", json.dumps(payload, sort_keys=True))
    return response
