import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()

class Command(BaseCommand):
    help = "Loads dummy user data representing Citizen, UP Member, and Chairman roles into the database."

    def handle(self, *args, **options):
        # Locate the JSON file containing the dummy users
        json_file_path = os.path.join(
            settings.BASE_DIR, "apps", "authentication", "data", "dummy_users.json"
        )

        if not os.path.exists(json_file_path):
            self.stdout.write(
                self.style.ERROR(f"Dummy users data file not found at: {json_file_path}")
            )
            return

        with open(json_file_path, "r", encoding="utf-8") as f:
            dummy_users = json.load(f)

        for user_data in dummy_users:
            username = user_data["username"]
            email = user_data["email"]
            password = user_data["password"]
            
            # Extract role-specific flags
            is_up_member = user_data.get("is_up_member", False)
            is_chairman = user_data.get("is_chairman", False)

            # Check if user already exists
            user = User.objects.filter(username=username).first()
            if not user:
                user = User.objects.filter(email=email).first()

            if user:
                self.stdout.write(f"Updating existing user: {username}")
                user.username = username
                user.email = email
                user.first_name = user_data.get("first_name", "")
                user.last_name = user_data.get("last_name", "")
                user.phone_number = user_data.get("phone_number", "")
                user.nid_number = user_data.get("nid_number", "")
                user.nid_name = user_data.get("nid_name", "")
                user.nid_address = user_data.get("nid_address", "")
                user.nid_verified = user_data.get("nid_verified", False)
                user.is_up_member = is_up_member
                user.is_chairman = is_chairman
                
                # Update password
                user.set_password(password)
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully updated user {username} ({email})")
                )
            else:
                self.stdout.write(f"Creating new user: {username}")
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=user_data.get("first_name", ""),
                    last_name=user_data.get("last_name", ""),
                    phone_number=user_data.get("phone_number", ""),
                    nid_number=user_data.get("nid_number", ""),
                    nid_name=user_data.get("nid_name", ""),
                    nid_address=user_data.get("nid_address", ""),
                    nid_verified=user_data.get("nid_verified", False),
                    is_up_member=is_up_member,
                    is_chairman=is_chairman,
                )
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully created user {username} ({email})")
                )

        self.stdout.write(self.style.SUCCESS("All dummy users loaded successfully!"))
