import io, sys

# ---------- index.html：周课表头部加假期按钮 + 假期弹层 ----------
h = open('app/index.html', encoding='utf-8').read()

old = """        <div class="vtoggle">
          <button id="vList" class="on" title="列表">📋</button>
          <button id="vGrid" title="网格">▦</button>
        </div>"""
new = """        <div class="vtoggle">
          <button id="vHol" title="假期">🏖️</button>
          <button id="vList" class="on" title="列表">📋</button>
          <button id="vGrid" title="网格">▦</button>
        </div>"""
if old not in h:
    print('FAIL weeknav'); sys.exit(1)
h = h.replace(old, new, 1)

old = '<!-- ===== 弹层：备份 ===== -->'
new = """    <!-- ===== 弹层：假期模式 ===== -->
    <div class="mask" id="maskHoliday">
      <div class="sheet" style="position:relative">
        <button class="close" data-close="maskHoliday">✕</button>
        <h3>🏖️ 假期模式</h3>
        <div class="frm">
          <div class="thint" style="text-align:left;margin-bottom:4px">假期范围内的课自动置灰放假，不计入课时和账本</div>
          <div id="holList"></div>
          <div style="display:flex;gap:9px;margin-top:6px">
            <button type="button" class="tfield" id="holStart">📅 开始日期</button>
            <button type="button" class="tfield" id="holEnd">📅 结束日期</button>
          </div>
          <button class="btn big" id="btnAddHol">＋ 添加这段假期</button>
        </div>
      </div>
    </div>

    <!-- ===== 弹层：备份 ===== -->"""
if old not in h:
    print('FAIL backup marker'); sys.exit(1)
h = h.replace(old, new, 1)
open('app/index.html', 'w', encoding='utf-8').write(h)
print('index ok')

# ---------- app.js：假期逻辑 ----------
j = open('app/js/app.js', encoding='utf-8').read()

old = "function renderThemes(){"
new = """let holPick = { start:null, end:null };
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
function renderThemes(){"""
if old not in j:
    print('FAIL renderThemes'); sys.exit(1)
j = j.replace(old, new, 1)

old = "  probeWalls();"
new = """  probeWalls();
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
  });"""
if old not in j:
    print('FAIL probeWalls init'); sys.exit(1)
j = j.replace(old, new, 1)
open('app/js/app.js', 'w', encoding='utf-8').write(j)
print('all holiday edits done')
