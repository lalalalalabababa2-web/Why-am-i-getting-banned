import numpy as np, json
from PIL import Image
rng=np.random.default_rng(7)
N=512
out='/tmp/claude-0/-home-user-Why-am-i-getting-banned/92614c16-2979-5f3f-b3b2-defa727a05d4/scratchpad/work/realism/tex'
def periodic_noise(size, falloff, seed):
    r=np.random.default_rng(seed)
    f=np.fft.fftfreq(size)
    fx,fy=np.meshgrid(f,f)
    k=np.sqrt(fx**2+fy**2); k[0,0]=1
    spec=(r.normal(size=(size,size))+1j*r.normal(size=(size,size)))/k**falloff
    spec[0,0]=0
    n=np.real(np.fft.ifft2(spec))
    n=(n-n.mean())/n.std()
    return n
def scratches(size, count, seed, length=(0.02,0.18)):
    r=np.random.default_rng(seed)
    img=Image.new('L',(size,size),0)
    from PIL import ImageDraw
    d=ImageDraw.Draw(img)
    for _ in range(count):
        x,y=r.uniform(0,size,2); ang=r.normal(0.35,0.5); L=r.uniform(*length)*size
        w=1 if r.random()<0.85 else 2; v=int(r.uniform(90,255))
        for ox in (-size,0,size):
            for oy in (-size,0,size):
                d.line([(x+ox,y+oy),(x+ox+np.cos(ang)*L,y+oy+np.sin(ang)*L)],fill=v,width=w)
    return np.asarray(img).astype(np.float32)/255
def normal_from_height(h, strength):
    gx=(np.roll(h,-1,1)-np.roll(h,1,1))*0.5*strength
    gy=(np.roll(h,-1,0)-np.roll(h,1,0))*0.5*strength
    n=np.stack([-gx,gy,np.ones_like(h)],-1)
    n/=np.linalg.norm(n,axis=-1,keepdims=True)
    return n
def save(name, albedo_lin, nrm, rough):
    srgb=np.where(albedo_lin<=0.0031308,albedo_lin*12.92,1.055*np.power(np.clip(albedo_lin,0,1),1/2.4)-0.055)
    Image.fromarray((np.clip(srgb,0,1)*255+0.5).astype(np.uint8)).save(f'{out}/{name}_c.jpg',quality=88)
    nr=np.stack([(nrm[...,0]*0.5+0.5)*255,(nrm[...,1]*0.5+0.5)*255,np.clip(rough,0,1)*255],-1)
    Image.fromarray(nr.astype(np.uint8)).save(f'{out}/{name}_n.jpg',quality=92)
    return [round(float(x),4) for x in albedo_lin.reshape(-1,3).mean(0)]
stats=json.load(open(out+'/stats.json'))
# Parkerized / phosphate steel: fine crystalline grain, faint blotching, bright edge scratches.
grain=periodic_noise(N,0.15,1); blot=periodic_noise(N,1.6,2); sc=scratches(N,140,3)
base=0.045+0.010*blot+0.006*grain
albedo=np.stack([base*0.98,base*1.0,base*1.04],-1)+sc[...,None]*0.11
rough=0.58+0.06*grain-0.05*blot-0.32*sc
h=grain*0.35+blot*0.4-sc*1.2
stats['gunmetal']={'avg':save('gunmetal',albedo,normal_from_height(h,0.9),rough)}
# Glass-filled polymer with a light bead-blast stipple.
st=periodic_noise(N,0.35,4); bl=periodic_noise(N,1.8,5); sc2=scratches(N,60,6,(0.01,0.08))
base=0.032+0.004*bl+0.002*st
albedo=np.stack([base,base*1.0,base*1.02],-1)+sc2[...,None]*0.035
rough=0.74+0.05*st-0.12*sc2
h=st*0.8+bl*0.2-sc2*0.6
stats['polymer']={'avg':save('polymer',albedo,normal_from_height(h,1.6),rough)}
json.dump(stats,open(out+'/stats.json','w'),indent=1)
print(stats['gunmetal'],stats['polymer'])
