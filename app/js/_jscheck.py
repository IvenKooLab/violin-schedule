import re, sys

s = open('app.js', encoding='utf-8').read()

# 逐字符扫描，跳过字符串/模板/注释，统计定界符配平
depth = {'{':0, '(':0, '[':0}
pairs = {'}':'{', ')':'(', ']':'['}
i, n = 0, len(s)
mode = None
while i < n:
    ch = s[i]
    if mode:
        if mode == "'" and ch == '\\': i += 2; continue
        if mode == '"' and ch == '\\': i += 2; continue
        if mode == '`' and ch == '\\': i += 2; continue
        if mode == '`' and ch == '$' and i+1 < n and s[i+1] == '{':
            depth['{'] += 1; i += 2; continue
        if ch == mode:
            mode = None
        i += 1
        continue
    if ch in ("'", '"', '`'):
        mode = ch; i += 1; continue
    if ch == '/' and i+1 < n and s[i+1] == '/':
        while i < n and s[i] != '\n': i += 1
        continue
    if ch == '/' and i+1 < n and s[i+1] == '*':
        i += 2
        while i+1 < n and not (s[i] == '*' and s[i+1] == '/'): i += 1
        i += 2
        continue
    if ch in depth: depth[ch] += 1
    elif ch in pairs: depth[pairs[ch]] -= 1
    i += 1

ok = all(v == 0 for v in depth.values())
print('depth:', depth, '| balanced:', ok)
sys.exit(0 if ok else 1)
