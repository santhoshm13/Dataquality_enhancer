import os

path = "backend/app/services/llm/vision_extractor.py"
with open(path, "rb") as f:
    raw = f.read()

# Decode as cp1252, re-encode as utf-8
text = raw.decode("cp1252", errors="replace")
with open(path, "w", encoding="utf-8") as f:
    f.write(text)

import ast
with open(path, encoding="utf-8") as f:
    src = f.read()
ast.parse(src)
print("vision_extractor.py: re-encoded to UTF-8, syntax OK")
