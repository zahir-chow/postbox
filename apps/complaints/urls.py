"""
URL routes for the complaints app.
"""

from django.urls import path

from . import views

app_name = "complaints"

urlpatterns = [
    # ── Complaint Submission (AllowAny) ──────────────────────────────────
    path("submit/", views.ComplaintCreateView.as_view(), name="submit"),

    # ── Public Tracking (AllowAny) ───────────────────────────────────────
    path(
        "track/<uuid:tracking_token>/",
        views.ComplaintTrackView.as_view(),
        name="track",
    ),

    # ── S3 Presigned URL (AllowAny, rate-limited) ────────────────────────
    path(
        "upload/presigned-url/",
        views.PresignedURLView.as_view(),
        name="presigned-url",
    ),

    # ── Authenticated Listing ────────────────────────────────────────────
    path("", views.ComplaintListView.as_view(), name="list"),

    # ── Complaint Detail ─────────────────────────────────────────────────
    path("<uuid:pk>/", views.ComplaintDetailView.as_view(), name="detail"),

    # ── Admin Status Update ──────────────────────────────────────────────
    path(
        "<uuid:pk>/status/",
        views.ComplaintStatusUpdateView.as_view(),
        name="status-update",
    ),

    # ── Admin Dashboard Stats ────────────────────────────────────────────
    path("admin/stats/", views.AdminDashboardStatsView.as_view(), name="admin-stats"),
]
