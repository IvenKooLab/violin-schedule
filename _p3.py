import sys

lines = open('app/js/app.js', encoding='utf-8').read().split('\n')

# 1) 找到 loadSample 里的 mk 行和 7 条 sl 行
mk_idx = sl_first = sl_last = None
for i, ln in enumerate(lines):
    if ln.startswith('  const mk = (name,emoji,ci,level,piece,fee,note,loc)=>'):
        mk_idx = i
    if ln.startswith('  sl(s1,0,') or ln.startswith("  sl(s1,0,"):
        sl_last = i

assert mk_idx is not None, 'mk line not found'
# 找 sl 块起点（mk 之后第一条 sl(s1,
for i in range(mk_idx, mk_idx + 12):
    if lines[i].startswith('  sl(s1,5,'):
        sl_first = i
        break
# 找 sl 块终点（sl(s1,0, 或 sl(s3,4,
for i in range(sl_first, sl_first + 12):
    if lines[i].startswith('  sl(s1,0,'):
        sl_last = i
        break
assert sl_first is not None and sl_last is not None, (sl_first, sl_last)

NL = chr(92) + 'n'
# 2) 替换 mk 行为带幂等守卫的版本
lines[mk_idx] = (
    "  const mk = (name,emoji,ci,level,piece,fee,note,loc)=>{"
    "if (nameSeen.has(name)) return S.students.find(s=>s.name===name);"
    "const st = {id:uid(),name,emoji,ci,level,piece,fee,note,loc,ts:Date.now()};"
    "S.students.push(st); nameSeen.add(name); return st;"
    "};"
)
# 3) 替换 sl 块为幂等守卫版 + 保留 7 条调用
sl_calls = [
    "sl(s1,5,'09:00','09:45'); sl(s2,6,'10:30','11:15','先去 301，3:40 去 302'); sl(s3,6,'14:00','14:45'); sl(s4,5,'16:00','16:45');",
    "sl(s1,0,'16:00','16:45'); sl(s2,2,'19:00','19:45'); sl(s3,4,'16:00','16:45');",
]
new_sl = [
    "  const sl=(st,dow,time,end,note)=>{",
    "    const k = st.id+'|'+dow+'|'+time;",
    "    if (slotSeen.has(k)) return;",
    "    slotSeen.add(k);",
    "    S.slots.push({id:uid(),studentId:st.id,dow,time,end:end||'',note:note||''});",
    "  };",
] + ['  ' + c for c in sl_calls]
lines[sl_first:sl_last+1] = new_sl

# 4) 函数头注入两个 Seen 集合（confirm 行之后）
for i, ln in enumerate(lines):
    if "已有学生数据，示例会加在后面，继续吗？')) return;" in ln:
        lines[i+1:i+1] = [
            "  const nameSeen = new Set(S.students.map(s=>s.name));",
            "  const slotSeen = new Set(S.slots.map(s=>s.studentId+'|'+s.dow+'|'+s.time));",
            "  const projSeen = new Set((S.projects||[]).map(p=>p.title));",
        ]
        break

open('app/js/app.js', 'w', encoding='utf-8').write('\n'.join(lines))
print('loadSample idempotent ✓')
