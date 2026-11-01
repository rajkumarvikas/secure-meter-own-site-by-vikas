"""Rebuild tools/case-study/data/trk-data.js from a CSV file.

Usage:  python scripts/csv_to_js.py my_tracker.csv
The CSV must keep the same header row as before (Meter Sr. No., DT Name, DT Code, ...).
"""
import json, sys, pathlib
src = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8-sig")
out = pathlib.Path(__file__).resolve().parent.parent / "tools/case-study/data/trk-data.js"
out.write_text("window.TRK_CSV=" + json.dumps(src, ensure_ascii=False) + ";\n", encoding="utf-8")
print("Written", out)
