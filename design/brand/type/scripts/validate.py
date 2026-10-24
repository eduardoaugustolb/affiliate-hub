from pathlib import Path
import json
import string
import unicodedata
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont, ImageChops, features

root=Path(__file__).resolve().parents[1]
ttf=root/'fonts/black-hem-display-regular.ttf'
woff=root/'fonts/black-hem-display-regular.woff2'
font=TTFont(ttf,checkChecksums=2); web=TTFont(woff,checkChecksums=2)
cmap=font.getBestCmap()
required=string.ascii_letters+string.digits+' ÁÀÂÃÉÊÍÓÔÕÚÜÇáàâãéêíóôõúüç.,:;!?/+-_=#()R$'
assert all(ord(c) in cmap for c in required)
assert cmap==web.getBestCmap()
for name in font.getGlyphOrder():
    a=font['glyf'][name];b=web['glyf'][name]
    assert a.getCoordinates(font['glyf'])[0]==b.getCoordinates(web['glyf'])[0],name
    assert font['hmtx'][name]==web['hmtx'][name],name
    if a.numberOfContours:
        a.recalcBounds(font['glyf'])
        assert a.yMax<=font['OS/2'].usWinAscent,(name,a.yMax)
        assert a.yMin>=-font['OS/2'].usWinDescent,(name,a.yMin)
assert all(font['glyf'][cmap[ord(c)]].numberOfContours for c in string.ascii_uppercase+string.digits)
for group in ['DO','O0','689','PR']:
    outlines=[str(font['glyf'][cmap[ord(c)]].getCoordinates(font['glyf'])[0]) for c in group]
    assert len(set(outlines))==len(group),group
assert features.check_feature('raqm'),'RAQM required to verify OpenType shaping'
f=ImageFont.truetype(str(ttf),180)
assert f.getlength('AV',features=['kern']) < f.getlength('AV',features=['-kern'])
assert abs(f.getlength('BLACK HEM',features=['dlig'])-3650*.18)<.1
for text in ['EDIÇÃO','ACESSÓRIOS','ÚLTIMA SELEÇÃO','À NOITE']:
    def render(t):
        im=Image.new('L',(2400,600));ImageDraw.Draw(im).text((50,70),t,font=f,fill=255)
        return im
    assert ImageChops.difference(render(text),render(unicodedata.normalize('NFD',text))).getbbox() is None,text

image=Image.new('RGB',(1800,1500),'#080808');d=ImageDraw.Draw(image)
ui=ImageFont.load_default(size=20)
d.text((70,40),'BLACK HEM DISPLAY / 0.1',font=ui,fill='#96938d')
rows=[('BLACK HEM',180,110),('ABCDEFGHIJKLM',100,400),('NOPQRSTUVWXYZ',100,590),('0123456789',120,800),('EDIÇÃO / COLEÇÃO / R$ 129,90',60,1080),('AFTER HOURS / BLACKHEM.COM.BR',60,1240)]
for text,size,y in rows:
    instance=ImageFont.truetype(str(ttf),size)
    d.text((70,y),text,font=instance,fill='#ece9e2',anchor='lt',features=['dlig'] if text=='BLACK HEM' else [])
image.save(root/'qa-specimen.png')
result={'status':'passed','glyphs':len(font.getGlyphOrder()),'unicodeMappings':len(cmap),
        'checks':['declared coverage','TTF/WOFF2 outline and metric parity','vertical clipping limits','nonempty alphabet and digits','distinct O/D and digits 0/6/8/9','OpenType kerning','optional original-logo ligature','NFC/NFD Portuguese accent rendering'],
        'browserVerification':False,'woff2Bytes':woff.stat().st_size,'ttfBytes':ttf.stat().st_size}
(root/'validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
