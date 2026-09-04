from __future__ import annotations

import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('usage: fix_release_post2.py <release-script>')

path = Path(sys.argv[1]).resolve()
text = path.read_text(encoding='utf-8')
replacements = [
    (
        '''    --module CommonJS \\
    --moduleResolution Node \\
''',
        '''    --module CommonJS \\
    --moduleResolution Node \\
    --ignoreDeprecations 6.0 \\
''',
        'TypeScript module-resolution anchor',
    ),
    (
        '''HASH_BUILD="$HASH_BUILD" node <<'NODE' | tee "$SHA_CROSSCHECK"''',
        '''FORKROOM_HASH_BUILD="$HASH_BUILD" node <<'NODE' | tee "$SHA_CROSSCHECK"''',
        'readonly environment anchor',
    ),
    (
        "path.join(process.env.HASH_BUILD, 'integrity.js')",
        "path.join(process.env.FORKROOM_HASH_BUILD, 'integrity.js')",
        'Node environment lookup anchor',
    ),
]
for old, new, label in replacements:
    if text.count(old) != 1:
        raise RuntimeError(f'{path}: expected one {label}, found {text.count(old)}')
    text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('Updated the release crypto cross-check for TypeScript 6 and readonly-safe environment passing.')
