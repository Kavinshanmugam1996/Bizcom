import json
import os
import hashlib
import secrets
import argparse
from datetime import datetime, timezone


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}:{key.hex()}"


def load_json(path: str):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data if isinstance(data, dict) else {}


def save_json(path: str, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Create System 2 cohort with primary and secondary users")
    parser.add_argument("--cohort-id", default="COHORT-001")
    parser.add_argument("--company-name", default="AIRES Client")
    parser.add_argument("--primary-email", required=True)
    parser.add_argument("--secondary-email", required=True)
    parser.add_argument("--primary-password", default="Primary@123")
    parser.add_argument("--secondary-password", default="Secondary@123")
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "data", "system2_cohorts.json")

    cohorts = load_json(data_path)

    cohorts[args.cohort_id] = {
        "company_name": args.company_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "users": {
            "primary": {
                "email": args.primary_email.strip().lower(),
                "hashed_password": hash_password(args.primary_password),
            },
            "secondary": {
                "email": args.secondary_email.strip().lower(),
                "hashed_password": hash_password(args.secondary_password),
            },
        },
        "selections": {
            "primary": [],
            "secondary": [],
        },
        "survey_unlocked": False,
        "survey_link": "",
    }

    save_json(data_path, cohorts)

    print("Created/updated cohort in:", data_path)
    print("Portal URL: http://127.0.0.1:8000/system2")
    print("Cohort ID:", args.cohort_id)
    print("Primary:", args.primary_email, "/", args.primary_password)
    print("Secondary:", args.secondary_email, "/", args.secondary_password)


if __name__ == "__main__":
    main()
