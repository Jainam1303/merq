import os
from dotenv import load_dotenv


load_dotenv()


class Settings:
    def __init__(self) -> None:
        self.port = int(os.getenv("ALGO_PORT", "7001"))
        self.internal_secret = os.getenv("ALGO_INTERNAL_SECRET", "")
        self.kill_switch = os.getenv("ALGO_KILL_SWITCH", "false").lower() == "true"
        self.allowed_skew_seconds = int(os.getenv("ALLOWED_SKEW_SECONDS", "30"))
        self.data_dir = os.getenv(
            "ALGO_DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "data")
        )
        self.database_url = os.getenv("ALGO_DATABASE_URL") or os.getenv("DATABASE_URL", "")
        self.internal_secret = os.getenv("ALGO_INTERNAL_SECRET") or os.getenv("JWT_INTERNAL_SECRET", "")
        self.encryption_key = os.getenv("ENCRYPTION_KEY", "")
        os.makedirs(self.data_dir, exist_ok=True)


settings = Settings()
