import json, sys, numpy as np
from PIL import Image
fam = {
 'tile':'floor_tiles_08','plaster':'plaster_grey_04','concrete':'dirty_concrete','brick':'brick_wall_001',
 'adobe':'concrete_wall_003','wood':'wood_table_worn','crate':'raw_plank_wall','pier':'weathered_brown_planks',
 'bark':'pine_bark','metal':'metal_plate_02','container':'container_side','fabric':'velour_velvet',
 'carpet':'dirty_carpet','sandbag':'hessian_230','asphalt':'asphalt_02','dirt':'dirt','grass':'sparse_grass',
 'sand':'coast_sand_01','rock':'rock_face_03'}
out=sys.argv[1]; stats={}
def lin(c): c=c/255.0; return np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
for f,n in fam.items():
    d=np.asarray(Image.open(f'raw/{n}_diff_1k.jpg').convert('RGB')).astype(np.float32)
    nm=np.asarray(Image.open(f'raw/{n}_norgl_1k.jpg').convert('RGB')).astype(np.float32)
    arm=np.asarray(Image.open(f'raw/{n}_arm_1k.jpg').convert('RGB')).astype(np.float32)
    ao=arm[...,0]/255.0
    # bake a little cavity AO into albedo (SSAO handles the large scale)
    d2=np.clip(d*(0.72+0.28*ao)[...,None],0,255)
    Image.fromarray(d2.astype(np.uint8)).save(f'{out}/{f}_c.jpg',quality=84,optimize=True,progressive=True)
    nr=np.stack([nm[...,0],nm[...,1],arm[...,1]],-1)
    Image.fromarray(nr.astype(np.uint8)).save(f'{out}/{f}_n.jpg',quality=88,optimize=True)
    L=lin(d2).reshape(-1,3).mean(0)
    stats[f]={'src':n,'avg':[round(float(x),4) for x in L],'rough':round(float(arm[...,1].mean()/255),3),
              'metal':round(float(arm[...,2].mean()/255),3)}
    print(f,n,stats[f])
json.dump(stats,open(f'{out}/stats.json','w'),indent=1)
