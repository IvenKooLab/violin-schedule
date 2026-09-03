import sys

s = open('app.js', encoding='utf-8').read()
old = "  $('fM5').parentNode.style.display = Pick.mode==='date' ? 'none' : '';" + chr(10)
assert old in s, 'anchor missing'
s = s.replace(old, '', 1)
open('app.js', 'w', encoding='utf-8').write(s)
print('removed')
