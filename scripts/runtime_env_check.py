from dotenv import load_dotenv
from pathlib import Path
import os
import sys

env_path = Path(__file__).resolve().parents[1] / "algo-backend" / ".env"
load_dotenv(dotenv_path=env_path)

database_url = os.getenv("DATABASE_URL")
if database_url and database_url.startswith("postgresql+psycopg2://"):
    database_url = database_url.replace("postgresql+psycopg2://", "postgresql://", 1)
print(f"ENV_PATH={env_path}")
print(f"DATABASE_URL={database_url}")

try:
    import psycopg2  # type: ignore
except Exception as exc:
    print(f"PSYCOPG2_ERROR={exc}")
    sys.exit(1)

if not database_url:
    print("DATABASE_URL missing")
    sys.exit(1)

try:
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    cur.execute("SELECT 1")
    print(f"DB_OK={cur.fetchone()[0]}")
    conn.close()
except Exception as exc:
    print(f"DB_ERROR={exc}")
    sys.exit(1)
