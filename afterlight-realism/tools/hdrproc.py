import numpy as np, sys, json, os
from PIL import Image
def read_hdr(path):
    f=open(path,'rb'); data=f.read(); f.close()
    i=0
    # header
    while True:
        j=data.index(b'\n',i); line=data[i:j]; i=j+1
        if line.strip()==b'': break
    j=data.index(b'\n',i); res=data[i:j].split(); i=j+1
    H=int(res[1]); W=int(res[3])
    buf=np.frombuffer(data,dtype=np.uint8,offset=i)
    out=np.zeros((H,W,4),np.uint8); p=0
    for y in range(H):
        if buf[p]==2 and buf[p+1]==2 and buf[p+2]<128:
            p+=4
            for c in range(4):
                x=0
                row=out[y,:,c]
                while x<W:
                    n=int(buf[p]); p+=1
                    if n>128:
                        n-=128; row[x:x+n]=buf[p]; p+=1
                    else:
                        row[x:x+n]=buf[p:p+n]; p+=n
                    x+=n
        else:
            raise Exception('flat hdr not supported')
    e=out[...,3].astype(np.int32)
    scale=np.where(e>0, np.ldexp(1.0, e-136), 0.0).astype(np.float32)
    return out[...,:3].astype(np.float32)*scale[...,None]
def to_rgbe(img):
    m=img.max(-1)
    e=np.where(m>1e-32, np.floor(np.log2(np.maximum(m,1e-32)))+1, -128).astype(np.int32)
    sc=np.ldexp(1.0,-e).astype(np.float32)*255.0/256.0*256.0/255.0
    rgb=np.clip(np.floor(img*np.ldexp(1.0,8-e)[...,None]),0,255)
    rgb=np.where((m>1e-32)[...,None],rgb,0)
    a=np.clip(e+128,0,255)
    return np.concatenate([rgb,a[...,None]],-1).astype(np.uint8)
def resize(img,w,h):
    out=np.zeros((h,w,3),np.float32)
    for c in range(3):
        out[...,c]=np.asarray(Image.fromarray(img[...,c]).resize((w,h),Image.BOX if img.shape[1]>w else Image.BILINEAR))
    return out
name, key = sys.argv[1], sys.argv[2]
out=sys.argv[3]
img=read_hdr(f'hdr/{name}_4k.hdr')
H,W,_=img.shape
lum=img@np.array([0.2126,0.7152,0.0722],np.float32)
up=lum[:H//2]
# sun / moon: brightest pixel in upper hemisphere (smoothed)
small=resize(img[:H//2],512,128)@np.array([0.2126,0.7152,0.0722],np.float32)
yy,xx=np.unravel_index(np.argmax(small),small.shape)
u=(xx+0.5)/512; v=(yy+0.5)/256
az=(u-0.5)*2*np.pi   # three.js equirect: u=0.5 looks along -Z? recorded as raw u
el=np.pi/2-v*np.pi
# normalise radiance: mean of upper hemisphere, cos-weighted, excluding sun outliers
med=float(np.median(up)); clipv=med*12
w=np.cos(np.linspace(np.pi/2,0,H//2,endpoint=False)+(np.pi/2/(H//2))*0.5)[:,None]
mean=float((np.minimum(up,clipv)*w).sum()/ (w.sum()*W))
norm=img/mean
# IBL: 256x128, sun clamped
ibl=resize(np.minimum(norm, (clipv/mean)),256,128)
Image.fromarray(to_rgbe(ibl),'RGBA').save(f'{out}/{key}_ibl.png',optimize=True)
# sky LDR: upper half 4096x1024 -> keep top 55% to include horizon band
band=int(H*0.55)
sky=norm[:band]
p99=float(np.percentile(np.minimum(sky,clipv/mean)@np.array([0.2126,0.7152,0.0722]),99.5))
k=0.92/p99
s=sky*k
# soft shoulder above 0.8
s=np.where(s>0.8, 0.8+0.2*np.tanh((s-0.8)/0.2), s)
srgb=np.where(s<=0.0031308, s*12.92, 1.055*np.power(np.maximum(s,0),1/2.4)-0.055)
Image.fromarray((np.clip(srgb,0,1)*255+0.5).astype(np.uint8)).resize((4096,int(4096*band/W)),Image.LANCZOS).save(f'{out}/{key}_sky.jpg',quality=86,optimize=True,progressive=True)
meta={'src':name,'sunU':round(float(u),5),'sunV':round(float(v),5),'sunEl':round(float(np.degrees(el)),2),'skyScale':round(float(k),5),'band':round(band/H,4),'median':med,'mean':mean}
print(json.dumps(meta))
json.dump(meta,open(f'{out}/{key}_meta.json','w'))
