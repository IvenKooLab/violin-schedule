import re

j = open('app/js/app.js', encoding='utf-8').read()

# 整体替换 renderWeekGrid（内联样式版，自包含）
start = j.index('function renderWeekGrid(days, t){')
end = j.index('\nfunction ', start + 10)

clean = """function renderWeekGrid(days, t){
  const today = todayStr();
  const all = days.flatMap(d => itemsOn(d).map(l => Object.assign({}, l, {date:d})));
  if (!all.length) { $('weekGrid').innerHTML = '<div style="padding:30px 0;text-align:center;color:var(--sub)">本周暂无课程</div>'; return; }

  // 时间轴：最早开始 → 最晚结束
  let t0Min = 24*60, t1Min = 0;
  all.forEach(l => {
    t0Min = Math.min(t0Min, toMin(l.time));
    t1Min = Math.max(t1Min, itemEndMin(l));
  });
  t0Min = Math.max(0, Math.floor(t0Min/30)*30);
  t1Min = Math.min(1439, Math.ceil(t1Min/30)*30);
  const totalMin = Math.max(120, t1Min - t0Min);
  // 自适应一屏
  const avail = Math.max(340, window.innerHeight - 245);
  const PX = Math.min(1.3, Math.max(0.62, avail / totalMin));
  const gridH = Math.round(totalMin * PX);
  const yOf = mins => Math.round((mins - t0Min) * PX);

  // 头部星期行（内联样式）
  const gts = 'width:38px;flex-shrink:0';
  const dayH = days.map(d => {
    const on = d===today;
    return `<div style="flex:1;text-align:center;font-size:10.5px;${on?'color:var(--accent);font-weight:700':'color:var(--sub)'}"><b style="display:block;font-size:12px">${DOW[dowMon(d)].slice(1)}</b>${+d.slice(5,7)}/${+d.slice(8,10)}</div>`;
  }).join('');
  let html = `<div style="display:flex;margin:0 0 4px"><span style="${gts}"></span>${dayH}</div>`;

  // 网格主体（内联样式）：时间刻度列 + 七个日列
  html += `<div style="position:relative;height:${gridH}px">`;
  // 整点刻度线
  for (let m = Math.ceil(t0Min/60)*60; m <= t1Min; m += 60) {
    const y = Math.round((m - t0Min) * PX);
    html += `<div style="position:absolute;left:0;right:0;top:${y}px;border-top:1px dashed rgba(150,100,125,.25)"></div>`;
    html += `<div style="position:absolute;left:0;top:${y-7}px;width:36px;font-size:9.5px;color:var(--sub)">${pad(Math.floor(m/60))}:${pad(m%60)}</div>`;
  }
  // 七个日列
  html += '<div style="position:absolute;left:40px;right:0;top:0;bottom:0;display:flex">';
  html += days.map((d, di) => {
    const items = all.filter(l => l.date === d).sort((a,b)=>toMin(a.time)-toMin(b.time));
    const on = d===today;
    let col = `<div style="flex:1;position:relative;border-left:1px solid rgba(150,100,125,.18);height:100%;${on?'background:rgba(255,143,179,.10)':''}">`;
    // 重叠的课并排
    const ends = [];
    items.forEach(l => {
      const s = toMin(l.time), e = itemEndMin(l);
      let ci = ends.findIndex(ce => s >= ce);
      if (ci === -1) { ci = ends.length; ends.push(e); } else { ends[ci] = Math.max(ends[ci], e); }
      l.__col = ci;
    });
    const nCols = Math.max(1, ...items.map(l=>l.__col+1));
    const colW = 100 / nCols;
    const blocks = items.map(l => {
      const status = lessonStatus(l);
      const hol = l.hol && !status;
      const dim = status==='done' ? 'opacity:.55;text-decoration:line-through;' : (hol ? 'opacity:.4;' : '');
      const eMin = itemEndMin(l);
      const h = Math.max(20, Math.round((eMin - toMin(l.time)) * PX) - 2);
      const leftPct = (l.__col * colW).toFixed(1);
      const widthPct = colW.toFixed(1);
      let inner = '';
      if (l.kind==='reh' || l.kind==='perf'){
        const p = projectById(l.projectId) || {title:'?'};
        inner = `<b style="display:block;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.kind==='reh'?'🎼':'✨'}${esc(p.title.slice(0,6))}</b><i style="display:block;font-size:9px;opacity:.8">${l.time}${l.end?'-'+l.end:''}</i>`;
        return `<button data-key="${l.key}" style="position:absolute;top:${yOf(toMin(l.time))-t0Pad}px;height:${Math.max(20,Math.round((itemEndMin(l)-toMin(l.time))*PX)-3)}px;left:${(l.__col*colW).toFixed(1)}%;width:calc(${colW}% - 2px);border:none;border-radius:8px;padding:2px 4px;text-align:left;font-family:inherit;cursor:pointer;overflow:hidden;background:#ece3f8;color:#5d4a7d;${dim}">${inner}</button>`;
      }
      const st = itemStudent(l.studentId);
      const pend = l.kind==='extra' && !l.confirmed;
      inner = `<b style="display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(st.name)}${pend?' ⏳':''}</b><i style="display:block;font-size:9px;opacity:.85">${timeRange(l)}${l.loc?' 📍':''}</i>`;
      return `<button data-key="${l.key}" style="position:absolute;top:${yOf(toMin(l.time))-t0Pad}px;height:${Math.max(20,Math.round((itemEndMin(l)-toMin(l.time))*PX)-3)}px;left:${(l.__col*colW).toFixed(1)}%;width:calc(${colW}% - 2px);border:none;border-radius:8px;padding:2px 4px;text-align:left;font-family:inherit;cursor:pointer;overflow:hidden;background:${studentColor(l.studentId)};color:#5c3a4a;${dim}">${inner}</button>`;
    }).join('');
    return col + blocks + '</div>';
  }).join('');
  html += '</div></div>';

  $('weekGrid').innerHTML = html;
}
"""[0:]

j = j[:start] + clean + j[end:]
open('app/js/app.js', 'w', encoding='utf-8').write(j)
print('renderWeekGrid rewritten with inline styles')
