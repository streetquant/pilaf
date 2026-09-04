from __future__ import annotations

import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('usage: apply_post2_fix.py <forkroom-source-root>')

root = Path(sys.argv[1]).resolve()
path = root / 'src/domain/integrity.ts'
text = path.read_text(encoding='utf-8')
old = '  const hash = [...SHA256_INITIAL]\n'
new = '  const hash: number[] = [...SHA256_INITIAL]\n'
if text.count(old) != 1:
    raise RuntimeError(f'{path}: expected exactly one SHA state anchor, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Applied ForkRoom post.2 strict SHA-256 typing fix.')
