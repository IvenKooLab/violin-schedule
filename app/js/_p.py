import sys

j = open('app.js', encoding='utf-8').read()

old = "function openMask(id){ $(id).classList.add('on'); }"
new = """function openMask(id){
  // 任何弹层打开时强制收起开屏祝福（否则它 z-index 更高会把弹层盖死，确定键点不动）
  const sp = document.getElementById('splash');
  if (sp && sp.classList.contains('on')) { sp.classList.remove('on'); if (typeof S !== 'undefined' && S.meta) save(); }
  $(id).classList.add('on');
}"""
assert old in j, 'openMask anchor missing'
j = j.replace(old, new, 1)
open('app.js', 'w', encoding='utf-8').write(j)
print('openMask fixed')
