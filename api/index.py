import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.server import app
from backend.database import init_db

# Initialize database schema if not present
try:
    init_db()
except Exception:
    pass
