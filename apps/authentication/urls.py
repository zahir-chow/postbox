"""
URL routes for the authentication app.
"""

from django.urls import path

from . import views

app_name = "auth"

urlpatterns = [
    # JWT Authentication
    path("login/", views.TokenObtainPairView.as_view(), name="login"),
    path("refresh/", views.TokenRefreshView.as_view(), name="refresh"),
    # User Profile
    path("profile/", views.UserProfileView.as_view(), name="profile"),
    # Auto-generated credentials (one-time retrieval)
    path("credentials/", views.CredentialsRetrieveView.as_view(), name="credentials"),
]
