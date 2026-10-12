#!/usr/bin/env python3
"""Update all requireAuth() call sites to pass the request (Bearer/cookie auth)."""
import re
import pathlib

BASE = pathlib.Path('/home/z/my-project/src/app/api')

HANDLER_RE = re.compile(r'export async function (GET|POST|PATCH|DELETE|PUT)\s*\(')
METHODS = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT']

changed_files = []
for f in sorted(BASE.rglob('route.ts')):
    src = f.read_text()
    orig = src

    # 1) requireAuth() -> requireAuth(req)
    src = src.replace('requireAuth()', 'requireAuth(req)')
    # 2) requireAuth(['ADMIN']) -> requireAuth(req, ['ADMIN'])
    src = re.sub(r'requireAuth\((\[)', r'requireAuth(req, \1', src)
    # 3) _req -> req (handlers that had unused request params)
    src = src.replace('_req', 'req')

    # 4) per-handler: add `req: Request` to empty-param handlers whose body calls requireAuth
    matches = list(HANDLER_RE.finditer(src))
    for i, m in enumerate(matches):
        start = m.start()
        body_start = src.index(')', m.start())  # end of signature parens placeholder
        # find the real closing of the signature
        sig_open = src.index('(', m.start())
        depth = 0
        j = sig_open
        while j < len(src):
            if src[j] == '(':
                depth += 1
            elif src[j] == ')':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        sig = src[sig_open:j + 1]
        # handler block = from signature end to next export or EOF
        next_export = src.find('\nexport ', j)
        block_end = next_export if next_export != -1 else len(src)
        block = src[j:block_end]
        if 'requireAuth(req' in block and sig == '()':
            new_sig = '(req: Request)'
            src = src[:sig_open] + new_sig + src[j + 1:]
            # recompute matches after mutation
            matches = list(HANDLER_RE.finditer(src))
            break  # restart scan conservatively

    if src != orig:
        f.write_text(src)
        changed_files.append(str(f.relative_to(BASE)))

print('Updated files:')
for c in changed_files:
    print(' -', c)
print(f'Total: {len(changed_files)}')
