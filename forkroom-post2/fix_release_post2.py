from __future__ import annotations

import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('usage: fix_release_post2.py <release-script>')

path = Path(sys.argv[1]).resolve()
text = path.read_text(encoding='utf-8')
old = '''    --module CommonJS \\
    --moduleResolution Node \\
'''
new = '''    --module CommonJS \\
    --moduleResolution Node \\
    --ignoreDeprecations 6.0 \\
'''
if text.count(old) != 1:
    raise RuntimeError(f'{path}: expected one Node module-resolution anchor, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Updated SHA-256 cross-check compilation for TypeScript 6 node10 deprecation handling.')
