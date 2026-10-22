import json, urllib.request, os, sys, concurrent.futures as cf
names=sys.argv[1].split(',')
res=sys.argv[2] if len(sys.argv)>2 else '1k'
def fetch(n):
    out=[]
    meta=json.loads(urllib.request.urlopen(urllib.request.Request(f'https://api.polyhaven.com/files/{n}',headers={'User-Agent':'Mozilla/5.0'}),timeout=60).read())
    for key,fn in [('Diffuse','diff'),('nor_gl','norgl'),('arm','arm')]:
        url=meta[key][res]['jpg']['url']
        p=f'raw/{n}_{fn}_{res}.jpg'
        if not os.path.exists(p):
            data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=120).read()
            open(p,'wb').write(data)
        out.append((p,os.path.getsize(p)))
    return n,out
with cf.ThreadPoolExecutor(6) as ex:
    for n,out in ex.map(fetch,names): print(n, out)
