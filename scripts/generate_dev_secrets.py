import secrets


def main() -> None:
    print("Copy these values into your local .env. Never commit them.")
    print("")
    print("# --- Auth ---")
    print(f"JWT_ACCESS_SECRET={secrets.token_urlsafe(64)}")
    print(f"JWT_REFRESH_SECRET={secrets.token_urlsafe(64)}")
    print("")
    print("# --- Service-to-service ---")
    print(f"ALGO_BACKEND_KEY={secrets.token_urlsafe(64)}")
    print("")
    print("# --- Encryption ---")
    print(f"BROKER_KEY_MASTER_KEY={secrets.token_hex(32)}")
    print(f"ENCRYPTION_KEY={secrets.token_urlsafe(64)}")
    print("")
    print("# --- Database ---")
    print(f"DB_PASSWORD={secrets.token_urlsafe(32)}")
    print("")
    print("# --- Payments (placeholders) ---")
    print("RAZORPAY_KEY_ID=")
    print("RAZORPAY_KEY_SECRET=")


if __name__ == "__main__":
    main()
