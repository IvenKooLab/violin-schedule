import sys

s = open('app/js/app.js', encoding='utf-8').read()

old = """function loadSample(){
  if(S.students.length>0 && !confirm('已有学生数据，示例会加在后面，继续吗？')) return;"""
new = """function loadSample(){
  if(S.students.length>0 && !confirm('已有学生数据，示例会加在后面，继续吗？')) return;
  const nameSeen = new Set(S.students.map(s=>s.name));
  const slotSeen = new Set(S.slots.map(s=>s.studentId+'|'+s.dow+'|'+s.time));
  const projSeen = new Set((S.projects||[]).map(p=>p.title));"""
assert old in s, 'A'
s = s.replace(old, new, 1)

old = """  const mk = (name,emoji,ci,level,piece,fee,note,loc)=>({id:uid(),name,emoji,ci,level,piece,fee,note,loc});
  const s1=mk('小雨','🐰',0,'英皇 2 级','《沃尔法特 No.12》',280,'手型比上个月稳多啦','家中琴房');
  const s2=mk('果果','🐻',1,'英皇 3 级','《开塞 No.2》',300,'下周开始练顿弓','音乐教室 302');
  const s3=mk('桃桃','🐱',2,'启蒙班','《铃木① 小星星变奏》',260,'A 弦音准要盯','莲塘');
  const s4=mk('豆豆','🐶',3,'英皇 5 级','《塞茨 协奏曲》',350,'备赛曲目 9 月定','黄贝岭英格乐');
  S.students.push(s1,s2,s3,s4);
  const sl=(st,dow,time,end,note)=>S.slots.push({id:uid(),studentId:st.id,dow,time,end:end||'',note:note||''});
  sl(s1,5,'09:00','09:45'); sl(s2,6,'10:30','11:15','先去 301，3:40 去 302'); sl(s3,6,'14:00','14:45'); sl(s4,5,'16:00','16:45');
  sl(s1,0,'16:00','16:45'); sl(s2,2,'19:00','19:45'); sl(s3,4,'16:00','16:45');"""
new = """  const mk = (name,emoji,ci,level,piece,fee,note,loc)=>{
    if (nameSeen.has(name)) return S.students.find(s=>s.name===name);
    const st = {id:uid(),name,emoji,ci,level,piece,fee,note,loc,ts:Date.now()};
    S.students.push(st); nameSeen.add(name); return st;
  };
  const s1=mk('小雨','🐰',0,'英皇 2 级','《沃尔法特 No.12》',280,'手型比上个月稳多啦','家中琴房');
  const s2=mk('果果','🐻',1,'英皇 3 级','《开塞 No.2》',300,'下周开始练顿弓','音乐教室 302');
  const s3=mk('桃桃','🐱',2,'启蒙班','《铃木① 小星星变奏》',260,'A 弦音准要盯','城南教学点');
  const s4=mk('豆豆','🐶',3,'英皇 5 级','《塞茨 协奏曲》',350,'备赛曲目 9 月定','江北艺培');
  const sl=(st,dow,time,end,note)=>{
    const k = st.id+'|'+dow+'|'+time;
    if (slotSeen.has(k)) return;
    slotSeen.add(k);
    S.slots.push({id:uid(),studentId:st.id,dow,time,end:end||'',note:note||''});
  };
  sl(s1,5,'09:00','09:45'); sl(s2,6,'10:30','11:15','先去 301，3:40 去 302'); sl(s3,6,'14:00','14:45'); sl(s4,5,'16:00','16:45');
  sl(s1,0,'16:00','16:45'); sl(s2,2,'19:00','19:45'); sl(s3,4,'16:00','16:45');"""
assert old in s, 'B'
s = s.replace(old, new, 1)
open('app/js/app.js', 'w', encoding='utf-8').write(s)
print('loadSample idempotent ✓')
