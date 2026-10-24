"""Build original BLACK HEM Display outlines and web fonts. No third-party font outlines."""
from pathlib import Path
import json
import unicodedata
import sys
import cv2
import numpy as np
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'sources/glyphs.json'

def contours(mask, transform=lambda x,y:(x,y), epsilon=.65):
    cs, hierarchy = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    result=[]
    if hierarchy is None: return result
    for i,c in enumerate(cs):
        if abs(cv2.contourArea(c)) < 3: continue
        points=cv2.approxPolyDP(c,epsilon,True).reshape(-1,2)
        points=[tuple(map(round,transform(float(x),float(y)))) for x,y in points]
        # OpenCV gives external clockwise in image coordinates; flipped y gives CCW.
        # TrueType requires external clockwise in font coordinates.
        result.append(list(reversed(points)))
    return result

def create_sources():
    im=cv2.imread(str(ROOT.parent/'black-hem-direction-01.png'),0)
    if im is None: raise RuntimeError('Missing approved identity board')
    mask=(im<80).astype('uint8')*255
    mask[:85]=0; mask[405:]=0; mask[:,:38]=0; mask[:,1072:]=0
    # Separate the closely fitted letters using seams between their ink shapes.
    yy,xx=np.indices(mask.shape)
    la=np.interp(yy,[85,160,235,300,405],[321,318,301,295,280])
    he=np.interp(yy,[85,280,300,405],[800,800,791,835])
    bounds=[np.full_like(yy,38),np.full_like(yy,184),la,np.full_like(yy,417),
            np.full_like(yy,518),np.full_like(yy,648),he,np.full_like(yy,912),np.full_like(yy,1072)]
    data={}
    for i,ch in enumerate('BLACKHEM'):
        m=np.where((xx>=bounds[i])&(xx<bounds[i+1]),mask,0).astype('uint8')
        n,labels,stats,_=cv2.connectedComponentsWithStats(m)
        # The seam may leave a tiny neighbouring fragment; retain main glyph only.
        largest=1+np.argmax(stats[1:,cv2.CC_STAT_AREA])
        m=np.where(labels==largest,255,0).astype('uint8')
        ink_x=np.where(m)[1]; left=int(ink_x.min())
        paths=contours(m,lambda x,y:((x-left)*3.5+28,(300-y)*3.5),.48)
        width=round((int(ink_x.max())-left)*3.5+70)
        data[ch]={'advance':width,'contours':paths,'origin':'approved board, isolated and traced'}

    # Extended alphabet: deliberately constructed outlines, not substituted font glyphs.
    # Coordinates are in font units. Raster union removes overlapping strokes before tracing.
    def drawing(width=590):
        return np.zeros((1400,900),np.uint8),width
    def poly(m,pts):
        cv2.fillPoly(m,[np.array([(round(x+100),round(1050-y)) for x,y in pts],np.int32)],255)
    def stem(m,x,top=700,bottom=0,w=112):
        poly(m,[(x-45,top+34),(x+w,top),(x+w, bottom+42),(x+w+38,bottom-100),(x,bottom),(x,top-55)])
    def bar(m,x1,x2,y,th=54):
        poly(m,[(x1,y+th),(x2+25,y+th+34),(x2,y-30),(x2-24,y),(x1,y)])
    def ring(m,outer,inner):
        poly(m,outer)
        cv2.fillPoly(m,[np.array([(round(x+100),round(1050-y)) for x,y in inner],np.int32)],0)
    for ch in 'DFGIJNOPQRSTUVWXYZ0123456789':
        m,w=drawing()
        if ch in 'DOPQR0689':
            ring(m,[(30,735),(380,700),(515,555),(515,135),(375,-10),(45,0),(75,70),(75,650)],
                 [(190,640),(330,625),(405,535),(405,165),(325,75),(190,65)])
            if ch in 'PR':
                m[1050-305:,:]=0
                stem(m,75)
                bar(m,170,375,335,48)
            if ch=='Q':poly(m,[(295,180),(405,130),(590,-170),(460,-65)])
            if ch=='R':poly(m,[(280,370),(385,345),(590,-150),(435,0)])
            if ch in '0689':
                if ch=='0': poly(m,[(210,100),(250,100),(385,600),(345,600)])
                if ch=='8':bar(m,150,435,330,50)
                if ch=='6':bar(m,150,430,325,55)
                if ch=='9':bar(m,150,430,330,55)
            if ch in 'OQ0':
                m[:]=0
                ring(m,[(265,735),(435,670),(530,510),(530,155),(400,5),(225,-35),(70,80),(35,260),(35,555),(160,700)],
                     [(215,625),(320,640),(405,550),(410,170),(330,75),(235,70),(155,175),(155,515)])
                if ch=='Q':poly(m,[(295,180),(405,130),(590,-170),(460,-65)])
                if ch=='0':poly(m,[(185,110),(225,100),(380,595),(340,610)])
            if ch=='6':
                m[:]=0
                poly(m,[(490,755),(440,600),(325,645),(215,570),(165,385),(315,435),(455,375),(520,245),(485,95),(365,-15),(190,-15),(65,115),(55,365),(130,580),(295,710)])
                cv2.fillPoly(m,[np.array([(x+100,1050-y) for x,y in [(180,290),(285,350),(375,300),(395,190),(340,75),(240,70),(175,155)]],np.int32)],0)
            if ch=='9':
                m[:]=0
                poly(m,[(90,-90),(155,100),(260,60),(365,145),(400,345),(255,285),(110,350),(45,480),(80,625),(200,725),(370,715),(495,585),(505,330),(430,100),(270,-25)])
                cv2.fillPoly(m,[np.array([(x+100,1050-y) for x,y in [(180,430),(280,365),(375,430),(385,540),(330,645),(230,645),(165,555)]],np.int32)],0)
        elif ch=='F':
            stem(m,70);bar(m,150,490,640);bar(m,150,390,330)
        elif ch=='G':
            poly(m,[(40,570),(175,700),(420,700),(525,770),(490,510),(390,625),(200,625),(165,530),(165,165),(240,60),(395,65),(395,290),(315,350),(525,350),(505,15),(205,-40),(70,100)])
        elif ch=='I':
            w=290;stem(m,85,w=115)
        elif ch=='J':
            w=450;stem(m,265,bottom=140)
            poly(m,[(265,200),(377,180),(365,55),(230,-60),(55,10),(15,185),(140,75),(230,70),(265,120)])
        elif ch=='N':
            stem(m,55,w=72);stem(m,440,w=65)
            poly(m,[(80,700),(210,700),(490,85),(490,-75),(365,55),(90,610)])
        elif ch=='S' or ch in '235':
            poly(m,[(520,755),(445,505),(390,630),(200,635),(155,550),(190,465),(420,350),(505,235),(490,90),(365,-15),(150,0),(35,-80),(70,200),(160,75),(330,70),(380,155),(350,235),(145,340),(55,465),(70,610),(200,710),(415,700)])
            if ch in '235':
                # Numeric variants have distinct terminals and middle structures.
                if ch=='2':
                    m[:]=0
                    poly(m,[(40,600),(180,710),(390,700),(510,565),(490,410),(180,70),(450,70),(530,165),(500,-45),(20,0),(55,105),(360,450),(375,550),(320,630),(185,630),(45,450)])
                if ch=='3':
                    m[:]=0
                    poly(m,[(50,735),(450,700),(500,560),(360,370),(480,300),(510,130),(390,-10),(150,0),(40,-80),(60,160),(175,70),(330,70),(390,155),(360,270),(220,335),(350,450),(380,550),(340,625),(170,630),(55,520)])
                if ch=='5':poly(m,[(55,700),(505,700),(470,595),(165,615),(155,395),(55,400)])
        elif ch=='T':
            stem(m,235);bar(m,30,520,640,60)
        elif ch=='U':
            stem(m,55,bottom=130);stem(m,430,bottom=80,w=65)
            poly(m,[(55,200),(167,180),(180,95),(270,40),(375,85),(430,180),(495,150),(465,10),(285,-55),(115,0),(55,100)])
        elif ch=='V':
            poly(m,[(0,750),(180,700),(330,105),(485,670),(460,700),(590,750),(325,-130),(255,0),(55,640)])
        elif ch=='W':
            w=810
            poly(m,[(0,745),(170,700),(270,120),(375,470),(360,640),(320,700),(490,700),(610,115),(740,670),(715,700),(825,750),(610,-95),(520,45),(420,350),(270,-95),(190,45),(45,650)])
        elif ch=='X':
            poly(m,[(0,740),(190,700),(590,-100),(415,0)])
            poly(m,[(470,700),(590,750),(95,-65),(35,-95)])
        elif ch=='Y':
            poly(m,[(0,740),(180,700),(325,365),(470,700),(580,750),(360,285),(360,45),(410,-95),(225,0),(250,280)])
        elif ch=='Z':
            poly(m,[(40,740),(520,700),(490,610),(155,75),(415,75),(535,190),(495,-75),(25,0),(55,100),(375,625),(155,625),(30,515)])
        elif ch=='1':
            w=350;stem(m,140,w=115);poly(m,[(20,580),(140,700),(205,645),(100,560)])
        elif ch=='4':
            poly(m,[(325,735),(450,700),(450,45),(495,-80),(325,0)])
            poly(m,[(325,700),(405,690),(135,265),(530,265),(510,180),(30,180),(50,290)])
        elif ch=='7':
            poly(m,[(40,745),(535,700),(505,600),(240,-95),(155,0),(390,620),(160,625),(25,505)])
        paths=contours(m,lambda x,y:(x-100,1050-y),.8)
        data[ch]={'advance':w+50,'contours':paths,'origin':'original extended construction'}

    # Punctuation and accent marks, designed with the same angular terminals.
    shapes={
        '.':(180,[[(40,0),(95,-18),(145,45),(90,95)]]),
        ',':(180,[[(45,0),(90,-20),(55,-125),(145,-15),(145,65),(90,95)]]),
        ':':(180,[[(40,0),(95,-18),(145,45),(90,95)],[(40,350),(95,332),(145,395),(90,445)]]),
        ';':(180,[[(45,0),(90,-20),(55,-125),(145,-15),(145,65),(90,95)],[(40,350),(95,332),(145,395),(90,445)]]),
        '-':(360,[[(40,290),(310,310),(285,355),(65,335)]]),
        '_':(550,[[(10,-110),(530,-110),(510,-155),(30,-155)]]),
        '/':(420,[[(20,-90),(325,735),(400,780),(80,-45)]]),
        '\\':(420,[[(20,780),(95,735),(400,-90),(340,-45)]]),
        '!':(210,[[(45,740),(175,700),(120,145),(90,125)],[(45,0),(100,-18),(150,45),(95,95)]]),
        '?':(530,[[(40,570),(150,700),(360,700),(465,570),(440,410),(295,310),(265,145),(205,130),(190,350),(330,460),(350,550),(300,625),(180,625),(50,475)],[(190,0),(245,-18),(295,45),(240,95)]]),
        "'":(180,[[(50,700),(145,715),(110,535),(70,510)]]),
        '"':(300,[[(50,700),(130,715),(95,535),(60,510)],[(180,700),(260,715),(225,535),(190,510)]]),
        '(':(300,[[(270,780),(150,600),(120,200),(230,-160),(100,-40),(35,230),(65,590),(165,740)]]),
        ')':(300,[[(30,780),(150,600),(180,200),(70,-160),(200,-40),(265,230),(235,590),(135,740)]]),
        '+':(520,[[(50,300),(470,300),(470,370),(50,370)],[(225,100),(295,100),(295,570),(225,570)]]),
        '=':(520,[[(50,210),(470,210),(470,280),(50,280)],[(50,420),(470,420),(470,490),(50,490)]]),
        '#':(650,[[(120,0),(185,0),(355,700),(290,700)],[(340,0),(405,0),(575,700),(510,700)],[(50,210),(600,210),(615,275),(65,275)],[(90,440),(640,440),(655,505),(105,505)]]),
    }
    for ch,(w,paths) in shapes.items(): data[ch]={'advance':w,'contours':paths,'origin':'original punctuation'}
    # Dollar sign shares S construction; currency abbreviation R$ is supported.
    data['$']={'advance':data['S']['advance'],'contours':data['S']['contours']+[[[270,-90],[310,-90],[310,790],[270,790]]],'origin':'S with currency stroke'}
    # Explicitly preserve the approved entire lockup as an optional ligature.
    full=np.zeros_like(mask);full[85:405,38:1072]=mask[85:405,38:1072]
    data['logo']={'advance':3650,'contours':contours(full,lambda x,y:((x-38)*3.5+28,(300-y)*3.5),.48),'origin':'complete approved wordmark'}
    SOURCE.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

if not SOURCE.exists() or '--refresh-sources' in sys.argv: create_sources()
data=json.loads(SOURCE.read_text())
glyphs={};metrics={};cmap={}
names={ch:('uni%04X'%ord(ch)) for ch in data if len(ch)==1}
names['logo']='BLACKHEM.logo'
empty=TTGlyphPen(None).glyph()
missing=TTGlyphPen(None)
for path in [[(60,0),(60,700),(520,700),(520,0)],[(120,60),(460,60),(460,640),(120,640)]]:
    missing.moveTo(path[0])
    for pt in path[1:]:missing.lineTo(pt)
    missing.closePath()
glyphs['.notdef']=missing.glyph();metrics['.notdef']=(600,60)
glyphs['space']=empty;metrics['space']=(255,0);cmap[32]='space';cmap[160]='space'
for ch,entry in data.items():
    pen=TTGlyphPen(None)
    for path in entry['contours']:
        if len(path)<3:continue
        pen.moveTo(tuple(path[0]))
        for pt in path[1:]:pen.lineTo(tuple(pt))
        pen.closePath()
    name=names[ch];glyphs[name]=pen.glyph()
    lsb=min((p[0] for c in entry['contours'] for p in c),default=0)
    metrics[name]=(entry['advance'],lsb)
    if len(ch)==1:
        cmap[ord(ch)]=name
        if ch.isupper():cmap[ord(ch.lower())]=name

# Latin accents are composite glyphs, including decomposed-input combining marks.
accents={
    '\u0301':[(0,0),(80,5),(210,135),(100,145)],
    '\u0300':[(120,0),(200,5),(95,145),(-15,135)],
    '\u0302':[(0,0),(70,5),(120,65),(175,5),(245,0),(120,145)],
    '\u0303':[(0,10),(45,100),(105,105),(175,55),(225,100),(265,100),(220,10),(160,10),(90,60),(40,10)],
    '\u0308':[(0,0),(65,0),(65,75),(0,75)],
    '\u0327':[(0,0),(60,0),(35,-55),(95,-90),(75,-160),(-20,-175),(-40,-125),(30,-115),(35,-95),(-20,-65)],
}
for mark,path in accents.items():
    name='uni%04X'%ord(mark);pen=TTGlyphPen(None)
    paths=[path]
    if mark=='\u0308':paths.append([(x+140,y) for x,y in path])
    shift_y=-30 if mark=='\u0327' else 800
    for points in paths:
        pen.moveTo((points[0][0],points[0][1]+shift_y))
        for x,y in points[1:]:pen.lineTo((x,y+shift_y))
        pen.closePath()
    glyphs[name]=pen.glyph();metrics[name]=(0,min(x for x,y in path));cmap[ord(mark)]=name

for cp in range(0xC0,0x180):
    ch=chr(cp);decomp=unicodedata.normalize('NFD',ch.upper())
    if len(decomp)!=2 or decomp[0] not in names or decomp[1] not in accents:continue
    base,mark=decomp
    name='uni%04X'%cp;pen=TTGlyphPen(glyphs)
    pen.addComponent(names[base],(1,0,0,1,0,0))
    x=round(data[base]['advance']/2-110)
    pen.addComponent('uni%04X'%ord(mark),(1,0,0,1,x,0))
    glyphs[name]=pen.glyph();metrics[name]=metrics[names[base]];cmap[cp]=name

# Common typographic punctuation aliases.
for cp,ch in {0x2010:'-',0x2011:'-',0x2013:'-',0x2014:'-',0x2018:"'",0x2019:"'",0x201C:'"',0x201D:'"'}.items():cmap[cp]=names[ch]

fb=FontBuilder(1000,isTTF=True)
fb.setupGlyphOrder(list(glyphs));fb.setupCharacterMap(cmap);fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=1100,descent=-450,lineGap=0)
fb.setupNameTable({'familyName':'Black Hem Display','styleName':'Regular','uniqueFontIdentifier':'BlackHemDisplay-0.100',
    'fullName':'Black Hem Display Regular','psName':'BlackHemDisplay-Regular','version':'Version 0.100',
    'copyright':'Copyright 2026 Eduardo Augusto Lima Bueno. All rights reserved.',
    'description':'Original uppercase display typeface developed from the approved BLACK HEM identity. Lowercase maps to uppercase forms. Prototype 0.1.',
    'licenseDescription':'Proprietary. Authorized for BLACK HEM projects. No third-party redistribution license granted.'})
fb.setupOS2(version=4,sTypoAscender=1100,sTypoDescender=-450,sTypoLineGap=0,usWinAscent=1100,usWinDescent=450,sCapHeight=700,sxHeight=700,usWeightClass=400,fsType=0,fsSelection=0xC0)
fb.setupPost();fb.setupMaxp()

features=['languagesystem DFLT dflt;','languagesystem latn dflt;','feature kern {']
for pair,val in {'AV':-60,'VA':-50,'WA':-40,'TA':-40,'AT':-35,'YA':-50,'AY':-45,'LA':-25,'LT':-20,'TO':-25,'VO':-20,'LY':-35,'PA':-35}.items():
    features.append(f'pos {names[pair[0]]} {names[pair[1]]} {val};')
features+=['} kern;','feature dlig { sub '+' '.join(names[c] if c!=' ' else 'space' for c in 'BLACK HEM')+' by BLACKHEM.logo; } dlig;']
# Combining marks have zero advance and explicit attachment to base glyphs.
for mark in accents:
    name='uni%04X'%ord(mark)
    anchor_y=0 if mark=='\u0327' else 800
    features.append(f'markClass {name} <anchor 110 {anchor_y}> @MC{ord(mark):04X};')
features.append('feature mark {')
for ch in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
    for mark in accents:
        y=-30 if mark=='\u0327' else 800
        features.append(f'pos base {names[ch]} <anchor {round(data[ch]["advance"]/2)} {y}> mark @MC{ord(mark):04X};')
features.append('} mark;')
addOpenTypeFeaturesFromString(fb.font,'\n'.join(features))
out=ROOT/'fonts';out.mkdir(exist_ok=True)
ttf=out/'black-hem-display-regular.ttf';fb.save(ttf)
font=TTFont(ttf);font.flavor='woff2';font.save(out/'black-hem-display-regular.woff2')

# SVG export keeps each glyph and the exact logo editable independently of font binaries.
svgdir=ROOT/'sources/svg';svgdir.mkdir(exist_ok=True)
for ch,entry in data.items():
    d=' '.join('M'+' L'.join(f'{x},{-y}' for x,y in contour)+' Z' for contour in entry['contours'])
    filename='BLACKHEM-logo' if ch=='logo' else f'uni{ord(ch):04X}'
    (svgdir/(filename+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -1100 {entry["advance"]+120} 1550"><path fill="currentColor" fill-rule="nonzero" d="{d}"/></svg>\n')
print(json.dumps({'glyphs':len(glyphs),'unicodeMappings':len(cmap),'files':{p.name:p.stat().st_size for p in out.iterdir()}},indent=2))
