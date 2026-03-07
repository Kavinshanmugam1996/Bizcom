import csv
import hashlib
import secrets
import os

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}:{key.hex()}"

users = [
    {"email": "kavin@bizcomgrp.com", "password": "Bizcom@123"},
    {"email": "jerry@bizcomgrp.com", "password": "Bizcom@123"}
]

csv_path = r'c:\Users\shanm\Desktop\Machinelearnin\Genai\Bizcom\data\users_db.csv'
os.makedirs(os.path.dirname(csv_path), exist_ok=True)

with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(["email", "hashed_password"])
    for u in users:
        writer.writerow([u["email"], hash_password(u["password"])])

print(f"Created {csv_path} with {len(users)} users.")
