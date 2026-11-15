import base64, glob, json, os
root = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: open(os.path.join(root, n)).read()
html, css, core, game = rd('index.html'), rd('style.css'), rd('core.js'), rd('game.js')
countries = rd('config.js') + rd('countries.js') + rd('analytics.js')
assets = {}
for f in sorted(glob.glob(os.path.join(root, 'assets', '**', '*.png'), recursive=True)):
    rel = os.path.relpath(f, os.path.join(root, 'assets')).replace(os.sep, '/')
    assets[rel] = 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
for f in sorted(glob.glob(os.path.join(root, 'assets', 'flags', '*.svg'))):
    rel = os.path.relpath(f, os.path.join(root, 'assets')).replace(os.sep, '/')
    assets[rel] = 'data:image/svg+xml;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
def swap(h, tag, body):
    a = h.index(f'<!--{tag}-->'); b = h.index(f'<!--/{tag}-->') + len(f'<!--/{tag}-->')
    return h[:a] + body + h[b:]
html = swap(html, 'INLINE_CSS', f'<style>{css}</style>')
html = swap(html, 'INLINE_ASSETS', '<script>window.__ASSETS=' + json.dumps(assets) + ';</script>')
html = swap(html, 'INLINE_JS', f'<script>{core}</script><script>{countries}</script><script>{game}</script>')
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
open(os.path.join(root, 'dist', 'city-crush.html'), 'w').write(html)
print('wrote dist/city-crush.html')

# Variant for the Claude artifact viewer: no doctype/html/head/body tags, same content.
import re
style = re.search(r'<style>.*?</style>', html, re.S).group(0)
fonts = re.search(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>', html).group(0)
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
open(os.path.join(root, 'dist', 'artifact.html'), 'w').write(
    '<title>City Crush</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + fonts + '\n' + style + '\n' + body)
print('wrote dist/artifact.html')
