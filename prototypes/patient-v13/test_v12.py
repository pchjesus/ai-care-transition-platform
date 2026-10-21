"""Compatibility entry for the preserved v1.2 regression assertions."""
from pathlib import Path
import runpy,sys
root=Path(__file__).resolve().parent
sys.path.insert(0,str(root/"tests"))
runpy.run_path(str(root/"tests"/"legacy_regression.py"),run_name="__main__")
