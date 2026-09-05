/* 秋秋课表 · 核心逻辑 */
'use strict';

/* ---------------- 常量 ---------------- */
const STORE_KEY = 'qinqin_v1';
const THEMES = [
  { id:'melody',  name:'美乐蒂', td:'粉色 · 甜系',   img:'assets/wall_melody.jpg' },
  { id:'kitty',   name:'凯蒂猫', td:'红白 · 经典',   img:'assets/wall_kitty_tall.jpg' },
  { id:'kuromi',  name:'库洛米', td:'暗紫 · 酷酷的', img:'assets/wall_kuromi_star.jpg' },
  { id:'cinnamo', name:'玉桂狗', td:'云朵蓝 · 软软的', img:'assets/wall_cinnamo.jpg' },
];
let WALLS = [
  { id:'none',    name:'纯色' },
  { id:'g1',      grad:'linear-gradient(160deg,#ffe0eb,#ffc3da)' },
  { id:'night',   grad:'linear-gradient(160deg,#2e2837,#5c4a78)' },
];
/* 图片壁纸（若有）由 probeWalls() 启动时探测后加入：自带素材不上库 */
const EMOJIS = ['🐰','🐱','🐻','🐶','🐼','🐹','🦊','🐸','🐵','🐤','🍑','🍓','🌸','⭐','🎀','🎵'];
const AVCOLORS = ['#ffe3ec','#ffe9d6','#e3f2ff','#e8ffe3','#f2e3ff','#fff3d6','#e0f7f4','#ffe0e0'];
/* 课程颜色：心心色盘（学生自选，周课表/卡片/今日左边条都用它） */
const HEART_KEYS = ['💗','💙','💜','💚','🧡','💛','❤️','🤎','🤍','🖤'];
const HEART_BG = {'💗':'#ffd7e5','💙':'#d3e8fa','💜':'#e6d6f7','💚':'#d8f2dd','🧡':'#ffe3c9','💛':'#fff3c9','❤️':'#ffd9d4','🤎':'#e8d8c6','🤍':'#f5f3f6','🖤':'#dcd7e2'};
const HEART_DEEP = {'💗':'#e56b9a','💙':'#4a86c8','💜':'#9a6fd0','💚':'#4da86b','🧡':'#e0893a','💛':'#c9a227','❤️':'#e05c5c','🤎':'#a5825f','🤍':'#b8b3bd','🖤':'#7d7590'};
const DOW = ['周一','周二','周三','周四','周五','周六','周日'];
const THEME_COLOR = { melody:'#ffe6ef', kitty:'#fff3f4', kuromi:'#2e2837', cinnamo:'#e7f3fe' };
const FONTS = [
  { id:'kuaile',   name:'快乐体', desc:'活泼手写 · 默认' },
  { id:'huangyou', name:'黄油体', desc:'圆润厚实 · 奶fufu' },
  { id:'kai',      name:'楷书体', desc:'手写气质 · 文艺' },
  { id:'sys',      name:'系统体', desc:'标准清爽 · 最快' },
];
const STUDENT_COLORS = { melody:'#ffe3ec', kitty:'#ffe3ec', kuromi:'#4a4258', cinnamo:'#d3e8fa' };

const MASCOTS = {
  melody:`<img class="avimg" src="assets/face_melody.jpg" alt="美乐蒂">`,
  kitty:`<img class="avimg" src="assets/face_kitty.jpg" alt="凯蒂猫">`,
  kuromi:`<img class="avimg" src="assets/face_kuromi.jpg" alt="库洛米">`,
  cinnamo:`<img class="avimg" src="assets/face_cinnamo.jpg" alt="玉桂狗">`,
};

/* ---------------- 状态 ---------------- */
let S = null;
let weekOffset = 0;
let editingStudentId = null;
let editingExtraId = null;
let currentLessonKey = null;
let importPayload = null;

function defaults(){
  return { students:[], slots:[], log:{}, extras:[], projects:[], events:[], holidays:[],
    meta:{ theme:'melody', wall:'none', birthday:'08-30', splashYear:0, splashHideDate:'', font:'kuaile', userName:'', greetings:[], lessonDur:45, lastSyncAt:0, seq:1, weekView:'list', sync:{url:'',token:'',auto:true,rev:0} } };
}
function persist(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(S)); }catch(e){} }
function save(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(S)); }catch(e){ toast('存不下了…设备存储可能被限制'); } scheduleAutoSync(); }
function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    const st = Object.assign(defaults(), s, { meta: Object.assign(defaults().meta, s.meta||{}) });
    st.meta.sync = Object.assign(defaults().meta.sync, st.meta.sync||{});
    // 旧数据补心心色（按原自动色序映射）
    st.students.forEach(s=>{ if(!s.heart) s.heart = HEART_KEYS[(s.ci||0)%HEART_KEYS.length]; });
    return st;
  }catch(e){ return null; }
}
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function esc(t){ return String(t??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ---------------- 日期工具 ---------------- */
const pad = n => String(n).padStart(2,'0');
function ymd(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function todayStr(){ return ymd(new Date()); }
function parseYmd(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function dowMon(dateStr){ return (parseYmd(dateStr).getDay()+6)%7; } // 0=周一
function mmdd(dateStr){ return dateStr.slice(5); }
function weekDates(offset){
  const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay()+6)%7) + offset*7);
  return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return ymd(d); });
}
function fmtCnDate(dateStr, withWeek=true){
  const d = parseYmd(dateStr);
  const s = (d.getMonth()+1)+'月'+d.getDate()+'日';
  return withWeek ? s+' '+DOW[dowMon(dateStr)] : s;
}
function toMin(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function nowMin(){ const d=new Date(); return d.getHours()*60+d.getMinutes(); }

/* ---------------- 课程计算 ---------------- */
function studentById(id){ return S.students.find(s=>s.id===id); }
function projectById(id){ return S.projects.find(p=>p.id===id); }
function lessonsOn(dateStr){
  const dow = dowMon(dateStr);
  const list = [];
  S.slots.filter(x=>x.dow===dow).forEach(sl=>{
    const st = studentById(sl.studentId);
    list.push({ key:dateStr+'|s'+sl.id, studentId:sl.studentId, time:sl.time, end:sl.end||'',
      note:sl.note||'', loc:(st&&st.loc)||'', kind:'slot', refId:sl.id, date:dateStr });
  });
  S.extras.filter(x=>x.date===dateStr).forEach(ex=>{
    const st = studentById(ex.studentId);
    list.push({ key:dateStr+'|e'+ex.id, studentId:ex.studentId, time:ex.time, end:ex.end||'',
      note:'', loc:(st&&st.loc)||'', kind:'extra', refId:ex.id, date:dateStr, extraNote:ex.note, confirmed:ex.confirmed });
  });
  list.sort((a,b)=> toMin(a.time)-toMin(b.time) || a.studentId.localeCompare(b.studentId));
  return list;
}
function eventsOn(dateStr){
  const list = [];
  S.events.filter(x=>x.date===dateStr).forEach(ev=>{
    list.push({ key:dateStr+'|'+(ev.kind==='reh'?'r':'p')+ev.id,
      time:ev.time, end:ev.end||'', kind:ev.kind, refId:ev.id, projectId:ev.projectId,
      date:dateStr, venue:ev.venue||'', evNote:ev.note||'' });
  });
  list.sort((a,b)=> toMin(a.time)-toMin(b.time));
  return list;
}
function itemsOn(dateStr){
  const hol = (S.holidays||[]).some(h => dateStr >= h.start && dateStr <= h.end);
  return lessonsOn(dateStr).concat(eventsOn(dateStr))
    .map(x => { x.hol = hol; x.endMin = itemEndMin(x); return x; })
    .sort((a,b)=> toMin(a.time)-toMin(b.time));
}
function isEventItem(key){ const tag=key.split('|')[1]; return tag[0]==='r'||tag[0]==='p'; }
function itemStudent(id){ return studentById(id) || {name:'（已删除）', emoji:'🐾', piece:''}; }
function lessonStatus(l){ const rec=S.log[l.key]; return rec ? rec.status : null; }
function studentColor(id){
  const st = studentById(id);
  if(st && st.heart && HEART_BG[st.heart]) return HEART_BG[st.heart];
  return AVCOLORS[(st?st.ci:0)%AVCOLORS.length];
}
function studentDeep(id){
  const st = studentById(id);
  if(st && st.heart && HEART_DEEP[st.heart]) return HEART_DEEP[st.heart];
  return '#e56b9a';
}
function countDone(studentId){
  let n=0;
  Object.keys(S.log).forEach(k=>{ if(S.log[k].status!=='done') return;
    const [d,tag]=k.split('|'); const date=d;
    if(tag[0]==='s'){ const sl=S.slots.find(x=>'s'+x.id===tag); if(sl && sl.studentId===studentId && dowMon(date)===sl.dow) n++; }
    else { const ex=S.extras.find(x=>'e'+x.id===tag); if(ex && ex.studentId===studentId) n++; }
  });
  return n;
}
function recentAttendance(studentId, n=4){
  const dates=[];
  Object.keys(S.log).forEach(k=>{
    const [d,tag]=k.split('|');
    let sid=null;
    if(tag[0]==='s'){ const sl=S.slots.find(x=>'s'+x.id===tag); if(sl) sid=sl.studentId; }
    else { const ex=S.extras.find(x=>'e'+x.id===tag); if(ex) sid=ex.studentId; }
    if(sid===studentId) dates.push({d:k, date:d, st:S.log[k].status});
  });
  dates.sort((a,b)=> b.date.localeCompare(a.date));
  return dates.slice(0,n);
}
function monthStats(){
  const pre = todayStr().slice(0,7);
  let done=0, income=0;
  Object.keys(S.log).forEach(k=>{
    if(S.log[k].status!=='done' || !k.startsWith(pre)) return;
    done++;
    const [d,tag]=k.split('|'); let sid=null;
    if(tag[0]==='s'){ const sl=S.slots.find(x=>'s'+x.id===tag); if(sl) sid=sl.studentId; }
    else { const ex=S.extras.find(x=>'e'+x.id===tag); if(ex) sid=ex.studentId; }
    const st=sid && studentById(sid); if(st && +st.fee>0) income += +st.fee;
  });
  return { done, income, students:S.students.length };
}
function billData(){
  const pre = todayStr().slice(0,7);
  const rows = {};
  Object.keys(S.log).forEach(k=>{
    if(S.log[k].status!=='done' || !k.startsWith(pre)) return;
    const [d,tag] = k.split('|'); let sid = null;
    if(tag[0]==='s'){ const sl = S.slots.find(x=>'s'+x.id===tag); if(sl) sid = sl.studentId; }
    else { const ex = S.extras.find(x=>'e'+x.id===tag); if(ex) sid = ex.studentId; }
    if(!sid) return;
    const st = studentById(sid); if(!st) return;
    rows[sid] = rows[sid] || { name:st.name, n:0, fee:0 };
    rows[sid].n++;
    if (+st.fee>0) rows[sid].fee += +st.fee;
  });
  return Object.values(rows).sort((a,b)=> b.fee-a.fee || b.n-a.n);
}
function yearBars(){
  const now = new Date(); const out = [];
  for (let i=11;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const pre = d.getFullYear()+'-'+pad(d.getMonth()+1);
    let n = 0, inc = 0;
    Object.keys(S.log).forEach(k=>{
      if(S.log[k].status!=='done' || !k.startsWith(pre)) return;
      n++;
      const [dd,tag] = k.split('|'); let sid = null;
      if(tag[0]==='s'){ const sl = S.slots.find(x=>'s'+x.id===tag); if(sl) sid = sl.studentId; }
      else if(tag[0]==='e'){ const ex = S.extras.find(x=>'e'+x.id===tag); if(ex) sid = ex.studentId; }
      else if(tag[0]==='r'||tag[0]==='p'){ const ev = S.events.find(x=>(x.kind==='reh'?'r':'p')+x.id===tag); if(ev){ const p = projectById(ev.projectId); if(p) inc += (ev.kind==='reh'? (+p.rfee||0):(+p.cfee||0)); } }
      const st = sid && studentById(sid); if(st && +st.fee>0) inc += +st.fee;
    });
    out.push({ label:(d.getMonth()+1)+'月', n, inc });
  }
  return out;
}
function orchMonthStats(){
  const pre = todayStr().slice(0,7);
  let reh=0, perf=0, income=0;
  Object.keys(S.log).forEach(k=>{
    if(S.log[k].status!=='done' || !k.startsWith(pre)) return;
    const [d,tag]=k.split('|');
    if(tag[0]!=='r' && tag[0]!=='p') return;
    const ev = S.events.find(x=>(x.kind==='reh'?'r':'p')+x.id===tag);
    if(!ev) return;
    const p = projectById(ev.projectId); if(!p) return;
    if(ev.kind==='reh'){ reh++; income += +p.rfee||0; }
    else { perf++; income += +p.cfee||0; }
  });
  return { reh, perf, income };
}

/* ---------------- 渲染 ---------------- */
const $ = id => document.getElementById(id);

function applyTheme(){
  const t = S.meta.theme;
  document.body.className = 't-'+t+' f-'+(S.meta.font||'kuaile');
  document.querySelector('meta[name=theme-color]').setAttribute('content', THEME_COLOR[t]||'#ffe6ef');
  const mascot = MASCOTS[t] || MASCOTS.melody;
  ['mascotSlot','mascotSlot2','mascotSlot3','mascotSlot4'].forEach((id,idx)=>{
    const el=$(id); if(!el) return;
    el.innerHTML = (idx===0 && S.meta.userAvatar)
      ? `<img class="avimg" src="${S.meta.userAvatar}">` : mascot;
  });
}
function applyWall(){
  const el = $('wallpaper');
  if (S.meta.wall === 'custom' && S.meta.customWall){
    el.style.backgroundImage = `url('${S.meta.customWall}')`; el.style.display='block'; return;
  }
  const w = WALLS.find(x=>x.id===S.meta.wall);
  if(w && w.img){ el.style.backgroundImage = `url('${w.img}')`; el.style.display='block'; }
  else if(w && w.grad){ el.style.backgroundImage = w.grad; el.style.display='block'; }
  else { el.style.display='none'; }
}

function itemEndMin(l){ return l.end ? toMin(l.end) : toMin(l.time) + (S.meta.lessonDur||45); }
function chipFor(l, nowM){
  const st = lessonStatus(l);
  if(l.hol && !st) return '<span class="st-chip">放假 🏖️</span>';
  if(st==='done') return '<span class="st-chip done">已上完 ✓</span>';
  if(st==='leave') return '<span class="st-chip">请假 🏖️</span>';
  const m = toMin(l.time);
  if(m<=nowM && nowM<itemEndMin(l)) return '<span class="st-chip now">进行中 ♪</span>';
  if(m>nowM){
    const diff=m-nowM;
    return `<span class="st-chip">${diff>=60? Math.floor(diff/60)+' 小时'+(diff%60? diff%60+' 分':'') : diff+' 分钟'}后</span>`;
  }
  return '<span class="st-chip">待打卡</span>';
}
function timeRange(l){ return l.end ? l.time+'-'+l.end : l.time; }
function itemRowHTML(l, nowM, showRel=true){
  const status = lessonStatus(l);
  const hol = l.hol && !status;
  const dim = status==='done' ? 'opacity:.6;text-decoration:line-through;' : '';
  const note = S.log[l.key] && S.log[l.key].note;
  if(l.kind==='reh' || l.kind==='perf'){
    const p = projectById(l.projectId) || {title:'（已删除项目）', rfee:0, cfee:0};
    const fee = l.kind==='reh' ? (+p.rfee||0) : (+p.cfee||0);
    const emoji = l.kind==='reh' ? '🎼' : '🎻';
    const bg = l.kind==='reh' ? '#dcebfd' : '#ffedc9';
    const sub = [ l.end ? l.time+'-'+l.end : '', l.venue, fee>0 ? '¥'+fee : '' ].filter(Boolean).join(' · ');
    return `<button class="lrow ${status==='done'?'done':''} ${status==='leave'?'leave':''}" data-key="${l.key}" style="border-left:5px solid ${l.kind==='reh'?'#b98ae0':'#e0a53a'}">
      <span class="lt">${l.time}</span>
      <span class="av" style="background:${bg}">${emoji}</span>
      <span class="li"><span class="nm">${l.kind==='reh'?'排练':'演出'} · ${esc(p.title)}</span>
        <span class="pc">${esc(sub)}${l.evNote?' · '+esc(l.evNote):''}</span>
        ${note?`<span class="notemini">📝 ${esc(note)}</span>`:''}
      </span>
      ${showRel? chipFor(l,nowM) : ''}
    </button>`;
  }
  const st = itemStudent(l.studentId);
  const detail = [ esc(st.piece||'小提琴课'), l.loc? '📍'+esc(l.loc) : '' ].filter(Boolean).join(' ');
  return `<button class="lrow ${status==='done'?'done':''} ${status==='leave'?'leave':''}" data-key="${l.key}" style="border-left:5px solid ${studentDeep(l.studentId)};${hol?'opacity:.45':''}">
    <span class="lt">${l.time}</span>
    <span class="av" style="background:${studentColor(l.studentId)}">${avInner(st)}</span>
    <span class="li"><span class="nm">${esc(st.name)}</span>
      <span class="pc">${l.kind==='extra' && !l.confirmed ? '⏳待确认 · ' : ''}${detail}${l.extraNote?' · '+esc(l.extraNote):''}</span>
      ${l.note?`<span class="notemini">📌 ${esc(l.note)}</span>`:''}
      ${note?`<span class="notemini">📝 ${esc(note)}</span>`:''}
    </span>
    ${showRel? chipFor(l,nowM) : ''}
  </button>`;
}
function renderToday(){
  const t = todayStr();
  const h = new Date().getHours();
  $('todayDate').textContent = fmtCnDate(t) + (isBirthday(t) ? ' · 🎂 今天是特别的日子' : '');
  const who = S.meta.userName ? '，' + S.meta.userName : '';
  $('todayGreet').textContent = (h<11?'早上好呀 ☀':(h<18?'下午好呀 🌸':'晚上好呀 🌙')) + who;
  let banners = isBirthday(t)
    ? `<div class="birthday" onclick="showSplash()">🎂 生日快乐呀 · 今天也要开心一整天 ♡<span class="bd-hint">戳我 🎁</span></div>` : '';
  S.students.forEach(s => { if (s.bday && mmdd(t) === s.bday) banners += `<div class="birthday" style="background:linear-gradient(90deg,#ffb14d,#ff8f6d)">🎂 今天是 ${esc(s.name)} 的生日 · 记得送上祝福 ♡</div>`; });
  $('birthdayWrap').innerHTML = banners;

  const items = itemsOn(t);
  const nowM = nowMin();
  if(items.length===0){
    $('nextWrap').innerHTML = '';
    $('todayList').innerHTML = emptyHTML(S.students.length===0
      ? {e:'🎻', txt:'还没有学生的课表，先添加小朋友吧', btns:`<button class="btn" onclick="openStudent()">＋ 添加学生</button><button class="btn ghost" onclick="loadSample()">看示例课表</button>`}
      : {e:'🎉', txt:'今天没有课，休息日也要开心呀', btns:`<button class="btn ghost" onclick="openExtra()">＋ 加一节课</button>`});
    $('todaySummary').innerHTML='';
    return;
  }
  // 下一节（课/排练/演出都算）
  const next = items.find(l=> toMin(l.time)>nowM && lessonStatus(l)!=='done' && lessonStatus(l)!=='leave');
  if(next){
    let ncTime, ncName, ncSub;
    if(next.kind==='reh' || next.kind==='perf'){
      const p = projectById(next.projectId) || {title:'—', rfee:0, cfee:0};
      ncTime = next.time + (next.end? ' - '+next.end : '');
      ncName = (next.kind==='reh'?'排练':'演出') + ' · ' + p.title;
      ncSub = [next.venue, (next.kind==='reh'? (+p.rfee||0):(+p.cfee||0))>0 ? '¥'+(next.kind==='reh'?p.rfee:p.cfee) : ''].filter(Boolean).join(' · ');
    }else{
      const st = itemStudent(next.studentId);
      ncTime = next.time;
      ncName = st.name + ' · 小提琴课';
      ncSub = (st.piece? esc(st.piece) : '') + (st.level? ' · '+esc(st.level) : '');
    }
    const diff = toMin(next.time)-nowM;
    const cd = diff>=60 ? Math.floor(diff/60)+' 小时'+(diff%60?' '+diff%60+' 分':'') : diff+' 分钟';
    $('nextWrap').innerHTML = `<div class="card nextcard"><span class="ear l"></span><span class="ear r"></span>
      <div class="nc-top">
        <div><div class="nc-time">${ncTime}</div>
          <div class="nc-info">${ncName}<div class="st">${ncSub}</div></div></div>
        <div class="nc-cd"><span class="num">还有</span><span class="cdchip">${cd} ♪</span></div>
      </div></div>`;
  } else {
    $('nextWrap').innerHTML = '';
  }
  $('todayList').innerHTML = items.map(l=>itemRowHTML(l,nowM)).join('');
  const wk = weekDates(0);
  const wkCount = wk.reduce((n,d)=>n+itemsOn(d).filter(x=>lessonStatus(x)!=='leave').length,0);
  $('todaySummary').innerHTML = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <span class="pill">📌 今日 ${items.length} 项</span><span class="pill">🗓️ 本周 ${wkCount} 项</span>
    <button class="btn ghost" style="font-size:14px;padding:9px 16px;margin-left:auto" onclick="openExtra()">＋ 加课</button>
  </div>`;
}
function emptyHTML(o){
  return `<div class="emptybox"><div class="e1">${o.e}</div><div class="e2">${o.txt}</div><div>${o.btns}</div></div>`;
}

function renderWeek(){
  const days = weekDates(weekOffset);
  const t = todayStr();
  $('weekMonth').textContent = parseYmd(days[0]).getMonth()+1+'月';
  $('wkLabel').textContent = (weekOffset===0?'本周':weekOffset===1?'下周':weekOffset===-1?'上周':(weekOffset>0?`+${weekOffset} 周`:`${weekOffset} 周`))
    + ` ${fmtCnDate(days[0],false)} - ${fmtCnDate(days[6],false)}`;
  const gridMode = S.meta.weekView === 'grid';
  $('vList').classList.toggle('on', !gridMode);
  $('vGrid').classList.toggle('on', gridMode);
  $('weekList').style.display = gridMode ? 'none' : '';
  $('weekGrid').style.display = gridMode ? '' : 'none';
  let total = 0;
  if(gridMode) total = renderWeekGrid(days, t);
  else total = renderWeekList(days, t);
  $('weekSummary').innerHTML = `<span class="pill">🎀 这一周共 ${total} 项（课+乐团）</span>`;
}
function renderWeekList(days, t){
  let total=0;
  $('weekList').innerHTML = days.map(d=>{
    const items = itemsOn(d);
    const active = items.filter(l=>lessonStatus(l)!=='leave' && !l.hol).length;
    total += active;
    const isToday = d===t;
    const chips = items.map(l=>{
      if(l.kind==='reh' || l.kind==='perf'){
        const p = projectById(l.projectId)||{title:'?'};
        const done = lessonStatus(l)==='done';
        return `<button class="wchip evt-${l.kind}" data-key="${l.key}">${l.time} ${l.kind==='reh'?'🎼':'✨'}${esc(p.title)}${lessonStatus(l)==='leave'?' ✕':''}</button>`;
      }
      const st = studentById(l.studentId)||{name:'?'};
      const done = lessonStatus(l)==='done';
      return `<button class="wchip" data-key="${l.key}" style="--wc:${studentColor(l.studentId)};${done?'opacity:.55;text-decoration:line-through':''}">${l.time} <b>${esc(st.name)}</b>${lessonStatus(l)==='leave'?' 🏖️':''}</button>`;
    }).join('');
    return `<div class="wrow ${isToday?'today':''}">
      <div class="wd"><div class="n">${DOW[dowMon(d)]}</div><div class="d">${+d.slice(5,7)}/${+d.slice(8,10)}${isToday?' · 今天':''}</div></div>
      <div class="wchips">${chips || '<span class="empty">休息 💤</span>'}</div>
      <button class="addbtn" data-adddate="${d}">＋</button>
    </div>`;
  }).join('');
  return total;
}
function renderWeekGrid(){
  const days = weekDates(weekOffset);
  const today = todayStr();
  const all = days.flatMap(d => itemsOn(d).map(l => Object.assign({}, l, {date:d})));
  const gridEl = document.getElementById('weekGrid');
  if (!all.length) { gridEl.innerHTML = '<div style="padding:30px 0;text-align:center;color:var(--sub)">本周暂无课程 🎐</div>'; return; }

  // 时间范围（对齐整点）
  let t0 = 24*60, t1 = 0;
  all.forEach(l => { t0 = Math.min(t0, toMin(l.time)); t1 = Math.max(t1, itemEndMin(l)); });
  t0 = Math.max(0, Math.floor(t0/60)*60);
  t1 = Math.min(1440, Math.ceil(t1/60)*60);
  const rangeMin = Math.max(120, t1 - t0);
  const avail = Math.max(300, window.innerHeight - 290);
  const PXPM = Math.min(1.3, Math.max(0.5, avail / rangeMin));
  const H = Math.round(rangeMin * PXPM);

  // 表头（左空 + 七日）
  let html = '<div class="tthead"><span class="tt-sp"></span>' + days.map(d =>
    `<span class="tt-dh ${d===today?'today':''}"><b>${DOW[dowMon(d)].slice(1)}</b>${+d.slice(5,7)}/${+d.slice(8,10)}</span>`).join('') + '</div>';

  // 主体：整点刻度 + 七日列
  html += `<div class="tt-body" style="height:${H}px">`;
  for (let m = Math.ceil(t0/60)*60; m <= t1; m += 60) {
    const y = Math.round((m - t0) * PXPM);
    html += `<span class="tt-hl" style="top:${y}px">${pad(Math.floor(m/60))}:${pad(m%60)}</span><div class="tt-hline" style="top:${y}px"></div>`;
  }
  html += '<div class="tt-cols">' + days.map((d, di) => {
    const items = all.filter(l => l.date === d).sort((a,b)=>toMin(a.time)-toMin(b.time));
    const colEnds = [];
    const placed = items.map(l => {
      const s = toMin(l.time), e = itemEndMin(l);
      let ci = colEnds.findIndex(ce => s >= ce - 0.01);
      if (ci === -1) { ci = colEnds.length; colEnds.push(e); } else { colEnds[ci] = Math.max(colEnds[ci], e); }
      return { l, ci };
    });
    const nCols = Math.max(1, colEnds.length);
    const colW = (100 / nCols).toFixed(1);
    const blocks = placed.map(({l, ci}) => {
      const status = lessonStatus(l);
      const done = status==='done';
      const dim = done ? 'opacity:.55;text-decoration:line-through;' : (status==='leave' ? 'opacity:.5;' : '');
      const top = Math.round((toMin(l.time) - t0) * PXPM) + 1;
      const h = Math.max(18, Math.round((itemEndMin(l) - toMin(l.time)) * PXPM) - 2);
      const left = (ci * 100 / nCols).toFixed(1);
      const width = (100 / nCols).toFixed(1);
      let inner = '', bg = '', fg = '#5c3a4a';
      if (l.kind==='reh' || l.kind==='perf'){
        const p = projectById(l.projectId) || {title:'（已删除）', rfee:0, cfee:0};
        const fee = l.kind==='reh' ? (+p.rfee||0) : (+p.cfee||0);
        const emoji = l.kind==='reh' ? '🎼' : '✨';
        bg = l.kind==='reh' ? '#ece3f8' : '#ffe3c9';
        fg = l.kind==='reh' ? '#5d4a7d' : '#8a6116';
        inner = `<b>${emoji}${esc(p.title.slice(0,7))}</b><i>${l.time}${l.end?'-'+l.end:''}${fee?' ¥'+fee:''}</i>`;
      } else {
        const st = itemStudent(l.studentId);
        inner = `<b>${esc(st.name)}</b><i>${st.piece?esc(st.piece).slice(0,8):'小提琴课'}</i>`;
        bg = studentColor(l.studentId);
      }
      const note = S.log[l.key] && S.log[l.key].note;
      if (note) inner += `<u class="nt">📝${esc(note).slice(0,6)}</u>`;
      return `<button class="tte ${done?'done':''}" data-key="${l.key}" style="top:${top}px;height:${h}px;left:${left}%;width:calc(${width}% - 2px);background:${bg};color:${fg};${dim}">${inner}</button>`;
    }).join('');
    return `<div class="tt-col ${d===today?'today':''}">${blocks}</div>`;
  }).join('') + '</div></div>';

  gridEl.innerHTML = html;
  return all.length;
}

function renderStudents(){
  const ms = monthStats();
  $('studentStats').innerHTML = `<div class="card statcard">
    <div><div class="big">${ms.done}<span style="font-size:13px"> 节</span></div><div class="lbl">本月已上课时</div></div>
    <div class="sep"></div>
    <div><div class="big" style="font-size:19px;padding-top:4px">¥${ms.income}</div><div class="lbl">本月课时费</div></div>
    <div class="sep"></div>
    <div><div class="big" style="font-size:19px;padding-top:4px">${ms.students}<span style="font-size:13px"> 人</span></div><div class="lbl">小朋友们</div></div>
  </div>`;
  // 生日临近条：专用容器渲染（不堆积）；本地日期比较（当天=今天）
  const today0 = parseYmd(todayStr());
  const upcoming = S.students.filter(s=>s.bday).map(s=>{
    const m = +s.bday.slice(0,2), d = +s.bday.slice(3);
    let nxt = new Date(today0.getFullYear(), m-1, d);
    if (nxt.getFullYear() < today0.getFullYear() || (nxt.getFullYear()===today0.getFullYear() && (nxt.getMonth()<today0.getMonth() || (nxt.getMonth()===today0.getMonth() && nxt.getDate()<today0.getDate())))) {
      nxt = new Date(today0.getFullYear()+1, m-1, d);
    }
    const days = Math.round((nxt - today0)/86400000);
    return {s, days};
  }).sort((a,b)=>a.days-b.days).slice(0,4);
  $('bdayStrip').innerHTML = upcoming.length ? upcoming.map(u=>
    `<div class="bitem">🎂 <b>${esc(u.s.name)}</b>${u.days===0?'今天':u.days+' 天后'}<br>${u.s.bday}</div>`).join('') : '';
  const q = ($('searchInput')&&$('searchInput').value||'').trim();
  const list = S.students.filter(s=>!q || s.name.includes(q));
  if(S.students.length===0){
    $('studentList').innerHTML = emptyHTML({e:'🎀', txt:'还没有学生，从第一位小朋友开始吧', btns:`<button class="btn" onclick="openStudent()">＋ 添加学生</button><button class="btn ghost" onclick="loadSample()">看示例课表</button>`});
    return;
  }
  $('studentList').innerHTML = list.map(s=>{
    const slots = S.slots.filter(x=>x.studentId===s.id).sort((a,b)=> a.dow-b.dow || toMin(a.time)-toMin(b.time));
    const timeChip = slots.length ? DOW[slots[0].dow]+' '+slots[0].time + (slots.length>1?` 等${slots.length}次`:'') : '暂无固定时间';
    const done = countDone(s.id);
    const recent = recentAttendance(s.id);
    const hearts = Array.from({length:4},(_,i)=>{
      const r = recent[3-i];
      if(!r) return '<span class="off">♥</span>';
      return r.st==='done' ? '♥' : '<span class="off">♥</span>';
    }).join('');
    return `<button class="scard" data-sid="${s.id}" style="border-left:5px solid ${studentDeep(s.id)}">
      <div class="top"><span class="av" style="background:${studentColor(s.id)}">${avInner(s)}</span>
        <span style="flex:1;min-width:0"><span class="nm">${esc(s.name)}</span>
          <span class="chips"><span>${esc(s.level||'小提琴')}</span><span>🕰️ ${timeChip}</span>${s.loc?`<span>📍 ${esc(s.loc)}</span>`:''}${s.phone?`<span class="phchip" data-phone="${esc(s.phone)}">📞 点击复制</span>`:''}${+s.fee>0?`<span>¥${esc(s.fee)}/节</span>`:''}</span>
          ${s.pass&&s.pass.total>0?`<span class="chips" style="margin-top:4px"><span class="warn">课时包剩 ${s.pass.total-(s.pass.used||0)} 节</span></span>`:''}
        </span></div>
      <div class="song">🎵 ${esc(s.piece||'还没有录入曲目')}</div>
      ${(s.pass&&s.pass.total>0 && (s.pass.total-(s.pass.used||0))<=3) ? `<div class="warn" style="font-size:12px;margin-top:6px">⏰ 课时包只剩 ${s.pass.total-(s.pass.used||0)} 节，该续费啦</div>` : ''}
      <div class="meta"><span class="hearts">${hearts}</span><span>累计 ${done} 节 · 点卡片编辑</span></div>
    </button>`;
  }).join('') || `<div class="thint">没有找到「${esc(q)}」～</div>`;
  // 搜索框渲染后补回值
  const si = $('searchInput'); if(si && q) si.value = q;
}

function openSettings(){
  $('setName').value = S.meta.userName || '';
  $('setBday').textContent = '🎂 ' + (S.meta.birthday ? S.meta.birthday.slice(0,2)+'-'+S.meta.birthday.slice(3) : '未设置');
  $('setBday').dataset.v = S.meta.birthday || '';
  $('setDur').value = String(S.meta.lessonDur || 45);
  $('setGreetings').value = (S.meta.greetings && S.meta.greetings.length) ? S.meta.greetings.join('\n') : '';
  renderUserAv();
}
function saveSettings(){
  S.meta.userName = $('setName').value.trim();
  if ($('setBday').dataset.v) S.meta.birthday = $('setBday').dataset.v;
  S.meta.lessonDur = +$('setDur').value || 45;
  S.meta.greetings = $('setGreetings').value.split('\n').map(x=>x.trim()).filter(Boolean);
  save(); renderAll(); toast('资料保存好啦 ♡');
}
/* 数据自愈去重：重复导入/同步合并产生的冗余副本在这里统一清除 */
function dedupeData(){
  const byName = {};
  const kept = [];
  (S.students||[]).forEach(s => {
    if (byName[s.name]) {
      const k = byName[s.name];
      ['loc','level','piece','fee','note','phone','bday','avatar'].forEach(f => { if (!k[f] && s[f]) k[f] = s[f]; });
      if ((s.photos||[]).length > (k.photos||[]).length) k.photos = s.photos;
      return;
    }
    byName[s.name] = s; kept.push(s);
  });
  S.students = kept;
  const ids = new Set(S.students.map(s=>s.id));
  S.slots = (S.slots||[]).filter(sl => ids.has(sl.studentId));
  const seenSlot = new Set();
  S.slots = (S.slots||[]).filter(sl => {
    const k = sl.studentId+'|'+sl.dow+'|'+sl.time;
    if (seenSlot.has(k)) return false;
    seenSlot.add(k); return true;
  });
  const seenExt = new Set();
  S.extras = (S.extras||[]).filter(ex => {
    const k = ex.studentId+'|'+ex.date+'|'+ex.time;
    if (seenExt.has(k)) return false;
    seenExt.add(k); return true;
  });
  const seenEv = new Set();
  S.events = (S.events||[]).filter(ev => {
    const k = ev.projectId+'|'+ev.kind+'|'+ev.date+'|'+ev.time;
    if (seenEv.has(k)) return false;
    seenEv.add(k); return true;
  });
}

function renderUserAv(){
  $('userAvSlot').innerHTML = S.meta.userAvatar
    ? `<img class="avimg" src="${S.meta.userAvatar}">`
    : `<span style="font-size:30px">🎻</span>`;
}
let holPick = { start:null, end:null };
function renderHolidays(){
  const list = S.holidays || [];
  $('holList').innerHTML = list.length ? list.map((hv,i)=>`
    <div class="slotcard" style="margin-bottom:6px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:14px;color:var(--text)">🏖️ ${fmtCnDate(hv.start,false)} — ${fmtCnDate(hv.end,false)}</span>
        <button type="button" class="del" data-i="${i}" style="border:none;background:var(--chip);color:#e05c7e;width:30px;height:30px;border-radius:10px;cursor:pointer">✕</button>
      </div>
    </div>`).join('') : '<div class="thint" style="text-align:left">还没有假期记录</div>';
  const f = (id,v)=>{ const el=$(id); el.textContent = v ? fmtCnDate(v,false) : '📅 选择日期'; el.dataset.v = v||''; };
  f('holStart', holPick.start); f('holEnd', holPick.end);
}
function openHolidays(){
  holPick = { start:null, end:null };
  renderHolidays(); openMask('maskHoliday');
}
function renderHolidays(){
  const list = S.holidays || [];
  $('holList').innerHTML = list.length ? list.map((hv,i)=>`
    <div class="slotcard" style="margin-bottom:6px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:14px;color:var(--text)">${fmtCnDate(hv.start,false)} — ${fmtCnDate(hv.end,false)}</span>
        <button type="button" class="holrm" data-i="${i}" style="border:none;background:var(--chip);color:#e05c7e;width:30px;height:30px;border-radius:10px;cursor:pointer">✕</button>
      </div>
    </div>`).join('') : '<div class="thint" style="text-align:left">还没有假期记录</div>';
  const f = (id,v)=>{ const el=$(id); el.textContent = v ? fmtCnDate(v,false) : '选择日期'; el.dataset.v = v||''; };
  $('holStart').textContent = holPick.start ? fmtCnDate(holPick.start,false) : '开始日期';
  $('holStart').dataset.v = holPick.start||'';
  $('holEnd').textContent = holPick.end ? fmtCnDate(holPick.end,false) : '结束日期';
  $('holEnd').dataset.v = holPick.end||'';
}
function openHolidays(){
  holPick = { start:null, end:null };
  renderHolidays(); openMask('maskHoliday');
}
let billText = '';
function openBill(){
  const rows = billData();
  const total = rows.reduce((s,r)=>s+r.fee,0), n = rows.reduce((s,r)=>s+r.n,0);
  $('billTitle').textContent = '📊 本月账单（'+ (todayStr().slice(0,7)) +'）';
  $('billBody').innerHTML = rows.length ? `
    <div class="card" style="padding:12px 14px;margin-bottom:10px">
      ${rows.map(r=>`<div style="display:flex;justify-content:space-between;font-size:13.5px;color:var(--text);padding:3px 0">
        <span>${esc(r.name)} · ${r.n} 节</span><span>¥${r.fee}</span></div>`).join('')}
      <div style="border-top:1.5px dashed var(--chip);margin-top:6px;padding-top:8px;display:flex;justify-content:space-between;font-weight:700;color:var(--text)">
        <span>合计 ${n} 节</span><span>¥${total}</span></div>
    </div>
    <div class="thint" style="text-align:left">课时费按学生档案里的单价自动计算</div>` : '<div class="thint">本月还没有已完成的课时</div>';
  openMask('maskBill');
}
function openYear(){
  const bars = yearBars();
  const max = Math.max(1, ...bars.map(b=>Math.max(b.n, Math.round(b.inc/100))));
  $('billTitle').textContent = '📈 近 12 个月';
  $('billBody').innerHTML = '<div style="display:flex;align-items:flex-end;gap:6px;height:180px;padding:0 4px">' +
    bars.map(b=>{
      const hN = Math.round(b.n/max*140), hI = Math.round(b.inc/Math.max(1,Math.max(...bars.map(x=>x.inc)))*140);
      return `<div style="flex:1;text-align:center"><div style="font-size:10px;color:var(--sub)">${b.n}</div>
        <div style="height:${Math.max(4,hN)}px;background:#ffb14d;border-radius:4px 4px 0 0;margin-bottom:2px"></div>
        <div style="height:${Math.max(4,hI)}px;background:var(--accent);border-radius:0 0 4px 4px"></div>
        <div style="font-size:10px;color:var(--sub);margin-top:3px">${b.label}</div></div>`;
    }).join('') + '</div>' +
    '<div class="thint" style="text-align:center;margin-top:6px">🟠 课时数　🔵 收入(每百元)</div>';
  openMask('maskBill');
}
function renderThemes(){
  $('themeGrid').innerHTML = THEMES.map(t=>`
    <button class="tcard ${S.meta.theme===t.id?'sel':''}" data-theme="${t.id}">
      ${S.meta.theme===t.id?'<span class="ck">✓</span>':''}
      <span class="img"><img src="${t.img}" alt=""></span>
      <span><span class="tn">${t.name}</span><span class="td" style="display:block">${t.td}</span></span>
    </button>`).join('');
  $('fontGrid').innerHTML = FONTS.map(f=>`
    <button class="fcard ${S.meta.font===f.id?'sel':''}" data-font="${f.id}">
      ${S.meta.font===f.id?'<span class="ck">✓</span>':''}
      <span class="fs" style="font-family:${f.id==='kuaile'?'ZCOOL':f.id==='huangyou'?'HuangYou':f.id==='kai'?'KaiShu':'inherit'}">琴 ♪</span>
      <span class="fn">${f.name}</span><span class="fd">${f.desc}</span>
    </button>`).join('');
  $('wallGrid').innerHTML = WALLS.map(w=>{
    const style = w.custom ? `background-image:url('${S.meta.customWall}')`
                : w.img ? `background-image:url('${w.img}')`
                : `background-image:${w.grad||'linear-gradient(160deg,var(--bg1),var(--bg2))'}`;
    return `<button class="wthumb ${S.meta.wall===w.id?'sel':''}" data-wall="${w.id}" style="${style}">
      ${S.meta.wall===w.id?'<span class="using">使用中 ♡</span>':''}</button>`;
  }).join('');
  $('aboutLine').textContent = `秋秋课表 · 数据存在这台手机里 · 记得常备份 ♡`;
}

/* 探测自带图片壁纸：文件在（私有部署手动放置）才显示，开源版自动隐藏 */
async function probeWalls(){
  const imgs = [
    { id:'melody',  img:'assets/wall_melody.jpg' },
    { id:'kittyf',  img:'assets/wall_kitty_flower.jpg' },
    { id:'kittyt',  img:'assets/wall_kitty_tall.jpg' },
    { id:'kuromis', img:'assets/wall_kuromi_star.jpg' },
    { id:'kuromip', img:'assets/wall_kuromi_pixel.jpg' },
    { id:'cinnamo', img:'assets/wall_cinnamo.jpg' },
  ];
  const found = [];
  for (const w of imgs){
    const ok = await new Promise(res=>{ const i = new Image(); i.onload=()=>res(true); i.onerror=()=>res(false); i.src = w.img; });
    if (ok) found.push(w);
  }
  WALLS = [
    { id:'none',  name:'纯色' },
    { id:'g1',    grad:'linear-gradient(160deg,#ffe0eb,#ffc3da)' },
    ...found,
    { id:'night', grad:'linear-gradient(160deg,#2e2837,#5c4a78)' },
  ];
  if (S.meta.wall !== 'custom' && S.meta.wall !== 'none' && !WALLS.find(w=>w.id===S.meta.wall)) { S.meta.wall='none'; persist(); }
  renderThemes(); applyWall();
}
function renderAll(){ renderToday(); renderWeek(); renderStudents(); renderOrch(); renderThemes(); renderUserAv(); }

/* ---------------- 生日 ---------------- */
function isBirthday(dateStr){ return S.meta.birthday && mmdd(dateStr)===S.meta.birthday; }
function showSplash(){
  const t = todayStr();
  const box = $('splash');
  if(isBirthday(t)){
    $('splashTitle').textContent = '🎂 生日快乐';
    $('splashText').innerHTML = '愿新的一岁，<br>琴声和日子都甜甜的 ♡<br><span style="font-size:12.5px;opacity:.75">—— 这个小课表，是给你的一份小心意</span>';
  } else {
    const who = S.meta.userName ? S.meta.userName + '，' : '';
    const lines = S.meta.greetings && S.meta.greetings.length ? S.meta.greetings : [
      '愿每节课都顺利，每个学生都乖 ♪',
      '琴弦准，心情甜，今天也要闪闪发光 ♡',
      '新的一天，从一段好听的旋律开始 🌸',
      '愿今天的手型、音准和心情都在线 ♪',
      '日子和琴声一样，慢慢练都会好听的 ♡'
    ];
    $('splashTitle').textContent = '♪ 今天也要元气满满';
    $('splashText').innerHTML = who + lines[+t.slice(8) % lines.length] + '<br><span style="font-size:12.5px;opacity:.75">' + fmtCnDate(t) + '</span>';
  }
  box.querySelectorAll('.confetti').forEach(c=>c.remove());
  const items = ['♪','🎀','💖','⭐','🌸','🎻'];
  for(let i=0;i<18;i++){
    const sp = document.createElement('span');
    sp.className='confetti';
    sp.textContent = items[i%items.length];
    sp.style.left = (4+Math.random()*92)+'%';
    sp.style.animationDuration = (3.4+Math.random()*3.6)+'s';
    sp.style.animationDelay = (-Math.random()*4)+'s';
    box.appendChild(sp);
  }
  $('splashSkip').checked = false;
  box.classList.add('on');
}
function checkSplash(){
  const t = todayStr();
  if(S.meta.splashHideDate === t) return;   // 今天勾过「不再出现」
  showSplash();
}

/* ---------------- 弹层控制 ---------------- */
function openMask(id){
  // 任何弹层打开时强制收起开屏祝福（否则它 z-index 更高会把弹层盖死，确定键点不动）
  const sp = document.getElementById('splash');
  if (sp && sp.classList.contains('on')) { sp.classList.remove('on'); if (typeof S !== 'undefined' && S.meta) save(); }
  $(id).classList.add('on');
}
function closeMask(id){ $(id).classList.remove('on'); }

function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._h); toast._h = setTimeout(()=>t.classList.remove('on'), 1800);
}

/* ---------------- 学生编辑 ---------------- */
function openStudent(id){
  editingStudentId = id||null;
  const st = id ? studentById(id) : null;
  $('studentFormTitle').textContent = st? '编辑 · '+st.name : '添加学生';
  $('fName').value = st? st.name : '';
  $('fLoc').value = st? (st.loc||'') : '';
  $('fPhone').value = st? (st.phone||'') : '';
  $('fBday').value = st? (st.bday||'') : '';
  $('fPass').value = st && st.pass ? (st.pass.total - st.pass.used) : '';
  renderPhotos(st ? (st.photos||[]) : []);
  $('fLevel').value = st? (st.level||'') : '';
  $('fPiece').value = st? (st.piece||'') : '';
  $('fFee').value = st&&+st.fee>0? st.fee : '';
  $('fNote').value = st? (st.note||'') : '';
  $('studentErr').classList.remove('on');
  pickedAvatar = st ? (st.avatar||'') : '';
  renderEmojiGrid(st? st.emoji : EMOJIS[Math.floor(Math.random()*8)]);
  if (pickedAvatar) renderAvPreview();
  renderHeartGrid(st? st.heart : HEART_KEYS[(S.students.length)%HEART_KEYS.length]);
  renderSlotRows(st);
  $('btnDelStudent').style.display = st? 'block':'none';
  $('btnDelStudent').textContent = '🗑️ 删除这个学生';
  $('btnDelStudent').dataset.armed = '';
  openMask('maskStudent');
}
let pickedEmoji = '🐰';
let pickedAvatar = '';
function renderAvPreview(){
  $('avPrev').innerHTML = pickedAvatar
    ? `<img class="avimg" src="${pickedAvatar}">`
    : pickedEmoji;
}
let formPhotos = [];
function renderPhotos(list){
  formPhotos = list.slice(0,6);
  $('photoGrid').innerHTML = formPhotos.map((p,i)=>`
    <button type="button" class="ph" data-i="${i}"><img src="${p}"><span class="rm">✕</span></button>`).join('')
    + (formPhotos.length<6 ? '<label class="ph" style="display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--sub)" for="photoFile">＋</label>' : '');
}
function renderEmojiGrid(sel){
  pickedEmoji = sel; pickedAvatar = '';
  renderAvPreview();
  $('emGrid').innerHTML = EMOJIS.map(e=>`<button type="button" class="${e===sel?'sel':''}" data-em="${e}">${e}</button>`).join('');
}
let pickedHeart = '💗';
function renderHeartGrid(sel){
  pickedHeart = sel;
  $('heartGrid').innerHTML = HEART_KEYS.map(h=>`<button type="button" class="${h===sel?'sel':''}" data-heart="${h}" style="font-size:16px">${h}</button>`).join('');
}
function slotCardHTML(sl){
  return `<div class="slotcard" data-dow="${sl.dow}" data-time="${sl.time||'10:00'}" data-end="${sl.end||''}">
    <div class="dowchips">${DOW.map((d,i)=>`<button type="button" class="dchip ${+sl.dow===i?'on':''}" data-dow="${i}">${d.slice(1)}</button>`).join('')}</div>
    <div class="slotrow">
      <button type="button" class="tfield" data-f="time">🕐 ${sl.time||'10:00'}</button>
      <button type="button" class="tfield" data-f="end">🏁 ${sl.end||'--:--'}</button>
      <button type="button" class="del">✕</button>
    </div>
    <input type="text" class="sr-note" maxlength="30" placeholder="备注（选填）：如 先去 301 再去 302" value="${sl.note||''}">
  </div>`;
}
function renderSlotRows(st){
  const slots = st ? S.slots.filter(x=>x.studentId===st.id).sort((a,b)=>a.dow-b.dow||toMin(a.time)-toMin(b.time)) : [];
  if(slots.length===0) slots.push({dow:6,time:'10:00',end:'10:45',note:''});
  $('slotRows').innerHTML = slots.map(sl=>slotCardHTML(sl)).join('');

}
function collectSlots(){
  const out = [];
  $('slotRows').querySelectorAll('.slotcard').forEach(card=>{
    out.push({
      dow:+card.dataset.dow,
      time:card.dataset.time || '10:00',
      end:card.dataset.end || '',
      note:card.querySelector('.sr-note').value.trim(),
    });
  });
  return out;
}
function saveStudent(){
  const name = $('fName').value.trim();
  if(!name){ $('studentErr').classList.add('on'); return; }
  const data = {
    name, emoji:pickedEmoji, heart:pickedHeart, avatar:pickedAvatar||'',
    phone:$('fPhone').value.trim(), bday:$('fBday').value.trim(),
    photos: formPhotos.slice(),
    pass: (()=>{ 
      const remain = +$('fPass').value||0;
      const old = editingStudentId ? (studentById(editingStudentId).pass||{used:0}) : {used:0};
      return { total: remain + (+old.used||0), used: +old.used||0 };
    })(),
    loc:$('fLoc').value.trim(),
    level:$('fLevel').value.trim(), piece:$('fPiece').value.trim(),
    fee:$('fFee').value||0, note:$('fNote').value.trim(),
    ts:Date.now(),
  };
  const newSlots = collectSlots().map(s=>Object.assign(s,{ts:Date.now()}));
  if(editingStudentId){
    const st = studentById(editingStudentId);
    Object.assign(st, data);
    S.slots = S.slots.filter(x=>x.studentId!==st.id);
    newSlots.forEach(s=>S.slots.push(Object.assign({id:uid(), studentId:st.id}, s)));
  }else{
    const id = uid();
    S.students.push(Object.assign({id, ci:S.students.length%AVCOLORS.length}, data));
    newSlots.forEach(s=>S.slots.push(Object.assign({id:uid(), studentId:id}, s)));
  }
  save(); closeMask('maskStudent'); renderAll();
  toast('已保存 ♡');
}
function deleteStudent(){
  const btn = $('btnDelStudent');
  if(btn.dataset.armed!=='1'){ btn.dataset.armed='1'; btn.textContent = '再点一次确认删除'; return; }
  const id = editingStudentId;
  S.students = S.students.filter(s=>s.id!==id);
  S.slots = S.slots.filter(x=>x.studentId!==id);
  S.extras = S.extras.filter(x=>x.studentId!==id);
  save(); closeMask('maskStudent'); renderAll(); toast('已删除');
}

/* ---------------- 课程 / 排练演出 操作 ---------------- */
function openItemSheet(key){
  const [d,tag] = key.split('|');
  if(tag[0]==='r' || tag[0]==='p'){ openEventSheet(key); return; }
  const l = lessonsOn(d).find(x=>x.key===key);
  if(!l) return;
  currentLessonKey = key;
  const st = itemStudent(l.studentId);
  const rec = S.log[key];
  $('lsAv').innerHTML = avInner(st); $('lsAv').style.background = studentColor(l.studentId);
  $('lsTitle').textContent = `${st.name} · ${timeRange(l)}`;
  const bits = [fmtCnDate(d)];
  if(l.loc) bits.push('📍'+l.loc);
  if(st.piece) bits.push(st.piece);
  if(l.extraNote) bits.push(l.extraNote);
  if(l.note) bits.push('📌 '+l.note);
  if(rec&&rec.note) bits.push('📝 '+rec.note);
  $('lsSub').textContent = bits.join(' · ');
  $('btnDone').textContent = rec&&rec.status==='done' ? '📝 更新小记录' : '✓ 上完这节课';
  $('btnLeave').textContent = '🏖️ 今天请假';
  $('noteWrap').classList.remove('on');
  $('lsNote').value = rec&&rec.note ? rec.note : '';
  $('btnEditEvent').style.display = 'none';
  $('btnConfirm').style.display = (l.kind==='extra' && !l.confirmed) ? 'block':'none';
  $('btnConfirm').dataset.key = key;
  $('btnDelExtra').style.display = l.kind==='extra' ? 'block':'none';
  $('btnDelExtra').textContent = '🗑️ 删除这节加课';
  $('btnResched').style.display = 'block';
  $('btnResched').dataset.key = key;
  openMask('maskLesson');
}
function openEventSheet(key){
  const [d,tag] = key.split('|');
  const evId = tag.slice(1);
  const ev = S.events.find(x=>x.id===evId);
  if(!ev) return;
  currentLessonKey = key;
  const p = projectById(ev.projectId) || {title:'（已删除项目）'};
  const rec = S.log[key];
  const isReh = ev.kind==='reh';
  $('lsAv').textContent = isReh? '🎼':'🎻';
  $('lsAv').style.background = isReh? '#dcebfd' : '#ffedc9';
  $('lsTitle').textContent = `${isReh?'排练':'演出'} · ${p.title}`;
  const fee = isReh? (+p.rfee||0) : (+p.cfee||0);
  $('lsSub').textContent = [fmtCnDate(d), ev.time + (ev.end? '-'+ev.end:''), ev.venue, fee>0? fee+' 元':'']
    .filter(Boolean).join(' · ') + (rec&&rec.note? ' · 📝'+rec.note : '');
  $('btnDone').textContent = rec&&rec.status==='done'
    ? '📝 更新小记录'
    : (isReh? '✓ 这次排练出勤了' : '✓ 这场演出完成啦');
  $('btnLeave').textContent = '✖️ 取消这场日程';
  $('noteWrap').classList.remove('on');
  $('lsNote').value = rec&&rec.note ? rec.note : '';
  $('btnEditEvent').style.display = 'block';
  $('btnConfirm').style.display = 'none';
  $('btnResched').style.display = 'block';
  $('btnResched').dataset.key = key;
  $('btnDelExtra').style.display = 'block';
  $('btnDelExtra').textContent = '🗑️ 删除这条日程';
  openMask('maskLesson');
}
function markDone(){
  const rec = S.log[currentLessonKey];
  if(rec && rec.status==='done'){ $('noteWrap').classList.add('on'); return; }
  $('noteWrap').classList.add('on');
  $('btnSaveDone').textContent = '保存打卡 ✓';
}
function saveDone(){
  const wasDone = S.log[currentLessonKey] && S.log[currentLessonKey].status==='done';
  S.log[currentLessonKey] = Object.assign({}, S.log[currentLessonKey], { status:'done', note:$('lsNote').value.trim(), ts:Date.now() });
  // 课时包计数：本次新完成才 +1
  if(!wasDone){
    const tag = currentLessonKey.split('|')[1]; let sid = null;
    if(tag[0]==='s'){ const sl = S.slots.find(x=>'s'+x.id===tag); if(sl) sid = sl.studentId; }
    else if(tag[0]==='e'){ const ex = S.extras.find(x=>'e'+x.id===tag); if(ex) sid = ex.studentId; }
    const st = sid && studentById(sid);
    if(st && st.pass && +st.pass.total>0) st.pass.used = Math.min(+st.pass.total, (+st.pass.used||0) + 1);
  }
  save(); closeMask('maskLesson'); renderAll(); toast('打卡完成，辛苦啦 ♡');
}
function markLeave(){
  S.log[currentLessonKey] = Object.assign({}, S.log[currentLessonKey], { status:'leave', ts:Date.now() });
  save(); closeMask('maskLesson'); renderAll(); toast('已记请假 🏖️');
}
function clearStatus(){
  const rec = S.log[currentLessonKey];
  delete S.log[currentLessonKey];
  // 课时包计数：撤销的是已完成课则 -1
  if(rec && rec.status==='done'){
    const tag = currentLessonKey.split('|')[1]; let sid = null;
    if(tag[0]==='s'){ const sl = S.slots.find(x=>'s'+x.id===tag); if(sl) sid = sl.studentId; }
    else if(tag[0]==='e'){ const ex = S.extras.find(x=>'e'+x.id===tag); if(ex) sid = ex.studentId; }
    const st = sid && studentById(sid);
    if(st && st.pass) st.pass.used = Math.max(0, (+st.pass.used||0) - 1);
  }
  save(); closeMask('maskLesson'); renderAll(); toast('已撤销');
}
function delExtra(){
  const tag = currentLessonKey.split('|')[1];
  if(tag[0]==='e'){
    S.extras = S.extras.filter(x=>'e'+x.id!==tag);
    delete S.log[currentLessonKey];
    save(); closeMask('maskLesson'); renderAll(); toast('加课已删除');
    return;
  }
  if(tag[0]==='r' || tag[0]==='p'){
    S.events = S.events.filter(x=>(x.kind==='reh'?'r':'p')+x.id!==tag);
    delete S.log[currentLessonKey];
    save(); closeMask('maskLesson'); renderAll(); toast('日程已删除');
  }
}
function editEventFromSheet(){
  const tag = currentLessonKey.split('|')[1];
  const evId = tag.slice(1);
  closeMask('maskLesson');
  openEvent(evId);
}

/* ---------------- 加课 ---------------- */
function openExtra(dateStr, keepDT){
  if(S.students.length===0){ toast('先去「学生」页添加小朋友哦'); switchPage('students'); return; }
  $('exStudent').innerHTML = S.students.map(s=>`<option value="${s.id}">${s.emoji} ${esc(s.name)}</option>`).join('');
  const d = dateStr || todayStr();
  $('exDT').dataset.date = d; $('exDT').dataset.time = '16:00';
  $('exDT').textContent = `📅 ${fmtCnDate(d)} ${'16:00'}`;
  $('exEndT').dataset.time = '16:45';
  $('exEndT').textContent = '🏁 16:45';
  $('exNote').value = '';
  openMask('maskExtra');
}
function saveExtra(){
  const sid = $('exStudent').value;
  const date = document.querySelector('#exDT').dataset.date || todayStr();
  const time = document.querySelector('#exDT').dataset.time || '16:00';
  const end = document.querySelector('#exEndT').dataset.time || '';
  if(!sid || !date){ $('extraErr').classList.add('on'); return; }
  S.extras.push({ id:uid(), studentId:sid, date, time, end, note:$('exNote').value.trim(), ts:Date.now() });
  save(); closeMask('maskExtra'); renderAll(); toast('加上啦 ♪');
}

/* ---------------- 乐团：项目与日程 ---------------- */
let editingProjectId = null;
let editingEventId = null;

function openProject(id){
  editingProjectId = id||null;
  const p = id? projectById(id) : null;
  $('projFormTitle').textContent = p? '编辑 · '+p.title : '新演出项目';
  $('pTitle').value = p? p.title : '';
  $('pRfee').value = p&&+p.rfee>0? p.rfee : '';
  $('pCfee').value = p&&+p.cfee>0? p.cfee : '';
  $('pNote').value = p? (p.note||'') : '';
  $('projErr').classList.remove('on');
  $('btnDelProject').style.display = p? 'block':'none';
  $('btnDelProject').dataset.armed = '';
  $('btnDelProject').textContent = '🗑️ 删除这个项目（连排练演出一起）';
  openMask('maskProject');
}
function saveProject(){
  const title = $('pTitle').value.trim();
  if(!title){ $('projErr').classList.add('on'); return; }
  const data = { title, rfee:$('pRfee').value||0, cfee:$('pCfee').value||0, note:$('pNote').value.trim() };
  data.ts = Date.now();
  if(editingProjectId) Object.assign(projectById(editingProjectId), data);
  else S.projects.push(Object.assign({id:uid()}, data));
  save(); closeMask('maskProject'); renderAll(); toast('项目已保存 ♡');
}
function deleteProject(){
  const btn = $('btnDelProject');
  if(btn.dataset.armed!=='1'){ btn.dataset.armed='1'; btn.textContent='再点一次确认删除'; return; }
  S.events = S.events.filter(e=>e.projectId!==editingProjectId);
  S.projects = S.projects.filter(p=>p.id!==editingProjectId);
  Object.keys(S.log).forEach(k=>{
    const tag = k.split('|')[1];
    if((tag[0]==='r'||tag[0]==='p') && !S.events.some(e=>(e.kind==='reh'?'r':'p')+e.id===tag)) delete S.log[k];
  });
  save(); closeMask('maskProject'); renderAll(); toast('项目已删除');
}
function openEvent(evId, preset){
  editingEventId = evId||null;
  if(S.projects.length===0){ toast('先新建一个演出项目哦'); openProject(); return; }
  const ev = evId? S.events.find(x=>x.id===evId) : null;
  $('eventFormTitle').textContent = ev? '编辑日程' : '加排练 / 演出';
  $('evProject').innerHTML = S.projects.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('');
  $('evProject').value = ev? ev.projectId : (preset&&preset.projectId) || S.projects[0].id;
  $('evKind').value = ev? ev.kind : (preset&&preset.kind) || 'reh';
  const d0 = ev? ev.date : (preset&&preset.date) || todayStr();
  const t0 = ev? ev.time : '19:00';
  $('evDT').dataset.date = d0; $('evDT').dataset.time = t0;
  $('evDT').textContent = `📅 ${fmtCnDate(d0,false)} ${t0}`;
  const e0 = ev? (ev.end||'') : '21:30';
  $('evEndT').dataset.time = e0;
  $('evEndT').textContent = '🏁 ' + (e0 || '选填');
  $('evVenue').value = ev? (ev.venue||'') : '';
  $('evNote').value = ev? (ev.note||'') : '';
  $('eventErr').classList.remove('on');
  $('btnDelEvent').style.display = ev? 'block':'none';
  $('btnDelEvent').dataset.armed = '';
  $('btnDelEvent').textContent = '🗑️ 删除这条日程';
  openMask('maskEvent');
}
function saveEvent(){
  const pid = $('evProject').value;
  if(!pid){ $('eventErr').classList.add('on'); return; }
  const data = {
    projectId:pid, kind:$('evKind').value,
    date:(document.querySelector('#evDT').dataset.date) || todayStr(),
    time:(document.querySelector('#evDT').dataset.time) || '19:00',
    end:document.querySelector('#evEndT').dataset.time || '',
    venue:$('evVenue').value.trim(), note:$('evNote').value.trim(),
  };
  data.ts = Date.now();
  if(editingEventId) Object.assign(S.events.find(x=>x.id===editingEventId), data);
  else S.events.push(Object.assign({id:uid()}, data));
  save(); closeMask('maskEvent'); renderAll(); toast('日程已保存 ♪');
}
function deleteEvent(){
  const btn = $('btnDelEvent');
  if(btn.dataset.armed!=='1'){ btn.dataset.armed='1'; btn.textContent='再点一次确认删除'; return; }
  S.events = S.events.filter(x=>x.id!==editingEventId);
  save(); closeMask('maskEvent'); renderAll(); toast('日程已删除');
}
function renderOrch(){
  const os = orchMonthStats();
  $('orchStats').innerHTML = `<div class="card statcard">
    <div><div class="big">${os.reh}<span style="font-size:13px"> 次</span></div><div class="lbl">本月排练</div></div>
    <div class="sep"></div>
    <div><div class="big">${os.perf}<span style="font-size:13px"> 场</span></div><div class="lbl">本月演出</div></div>
    <div class="sep"></div>
    <div><div class="big" style="font-size:19px;padding-top:4px">${os.income>0? '¥'+os.income : '记'}</div><div class="lbl">${os.income>0?'乐团收入':'出场费'}</div></div>
  </div>`;
  if(S.projects.length===0){
    $('projList').innerHTML = emptyHTML({e:'🎼', txt:'还没有演出项目，从第一场音乐会开始吧', btns:`<button class="btn" onclick="openProject()">＋ 新演出项目</button><button class="btn ghost" onclick="loadSample()">看示例</button>`});
    return;
  }
  $('projList').innerHTML = S.projects.map(p=>{
    const evs = S.events.filter(e=>e.projectId===p.id)
      .sort((a,b)=> a.date.localeCompare(b.date) || toMin(a.time)-toMin(b.time));
    const rehN = evs.filter(e=>e.kind==='reh').length, perfN = evs.filter(e=>e.kind==='perf').length;
    const rows = evs.map(e=>{
      const st = S.log[e.date+'|'+(e.kind==='reh'?'r':'p')+e.id];
      const status = st? (st.status==='done'?' · 出勤✓':' · 已取消') : '';
      return `<button class="evrow" data-key="${e.date+'|'+(e.kind==='reh'?'r':'p')+e.id}">
        <span class="evd">${+e.date.slice(5,7)}/${+e.date.slice(8,10)} ${DOW[dowMon(e.date)].slice(1)}</span>
        <span class="evt ${e.kind}">${e.kind==='reh'?'排练':'演出'}</span>
        <span class="evt-t">${e.time}${e.end?'-'+e.end:''}${e.venue?' · '+esc(e.venue):''}${status}</span>
      </button>`;
    }).join('');
    const chips = [ `排练 ¥${+p.rfee||0}/次`, `演出 ¥${+p.cfee||0}/场`, `${rehN} 次排练 · ${perfN} 场演出` ]
      .map(t=>`<span>${esc(t)}</span>`).join('');
    return `<div class="card projcard">
      <div class="top"><span class="av" style="background:#f2e3ff">🎼</span>
        <span style="flex:1;min-width:0"><span class="nm">${esc(p.title)}</span>
          <span class="chips">${chips}</span></span>
        <button class="mini-edit" data-editproj="${p.id}">✏️</button></div>
      ${p.note? `<div class="song">📌 ${esc(p.note)}</div>`:''}
      <div class="evrows">${rows || '<div class="thint" style="margin-top:8px">还没有排练/演出日程</div>'}</div>
      <div class="editbtns">
        <button class="mini" data-addev="${p.id}:reh">＋ 排练</button>
        <button class="mini" data-addev="${p.id}:perf">＋ 演出</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------------- 主题 / 壁纸 ---------------- */
function setTheme(id){ S.meta.theme=id; save(); applyTheme(); renderThemes(); renderStudents(); }
function setWall(id){ S.meta.wall=id; save(); applyWall(); renderThemes(); }
function setFont(id){ S.meta.font=id; save(); applyTheme(); renderThemes(); }

/* ---------------- 音叉 / 节拍器 ---------------- */
let AC = null;
function ac(){ if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==='suspended') AC.resume(); return AC; }
function tone(freq, dur, delay=0, vol=0.35){
  const c = ac(); const o=c.createOscillator(), g=c.createGain();
  o.type='sine'; o.frequency.value=freq; o.connect(g); g.connect(c.destination);
  const t = c.currentTime + delay;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.start(t); o.stop(t+dur+0.05);
}
let metroTimer = null, metroBeat = 0, metroOn = false;
function metroStop(){
  metroOn = false; clearInterval(metroTimer); metroTimer=null;
  $('btnMetroToggle').textContent='▷ 开始打拍子';
  $('metroPulse').classList.remove('beat');
  $('beatDots').querySelectorAll('span').forEach(s=>s.classList.remove('on'));
}
function metroStart(){
  metroOn = true; metroBeat = 0;
  $('btnMetroToggle').textContent='⏸ 停';
  const tick = ()=>{
    const bpm = Math.min(220, Math.max(30, +$('bpmVal').value||72));
    const accent = metroBeat%4===0;
    tone(accent?1175:784, 0.07, 0, accent?0.5:0.28);
    $('metroPulse').classList.add('beat');
    setTimeout(()=>$('metroPulse').classList.remove('beat'), 90);
    $('beatDots').querySelectorAll('span').forEach((s,i)=>s.classList.toggle('on', i===metroBeat%4));
    metroBeat++;
  };
  tick();
  metroTimer = setInterval(tick, 60000/(+$('bpmVal').value||72));
}

/* ---------------- 云同步 ----------------
   协议：GET  /api/state → {rev, data|null}
         POST /api/push {base_rev, data} → {ok,rev} 或 409 {error,rev,data}
   冲突策略：按 id 合并（同 id 比 ts 新者胜），打卡按 ts 合并；
   meta 只同步生日，主题/壁纸/同步设置是设备自己的。 */
function syncCfg(){ return S.meta.sync || {}; }
function syncApiBase(){ return (syncCfg().url||'').trim().replace(/\/+$/,''); }
let syncTimer = null, syncInFlight = false;
function scheduleAutoSync(){
  const c = syncCfg();
  if(!c.url || !c.token || !c.auto || syncInFlight) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async ()=>{
    if(syncInFlight) return;
    syncInFlight = true;
    try{ await syncPush(true); } catch(e){}
    syncInFlight = false;
  }, 4000);
}
async function syncApi(base, token, path, opts){
  const r = await fetch(base + path, Object.assign({
    headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token }
  }, opts||{}));
  const j = await r.json().catch(()=>({}));
  if(!r.ok){
    const err = new Error(j.error || ('HTTP '+r.status));
    err.status = r.status; err.body = j;
    throw err;
  }
  return j;
}
function mergeData(local, remote){
  const out = JSON.parse(JSON.stringify(local));
  ['students','slots','extras','projects','events'].forEach(k=>{
    const map = new Map((out[k]||[]).map(x=>[x.id,x]));
    (remote[k]||[]).forEach(x=>{
      const cur = map.get(x.id);
      if(!cur){ map.set(x.id, x); return; }
      if((x.ts||0) > (cur.ts||0)) map.set(x.id, x);
    });
    out[k] = [...map.values()];
  });
  // 假期：并集合并（按起止日期去重）
  const holSet = new Set((out.holidays||[]).map(h=>h.start+'~'+h.end));
  (remote.holidays||[]).forEach(h=>{ const k=h.start+'~'+h.end; if(!holSet.has(k)){ holSet.add(k); (out.holidays=out.holidays||[]).push(h); } });
  out.log = {};
  const keys = new Set([...Object.keys(local.log||{}), ...Object.keys(remote.log||{})]);
  keys.forEach(k=>{
    const a = (local.log||{})[k], b = (remote.log||{})[k];
    if(a && b) out.log[k] = (b.ts||0) > (a.ts||0) ? b : a;
    else out.log[k] = a || b;
  });
  // 合并后自愈去重
  const seenSl3 = new Set();
  out.slots = out.slots.filter(sl => { const k = sl.studentId+'|'+sl.dow+'|'+sl.time; if (seenSl3.has(k)) return false; seenSl3.add(k); return true; });
  const seenEx3 = new Set();
  out.extras = out.extras.filter(ex => { const k = ex.studentId+'|'+ex.date+'|'+ex.time; if (seenEx3.has(k)) return false; seenEx3.add(k); return true; });
    out.meta = Object.assign({}, out.meta, { birthday: (remote.meta && remote.meta.birthday) || out.meta.birthday });
  return out;
}
async function syncPush(silent){
  const c = syncCfg();
  if(!c.url || !c.token) throw new Error('先在「主题」页填服务器地址和同步码');
  try{
    const j = await syncApi(syncApiBase(), c.token, '/api/push', {
      method:'POST', body: JSON.stringify({ base_rev: c.rev||0, data: S })
    });
    S.meta.sync.rev = j.rev; persist();
    if(!silent) toast('☁️ 已上传到云端');
    return 'ok';
  }catch(e){
    if(e.status === 409 && e.body && e.body.data){
      S = mergeData(S, e.body.data);
      const j2 = await syncApi(syncApiBase(), c.token, '/api/push', {
        method:'POST', body: JSON.stringify({ base_rev: e.body.rev, data: S })
      });
      S.meta.sync.rev = j2.rev; persist(); applyTheme(); applyWall(); renderAll();
      if(!silent) toast('☁️ 两边都有改动，已自动合并上传');
      return 'merged';
    }
    throw e;
  }
}
async function syncPull(){
  const c = syncCfg();
  if(!c.url || !c.token) throw new Error('先在「主题」页填服务器地址和同步码');
  const j = await syncApi(syncApiBase(), c.token, '/api/state');
  if(!j.data){ return '云端还是空的，先用「上传」把课表推上去'; }
  if((j.rev||0) === (c.rev||0)){ return '已是最新，无需同步'; }
  S = mergeData(S, j.data);
  S.meta.sync.rev = j.rev;
  persist(); applyTheme(); applyWall(); renderAll();
  return '☁️ 已拉取云端更新';
}
function syncFillForm(){
  $('syncUrl').value = syncCfg().url || '';
  $('syncToken').value = syncCfg().token || '';
  $('syncHint').textContent = syncCfg().url
    ? (syncCfg().auto ? '自动同步已开启：改任何内容 4 秒后自动上传 ♡（rev '+ (syncCfg().rev||0) +'）'
                      : '自动同步已关，记得手动上传/下载')
    : '数据存在本机；配好云同步后，改任何内容都会自动同步到另一台手机 ♡';
}

/* ---------------- 日期时间选择器（Windows 日历式） ---------------- */
const Pick = { cb:null, mode:'time', y:2026, m:1, date:null, time:'09:00', end:'' };

function calGridHTML(){
  const first = new Date(Pick.y, Pick.m-1, 1);
  const blanks = (first.getDay()+6)%7;
  const days = new Date(Pick.y, Pick.m, 0).getDate();
  const today = todayStr();
  let html = '';
  for (let i=0;i<blanks;i++) html += '<span></span>';
  for (let d=1; d<=days; d++){
    const ds = `${Pick.y}-${pad(Pick.m)}-${pad(d)}`;
    const on = Pick.date===ds;
    const td = ds===today;
    html += `<button type="button" class="cday ${on?'on':''} ${td?'today':''}" data-d="${ds}">${d}</button>`;
  }
  return html;
}
function renderPicker(){
  if (Pick.mode==='datetime'){
    $('calLabel').textContent = `${Pick.y}年${Pick.m}月`;
    $('calGrid').innerHTML = calGridHTML();
  }
  const on30 = TIME_OPTS.filter(t => t>='06:00' && t<='22:30' && (t.slice(3)==='00'||t.slice(3)==='30')).includes(Pick.time);
  $('pickDisp').textContent = (Pick.mode==='datetime' && Pick.date ? fmtCnDate(Pick.date,false)+' ' : '') + (Pick.time||'--:--') + (on30 ? '' : '（用下方 ±5 微调）');
  $('chipGrid').innerHTML = TIME_OPTS.filter(t => t>='06:00' && t<='22:30' && (t.slice(3)==='00'||t.slice(3)==='30'))
    .map(t => `<button type="button" class="chip ${t===Pick.time?'on':''}" data-t="${t}">${t}</button>`).join('');
}
function openTimePicker(opt){
  // opt: {title, mode:'time'|'datetime', date, time, onOk(date,time)}
  Pick.cb = opt.onOk; Pick.mode = opt.mode || 'time';
  Pick.date = opt.date || null;
  Pick.time = opt.time || '09:00';
  if (Pick.date){ const d = parseYmd(Pick.date); Pick.y = d.getFullYear(); Pick.m = d.getMonth()+1; }
  $('pickTitle').textContent = opt.title || '选择时间';
  $('pickCalWrap').style.display = (Pick.mode==='datetime'||Pick.mode==='date') ? '' : 'none';
  $('chipGrid').style.display = Pick.mode==='date' ? 'none' : '';
  $('pickDisp').style.display = Pick.mode==='date' ? 'none' : '';
  $('fM5').parentNode.style.display = Pick.mode==='date' ? 'none' : '';
  renderPicker();
  openMask('maskPick');
}
function bindPicker(){
  $('pickClose').addEventListener('click',()=>closeMask('maskPick'));
  $('pickOk').addEventListener('click',()=>{
    const cb = Pick.cb; closeMask('maskPick');
    if (cb) cb(Pick.mode==='datetime' ? (Pick.date||todayStr()) : null, Pick.time);
  });
  $('calPrev').addEventListener('click',()=>{ Pick.m--; if(Pick.m<1){Pick.m=12;Pick.y--;} renderPicker(); });
  $('calNext').addEventListener('click',()=>{ Pick.m++; if(Pick.m>12){Pick.m=1;Pick.y++;} renderPicker(); });
  $('fM5').addEventListener('click',()=>{
    let m = toMin(Pick.time) - 5; if (m < 360) m = 360;
    Pick.time = `${pad(Math.floor(m/60))}:${pad(m%60)}`; renderPicker();
  });
  $('fP5').addEventListener('click',()=>{
    let m = toMin(Pick.time) + 5; if (m > 1435) m = 1435;
    Pick.time = `${pad(Math.floor(m/60))}:${pad(m%60)}`; renderPicker();
  });
  $('calGrid').addEventListener('click',e=>{
    const b = e.target.closest('[data-d]'); if(!b) return;
    Pick.date = b.dataset.d; renderPicker();
  });
  $('chipGrid').addEventListener('click',e=>{
    const b = e.target.closest('[data-t]'); if(!b) return;
    Pick.time = b.dataset.t; renderPicker();
  });

}

/* ---------------- 一键导入课表（文本解析 + AI 截图识别） ---------------- */
const DAY_MAP = {'一':0,'二':1,'三':2,'四':3,'五':4,'六':5,'日':6,'天':6,'1':0,'2':1,'3':2,'4':3,'5':4,'6':5,'7':6};
const DOW_NAMES = DOW;
const TIME_RE = /(\d{1,2})\s*[:：点]\s*(\d{2})?(?:\s*[~～\-—–至到]\s*(\d{1,2})\s*[:：点]\s*(\d{2})?)?/;
const TIME_OPTS = (() => { const a = []; for (let h = 6; h <= 23; h++) for (let m = 0; m < 60; m += 5) a.push(pad(h)+':'+pad(m)); return a; })();

function compressWide(dataUrl, maxW=1080){
  return new Promise(res=>{
    const im = new Image();
    im.onload = () => {
      if (im.width <= maxW) { res(dataUrl); return; }
      const c = document.createElement('canvas');
      const scale = maxW / im.width;
      c.width = maxW; c.height = Math.round(im.height * scale);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.72));
    };
    im.src = dataUrl;
  });
}
function btnBusy(input, busy){ input.disabled = !!busy; }

function compressSquare(dataUrl, size=240){
  return new Promise(res=>{
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = size; c.height = size;
      const x = c.getContext('2d');
      const side = Math.min(im.width, im.height);
      x.drawImage(im, (im.width-side)/2, (im.height-side)/2, side, side, 0, 0, size, size);
      res(c.toDataURL('image/jpeg', 0.85));
    };
    im.src = dataUrl;
  });
}
function avInner(st){
  return st && st.avatar
    ? `<img class="avimg" src="${st.avatar}" alt="">`
    : (st ? st.emoji : '🐾');
}
function timeSelHTML(value){
  const v = value || '09:00';
  if (!TIME_OPTS.includes(v)) TIME_OPTS.push(v); TIME_OPTS.sort();
  return '<select class="tsel">' + TIME_OPTS.map(t => `<option ${t===v?'selected':''} value="${t}">${t}</option>`).join('') + '</select>';
}
const toPM = h => (h >= 1 && h <= 7) ? h + 12 : h;   // 备忘录习惯：1~7 点默认是下午/晚上

function parseScheduleText(raw){
  const items = [], skipped = [];
  let curDow = null, curLoc = '';
  String(raw||'').split(/\r?\n/).forEach(rawLine=>{
    let line = rawLine.replace(/[✓✔☑✅]/g,'').replace(/\s+/g,' ').trim();
    if(!line) return;
    const dayM = line.match(/^(?:周|星期|礼拜)\s*([一二三四五六日天])$/);
    if(dayM){ curDow = DAY_MAP[dayM[1]]; curLoc=''; return; }
    if(/放假|停课|休息/.test(line)){ skipped.push(rawLine.trim()); return; }
    const tm = line.match(TIME_RE);
    if(!tm){
      if(line.length <= 14 && (!/\d/.test(line) || /教室|琴房|教学点|艺培|学堂|中心|工作室/.test(line))){ curLoc = line.replace(/^[在地:：]\s*/,''); return; }
      skipped.push(rawLine.trim()); return;
    }
    const start = `${pad(toPM(+tm[1]))}:${tm[2]||'00'}`;
    const end = tm[3] !== undefined ? `${pad(toPM(+tm[3]))}:${tm[4]||'00'}` : '';
    const noteM = line.match(/[（(]([^）)]+)[）)]/);
    const note = noteM ? noteM[1].replace(/\s+/g,'').trim() : '';
    let around = (line.slice(0, tm.index) + ' ' + line.slice(tm.index + tm[0].length))
      .replace(/[（(][^）)]*[）)]/g,' ').replace(/\s+/g,' ').trim();
    let name = around, loc = curLoc;
    if(curLoc && around.startsWith(curLoc)){
      name = around.slice(curLoc.length).trim();
    } else if(around && around.length <= 12 && /教室|琴房|学堂|艺培|培训|中心/.test(around)){
      loc = around; name = '';
    }
    name = (name||'').replace(/^(在|去|上|找)/,'').replace(/(教室|琴房)+$/,'').trim();
    if(!name && !loc){ skipped.push(rawLine.trim()); return; }
    items.push({ name: name || '(待补名字)', loc, dow: curDow, time: start, end, note });
  });
  return { items, skipped };
}

const AI_PROMPT = [
  '你是课表解析器。把图片里的课程安排转成 JSON，格式：',
  '{"items":[{"name":"学生名","dow":"周六","time":"15:10","end":"16:55","loc":"地点","note":"括号里的备注"}],"skipped":["看不懂的行原文"]}',
  '规则：',
  '1. 时间一律转 24 小时制：1~7 点视为下午晚上要加 12（3:10→15:10、7:30→19:30），9:00~12:59 保持不变',
  '2. dow 取值：周一/周二/周三/周四/周五/周六/周日',
  '3. 每行的学生名 = 去掉时间、地点、勾选符号后的文字；单独成行的地点应用于它下面所有行',
  '4. 含 放假/停课/休息 的行和看不懂的行放进 skipped，不要编造',
  '5. 只输出 JSON，不要任何解释'
].join('\n');

async function aiRecognizeDataUrl(dataUrl){
  const key = (document.getElementById('aiKey').value.trim()) || (S.meta.ai && S.meta.ai.key) || '';
  if(!key) throw new Error('先填智谱 API Key（图片识别要用）');
  S.meta.ai = Object.assign({}, S.meta.ai||{}, {key}); persist();
  const body = { model:'glm-4v-flash', temperature:0.1, messages:[{ role:'user', content:[
    { type:'image_url', image_url:{ url:dataUrl } },
    { type:'text', text: AI_PROMPT }
  ]}]};
  const r = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body: JSON.stringify(body)
  });
  if(!r.ok){ const t = await r.text(); throw new Error('AI 接口 '+r.status+'：'+t.slice(0,120)); }
  const j = await r.json();
  const txt = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  const m = txt.match(/\{[\s\S]*\}/);
  if(!m) throw new Error('AI 没吐出 JSON：'+txt.slice(0,80));
  return JSON.parse(m[0]);
}

let importItems = [];
function showImportPreview(items, skipped){
  importItems = items;
  $('prevList').innerHTML = items.length ? items.map(it=>`
    <div class="prow">
      <input type="checkbox" class="p-on" checked>
      <input type="text" class="p-name" value="${esc(it.name)}">
      <select class="p-dow">${DOW_NAMES.map((d,di)=>`<option value="${di}" ${it.dow===di?'selected':''}>${d}</option>`).join('')}</select>
      <input type="time" class="p-time" value="${it.time}">
      <input type="time" class="p-end" value="${it.end||''}">
      <input type="text" class="p-loc" value="${esc(it.loc||'')}" placeholder="地点">
    </div>`).join('')
    : '<div class="thint">一条都没解析出来…换段文字试试，或者用截图识别</div>';
  const sk = $('prevSkipped');
  if(skipped && skipped.length){ sk.style.display=''; $('prevSkippedList').textContent = skipped.join('；'); }
  else sk.style.display='none';
  $('impTextPane').style.display='none';
  $('impAiPane').style.display='none';
  $('impPreview').style.display='';
}
function confirmImport(){
  const rows = document.querySelectorAll('#prevList .prow');
  let nStu = 0, nSlot = 0;
  rows.forEach(r=>{
    if(!r.querySelector('.p-on').checked) return;
    const name = r.querySelector('.p-name').value.trim() || '(待补名字)';
    const dow  = +r.querySelector('.p-dow').value;
    const time = r.querySelector('.p-time').value || '12:00';
    const end  = r.querySelector('.p-end').value || '';
    const loc  = r.querySelector('.p-loc').value.trim();
    let st = S.students.find(s=>s.name===name);
    if(!st){
      st = { id:uid(), name, emoji:EMOJIS[(S.students.length+3)%EMOJIS.length],
        ci:S.students.length%AVCOLORS.length, heart:HEART_KEYS[S.students.length%HEART_KEYS.length],
        loc, level:'', piece:'', fee:0, note:'', ts:Date.now() };
      S.students.push(st); nStu++;
    } else if(loc && !st.loc){ st.loc = loc; st.ts = Date.now(); }
    const dup = S.slots.some(x=>x.studentId===st.id && x.dow===dow && x.time===time);
    if(!dup){ S.slots.push({ id:uid(), studentId:st.id, dow, time, end, note:'', ts:Date.now() }); nSlot++; }
  });
  save(); closeMask('maskOneImport'); renderAll();
  toast(nStu+nSlot ? `导入完成：${nStu} 名新学生 · ${nSlot} 节固定课 ♡` : '没有勾选任何行哦');
}
function openOneImport(){
  $('impTextPane').style.display='';
  $('impAiPane').style.display='none';
  $('impPreview').style.display='none';
  $('impText').value='';
  document.querySelectorAll('.itab').forEach(t=>t.classList.toggle('on', t.dataset.imp==='text'));
  if(S.meta.ai && S.meta.ai.key) $('aiKey').value = S.meta.ai.key;
  openMask('maskOneImport');
}

/* ---------------- 备份导入导出 ---------------- */
const b64e = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s), c=>c.charCodeAt(0)));
function openBackup(mode, rawText){
  importPayload = null;
  if(mode==='export'){
    $('backupTitle').textContent = '📤 导出备份';
    const code = rawText || ('QQK1.' + b64e(JSON.stringify(S)));
    $('backupText').value = code;
    $('backupText').removeAttribute('readonly');
    $('backupHint').innerHTML = '这串码就是全部课表数据。长按全选复制，发给家人保管，换手机时「导入备份」粘贴一下就回来 ♡';
    $('btnCopyCode').style.display=''; $('btnDoImport').style.display='none';
  }else{
    $('backupTitle').textContent = '📥 导入备份';
    $('backupText').value = rawText||'';
    $('backupText').removeAttribute('readonly');
    $('backupHint').innerHTML = '把分享码粘贴到下面框里，点「导入」。<b style="color:#e05c7e">会覆盖现在的课表</b>，先导出一份再导更放心。';
    $('btnCopyCode').style.display='none'; $('btnDoImport').style.display='';
  }
  openMask('maskBackup');
}
function doImport(){
  let txt = $('backupText').value.trim();
  if(!txt){ toast('先粘贴分享码呀'); return; }
  try{
    if(txt.startsWith('QQK1.')) txt = b64d(txt.slice(5));
    const obj = JSON.parse(txt);
    if(!Array.isArray(obj.students) || !obj.meta) throw new Error('格式不对');
    const merged = Object.assign(defaults(), obj, { meta: Object.assign(defaults().meta, obj.meta) });
    importPayload = merged;
    S = merged; save();
    applyTheme(); applyWall(); renderAll(); closeMask('maskBackup');
    history.replaceState(null,'',location.pathname);
    toast('导入成功，欢迎回来 ♡');
  }catch(e){ toast('这串码读不出来，检查一下是否复制完整'); }
}

/* ---------------- 示例数据 ---------------- */
function loadSample(){
  if(S.students.length>0 && !confirm('已有学生数据，示例会加在后面，继续吗？')) return;
  const nameSeen = new Set(S.students.map(s=>s.name));
  const slotSeen = new Set(S.slots.map(s=>s.studentId+'|'+s.dow+'|'+s.time));
  const projSeen = new Set((S.projects||[]).map(p=>p.title));
  const mk = (name,emoji,ci,level,piece,fee,note,loc)=>{if (nameSeen.has(name)) return S.students.find(s=>s.name===name);const st = {id:uid(),name,emoji,ci,level,piece,fee,note,loc,ts:Date.now()};S.students.push(st); nameSeen.add(name); return st;};
  const s1=mk('小雨','🐰',0,'英皇 2 级','《沃尔法特 No.12》',280,'手型比上个月稳多啦','家中琴房');
  const s2=mk('果果','🐻',1,'英皇 3 级','《开塞 No.2》',300,'下周开始练顿弓','音乐教室 302');
  const s3=mk('桃桃','🐱',2,'启蒙班','《铃木① 小星星变奏》',260,'A 弦音准要盯','城南教学点');
  const s4=mk('豆豆','🐶',3,'英皇 5 级','《塞茨 协奏曲》',350,'备赛曲目 9 月定','江北艺培');
  S.students.push(s1,s2,s3,s4);
  const sl=(st,dow,time,end,note)=>{const k = st.id+'|'+dow+'|'+time;if (slotSeen.has(k)) return;slotSeen.add(k);S.slots.push({id:uid(),studentId:st.id,dow,time,end:end||'',note:note||''});};
    const k = st.id+'|'+dow+'|'+time;
  sl(s1,5,'09:00','09:45'); sl(s2,6,'10:30','11:15','先去 301，3:40 去 302'); sl(s3,6,'14:00','14:45'); sl(s4,5,'16:00','16:45');
  sl(s1,0,'16:00','16:45'); sl(s2,2,'19:00','19:45'); sl(s3,4,'16:00','16:45');
  // 乐团示例：一个项目 = 多次排练 + 一场演出
  if(S.projects.length===0){
    const p1 = {id:uid(), title:'城市交响乐团 · 秋季音乐会', rfee:300, cfee:800, note:'柴可夫斯基第五，指挥李老师'};
    S.projects.push(p1);
    const plus = n => { const x=new Date(); x.setDate(x.getDate()+n); return ymd(x); };
    const ev=(kind,date,time,end,venue)=>S.events.push({id:uid(),projectId:p1.id,kind,date,time,end,venue,note:''});
    ev('reh',  plus(2), '19:00','21:30','音乐厅排练厅');
    ev('reh',  plus(4), '14:00','17:00','音乐厅排练厅');
    ev('reh',  plus(7), '19:00','21:30','音乐厅排练厅');
    ev('perf', plus(8), '19:30','21:30','市音乐厅');
  }
  save(); renderAll(); toast('示例课表来啦，随便点点看 ♡');
}

/* ---------------- 页面切换 ---------------- */
function switchPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  $('page-'+name).classList.add('on');
  document.querySelectorAll('#tabbar .tab').forEach(t=>t.classList.toggle('on', t.dataset.page===name));
  window.scrollTo(0,0);
}

/* ---------------- 事件绑定 ---------------- */
function bind(){
  document.querySelectorAll('#tabbar .tab').forEach(b=>b.addEventListener('click',()=>switchPage(b.dataset.page)));

  // 弹层关闭
  bindPicker();
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeMask(b.dataset.close)));
  document.querySelectorAll('.mask').forEach(m=>m.addEventListener('click',e=>{ if(e.target===m && m.id!=='maskBackup') closeMask(m.id); }));

  // 今日 / 周课表：点课程行 / 加课
  $('todayList').addEventListener('click',e=>{
    const row = e.target.closest('.lrow'); if(row) openItemSheet(row.dataset.key);
  });
  $('weekList').addEventListener('click',e=>{
    const chip = e.target.closest('.wchip'); if(chip){ openItemSheet(chip.dataset.key); return; }
    const add = e.target.closest('.addbtn'); if(add) openExtra(add.dataset.adddate);
  });
  $('wkPrev').addEventListener('click',()=>{ weekOffset--; renderWeek(); });
  $('wkNext').addEventListener('click',()=>{ weekOffset++; renderWeek(); });
  $('vList').addEventListener('click',()=>{ S.meta.weekView='list'; save(); renderWeek(); });
  $('vGrid').addEventListener('click',()=>{ S.meta.weekView='grid'; save(); renderWeek(); });
  $('weekGrid').addEventListener('click',e=>{
    const blk = e.target.closest('.gblk'); if(blk) openItemSheet(blk.dataset.key);
  });

  // 学生页
  $('btnAddStudent2').addEventListener('click',()=>openStudent());
  $('searchInput').addEventListener('input',renderStudents);
  $('studentList').addEventListener('click',e=>{
    const ph = e.target.closest('.phchip');
    if(ph){ const v = ph.dataset.phone; navigator.clipboard && navigator.clipboard.writeText(v).then(()=>toast('已复制 '+v)); e.stopPropagation(); return; }
    const card = e.target.closest('.scard'); if(card) openStudent(card.dataset.sid);
  });

  // 学生表单
  $('emGrid').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) renderEmojiGrid(b.dataset.em); });
  $('heartGrid').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) renderHeartGrid(b.dataset.heart); });
  $('photoFile').addEventListener('change', async e=>{
    for (const f of e.target.files){
      if (formPhotos.length >= 6) break;
      const dataUrl = await new Promise((res,rej)=>{ const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(f); });
      formPhotos.push(await compressSquare(dataUrl, 320));
    }
    e.target.value = '';
    const st = editingStudentId ? studentById(editingStudentId) : null;
    renderPhotos(formPhotos);
  });
  $('photoGrid').addEventListener('click',e=>{
    const rm = e.target.closest('.rm'); if(!rm) return;
    const i = +rm.closest('.ph').dataset.i;
    formPhotos.splice(i,1);
    renderPhotos(formPhotos);
  });
  $('avatarFile').addEventListener('change', async e=>{
    const f = e.target.files[0]; if(!f) return;
    const dataUrl = await new Promise((res,rej)=>{ const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(f); });
    pickedAvatar = await compressSquare(dataUrl, 240);
    $('avPrev').innerHTML = `<img class="avimg" src="${pickedAvatar}">`;
    e.target.value = '';
  });
  $('btnAddSlot').addEventListener('click',()=>{
    const wrap = document.createElement('div');
    wrap.innerHTML = slotCardHTML({dow:5,time:'16:00',end:'16:45',note:''});
    $('slotRows').appendChild(wrap.firstElementChild);
  });
  $('slotRows').addEventListener('click',e=>{
    const card = e.target.closest('.slotcard'); if(!card) return;
    const del = e.target.closest('.del');
    if(del){
      if($('slotRows').querySelectorAll('.slotcard').length>1) card.remove();
      return;
    }
    const dc = e.target.closest('.dchip');
    if(dc){
      card.dataset.dow = dc.dataset.dow;
      card.querySelectorAll('.dchip').forEach(x=>x.classList.toggle('on', x===dc));
      return;
    }
    const tf = e.target.closest('.tfield');
    if(tf){
      const isEnd = tf.dataset.f==='end';
      openTimePicker({
        mode:'time',
        title: isEnd ? '选择结束时间' : '选择开始时间',
        time: card.dataset[isEnd?'end':'time'],
        onOk:(d,t)=>{
          if(isEnd){ card.dataset.end = t; } else { card.dataset.time = t; }
          tf.innerHTML = (isEnd?'🏁 ':'🕐 ') + (t || '--:--');
        }
      });
    }
  });
  $('btnSaveStudent').addEventListener('click',saveStudent);
  $('btnDelStudent').addEventListener('click',deleteStudent);

  // 课程操作
  $('btnDone').addEventListener('click',markDone);
  $('btnSaveDone').addEventListener('click',saveDone);
  $('btnLeave').addEventListener('click',markLeave);
  $('btnCancelStatus').addEventListener('click',clearStatus);
  $('btnDelExtra').addEventListener('click',delExtra);
  $('btnEditEvent').addEventListener('click',editEventFromSheet);
  $('btnResched').addEventListener('click',()=>{
    const key = $('btnResched').dataset.key; if(!key) return;
    const [d0, tag] = key.split('|');
    let time = '16:00', sid = null, kind = null;
    if(tag[0]==='s'){ const sl = S.slots.find(x=>'s'+x.id===tag); if(sl){ sid = sl.studentId; time = sl.time; } }
    if(tag[0]==='e'){ const ex = S.extras.find(x=>'e'+x.id===tag); if(ex){ sid = ex.studentId; time = ex.time; } }
    if(tag[0]==='r'||tag[0]==='p'){ const ev = S.events.find(x=>(x.kind==='reh'?'r':'p')+x.id===tag); if(ev) time = ev.time; }
    openTimePicker({mode:'datetime', title:'改期：选新日期与时间', time,
      onOk:(nd,nt)=>{
        if(tag[0]==='s' && sid){
          S.extras.push({ id:uid(), studentId:sid, date:nd, time:nt, end:'', note:'调课（原 '+d0+' '+time+'）', ts:Date.now() });
          S.log[key] = Object.assign({}, S.log[key], { status:'leave', note:'已改期至 '+nd, ts:Date.now() });
          save(); closeMask('maskLesson'); renderAll(); toast('改好啦，新时间见 ♪');
        } else {
          // 乐团日程原位改期
          const ev = S.events.find(x=>(x.kind==='reh'?'r':'p')+x.id===tag);
          if(ev){ ev.date = nd; ev.time = nt; ev.ts = Date.now(); }
          save(); closeMask('maskLesson'); renderAll(); toast('改好啦 ♪');
        }
      }});
  });
  $('btnConfirm').addEventListener('click',e=>{
    const key = e.currentTarget.dataset.key; if(!key) return;
    const tag = key.split('|')[1];
    if(tag[0]==='e'){ const ex = S.extras.find(x=>'e'+x.id===tag); if(ex) ex.confirmed = true; }
    save(); closeMask('maskLesson'); renderAll(); toast('已确认，稳了 ♡');
  });
  $('btnConfirm').addEventListener('click',e=>{
    const key = e.currentTarget.dataset.key; if(!key) return;
    const tag = key.split('|')[1];
    if(tag[0]==='e'){ const ex = S.extras.find(x=>'e'+x.id===tag); if(ex) ex.confirmed = true; }
    save(); closeMask('maskLesson'); renderAll(); toast('已确认，稳了 ♡');
  });
  $('btnResched').addEventListener('click',()=>{
    const key = currentLessonKey; if(!key) return;
    const [d0,tag] = key.split('|');
    const l = lessonsOn(d0).find(x=>x.key===key) || eventsOn(d0).find(x=>x.key===key);
    if(!l) return;
    openTimePicker({mode:'datetime', title:'改期：选择新日期与时间', time:l.time,
      onOk:(nd,nt)=>{
        if(tag[0]==='s'){
          const sl = S.slots.find(x=>'s'+x.id===tag);
          S.extras.push({ id:uid(), studentId:sl.studentId, date:nd, time:nt, end:sl.end||'', note:'调课（原 '+l.time+'）', ts:Date.now() });
          S.log[key] = Object.assign({}, S.log[key], { status:'leave', note:'已改期至 '+nd, ts:Date.now() });
        } else if(tag[0]==='e'){
          const ex = S.extras.find(x=>'e'+x.id===tag); ex.date = nd; ex.time = nt; ex.ts = Date.now();
        } else {
          const ev = S.events.find(x=>(x.kind==='reh'?'r':'p')+x.id===tag); ev.date = nd; ev.time = nt; ev.ts = Date.now();
        }
        save(); closeMask('maskLesson'); renderAll(); toast('改好啦，新时间见 ♪');
      }});
  });
  $('btnSaveExtra').addEventListener('click',saveExtra);
  $('btnSaveProfile').addEventListener('click',saveSettings);
  $('setBday').addEventListener('click',()=>{
    openTimePicker({mode:'date', title:'选择你的生日（月-日）',
      date: $('setBday').dataset.v ? '2026-'+$('setBday').dataset.v : null,
      onOk:(d)=>{ const md = d.slice(5); $('setBday').dataset.v = md; $('setBday').textContent = '🎂 ' + md; }});
  });
  $('exDT').addEventListener('click',()=>{
    openTimePicker({mode:'datetime', title:'选择日期与开始时间',
      date:$('exDT').dataset.date, time:$('exDT').dataset.time,
      onOk:(d,t)=>{ $('exDT').dataset.date=d; $('exDT').dataset.time=t;
        $('exDT').textContent = `📅 ${fmtCnDate(d)} ${t}`; }});
  });
  $('evDT').addEventListener('click',()=>{
    openTimePicker({mode:'datetime', title:'选择日期与开始时间',
      date:$('evDT').dataset.date, time:$('evDT').dataset.time,
      onOk:(d,t)=>{ $('evDT').dataset.date=d; $('evDT').dataset.time=t;
        $('evDT').textContent = `📅 ${fmtCnDate(d,false)} ${t}`; }});
  });
  $('evEndT').addEventListener('click',()=>{
    openTimePicker({mode:'time', title:'选择结束时间', time:$('evEndT').dataset.time,
      onOk:(t_)=>{ $('evEndT').dataset.time=t_; $('evEndT').textContent='🏁 '+(t_||'选填'); }});
  });
  $('exEndT').addEventListener('click',()=>{
    openTimePicker({mode:'time', title:'选择结束时间', time:$('exEndT').dataset.time,
      onOk:(t_)=>{ $('exEndT').dataset.time = t_; $('exEndT').textContent = '🏁 ' + (t_||'--:--'); }});
  });

  // 乐团：项目与日程
  $('btnAddProject').addEventListener('click',()=>openProject());
  $('btnSaveProject').addEventListener('click',saveProject);
  $('btnDelProject').addEventListener('click',deleteProject);
  $('btnSaveEvent').addEventListener('click',saveEvent);
  $('btnDelEvent').addEventListener('click',deleteEvent);
  $('projList').addEventListener('click',e=>{
    const row = e.target.closest('.evrow'); if(row){ openItemSheet(row.dataset.key); return; }
    const add = e.target.closest('[data-addev]');
    if(add){ const [pid,kind]=add.dataset.addev.split(':'); openEvent(null,{projectId:pid,kind}); return; }
    const ed = e.target.closest('[data-editproj]'); if(ed) openProject(ed.dataset.editproj);
  });

  // 主题
  $('themeGrid').addEventListener('click',e=>{ const c=e.target.closest('[data-theme]'); if(c) setTheme(c.dataset.theme); });
  $('wallGrid').addEventListener('click',e=>{ const c=e.target.closest('[data-wall]'); if(c) setWall(c.dataset.wall); });
  $('fontGrid').addEventListener('click',e=>{ const c=e.target.closest('[data-font]'); if(c) setFont(c.dataset.font); });

  // 音叉节拍器
  $('btnTuner').addEventListener('click',()=>{ $('tunerPane').style.display=''; $('metroPane').style.display='none'; metroStop(); openMask('maskTuner'); });
  $('btnMetro').addEventListener('click',()=>{ $('tunerPane').style.display='none'; $('metroPane').style.display=''; openMask('maskTuner'); });
  $('btnPlayA4').addEventListener('click',()=>{ tone(440,2.2); toast('A4 标准音 ♪ 听准了再对弦'); });
  document.querySelectorAll('[data-tone]').forEach(b=>b.addEventListener('click',()=>tone(+b.dataset.tone,2.0)));
  $('btnMetroToggle').addEventListener('click',()=>{ metroOn? metroStop() : metroStart(); });
  $('bpmMinus').addEventListener('click',()=>{ $('bpmVal').value = Math.max(30, (+$('bpmVal').value||72)-4); if(metroOn){ metroStop(); metroStart(); } });
  $('bpmPlus').addEventListener('click',()=>{ $('bpmVal').value = Math.min(220, (+$('bpmVal').value||72)+4); if(metroOn){ metroStop(); metroStart(); } });

  // 备份
  $('btnExport').addEventListener('click',()=>openBackup('export'));
  $('btnImport').addEventListener('click',()=>openBackup('import'));
  $('btnCopyCode').addEventListener('click',()=>{
    const t = $('backupText'); t.select();
    navigator.clipboard ? navigator.clipboard.writeText(t.value).then(()=>{ $('btnCopyCode').textContent='✓ 已复制'; setTimeout(()=>$('btnCopyCode').textContent='复制分享码',1500); }).catch(()=>document.execCommand('copy'))
      : document.execCommand('copy');
  });
  $('btnDoImport').addEventListener('click',doImport);

  // 一键导入课表
  $('btnOneImport').addEventListener('click', openOneImport);
  document.querySelectorAll('.itab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.itab').forEach(x=>x.classList.toggle('on', x===t));
    $('impTextPane').style.display = t.dataset.imp==='text' ? '' : 'none';
    $('impAiPane').style.display = t.dataset.imp==='ai' ? '' : 'none';
    $('impPreview').style.display='none';
  }));
  $('btnParseText').addEventListener('click',()=>{
    const txt = $('impText').value;
    if(!txt.trim()){ toast('先粘贴课表文字呀'); return; }
    const {items, skipped} = parseScheduleText(txt);
    showImportPreview(items, skipped);
  });
  $('btnAiParse').addEventListener('click', async ()=>{
    const f = $('impFile').files[0];
    if(!f){ toast('先选一张截图'); return; }
    const btn = $('btnAiParse'); btn.disabled = true; const old = btn.textContent; btn.textContent = '🤖 识别中…';
    try{
      const dataUrl = await new Promise((res,rej)=>{ const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(f); });
      const obj = await aiRecognizeDataUrl(dataUrl);
      const items = (obj.items||[]).map(it=>({ name: it.name||'(待补名字)', loc: it.loc||'',
        dow: DAY_MAP[(it.dow||'').replace('周','')] ?? null, time: it.time||'12:00', end: it.end||'', note: it.note||'' }));
      showImportPreview(items, obj.skipped||[]);
    }catch(e){ toast('识别失败：'+e.message); }
    btn.disabled = false; btn.textContent = old;
  });
  $('btnDoImportSched').addEventListener('click', confirmImport);

  $('btnBill').addEventListener('click', ()=>{
    const rows = billData();
    const pre = todayStr().slice(0,7);
    billText = `【秋秋课表】${pre.replace('-','年 ')}月账单\n`;
    let n=0, fee=0;
    rows.forEach(r=>{ n+=r.n; fee+=r.fee; billText += `${r.name}：${r.n}节` + (r.fee?` ¥${r.fee}`:'') + '\n'; });
    billText += `合计 ${n} 节` + (fee?` ¥${fee}`:'');
    openMask('maskBill');
    $('billBody').innerHTML = `<textarea readonly style="width:100%;min-height:180px;font-size:13px;font-family:inherit;border:2px solid var(--chip);border-radius:14px;padding:10px;color:var(--text);background:var(--card)">${esc(billText)}</textarea>`;
    $('billTitle').textContent = '📊 本月账单（可复制发家长）';
  });
  $('btnYear').addEventListener('click', openYear);

  // 自定义壁纸上传（压缩到宽1080以内，存本机）
  $('wallFile').addEventListener('change', async e=>{
    const f = e.target.files[0]; if(!f) return;
    btnBusy(e.target, true);
    try{
      const dataUrl = await new Promise((res,rej)=>{ const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(f); });
      S.meta.customWall = await compressSquare(dataUrl, 240); // 占位：马上替换为宽版压缩
      S.meta.customWall = await compressWide(dataUrl);
      S.meta.wall = 'custom'; save(); applyWall(); renderThemes();
      toast('自定义壁纸设置好啦 ♡');
    }catch(err){ toast('图片读取失败'); }
    btnBusy(e.target, false); e.target.value = '';
  });

  // 云同步
  $('btnSyncSave').addEventListener('click',()=>{
    S.meta.sync.url = $('syncUrl').value.trim();
    S.meta.sync.token = $('syncToken').value.trim();
    save(); syncFillForm(); toast('同步设置已保存 ♡');
    if(S.meta.sync.url && S.meta.sync.token){
      syncPull().then(m=>{ syncFillForm(); toast(m); }).catch(e=>toast('同步检查失败：'+e.message));
    }
  });
  $('btnSyncTest').addEventListener('click',async ()=>{
    const base = $('syncUrl').value.trim().replace(/\/+$/,'');
    const token = $('syncToken').value.trim();
    if(!base || !token){ toast('地址和同步码都要填哦'); return; }
    try{
      await syncApi(base, token, '/api/ping');
      $('syncHint').textContent = '✅ 连接成功！记得点「保存设置」，然后先「上传」一份';
    }catch(e){
      $('syncHint').textContent = e.status===401 ? '❌ 同步码不对，检查一下' : ('❌ 连不上：' + e.message);
    }
  });
  $('btnSyncUp').addEventListener('click',()=>syncPush(false).catch(e=>toast('上传失败：'+e.message)));
  $('btnSyncDown').addEventListener('click',()=>syncPull().then(m=>toast(m)).catch(e=>toast('下载失败：'+e.message)));

  // 生日彩蛋
  $('userAvFile').addEventListener('change', async e=>{
    const f = e.target.files[0]; if(!f) return;
    const btn = e.target; btn.disabled = true;
    try{
      const dataUrl = await new Promise((res,rej)=>{ const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(f); });
      S.meta.userAvatar = await compressSquare(dataUrl, 256); save();
      renderUserAv(); renderToday();
      toast('头像设置好啦 ♡');
    }catch(err){ toast('图片读取失败'); }
    btn.disabled = false; btn.value = '';
  });
  $('btnUserAvDel').addEventListener('click',()=>{
    delete S.meta.userAvatar; save(); renderUserAv(); renderToday(); toast('已恢复默认头像');
  });
  $('btnSplashClose').addEventListener('click',()=>{
    if($('splashSkip').checked){ S.meta.splashHideDate = todayStr(); save(); }
    $('splash').classList.remove('on');
  });

  // 每 30 秒刷新今日倒计时
  setInterval(()=>{ if($('page-today').classList.contains('on')) renderToday(); }, 30000);
}

/* ---------------- 启动 ---------------- */
function init(){
  S = load() || defaults();
  dedupeData();
  applyTheme(); applyWall(); bind(); renderAll(); syncFillForm();

  // 链接导入：index.html#d=分享码
  if(location.hash.startsWith('#d=')){
    try{
      const raw = b64d(decodeURIComponent(location.hash.slice(3)));
      openBackup('import', raw);
    }catch(e){}
  }
  setTimeout(checkSplash, 600);

  probeWalls();
  $('vHol').addEventListener('click', openHolidays);
  $('holStart').addEventListener('click', () => openTimePicker({mode:'date', title:'假期开始日期', date:holPick.start, onOk:d=>{ holPick.start=d; renderHolidays(); }}));
  $('holEnd').addEventListener('click', () => openTimePicker({mode:'date', title:'假期结束日期', date:holPick.end, onOk:d=>{ holPick.end=d; renderHolidays(); }}));
  $('btnAddHol').addEventListener('click', () => {
    if (!holPick.start || !holPick.end || holPick.end < holPick.start) { toast('先选好开始和结束日期'); return; }
    (S.holidays = S.holidays||[]).push({ start:holPick.start, end:holPick.end });
    save(); renderHolidays(); renderAll(); toast('假期安排好啦');
  });
  $('holList').addEventListener('click', e => {
    const rm = e.target.closest('.holrm'); if (!rm) return;
    S.holidays.splice(+rm.dataset.i, 1); save(); renderHolidays(); renderAll();
  });
  $('vHol').addEventListener('click',openHolidays);
  $('holStart').addEventListener('click',()=>openTimePicker({mode:'date', title:'假期开始日期', date:holPick.start, onOk:d=>{ holPick.start=d; renderHolidays(); }}));
  $('holEnd').addEventListener('click',()=>openTimePicker({mode:'date', title:'假期结束日期', date:holPick.end, onOk:d=>{ holPick.end=d; renderHolidays(); }}));
  $('btnAddHol').addEventListener('click',()=>{
    if(!holPick.start || !holPick.end || holPick.end < holPick.start){ toast('先选好开始和结束日期'); return; }
    (S.holidays = S.holidays||[]).push({ start:holPick.start, end:holPick.end });
    save(); renderHolidays(); renderAll(); toast('假期安排好啦 🏖️');
  });
  $('holList').addEventListener('click',e=>{
    const rm = e.target.closest('[data-i]'); if(!rm) return;
    S.holidays.splice(+rm.dataset.i,1); save(); renderHolidays(); renderAll();
  });

  // 已配置云同步：启动时自动拉取最新（后台静默）
  if(syncCfg().url && syncCfg().token){
    setTimeout(()=>{ syncPull().catch(()=>{}); }, 1500);
  }

  // 注册 Service Worker：正式域名（HTTPS）才注册；本机/局域网开发不缓存
  const host = location.hostname;
  const isLocal = host==='localhost' || host==='127.0.0.1' || /^(192|10)\./.test(host) || host.endsWith('.local');
  if('serviceWorker' in navigator && location.protocol.startsWith('http') && !isLocal){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  // 离线徽标
  const netEl = document.getElementById('netBadge');
  const netUpdate = ()=> netEl.classList.toggle('on', !navigator.onLine);
  netUpdate();
  window.addEventListener('online', ()=>{ netEl.classList.remove('on'); toast('网络回来啦 ☁️'); });
  window.addEventListener('offline', ()=>{ netEl.classList.add('on'); });
}
document.addEventListener('DOMContentLoaded', init);
