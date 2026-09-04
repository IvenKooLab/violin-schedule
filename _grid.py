import sys

j = open('app/js/app.js', encoding='utf-8').read()
fails = []

def rep(old, new, tag):
    global j
    if old not in j:
        fails.append(f'{tag}: {old[:70]}'); return
    j = j.replace(old, new, 1)

# ---------- 1) 主题卡用回三丽鸥原版壁纸图 ----------
rep("""const THEMES = [
  { id:'melody',  name:'美乐蒂', td:'粉色 · 甜系',   g:'linear-gradient(160deg,#ffe0eb,#ffb9d4)' },
  { id:'kitty',   name:'凯蒂猫', td:'红白 · 经典',   g:'linear-gradient(160deg,#fff3f4,#ffd6de)' },
  { id:'kuromi',  name:'库洛米', td:'暗紫 · 酷酷的', g:'linear-gradient(160deg,#3a3342,#5c4a78)' },
  { id:'cinnamo', name:'玉桂狗', td:'云朵蓝 · 软软的', g:'linear-gradient(160deg,#e7f3fe,#b8dbf8)' },
];""",
"""const THEMES = [
  { id:'melody',  name:'美乐蒂', td:'粉色 · 甜系',   img:'assets/wall_melody.jpg' },
  { id:'kitty',   name:'凯蒂猫', td:'红白 · 经典',   img:'assets/wall_kitty_tall.jpg' },
  { id:'kuromi',  name:'库洛米', td:'暗紫 · 酷酷的', img:'assets/wall_kuromi_star.jpg' },
  { id:'cinnamo', name:'玉桂狗', td:'云朵蓝 · 软软的', img:'assets/wall_cinnamo.jpg' },
];""", 'themes-img')

rep("""      <span class="img" style="background:${t.g};display:flex;align-items:center;justify-content:center"><span style="display:inline-block;width:44px;height:44px;transform:scale(.85);transform-origin:center">${MASCOTS[t.id]||''}</span></span>""",
"""      <span class="img"><img src="${t.img}" alt=""></span>""", 'theme-card-img')

# ---------- 2) 周网格：时长感知 + 背靠背无缝合并 ----------
start = j.index('function renderWeekGrid(days, t){')
end = j.index('\nfunction ', start + 10)
clean = """function renderWeekGrid(){
  const days = weekDates(weekOffset);
  const today = todayStr();
  const all = days.flatMap(d => itemsOn(d).map(l => Object.assign({}, l, {date:d})));
  if (!all.length) { $('weekGrid').innerHTML = '<div class="thint" style="padding:30px 0">本周暂无课程 🎐</div>'; return; }

  // 时间轴：最早开始 → 最晚结束
  let t0Min = 24*60, t1Min = 0;
  all.forEach(l => {
    t0Min = Math.min(t0Min, toMin(l.time));
    t1Min = Math.max(t1Min, itemEndMin(l));
  });
  t0Min = Math.floor(t0Min/30)*30;
  t1Min = Math.ceil(t1Min/30)*30;
  const totalMin = Math.max(120, t1Min - t0Min);
  // 自适应一屏：可用高度 / 总分钟，限幅
  const avail = Math.max(340, window.innerHeight - 250);
  const PX = Math.min(1.3, Math.max(0.6, avail / totalMin));
  const gridH = Math.round(totalMin * PX);
  const yOf = mins => Math.round((mins - t0Min) * PX);

  // 头部星期行
  let html = '<div class="ghead2"><span class="gts"></span>' + days.map(d =>
    `<span class="gdayh ${d===today?'today':''}"><b>${DOW[dowMon(d)].slice(1)}</b>${+d.slice(5,7)}/${+d.slice(8,10)}</span>`).join('') + '</div>';

  // 七列（今天高亮），块绝对定位
  html += '<div class="gwrap" style="height:' + gridH + 'px"><div class="gtl">';
  for (let m = Math.ceil(t0Min/60)*60; m <= t1Min; m += 60) {
    html += `<span class="gmark" style="top:${Math.round((m-t0Min)*PX)}px">${pad(Math.floor(m/60))}:${pad(m%60)}</span>`;
  }
  html += '</div>';
  html += days.map((d, di) => {
    const items = all.filter(l => l.date === d).sort((a,b)=>toMin(a.time)-toMin(b.time));
    const blocks = items.map(l => {
      const status = lessonStatus(l);
      const hol = l.hol && !status;
      const dim = status==='done' ? 'opacity:.55;text-decoration:line-through;' : (hol ? 'opacity:.45;' : '');
      const eMin = itemEndMin(l);
      const h = Math.max(22, Math.round((eMin - toMin(l.time)) * PX) - 2);
      let inner = '';
      if (l.kind==='reh' || l.kind==='perf'){
        const p = projectById(l.projectId) || {title:'?'};
        inner = `<b>${l.kind==='reh'?'🎼':'✨'}${esc(p.title.slice(0,6))}</b><i>${l.time}${l.end?'-'+l.end:''}</i>`;
        return `<button class="gblk orch ${status==='done'?'done':''}" data-key="${l.key}" style="top:${yOf(toMin(l.time))}px;height:${h}px;${dim}">${inner}</button>`;
      }
      const st = itemStudent(l.studentId);
      const pend = l.kind==='extra' && !l.confirmed;
      inner = `<b>${esc(st.name)}${pend?' ⏳':''}</b><i>${timeRange(l)}${l.loc?' 📍':''}</i>`;
      return `<button class="gblk ${pend?'pend':''} ${status==='done'?'done':''}" data-key="${l.key}" style="top:${yOf(toMin(l.time))}px;height:${h}px;background:${studentColor(l.studentId)};${dim}">${inner}</button>`;
    }).join('');
    return `<div class="gday ${d===today?'today':''}">${blocks}</div>`;
  }).join('');
  html += '</div>';

  $('weekGrid').innerHTML = html;
}
"""[0:]

j = j[:start] + clean + j[end:]

# ---------- 3) 假期徽标：grid 块里带 🏖️（可后续加强） ----------
# （已在 dim 逻辑中体现）

open('app/js/app.js', 'w', encoding='utf-8').write(j)
print('FAILS:', fails if fails else 'grid 重写完成 ✓')
