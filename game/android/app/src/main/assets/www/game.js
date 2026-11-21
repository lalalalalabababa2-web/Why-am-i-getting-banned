(()=>{var dc="170";var Ff=0,sh=1,Of=2;var Eo=1,Bf=2,ji=3,Cn=0,Ke=1,Ge=2,En=0,An=1,ei=2,rh=3,oh=4,Hf=5,$n=100,Vf=101,Gf=102,Wf=103,Xf=104,qf=200,Yf=201,Zf=202,$f=203,Za=204,$a=205,Jf=206,Kf=207,jf=208,Qf=209,td=210,ed=211,id=212,nd=213,sd=214,Ja=0,Ka=1,ja=2,Es=3,Qa=4,tl=5,el=6,il=7,pc=0,rd=1,od=2,Rn=0,ad=1,ld=2,cd=3,hd=4,ud=5,fd=6,dd=7;var du=300,As=301,Rs=302,nl=303,sl=304,Ao=306,rl=1e3,tn=1001,ol=1002,_i=1003,pd=1004;var wr=1005;var Ti=1006,ga=1007;var en=1008;var Di=1009,pu=1010,mu=1011,sr=1012,mc=1013,jn=1014,Oi=1015,hr=1016,gc=1017,xc=1018,Cs=1020,gu=35902,xu=1021,yu=1022,vi=1023,vu=1024,_u=1025,ws=1026,Ps=1027,yc=1028,vc=1029,Mu=1030,_c=1031;var Mc=1033,Jr=33776,Kr=33777,jr=33778,Qr=33779,al=35840,ll=35841,cl=35842,hl=35843,ul=36196,fl=37492,dl=37496,pl=37808,ml=37809,gl=37810,xl=37811,yl=37812,vl=37813,_l=37814,Ml=37815,bl=37816,wl=37817,Sl=37818,Tl=37819,El=37820,Al=37821,to=36492,Rl=36494,Cl=36495,bu=36283,Pl=36284,Il=36285,zl=36286;var eo=2300,Ll=2301,xa=2302,ah=2400,lh=2401,ch=2402;var md=3200,gd=3201;var wu=0,xd=1,Tn="",Ve="srgb",Us="srgb-linear",Ro="linear",ge="srgb";var as=7680;var hh=519,yd=512,vd=513,_d=514,Su=515,Md=516,bd=517,wd=518,Sd=519,uh=35044,di=35048;var fh="300 es",nn=2e3,io=2001,Pn=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;let i=this._listeners;return i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;let n=this._listeners[t];if(n!==void 0){let r=n.indexOf(e);r!==-1&&n.splice(r,1)}}dispatchEvent(t){if(this._listeners===void 0)return;let i=this._listeners[t.type];if(i!==void 0){t.target=this;let n=i.slice(0);for(let r=0,o=n.length;r<o;r++)n[r].call(this,t);t.target=null}}},$e=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var ya=Math.PI/180,Dl=180/Math.PI;function ur(){let s=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return($e[s&255]+$e[s>>8&255]+$e[s>>16&255]+$e[s>>24&255]+"-"+$e[t&255]+$e[t>>8&255]+"-"+$e[t>>16&15|64]+$e[t>>24&255]+"-"+$e[e&63|128]+$e[e>>8&255]+"-"+$e[e>>16&255]+$e[e>>24&255]+$e[i&255]+$e[i>>8&255]+$e[i>>16&255]+$e[i>>24&255]).toLowerCase()}function ci(s,t,e){return Math.max(t,Math.min(e,s))}function Td(s,t){return(s%t+t)%t}function va(s,t,e){return(1-e)*s+e*t}function Ys(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function li(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}var se=class s{constructor(t=0,e=0){s.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,i=this.y,n=t.elements;return this.x=n[0]*e+n[3]*i+n[6],this.y=n[1]*e+n[4]*i+n[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(e,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let i=this.dot(t)/e;return Math.acos(ci(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let i=Math.cos(e),n=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*i-o*n+t.x,this.y=r*n+o*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Xt=class s{constructor(t,e,i,n,r,o,a,l,c){s.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,n,r,o,a,l,c)}set(t,e,i,n,r,o,a,l,c){let h=this.elements;return h[0]=t,h[1]=n,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=i,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let i=t.elements,n=e.elements,r=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],h=i[4],f=i[7],d=i[2],u=i[5],x=i[8],y=n[0],g=n[3],p=n[6],_=n[1],M=n[4],v=n[7],I=n[2],T=n[5],E=n[8];return r[0]=o*y+a*_+l*I,r[3]=o*g+a*M+l*T,r[6]=o*p+a*v+l*E,r[1]=c*y+h*_+f*I,r[4]=c*g+h*M+f*T,r[7]=c*p+h*v+f*E,r[2]=d*y+u*_+x*I,r[5]=d*g+u*M+x*T,r[8]=d*p+u*v+x*E,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],i=t[1],n=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-i*r*h+i*a*l+n*r*c-n*o*l}invert(){let t=this.elements,e=t[0],i=t[1],n=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],f=h*o-a*c,d=a*l-h*r,u=c*r-o*l,x=e*f+i*d+n*u;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/x;return t[0]=f*y,t[1]=(n*c-h*i)*y,t[2]=(a*i-n*o)*y,t[3]=d*y,t[4]=(h*e-n*l)*y,t[5]=(n*r-a*e)*y,t[6]=u*y,t[7]=(i*l-c*e)*y,t[8]=(o*e-i*r)*y,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,n,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(i*l,i*c,-i*(l*o+c*a)+o+t,-n*c,n*l,-n*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(_a.makeScale(t,e)),this}rotate(t){return this.premultiply(_a.makeRotation(-t)),this}translate(t,e){return this.premultiply(_a.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,i=t.elements;for(let n=0;n<9;n++)if(e[n]!==i[n])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){let i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}},_a=new Xt;function Tu(s){for(let t=s.length-1;t>=0;--t)if(s[t]>=65535)return!0;return!1}function no(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function Ed(){let s=no("canvas");return s.style.display="block",s}var dh={};function er(s){s in dh||(dh[s]=!0,console.warn(s))}function Ad(s,t,e){return new Promise(function(i,n){function r(){switch(s.clientWaitSync(t,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:n();break;case s.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:i()}}setTimeout(r,e)})}function Rd(s){let t=s.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function Cd(s){let t=s.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}var ae={enabled:!0,workingColorSpace:Us,spaces:{},convert:function(s,t,e){return this.enabled===!1||t===e||!t||!e||(this.spaces[t].transfer===ge&&(s.r=sn(s.r),s.g=sn(s.g),s.b=sn(s.b)),this.spaces[t].primaries!==this.spaces[e].primaries&&(s.applyMatrix3(this.spaces[t].toXYZ),s.applyMatrix3(this.spaces[e].fromXYZ)),this.spaces[e].transfer===ge&&(s.r=Ss(s.r),s.g=Ss(s.g),s.b=Ss(s.b))),s},fromWorkingColorSpace:function(s,t){return this.convert(s,this.workingColorSpace,t)},toWorkingColorSpace:function(s,t){return this.convert(s,t,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Tn?Ro:this.spaces[s].transfer},getLuminanceCoefficients:function(s,t=this.workingColorSpace){return s.fromArray(this.spaces[t].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,t,e){return s.copy(this.spaces[t].toXYZ).multiply(this.spaces[e].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace}};function sn(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function Ss(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}var ph=[.64,.33,.3,.6,.15,.06],mh=[.2126,.7152,.0722],gh=[.3127,.329],xh=new Xt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),yh=new Xt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);ae.define({[Us]:{primaries:ph,whitePoint:gh,transfer:Ro,toXYZ:xh,fromXYZ:yh,luminanceCoefficients:mh,workingColorSpaceConfig:{unpackColorSpace:Ve},outputColorSpaceConfig:{drawingBufferColorSpace:Ve}},[Ve]:{primaries:ph,whitePoint:gh,transfer:ge,toXYZ:xh,fromXYZ:yh,luminanceCoefficients:mh,outputColorSpaceConfig:{drawingBufferColorSpace:Ve}}});var ls,Ul=class{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{ls===void 0&&(ls=no("canvas")),ls.width=t.width,ls.height=t.height;let i=ls.getContext("2d");t instanceof ImageData?i.putImageData(t,0,0):i.drawImage(t,0,0,t.width,t.height),e=ls}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=no("canvas");e.width=t.width,e.height=t.height;let i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);let n=i.getImageData(0,0,t.width,t.height),r=n.data;for(let o=0;o<r.length;o++)r[o]=sn(r[o]/255)*255;return i.putImageData(n,0,0),e}else if(t.data){let e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(sn(e[i]/255)*255):e[i]=sn(e[i]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},Pd=0,so=class{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Pd++}),this.uuid=ur(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let i={uuid:this.uuid,url:""},n=this.data;if(n!==null){let r;if(Array.isArray(n)){r=[];for(let o=0,a=n.length;o<a;o++)n[o].isDataTexture?r.push(Ma(n[o].image)):r.push(Ma(n[o]))}else r=Ma(n);i.url=r}return e||(t.images[this.uuid]=i),i}};function Ma(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?Ul.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var Id=0,hi=class s extends Pn{constructor(t=s.DEFAULT_IMAGE,e=s.DEFAULT_MAPPING,i=tn,n=tn,r=Ti,o=en,a=vi,l=Di,c=s.DEFAULT_ANISOTROPY,h=Tn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Id++}),this.uuid=ur(),this.name="",this.source=new so(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=n,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new se(0,0),this.repeat=new se(1,1),this.center=new se(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==du)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case rl:t.x=t.x-Math.floor(t.x);break;case tn:t.x=t.x<0?0:1;break;case ol:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case rl:t.y=t.y-Math.floor(t.y);break;case tn:t.y=t.y<0?0:1;break;case ol:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};hi.DEFAULT_IMAGE=null;hi.DEFAULT_MAPPING=du;hi.DEFAULT_ANISOTROPY=1;var Ee=class s{constructor(t=0,e=0,i=0,n=1){s.prototype.isVector4=!0,this.x=t,this.y=e,this.z=i,this.w=n}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,n){return this.x=t,this.y=e,this.z=i,this.w=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,i=this.y,n=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*i+o[8]*n+o[12]*r,this.y=o[1]*e+o[5]*i+o[9]*n+o[13]*r,this.z=o[2]*e+o[6]*i+o[10]*n+o[14]*r,this.w=o[3]*e+o[7]*i+o[11]*n+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,n,r,l=t.elements,c=l[0],h=l[4],f=l[8],d=l[1],u=l[5],x=l[9],y=l[2],g=l[6],p=l[10];if(Math.abs(h-d)<.01&&Math.abs(f-y)<.01&&Math.abs(x-g)<.01){if(Math.abs(h+d)<.1&&Math.abs(f+y)<.1&&Math.abs(x+g)<.1&&Math.abs(c+u+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let M=(c+1)/2,v=(u+1)/2,I=(p+1)/2,T=(h+d)/4,E=(f+y)/4,P=(x+g)/4;return M>v&&M>I?M<.01?(i=0,n=.707106781,r=.707106781):(i=Math.sqrt(M),n=T/i,r=E/i):v>I?v<.01?(i=.707106781,n=0,r=.707106781):(n=Math.sqrt(v),i=T/n,r=P/n):I<.01?(i=.707106781,n=.707106781,r=0):(r=Math.sqrt(I),i=E/r,n=P/r),this.set(i,n,r,e),this}let _=Math.sqrt((g-x)*(g-x)+(f-y)*(f-y)+(d-h)*(d-h));return Math.abs(_)<.001&&(_=1),this.x=(g-x)/_,this.y=(f-y)/_,this.z=(d-h)/_,this.w=Math.acos((c+u+p-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(e,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},kl=class extends Pn{constructor(t=1,e=1,i={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new Ee(0,0,t,e),this.scissorTest=!1,this.viewport=new Ee(0,0,t,e);let n={width:t,height:e,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ti,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);let r=new hi(n,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);r.flipY=!1,r.generateMipmaps=i.generateMipmaps,r.internalFormat=i.internalFormat,this.textures=[];let o=i.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let n=0,r=this.textures.length;n<r;n++)this.textures[n].image.width=t,this.textures[n].image.height=e,this.textures[n].image.depth=i;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let i=0,n=t.textures.length;i<n;i++)this.textures[i]=t.textures[i].clone(),this.textures[i].isRenderTargetTexture=!0;let e=Object.assign({},t.texture.image);return this.texture.source=new so(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},rn=class extends kl{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}},ro=class extends hi{constructor(t=null,e=1,i=1,n=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:n},this.magFilter=_i,this.minFilter=_i,this.wrapR=tn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var Nl=class extends hi{constructor(t=null,e=1,i=1,n=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:n},this.magFilter=_i,this.minFilter=_i,this.wrapR=tn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var We=class{constructor(t=0,e=0,i=0,n=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=n}static slerpFlat(t,e,i,n,r,o,a){let l=i[n+0],c=i[n+1],h=i[n+2],f=i[n+3],d=r[o+0],u=r[o+1],x=r[o+2],y=r[o+3];if(a===0){t[e+0]=l,t[e+1]=c,t[e+2]=h,t[e+3]=f;return}if(a===1){t[e+0]=d,t[e+1]=u,t[e+2]=x,t[e+3]=y;return}if(f!==y||l!==d||c!==u||h!==x){let g=1-a,p=l*d+c*u+h*x+f*y,_=p>=0?1:-1,M=1-p*p;if(M>Number.EPSILON){let I=Math.sqrt(M),T=Math.atan2(I,p*_);g=Math.sin(g*T)/I,a=Math.sin(a*T)/I}let v=a*_;if(l=l*g+d*v,c=c*g+u*v,h=h*g+x*v,f=f*g+y*v,g===1-a){let I=1/Math.sqrt(l*l+c*c+h*h+f*f);l*=I,c*=I,h*=I,f*=I}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=f}static multiplyQuaternionsFlat(t,e,i,n,r,o){let a=i[n],l=i[n+1],c=i[n+2],h=i[n+3],f=r[o],d=r[o+1],u=r[o+2],x=r[o+3];return t[e]=a*x+h*f+l*u-c*d,t[e+1]=l*x+h*d+c*f-a*u,t[e+2]=c*x+h*u+a*d-l*f,t[e+3]=h*x-a*f-l*d-c*u,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,n){return this._x=t,this._y=e,this._z=i,this._w=n,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let i=t._x,n=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(i/2),h=a(n/2),f=a(r/2),d=l(i/2),u=l(n/2),x=l(r/2);switch(o){case"XYZ":this._x=d*h*f+c*u*x,this._y=c*u*f-d*h*x,this._z=c*h*x+d*u*f,this._w=c*h*f-d*u*x;break;case"YXZ":this._x=d*h*f+c*u*x,this._y=c*u*f-d*h*x,this._z=c*h*x-d*u*f,this._w=c*h*f+d*u*x;break;case"ZXY":this._x=d*h*f-c*u*x,this._y=c*u*f+d*h*x,this._z=c*h*x+d*u*f,this._w=c*h*f-d*u*x;break;case"ZYX":this._x=d*h*f-c*u*x,this._y=c*u*f+d*h*x,this._z=c*h*x-d*u*f,this._w=c*h*f+d*u*x;break;case"YZX":this._x=d*h*f+c*u*x,this._y=c*u*f+d*h*x,this._z=c*h*x-d*u*f,this._w=c*h*f-d*u*x;break;case"XZY":this._x=d*h*f-c*u*x,this._y=c*u*f-d*h*x,this._z=c*h*x+d*u*f,this._w=c*h*f+d*u*x;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let i=e/2,n=Math.sin(i);return this._x=t.x*n,this._y=t.y*n,this._z=t.z*n,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,i=e[0],n=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],f=e[10],d=i+a+f;if(d>0){let u=.5/Math.sqrt(d+1);this._w=.25/u,this._x=(h-l)*u,this._y=(r-c)*u,this._z=(o-n)*u}else if(i>a&&i>f){let u=2*Math.sqrt(1+i-a-f);this._w=(h-l)/u,this._x=.25*u,this._y=(n+o)/u,this._z=(r+c)/u}else if(a>f){let u=2*Math.sqrt(1+a-i-f);this._w=(r-c)/u,this._x=(n+o)/u,this._y=.25*u,this._z=(l+h)/u}else{let u=2*Math.sqrt(1+f-i-a);this._w=(o-n)/u,this._x=(r+c)/u,this._y=(l+h)/u,this._z=.25*u}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<Number.EPSILON?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(ci(this.dot(t),-1,1)))}rotateTowards(t,e){let i=this.angleTo(t);if(i===0)return this;let n=Math.min(1,e/i);return this.slerp(t,n),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let i=t._x,n=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=i*h+o*a+n*c-r*l,this._y=n*h+o*l+r*a-i*c,this._z=r*h+o*c+i*l-n*a,this._w=o*h-i*a-n*l-r*c,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);let i=this._x,n=this._y,r=this._z,o=this._w,a=o*t._w+i*t._x+n*t._y+r*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=o,this._x=i,this._y=n,this._z=r,this;let l=1-a*a;if(l<=Number.EPSILON){let u=1-e;return this._w=u*o+e*this._w,this._x=u*i+e*this._x,this._y=u*n+e*this._y,this._z=u*r+e*this._z,this.normalize(),this}let c=Math.sqrt(l),h=Math.atan2(c,a),f=Math.sin((1-e)*h)/c,d=Math.sin(e*h)/c;return this._w=o*f+this._w*d,this._x=i*f+this._x*d,this._y=n*f+this._y*d,this._z=r*f+this._z*d,this._onChangeCallback(),this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),n=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(n*Math.sin(t),n*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},D=class s{constructor(t=0,e=0,i=0){s.prototype.isVector3=!0,this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(vh.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(vh.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,i=this.y,n=this.z,r=t.elements;return this.x=r[0]*e+r[3]*i+r[6]*n,this.y=r[1]*e+r[4]*i+r[7]*n,this.z=r[2]*e+r[5]*i+r[8]*n,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,i=this.y,n=this.z,r=t.elements,o=1/(r[3]*e+r[7]*i+r[11]*n+r[15]);return this.x=(r[0]*e+r[4]*i+r[8]*n+r[12])*o,this.y=(r[1]*e+r[5]*i+r[9]*n+r[13])*o,this.z=(r[2]*e+r[6]*i+r[10]*n+r[14])*o,this}applyQuaternion(t){let e=this.x,i=this.y,n=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*n-a*i),h=2*(a*e-r*n),f=2*(r*i-o*e);return this.x=e+l*c+o*f-a*h,this.y=i+l*h+a*c-r*f,this.z=n+l*f+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,i=this.y,n=this.z,r=t.elements;return this.x=r[0]*e+r[4]*i+r[8]*n,this.y=r[1]*e+r[5]*i+r[9]*n,this.z=r[2]*e+r[6]*i+r[10]*n,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(e,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let i=t.x,n=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=n*l-r*a,this.y=r*o-i*l,this.z=i*a-n*o,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return ba.copy(this).projectOnVector(t),this.sub(ba)}reflect(t){return this.sub(ba.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let i=this.dot(t)/e;return Math.acos(ci(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,i=this.y-t.y,n=this.z-t.z;return e*e+i*i+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){let n=Math.sin(e)*t;return this.x=n*Math.sin(i),this.y=Math.cos(e)*t,this.z=n*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),n=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=n,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},ba=new D,vh=new We,on=class{constructor(t=new D(1/0,1/0,1/0),e=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(Ii.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(Ii.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let i=Ii.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let i=t.geometry;if(i!==void 0){let r=i.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Ii):Ii.fromBufferAttribute(r,o),Ii.applyMatrix4(t.matrixWorld),this.expandByPoint(Ii);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Sr.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Sr.copy(i.boundingBox)),Sr.applyMatrix4(t.matrixWorld),this.union(Sr)}let n=t.children;for(let r=0,o=n.length;r<o;r++)this.expandByObject(n[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Ii),Ii.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Zs),Tr.subVectors(this.max,Zs),cs.subVectors(t.a,Zs),hs.subVectors(t.b,Zs),us.subVectors(t.c,Zs),vn.subVectors(hs,cs),_n.subVectors(us,hs),Vn.subVectors(cs,us);let e=[0,-vn.z,vn.y,0,-_n.z,_n.y,0,-Vn.z,Vn.y,vn.z,0,-vn.x,_n.z,0,-_n.x,Vn.z,0,-Vn.x,-vn.y,vn.x,0,-_n.y,_n.x,0,-Vn.y,Vn.x,0];return!wa(e,cs,hs,us,Tr)||(e=[1,0,0,0,1,0,0,0,1],!wa(e,cs,hs,us,Tr))?!1:(Er.crossVectors(vn,_n),e=[Er.x,Er.y,Er.z],wa(e,cs,hs,us,Tr))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Ii).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Ii).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Yi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Yi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Yi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Yi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Yi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Yi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Yi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Yi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Yi),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}},Yi=[new D,new D,new D,new D,new D,new D,new D,new D],Ii=new D,Sr=new on,cs=new D,hs=new D,us=new D,vn=new D,_n=new D,Vn=new D,Zs=new D,Tr=new D,Er=new D,Gn=new D;function wa(s,t,e,i,n){for(let r=0,o=s.length-3;r<=o;r+=3){Gn.fromArray(s,r);let a=n.x*Math.abs(Gn.x)+n.y*Math.abs(Gn.y)+n.z*Math.abs(Gn.z),l=t.dot(Gn),c=e.dot(Gn),h=i.dot(Gn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var zd=new on,$s=new D,Sa=new D,an=class{constructor(t=new D,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let i=this.center;e!==void 0?i.copy(e):zd.setFromPoints(t).getCenter(i);let n=0;for(let r=0,o=t.length;r<o;r++)n=Math.max(n,i.distanceToSquared(t[r]));return this.radius=Math.sqrt(n),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;$s.subVectors(t,this.center);let e=$s.lengthSq();if(e>this.radius*this.radius){let i=Math.sqrt(e),n=(i-this.radius)*.5;this.center.addScaledVector($s,n/i),this.radius+=n}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Sa.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint($s.copy(t.center).add(Sa)),this.expandByPoint($s.copy(t.center).sub(Sa))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}},Zi=new D,Ta=new D,Ar=new D,Mn=new D,Ea=new D,Rr=new D,Aa=new D,rr=class{constructor(t=new D,e=new D(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Zi)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Zi.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Zi.copy(this.origin).addScaledVector(this.direction,e),Zi.distanceToSquared(t))}distanceSqToSegment(t,e,i,n){Ta.copy(t).add(e).multiplyScalar(.5),Ar.copy(e).sub(t).normalize(),Mn.copy(this.origin).sub(Ta);let r=t.distanceTo(e)*.5,o=-this.direction.dot(Ar),a=Mn.dot(this.direction),l=-Mn.dot(Ar),c=Mn.lengthSq(),h=Math.abs(1-o*o),f,d,u,x;if(h>0)if(f=o*l-a,d=o*a-l,x=r*h,f>=0)if(d>=-x)if(d<=x){let y=1/h;f*=y,d*=y,u=f*(f+o*d+2*a)+d*(o*f+d+2*l)+c}else d=r,f=Math.max(0,-(o*d+a)),u=-f*f+d*(d+2*l)+c;else d=-r,f=Math.max(0,-(o*d+a)),u=-f*f+d*(d+2*l)+c;else d<=-x?(f=Math.max(0,-(-o*r+a)),d=f>0?-r:Math.min(Math.max(-r,-l),r),u=-f*f+d*(d+2*l)+c):d<=x?(f=0,d=Math.min(Math.max(-r,-l),r),u=d*(d+2*l)+c):(f=Math.max(0,-(o*r+a)),d=f>0?r:Math.min(Math.max(-r,-l),r),u=-f*f+d*(d+2*l)+c);else d=o>0?-r:r,f=Math.max(0,-(o*d+a)),u=-f*f+d*(d+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,f),n&&n.copy(Ta).addScaledVector(Ar,d),u}intersectSphere(t,e){Zi.subVectors(t.center,this.origin);let i=Zi.dot(this.direction),n=Zi.dot(Zi)-i*i,r=t.radius*t.radius;if(n>r)return null;let o=Math.sqrt(r-n),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){let i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,n,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,f=1/this.direction.z,d=this.origin;return c>=0?(i=(t.min.x-d.x)*c,n=(t.max.x-d.x)*c):(i=(t.max.x-d.x)*c,n=(t.min.x-d.x)*c),h>=0?(r=(t.min.y-d.y)*h,o=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,o=(t.min.y-d.y)*h),i>o||r>n||((r>i||isNaN(i))&&(i=r),(o<n||isNaN(n))&&(n=o),f>=0?(a=(t.min.z-d.z)*f,l=(t.max.z-d.z)*f):(a=(t.max.z-d.z)*f,l=(t.min.z-d.z)*f),i>l||a>n)||((a>i||i!==i)&&(i=a),(l<n||n!==n)&&(n=l),n<0)?null:this.at(i>=0?i:n,e)}intersectsBox(t){return this.intersectBox(t,Zi)!==null}intersectTriangle(t,e,i,n,r){Ea.subVectors(e,t),Rr.subVectors(i,t),Aa.crossVectors(Ea,Rr);let o=this.direction.dot(Aa),a;if(o>0){if(n)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Mn.subVectors(this.origin,t);let l=a*this.direction.dot(Rr.crossVectors(Mn,Rr));if(l<0)return null;let c=a*this.direction.dot(Ea.cross(Mn));if(c<0||l+c>o)return null;let h=-a*Mn.dot(Aa);return h<0?null:this.at(h/o,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Tt=class s{constructor(t,e,i,n,r,o,a,l,c,h,f,d,u,x,y,g){s.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,n,r,o,a,l,c,h,f,d,u,x,y,g)}set(t,e,i,n,r,o,a,l,c,h,f,d,u,x,y,g){let p=this.elements;return p[0]=t,p[4]=e,p[8]=i,p[12]=n,p[1]=r,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=h,p[10]=f,p[14]=d,p[3]=u,p[7]=x,p[11]=y,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new s().fromArray(this.elements)}copy(t){let e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){let e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){let e=this.elements,i=t.elements,n=1/fs.setFromMatrixColumn(t,0).length(),r=1/fs.setFromMatrixColumn(t,1).length(),o=1/fs.setFromMatrixColumn(t,2).length();return e[0]=i[0]*n,e[1]=i[1]*n,e[2]=i[2]*n,e[3]=0,e[4]=i[4]*r,e[5]=i[5]*r,e[6]=i[6]*r,e[7]=0,e[8]=i[8]*o,e[9]=i[9]*o,e[10]=i[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,i=t.x,n=t.y,r=t.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(n),c=Math.sin(n),h=Math.cos(r),f=Math.sin(r);if(t.order==="XYZ"){let d=o*h,u=o*f,x=a*h,y=a*f;e[0]=l*h,e[4]=-l*f,e[8]=c,e[1]=u+x*c,e[5]=d-y*c,e[9]=-a*l,e[2]=y-d*c,e[6]=x+u*c,e[10]=o*l}else if(t.order==="YXZ"){let d=l*h,u=l*f,x=c*h,y=c*f;e[0]=d+y*a,e[4]=x*a-u,e[8]=o*c,e[1]=o*f,e[5]=o*h,e[9]=-a,e[2]=u*a-x,e[6]=y+d*a,e[10]=o*l}else if(t.order==="ZXY"){let d=l*h,u=l*f,x=c*h,y=c*f;e[0]=d-y*a,e[4]=-o*f,e[8]=x+u*a,e[1]=u+x*a,e[5]=o*h,e[9]=y-d*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){let d=o*h,u=o*f,x=a*h,y=a*f;e[0]=l*h,e[4]=x*c-u,e[8]=d*c+y,e[1]=l*f,e[5]=y*c+d,e[9]=u*c-x,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){let d=o*l,u=o*c,x=a*l,y=a*c;e[0]=l*h,e[4]=y-d*f,e[8]=x*f+u,e[1]=f,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=u*f+x,e[10]=d-y*f}else if(t.order==="XZY"){let d=o*l,u=o*c,x=a*l,y=a*c;e[0]=l*h,e[4]=-f,e[8]=c*h,e[1]=d*f+y,e[5]=o*h,e[9]=u*f-x,e[2]=x*f-u,e[6]=a*h,e[10]=y*f+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Ld,t,Dd)}lookAt(t,e,i){let n=this.elements;return xi.subVectors(t,e),xi.lengthSq()===0&&(xi.z=1),xi.normalize(),bn.crossVectors(i,xi),bn.lengthSq()===0&&(Math.abs(i.z)===1?xi.x+=1e-4:xi.z+=1e-4,xi.normalize(),bn.crossVectors(i,xi)),bn.normalize(),Cr.crossVectors(xi,bn),n[0]=bn.x,n[4]=Cr.x,n[8]=xi.x,n[1]=bn.y,n[5]=Cr.y,n[9]=xi.y,n[2]=bn.z,n[6]=Cr.z,n[10]=xi.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let i=t.elements,n=e.elements,r=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],h=i[1],f=i[5],d=i[9],u=i[13],x=i[2],y=i[6],g=i[10],p=i[14],_=i[3],M=i[7],v=i[11],I=i[15],T=n[0],E=n[4],P=n[8],S=n[12],w=n[1],z=n[5],k=n[9],U=n[13],H=n[2],Y=n[6],W=n[10],ot=n[14],$=n[3],ut=n[7],gt=n[11],Rt=n[15];return r[0]=o*T+a*w+l*H+c*$,r[4]=o*E+a*z+l*Y+c*ut,r[8]=o*P+a*k+l*W+c*gt,r[12]=o*S+a*U+l*ot+c*Rt,r[1]=h*T+f*w+d*H+u*$,r[5]=h*E+f*z+d*Y+u*ut,r[9]=h*P+f*k+d*W+u*gt,r[13]=h*S+f*U+d*ot+u*Rt,r[2]=x*T+y*w+g*H+p*$,r[6]=x*E+y*z+g*Y+p*ut,r[10]=x*P+y*k+g*W+p*gt,r[14]=x*S+y*U+g*ot+p*Rt,r[3]=_*T+M*w+v*H+I*$,r[7]=_*E+M*z+v*Y+I*ut,r[11]=_*P+M*k+v*W+I*gt,r[15]=_*S+M*U+v*ot+I*Rt,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],i=t[4],n=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],f=t[6],d=t[10],u=t[14],x=t[3],y=t[7],g=t[11],p=t[15];return x*(+r*l*f-n*c*f-r*a*d+i*c*d+n*a*u-i*l*u)+y*(+e*l*u-e*c*d+r*o*d-n*o*u+n*c*h-r*l*h)+g*(+e*c*f-e*a*u-r*o*f+i*o*u+r*a*h-i*c*h)+p*(-n*a*h-e*l*f+e*a*d+n*o*f-i*o*d+i*l*h)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){let n=this.elements;return t.isVector3?(n[12]=t.x,n[13]=t.y,n[14]=t.z):(n[12]=t,n[13]=e,n[14]=i),this}invert(){let t=this.elements,e=t[0],i=t[1],n=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],f=t[9],d=t[10],u=t[11],x=t[12],y=t[13],g=t[14],p=t[15],_=f*g*c-y*d*c+y*l*u-a*g*u-f*l*p+a*d*p,M=x*d*c-h*g*c-x*l*u+o*g*u+h*l*p-o*d*p,v=h*y*c-x*f*c+x*a*u-o*y*u-h*a*p+o*f*p,I=x*f*l-h*y*l-x*a*d+o*y*d+h*a*g-o*f*g,T=e*_+i*M+n*v+r*I;if(T===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let E=1/T;return t[0]=_*E,t[1]=(y*d*r-f*g*r-y*n*u+i*g*u+f*n*p-i*d*p)*E,t[2]=(a*g*r-y*l*r+y*n*c-i*g*c-a*n*p+i*l*p)*E,t[3]=(f*l*r-a*d*r-f*n*c+i*d*c+a*n*u-i*l*u)*E,t[4]=M*E,t[5]=(h*g*r-x*d*r+x*n*u-e*g*u-h*n*p+e*d*p)*E,t[6]=(x*l*r-o*g*r-x*n*c+e*g*c+o*n*p-e*l*p)*E,t[7]=(o*d*r-h*l*r+h*n*c-e*d*c-o*n*u+e*l*u)*E,t[8]=v*E,t[9]=(x*f*r-h*y*r-x*i*u+e*y*u+h*i*p-e*f*p)*E,t[10]=(o*y*r-x*a*r+x*i*c-e*y*c-o*i*p+e*a*p)*E,t[11]=(h*a*r-o*f*r-h*i*c+e*f*c+o*i*u-e*a*u)*E,t[12]=I*E,t[13]=(h*y*n-x*f*n+x*i*d-e*y*d-h*i*g+e*f*g)*E,t[14]=(x*a*n-o*y*n-x*i*l+e*y*l+o*i*g-e*a*g)*E,t[15]=(o*f*n-h*a*n+h*i*l-e*f*l-o*i*d+e*a*d)*E,this}scale(t){let e=this.elements,i=t.x,n=t.y,r=t.z;return e[0]*=i,e[4]*=n,e[8]*=r,e[1]*=i,e[5]*=n,e[9]*=r,e[2]*=i,e[6]*=n,e[10]*=r,e[3]*=i,e[7]*=n,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],n=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,n))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let i=Math.cos(e),n=Math.sin(e),r=1-i,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+i,c*a-n*l,c*l+n*a,0,c*a+n*l,h*a+i,h*l-n*o,0,c*l-n*a,h*l+n*o,r*l*l+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,n,r,o){return this.set(1,i,r,0,t,1,o,0,e,n,1,0,0,0,0,1),this}compose(t,e,i){let n=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,f=a+a,d=r*c,u=r*h,x=r*f,y=o*h,g=o*f,p=a*f,_=l*c,M=l*h,v=l*f,I=i.x,T=i.y,E=i.z;return n[0]=(1-(y+p))*I,n[1]=(u+v)*I,n[2]=(x-M)*I,n[3]=0,n[4]=(u-v)*T,n[5]=(1-(d+p))*T,n[6]=(g+_)*T,n[7]=0,n[8]=(x+M)*E,n[9]=(g-_)*E,n[10]=(1-(d+y))*E,n[11]=0,n[12]=t.x,n[13]=t.y,n[14]=t.z,n[15]=1,this}decompose(t,e,i){let n=this.elements,r=fs.set(n[0],n[1],n[2]).length(),o=fs.set(n[4],n[5],n[6]).length(),a=fs.set(n[8],n[9],n[10]).length();this.determinant()<0&&(r=-r),t.x=n[12],t.y=n[13],t.z=n[14],zi.copy(this);let c=1/r,h=1/o,f=1/a;return zi.elements[0]*=c,zi.elements[1]*=c,zi.elements[2]*=c,zi.elements[4]*=h,zi.elements[5]*=h,zi.elements[6]*=h,zi.elements[8]*=f,zi.elements[9]*=f,zi.elements[10]*=f,e.setFromRotationMatrix(zi),i.x=r,i.y=o,i.z=a,this}makePerspective(t,e,i,n,r,o,a=nn){let l=this.elements,c=2*r/(e-t),h=2*r/(i-n),f=(e+t)/(e-t),d=(i+n)/(i-n),u,x;if(a===nn)u=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===io)u=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=c,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=h,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=u,l[14]=x,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,i,n,r,o,a=nn){let l=this.elements,c=1/(e-t),h=1/(i-n),f=1/(o-r),d=(e+t)*c,u=(i+n)*h,x,y;if(a===nn)x=(o+r)*f,y=-2*f;else if(a===io)x=r*f,y=-1*f;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-d,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-u,l[2]=0,l[6]=0,l[10]=y,l[14]=-x,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let e=this.elements,i=t.elements;for(let n=0;n<16;n++)if(e[n]!==i[n])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){let i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}},fs=new D,zi=new Tt,Ld=new D(0,0,0),Dd=new D(1,1,1),bn=new D,Cr=new D,xi=new D,_h=new Tt,Mh=new We,ui=class s{constructor(t=0,e=0,i=0,n=s.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=n}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,n=this._order){return this._x=t,this._y=e,this._z=i,this._order=n,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){let n=t.elements,r=n[0],o=n[4],a=n[8],l=n[1],c=n[5],h=n[9],f=n[2],d=n[6],u=n[10];switch(e){case"XYZ":this._y=Math.asin(ci(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,u),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-ci(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,u),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(ci(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-f,u),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-ci(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(d,u),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(ci(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(a,u));break;case"XZY":this._z=Math.asin(-ci(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,u),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return _h.makeRotationFromQuaternion(t),this.setFromRotationMatrix(_h,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Mh.setFromEuler(this),this.setFromQuaternion(Mh,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};ui.DEFAULT_ORDER="XYZ";var oo=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},Ud=0,bh=new D,ds=new We,$i=new Tt,Pr=new D,Js=new D,kd=new D,Nd=new We,wh=new D(1,0,0),Sh=new D(0,1,0),Th=new D(0,0,1),Eh={type:"added"},Fd={type:"removed"},ps={type:"childadded",child:null},Ra={type:"childremoved",child:null},Ue=class s extends Pn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Ud++}),this.uuid=ur(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=s.DEFAULT_UP.clone();let t=new D,e=new ui,i=new We,n=new D(1,1,1);function r(){i.setFromEuler(e,!1)}function o(){e.setFromQuaternion(i,void 0,!1)}e._onChange(r),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:n},modelViewMatrix:{value:new Tt},normalMatrix:{value:new Xt}}),this.matrix=new Tt,this.matrixWorld=new Tt,this.matrixAutoUpdate=s.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=s.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new oo,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return ds.setFromAxisAngle(t,e),this.quaternion.multiply(ds),this}rotateOnWorldAxis(t,e){return ds.setFromAxisAngle(t,e),this.quaternion.premultiply(ds),this}rotateX(t){return this.rotateOnAxis(wh,t)}rotateY(t){return this.rotateOnAxis(Sh,t)}rotateZ(t){return this.rotateOnAxis(Th,t)}translateOnAxis(t,e){return bh.copy(t).applyQuaternion(this.quaternion),this.position.add(bh.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(wh,t)}translateY(t){return this.translateOnAxis(Sh,t)}translateZ(t){return this.translateOnAxis(Th,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4($i.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?Pr.copy(t):Pr.set(t,e,i);let n=this.parent;this.updateWorldMatrix(!0,!1),Js.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?$i.lookAt(Js,Pr,this.up):$i.lookAt(Pr,Js,this.up),this.quaternion.setFromRotationMatrix($i),n&&($i.extractRotation(n.matrixWorld),ds.setFromRotationMatrix($i),this.quaternion.premultiply(ds.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Eh),ps.child=t,this.dispatchEvent(ps),ps.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Fd),Ra.child=t,this.dispatchEvent(Ra),Ra.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),$i.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),$i.multiply(t.parent.matrixWorld)),t.applyMatrix4($i),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Eh),ps.child=t,this.dispatchEvent(ps),ps.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,n=this.children.length;i<n;i++){let o=this.children[i].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);let n=this.children;for(let r=0,o=n.length;r<o;r++)n[r].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Js,t,kd),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Js,Nd,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);let e=this.children;for(let i=0,n=e.length;i<n;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let i=0,n=e.length;i<n;i++)e[i].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let i=0,n=e.length;i<n;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e){let i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){let n=this.children;for(let r=0,o=n.length;r<o;r++)n[r].updateWorldMatrix(!1,!0)}}toJSON(t){let e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});let n={};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.castShadow===!0&&(n.castShadow=!0),this.receiveShadow===!0&&(n.receiveShadow=!0),this.visible===!1&&(n.visible=!1),this.frustumCulled===!1&&(n.frustumCulled=!1),this.renderOrder!==0&&(n.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(n.userData=this.userData),n.layers=this.layers.mask,n.matrix=this.matrix.toArray(),n.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(n.matrixAutoUpdate=!1),this.isInstancedMesh&&(n.type="InstancedMesh",n.count=this.count,n.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(n.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(n.type="BatchedMesh",n.perObjectFrustumCulled=this.perObjectFrustumCulled,n.sortObjects=this.sortObjects,n.drawRanges=this._drawRanges,n.reservedRanges=this._reservedRanges,n.visibility=this._visibility,n.active=this._active,n.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),n.maxInstanceCount=this._maxInstanceCount,n.maxVertexCount=this._maxVertexCount,n.maxIndexCount=this._maxIndexCount,n.geometryInitialized=this._geometryInitialized,n.geometryCount=this._geometryCount,n.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(n.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(n.boundingSphere={center:n.boundingSphere.center.toArray(),radius:n.boundingSphere.radius}),this.boundingBox!==null&&(n.boundingBox={min:n.boundingBox.min.toArray(),max:n.boundingBox.max.toArray()}));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?n.background=this.background.toJSON():this.background.isTexture&&(n.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(n.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){n.geometry=r(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let f=l[c];r(t.shapes,f)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(n.bindMode=this.bindMode,n.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),n.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));n.material=a}else n.material=r(t.materials,this.material);if(this.children.length>0){n.children=[];for(let a=0;a<this.children.length;a++)n.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){n.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];n.animations.push(r(t.animations,l))}}if(e){let a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),f=o(t.shapes),d=o(t.skeletons),u=o(t.animations),x=o(t.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),h.length>0&&(i.images=h),f.length>0&&(i.shapes=f),d.length>0&&(i.skeletons=d),u.length>0&&(i.animations=u),x.length>0&&(i.nodes=x)}return i.object=n,i;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){let n=t.children[i];this.add(n.clone())}return this}};Ue.DEFAULT_UP=new D(0,1,0);Ue.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ue.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Li=new D,Ji=new D,Ca=new D,Ki=new D,ms=new D,gs=new D,Ah=new D,Pa=new D,Ia=new D,za=new D,La=new Ee,Da=new Ee,Ua=new Ee,Jn=class s{constructor(t=new D,e=new D,i=new D){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,n){n.subVectors(i,e),Li.subVectors(t,e),n.cross(Li);let r=n.lengthSq();return r>0?n.multiplyScalar(1/Math.sqrt(r)):n.set(0,0,0)}static getBarycoord(t,e,i,n,r){Li.subVectors(n,e),Ji.subVectors(i,e),Ca.subVectors(t,e);let o=Li.dot(Li),a=Li.dot(Ji),l=Li.dot(Ca),c=Ji.dot(Ji),h=Ji.dot(Ca),f=o*c-a*a;if(f===0)return r.set(0,0,0),null;let d=1/f,u=(c*l-a*h)*d,x=(o*h-a*l)*d;return r.set(1-u-x,x,u)}static containsPoint(t,e,i,n){return this.getBarycoord(t,e,i,n,Ki)===null?!1:Ki.x>=0&&Ki.y>=0&&Ki.x+Ki.y<=1}static getInterpolation(t,e,i,n,r,o,a,l){return this.getBarycoord(t,e,i,n,Ki)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Ki.x),l.addScaledVector(o,Ki.y),l.addScaledVector(a,Ki.z),l)}static getInterpolatedAttribute(t,e,i,n,r,o){return La.setScalar(0),Da.setScalar(0),Ua.setScalar(0),La.fromBufferAttribute(t,e),Da.fromBufferAttribute(t,i),Ua.fromBufferAttribute(t,n),o.setScalar(0),o.addScaledVector(La,r.x),o.addScaledVector(Da,r.y),o.addScaledVector(Ua,r.z),o}static isFrontFacing(t,e,i,n){return Li.subVectors(i,e),Ji.subVectors(t,e),Li.cross(Ji).dot(n)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,n){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[n]),this}setFromAttributeAndIndices(t,e,i,n){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,n),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Li.subVectors(this.c,this.b),Ji.subVectors(this.a,this.b),Li.cross(Ji).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return s.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return s.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,n,r){return s.getInterpolation(t,this.a,this.b,this.c,e,i,n,r)}containsPoint(t){return s.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return s.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let i=this.a,n=this.b,r=this.c,o,a;ms.subVectors(n,i),gs.subVectors(r,i),Pa.subVectors(t,i);let l=ms.dot(Pa),c=gs.dot(Pa);if(l<=0&&c<=0)return e.copy(i);Ia.subVectors(t,n);let h=ms.dot(Ia),f=gs.dot(Ia);if(h>=0&&f<=h)return e.copy(n);let d=l*f-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(i).addScaledVector(ms,o);za.subVectors(t,r);let u=ms.dot(za),x=gs.dot(za);if(x>=0&&u<=x)return e.copy(r);let y=u*c-l*x;if(y<=0&&c>=0&&x<=0)return a=c/(c-x),e.copy(i).addScaledVector(gs,a);let g=h*x-u*f;if(g<=0&&f-h>=0&&u-x>=0)return Ah.subVectors(r,n),a=(f-h)/(f-h+(u-x)),e.copy(n).addScaledVector(Ah,a);let p=1/(g+y+d);return o=y*p,a=d*p,e.copy(i).addScaledVector(ms,o).addScaledVector(gs,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},Eu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},wn={h:0,s:0,l:0},Ir={h:0,s:0,l:0};function ka(s,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?s+(t-s)*6*e:e<1/2?t:e<2/3?s+(t-s)*6*(2/3-e):s}var ct=class{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){let n=t;n&&n.isColor?this.copy(n):typeof n=="number"?this.setHex(n):typeof n=="string"&&this.setStyle(n)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Ve){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ae.toWorkingColorSpace(this,e),this}setRGB(t,e,i,n=ae.workingColorSpace){return this.r=t,this.g=e,this.b=i,ae.toWorkingColorSpace(this,n),this}setHSL(t,e,i,n=ae.workingColorSpace){if(t=Td(t,1),e=ci(e,0,1),i=ci(i,0,1),e===0)this.r=this.g=this.b=i;else{let r=i<=.5?i*(1+e):i+e-i*e,o=2*i-r;this.r=ka(o,r,t+1/3),this.g=ka(o,r,t),this.b=ka(o,r,t-1/3)}return ae.toWorkingColorSpace(this,n),this}setStyle(t,e=Ve){function i(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let n;if(n=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,o=n[1],a=n[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(n=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=n[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Ve){let i=Eu[t.toLowerCase()];return i!==void 0?this.setHex(i,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=sn(t.r),this.g=sn(t.g),this.b=sn(t.b),this}copyLinearToSRGB(t){return this.r=Ss(t.r),this.g=Ss(t.g),this.b=Ss(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Ve){return ae.fromWorkingColorSpace(Je.copy(this),t),Math.round(ci(Je.r*255,0,255))*65536+Math.round(ci(Je.g*255,0,255))*256+Math.round(ci(Je.b*255,0,255))}getHexString(t=Ve){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=ae.workingColorSpace){ae.fromWorkingColorSpace(Je.copy(this),e);let i=Je.r,n=Je.g,r=Je.b,o=Math.max(i,n,r),a=Math.min(i,n,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let f=o-a;switch(c=h<=.5?f/(o+a):f/(2-o-a),o){case i:l=(n-r)/f+(n<r?6:0);break;case n:l=(r-i)/f+2;break;case r:l=(i-n)/f+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=ae.workingColorSpace){return ae.fromWorkingColorSpace(Je.copy(this),e),t.r=Je.r,t.g=Je.g,t.b=Je.b,t}getStyle(t=Ve){ae.fromWorkingColorSpace(Je.copy(this),t);let e=Je.r,i=Je.g,n=Je.b;return t!==Ve?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${n.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(n*255)})`}offsetHSL(t,e,i){return this.getHSL(wn),this.setHSL(wn.h+t,wn.s+e,wn.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(wn),t.getHSL(Ir);let i=va(wn.h,Ir.h,e),n=va(wn.s,Ir.s,e),r=va(wn.l,Ir.l,e);return this.setHSL(i,n,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,i=this.g,n=this.b,r=t.elements;return this.r=r[0]*e+r[3]*i+r[6]*n,this.g=r[1]*e+r[4]*i+r[7]*n,this.b=r[2]*e+r[5]*i+r[8]*n,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Je=new ct;ct.NAMES=Eu;var Od=0,ln=class extends Pn{static get type(){return"Material"}get type(){return this.constructor.type}set type(t){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Od++}),this.uuid=ur(),this.name="",this.blending=An,this.side=Cn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Za,this.blendDst=$a,this.blendEquation=$n,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new ct(0,0,0),this.blendAlpha=0,this.depthFunc=Es,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=hh,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=as,this.stencilZFail=as,this.stencilZPass=as,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let i=t[e];if(i===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}let n=this[e];if(n===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}n&&n.isColor?n.set(i):n&&n.isVector3&&i&&i.isVector3?n.copy(i):this[e]=i}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==An&&(i.blending=this.blending),this.side!==Cn&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Za&&(i.blendSrc=this.blendSrc),this.blendDst!==$a&&(i.blendDst=this.blendDst),this.blendEquation!==$n&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Es&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==hh&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==as&&(i.stencilFail=this.stencilFail),this.stencilZFail!==as&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==as&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function n(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(e){let r=n(t.textures),o=n(t.images);r.length>0&&(i.textures=r),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,i=null;if(e!==null){let n=e.length;i=new Array(n);for(let r=0;r!==n;++r)i[r]=e[r].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}},Oe=class extends ln{static get type(){return"MeshBasicMaterial"}constructor(t){super(),this.isMeshBasicMaterial=!0,this.color=new ct(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ui,this.combine=pc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}};var Le=new D,zr=new se,ne=class{constructor(t,e,i=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=uh,this.updateRanges=[],this.gpuType=Oi,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let n=0,r=this.itemSize;n<r;n++)this.array[t+n]=e.array[i+n];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)zr.fromBufferAttribute(this,e),zr.applyMatrix3(t),this.setXY(e,zr.x,zr.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)Le.fromBufferAttribute(this,e),Le.applyMatrix3(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)Le.fromBufferAttribute(this,e),Le.applyMatrix4(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)Le.fromBufferAttribute(this,e),Le.applyNormalMatrix(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)Le.fromBufferAttribute(this,e),Le.transformDirection(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=Ys(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=li(i,this.array)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Ys(e,this.array)),e}setX(t,e){return this.normalized&&(e=li(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Ys(e,this.array)),e}setY(t,e){return this.normalized&&(e=li(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Ys(e,this.array)),e}setZ(t,e){return this.normalized&&(e=li(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Ys(e,this.array)),e}setW(t,e){return this.normalized&&(e=li(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=li(e,this.array),i=li(i,this.array)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,n){return t*=this.itemSize,this.normalized&&(e=li(e,this.array),i=li(i,this.array),n=li(n,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=n,this}setXYZW(t,e,i,n,r){return t*=this.itemSize,this.normalized&&(e=li(e,this.array),i=li(i,this.array),n=li(n,this.array),r=li(r,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=n,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==uh&&(t.usage=this.usage),t}};var Is=class extends ne{constructor(t,e,i){super(new Uint16Array(t),e,i)}};var zs=class extends ne{constructor(t,e,i){super(new Uint32Array(t),e,i)}};var ie=class extends ne{constructor(t,e,i){super(new Float32Array(t),e,i)}},Bd=0,Si=new Tt,Na=new Ue,xs=new D,yi=new on,Ks=new on,Fe=new D,xe=class s extends Pn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Bd++}),this.uuid=ur(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Tu(t)?zs:Is)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let r=new Xt().getNormalMatrix(t);i.applyNormalMatrix(r),i.needsUpdate=!0}let n=this.attributes.tangent;return n!==void 0&&(n.transformDirection(t),n.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Si.makeRotationFromQuaternion(t),this.applyMatrix4(Si),this}rotateX(t){return Si.makeRotationX(t),this.applyMatrix4(Si),this}rotateY(t){return Si.makeRotationY(t),this.applyMatrix4(Si),this}rotateZ(t){return Si.makeRotationZ(t),this.applyMatrix4(Si),this}translate(t,e,i){return Si.makeTranslation(t,e,i),this.applyMatrix4(Si),this}scale(t,e,i){return Si.makeScale(t,e,i),this.applyMatrix4(Si),this}lookAt(t){return Na.lookAt(t),Na.updateMatrix(),this.applyMatrix4(Na.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(xs).negate(),this.translate(xs.x,xs.y,xs.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let i=[];for(let n=0,r=t.length;n<r;n++){let o=t[n];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ie(i,3))}else{for(let i=0,n=e.count;i<n;i++){let r=t[i];e.setXYZ(i,r.x,r.y,r.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new on);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,n=e.length;i<n;i++){let r=e[i];yi.setFromBufferAttribute(r),this.morphTargetsRelative?(Fe.addVectors(this.boundingBox.min,yi.min),this.boundingBox.expandByPoint(Fe),Fe.addVectors(this.boundingBox.max,yi.max),this.boundingBox.expandByPoint(Fe)):(this.boundingBox.expandByPoint(yi.min),this.boundingBox.expandByPoint(yi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new an);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(t){let i=this.boundingSphere.center;if(yi.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){let a=e[r];Ks.setFromBufferAttribute(a),this.morphTargetsRelative?(Fe.addVectors(yi.min,Ks.min),yi.expandByPoint(Fe),Fe.addVectors(yi.max,Ks.max),yi.expandByPoint(Fe)):(yi.expandByPoint(Ks.min),yi.expandByPoint(Ks.max))}yi.getCenter(i);let n=0;for(let r=0,o=t.count;r<o;r++)Fe.fromBufferAttribute(t,r),n=Math.max(n,i.distanceToSquared(Fe));if(e)for(let r=0,o=e.length;r<o;r++){let a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Fe.fromBufferAttribute(a,c),l&&(xs.fromBufferAttribute(t,c),Fe.add(xs)),n=Math.max(n,i.distanceToSquared(Fe))}this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=e.position,n=e.normal,r=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new ne(new Float32Array(4*i.count),4));let o=this.getAttribute("tangent"),a=[],l=[];for(let P=0;P<i.count;P++)a[P]=new D,l[P]=new D;let c=new D,h=new D,f=new D,d=new se,u=new se,x=new se,y=new D,g=new D;function p(P,S,w){c.fromBufferAttribute(i,P),h.fromBufferAttribute(i,S),f.fromBufferAttribute(i,w),d.fromBufferAttribute(r,P),u.fromBufferAttribute(r,S),x.fromBufferAttribute(r,w),h.sub(c),f.sub(c),u.sub(d),x.sub(d);let z=1/(u.x*x.y-x.x*u.y);isFinite(z)&&(y.copy(h).multiplyScalar(x.y).addScaledVector(f,-u.y).multiplyScalar(z),g.copy(f).multiplyScalar(u.x).addScaledVector(h,-x.x).multiplyScalar(z),a[P].add(y),a[S].add(y),a[w].add(y),l[P].add(g),l[S].add(g),l[w].add(g))}let _=this.groups;_.length===0&&(_=[{start:0,count:t.count}]);for(let P=0,S=_.length;P<S;++P){let w=_[P],z=w.start,k=w.count;for(let U=z,H=z+k;U<H;U+=3)p(t.getX(U+0),t.getX(U+1),t.getX(U+2))}let M=new D,v=new D,I=new D,T=new D;function E(P){I.fromBufferAttribute(n,P),T.copy(I);let S=a[P];M.copy(S),M.sub(I.multiplyScalar(I.dot(S))).normalize(),v.crossVectors(T,S);let z=v.dot(l[P])<0?-1:1;o.setXYZW(P,M.x,M.y,M.z,z)}for(let P=0,S=_.length;P<S;++P){let w=_[P],z=w.start,k=w.count;for(let U=z,H=z+k;U<H;U+=3)E(t.getX(U+0)),E(t.getX(U+1)),E(t.getX(U+2))}}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new ne(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let d=0,u=i.count;d<u;d++)i.setXYZ(d,0,0,0);let n=new D,r=new D,o=new D,a=new D,l=new D,c=new D,h=new D,f=new D;if(t)for(let d=0,u=t.count;d<u;d+=3){let x=t.getX(d+0),y=t.getX(d+1),g=t.getX(d+2);n.fromBufferAttribute(e,x),r.fromBufferAttribute(e,y),o.fromBufferAttribute(e,g),h.subVectors(o,r),f.subVectors(n,r),h.cross(f),a.fromBufferAttribute(i,x),l.fromBufferAttribute(i,y),c.fromBufferAttribute(i,g),a.add(h),l.add(h),c.add(h),i.setXYZ(x,a.x,a.y,a.z),i.setXYZ(y,l.x,l.y,l.z),i.setXYZ(g,c.x,c.y,c.z)}else for(let d=0,u=e.count;d<u;d+=3)n.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),h.subVectors(o,r),f.subVectors(n,r),h.cross(f),i.setXYZ(d+0,h.x,h.y,h.z),i.setXYZ(d+1,h.x,h.y,h.z),i.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)Fe.fromBufferAttribute(t,e),Fe.normalize(),t.setXYZ(e,Fe.x,Fe.y,Fe.z)}toNonIndexed(){function t(a,l){let c=a.array,h=a.itemSize,f=a.normalized,d=new c.constructor(l.length*h),u=0,x=0;for(let y=0,g=l.length;y<g;y++){a.isInterleavedBufferAttribute?u=l[y]*a.data.stride+a.offset:u=l[y]*h;for(let p=0;p<h;p++)d[x++]=c[u++]}return new ne(d,h,f)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new s,i=this.index.array,n=this.attributes;for(let a in n){let l=n[a],c=t(l,i);e.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,f=c.length;h<f;h++){let d=c[h],u=t(d,i);l.push(u)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let i=this.attributes;for(let l in i){let c=i[l];t.data.attributes[l]=c.toJSON(t.data)}let n={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let f=0,d=c.length;f<d;f++){let u=c[f];h.push(u.toJSON(t.data))}h.length>0&&(n[l]=h,r=!0)}r&&(t.data.morphAttributes=n,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let i=t.index;i!==null&&this.setIndex(i.clone(e));let n=t.attributes;for(let c in n){let h=n[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],f=r[c];for(let d=0,u=f.length;d<u;d++)h.push(f[d].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let c=0,h=o.length;c<h;c++){let f=o[c];this.addGroup(f.start,f.count,f.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},Rh=new Tt,Wn=new rr,Lr=new an,Ch=new D,Dr=new D,Ur=new D,kr=new D,Fa=new D,Nr=new D,Ph=new D,Fr=new D,Kt=class extends Ue{constructor(t=new xe,e=new Oe){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){let n=e[i[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=n.length;r<o;r++){let a=n[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){let i=this.geometry,n=i.attributes.position,r=i.morphAttributes.position,o=i.morphTargetsRelative;e.fromBufferAttribute(n,t);let a=this.morphTargetInfluences;if(r&&a){Nr.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],f=r[l];h!==0&&(Fa.fromBufferAttribute(f,t),o?Nr.addScaledVector(Fa,h):Nr.addScaledVector(Fa.sub(e),h))}e.add(Nr)}return e}raycast(t,e){let i=this.geometry,n=this.material,r=this.matrixWorld;n!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Lr.copy(i.boundingSphere),Lr.applyMatrix4(r),Wn.copy(t.ray).recast(t.near),!(Lr.containsPoint(Wn.origin)===!1&&(Wn.intersectSphere(Lr,Ch)===null||Wn.origin.distanceToSquared(Ch)>(t.far-t.near)**2))&&(Rh.copy(r).invert(),Wn.copy(t.ray).applyMatrix4(Rh),!(i.boundingBox!==null&&Wn.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,Wn)))}_computeIntersections(t,e,i){let n,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,f=r.attributes.normal,d=r.groups,u=r.drawRange;if(a!==null)if(Array.isArray(o))for(let x=0,y=d.length;x<y;x++){let g=d[x],p=o[g.materialIndex],_=Math.max(g.start,u.start),M=Math.min(a.count,Math.min(g.start+g.count,u.start+u.count));for(let v=_,I=M;v<I;v+=3){let T=a.getX(v),E=a.getX(v+1),P=a.getX(v+2);n=Or(this,p,t,i,c,h,f,T,E,P),n&&(n.faceIndex=Math.floor(v/3),n.face.materialIndex=g.materialIndex,e.push(n))}}else{let x=Math.max(0,u.start),y=Math.min(a.count,u.start+u.count);for(let g=x,p=y;g<p;g+=3){let _=a.getX(g),M=a.getX(g+1),v=a.getX(g+2);n=Or(this,o,t,i,c,h,f,_,M,v),n&&(n.faceIndex=Math.floor(g/3),e.push(n))}}else if(l!==void 0)if(Array.isArray(o))for(let x=0,y=d.length;x<y;x++){let g=d[x],p=o[g.materialIndex],_=Math.max(g.start,u.start),M=Math.min(l.count,Math.min(g.start+g.count,u.start+u.count));for(let v=_,I=M;v<I;v+=3){let T=v,E=v+1,P=v+2;n=Or(this,p,t,i,c,h,f,T,E,P),n&&(n.faceIndex=Math.floor(v/3),n.face.materialIndex=g.materialIndex,e.push(n))}}else{let x=Math.max(0,u.start),y=Math.min(l.count,u.start+u.count);for(let g=x,p=y;g<p;g+=3){let _=g,M=g+1,v=g+2;n=Or(this,o,t,i,c,h,f,_,M,v),n&&(n.faceIndex=Math.floor(g/3),e.push(n))}}}};function Hd(s,t,e,i,n,r,o,a){let l;if(t.side===Ke?l=i.intersectTriangle(o,r,n,!0,a):l=i.intersectTriangle(n,r,o,t.side===Cn,a),l===null)return null;Fr.copy(a),Fr.applyMatrix4(s.matrixWorld);let c=e.ray.origin.distanceTo(Fr);return c<e.near||c>e.far?null:{distance:c,point:Fr.clone(),object:s}}function Or(s,t,e,i,n,r,o,a,l,c){s.getVertexPosition(a,Dr),s.getVertexPosition(l,Ur),s.getVertexPosition(c,kr);let h=Hd(s,t,e,i,Dr,Ur,kr,Ph);if(h){let f=new D;Jn.getBarycoord(Ph,Dr,Ur,kr,f),n&&(h.uv=Jn.getInterpolatedAttribute(n,a,l,c,f,new se)),r&&(h.uv1=Jn.getInterpolatedAttribute(r,a,l,c,f,new se)),o&&(h.normal=Jn.getInterpolatedAttribute(o,a,l,c,f,new D),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));let d={a,b:l,c,normal:new D,materialIndex:0};Jn.getNormal(Dr,Ur,kr,d.normal),h.face=d,h.barycoord=f}return h}var te=class s extends xe{constructor(t=1,e=1,i=1,n=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:n,heightSegments:r,depthSegments:o};let a=this;n=Math.floor(n),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],f=[],d=0,u=0;x("z","y","x",-1,-1,i,e,t,o,r,0),x("z","y","x",1,-1,i,e,-t,o,r,1),x("x","z","y",1,1,t,i,e,n,o,2),x("x","z","y",1,-1,t,i,-e,n,o,3),x("x","y","z",1,-1,t,e,i,n,r,4),x("x","y","z",-1,-1,t,e,-i,n,r,5),this.setIndex(l),this.setAttribute("position",new ie(c,3)),this.setAttribute("normal",new ie(h,3)),this.setAttribute("uv",new ie(f,2));function x(y,g,p,_,M,v,I,T,E,P,S){let w=v/E,z=I/P,k=v/2,U=I/2,H=T/2,Y=E+1,W=P+1,ot=0,$=0,ut=new D;for(let gt=0;gt<W;gt++){let Rt=gt*z-U;for(let Yt=0;Yt<Y;Yt++){let le=Yt*w-k;ut[y]=le*_,ut[g]=Rt*M,ut[p]=H,c.push(ut.x,ut.y,ut.z),ut[y]=0,ut[g]=0,ut[p]=T>0?1:-1,h.push(ut.x,ut.y,ut.z),f.push(Yt/E),f.push(1-gt/P),ot+=1}}for(let gt=0;gt<P;gt++)for(let Rt=0;Rt<E;Rt++){let Yt=d+Rt+Y*gt,le=d+Rt+Y*(gt+1),it=d+(Rt+1)+Y*(gt+1),lt=d+(Rt+1)+Y*gt;l.push(Yt,le,lt),l.push(le,it,lt),$+=6}a.addGroup(u,$,S),u+=$,d+=ot}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};function Ls(s){let t={};for(let e in s){t[e]={};for(let i in s[e]){let n=s[e][i];n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)?n.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=n.clone():Array.isArray(n)?t[e][i]=n.slice():t[e][i]=n}}return t}function Qe(s){let t={};for(let e=0;e<s.length;e++){let i=Ls(s[e]);for(let n in i)t[n]=i[n]}return t}function Vd(s){let t=[];for(let e=0;e<s.length;e++)t.push(s[e].clone());return t}function Au(s){let t=s.getRenderTarget();return t===null?s.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:ae.workingColorSpace}var bc={clone:Ls,merge:Qe},Gd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Wd=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Pe=class extends ln{static get type(){return"ShaderMaterial"}constructor(t){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Gd,this.fragmentShader=Wd,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Ls(t.uniforms),this.uniformsGroups=Vd(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let n in this.uniforms){let o=this.uniforms[n].value;o&&o.isTexture?e.uniforms[n]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[n]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[n]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[n]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[n]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[n]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[n]={type:"m4",value:o.toArray()}:e.uniforms[n]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let i={};for(let n in this.extensions)this.extensions[n]===!0&&(i[n]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}},ao=class extends Ue{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Tt,this.projectionMatrix=new Tt,this.projectionMatrixInverse=new Tt,this.coordinateSystem=nn}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},Sn=new D,Ih=new se,zh=new se,ti=class extends ao{constructor(t=50,e=1,i=.1,n=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=n,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Dl*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(ya*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Dl*2*Math.atan(Math.tan(ya*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){Sn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Sn.x,Sn.y).multiplyScalar(-t/Sn.z),Sn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Sn.x,Sn.y).multiplyScalar(-t/Sn.z)}getViewSize(t,e){return this.getViewBounds(t,Ih,zh),e.subVectors(zh,Ih)}setViewOffset(t,e,i,n,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=n,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(ya*.5*this.fov)/this.zoom,i=2*e,n=this.aspect*i,r=-.5*n,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*n/l,e-=o.offsetY*i/c,n*=o.width/l,i*=o.height/c}let a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+n,e,e-i,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}},ys=-90,vs=1,Fl=class extends Ue{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let n=new ti(ys,vs,t,e);n.layers=this.layers,this.add(n);let r=new ti(ys,vs,t,e);r.layers=this.layers,this.add(r);let o=new ti(ys,vs,t,e);o.layers=this.layers,this.add(o);let a=new ti(ys,vs,t,e);a.layers=this.layers,this.add(a);let l=new ti(ys,vs,t,e);l.layers=this.layers,this.add(l);let c=new ti(ys,vs,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[i,n,r,o,a,l]=e;for(let c of e)this.remove(c);if(t===nn)i.up.set(0,1,0),i.lookAt(1,0,0),n.up.set(0,1,0),n.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===io)i.up.set(0,-1,0),i.lookAt(-1,0,0),n.up.set(0,-1,0),n.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:n}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,f=t.getRenderTarget(),d=t.getActiveCubeFace(),u=t.getActiveMipmapLevel(),x=t.xr.enabled;t.xr.enabled=!1;let y=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,t.setRenderTarget(i,0,n),t.render(e,r),t.setRenderTarget(i,1,n),t.render(e,o),t.setRenderTarget(i,2,n),t.render(e,a),t.setRenderTarget(i,3,n),t.render(e,l),t.setRenderTarget(i,4,n),t.render(e,c),i.texture.generateMipmaps=y,t.setRenderTarget(i,5,n),t.render(e,h),t.setRenderTarget(f,d,u),t.xr.enabled=x,i.texture.needsPMREMUpdate=!0}},lo=class extends hi{constructor(t,e,i,n,r,o,a,l,c,h){t=t!==void 0?t:[],e=e!==void 0?e:As,super(t,e,i,n,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},Ol=class extends rn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let i={width:t,height:t,depth:1},n=[i,i,i,i,i,i];this.texture=new lo(n,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:Ti}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},n=new te(5,5,5),r=new Pe({name:"CubemapFromEquirect",uniforms:Ls(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Ke,blending:En});r.uniforms.tEquirect.value=e;let o=new Kt(n,r),a=e.minFilter;return e.minFilter===en&&(e.minFilter=Ti),new Fl(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e,i,n){let r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,i,n);t.setRenderTarget(r)}},Oa=new D,Xd=new D,qd=new Xt,Qi=class{constructor(t=new D(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,n){return this.normal.set(t,e,i),this.constant=n,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){let n=Oa.subVectors(i,e).cross(Xd.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(n,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){let i=t.delta(Oa),n=this.normal.dot(i);if(n===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let r=-(t.start.dot(this.normal)+this.constant)/n;return r<0||r>1?null:e.copy(t.start).addScaledVector(i,r)}intersectsLine(t){let e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let i=e||qd.getNormalMatrix(t),n=this.coplanarPoint(Oa).applyMatrix4(t),r=this.normal.applyMatrix3(i).normalize();return this.constant=-n.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}},Xn=new an,Br=new D,or=class{constructor(t=new Qi,e=new Qi,i=new Qi,n=new Qi,r=new Qi,o=new Qi){this.planes=[t,e,i,n,r,o]}set(t,e,i,n,r,o){let a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(i),a[3].copy(n),a[4].copy(r),a[5].copy(o),this}copy(t){let e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=nn){let i=this.planes,n=t.elements,r=n[0],o=n[1],a=n[2],l=n[3],c=n[4],h=n[5],f=n[6],d=n[7],u=n[8],x=n[9],y=n[10],g=n[11],p=n[12],_=n[13],M=n[14],v=n[15];if(i[0].setComponents(l-r,d-c,g-u,v-p).normalize(),i[1].setComponents(l+r,d+c,g+u,v+p).normalize(),i[2].setComponents(l+o,d+h,g+x,v+_).normalize(),i[3].setComponents(l-o,d-h,g-x,v-_).normalize(),i[4].setComponents(l-a,d-f,g-y,v-M).normalize(),e===nn)i[5].setComponents(l+a,d+f,g+y,v+M).normalize();else if(e===io)i[5].setComponents(a,f,y,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Xn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Xn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Xn)}intersectsSprite(t){return Xn.center.set(0,0,0),Xn.radius=.7071067811865476,Xn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Xn)}intersectsSphere(t){let e=this.planes,i=t.center,n=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(i)<n)return!1;return!0}intersectsBox(t){let e=this.planes;for(let i=0;i<6;i++){let n=e[i];if(Br.x=n.normal.x>0?t.max.x:t.min.x,Br.y=n.normal.y>0?t.max.y:t.min.y,Br.z=n.normal.z>0?t.max.z:t.min.z,n.distanceToPoint(Br)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};function Ru(){let s=null,t=!1,e=null,i=null;function n(r,o){e(r,o),i=s.requestAnimationFrame(n)}return{start:function(){t!==!0&&e!==null&&(i=s.requestAnimationFrame(n),t=!0)},stop:function(){s.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){s=r}}}function Yd(s){let t=new WeakMap;function e(a,l){let c=a.array,h=a.usage,f=c.byteLength,d=s.createBuffer();s.bindBuffer(l,d),s.bufferData(l,c,h),a.onUploadCallback();let u;if(c instanceof Float32Array)u=s.FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?u=s.HALF_FLOAT:u=s.UNSIGNED_SHORT;else if(c instanceof Int16Array)u=s.SHORT;else if(c instanceof Uint32Array)u=s.UNSIGNED_INT;else if(c instanceof Int32Array)u=s.INT;else if(c instanceof Int8Array)u=s.BYTE;else if(c instanceof Uint8Array)u=s.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)u=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:u,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:f}}function i(a,l,c){let h=l.array,f=l.updateRanges;if(s.bindBuffer(c,a),f.length===0)s.bufferSubData(c,0,h);else{f.sort((u,x)=>u.start-x.start);let d=0;for(let u=1;u<f.length;u++){let x=f[d],y=f[u];y.start<=x.start+x.count+1?x.count=Math.max(x.count,y.start+y.count-x.start):(++d,f[d]=y)}f.length=d+1;for(let u=0,x=f.length;u<x;u++){let y=f[u];s.bufferSubData(c,y.start*h.BYTES_PER_ELEMENT,h,y.start,y.count)}l.clearUpdateRanges()}l.onUploadCallback()}function n(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=t.get(a);l&&(s.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:n,remove:r,update:o}}var Bi=class s extends xe{constructor(t=1,e=1,i=1,n=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:n};let r=t/2,o=e/2,a=Math.floor(i),l=Math.floor(n),c=a+1,h=l+1,f=t/a,d=e/l,u=[],x=[],y=[],g=[];for(let p=0;p<h;p++){let _=p*d-o;for(let M=0;M<c;M++){let v=M*f-r;x.push(v,-_,0),y.push(0,0,1),g.push(M/a),g.push(1-p/l)}}for(let p=0;p<l;p++)for(let _=0;_<a;_++){let M=_+c*p,v=_+c*(p+1),I=_+1+c*(p+1),T=_+1+c*p;u.push(M,v,T),u.push(v,I,T)}this.setIndex(u),this.setAttribute("position",new ie(x,3)),this.setAttribute("normal",new ie(y,3)),this.setAttribute("uv",new ie(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.width,t.height,t.widthSegments,t.heightSegments)}},Zd=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,$d=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Jd=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Kd=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,jd=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Qd=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,tp=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,ep=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,ip=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,np=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,sp=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,rp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,op=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,ap=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,lp=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,cp=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,hp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,up=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,fp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,dp=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,pp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,mp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,gp=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,xp=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,yp=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,vp=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,_p=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Mp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,bp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,wp=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Sp="gl_FragColor = linearToOutputTexel( gl_FragColor );",Tp=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Ep=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Ap=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Rp=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Cp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Pp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Ip=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,zp=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Lp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Dp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Up=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,kp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Np=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Fp=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Op=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Bp=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Hp=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Vp=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Gp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Wp=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Xp=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,qp=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Yp=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Zp=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,$p=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Jp=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Kp=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,jp=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Qp=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,tm=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,em=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,im=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,nm=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,sm=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,rm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,om=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,am=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,lm=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,cm=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,hm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,um=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,fm=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,dm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,pm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,mm=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,gm=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,xm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,ym=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,vm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,_m=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Mm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,bm=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,wm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Sm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Tm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Em=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Am=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Rm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Cm=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,Pm=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Im=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,zm=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Lm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Dm=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Um=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,km=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Nm=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Fm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Om=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Bm=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Hm=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Vm=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Gm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Wm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Xm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,qm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Ym=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Zm=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,$m=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Jm=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Km=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,jm=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Qm=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,t0=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,e0=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,i0=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,n0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,s0=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,r0=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,o0=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,a0=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,l0=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,c0=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,h0=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,u0=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,f0=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,d0=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,p0=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,m0=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,g0=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,x0=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,y0=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,v0=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,_0=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,M0=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,b0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,w0=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,S0=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,T0=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,E0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,jt={alphahash_fragment:Zd,alphahash_pars_fragment:$d,alphamap_fragment:Jd,alphamap_pars_fragment:Kd,alphatest_fragment:jd,alphatest_pars_fragment:Qd,aomap_fragment:tp,aomap_pars_fragment:ep,batching_pars_vertex:ip,batching_vertex:np,begin_vertex:sp,beginnormal_vertex:rp,bsdfs:op,iridescence_fragment:ap,bumpmap_pars_fragment:lp,clipping_planes_fragment:cp,clipping_planes_pars_fragment:hp,clipping_planes_pars_vertex:up,clipping_planes_vertex:fp,color_fragment:dp,color_pars_fragment:pp,color_pars_vertex:mp,color_vertex:gp,common:xp,cube_uv_reflection_fragment:yp,defaultnormal_vertex:vp,displacementmap_pars_vertex:_p,displacementmap_vertex:Mp,emissivemap_fragment:bp,emissivemap_pars_fragment:wp,colorspace_fragment:Sp,colorspace_pars_fragment:Tp,envmap_fragment:Ep,envmap_common_pars_fragment:Ap,envmap_pars_fragment:Rp,envmap_pars_vertex:Cp,envmap_physical_pars_fragment:Bp,envmap_vertex:Pp,fog_vertex:Ip,fog_pars_vertex:zp,fog_fragment:Lp,fog_pars_fragment:Dp,gradientmap_pars_fragment:Up,lightmap_pars_fragment:kp,lights_lambert_fragment:Np,lights_lambert_pars_fragment:Fp,lights_pars_begin:Op,lights_toon_fragment:Hp,lights_toon_pars_fragment:Vp,lights_phong_fragment:Gp,lights_phong_pars_fragment:Wp,lights_physical_fragment:Xp,lights_physical_pars_fragment:qp,lights_fragment_begin:Yp,lights_fragment_maps:Zp,lights_fragment_end:$p,logdepthbuf_fragment:Jp,logdepthbuf_pars_fragment:Kp,logdepthbuf_pars_vertex:jp,logdepthbuf_vertex:Qp,map_fragment:tm,map_pars_fragment:em,map_particle_fragment:im,map_particle_pars_fragment:nm,metalnessmap_fragment:sm,metalnessmap_pars_fragment:rm,morphinstance_vertex:om,morphcolor_vertex:am,morphnormal_vertex:lm,morphtarget_pars_vertex:cm,morphtarget_vertex:hm,normal_fragment_begin:um,normal_fragment_maps:fm,normal_pars_fragment:dm,normal_pars_vertex:pm,normal_vertex:mm,normalmap_pars_fragment:gm,clearcoat_normal_fragment_begin:xm,clearcoat_normal_fragment_maps:ym,clearcoat_pars_fragment:vm,iridescence_pars_fragment:_m,opaque_fragment:Mm,packing:bm,premultiplied_alpha_fragment:wm,project_vertex:Sm,dithering_fragment:Tm,dithering_pars_fragment:Em,roughnessmap_fragment:Am,roughnessmap_pars_fragment:Rm,shadowmap_pars_fragment:Cm,shadowmap_pars_vertex:Pm,shadowmap_vertex:Im,shadowmask_pars_fragment:zm,skinbase_vertex:Lm,skinning_pars_vertex:Dm,skinning_vertex:Um,skinnormal_vertex:km,specularmap_fragment:Nm,specularmap_pars_fragment:Fm,tonemapping_fragment:Om,tonemapping_pars_fragment:Bm,transmission_fragment:Hm,transmission_pars_fragment:Vm,uv_pars_fragment:Gm,uv_pars_vertex:Wm,uv_vertex:Xm,worldpos_vertex:qm,background_vert:Ym,background_frag:Zm,backgroundCube_vert:$m,backgroundCube_frag:Jm,cube_vert:Km,cube_frag:jm,depth_vert:Qm,depth_frag:t0,distanceRGBA_vert:e0,distanceRGBA_frag:i0,equirect_vert:n0,equirect_frag:s0,linedashed_vert:r0,linedashed_frag:o0,meshbasic_vert:a0,meshbasic_frag:l0,meshlambert_vert:c0,meshlambert_frag:h0,meshmatcap_vert:u0,meshmatcap_frag:f0,meshnormal_vert:d0,meshnormal_frag:p0,meshphong_vert:m0,meshphong_frag:g0,meshphysical_vert:x0,meshphysical_frag:y0,meshtoon_vert:v0,meshtoon_frag:_0,points_vert:M0,points_frag:b0,shadow_vert:w0,shadow_frag:S0,sprite_vert:T0,sprite_frag:E0},ft={common:{diffuse:{value:new ct(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xt}},envmap:{envMap:{value:null},envMapRotation:{value:new Xt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xt},normalScale:{value:new se(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new ct(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new ct(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0},uvTransform:{value:new Xt}},sprite:{diffuse:{value:new ct(16777215)},opacity:{value:1},center:{value:new se(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}}},Fi={basic:{uniforms:Qe([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.fog]),vertexShader:jt.meshbasic_vert,fragmentShader:jt.meshbasic_frag},lambert:{uniforms:Qe([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,ft.lights,{emissive:{value:new ct(0)}}]),vertexShader:jt.meshlambert_vert,fragmentShader:jt.meshlambert_frag},phong:{uniforms:Qe([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,ft.lights,{emissive:{value:new ct(0)},specular:{value:new ct(1118481)},shininess:{value:30}}]),vertexShader:jt.meshphong_vert,fragmentShader:jt.meshphong_frag},standard:{uniforms:Qe([ft.common,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.roughnessmap,ft.metalnessmap,ft.fog,ft.lights,{emissive:{value:new ct(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:jt.meshphysical_vert,fragmentShader:jt.meshphysical_frag},toon:{uniforms:Qe([ft.common,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.gradientmap,ft.fog,ft.lights,{emissive:{value:new ct(0)}}]),vertexShader:jt.meshtoon_vert,fragmentShader:jt.meshtoon_frag},matcap:{uniforms:Qe([ft.common,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,{matcap:{value:null}}]),vertexShader:jt.meshmatcap_vert,fragmentShader:jt.meshmatcap_frag},points:{uniforms:Qe([ft.points,ft.fog]),vertexShader:jt.points_vert,fragmentShader:jt.points_frag},dashed:{uniforms:Qe([ft.common,ft.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:jt.linedashed_vert,fragmentShader:jt.linedashed_frag},depth:{uniforms:Qe([ft.common,ft.displacementmap]),vertexShader:jt.depth_vert,fragmentShader:jt.depth_frag},normal:{uniforms:Qe([ft.common,ft.bumpmap,ft.normalmap,ft.displacementmap,{opacity:{value:1}}]),vertexShader:jt.meshnormal_vert,fragmentShader:jt.meshnormal_frag},sprite:{uniforms:Qe([ft.sprite,ft.fog]),vertexShader:jt.sprite_vert,fragmentShader:jt.sprite_frag},background:{uniforms:{uvTransform:{value:new Xt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:jt.background_vert,fragmentShader:jt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Xt}},vertexShader:jt.backgroundCube_vert,fragmentShader:jt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:jt.cube_vert,fragmentShader:jt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:jt.equirect_vert,fragmentShader:jt.equirect_frag},distanceRGBA:{uniforms:Qe([ft.common,ft.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:jt.distanceRGBA_vert,fragmentShader:jt.distanceRGBA_frag},shadow:{uniforms:Qe([ft.lights,ft.fog,{color:{value:new ct(0)},opacity:{value:1}}]),vertexShader:jt.shadow_vert,fragmentShader:jt.shadow_frag}};Fi.physical={uniforms:Qe([Fi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xt},clearcoatNormalScale:{value:new se(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xt},sheen:{value:0},sheenColor:{value:new ct(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xt},transmissionSamplerSize:{value:new se},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xt},attenuationDistance:{value:0},attenuationColor:{value:new ct(0)},specularColor:{value:new ct(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xt},anisotropyVector:{value:new se},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xt}}]),vertexShader:jt.meshphysical_vert,fragmentShader:jt.meshphysical_frag};var Hr={r:0,b:0,g:0},qn=new ui,A0=new Tt;function R0(s,t,e,i,n,r,o){let a=new ct(0),l=r===!0?0:1,c,h,f=null,d=0,u=null;function x(_){let M=_.isScene===!0?_.background:null;return M&&M.isTexture&&(M=(_.backgroundBlurriness>0?e:t).get(M)),M}function y(_){let M=!1,v=x(_);v===null?p(a,l):v&&v.isColor&&(p(v,1),M=!0);let I=s.xr.getEnvironmentBlendMode();I==="additive"?i.buffers.color.setClear(0,0,0,1,o):I==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(s.autoClear||M)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function g(_,M){let v=x(M);v&&(v.isCubeTexture||v.mapping===Ao)?(h===void 0&&(h=new Kt(new te(1,1,1),new Pe({name:"BackgroundCubeMaterial",uniforms:Ls(Fi.backgroundCube.uniforms),vertexShader:Fi.backgroundCube.vertexShader,fragmentShader:Fi.backgroundCube.fragmentShader,side:Ke,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(I,T,E){this.matrixWorld.copyPosition(E.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(h)),qn.copy(M.backgroundRotation),qn.x*=-1,qn.y*=-1,qn.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(qn.y*=-1,qn.z*=-1),h.material.uniforms.envMap.value=v,h.material.uniforms.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(A0.makeRotationFromEuler(qn)),h.material.toneMapped=ae.getTransfer(v.colorSpace)!==ge,(f!==v||d!==v.version||u!==s.toneMapping)&&(h.material.needsUpdate=!0,f=v,d=v.version,u=s.toneMapping),h.layers.enableAll(),_.unshift(h,h.geometry,h.material,0,0,null)):v&&v.isTexture&&(c===void 0&&(c=new Kt(new Bi(2,2),new Pe({name:"BackgroundMaterial",uniforms:Ls(Fi.background.uniforms),vertexShader:Fi.background.vertexShader,fragmentShader:Fi.background.fragmentShader,side:Cn,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=v,c.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,c.material.toneMapped=ae.getTransfer(v.colorSpace)!==ge,v.matrixAutoUpdate===!0&&v.updateMatrix(),c.material.uniforms.uvTransform.value.copy(v.matrix),(f!==v||d!==v.version||u!==s.toneMapping)&&(c.material.needsUpdate=!0,f=v,d=v.version,u=s.toneMapping),c.layers.enableAll(),_.unshift(c,c.geometry,c.material,0,0,null))}function p(_,M){_.getRGB(Hr,Au(s)),i.buffers.color.setClear(Hr.r,Hr.g,Hr.b,M,o)}return{getClearColor:function(){return a},setClearColor:function(_,M=1){a.set(_),l=M,p(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(_){l=_,p(a,l)},render:y,addToRenderList:g}}function C0(s,t){let e=s.getParameter(s.MAX_VERTEX_ATTRIBS),i={},n=d(null),r=n,o=!1;function a(w,z,k,U,H){let Y=!1,W=f(U,k,z);r!==W&&(r=W,c(r.object)),Y=u(w,U,k,H),Y&&x(w,U,k,H),H!==null&&t.update(H,s.ELEMENT_ARRAY_BUFFER),(Y||o)&&(o=!1,v(w,z,k,U),H!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,t.get(H).buffer))}function l(){return s.createVertexArray()}function c(w){return s.bindVertexArray(w)}function h(w){return s.deleteVertexArray(w)}function f(w,z,k){let U=k.wireframe===!0,H=i[w.id];H===void 0&&(H={},i[w.id]=H);let Y=H[z.id];Y===void 0&&(Y={},H[z.id]=Y);let W=Y[U];return W===void 0&&(W=d(l()),Y[U]=W),W}function d(w){let z=[],k=[],U=[];for(let H=0;H<e;H++)z[H]=0,k[H]=0,U[H]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:z,enabledAttributes:k,attributeDivisors:U,object:w,attributes:{},index:null}}function u(w,z,k,U){let H=r.attributes,Y=z.attributes,W=0,ot=k.getAttributes();for(let $ in ot)if(ot[$].location>=0){let gt=H[$],Rt=Y[$];if(Rt===void 0&&($==="instanceMatrix"&&w.instanceMatrix&&(Rt=w.instanceMatrix),$==="instanceColor"&&w.instanceColor&&(Rt=w.instanceColor)),gt===void 0||gt.attribute!==Rt||Rt&&gt.data!==Rt.data)return!0;W++}return r.attributesNum!==W||r.index!==U}function x(w,z,k,U){let H={},Y=z.attributes,W=0,ot=k.getAttributes();for(let $ in ot)if(ot[$].location>=0){let gt=Y[$];gt===void 0&&($==="instanceMatrix"&&w.instanceMatrix&&(gt=w.instanceMatrix),$==="instanceColor"&&w.instanceColor&&(gt=w.instanceColor));let Rt={};Rt.attribute=gt,gt&&gt.data&&(Rt.data=gt.data),H[$]=Rt,W++}r.attributes=H,r.attributesNum=W,r.index=U}function y(){let w=r.newAttributes;for(let z=0,k=w.length;z<k;z++)w[z]=0}function g(w){p(w,0)}function p(w,z){let k=r.newAttributes,U=r.enabledAttributes,H=r.attributeDivisors;k[w]=1,U[w]===0&&(s.enableVertexAttribArray(w),U[w]=1),H[w]!==z&&(s.vertexAttribDivisor(w,z),H[w]=z)}function _(){let w=r.newAttributes,z=r.enabledAttributes;for(let k=0,U=z.length;k<U;k++)z[k]!==w[k]&&(s.disableVertexAttribArray(k),z[k]=0)}function M(w,z,k,U,H,Y,W){W===!0?s.vertexAttribIPointer(w,z,k,H,Y):s.vertexAttribPointer(w,z,k,U,H,Y)}function v(w,z,k,U){y();let H=U.attributes,Y=k.getAttributes(),W=z.defaultAttributeValues;for(let ot in Y){let $=Y[ot];if($.location>=0){let ut=H[ot];if(ut===void 0&&(ot==="instanceMatrix"&&w.instanceMatrix&&(ut=w.instanceMatrix),ot==="instanceColor"&&w.instanceColor&&(ut=w.instanceColor)),ut!==void 0){let gt=ut.normalized,Rt=ut.itemSize,Yt=t.get(ut);if(Yt===void 0)continue;let le=Yt.buffer,it=Yt.type,lt=Yt.bytesPerElement,At=it===s.INT||it===s.UNSIGNED_INT||ut.gpuType===mc;if(ut.isInterleavedBufferAttribute){let dt=ut.data,kt=dt.stride,Dt=ut.offset;if(dt.isInstancedInterleavedBuffer){for(let Vt=0;Vt<$.locationSize;Vt++)p($.location+Vt,dt.meshPerAttribute);w.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=dt.meshPerAttribute*dt.count)}else for(let Vt=0;Vt<$.locationSize;Vt++)g($.location+Vt);s.bindBuffer(s.ARRAY_BUFFER,le);for(let Vt=0;Vt<$.locationSize;Vt++)M($.location+Vt,Rt/$.locationSize,it,gt,kt*lt,(Dt+Rt/$.locationSize*Vt)*lt,At)}else{if(ut.isInstancedBufferAttribute){for(let dt=0;dt<$.locationSize;dt++)p($.location+dt,ut.meshPerAttribute);w.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=ut.meshPerAttribute*ut.count)}else for(let dt=0;dt<$.locationSize;dt++)g($.location+dt);s.bindBuffer(s.ARRAY_BUFFER,le);for(let dt=0;dt<$.locationSize;dt++)M($.location+dt,Rt/$.locationSize,it,gt,Rt*lt,Rt/$.locationSize*dt*lt,At)}}else if(W!==void 0){let gt=W[ot];if(gt!==void 0)switch(gt.length){case 2:s.vertexAttrib2fv($.location,gt);break;case 3:s.vertexAttrib3fv($.location,gt);break;case 4:s.vertexAttrib4fv($.location,gt);break;default:s.vertexAttrib1fv($.location,gt)}}}}_()}function I(){P();for(let w in i){let z=i[w];for(let k in z){let U=z[k];for(let H in U)h(U[H].object),delete U[H];delete z[k]}delete i[w]}}function T(w){if(i[w.id]===void 0)return;let z=i[w.id];for(let k in z){let U=z[k];for(let H in U)h(U[H].object),delete U[H];delete z[k]}delete i[w.id]}function E(w){for(let z in i){let k=i[z];if(k[w.id]===void 0)continue;let U=k[w.id];for(let H in U)h(U[H].object),delete U[H];delete k[w.id]}}function P(){S(),o=!0,r!==n&&(r=n,c(r.object))}function S(){n.geometry=null,n.program=null,n.wireframe=!1}return{setup:a,reset:P,resetDefaultState:S,dispose:I,releaseStatesOfGeometry:T,releaseStatesOfProgram:E,initAttributes:y,enableAttribute:g,disableUnusedAttributes:_}}function P0(s,t,e){let i;function n(c){i=c}function r(c,h){s.drawArrays(i,c,h),e.update(h,i,1)}function o(c,h,f){f!==0&&(s.drawArraysInstanced(i,c,h,f),e.update(h,i,f))}function a(c,h,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,h,0,f);let u=0;for(let x=0;x<f;x++)u+=h[x];e.update(u,i,1)}function l(c,h,f,d){if(f===0)return;let u=t.get("WEBGL_multi_draw");if(u===null)for(let x=0;x<c.length;x++)o(c[x],h[x],d[x]);else{u.multiDrawArraysInstancedWEBGL(i,c,0,h,0,d,0,f);let x=0;for(let y=0;y<f;y++)x+=h[y]*d[y];e.update(x,i,1)}}this.setMode=n,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function I0(s,t,e,i){let n;function r(){if(n!==void 0)return n;if(t.has("EXT_texture_filter_anisotropic")===!0){let E=t.get("EXT_texture_filter_anisotropic");n=s.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function o(E){return!(E!==vi&&i.convert(E)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(E){let P=E===hr&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(E!==Di&&i.convert(E)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&E!==Oi&&!P)}function l(E){if(E==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let f=e.logarithmicDepthBuffer===!0,d=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),u=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),x=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),y=s.getParameter(s.MAX_TEXTURE_SIZE),g=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),p=s.getParameter(s.MAX_VERTEX_ATTRIBS),_=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),M=s.getParameter(s.MAX_VARYING_VECTORS),v=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),I=x>0,T=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:f,reverseDepthBuffer:d,maxTextures:u,maxVertexTextures:x,maxTextureSize:y,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:_,maxVaryings:M,maxFragmentUniforms:v,vertexTextures:I,maxSamples:T}}function z0(s){let t=this,e=null,i=0,n=!1,r=!1,o=new Qi,a=new Xt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,d){let u=f.length!==0||d||i!==0||n;return n=d,i=f.length,u},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,d){e=h(f,d,0)},this.setState=function(f,d,u){let x=f.clippingPlanes,y=f.clipIntersection,g=f.clipShadows,p=s.get(f);if(!n||x===null||x.length===0||r&&!g)r?h(null):c();else{let _=r?0:i,M=_*4,v=p.clippingState||null;l.value=v,v=h(x,d,M,u);for(let I=0;I!==M;++I)v[I]=e[I];p.clippingState=v,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=_}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function h(f,d,u,x){let y=f!==null?f.length:0,g=null;if(y!==0){if(g=l.value,x!==!0||g===null){let p=u+y*4,_=d.matrixWorldInverse;a.getNormalMatrix(_),(g===null||g.length<p)&&(g=new Float32Array(p));for(let M=0,v=u;M!==y;++M,v+=4)o.copy(f[M]).applyMatrix4(_,a),o.normal.toArray(g,v),g[v+3]=o.constant}l.value=g,l.needsUpdate=!0}return t.numPlanes=y,t.numIntersection=0,g}}function L0(s){let t=new WeakMap;function e(o,a){return a===nl?o.mapping=As:a===sl&&(o.mapping=Rs),o}function i(o){if(o&&o.isTexture){let a=o.mapping;if(a===nl||a===sl)if(t.has(o)){let l=t.get(o).texture;return e(l,o.mapping)}else{let l=o.image;if(l&&l.height>0){let c=new Ol(l.height);return c.fromEquirectangularTexture(s,o),t.set(o,c),o.addEventListener("dispose",n),e(c.texture,o.mapping)}else return null}}return o}function n(o){let a=o.target;a.removeEventListener("dispose",n);let l=t.get(a);l!==void 0&&(t.delete(a),l.dispose())}function r(){t=new WeakMap}return{get:i,dispose:r}}var co=class extends ao{constructor(t=-1,e=1,i=1,n=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=n,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,n,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=n,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,n=(this.top+this.bottom)/2,r=i-t,o=i+t,a=n+e,l=n-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},bs=4,Lh=[.125,.215,.35,.446,.526,.582],Kn=20,Ba=new co,Dh=new ct,Ha=null,Va=0,Ga=0,Wa=!1,Zn=(1+Math.sqrt(5))/2,_s=1/Zn,Uh=[new D(-Zn,_s,0),new D(Zn,_s,0),new D(-_s,0,Zn),new D(_s,0,Zn),new D(0,Zn,-_s),new D(0,Zn,_s),new D(-1,1,-1),new D(1,1,-1),new D(-1,1,1),new D(1,1,1)],ho=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,i=.1,n=100){Ha=this._renderer.getRenderTarget(),Va=this._renderer.getActiveCubeFace(),Ga=this._renderer.getActiveMipmapLevel(),Wa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);let r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(t,i,n,r),e>0&&this._blur(r,0,0,e),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Fh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Nh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(Ha,Va,Ga),this._renderer.xr.enabled=Wa,t.scissorTest=!1,Vr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===As||t.mapping===Rs?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Ha=this._renderer.getRenderTarget(),Va=this._renderer.getActiveCubeFace(),Ga=this._renderer.getActiveMipmapLevel(),Wa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let i=e||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,i={magFilter:Ti,minFilter:Ti,generateMipmaps:!1,type:hr,format:vi,colorSpace:Us,depthBuffer:!1},n=kh(t,e,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=kh(t,e,i);let{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=D0(r)),this._blurMaterial=U0(r,t,e)}return n}_compileMaterial(t){let e=new Kt(this._lodPlanes[0],t);this._renderer.compile(e,Ba)}_sceneToCubeUV(t,e,i,n){let a=new ti(90,1,e,i),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,f=h.autoClear,d=h.toneMapping;h.getClearColor(Dh),h.toneMapping=Rn,h.autoClear=!1;let u=new Oe({name:"PMREM.Background",side:Ke,depthWrite:!1,depthTest:!1}),x=new Kt(new te,u),y=!1,g=t.background;g?g.isColor&&(u.color.copy(g),t.background=null,y=!0):(u.color.copy(Dh),y=!0);for(let p=0;p<6;p++){let _=p%3;_===0?(a.up.set(0,l[p],0),a.lookAt(c[p],0,0)):_===1?(a.up.set(0,0,l[p]),a.lookAt(0,c[p],0)):(a.up.set(0,l[p],0),a.lookAt(0,0,c[p]));let M=this._cubeSize;Vr(n,_*M,p>2?M:0,M,M),h.setRenderTarget(n),y&&h.render(x,a),h.render(t,a)}x.geometry.dispose(),x.material.dispose(),h.toneMapping=d,h.autoClear=f,t.background=g}_textureToCubeUV(t,e){let i=this._renderer,n=t.mapping===As||t.mapping===Rs;n?(this._cubemapMaterial===null&&(this._cubemapMaterial=Fh()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Nh());let r=n?this._cubemapMaterial:this._equirectMaterial,o=new Kt(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=t;let l=this._cubeSize;Vr(e,0,0,3*l,2*l),i.setRenderTarget(e),i.render(o,Ba)}_applyPMREM(t){let e=this._renderer,i=e.autoClear;e.autoClear=!1;let n=this._lodPlanes.length;for(let r=1;r<n;r++){let o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=Uh[(n-r-1)%Uh.length];this._blur(t,r-1,r,o,a)}e.autoClear=i}_blur(t,e,i,n,r){let o=this._pingPongRenderTarget;this._halfBlur(t,o,e,i,n,"latitudinal",r),this._halfBlur(o,t,i,i,n,"longitudinal",r)}_halfBlur(t,e,i,n,r,o,a){let l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let h=3,f=new Kt(this._lodPlanes[n],c),d=c.uniforms,u=this._sizeLods[i]-1,x=isFinite(r)?Math.PI/(2*u):2*Math.PI/(2*Kn-1),y=r/x,g=isFinite(r)?1+Math.floor(h*y):Kn;g>Kn&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Kn}`);let p=[],_=0;for(let E=0;E<Kn;++E){let P=E/y,S=Math.exp(-P*P/2);p.push(S),E===0?_+=S:E<g&&(_+=2*S)}for(let E=0;E<p.length;E++)p[E]=p[E]/_;d.envMap.value=t.texture,d.samples.value=g,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);let{_lodMax:M}=this;d.dTheta.value=x,d.mipInt.value=M-i;let v=this._sizeLods[n],I=3*v*(n>M-bs?n-M+bs:0),T=4*(this._cubeSize-v);Vr(e,I,T,3*v,2*v),l.setRenderTarget(e),l.render(f,Ba)}};function D0(s){let t=[],e=[],i=[],n=s,r=s-bs+1+Lh.length;for(let o=0;o<r;o++){let a=Math.pow(2,n);e.push(a);let l=1/a;o>s-bs?l=Lh[o-s+bs-1]:o===0&&(l=0),i.push(l);let c=1/(a-2),h=-c,f=1+c,d=[h,h,f,h,f,f,h,h,f,f,h,f],u=6,x=6,y=3,g=2,p=1,_=new Float32Array(y*x*u),M=new Float32Array(g*x*u),v=new Float32Array(p*x*u);for(let T=0;T<u;T++){let E=T%3*2/3-1,P=T>2?0:-1,S=[E,P,0,E+2/3,P,0,E+2/3,P+1,0,E,P,0,E+2/3,P+1,0,E,P+1,0];_.set(S,y*x*T),M.set(d,g*x*T);let w=[T,T,T,T,T,T];v.set(w,p*x*T)}let I=new xe;I.setAttribute("position",new ne(_,y)),I.setAttribute("uv",new ne(M,g)),I.setAttribute("faceIndex",new ne(v,p)),t.push(I),n>bs&&n--}return{lodPlanes:t,sizeLods:e,sigmas:i}}function kh(s,t,e){let i=new rn(s,t,e);return i.texture.mapping=Ao,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Vr(s,t,e,i,n){s.viewport.set(t,e,i,n),s.scissor.set(t,e,i,n)}function U0(s,t,e){let i=new Float32Array(Kn),n=new D(0,1,0);return new Pe({name:"SphericalGaussianBlur",defines:{n:Kn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:n}},vertexShader:wc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:En,depthTest:!1,depthWrite:!1})}function Nh(){return new Pe({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:wc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:En,depthTest:!1,depthWrite:!1})}function Fh(){return new Pe({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:wc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:En,depthTest:!1,depthWrite:!1})}function wc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function k0(s){let t=new WeakMap,e=null;function i(a){if(a&&a.isTexture){let l=a.mapping,c=l===nl||l===sl,h=l===As||l===Rs;if(c||h){let f=t.get(a),d=f!==void 0?f.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return e===null&&(e=new ho(s)),f=c?e.fromEquirectangular(a,f):e.fromCubemap(a,f),f.texture.pmremVersion=a.pmremVersion,t.set(a,f),f.texture;if(f!==void 0)return f.texture;{let u=a.image;return c&&u&&u.height>0||h&&u&&n(u)?(e===null&&(e=new ho(s)),f=c?e.fromEquirectangular(a):e.fromCubemap(a),f.texture.pmremVersion=a.pmremVersion,t.set(a,f),a.addEventListener("dispose",r),f.texture):null}}}return a}function n(a){let l=0,c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function r(a){let l=a.target;l.removeEventListener("dispose",r);let c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:i,dispose:o}}function N0(s){let t={};function e(i){if(t[i]!==void 0)return t[i];let n;switch(i){case"WEBGL_depth_texture":n=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":n=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":n=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":n=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:n=s.getExtension(i)}return t[i]=n,n}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){let n=e(i);return n===null&&er("THREE.WebGLRenderer: "+i+" extension not supported."),n}}}function F0(s,t,e,i){let n={},r=new WeakMap;function o(f){let d=f.target;d.index!==null&&t.remove(d.index);for(let x in d.attributes)t.remove(d.attributes[x]);for(let x in d.morphAttributes){let y=d.morphAttributes[x];for(let g=0,p=y.length;g<p;g++)t.remove(y[g])}d.removeEventListener("dispose",o),delete n[d.id];let u=r.get(d);u&&(t.remove(u),r.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function a(f,d){return n[d.id]===!0||(d.addEventListener("dispose",o),n[d.id]=!0,e.memory.geometries++),d}function l(f){let d=f.attributes;for(let x in d)t.update(d[x],s.ARRAY_BUFFER);let u=f.morphAttributes;for(let x in u){let y=u[x];for(let g=0,p=y.length;g<p;g++)t.update(y[g],s.ARRAY_BUFFER)}}function c(f){let d=[],u=f.index,x=f.attributes.position,y=0;if(u!==null){let _=u.array;y=u.version;for(let M=0,v=_.length;M<v;M+=3){let I=_[M+0],T=_[M+1],E=_[M+2];d.push(I,T,T,E,E,I)}}else if(x!==void 0){let _=x.array;y=x.version;for(let M=0,v=_.length/3-1;M<v;M+=3){let I=M+0,T=M+1,E=M+2;d.push(I,T,T,E,E,I)}}else return;let g=new(Tu(d)?zs:Is)(d,1);g.version=y;let p=r.get(f);p&&t.remove(p),r.set(f,g)}function h(f){let d=r.get(f);if(d){let u=f.index;u!==null&&d.version<u.version&&c(f)}else c(f);return r.get(f)}return{get:a,update:l,getWireframeAttribute:h}}function O0(s,t,e){let i;function n(d){i=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,u){s.drawElements(i,u,r,d*o),e.update(u,i,1)}function c(d,u,x){x!==0&&(s.drawElementsInstanced(i,u,r,d*o,x),e.update(u,i,x))}function h(d,u,x){if(x===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,u,0,r,d,0,x);let g=0;for(let p=0;p<x;p++)g+=u[p];e.update(g,i,1)}function f(d,u,x,y){if(x===0)return;let g=t.get("WEBGL_multi_draw");if(g===null)for(let p=0;p<d.length;p++)c(d[p]/o,u[p],y[p]);else{g.multiDrawElementsInstancedWEBGL(i,u,0,r,d,0,y,0,x);let p=0;for(let _=0;_<x;_++)p+=u[_]*y[_];e.update(p,i,1)}}this.setMode=n,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=f}function B0(s){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,o,a){switch(e.calls++,o){case s.TRIANGLES:e.triangles+=a*(r/3);break;case s.LINES:e.lines+=a*(r/2);break;case s.LINE_STRIP:e.lines+=a*(r-1);break;case s.LINE_LOOP:e.lines+=a*r;break;case s.POINTS:e.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function n(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:n,update:i}}function H0(s,t,e){let i=new WeakMap,n=new Ee;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,f=h!==void 0?h.length:0,d=i.get(a);if(d===void 0||d.count!==f){let S=function(){E.dispose(),i.delete(a),a.removeEventListener("dispose",S)};d!==void 0&&d.texture.dispose();let u=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,y=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],_=a.morphAttributes.color||[],M=0;u===!0&&(M=1),x===!0&&(M=2),y===!0&&(M=3);let v=a.attributes.position.count*M,I=1;v>t.maxTextureSize&&(I=Math.ceil(v/t.maxTextureSize),v=t.maxTextureSize);let T=new Float32Array(v*I*4*f),E=new ro(T,v,I,f);E.type=Oi,E.needsUpdate=!0;let P=M*4;for(let w=0;w<f;w++){let z=g[w],k=p[w],U=_[w],H=v*I*4*w;for(let Y=0;Y<z.count;Y++){let W=Y*P;u===!0&&(n.fromBufferAttribute(z,Y),T[H+W+0]=n.x,T[H+W+1]=n.y,T[H+W+2]=n.z,T[H+W+3]=0),x===!0&&(n.fromBufferAttribute(k,Y),T[H+W+4]=n.x,T[H+W+5]=n.y,T[H+W+6]=n.z,T[H+W+7]=0),y===!0&&(n.fromBufferAttribute(U,Y),T[H+W+8]=n.x,T[H+W+9]=n.y,T[H+W+10]=n.z,T[H+W+11]=U.itemSize===4?n.w:1)}}d={count:f,texture:E,size:new se(v,I)},i.set(a,d),a.addEventListener("dispose",S)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(s,"morphTexture",o.morphTexture,e);else{let u=0;for(let y=0;y<c.length;y++)u+=c[y];let x=a.morphTargetsRelative?1:1-u;l.getUniforms().setValue(s,"morphTargetBaseInfluence",x),l.getUniforms().setValue(s,"morphTargetInfluences",c)}l.getUniforms().setValue(s,"morphTargetsTexture",d.texture,e),l.getUniforms().setValue(s,"morphTargetsTextureSize",d.size)}return{update:r}}function V0(s,t,e,i){let n=new WeakMap;function r(l){let c=i.render.frame,h=l.geometry,f=t.get(l,h);if(n.get(f)!==c&&(t.update(f),n.set(f,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),n.get(l)!==c&&(e.update(l.instanceMatrix,s.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,s.ARRAY_BUFFER),n.set(l,c))),l.isSkinnedMesh){let d=l.skeleton;n.get(d)!==c&&(d.update(),n.set(d,c))}return f}function o(){n=new WeakMap}function a(l){let c=l.target;c.removeEventListener("dispose",a),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:r,dispose:o}}var uo=class extends hi{constructor(t,e,i,n,r,o,a,l,c,h=ws){if(h!==ws&&h!==Ps)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&h===ws&&(i=jn),i===void 0&&h===Ps&&(i=Cs),super(null,n,r,o,a,l,h,i,c),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=a!==void 0?a:_i,this.minFilter=l!==void 0?l:_i,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}},Cu=new hi,Oh=new uo(1,1),Pu=new ro,Iu=new Nl,zu=new lo,Bh=[],Hh=[],Vh=new Float32Array(16),Gh=new Float32Array(9),Wh=new Float32Array(4);function ks(s,t,e){let i=s[0];if(i<=0||i>0)return s;let n=t*e,r=Bh[n];if(r===void 0&&(r=new Float32Array(n),Bh[n]=r),t!==0){i.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,s[o].toArray(r,a)}return r}function ke(s,t){if(s.length!==t.length)return!1;for(let e=0,i=s.length;e<i;e++)if(s[e]!==t[e])return!1;return!0}function Ne(s,t){for(let e=0,i=t.length;e<i;e++)s[e]=t[e]}function Co(s,t){let e=Hh[t];e===void 0&&(e=new Int32Array(t),Hh[t]=e);for(let i=0;i!==t;++i)e[i]=s.allocateTextureUnit();return e}function G0(s,t){let e=this.cache;e[0]!==t&&(s.uniform1f(this.addr,t),e[0]=t)}function W0(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(ke(e,t))return;s.uniform2fv(this.addr,t),Ne(e,t)}}function X0(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(s.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(ke(e,t))return;s.uniform3fv(this.addr,t),Ne(e,t)}}function q0(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(ke(e,t))return;s.uniform4fv(this.addr,t),Ne(e,t)}}function Y0(s,t){let e=this.cache,i=t.elements;if(i===void 0){if(ke(e,t))return;s.uniformMatrix2fv(this.addr,!1,t),Ne(e,t)}else{if(ke(e,i))return;Wh.set(i),s.uniformMatrix2fv(this.addr,!1,Wh),Ne(e,i)}}function Z0(s,t){let e=this.cache,i=t.elements;if(i===void 0){if(ke(e,t))return;s.uniformMatrix3fv(this.addr,!1,t),Ne(e,t)}else{if(ke(e,i))return;Gh.set(i),s.uniformMatrix3fv(this.addr,!1,Gh),Ne(e,i)}}function $0(s,t){let e=this.cache,i=t.elements;if(i===void 0){if(ke(e,t))return;s.uniformMatrix4fv(this.addr,!1,t),Ne(e,t)}else{if(ke(e,i))return;Vh.set(i),s.uniformMatrix4fv(this.addr,!1,Vh),Ne(e,i)}}function J0(s,t){let e=this.cache;e[0]!==t&&(s.uniform1i(this.addr,t),e[0]=t)}function K0(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(ke(e,t))return;s.uniform2iv(this.addr,t),Ne(e,t)}}function j0(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(ke(e,t))return;s.uniform3iv(this.addr,t),Ne(e,t)}}function Q0(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(ke(e,t))return;s.uniform4iv(this.addr,t),Ne(e,t)}}function tg(s,t){let e=this.cache;e[0]!==t&&(s.uniform1ui(this.addr,t),e[0]=t)}function eg(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(ke(e,t))return;s.uniform2uiv(this.addr,t),Ne(e,t)}}function ig(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(ke(e,t))return;s.uniform3uiv(this.addr,t),Ne(e,t)}}function ng(s,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(ke(e,t))return;s.uniform4uiv(this.addr,t),Ne(e,t)}}function sg(s,t,e){let i=this.cache,n=e.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n);let r;this.type===s.SAMPLER_2D_SHADOW?(Oh.compareFunction=Su,r=Oh):r=Cu,e.setTexture2D(t||r,n)}function rg(s,t,e){let i=this.cache,n=e.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),e.setTexture3D(t||Iu,n)}function og(s,t,e){let i=this.cache,n=e.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),e.setTextureCube(t||zu,n)}function ag(s,t,e){let i=this.cache,n=e.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),e.setTexture2DArray(t||Pu,n)}function lg(s){switch(s){case 5126:return G0;case 35664:return W0;case 35665:return X0;case 35666:return q0;case 35674:return Y0;case 35675:return Z0;case 35676:return $0;case 5124:case 35670:return J0;case 35667:case 35671:return K0;case 35668:case 35672:return j0;case 35669:case 35673:return Q0;case 5125:return tg;case 36294:return eg;case 36295:return ig;case 36296:return ng;case 35678:case 36198:case 36298:case 36306:case 35682:return sg;case 35679:case 36299:case 36307:return rg;case 35680:case 36300:case 36308:case 36293:return og;case 36289:case 36303:case 36311:case 36292:return ag}}function cg(s,t){s.uniform1fv(this.addr,t)}function hg(s,t){let e=ks(t,this.size,2);s.uniform2fv(this.addr,e)}function ug(s,t){let e=ks(t,this.size,3);s.uniform3fv(this.addr,e)}function fg(s,t){let e=ks(t,this.size,4);s.uniform4fv(this.addr,e)}function dg(s,t){let e=ks(t,this.size,4);s.uniformMatrix2fv(this.addr,!1,e)}function pg(s,t){let e=ks(t,this.size,9);s.uniformMatrix3fv(this.addr,!1,e)}function mg(s,t){let e=ks(t,this.size,16);s.uniformMatrix4fv(this.addr,!1,e)}function gg(s,t){s.uniform1iv(this.addr,t)}function xg(s,t){s.uniform2iv(this.addr,t)}function yg(s,t){s.uniform3iv(this.addr,t)}function vg(s,t){s.uniform4iv(this.addr,t)}function _g(s,t){s.uniform1uiv(this.addr,t)}function Mg(s,t){s.uniform2uiv(this.addr,t)}function bg(s,t){s.uniform3uiv(this.addr,t)}function wg(s,t){s.uniform4uiv(this.addr,t)}function Sg(s,t,e){let i=this.cache,n=t.length,r=Co(e,n);ke(i,r)||(s.uniform1iv(this.addr,r),Ne(i,r));for(let o=0;o!==n;++o)e.setTexture2D(t[o]||Cu,r[o])}function Tg(s,t,e){let i=this.cache,n=t.length,r=Co(e,n);ke(i,r)||(s.uniform1iv(this.addr,r),Ne(i,r));for(let o=0;o!==n;++o)e.setTexture3D(t[o]||Iu,r[o])}function Eg(s,t,e){let i=this.cache,n=t.length,r=Co(e,n);ke(i,r)||(s.uniform1iv(this.addr,r),Ne(i,r));for(let o=0;o!==n;++o)e.setTextureCube(t[o]||zu,r[o])}function Ag(s,t,e){let i=this.cache,n=t.length,r=Co(e,n);ke(i,r)||(s.uniform1iv(this.addr,r),Ne(i,r));for(let o=0;o!==n;++o)e.setTexture2DArray(t[o]||Pu,r[o])}function Rg(s){switch(s){case 5126:return cg;case 35664:return hg;case 35665:return ug;case 35666:return fg;case 35674:return dg;case 35675:return pg;case 35676:return mg;case 5124:case 35670:return gg;case 35667:case 35671:return xg;case 35668:case 35672:return yg;case 35669:case 35673:return vg;case 5125:return _g;case 36294:return Mg;case 36295:return bg;case 36296:return wg;case 35678:case 36198:case 36298:case 36306:case 35682:return Sg;case 35679:case 36299:case 36307:return Tg;case 35680:case 36300:case 36308:case 36293:return Eg;case 36289:case 36303:case 36311:case 36292:return Ag}}var Bl=class{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=lg(e.type)}},Hl=class{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Rg(e.type)}},Vl=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){let n=this.seq;for(let r=0,o=n.length;r!==o;++r){let a=n[r];a.setValue(t,e[a.id],i)}}},Xa=/(\w+)(\])?(\[|\.)?/g;function Xh(s,t){s.seq.push(t),s.map[t.id]=t}function Cg(s,t,e){let i=s.name,n=i.length;for(Xa.lastIndex=0;;){let r=Xa.exec(i),o=Xa.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===n){Xh(e,c===void 0?new Bl(a,s,t):new Hl(a,s,t));break}else{let f=e.map[a];f===void 0&&(f=new Vl(a),Xh(e,f)),e=f}}}var Ts=class{constructor(t,e){this.seq=[],this.map={};let i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let n=0;n<i;++n){let r=t.getActiveUniform(e,n),o=t.getUniformLocation(e,r.name);Cg(r,o,this)}}setValue(t,e,i,n){let r=this.map[e];r!==void 0&&r.setValue(t,i,n)}setOptional(t,e,i){let n=e[i];n!==void 0&&this.setValue(t,i,n)}static upload(t,e,i,n){for(let r=0,o=e.length;r!==o;++r){let a=e[r],l=i[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,n)}}static seqWithValue(t,e){let i=[];for(let n=0,r=t.length;n!==r;++n){let o=t[n];o.id in e&&i.push(o)}return i}};function qh(s,t,e){let i=s.createShader(t);return s.shaderSource(i,e),s.compileShader(i),i}var Pg=37297,Ig=0;function zg(s,t){let e=s.split(`
`),i=[],n=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=n;o<r;o++){let a=o+1;i.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return i.join(`
`)}var Yh=new Xt;function Lg(s){ae._getMatrix(Yh,ae.workingColorSpace,s);let t=`mat3( ${Yh.elements.map(e=>e.toFixed(4))} )`;switch(ae.getTransfer(s)){case Ro:return[t,"LinearTransferOETF"];case ge:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",s),[t,"LinearTransferOETF"]}}function Zh(s,t,e){let i=s.getShaderParameter(t,s.COMPILE_STATUS),n=s.getShaderInfoLog(t).trim();if(i&&n==="")return"";let r=/ERROR: 0:(\d+)/.exec(n);if(r){let o=parseInt(r[1]);return e.toUpperCase()+`

`+n+`

`+zg(s.getShaderSource(t),o)}else return n}function Dg(s,t){let e=Lg(t);return[`vec4 ${s}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function Ug(s,t){let e;switch(t){case ad:e="Linear";break;case ld:e="Reinhard";break;case cd:e="Cineon";break;case hd:e="ACESFilmic";break;case fd:e="AgX";break;case dd:e="Neutral";break;case ud:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+s+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var Gr=new D;function kg(){ae.getLuminanceCoefficients(Gr);let s=Gr.x.toFixed(4),t=Gr.y.toFixed(4),e=Gr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ng(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ir).join(`
`)}function Fg(s){let t=[];for(let e in s){let i=s[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function Og(s,t){let e={},i=s.getProgramParameter(t,s.ACTIVE_ATTRIBUTES);for(let n=0;n<i;n++){let r=s.getActiveAttrib(t,n),o=r.name,a=1;r.type===s.FLOAT_MAT2&&(a=2),r.type===s.FLOAT_MAT3&&(a=3),r.type===s.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:s.getAttribLocation(t,o),locationSize:a}}return e}function ir(s){return s!==""}function $h(s,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Jh(s,t){return s.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Bg=/^[ \t]*#include +<([\w\d./]+)>/gm;function Gl(s){return s.replace(Bg,Vg)}var Hg=new Map;function Vg(s,t){let e=jt[t];if(e===void 0){let i=Hg.get(t);if(i!==void 0)e=jt[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return Gl(e)}var Gg=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Kh(s){return s.replace(Gg,Wg)}function Wg(s,t,e,i){let n="";for(let r=parseInt(t);r<parseInt(e);r++)n+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return n}function jh(s){let t=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?t+=`
#define HIGH_PRECISION`:s.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function Xg(s){let t="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===Eo?t="SHADOWMAP_TYPE_PCF":s.shadowMapType===Bf?t="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===ji&&(t="SHADOWMAP_TYPE_VSM"),t}function qg(s){let t="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case As:case Rs:t="ENVMAP_TYPE_CUBE";break;case Ao:t="ENVMAP_TYPE_CUBE_UV";break}return t}function Yg(s){let t="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case Rs:t="ENVMAP_MODE_REFRACTION";break}return t}function Zg(s){let t="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case pc:t="ENVMAP_BLENDING_MULTIPLY";break;case rd:t="ENVMAP_BLENDING_MIX";break;case od:t="ENVMAP_BLENDING_ADD";break}return t}function $g(s){let t=s.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:i,maxMip:e}}function Jg(s,t,e,i){let n=s.getContext(),r=e.defines,o=e.vertexShader,a=e.fragmentShader,l=Xg(e),c=qg(e),h=Yg(e),f=Zg(e),d=$g(e),u=Ng(e),x=Fg(r),y=n.createProgram(),g,p,_=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(ir).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(ir).join(`
`),p.length>0&&(p+=`
`)):(g=[jh(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ir).join(`
`),p=[jh(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+f:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Rn?"#define TONE_MAPPING":"",e.toneMapping!==Rn?jt.tonemapping_pars_fragment:"",e.toneMapping!==Rn?Ug("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",jt.colorspace_pars_fragment,Dg("linearToOutputTexel",e.outputColorSpace),kg(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(ir).join(`
`)),o=Gl(o),o=$h(o,e),o=Jh(o,e),a=Gl(a),a=$h(a,e),a=Jh(a,e),o=Kh(o),a=Kh(a),e.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,g=[u,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",e.glslVersion===fh?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===fh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let M=_+g+o,v=_+p+a,I=qh(n,n.VERTEX_SHADER,M),T=qh(n,n.FRAGMENT_SHADER,v);n.attachShader(y,I),n.attachShader(y,T),e.index0AttributeName!==void 0?n.bindAttribLocation(y,0,e.index0AttributeName):e.morphTargets===!0&&n.bindAttribLocation(y,0,"position"),n.linkProgram(y);function E(z){if(s.debug.checkShaderErrors){let k=n.getProgramInfoLog(y).trim(),U=n.getShaderInfoLog(I).trim(),H=n.getShaderInfoLog(T).trim(),Y=!0,W=!0;if(n.getProgramParameter(y,n.LINK_STATUS)===!1)if(Y=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(n,y,I,T);else{let ot=Zh(n,I,"vertex"),$=Zh(n,T,"fragment");console.error("THREE.WebGLProgram: Shader Error "+n.getError()+" - VALIDATE_STATUS "+n.getProgramParameter(y,n.VALIDATE_STATUS)+`

Material Name: `+z.name+`
Material Type: `+z.type+`

Program Info Log: `+k+`
`+ot+`
`+$)}else k!==""?console.warn("THREE.WebGLProgram: Program Info Log:",k):(U===""||H==="")&&(W=!1);W&&(z.diagnostics={runnable:Y,programLog:k,vertexShader:{log:U,prefix:g},fragmentShader:{log:H,prefix:p}})}n.deleteShader(I),n.deleteShader(T),P=new Ts(n,y),S=Og(n,y)}let P;this.getUniforms=function(){return P===void 0&&E(this),P};let S;this.getAttributes=function(){return S===void 0&&E(this),S};let w=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return w===!1&&(w=n.getProgramParameter(y,Pg)),w},this.destroy=function(){i.releaseStatesOfProgram(this),n.deleteProgram(y),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Ig++,this.cacheKey=t,this.usedTimes=1,this.program=y,this.vertexShader=I,this.fragmentShader=T,this}var Kg=0,Wl=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){let e=t.vertexShader,i=t.fragmentShader,n=this._getShaderStage(e),r=this._getShaderStage(i),o=this._getShaderCacheForMaterial(t);return o.has(n)===!1&&(o.add(n),n.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){let e=this.shaderCache,i=e.get(t);return i===void 0&&(i=new Xl(t),e.set(t,i)),i}},Xl=class{constructor(t){this.id=Kg++,this.code=t,this.usedTimes=0}};function jg(s,t,e,i,n,r,o){let a=new oo,l=new Wl,c=new Set,h=[],f=n.logarithmicDepthBuffer,d=n.vertexTextures,u=n.precision,x={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function y(S){return c.add(S),S===0?"uv":`uv${S}`}function g(S,w,z,k,U){let H=k.fog,Y=U.geometry,W=S.isMeshStandardMaterial?k.environment:null,ot=(S.isMeshStandardMaterial?e:t).get(S.envMap||W),$=ot&&ot.mapping===Ao?ot.image.height:null,ut=x[S.type];S.precision!==null&&(u=n.getMaxPrecision(S.precision),u!==S.precision&&console.warn("THREE.WebGLProgram.getParameters:",S.precision,"not supported, using",u,"instead."));let gt=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,Rt=gt!==void 0?gt.length:0,Yt=0;Y.morphAttributes.position!==void 0&&(Yt=1),Y.morphAttributes.normal!==void 0&&(Yt=2),Y.morphAttributes.color!==void 0&&(Yt=3);let le,it,lt,At;if(ut){let pe=Fi[ut];le=pe.vertexShader,it=pe.fragmentShader}else le=S.vertexShader,it=S.fragmentShader,l.update(S),lt=l.getVertexShaderID(S),At=l.getFragmentShaderID(S);let dt=s.getRenderTarget(),kt=s.state.buffers.depth.getReversed(),Dt=U.isInstancedMesh===!0,Vt=U.isBatchedMesh===!0,ce=!!S.map,Gt=!!S.matcap,Re=!!ot,B=!!S.aoMap,R=!!S.lightMap,V=!!S.bumpMap,et=!!S.normalMap,Z=!!S.displacementMap,nt=!!S.emissiveMap,J=!!S.metalnessMap,A=!!S.roughnessMap,b=S.anisotropy>0,L=S.clearcoat>0,G=S.dispersion>0,K=S.iridescence>0,j=S.sheen>0,yt=S.transmission>0,st=b&&!!S.anisotropyMap,mt=L&&!!S.clearcoatMap,Zt=L&&!!S.clearcoatNormalMap,at=L&&!!S.clearcoatRoughnessMap,wt=K&&!!S.iridescenceMap,Nt=K&&!!S.iridescenceThicknessMap,Ot=j&&!!S.sheenColorMap,St=j&&!!S.sheenRoughnessMap,Qt=!!S.specularMap,Bt=!!S.specularColorMap,he=!!S.specularIntensityMap,N=yt&&!!S.transmissionMap,xt=yt&&!!S.thicknessMap,tt=!!S.gradientMap,rt=!!S.alphaMap,Mt=S.alphaTest>0,vt=!!S.alphaHash,$t=!!S.extensions,Ce=Rn;S.toneMapped&&(dt===null||dt.isXRRenderTarget===!0)&&(Ce=s.toneMapping);let Ze={shaderID:ut,shaderType:S.type,shaderName:S.name,vertexShader:le,fragmentShader:it,defines:S.defines,customVertexShaderID:lt,customFragmentShaderID:At,isRawShaderMaterial:S.isRawShaderMaterial===!0,glslVersion:S.glslVersion,precision:u,batching:Vt,batchingColor:Vt&&U._colorsTexture!==null,instancing:Dt,instancingColor:Dt&&U.instanceColor!==null,instancingMorph:Dt&&U.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:dt===null?s.outputColorSpace:dt.isXRRenderTarget===!0?dt.texture.colorSpace:Us,alphaToCoverage:!!S.alphaToCoverage,map:ce,matcap:Gt,envMap:Re,envMapMode:Re&&ot.mapping,envMapCubeUVHeight:$,aoMap:B,lightMap:R,bumpMap:V,normalMap:et,displacementMap:d&&Z,emissiveMap:nt,normalMapObjectSpace:et&&S.normalMapType===xd,normalMapTangentSpace:et&&S.normalMapType===wu,metalnessMap:J,roughnessMap:A,anisotropy:b,anisotropyMap:st,clearcoat:L,clearcoatMap:mt,clearcoatNormalMap:Zt,clearcoatRoughnessMap:at,dispersion:G,iridescence:K,iridescenceMap:wt,iridescenceThicknessMap:Nt,sheen:j,sheenColorMap:Ot,sheenRoughnessMap:St,specularMap:Qt,specularColorMap:Bt,specularIntensityMap:he,transmission:yt,transmissionMap:N,thicknessMap:xt,gradientMap:tt,opaque:S.transparent===!1&&S.blending===An&&S.alphaToCoverage===!1,alphaMap:rt,alphaTest:Mt,alphaHash:vt,combine:S.combine,mapUv:ce&&y(S.map.channel),aoMapUv:B&&y(S.aoMap.channel),lightMapUv:R&&y(S.lightMap.channel),bumpMapUv:V&&y(S.bumpMap.channel),normalMapUv:et&&y(S.normalMap.channel),displacementMapUv:Z&&y(S.displacementMap.channel),emissiveMapUv:nt&&y(S.emissiveMap.channel),metalnessMapUv:J&&y(S.metalnessMap.channel),roughnessMapUv:A&&y(S.roughnessMap.channel),anisotropyMapUv:st&&y(S.anisotropyMap.channel),clearcoatMapUv:mt&&y(S.clearcoatMap.channel),clearcoatNormalMapUv:Zt&&y(S.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:at&&y(S.clearcoatRoughnessMap.channel),iridescenceMapUv:wt&&y(S.iridescenceMap.channel),iridescenceThicknessMapUv:Nt&&y(S.iridescenceThicknessMap.channel),sheenColorMapUv:Ot&&y(S.sheenColorMap.channel),sheenRoughnessMapUv:St&&y(S.sheenRoughnessMap.channel),specularMapUv:Qt&&y(S.specularMap.channel),specularColorMapUv:Bt&&y(S.specularColorMap.channel),specularIntensityMapUv:he&&y(S.specularIntensityMap.channel),transmissionMapUv:N&&y(S.transmissionMap.channel),thicknessMapUv:xt&&y(S.thicknessMap.channel),alphaMapUv:rt&&y(S.alphaMap.channel),vertexTangents:!!Y.attributes.tangent&&(et||b),vertexColors:S.vertexColors,vertexAlphas:S.vertexColors===!0&&!!Y.attributes.color&&Y.attributes.color.itemSize===4,pointsUvs:U.isPoints===!0&&!!Y.attributes.uv&&(ce||rt),fog:!!H,useFog:S.fog===!0,fogExp2:!!H&&H.isFogExp2,flatShading:S.flatShading===!0,sizeAttenuation:S.sizeAttenuation===!0,logarithmicDepthBuffer:f,reverseDepthBuffer:kt,skinning:U.isSkinnedMesh===!0,morphTargets:Y.morphAttributes.position!==void 0,morphNormals:Y.morphAttributes.normal!==void 0,morphColors:Y.morphAttributes.color!==void 0,morphTargetsCount:Rt,morphTextureStride:Yt,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:S.dithering,shadowMapEnabled:s.shadowMap.enabled&&z.length>0,shadowMapType:s.shadowMap.type,toneMapping:Ce,decodeVideoTexture:ce&&S.map.isVideoTexture===!0&&ae.getTransfer(S.map.colorSpace)===ge,decodeVideoTextureEmissive:nt&&S.emissiveMap.isVideoTexture===!0&&ae.getTransfer(S.emissiveMap.colorSpace)===ge,premultipliedAlpha:S.premultipliedAlpha,doubleSided:S.side===Ge,flipSided:S.side===Ke,useDepthPacking:S.depthPacking>=0,depthPacking:S.depthPacking||0,index0AttributeName:S.index0AttributeName,extensionClipCullDistance:$t&&S.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:($t&&S.extensions.multiDraw===!0||Vt)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:S.customProgramCacheKey()};return Ze.vertexUv1s=c.has(1),Ze.vertexUv2s=c.has(2),Ze.vertexUv3s=c.has(3),c.clear(),Ze}function p(S){let w=[];if(S.shaderID?w.push(S.shaderID):(w.push(S.customVertexShaderID),w.push(S.customFragmentShaderID)),S.defines!==void 0)for(let z in S.defines)w.push(z),w.push(S.defines[z]);return S.isRawShaderMaterial===!1&&(_(w,S),M(w,S),w.push(s.outputColorSpace)),w.push(S.customProgramCacheKey),w.join()}function _(S,w){S.push(w.precision),S.push(w.outputColorSpace),S.push(w.envMapMode),S.push(w.envMapCubeUVHeight),S.push(w.mapUv),S.push(w.alphaMapUv),S.push(w.lightMapUv),S.push(w.aoMapUv),S.push(w.bumpMapUv),S.push(w.normalMapUv),S.push(w.displacementMapUv),S.push(w.emissiveMapUv),S.push(w.metalnessMapUv),S.push(w.roughnessMapUv),S.push(w.anisotropyMapUv),S.push(w.clearcoatMapUv),S.push(w.clearcoatNormalMapUv),S.push(w.clearcoatRoughnessMapUv),S.push(w.iridescenceMapUv),S.push(w.iridescenceThicknessMapUv),S.push(w.sheenColorMapUv),S.push(w.sheenRoughnessMapUv),S.push(w.specularMapUv),S.push(w.specularColorMapUv),S.push(w.specularIntensityMapUv),S.push(w.transmissionMapUv),S.push(w.thicknessMapUv),S.push(w.combine),S.push(w.fogExp2),S.push(w.sizeAttenuation),S.push(w.morphTargetsCount),S.push(w.morphAttributeCount),S.push(w.numDirLights),S.push(w.numPointLights),S.push(w.numSpotLights),S.push(w.numSpotLightMaps),S.push(w.numHemiLights),S.push(w.numRectAreaLights),S.push(w.numDirLightShadows),S.push(w.numPointLightShadows),S.push(w.numSpotLightShadows),S.push(w.numSpotLightShadowsWithMaps),S.push(w.numLightProbes),S.push(w.shadowMapType),S.push(w.toneMapping),S.push(w.numClippingPlanes),S.push(w.numClipIntersection),S.push(w.depthPacking)}function M(S,w){a.disableAll(),w.supportsVertexTextures&&a.enable(0),w.instancing&&a.enable(1),w.instancingColor&&a.enable(2),w.instancingMorph&&a.enable(3),w.matcap&&a.enable(4),w.envMap&&a.enable(5),w.normalMapObjectSpace&&a.enable(6),w.normalMapTangentSpace&&a.enable(7),w.clearcoat&&a.enable(8),w.iridescence&&a.enable(9),w.alphaTest&&a.enable(10),w.vertexColors&&a.enable(11),w.vertexAlphas&&a.enable(12),w.vertexUv1s&&a.enable(13),w.vertexUv2s&&a.enable(14),w.vertexUv3s&&a.enable(15),w.vertexTangents&&a.enable(16),w.anisotropy&&a.enable(17),w.alphaHash&&a.enable(18),w.batching&&a.enable(19),w.dispersion&&a.enable(20),w.batchingColor&&a.enable(21),S.push(a.mask),a.disableAll(),w.fog&&a.enable(0),w.useFog&&a.enable(1),w.flatShading&&a.enable(2),w.logarithmicDepthBuffer&&a.enable(3),w.reverseDepthBuffer&&a.enable(4),w.skinning&&a.enable(5),w.morphTargets&&a.enable(6),w.morphNormals&&a.enable(7),w.morphColors&&a.enable(8),w.premultipliedAlpha&&a.enable(9),w.shadowMapEnabled&&a.enable(10),w.doubleSided&&a.enable(11),w.flipSided&&a.enable(12),w.useDepthPacking&&a.enable(13),w.dithering&&a.enable(14),w.transmission&&a.enable(15),w.sheen&&a.enable(16),w.opaque&&a.enable(17),w.pointsUvs&&a.enable(18),w.decodeVideoTexture&&a.enable(19),w.decodeVideoTextureEmissive&&a.enable(20),w.alphaToCoverage&&a.enable(21),S.push(a.mask)}function v(S){let w=x[S.type],z;if(w){let k=Fi[w];z=bc.clone(k.uniforms)}else z=S.uniforms;return z}function I(S,w){let z;for(let k=0,U=h.length;k<U;k++){let H=h[k];if(H.cacheKey===w){z=H,++z.usedTimes;break}}return z===void 0&&(z=new Jg(s,w,S,r),h.push(z)),z}function T(S){if(--S.usedTimes===0){let w=h.indexOf(S);h[w]=h[h.length-1],h.pop(),S.destroy()}}function E(S){l.remove(S)}function P(){l.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:v,acquireProgram:I,releaseProgram:T,releaseShaderCache:E,programs:h,dispose:P}}function Qg(){let s=new WeakMap;function t(o){return s.has(o)}function e(o){let a=s.get(o);return a===void 0&&(a={},s.set(o,a)),a}function i(o){s.delete(o)}function n(o,a,l){s.get(o)[a]=l}function r(){s=new WeakMap}return{has:t,get:e,remove:i,update:n,dispose:r}}function tx(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.material.id!==t.material.id?s.material.id-t.material.id:s.z!==t.z?s.z-t.z:s.id-t.id}function Qh(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.z!==t.z?t.z-s.z:s.id-t.id}function tu(){let s=[],t=0,e=[],i=[],n=[];function r(){t=0,e.length=0,i.length=0,n.length=0}function o(f,d,u,x,y,g){let p=s[t];return p===void 0?(p={id:f.id,object:f,geometry:d,material:u,groupOrder:x,renderOrder:f.renderOrder,z:y,group:g},s[t]=p):(p.id=f.id,p.object=f,p.geometry=d,p.material=u,p.groupOrder=x,p.renderOrder=f.renderOrder,p.z=y,p.group=g),t++,p}function a(f,d,u,x,y,g){let p=o(f,d,u,x,y,g);u.transmission>0?i.push(p):u.transparent===!0?n.push(p):e.push(p)}function l(f,d,u,x,y,g){let p=o(f,d,u,x,y,g);u.transmission>0?i.unshift(p):u.transparent===!0?n.unshift(p):e.unshift(p)}function c(f,d){e.length>1&&e.sort(f||tx),i.length>1&&i.sort(d||Qh),n.length>1&&n.sort(d||Qh)}function h(){for(let f=t,d=s.length;f<d;f++){let u=s[f];if(u.id===null)break;u.id=null,u.object=null,u.geometry=null,u.material=null,u.group=null}}return{opaque:e,transmissive:i,transparent:n,init:r,push:a,unshift:l,finish:h,sort:c}}function ex(){let s=new WeakMap;function t(i,n){let r=s.get(i),o;return r===void 0?(o=new tu,s.set(i,[o])):n>=r.length?(o=new tu,r.push(o)):o=r[n],o}function e(){s=new WeakMap}return{get:t,dispose:e}}function ix(){let s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new D,color:new ct};break;case"SpotLight":e={position:new D,direction:new D,color:new ct,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new D,color:new ct,distance:0,decay:0};break;case"HemisphereLight":e={direction:new D,skyColor:new ct,groundColor:new ct};break;case"RectAreaLight":e={color:new ct,position:new D,halfWidth:new D,halfHeight:new D};break}return s[t.id]=e,e}}}function nx(){let s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new se};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new se};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new se,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[t.id]=e,e}}}var sx=0;function rx(s,t){return(t.castShadow?2:0)-(s.castShadow?2:0)+(t.map?1:0)-(s.map?1:0)}function ox(s){let t=new ix,e=nx(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new D);let n=new D,r=new Tt,o=new Tt;function a(c){let h=0,f=0,d=0;for(let S=0;S<9;S++)i.probe[S].set(0,0,0);let u=0,x=0,y=0,g=0,p=0,_=0,M=0,v=0,I=0,T=0,E=0;c.sort(rx);for(let S=0,w=c.length;S<w;S++){let z=c[S],k=z.color,U=z.intensity,H=z.distance,Y=z.shadow&&z.shadow.map?z.shadow.map.texture:null;if(z.isAmbientLight)h+=k.r*U,f+=k.g*U,d+=k.b*U;else if(z.isLightProbe){for(let W=0;W<9;W++)i.probe[W].addScaledVector(z.sh.coefficients[W],U);E++}else if(z.isDirectionalLight){let W=t.get(z);if(W.color.copy(z.color).multiplyScalar(z.intensity),z.castShadow){let ot=z.shadow,$=e.get(z);$.shadowIntensity=ot.intensity,$.shadowBias=ot.bias,$.shadowNormalBias=ot.normalBias,$.shadowRadius=ot.radius,$.shadowMapSize=ot.mapSize,i.directionalShadow[u]=$,i.directionalShadowMap[u]=Y,i.directionalShadowMatrix[u]=z.shadow.matrix,_++}i.directional[u]=W,u++}else if(z.isSpotLight){let W=t.get(z);W.position.setFromMatrixPosition(z.matrixWorld),W.color.copy(k).multiplyScalar(U),W.distance=H,W.coneCos=Math.cos(z.angle),W.penumbraCos=Math.cos(z.angle*(1-z.penumbra)),W.decay=z.decay,i.spot[y]=W;let ot=z.shadow;if(z.map&&(i.spotLightMap[I]=z.map,I++,ot.updateMatrices(z),z.castShadow&&T++),i.spotLightMatrix[y]=ot.matrix,z.castShadow){let $=e.get(z);$.shadowIntensity=ot.intensity,$.shadowBias=ot.bias,$.shadowNormalBias=ot.normalBias,$.shadowRadius=ot.radius,$.shadowMapSize=ot.mapSize,i.spotShadow[y]=$,i.spotShadowMap[y]=Y,v++}y++}else if(z.isRectAreaLight){let W=t.get(z);W.color.copy(k).multiplyScalar(U),W.halfWidth.set(z.width*.5,0,0),W.halfHeight.set(0,z.height*.5,0),i.rectArea[g]=W,g++}else if(z.isPointLight){let W=t.get(z);if(W.color.copy(z.color).multiplyScalar(z.intensity),W.distance=z.distance,W.decay=z.decay,z.castShadow){let ot=z.shadow,$=e.get(z);$.shadowIntensity=ot.intensity,$.shadowBias=ot.bias,$.shadowNormalBias=ot.normalBias,$.shadowRadius=ot.radius,$.shadowMapSize=ot.mapSize,$.shadowCameraNear=ot.camera.near,$.shadowCameraFar=ot.camera.far,i.pointShadow[x]=$,i.pointShadowMap[x]=Y,i.pointShadowMatrix[x]=z.shadow.matrix,M++}i.point[x]=W,x++}else if(z.isHemisphereLight){let W=t.get(z);W.skyColor.copy(z.color).multiplyScalar(U),W.groundColor.copy(z.groundColor).multiplyScalar(U),i.hemi[p]=W,p++}}g>0&&(s.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ft.LTC_FLOAT_1,i.rectAreaLTC2=ft.LTC_FLOAT_2):(i.rectAreaLTC1=ft.LTC_HALF_1,i.rectAreaLTC2=ft.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=f,i.ambient[2]=d;let P=i.hash;(P.directionalLength!==u||P.pointLength!==x||P.spotLength!==y||P.rectAreaLength!==g||P.hemiLength!==p||P.numDirectionalShadows!==_||P.numPointShadows!==M||P.numSpotShadows!==v||P.numSpotMaps!==I||P.numLightProbes!==E)&&(i.directional.length=u,i.spot.length=y,i.rectArea.length=g,i.point.length=x,i.hemi.length=p,i.directionalShadow.length=_,i.directionalShadowMap.length=_,i.pointShadow.length=M,i.pointShadowMap.length=M,i.spotShadow.length=v,i.spotShadowMap.length=v,i.directionalShadowMatrix.length=_,i.pointShadowMatrix.length=M,i.spotLightMatrix.length=v+I-T,i.spotLightMap.length=I,i.numSpotLightShadowsWithMaps=T,i.numLightProbes=E,P.directionalLength=u,P.pointLength=x,P.spotLength=y,P.rectAreaLength=g,P.hemiLength=p,P.numDirectionalShadows=_,P.numPointShadows=M,P.numSpotShadows=v,P.numSpotMaps=I,P.numLightProbes=E,i.version=sx++)}function l(c,h){let f=0,d=0,u=0,x=0,y=0,g=h.matrixWorldInverse;for(let p=0,_=c.length;p<_;p++){let M=c[p];if(M.isDirectionalLight){let v=i.directional[f];v.direction.setFromMatrixPosition(M.matrixWorld),n.setFromMatrixPosition(M.target.matrixWorld),v.direction.sub(n),v.direction.transformDirection(g),f++}else if(M.isSpotLight){let v=i.spot[u];v.position.setFromMatrixPosition(M.matrixWorld),v.position.applyMatrix4(g),v.direction.setFromMatrixPosition(M.matrixWorld),n.setFromMatrixPosition(M.target.matrixWorld),v.direction.sub(n),v.direction.transformDirection(g),u++}else if(M.isRectAreaLight){let v=i.rectArea[x];v.position.setFromMatrixPosition(M.matrixWorld),v.position.applyMatrix4(g),o.identity(),r.copy(M.matrixWorld),r.premultiply(g),o.extractRotation(r),v.halfWidth.set(M.width*.5,0,0),v.halfHeight.set(0,M.height*.5,0),v.halfWidth.applyMatrix4(o),v.halfHeight.applyMatrix4(o),x++}else if(M.isPointLight){let v=i.point[d];v.position.setFromMatrixPosition(M.matrixWorld),v.position.applyMatrix4(g),d++}else if(M.isHemisphereLight){let v=i.hemi[y];v.direction.setFromMatrixPosition(M.matrixWorld),v.direction.transformDirection(g),y++}}}return{setup:a,setupView:l,state:i}}function eu(s){let t=new ox(s),e=[],i=[];function n(h){c.camera=h,e.length=0,i.length=0}function r(h){e.push(h)}function o(h){i.push(h)}function a(){t.setup(e)}function l(h){t.setupView(e,h)}let c={lightsArray:e,shadowsArray:i,camera:null,lights:t,transmissionRenderTarget:{}};return{init:n,state:c,setupLights:a,setupLightsView:l,pushLight:r,pushShadow:o}}function ax(s){let t=new WeakMap;function e(n,r=0){let o=t.get(n),a;return o===void 0?(a=new eu(s),t.set(n,[a])):r>=o.length?(a=new eu(s),o.push(a)):a=o[r],a}function i(){t=new WeakMap}return{get:e,dispose:i}}var ql=class extends ln{static get type(){return"MeshDepthMaterial"}constructor(t){super(),this.isMeshDepthMaterial=!0,this.depthPacking=md,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},Yl=class extends ln{static get type(){return"MeshDistanceMaterial"}constructor(t){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}},lx=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,cx=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function hx(s,t,e){let i=new or,n=new se,r=new se,o=new Ee,a=new ql({depthPacking:gd}),l=new Yl,c={},h=e.maxTextureSize,f={[Cn]:Ke,[Ke]:Cn,[Ge]:Ge},d=new Pe({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new se},radius:{value:4}},vertexShader:lx,fragmentShader:cx}),u=d.clone();u.defines.HORIZONTAL_PASS=1;let x=new xe;x.setAttribute("position",new ne(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new Kt(x,d),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Eo;let p=this.type;this.render=function(T,E,P){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||T.length===0)return;let S=s.getRenderTarget(),w=s.getActiveCubeFace(),z=s.getActiveMipmapLevel(),k=s.state;k.setBlending(En),k.buffers.color.setClear(1,1,1,1),k.buffers.depth.setTest(!0),k.setScissorTest(!1);let U=p!==ji&&this.type===ji,H=p===ji&&this.type!==ji;for(let Y=0,W=T.length;Y<W;Y++){let ot=T[Y],$=ot.shadow;if($===void 0){console.warn("THREE.WebGLShadowMap:",ot,"has no shadow.");continue}if($.autoUpdate===!1&&$.needsUpdate===!1)continue;n.copy($.mapSize);let ut=$.getFrameExtents();if(n.multiply(ut),r.copy($.mapSize),(n.x>h||n.y>h)&&(n.x>h&&(r.x=Math.floor(h/ut.x),n.x=r.x*ut.x,$.mapSize.x=r.x),n.y>h&&(r.y=Math.floor(h/ut.y),n.y=r.y*ut.y,$.mapSize.y=r.y)),$.map===null||U===!0||H===!0){let Rt=this.type!==ji?{minFilter:_i,magFilter:_i}:{};$.map!==null&&$.map.dispose(),$.map=new rn(n.x,n.y,Rt),$.map.texture.name=ot.name+".shadowMap",$.camera.updateProjectionMatrix()}s.setRenderTarget($.map),s.clear();let gt=$.getViewportCount();for(let Rt=0;Rt<gt;Rt++){let Yt=$.getViewport(Rt);o.set(r.x*Yt.x,r.y*Yt.y,r.x*Yt.z,r.y*Yt.w),k.viewport(o),$.updateMatrices(ot,Rt),i=$.getFrustum(),v(E,P,$.camera,ot,this.type)}$.isPointLightShadow!==!0&&this.type===ji&&_($,P),$.needsUpdate=!1}p=this.type,g.needsUpdate=!1,s.setRenderTarget(S,w,z)};function _(T,E){let P=t.update(y);d.defines.VSM_SAMPLES!==T.blurSamples&&(d.defines.VSM_SAMPLES=T.blurSamples,u.defines.VSM_SAMPLES=T.blurSamples,d.needsUpdate=!0,u.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new rn(n.x,n.y)),d.uniforms.shadow_pass.value=T.map.texture,d.uniforms.resolution.value=T.mapSize,d.uniforms.radius.value=T.radius,s.setRenderTarget(T.mapPass),s.clear(),s.renderBufferDirect(E,null,P,d,y,null),u.uniforms.shadow_pass.value=T.mapPass.texture,u.uniforms.resolution.value=T.mapSize,u.uniforms.radius.value=T.radius,s.setRenderTarget(T.map),s.clear(),s.renderBufferDirect(E,null,P,u,y,null)}function M(T,E,P,S){let w=null,z=P.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(z!==void 0)w=z;else if(w=P.isPointLight===!0?l:a,s.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0){let k=w.uuid,U=E.uuid,H=c[k];H===void 0&&(H={},c[k]=H);let Y=H[U];Y===void 0&&(Y=w.clone(),H[U]=Y,E.addEventListener("dispose",I)),w=Y}if(w.visible=E.visible,w.wireframe=E.wireframe,S===ji?w.side=E.shadowSide!==null?E.shadowSide:E.side:w.side=E.shadowSide!==null?E.shadowSide:f[E.side],w.alphaMap=E.alphaMap,w.alphaTest=E.alphaTest,w.map=E.map,w.clipShadows=E.clipShadows,w.clippingPlanes=E.clippingPlanes,w.clipIntersection=E.clipIntersection,w.displacementMap=E.displacementMap,w.displacementScale=E.displacementScale,w.displacementBias=E.displacementBias,w.wireframeLinewidth=E.wireframeLinewidth,w.linewidth=E.linewidth,P.isPointLight===!0&&w.isMeshDistanceMaterial===!0){let k=s.properties.get(w);k.light=P}return w}function v(T,E,P,S,w){if(T.visible===!1)return;if(T.layers.test(E.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&w===ji)&&(!T.frustumCulled||i.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(P.matrixWorldInverse,T.matrixWorld);let U=t.update(T),H=T.material;if(Array.isArray(H)){let Y=U.groups;for(let W=0,ot=Y.length;W<ot;W++){let $=Y[W],ut=H[$.materialIndex];if(ut&&ut.visible){let gt=M(T,ut,S,w);T.onBeforeShadow(s,T,E,P,U,gt,$),s.renderBufferDirect(P,null,U,gt,T,$),T.onAfterShadow(s,T,E,P,U,gt,$)}}}else if(H.visible){let Y=M(T,H,S,w);T.onBeforeShadow(s,T,E,P,U,Y,null),s.renderBufferDirect(P,null,U,Y,T,null),T.onAfterShadow(s,T,E,P,U,Y,null)}}let k=T.children;for(let U=0,H=k.length;U<H;U++)v(k[U],E,P,S,w)}function I(T){T.target.removeEventListener("dispose",I);for(let P in c){let S=c[P],w=T.target.uuid;w in S&&(S[w].dispose(),delete S[w])}}}var ux={[Ja]:Ka,[ja]:el,[Qa]:il,[Es]:tl,[Ka]:Ja,[el]:ja,[il]:Qa,[tl]:Es};function fx(s,t){function e(){let N=!1,xt=new Ee,tt=null,rt=new Ee(0,0,0,0);return{setMask:function(Mt){tt!==Mt&&!N&&(s.colorMask(Mt,Mt,Mt,Mt),tt=Mt)},setLocked:function(Mt){N=Mt},setClear:function(Mt,vt,$t,Ce,Ze){Ze===!0&&(Mt*=Ce,vt*=Ce,$t*=Ce),xt.set(Mt,vt,$t,Ce),rt.equals(xt)===!1&&(s.clearColor(Mt,vt,$t,Ce),rt.copy(xt))},reset:function(){N=!1,tt=null,rt.set(-1,0,0,0)}}}function i(){let N=!1,xt=!1,tt=null,rt=null,Mt=null;return{setReversed:function(vt){if(xt!==vt){let $t=t.get("EXT_clip_control");xt?$t.clipControlEXT($t.LOWER_LEFT_EXT,$t.ZERO_TO_ONE_EXT):$t.clipControlEXT($t.LOWER_LEFT_EXT,$t.NEGATIVE_ONE_TO_ONE_EXT);let Ce=Mt;Mt=null,this.setClear(Ce)}xt=vt},getReversed:function(){return xt},setTest:function(vt){vt?dt(s.DEPTH_TEST):kt(s.DEPTH_TEST)},setMask:function(vt){tt!==vt&&!N&&(s.depthMask(vt),tt=vt)},setFunc:function(vt){if(xt&&(vt=ux[vt]),rt!==vt){switch(vt){case Ja:s.depthFunc(s.NEVER);break;case Ka:s.depthFunc(s.ALWAYS);break;case ja:s.depthFunc(s.LESS);break;case Es:s.depthFunc(s.LEQUAL);break;case Qa:s.depthFunc(s.EQUAL);break;case tl:s.depthFunc(s.GEQUAL);break;case el:s.depthFunc(s.GREATER);break;case il:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}rt=vt}},setLocked:function(vt){N=vt},setClear:function(vt){Mt!==vt&&(xt&&(vt=1-vt),s.clearDepth(vt),Mt=vt)},reset:function(){N=!1,tt=null,rt=null,Mt=null,xt=!1}}}function n(){let N=!1,xt=null,tt=null,rt=null,Mt=null,vt=null,$t=null,Ce=null,Ze=null;return{setTest:function(pe){N||(pe?dt(s.STENCIL_TEST):kt(s.STENCIL_TEST))},setMask:function(pe){xt!==pe&&!N&&(s.stencilMask(pe),xt=pe)},setFunc:function(pe,Ci,Xi){(tt!==pe||rt!==Ci||Mt!==Xi)&&(s.stencilFunc(pe,Ci,Xi),tt=pe,rt=Ci,Mt=Xi)},setOp:function(pe,Ci,Xi){(vt!==pe||$t!==Ci||Ce!==Xi)&&(s.stencilOp(pe,Ci,Xi),vt=pe,$t=Ci,Ce=Xi)},setLocked:function(pe){N=pe},setClear:function(pe){Ze!==pe&&(s.clearStencil(pe),Ze=pe)},reset:function(){N=!1,xt=null,tt=null,rt=null,Mt=null,vt=null,$t=null,Ce=null,Ze=null}}}let r=new e,o=new i,a=new n,l=new WeakMap,c=new WeakMap,h={},f={},d=new WeakMap,u=[],x=null,y=!1,g=null,p=null,_=null,M=null,v=null,I=null,T=null,E=new ct(0,0,0),P=0,S=!1,w=null,z=null,k=null,U=null,H=null,Y=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS),W=!1,ot=0,$=s.getParameter(s.VERSION);$.indexOf("WebGL")!==-1?(ot=parseFloat(/^WebGL (\d)/.exec($)[1]),W=ot>=1):$.indexOf("OpenGL ES")!==-1&&(ot=parseFloat(/^OpenGL ES (\d)/.exec($)[1]),W=ot>=2);let ut=null,gt={},Rt=s.getParameter(s.SCISSOR_BOX),Yt=s.getParameter(s.VIEWPORT),le=new Ee().fromArray(Rt),it=new Ee().fromArray(Yt);function lt(N,xt,tt,rt){let Mt=new Uint8Array(4),vt=s.createTexture();s.bindTexture(N,vt),s.texParameteri(N,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(N,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let $t=0;$t<tt;$t++)N===s.TEXTURE_3D||N===s.TEXTURE_2D_ARRAY?s.texImage3D(xt,0,s.RGBA,1,1,rt,0,s.RGBA,s.UNSIGNED_BYTE,Mt):s.texImage2D(xt+$t,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,Mt);return vt}let At={};At[s.TEXTURE_2D]=lt(s.TEXTURE_2D,s.TEXTURE_2D,1),At[s.TEXTURE_CUBE_MAP]=lt(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),At[s.TEXTURE_2D_ARRAY]=lt(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),At[s.TEXTURE_3D]=lt(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),dt(s.DEPTH_TEST),o.setFunc(Es),V(!1),et(sh),dt(s.CULL_FACE),B(En);function dt(N){h[N]!==!0&&(s.enable(N),h[N]=!0)}function kt(N){h[N]!==!1&&(s.disable(N),h[N]=!1)}function Dt(N,xt){return f[N]!==xt?(s.bindFramebuffer(N,xt),f[N]=xt,N===s.DRAW_FRAMEBUFFER&&(f[s.FRAMEBUFFER]=xt),N===s.FRAMEBUFFER&&(f[s.DRAW_FRAMEBUFFER]=xt),!0):!1}function Vt(N,xt){let tt=u,rt=!1;if(N){tt=d.get(xt),tt===void 0&&(tt=[],d.set(xt,tt));let Mt=N.textures;if(tt.length!==Mt.length||tt[0]!==s.COLOR_ATTACHMENT0){for(let vt=0,$t=Mt.length;vt<$t;vt++)tt[vt]=s.COLOR_ATTACHMENT0+vt;tt.length=Mt.length,rt=!0}}else tt[0]!==s.BACK&&(tt[0]=s.BACK,rt=!0);rt&&s.drawBuffers(tt)}function ce(N){return x!==N?(s.useProgram(N),x=N,!0):!1}let Gt={[$n]:s.FUNC_ADD,[Vf]:s.FUNC_SUBTRACT,[Gf]:s.FUNC_REVERSE_SUBTRACT};Gt[Wf]=s.MIN,Gt[Xf]=s.MAX;let Re={[qf]:s.ZERO,[Yf]:s.ONE,[Zf]:s.SRC_COLOR,[Za]:s.SRC_ALPHA,[td]:s.SRC_ALPHA_SATURATE,[jf]:s.DST_COLOR,[Jf]:s.DST_ALPHA,[$f]:s.ONE_MINUS_SRC_COLOR,[$a]:s.ONE_MINUS_SRC_ALPHA,[Qf]:s.ONE_MINUS_DST_COLOR,[Kf]:s.ONE_MINUS_DST_ALPHA,[ed]:s.CONSTANT_COLOR,[id]:s.ONE_MINUS_CONSTANT_COLOR,[nd]:s.CONSTANT_ALPHA,[sd]:s.ONE_MINUS_CONSTANT_ALPHA};function B(N,xt,tt,rt,Mt,vt,$t,Ce,Ze,pe){if(N===En){y===!0&&(kt(s.BLEND),y=!1);return}if(y===!1&&(dt(s.BLEND),y=!0),N!==Hf){if(N!==g||pe!==S){if((p!==$n||v!==$n)&&(s.blendEquation(s.FUNC_ADD),p=$n,v=$n),pe)switch(N){case An:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ei:s.blendFunc(s.ONE,s.ONE);break;case rh:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case oh:s.blendFuncSeparate(s.ZERO,s.SRC_COLOR,s.ZERO,s.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}else switch(N){case An:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ei:s.blendFunc(s.SRC_ALPHA,s.ONE);break;case rh:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case oh:s.blendFunc(s.ZERO,s.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}_=null,M=null,I=null,T=null,E.set(0,0,0),P=0,g=N,S=pe}return}Mt=Mt||xt,vt=vt||tt,$t=$t||rt,(xt!==p||Mt!==v)&&(s.blendEquationSeparate(Gt[xt],Gt[Mt]),p=xt,v=Mt),(tt!==_||rt!==M||vt!==I||$t!==T)&&(s.blendFuncSeparate(Re[tt],Re[rt],Re[vt],Re[$t]),_=tt,M=rt,I=vt,T=$t),(Ce.equals(E)===!1||Ze!==P)&&(s.blendColor(Ce.r,Ce.g,Ce.b,Ze),E.copy(Ce),P=Ze),g=N,S=!1}function R(N,xt){N.side===Ge?kt(s.CULL_FACE):dt(s.CULL_FACE);let tt=N.side===Ke;xt&&(tt=!tt),V(tt),N.blending===An&&N.transparent===!1?B(En):B(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),r.setMask(N.colorWrite);let rt=N.stencilWrite;a.setTest(rt),rt&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),nt(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?dt(s.SAMPLE_ALPHA_TO_COVERAGE):kt(s.SAMPLE_ALPHA_TO_COVERAGE)}function V(N){w!==N&&(N?s.frontFace(s.CW):s.frontFace(s.CCW),w=N)}function et(N){N!==Ff?(dt(s.CULL_FACE),N!==z&&(N===sh?s.cullFace(s.BACK):N===Of?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):kt(s.CULL_FACE),z=N}function Z(N){N!==k&&(W&&s.lineWidth(N),k=N)}function nt(N,xt,tt){N?(dt(s.POLYGON_OFFSET_FILL),(U!==xt||H!==tt)&&(s.polygonOffset(xt,tt),U=xt,H=tt)):kt(s.POLYGON_OFFSET_FILL)}function J(N){N?dt(s.SCISSOR_TEST):kt(s.SCISSOR_TEST)}function A(N){N===void 0&&(N=s.TEXTURE0+Y-1),ut!==N&&(s.activeTexture(N),ut=N)}function b(N,xt,tt){tt===void 0&&(ut===null?tt=s.TEXTURE0+Y-1:tt=ut);let rt=gt[tt];rt===void 0&&(rt={type:void 0,texture:void 0},gt[tt]=rt),(rt.type!==N||rt.texture!==xt)&&(ut!==tt&&(s.activeTexture(tt),ut=tt),s.bindTexture(N,xt||At[N]),rt.type=N,rt.texture=xt)}function L(){let N=gt[ut];N!==void 0&&N.type!==void 0&&(s.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function G(){try{s.compressedTexImage2D.apply(s,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function K(){try{s.compressedTexImage3D.apply(s,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function j(){try{s.texSubImage2D.apply(s,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function yt(){try{s.texSubImage3D.apply(s,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function st(){try{s.compressedTexSubImage2D.apply(s,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function mt(){try{s.compressedTexSubImage3D.apply(s,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Zt(){try{s.texStorage2D.apply(s,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function at(){try{s.texStorage3D.apply(s,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function wt(){try{s.texImage2D.apply(s,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Nt(){try{s.texImage3D.apply(s,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Ot(N){le.equals(N)===!1&&(s.scissor(N.x,N.y,N.z,N.w),le.copy(N))}function St(N){it.equals(N)===!1&&(s.viewport(N.x,N.y,N.z,N.w),it.copy(N))}function Qt(N,xt){let tt=c.get(xt);tt===void 0&&(tt=new WeakMap,c.set(xt,tt));let rt=tt.get(N);rt===void 0&&(rt=s.getUniformBlockIndex(xt,N.name),tt.set(N,rt))}function Bt(N,xt){let rt=c.get(xt).get(N);l.get(xt)!==rt&&(s.uniformBlockBinding(xt,rt,N.__bindingPointIndex),l.set(xt,rt))}function he(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),o.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),h={},ut=null,gt={},f={},d=new WeakMap,u=[],x=null,y=!1,g=null,p=null,_=null,M=null,v=null,I=null,T=null,E=new ct(0,0,0),P=0,S=!1,w=null,z=null,k=null,U=null,H=null,le.set(0,0,s.canvas.width,s.canvas.height),it.set(0,0,s.canvas.width,s.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:dt,disable:kt,bindFramebuffer:Dt,drawBuffers:Vt,useProgram:ce,setBlending:B,setMaterial:R,setFlipSided:V,setCullFace:et,setLineWidth:Z,setPolygonOffset:nt,setScissorTest:J,activeTexture:A,bindTexture:b,unbindTexture:L,compressedTexImage2D:G,compressedTexImage3D:K,texImage2D:wt,texImage3D:Nt,updateUBOMapping:Qt,uniformBlockBinding:Bt,texStorage2D:Zt,texStorage3D:at,texSubImage2D:j,texSubImage3D:yt,compressedTexSubImage2D:st,compressedTexSubImage3D:mt,scissor:Ot,viewport:St,reset:he}}function iu(s,t,e,i){let n=dx(i);switch(e){case xu:return s*t;case vu:return s*t;case _u:return s*t*2;case yc:return s*t/n.components*n.byteLength;case vc:return s*t/n.components*n.byteLength;case Mu:return s*t*2/n.components*n.byteLength;case _c:return s*t*2/n.components*n.byteLength;case yu:return s*t*3/n.components*n.byteLength;case vi:return s*t*4/n.components*n.byteLength;case Mc:return s*t*4/n.components*n.byteLength;case Jr:case Kr:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case jr:case Qr:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case ll:case hl:return Math.max(s,16)*Math.max(t,8)/4;case al:case cl:return Math.max(s,8)*Math.max(t,8)/2;case ul:case fl:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case dl:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case pl:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case ml:return Math.floor((s+4)/5)*Math.floor((t+3)/4)*16;case gl:return Math.floor((s+4)/5)*Math.floor((t+4)/5)*16;case xl:return Math.floor((s+5)/6)*Math.floor((t+4)/5)*16;case yl:return Math.floor((s+5)/6)*Math.floor((t+5)/6)*16;case vl:return Math.floor((s+7)/8)*Math.floor((t+4)/5)*16;case _l:return Math.floor((s+7)/8)*Math.floor((t+5)/6)*16;case Ml:return Math.floor((s+7)/8)*Math.floor((t+7)/8)*16;case bl:return Math.floor((s+9)/10)*Math.floor((t+4)/5)*16;case wl:return Math.floor((s+9)/10)*Math.floor((t+5)/6)*16;case Sl:return Math.floor((s+9)/10)*Math.floor((t+7)/8)*16;case Tl:return Math.floor((s+9)/10)*Math.floor((t+9)/10)*16;case El:return Math.floor((s+11)/12)*Math.floor((t+9)/10)*16;case Al:return Math.floor((s+11)/12)*Math.floor((t+11)/12)*16;case to:case Rl:case Cl:return Math.ceil(s/4)*Math.ceil(t/4)*16;case bu:case Pl:return Math.ceil(s/4)*Math.ceil(t/4)*8;case Il:case zl:return Math.ceil(s/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function dx(s){switch(s){case Di:case pu:return{byteLength:1,components:1};case sr:case mu:case hr:return{byteLength:2,components:1};case gc:case xc:return{byteLength:2,components:4};case jn:case mc:case Oi:return{byteLength:4,components:1};case gu:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}function px(s,t,e,i,n,r,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new se,h=new WeakMap,f,d=new WeakMap,u=!1;try{u=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function x(A,b){return u?new OffscreenCanvas(A,b):no("canvas")}function y(A,b,L){let G=1,K=J(A);if((K.width>L||K.height>L)&&(G=L/Math.max(K.width,K.height)),G<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){let j=Math.floor(G*K.width),yt=Math.floor(G*K.height);f===void 0&&(f=x(j,yt));let st=b?x(j,yt):f;return st.width=j,st.height=yt,st.getContext("2d").drawImage(A,0,0,j,yt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+K.width+"x"+K.height+") to ("+j+"x"+yt+")."),st}else return"data"in A&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+K.width+"x"+K.height+")."),A;return A}function g(A){return A.generateMipmaps}function p(A){s.generateMipmap(A)}function _(A){return A.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?s.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function M(A,b,L,G,K=!1){if(A!==null){if(s[A]!==void 0)return s[A];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let j=b;if(b===s.RED&&(L===s.FLOAT&&(j=s.R32F),L===s.HALF_FLOAT&&(j=s.R16F),L===s.UNSIGNED_BYTE&&(j=s.R8)),b===s.RED_INTEGER&&(L===s.UNSIGNED_BYTE&&(j=s.R8UI),L===s.UNSIGNED_SHORT&&(j=s.R16UI),L===s.UNSIGNED_INT&&(j=s.R32UI),L===s.BYTE&&(j=s.R8I),L===s.SHORT&&(j=s.R16I),L===s.INT&&(j=s.R32I)),b===s.RG&&(L===s.FLOAT&&(j=s.RG32F),L===s.HALF_FLOAT&&(j=s.RG16F),L===s.UNSIGNED_BYTE&&(j=s.RG8)),b===s.RG_INTEGER&&(L===s.UNSIGNED_BYTE&&(j=s.RG8UI),L===s.UNSIGNED_SHORT&&(j=s.RG16UI),L===s.UNSIGNED_INT&&(j=s.RG32UI),L===s.BYTE&&(j=s.RG8I),L===s.SHORT&&(j=s.RG16I),L===s.INT&&(j=s.RG32I)),b===s.RGB_INTEGER&&(L===s.UNSIGNED_BYTE&&(j=s.RGB8UI),L===s.UNSIGNED_SHORT&&(j=s.RGB16UI),L===s.UNSIGNED_INT&&(j=s.RGB32UI),L===s.BYTE&&(j=s.RGB8I),L===s.SHORT&&(j=s.RGB16I),L===s.INT&&(j=s.RGB32I)),b===s.RGBA_INTEGER&&(L===s.UNSIGNED_BYTE&&(j=s.RGBA8UI),L===s.UNSIGNED_SHORT&&(j=s.RGBA16UI),L===s.UNSIGNED_INT&&(j=s.RGBA32UI),L===s.BYTE&&(j=s.RGBA8I),L===s.SHORT&&(j=s.RGBA16I),L===s.INT&&(j=s.RGBA32I)),b===s.RGB&&L===s.UNSIGNED_INT_5_9_9_9_REV&&(j=s.RGB9_E5),b===s.RGBA){let yt=K?Ro:ae.getTransfer(G);L===s.FLOAT&&(j=s.RGBA32F),L===s.HALF_FLOAT&&(j=s.RGBA16F),L===s.UNSIGNED_BYTE&&(j=yt===ge?s.SRGB8_ALPHA8:s.RGBA8),L===s.UNSIGNED_SHORT_4_4_4_4&&(j=s.RGBA4),L===s.UNSIGNED_SHORT_5_5_5_1&&(j=s.RGB5_A1)}return(j===s.R16F||j===s.R32F||j===s.RG16F||j===s.RG32F||j===s.RGBA16F||j===s.RGBA32F)&&t.get("EXT_color_buffer_float"),j}function v(A,b){let L;return A?b===null||b===jn||b===Cs?L=s.DEPTH24_STENCIL8:b===Oi?L=s.DEPTH32F_STENCIL8:b===sr&&(L=s.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):b===null||b===jn||b===Cs?L=s.DEPTH_COMPONENT24:b===Oi?L=s.DEPTH_COMPONENT32F:b===sr&&(L=s.DEPTH_COMPONENT16),L}function I(A,b){return g(A)===!0||A.isFramebufferTexture&&A.minFilter!==_i&&A.minFilter!==Ti?Math.log2(Math.max(b.width,b.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?b.mipmaps.length:1}function T(A){let b=A.target;b.removeEventListener("dispose",T),P(b),b.isVideoTexture&&h.delete(b)}function E(A){let b=A.target;b.removeEventListener("dispose",E),w(b)}function P(A){let b=i.get(A);if(b.__webglInit===void 0)return;let L=A.source,G=d.get(L);if(G){let K=G[b.__cacheKey];K.usedTimes--,K.usedTimes===0&&S(A),Object.keys(G).length===0&&d.delete(L)}i.remove(A)}function S(A){let b=i.get(A);s.deleteTexture(b.__webglTexture);let L=A.source,G=d.get(L);delete G[b.__cacheKey],o.memory.textures--}function w(A){let b=i.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),i.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let G=0;G<6;G++){if(Array.isArray(b.__webglFramebuffer[G]))for(let K=0;K<b.__webglFramebuffer[G].length;K++)s.deleteFramebuffer(b.__webglFramebuffer[G][K]);else s.deleteFramebuffer(b.__webglFramebuffer[G]);b.__webglDepthbuffer&&s.deleteRenderbuffer(b.__webglDepthbuffer[G])}else{if(Array.isArray(b.__webglFramebuffer))for(let G=0;G<b.__webglFramebuffer.length;G++)s.deleteFramebuffer(b.__webglFramebuffer[G]);else s.deleteFramebuffer(b.__webglFramebuffer);if(b.__webglDepthbuffer&&s.deleteRenderbuffer(b.__webglDepthbuffer),b.__webglMultisampledFramebuffer&&s.deleteFramebuffer(b.__webglMultisampledFramebuffer),b.__webglColorRenderbuffer)for(let G=0;G<b.__webglColorRenderbuffer.length;G++)b.__webglColorRenderbuffer[G]&&s.deleteRenderbuffer(b.__webglColorRenderbuffer[G]);b.__webglDepthRenderbuffer&&s.deleteRenderbuffer(b.__webglDepthRenderbuffer)}let L=A.textures;for(let G=0,K=L.length;G<K;G++){let j=i.get(L[G]);j.__webglTexture&&(s.deleteTexture(j.__webglTexture),o.memory.textures--),i.remove(L[G])}i.remove(A)}let z=0;function k(){z=0}function U(){let A=z;return A>=n.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+n.maxTextures),z+=1,A}function H(A){let b=[];return b.push(A.wrapS),b.push(A.wrapT),b.push(A.wrapR||0),b.push(A.magFilter),b.push(A.minFilter),b.push(A.anisotropy),b.push(A.internalFormat),b.push(A.format),b.push(A.type),b.push(A.generateMipmaps),b.push(A.premultiplyAlpha),b.push(A.flipY),b.push(A.unpackAlignment),b.push(A.colorSpace),b.join()}function Y(A,b){let L=i.get(A);if(A.isVideoTexture&&Z(A),A.isRenderTargetTexture===!1&&A.version>0&&L.__version!==A.version){let G=A.image;if(G===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(G.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{it(L,A,b);return}}e.bindTexture(s.TEXTURE_2D,L.__webglTexture,s.TEXTURE0+b)}function W(A,b){let L=i.get(A);if(A.version>0&&L.__version!==A.version){it(L,A,b);return}e.bindTexture(s.TEXTURE_2D_ARRAY,L.__webglTexture,s.TEXTURE0+b)}function ot(A,b){let L=i.get(A);if(A.version>0&&L.__version!==A.version){it(L,A,b);return}e.bindTexture(s.TEXTURE_3D,L.__webglTexture,s.TEXTURE0+b)}function $(A,b){let L=i.get(A);if(A.version>0&&L.__version!==A.version){lt(L,A,b);return}e.bindTexture(s.TEXTURE_CUBE_MAP,L.__webglTexture,s.TEXTURE0+b)}let ut={[rl]:s.REPEAT,[tn]:s.CLAMP_TO_EDGE,[ol]:s.MIRRORED_REPEAT},gt={[_i]:s.NEAREST,[pd]:s.NEAREST_MIPMAP_NEAREST,[wr]:s.NEAREST_MIPMAP_LINEAR,[Ti]:s.LINEAR,[ga]:s.LINEAR_MIPMAP_NEAREST,[en]:s.LINEAR_MIPMAP_LINEAR},Rt={[yd]:s.NEVER,[Sd]:s.ALWAYS,[vd]:s.LESS,[Su]:s.LEQUAL,[_d]:s.EQUAL,[wd]:s.GEQUAL,[Md]:s.GREATER,[bd]:s.NOTEQUAL};function Yt(A,b){if(b.type===Oi&&t.has("OES_texture_float_linear")===!1&&(b.magFilter===Ti||b.magFilter===ga||b.magFilter===wr||b.magFilter===en||b.minFilter===Ti||b.minFilter===ga||b.minFilter===wr||b.minFilter===en)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(A,s.TEXTURE_WRAP_S,ut[b.wrapS]),s.texParameteri(A,s.TEXTURE_WRAP_T,ut[b.wrapT]),(A===s.TEXTURE_3D||A===s.TEXTURE_2D_ARRAY)&&s.texParameteri(A,s.TEXTURE_WRAP_R,ut[b.wrapR]),s.texParameteri(A,s.TEXTURE_MAG_FILTER,gt[b.magFilter]),s.texParameteri(A,s.TEXTURE_MIN_FILTER,gt[b.minFilter]),b.compareFunction&&(s.texParameteri(A,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(A,s.TEXTURE_COMPARE_FUNC,Rt[b.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(b.magFilter===_i||b.minFilter!==wr&&b.minFilter!==en||b.type===Oi&&t.has("OES_texture_float_linear")===!1)return;if(b.anisotropy>1||i.get(b).__currentAnisotropy){let L=t.get("EXT_texture_filter_anisotropic");s.texParameterf(A,L.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(b.anisotropy,n.getMaxAnisotropy())),i.get(b).__currentAnisotropy=b.anisotropy}}}function le(A,b){let L=!1;A.__webglInit===void 0&&(A.__webglInit=!0,b.addEventListener("dispose",T));let G=b.source,K=d.get(G);K===void 0&&(K={},d.set(G,K));let j=H(b);if(j!==A.__cacheKey){K[j]===void 0&&(K[j]={texture:s.createTexture(),usedTimes:0},o.memory.textures++,L=!0),K[j].usedTimes++;let yt=K[A.__cacheKey];yt!==void 0&&(K[A.__cacheKey].usedTimes--,yt.usedTimes===0&&S(b)),A.__cacheKey=j,A.__webglTexture=K[j].texture}return L}function it(A,b,L){let G=s.TEXTURE_2D;(b.isDataArrayTexture||b.isCompressedArrayTexture)&&(G=s.TEXTURE_2D_ARRAY),b.isData3DTexture&&(G=s.TEXTURE_3D);let K=le(A,b),j=b.source;e.bindTexture(G,A.__webglTexture,s.TEXTURE0+L);let yt=i.get(j);if(j.version!==yt.__version||K===!0){e.activeTexture(s.TEXTURE0+L);let st=ae.getPrimaries(ae.workingColorSpace),mt=b.colorSpace===Tn?null:ae.getPrimaries(b.colorSpace),Zt=b.colorSpace===Tn||st===mt?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,b.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,b.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,Zt);let at=y(b.image,!1,n.maxTextureSize);at=nt(b,at);let wt=r.convert(b.format,b.colorSpace),Nt=r.convert(b.type),Ot=M(b.internalFormat,wt,Nt,b.colorSpace,b.isVideoTexture);Yt(G,b);let St,Qt=b.mipmaps,Bt=b.isVideoTexture!==!0,he=yt.__version===void 0||K===!0,N=j.dataReady,xt=I(b,at);if(b.isDepthTexture)Ot=v(b.format===Ps,b.type),he&&(Bt?e.texStorage2D(s.TEXTURE_2D,1,Ot,at.width,at.height):e.texImage2D(s.TEXTURE_2D,0,Ot,at.width,at.height,0,wt,Nt,null));else if(b.isDataTexture)if(Qt.length>0){Bt&&he&&e.texStorage2D(s.TEXTURE_2D,xt,Ot,Qt[0].width,Qt[0].height);for(let tt=0,rt=Qt.length;tt<rt;tt++)St=Qt[tt],Bt?N&&e.texSubImage2D(s.TEXTURE_2D,tt,0,0,St.width,St.height,wt,Nt,St.data):e.texImage2D(s.TEXTURE_2D,tt,Ot,St.width,St.height,0,wt,Nt,St.data);b.generateMipmaps=!1}else Bt?(he&&e.texStorage2D(s.TEXTURE_2D,xt,Ot,at.width,at.height),N&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,at.width,at.height,wt,Nt,at.data)):e.texImage2D(s.TEXTURE_2D,0,Ot,at.width,at.height,0,wt,Nt,at.data);else if(b.isCompressedTexture)if(b.isCompressedArrayTexture){Bt&&he&&e.texStorage3D(s.TEXTURE_2D_ARRAY,xt,Ot,Qt[0].width,Qt[0].height,at.depth);for(let tt=0,rt=Qt.length;tt<rt;tt++)if(St=Qt[tt],b.format!==vi)if(wt!==null)if(Bt){if(N)if(b.layerUpdates.size>0){let Mt=iu(St.width,St.height,b.format,b.type);for(let vt of b.layerUpdates){let $t=St.data.subarray(vt*Mt/St.data.BYTES_PER_ELEMENT,(vt+1)*Mt/St.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,tt,0,0,vt,St.width,St.height,1,wt,$t)}b.clearLayerUpdates()}else e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,tt,0,0,0,St.width,St.height,at.depth,wt,St.data)}else e.compressedTexImage3D(s.TEXTURE_2D_ARRAY,tt,Ot,St.width,St.height,at.depth,0,St.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Bt?N&&e.texSubImage3D(s.TEXTURE_2D_ARRAY,tt,0,0,0,St.width,St.height,at.depth,wt,Nt,St.data):e.texImage3D(s.TEXTURE_2D_ARRAY,tt,Ot,St.width,St.height,at.depth,0,wt,Nt,St.data)}else{Bt&&he&&e.texStorage2D(s.TEXTURE_2D,xt,Ot,Qt[0].width,Qt[0].height);for(let tt=0,rt=Qt.length;tt<rt;tt++)St=Qt[tt],b.format!==vi?wt!==null?Bt?N&&e.compressedTexSubImage2D(s.TEXTURE_2D,tt,0,0,St.width,St.height,wt,St.data):e.compressedTexImage2D(s.TEXTURE_2D,tt,Ot,St.width,St.height,0,St.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Bt?N&&e.texSubImage2D(s.TEXTURE_2D,tt,0,0,St.width,St.height,wt,Nt,St.data):e.texImage2D(s.TEXTURE_2D,tt,Ot,St.width,St.height,0,wt,Nt,St.data)}else if(b.isDataArrayTexture)if(Bt){if(he&&e.texStorage3D(s.TEXTURE_2D_ARRAY,xt,Ot,at.width,at.height,at.depth),N)if(b.layerUpdates.size>0){let tt=iu(at.width,at.height,b.format,b.type);for(let rt of b.layerUpdates){let Mt=at.data.subarray(rt*tt/at.data.BYTES_PER_ELEMENT,(rt+1)*tt/at.data.BYTES_PER_ELEMENT);e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,rt,at.width,at.height,1,wt,Nt,Mt)}b.clearLayerUpdates()}else e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,at.width,at.height,at.depth,wt,Nt,at.data)}else e.texImage3D(s.TEXTURE_2D_ARRAY,0,Ot,at.width,at.height,at.depth,0,wt,Nt,at.data);else if(b.isData3DTexture)Bt?(he&&e.texStorage3D(s.TEXTURE_3D,xt,Ot,at.width,at.height,at.depth),N&&e.texSubImage3D(s.TEXTURE_3D,0,0,0,0,at.width,at.height,at.depth,wt,Nt,at.data)):e.texImage3D(s.TEXTURE_3D,0,Ot,at.width,at.height,at.depth,0,wt,Nt,at.data);else if(b.isFramebufferTexture){if(he)if(Bt)e.texStorage2D(s.TEXTURE_2D,xt,Ot,at.width,at.height);else{let tt=at.width,rt=at.height;for(let Mt=0;Mt<xt;Mt++)e.texImage2D(s.TEXTURE_2D,Mt,Ot,tt,rt,0,wt,Nt,null),tt>>=1,rt>>=1}}else if(Qt.length>0){if(Bt&&he){let tt=J(Qt[0]);e.texStorage2D(s.TEXTURE_2D,xt,Ot,tt.width,tt.height)}for(let tt=0,rt=Qt.length;tt<rt;tt++)St=Qt[tt],Bt?N&&e.texSubImage2D(s.TEXTURE_2D,tt,0,0,wt,Nt,St):e.texImage2D(s.TEXTURE_2D,tt,Ot,wt,Nt,St);b.generateMipmaps=!1}else if(Bt){if(he){let tt=J(at);e.texStorage2D(s.TEXTURE_2D,xt,Ot,tt.width,tt.height)}N&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,wt,Nt,at)}else e.texImage2D(s.TEXTURE_2D,0,Ot,wt,Nt,at);g(b)&&p(G),yt.__version=j.version,b.onUpdate&&b.onUpdate(b)}A.__version=b.version}function lt(A,b,L){if(b.image.length!==6)return;let G=le(A,b),K=b.source;e.bindTexture(s.TEXTURE_CUBE_MAP,A.__webglTexture,s.TEXTURE0+L);let j=i.get(K);if(K.version!==j.__version||G===!0){e.activeTexture(s.TEXTURE0+L);let yt=ae.getPrimaries(ae.workingColorSpace),st=b.colorSpace===Tn?null:ae.getPrimaries(b.colorSpace),mt=b.colorSpace===Tn||yt===st?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,b.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,b.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,mt);let Zt=b.isCompressedTexture||b.image[0].isCompressedTexture,at=b.image[0]&&b.image[0].isDataTexture,wt=[];for(let rt=0;rt<6;rt++)!Zt&&!at?wt[rt]=y(b.image[rt],!0,n.maxCubemapSize):wt[rt]=at?b.image[rt].image:b.image[rt],wt[rt]=nt(b,wt[rt]);let Nt=wt[0],Ot=r.convert(b.format,b.colorSpace),St=r.convert(b.type),Qt=M(b.internalFormat,Ot,St,b.colorSpace),Bt=b.isVideoTexture!==!0,he=j.__version===void 0||G===!0,N=K.dataReady,xt=I(b,Nt);Yt(s.TEXTURE_CUBE_MAP,b);let tt;if(Zt){Bt&&he&&e.texStorage2D(s.TEXTURE_CUBE_MAP,xt,Qt,Nt.width,Nt.height);for(let rt=0;rt<6;rt++){tt=wt[rt].mipmaps;for(let Mt=0;Mt<tt.length;Mt++){let vt=tt[Mt];b.format!==vi?Ot!==null?Bt?N&&e.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,Mt,0,0,vt.width,vt.height,Ot,vt.data):e.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,Mt,Qt,vt.width,vt.height,0,vt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Bt?N&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,Mt,0,0,vt.width,vt.height,Ot,St,vt.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,Mt,Qt,vt.width,vt.height,0,Ot,St,vt.data)}}}else{if(tt=b.mipmaps,Bt&&he){tt.length>0&&xt++;let rt=J(wt[0]);e.texStorage2D(s.TEXTURE_CUBE_MAP,xt,Qt,rt.width,rt.height)}for(let rt=0;rt<6;rt++)if(at){Bt?N&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,0,0,0,wt[rt].width,wt[rt].height,Ot,St,wt[rt].data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,0,Qt,wt[rt].width,wt[rt].height,0,Ot,St,wt[rt].data);for(let Mt=0;Mt<tt.length;Mt++){let $t=tt[Mt].image[rt].image;Bt?N&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,Mt+1,0,0,$t.width,$t.height,Ot,St,$t.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,Mt+1,Qt,$t.width,$t.height,0,Ot,St,$t.data)}}else{Bt?N&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,0,0,0,Ot,St,wt[rt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,0,Qt,Ot,St,wt[rt]);for(let Mt=0;Mt<tt.length;Mt++){let vt=tt[Mt];Bt?N&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,Mt+1,0,0,Ot,St,vt.image[rt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+rt,Mt+1,Qt,Ot,St,vt.image[rt])}}}g(b)&&p(s.TEXTURE_CUBE_MAP),j.__version=K.version,b.onUpdate&&b.onUpdate(b)}A.__version=b.version}function At(A,b,L,G,K,j){let yt=r.convert(L.format,L.colorSpace),st=r.convert(L.type),mt=M(L.internalFormat,yt,st,L.colorSpace),Zt=i.get(b),at=i.get(L);if(at.__renderTarget=b,!Zt.__hasExternalTextures){let wt=Math.max(1,b.width>>j),Nt=Math.max(1,b.height>>j);K===s.TEXTURE_3D||K===s.TEXTURE_2D_ARRAY?e.texImage3D(K,j,mt,wt,Nt,b.depth,0,yt,st,null):e.texImage2D(K,j,mt,wt,Nt,0,yt,st,null)}e.bindFramebuffer(s.FRAMEBUFFER,A),et(b)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,G,K,at.__webglTexture,0,V(b)):(K===s.TEXTURE_2D||K>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&K<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,G,K,at.__webglTexture,j),e.bindFramebuffer(s.FRAMEBUFFER,null)}function dt(A,b,L){if(s.bindRenderbuffer(s.RENDERBUFFER,A),b.depthBuffer){let G=b.depthTexture,K=G&&G.isDepthTexture?G.type:null,j=v(b.stencilBuffer,K),yt=b.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,st=V(b);et(b)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,st,j,b.width,b.height):L?s.renderbufferStorageMultisample(s.RENDERBUFFER,st,j,b.width,b.height):s.renderbufferStorage(s.RENDERBUFFER,j,b.width,b.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,yt,s.RENDERBUFFER,A)}else{let G=b.textures;for(let K=0;K<G.length;K++){let j=G[K],yt=r.convert(j.format,j.colorSpace),st=r.convert(j.type),mt=M(j.internalFormat,yt,st,j.colorSpace),Zt=V(b);L&&et(b)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,Zt,mt,b.width,b.height):et(b)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Zt,mt,b.width,b.height):s.renderbufferStorage(s.RENDERBUFFER,mt,b.width,b.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function kt(A,b){if(b&&b.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(s.FRAMEBUFFER,A),!(b.depthTexture&&b.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let G=i.get(b.depthTexture);G.__renderTarget=b,(!G.__webglTexture||b.depthTexture.image.width!==b.width||b.depthTexture.image.height!==b.height)&&(b.depthTexture.image.width=b.width,b.depthTexture.image.height=b.height,b.depthTexture.needsUpdate=!0),Y(b.depthTexture,0);let K=G.__webglTexture,j=V(b);if(b.depthTexture.format===ws)et(b)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,K,0,j):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,K,0);else if(b.depthTexture.format===Ps)et(b)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,K,0,j):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,K,0);else throw new Error("Unknown depthTexture format")}function Dt(A){let b=i.get(A),L=A.isWebGLCubeRenderTarget===!0;if(b.__boundDepthTexture!==A.depthTexture){let G=A.depthTexture;if(b.__depthDisposeCallback&&b.__depthDisposeCallback(),G){let K=()=>{delete b.__boundDepthTexture,delete b.__depthDisposeCallback,G.removeEventListener("dispose",K)};G.addEventListener("dispose",K),b.__depthDisposeCallback=K}b.__boundDepthTexture=G}if(A.depthTexture&&!b.__autoAllocateDepthBuffer){if(L)throw new Error("target.depthTexture not supported in Cube render targets");kt(b.__webglFramebuffer,A)}else if(L){b.__webglDepthbuffer=[];for(let G=0;G<6;G++)if(e.bindFramebuffer(s.FRAMEBUFFER,b.__webglFramebuffer[G]),b.__webglDepthbuffer[G]===void 0)b.__webglDepthbuffer[G]=s.createRenderbuffer(),dt(b.__webglDepthbuffer[G],A,!1);else{let K=A.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,j=b.__webglDepthbuffer[G];s.bindRenderbuffer(s.RENDERBUFFER,j),s.framebufferRenderbuffer(s.FRAMEBUFFER,K,s.RENDERBUFFER,j)}}else if(e.bindFramebuffer(s.FRAMEBUFFER,b.__webglFramebuffer),b.__webglDepthbuffer===void 0)b.__webglDepthbuffer=s.createRenderbuffer(),dt(b.__webglDepthbuffer,A,!1);else{let G=A.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,K=b.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,K),s.framebufferRenderbuffer(s.FRAMEBUFFER,G,s.RENDERBUFFER,K)}e.bindFramebuffer(s.FRAMEBUFFER,null)}function Vt(A,b,L){let G=i.get(A);b!==void 0&&At(G.__webglFramebuffer,A,A.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),L!==void 0&&Dt(A)}function ce(A){let b=A.texture,L=i.get(A),G=i.get(b);A.addEventListener("dispose",E);let K=A.textures,j=A.isWebGLCubeRenderTarget===!0,yt=K.length>1;if(yt||(G.__webglTexture===void 0&&(G.__webglTexture=s.createTexture()),G.__version=b.version,o.memory.textures++),j){L.__webglFramebuffer=[];for(let st=0;st<6;st++)if(b.mipmaps&&b.mipmaps.length>0){L.__webglFramebuffer[st]=[];for(let mt=0;mt<b.mipmaps.length;mt++)L.__webglFramebuffer[st][mt]=s.createFramebuffer()}else L.__webglFramebuffer[st]=s.createFramebuffer()}else{if(b.mipmaps&&b.mipmaps.length>0){L.__webglFramebuffer=[];for(let st=0;st<b.mipmaps.length;st++)L.__webglFramebuffer[st]=s.createFramebuffer()}else L.__webglFramebuffer=s.createFramebuffer();if(yt)for(let st=0,mt=K.length;st<mt;st++){let Zt=i.get(K[st]);Zt.__webglTexture===void 0&&(Zt.__webglTexture=s.createTexture(),o.memory.textures++)}if(A.samples>0&&et(A)===!1){L.__webglMultisampledFramebuffer=s.createFramebuffer(),L.__webglColorRenderbuffer=[],e.bindFramebuffer(s.FRAMEBUFFER,L.__webglMultisampledFramebuffer);for(let st=0;st<K.length;st++){let mt=K[st];L.__webglColorRenderbuffer[st]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,L.__webglColorRenderbuffer[st]);let Zt=r.convert(mt.format,mt.colorSpace),at=r.convert(mt.type),wt=M(mt.internalFormat,Zt,at,mt.colorSpace,A.isXRRenderTarget===!0),Nt=V(A);s.renderbufferStorageMultisample(s.RENDERBUFFER,Nt,wt,A.width,A.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+st,s.RENDERBUFFER,L.__webglColorRenderbuffer[st])}s.bindRenderbuffer(s.RENDERBUFFER,null),A.depthBuffer&&(L.__webglDepthRenderbuffer=s.createRenderbuffer(),dt(L.__webglDepthRenderbuffer,A,!0)),e.bindFramebuffer(s.FRAMEBUFFER,null)}}if(j){e.bindTexture(s.TEXTURE_CUBE_MAP,G.__webglTexture),Yt(s.TEXTURE_CUBE_MAP,b);for(let st=0;st<6;st++)if(b.mipmaps&&b.mipmaps.length>0)for(let mt=0;mt<b.mipmaps.length;mt++)At(L.__webglFramebuffer[st][mt],A,b,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+st,mt);else At(L.__webglFramebuffer[st],A,b,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+st,0);g(b)&&p(s.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(yt){for(let st=0,mt=K.length;st<mt;st++){let Zt=K[st],at=i.get(Zt);e.bindTexture(s.TEXTURE_2D,at.__webglTexture),Yt(s.TEXTURE_2D,Zt),At(L.__webglFramebuffer,A,Zt,s.COLOR_ATTACHMENT0+st,s.TEXTURE_2D,0),g(Zt)&&p(s.TEXTURE_2D)}e.unbindTexture()}else{let st=s.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(st=A.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(st,G.__webglTexture),Yt(st,b),b.mipmaps&&b.mipmaps.length>0)for(let mt=0;mt<b.mipmaps.length;mt++)At(L.__webglFramebuffer[mt],A,b,s.COLOR_ATTACHMENT0,st,mt);else At(L.__webglFramebuffer,A,b,s.COLOR_ATTACHMENT0,st,0);g(b)&&p(st),e.unbindTexture()}A.depthBuffer&&Dt(A)}function Gt(A){let b=A.textures;for(let L=0,G=b.length;L<G;L++){let K=b[L];if(g(K)){let j=_(A),yt=i.get(K).__webglTexture;e.bindTexture(j,yt),p(j),e.unbindTexture()}}}let Re=[],B=[];function R(A){if(A.samples>0){if(et(A)===!1){let b=A.textures,L=A.width,G=A.height,K=s.COLOR_BUFFER_BIT,j=A.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,yt=i.get(A),st=b.length>1;if(st)for(let mt=0;mt<b.length;mt++)e.bindFramebuffer(s.FRAMEBUFFER,yt.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+mt,s.RENDERBUFFER,null),e.bindFramebuffer(s.FRAMEBUFFER,yt.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+mt,s.TEXTURE_2D,null,0);e.bindFramebuffer(s.READ_FRAMEBUFFER,yt.__webglMultisampledFramebuffer),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,yt.__webglFramebuffer);for(let mt=0;mt<b.length;mt++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(K|=s.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(K|=s.STENCIL_BUFFER_BIT)),st){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,yt.__webglColorRenderbuffer[mt]);let Zt=i.get(b[mt]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,Zt,0)}s.blitFramebuffer(0,0,L,G,0,0,L,G,K,s.NEAREST),l===!0&&(Re.length=0,B.length=0,Re.push(s.COLOR_ATTACHMENT0+mt),A.depthBuffer&&A.resolveDepthBuffer===!1&&(Re.push(j),B.push(j),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,B)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,Re))}if(e.bindFramebuffer(s.READ_FRAMEBUFFER,null),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),st)for(let mt=0;mt<b.length;mt++){e.bindFramebuffer(s.FRAMEBUFFER,yt.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+mt,s.RENDERBUFFER,yt.__webglColorRenderbuffer[mt]);let Zt=i.get(b[mt]).__webglTexture;e.bindFramebuffer(s.FRAMEBUFFER,yt.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+mt,s.TEXTURE_2D,Zt,0)}e.bindFramebuffer(s.DRAW_FRAMEBUFFER,yt.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&l){let b=A.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[b])}}}function V(A){return Math.min(n.maxSamples,A.samples)}function et(A){let b=i.get(A);return A.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&b.__useRenderToTexture!==!1}function Z(A){let b=o.render.frame;h.get(A)!==b&&(h.set(A,b),A.update())}function nt(A,b){let L=A.colorSpace,G=A.format,K=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||L!==Us&&L!==Tn&&(ae.getTransfer(L)===ge?(G!==vi||K!==Di)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",L)),b}function J(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=U,this.resetTextureUnits=k,this.setTexture2D=Y,this.setTexture2DArray=W,this.setTexture3D=ot,this.setTextureCube=$,this.rebindTextures=Vt,this.setupRenderTarget=ce,this.updateRenderTargetMipmap=Gt,this.updateMultisampleRenderTarget=R,this.setupDepthRenderbuffer=Dt,this.setupFrameBufferTexture=At,this.useMultisampledRTT=et}function mx(s,t){function e(i,n=Tn){let r,o=ae.getTransfer(n);if(i===Di)return s.UNSIGNED_BYTE;if(i===gc)return s.UNSIGNED_SHORT_4_4_4_4;if(i===xc)return s.UNSIGNED_SHORT_5_5_5_1;if(i===gu)return s.UNSIGNED_INT_5_9_9_9_REV;if(i===pu)return s.BYTE;if(i===mu)return s.SHORT;if(i===sr)return s.UNSIGNED_SHORT;if(i===mc)return s.INT;if(i===jn)return s.UNSIGNED_INT;if(i===Oi)return s.FLOAT;if(i===hr)return s.HALF_FLOAT;if(i===xu)return s.ALPHA;if(i===yu)return s.RGB;if(i===vi)return s.RGBA;if(i===vu)return s.LUMINANCE;if(i===_u)return s.LUMINANCE_ALPHA;if(i===ws)return s.DEPTH_COMPONENT;if(i===Ps)return s.DEPTH_STENCIL;if(i===yc)return s.RED;if(i===vc)return s.RED_INTEGER;if(i===Mu)return s.RG;if(i===_c)return s.RG_INTEGER;if(i===Mc)return s.RGBA_INTEGER;if(i===Jr||i===Kr||i===jr||i===Qr)if(o===ge)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===Jr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Kr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===jr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Qr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===Jr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Kr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===jr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Qr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===al||i===ll||i===cl||i===hl)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===al)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===ll)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===cl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===hl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===ul||i===fl||i===dl)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(i===ul||i===fl)return o===ge?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===dl)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===pl||i===ml||i===gl||i===xl||i===yl||i===vl||i===_l||i===Ml||i===bl||i===wl||i===Sl||i===Tl||i===El||i===Al)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(i===pl)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===ml)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===gl)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===xl)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===yl)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===vl)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===_l)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Ml)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===bl)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===wl)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Sl)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Tl)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===El)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Al)return o===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===to||i===Rl||i===Cl)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(i===to)return o===ge?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Rl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Cl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===bu||i===Pl||i===Il||i===zl)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(i===to)return r.COMPRESSED_RED_RGTC1_EXT;if(i===Pl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Il)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===zl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Cs?s.UNSIGNED_INT_24_8:s[i]!==void 0?s[i]:null}return{convert:e}}var Zl=class extends ti{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}},Ei=class extends Ue{constructor(){super(),this.isGroup=!0,this.type="Group"}},gx={type:"move"},nr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ei,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ei,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ei,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let n=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(let y of t.hand.values()){let g=e.getJointPose(y,i),p=this._getHandJoint(c,y);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}let h=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],d=h.position.distanceTo(f.position),u=.02,x=.005;c.inputState.pinching&&d>u+x?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&d<=u-x&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,i),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(n=e.getPose(t.targetRaySpace,i),n===null&&r!==null&&(n=r),n!==null&&(a.matrix.fromArray(n.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,n.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(n.linearVelocity)):a.hasLinearVelocity=!1,n.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(n.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(gx)))}return a!==null&&(a.visible=n!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let i=new Ei;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}},xx=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,yx=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,$l=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,i){if(this.texture===null){let n=new hi,r=t.properties.get(n);r.__webglTexture=e.texture,(e.depthNear!=i.depthNear||e.depthFar!=i.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,i=new Pe({vertexShader:xx,fragmentShader:yx,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Kt(new Bi(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Jl=class extends Pn{constructor(t,e){super();let i=this,n=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,f=null,d=null,u=null,x=null,y=new $l,g=e.getContextAttributes(),p=null,_=null,M=[],v=[],I=new se,T=null,E=new ti;E.viewport=new Ee;let P=new ti;P.viewport=new Ee;let S=[E,P],w=new Zl,z=null,k=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(it){let lt=M[it];return lt===void 0&&(lt=new nr,M[it]=lt),lt.getTargetRaySpace()},this.getControllerGrip=function(it){let lt=M[it];return lt===void 0&&(lt=new nr,M[it]=lt),lt.getGripSpace()},this.getHand=function(it){let lt=M[it];return lt===void 0&&(lt=new nr,M[it]=lt),lt.getHandSpace()};function U(it){let lt=v.indexOf(it.inputSource);if(lt===-1)return;let At=M[lt];At!==void 0&&(At.update(it.inputSource,it.frame,c||o),At.dispatchEvent({type:it.type,data:it.inputSource}))}function H(){n.removeEventListener("select",U),n.removeEventListener("selectstart",U),n.removeEventListener("selectend",U),n.removeEventListener("squeeze",U),n.removeEventListener("squeezestart",U),n.removeEventListener("squeezeend",U),n.removeEventListener("end",H),n.removeEventListener("inputsourceschange",Y);for(let it=0;it<M.length;it++){let lt=v[it];lt!==null&&(v[it]=null,M[it].disconnect(lt))}z=null,k=null,y.reset(),t.setRenderTarget(p),u=null,d=null,f=null,n=null,_=null,le.stop(),i.isPresenting=!1,t.setPixelRatio(T),t.setSize(I.width,I.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(it){r=it,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(it){a=it,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(it){c=it},this.getBaseLayer=function(){return d!==null?d:u},this.getBinding=function(){return f},this.getFrame=function(){return x},this.getSession=function(){return n},this.setSession=async function(it){if(n=it,n!==null){if(p=t.getRenderTarget(),n.addEventListener("select",U),n.addEventListener("selectstart",U),n.addEventListener("selectend",U),n.addEventListener("squeeze",U),n.addEventListener("squeezestart",U),n.addEventListener("squeezeend",U),n.addEventListener("end",H),n.addEventListener("inputsourceschange",Y),g.xrCompatible!==!0&&await e.makeXRCompatible(),T=t.getPixelRatio(),t.getSize(I),n.renderState.layers===void 0){let lt={antialias:g.antialias,alpha:!0,depth:g.depth,stencil:g.stencil,framebufferScaleFactor:r};u=new XRWebGLLayer(n,e,lt),n.updateRenderState({baseLayer:u}),t.setPixelRatio(1),t.setSize(u.framebufferWidth,u.framebufferHeight,!1),_=new rn(u.framebufferWidth,u.framebufferHeight,{format:vi,type:Di,colorSpace:t.outputColorSpace,stencilBuffer:g.stencil})}else{let lt=null,At=null,dt=null;g.depth&&(dt=g.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,lt=g.stencil?Ps:ws,At=g.stencil?Cs:jn);let kt={colorFormat:e.RGBA8,depthFormat:dt,scaleFactor:r};f=new XRWebGLBinding(n,e),d=f.createProjectionLayer(kt),n.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),_=new rn(d.textureWidth,d.textureHeight,{format:vi,type:Di,depthTexture:new uo(d.textureWidth,d.textureHeight,At,void 0,void 0,void 0,void 0,void 0,void 0,lt),stencilBuffer:g.stencil,colorSpace:t.outputColorSpace,samples:g.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await n.requestReferenceSpace(a),le.setContext(n),le.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(n!==null)return n.environmentBlendMode},this.getDepthTexture=function(){return y.getDepthTexture()};function Y(it){for(let lt=0;lt<it.removed.length;lt++){let At=it.removed[lt],dt=v.indexOf(At);dt>=0&&(v[dt]=null,M[dt].disconnect(At))}for(let lt=0;lt<it.added.length;lt++){let At=it.added[lt],dt=v.indexOf(At);if(dt===-1){for(let Dt=0;Dt<M.length;Dt++)if(Dt>=v.length){v.push(At),dt=Dt;break}else if(v[Dt]===null){v[Dt]=At,dt=Dt;break}if(dt===-1)break}let kt=M[dt];kt&&kt.connect(At)}}let W=new D,ot=new D;function $(it,lt,At){W.setFromMatrixPosition(lt.matrixWorld),ot.setFromMatrixPosition(At.matrixWorld);let dt=W.distanceTo(ot),kt=lt.projectionMatrix.elements,Dt=At.projectionMatrix.elements,Vt=kt[14]/(kt[10]-1),ce=kt[14]/(kt[10]+1),Gt=(kt[9]+1)/kt[5],Re=(kt[9]-1)/kt[5],B=(kt[8]-1)/kt[0],R=(Dt[8]+1)/Dt[0],V=Vt*B,et=Vt*R,Z=dt/(-B+R),nt=Z*-B;if(lt.matrixWorld.decompose(it.position,it.quaternion,it.scale),it.translateX(nt),it.translateZ(Z),it.matrixWorld.compose(it.position,it.quaternion,it.scale),it.matrixWorldInverse.copy(it.matrixWorld).invert(),kt[10]===-1)it.projectionMatrix.copy(lt.projectionMatrix),it.projectionMatrixInverse.copy(lt.projectionMatrixInverse);else{let J=Vt+Z,A=ce+Z,b=V-nt,L=et+(dt-nt),G=Gt*ce/A*J,K=Re*ce/A*J;it.projectionMatrix.makePerspective(b,L,G,K,J,A),it.projectionMatrixInverse.copy(it.projectionMatrix).invert()}}function ut(it,lt){lt===null?it.matrixWorld.copy(it.matrix):it.matrixWorld.multiplyMatrices(lt.matrixWorld,it.matrix),it.matrixWorldInverse.copy(it.matrixWorld).invert()}this.updateCamera=function(it){if(n===null)return;let lt=it.near,At=it.far;y.texture!==null&&(y.depthNear>0&&(lt=y.depthNear),y.depthFar>0&&(At=y.depthFar)),w.near=P.near=E.near=lt,w.far=P.far=E.far=At,(z!==w.near||k!==w.far)&&(n.updateRenderState({depthNear:w.near,depthFar:w.far}),z=w.near,k=w.far),E.layers.mask=it.layers.mask|2,P.layers.mask=it.layers.mask|4,w.layers.mask=E.layers.mask|P.layers.mask;let dt=it.parent,kt=w.cameras;ut(w,dt);for(let Dt=0;Dt<kt.length;Dt++)ut(kt[Dt],dt);kt.length===2?$(w,E,P):w.projectionMatrix.copy(E.projectionMatrix),gt(it,w,dt)};function gt(it,lt,At){At===null?it.matrix.copy(lt.matrixWorld):(it.matrix.copy(At.matrixWorld),it.matrix.invert(),it.matrix.multiply(lt.matrixWorld)),it.matrix.decompose(it.position,it.quaternion,it.scale),it.updateMatrixWorld(!0),it.projectionMatrix.copy(lt.projectionMatrix),it.projectionMatrixInverse.copy(lt.projectionMatrixInverse),it.isPerspectiveCamera&&(it.fov=Dl*2*Math.atan(1/it.projectionMatrix.elements[5]),it.zoom=1)}this.getCamera=function(){return w},this.getFoveation=function(){if(!(d===null&&u===null))return l},this.setFoveation=function(it){l=it,d!==null&&(d.fixedFoveation=it),u!==null&&u.fixedFoveation!==void 0&&(u.fixedFoveation=it)},this.hasDepthSensing=function(){return y.texture!==null},this.getDepthSensingMesh=function(){return y.getMesh(w)};let Rt=null;function Yt(it,lt){if(h=lt.getViewerPose(c||o),x=lt,h!==null){let At=h.views;u!==null&&(t.setRenderTargetFramebuffer(_,u.framebuffer),t.setRenderTarget(_));let dt=!1;At.length!==w.cameras.length&&(w.cameras.length=0,dt=!0);for(let Dt=0;Dt<At.length;Dt++){let Vt=At[Dt],ce=null;if(u!==null)ce=u.getViewport(Vt);else{let Re=f.getViewSubImage(d,Vt);ce=Re.viewport,Dt===0&&(t.setRenderTargetTextures(_,Re.colorTexture,d.ignoreDepthValues?void 0:Re.depthStencilTexture),t.setRenderTarget(_))}let Gt=S[Dt];Gt===void 0&&(Gt=new ti,Gt.layers.enable(Dt),Gt.viewport=new Ee,S[Dt]=Gt),Gt.matrix.fromArray(Vt.transform.matrix),Gt.matrix.decompose(Gt.position,Gt.quaternion,Gt.scale),Gt.projectionMatrix.fromArray(Vt.projectionMatrix),Gt.projectionMatrixInverse.copy(Gt.projectionMatrix).invert(),Gt.viewport.set(ce.x,ce.y,ce.width,ce.height),Dt===0&&(w.matrix.copy(Gt.matrix),w.matrix.decompose(w.position,w.quaternion,w.scale)),dt===!0&&w.cameras.push(Gt)}let kt=n.enabledFeatures;if(kt&&kt.includes("depth-sensing")){let Dt=f.getDepthInformation(At[0]);Dt&&Dt.isValid&&Dt.texture&&y.init(t,Dt,n.renderState)}}for(let At=0;At<M.length;At++){let dt=v[At],kt=M[At];dt!==null&&kt!==void 0&&kt.update(dt,lt,c||o)}Rt&&Rt(it,lt),lt.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:lt}),x=null}let le=new Ru;le.setAnimationLoop(Yt),this.setAnimationLoop=function(it){Rt=it},this.dispose=function(){}}},Yn=new ui,vx=new Tt;function _x(s,t){function e(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function i(g,p){p.color.getRGB(g.fogColor.value,Au(s)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function n(g,p,_,M,v){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(g,p):p.isMeshToonMaterial?(r(g,p),f(g,p)):p.isMeshPhongMaterial?(r(g,p),h(g,p)):p.isMeshStandardMaterial?(r(g,p),d(g,p),p.isMeshPhysicalMaterial&&u(g,p,v)):p.isMeshMatcapMaterial?(r(g,p),x(g,p)):p.isMeshDepthMaterial?r(g,p):p.isMeshDistanceMaterial?(r(g,p),y(g,p)):p.isMeshNormalMaterial?r(g,p):p.isLineBasicMaterial?(o(g,p),p.isLineDashedMaterial&&a(g,p)):p.isPointsMaterial?l(g,p,_,M):p.isSpriteMaterial?c(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,e(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,e(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,e(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===Ke&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,e(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===Ke&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,e(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,e(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);let _=t.get(p),M=_.envMap,v=_.envMapRotation;M&&(g.envMap.value=M,Yn.copy(v),Yn.x*=-1,Yn.y*=-1,Yn.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(Yn.y*=-1,Yn.z*=-1),g.envMapRotation.value.setFromMatrix4(vx.makeRotationFromEuler(Yn)),g.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,g.aoMapTransform))}function o(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,e(p.map,g.mapTransform))}function a(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function l(g,p,_,M){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*_,g.scale.value=M*.5,p.map&&(g.map.value=p.map,e(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,e(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function c(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,e(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,e(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function h(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function f(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function d(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function u(g,p,_){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Ke&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=_.texture,g.transmissionSamplerSize.value.set(_.width,_.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,g.specularIntensityMapTransform))}function x(g,p){p.matcap&&(g.matcap.value=p.matcap)}function y(g,p){let _=t.get(p).light;g.referencePosition.value.setFromMatrixPosition(_.matrixWorld),g.nearDistance.value=_.shadow.camera.near,g.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:n}}function Mx(s,t,e,i){let n={},r={},o=[],a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function l(_,M){let v=M.program;i.uniformBlockBinding(_,v)}function c(_,M){let v=n[_.id];v===void 0&&(x(_),v=h(_),n[_.id]=v,_.addEventListener("dispose",g));let I=M.program;i.updateUBOMapping(_,I);let T=t.render.frame;r[_.id]!==T&&(d(_),r[_.id]=T)}function h(_){let M=f();_.__bindingPointIndex=M;let v=s.createBuffer(),I=_.__size,T=_.usage;return s.bindBuffer(s.UNIFORM_BUFFER,v),s.bufferData(s.UNIFORM_BUFFER,I,T),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,M,v),v}function f(){for(let _=0;_<a;_++)if(o.indexOf(_)===-1)return o.push(_),_;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(_){let M=n[_.id],v=_.uniforms,I=_.__cache;s.bindBuffer(s.UNIFORM_BUFFER,M);for(let T=0,E=v.length;T<E;T++){let P=Array.isArray(v[T])?v[T]:[v[T]];for(let S=0,w=P.length;S<w;S++){let z=P[S];if(u(z,T,S,I)===!0){let k=z.__offset,U=Array.isArray(z.value)?z.value:[z.value],H=0;for(let Y=0;Y<U.length;Y++){let W=U[Y],ot=y(W);typeof W=="number"||typeof W=="boolean"?(z.__data[0]=W,s.bufferSubData(s.UNIFORM_BUFFER,k+H,z.__data)):W.isMatrix3?(z.__data[0]=W.elements[0],z.__data[1]=W.elements[1],z.__data[2]=W.elements[2],z.__data[3]=0,z.__data[4]=W.elements[3],z.__data[5]=W.elements[4],z.__data[6]=W.elements[5],z.__data[7]=0,z.__data[8]=W.elements[6],z.__data[9]=W.elements[7],z.__data[10]=W.elements[8],z.__data[11]=0):(W.toArray(z.__data,H),H+=ot.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,k,z.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function u(_,M,v,I){let T=_.value,E=M+"_"+v;if(I[E]===void 0)return typeof T=="number"||typeof T=="boolean"?I[E]=T:I[E]=T.clone(),!0;{let P=I[E];if(typeof T=="number"||typeof T=="boolean"){if(P!==T)return I[E]=T,!0}else if(P.equals(T)===!1)return P.copy(T),!0}return!1}function x(_){let M=_.uniforms,v=0,I=16;for(let E=0,P=M.length;E<P;E++){let S=Array.isArray(M[E])?M[E]:[M[E]];for(let w=0,z=S.length;w<z;w++){let k=S[w],U=Array.isArray(k.value)?k.value:[k.value];for(let H=0,Y=U.length;H<Y;H++){let W=U[H],ot=y(W),$=v%I,ut=$%ot.boundary,gt=$+ut;v+=ut,gt!==0&&I-gt<ot.storage&&(v+=I-gt),k.__data=new Float32Array(ot.storage/Float32Array.BYTES_PER_ELEMENT),k.__offset=v,v+=ot.storage}}}let T=v%I;return T>0&&(v+=I-T),_.__size=v,_.__cache={},this}function y(_){let M={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(M.boundary=4,M.storage=4):_.isVector2?(M.boundary=8,M.storage=8):_.isVector3||_.isColor?(M.boundary=16,M.storage=12):_.isVector4?(M.boundary=16,M.storage=16):_.isMatrix3?(M.boundary=48,M.storage=48):_.isMatrix4?(M.boundary=64,M.storage=64):_.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",_),M}function g(_){let M=_.target;M.removeEventListener("dispose",g);let v=o.indexOf(M.__bindingPointIndex);o.splice(v,1),s.deleteBuffer(n[M.id]),delete n[M.id],delete r[M.id]}function p(){for(let _ in n)s.deleteBuffer(n[_]);o=[],n={},r={}}return{bind:l,update:c,dispose:p}}var fo=class{constructor(t={}){let{canvas:e=Ed(),context:i=null,depth:n=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:f=!1,reverseDepthBuffer:d=!1}=t;this.isWebGLRenderer=!0;let u;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");u=i.getContextAttributes().alpha}else u=o;let x=new Uint32Array(4),y=new Int32Array(4),g=null,p=null,_=[],M=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Ve,this.toneMapping=Rn,this.toneMappingExposure=1;let v=this,I=!1,T=0,E=0,P=null,S=-1,w=null,z=new Ee,k=new Ee,U=null,H=new ct(0),Y=0,W=e.width,ot=e.height,$=1,ut=null,gt=null,Rt=new Ee(0,0,W,ot),Yt=new Ee(0,0,W,ot),le=!1,it=new or,lt=!1,At=!1,dt=new Tt,kt=new Tt,Dt=new D,Vt=new Ee,ce={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Gt=!1;function Re(){return P===null?$:1}let B=i;function R(C,F){return e.getContext(C,F)}try{let C={alpha:!0,depth:n,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:f};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${dc}`),e.addEventListener("webglcontextlost",rt,!1),e.addEventListener("webglcontextrestored",Mt,!1),e.addEventListener("webglcontextcreationerror",vt,!1),B===null){let F="webgl2";if(B=R(F,C),B===null)throw R(F)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(C){throw console.error("THREE.WebGLRenderer: "+C.message),C}let V,et,Z,nt,J,A,b,L,G,K,j,yt,st,mt,Zt,at,wt,Nt,Ot,St,Qt,Bt,he,N;function xt(){V=new N0(B),V.init(),Bt=new mx(B,V),et=new I0(B,V,t,Bt),Z=new fx(B,V),et.reverseDepthBuffer&&d&&Z.buffers.depth.setReversed(!0),nt=new B0(B),J=new Qg,A=new px(B,V,Z,J,et,Bt,nt),b=new L0(v),L=new k0(v),G=new Yd(B),he=new C0(B,G),K=new F0(B,G,nt,he),j=new V0(B,K,G,nt),Ot=new H0(B,et,A),at=new z0(J),yt=new jg(v,b,L,V,et,he,at),st=new _x(v,J),mt=new ex,Zt=new ax(V),Nt=new R0(v,b,L,Z,j,u,l),wt=new hx(v,j,et),N=new Mx(B,nt,et,Z),St=new P0(B,V,nt),Qt=new O0(B,V,nt),nt.programs=yt.programs,v.capabilities=et,v.extensions=V,v.properties=J,v.renderLists=mt,v.shadowMap=wt,v.state=Z,v.info=nt}xt();let tt=new Jl(v,B);this.xr=tt,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){let C=V.get("WEBGL_lose_context");C&&C.loseContext()},this.forceContextRestore=function(){let C=V.get("WEBGL_lose_context");C&&C.restoreContext()},this.getPixelRatio=function(){return $},this.setPixelRatio=function(C){C!==void 0&&($=C,this.setSize(W,ot,!1))},this.getSize=function(C){return C.set(W,ot)},this.setSize=function(C,F,X=!0){if(tt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}W=C,ot=F,e.width=Math.floor(C*$),e.height=Math.floor(F*$),X===!0&&(e.style.width=C+"px",e.style.height=F+"px"),this.setViewport(0,0,C,F)},this.getDrawingBufferSize=function(C){return C.set(W*$,ot*$).floor()},this.setDrawingBufferSize=function(C,F,X){W=C,ot=F,$=X,e.width=Math.floor(C*X),e.height=Math.floor(F*X),this.setViewport(0,0,C,F)},this.getCurrentViewport=function(C){return C.copy(z)},this.getViewport=function(C){return C.copy(Rt)},this.setViewport=function(C,F,X,q){C.isVector4?Rt.set(C.x,C.y,C.z,C.w):Rt.set(C,F,X,q),Z.viewport(z.copy(Rt).multiplyScalar($).round())},this.getScissor=function(C){return C.copy(Yt)},this.setScissor=function(C,F,X,q){C.isVector4?Yt.set(C.x,C.y,C.z,C.w):Yt.set(C,F,X,q),Z.scissor(k.copy(Yt).multiplyScalar($).round())},this.getScissorTest=function(){return le},this.setScissorTest=function(C){Z.setScissorTest(le=C)},this.setOpaqueSort=function(C){ut=C},this.setTransparentSort=function(C){gt=C},this.getClearColor=function(C){return C.copy(Nt.getClearColor())},this.setClearColor=function(){Nt.setClearColor.apply(Nt,arguments)},this.getClearAlpha=function(){return Nt.getClearAlpha()},this.setClearAlpha=function(){Nt.setClearAlpha.apply(Nt,arguments)},this.clear=function(C=!0,F=!0,X=!0){let q=0;if(C){let O=!1;if(P!==null){let ht=P.texture.format;O=ht===Mc||ht===_c||ht===vc}if(O){let ht=P.texture.type,_t=ht===Di||ht===jn||ht===sr||ht===Cs||ht===gc||ht===xc,Pt=Nt.getClearColor(),It=Nt.getClearAlpha(),Wt=Pt.r,Jt=Pt.g,zt=Pt.b;_t?(x[0]=Wt,x[1]=Jt,x[2]=zt,x[3]=It,B.clearBufferuiv(B.COLOR,0,x)):(y[0]=Wt,y[1]=Jt,y[2]=zt,y[3]=It,B.clearBufferiv(B.COLOR,0,y))}else q|=B.COLOR_BUFFER_BIT}F&&(q|=B.DEPTH_BUFFER_BIT),X&&(q|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),B.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",rt,!1),e.removeEventListener("webglcontextrestored",Mt,!1),e.removeEventListener("webglcontextcreationerror",vt,!1),mt.dispose(),Zt.dispose(),J.dispose(),b.dispose(),L.dispose(),j.dispose(),he.dispose(),N.dispose(),yt.dispose(),tt.dispose(),tt.removeEventListener("sessionstart",Jc),tt.removeEventListener("sessionend",Kc),Hn.stop()};function rt(C){C.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),I=!0}function Mt(){console.log("THREE.WebGLRenderer: Context Restored."),I=!1;let C=nt.autoReset,F=wt.enabled,X=wt.autoUpdate,q=wt.needsUpdate,O=wt.type;xt(),nt.autoReset=C,wt.enabled=F,wt.autoUpdate=X,wt.needsUpdate=q,wt.type=O}function vt(C){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",C.statusMessage)}function $t(C){let F=C.target;F.removeEventListener("dispose",$t),Ce(F)}function Ce(C){Ze(C),J.remove(C)}function Ze(C){let F=J.get(C).programs;F!==void 0&&(F.forEach(function(X){yt.releaseProgram(X)}),C.isShaderMaterial&&yt.releaseShaderCache(C))}this.renderBufferDirect=function(C,F,X,q,O,ht){F===null&&(F=ce);let _t=O.isMesh&&O.matrixWorld.determinant()<0,Pt=Uf(C,F,X,q,O);Z.setMaterial(q,_t);let It=X.index,Wt=1;if(q.wireframe===!0){if(It=K.getWireframeAttribute(X),It===void 0)return;Wt=2}let Jt=X.drawRange,zt=X.attributes.position,ue=Jt.start*Wt,_e=(Jt.start+Jt.count)*Wt;ht!==null&&(ue=Math.max(ue,ht.start*Wt),_e=Math.min(_e,(ht.start+ht.count)*Wt)),It!==null?(ue=Math.max(ue,0),_e=Math.min(_e,It.count)):zt!=null&&(ue=Math.max(ue,0),_e=Math.min(_e,zt.count));let be=_e-ue;if(be<0||be===1/0)return;he.setup(O,q,Pt,X,It);let ai,fe=St;if(It!==null&&(ai=G.get(It),fe=Qt,fe.setIndex(ai)),O.isMesh)q.wireframe===!0?(Z.setLineWidth(q.wireframeLinewidth*Re()),fe.setMode(B.LINES)):fe.setMode(B.TRIANGLES);else if(O.isLine){let Ut=q.linewidth;Ut===void 0&&(Ut=1),Z.setLineWidth(Ut*Re()),O.isLineSegments?fe.setMode(B.LINES):O.isLineLoop?fe.setMode(B.LINE_LOOP):fe.setMode(B.LINE_STRIP)}else O.isPoints?fe.setMode(B.POINTS):O.isSprite&&fe.setMode(B.TRIANGLES);if(O.isBatchedMesh)if(O._multiDrawInstances!==null)fe.renderMultiDrawInstances(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount,O._multiDrawInstances);else if(V.get("WEBGL_multi_draw"))fe.renderMultiDraw(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount);else{let Ut=O._multiDrawStarts,qi=O._multiDrawCounts,de=O._multiDrawCount,Pi=It?G.get(It).bytesPerElement:1,os=J.get(q).currentProgram.getUniforms();for(let gi=0;gi<de;gi++)os.setValue(B,"_gl_DrawID",gi),fe.render(Ut[gi]/Pi,qi[gi])}else if(O.isInstancedMesh)fe.renderInstances(ue,be,O.count);else if(X.isInstancedBufferGeometry){let Ut=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,qi=Math.min(X.instanceCount,Ut);fe.renderInstances(ue,be,qi)}else fe.render(ue,be)};function pe(C,F,X){C.transparent===!0&&C.side===Ge&&C.forceSinglePass===!1?(C.side=Ke,C.needsUpdate=!0,br(C,F,X),C.side=Cn,C.needsUpdate=!0,br(C,F,X),C.side=Ge):br(C,F,X)}this.compile=function(C,F,X=null){X===null&&(X=C),p=Zt.get(X),p.init(F),M.push(p),X.traverseVisible(function(O){O.isLight&&O.layers.test(F.layers)&&(p.pushLight(O),O.castShadow&&p.pushShadow(O))}),C!==X&&C.traverseVisible(function(O){O.isLight&&O.layers.test(F.layers)&&(p.pushLight(O),O.castShadow&&p.pushShadow(O))}),p.setupLights();let q=new Set;return C.traverse(function(O){if(!(O.isMesh||O.isPoints||O.isLine||O.isSprite))return;let ht=O.material;if(ht)if(Array.isArray(ht))for(let _t=0;_t<ht.length;_t++){let Pt=ht[_t];pe(Pt,X,O),q.add(Pt)}else pe(ht,X,O),q.add(ht)}),M.pop(),p=null,q},this.compileAsync=function(C,F,X=null){let q=this.compile(C,F,X);return new Promise(O=>{function ht(){if(q.forEach(function(_t){J.get(_t).currentProgram.isReady()&&q.delete(_t)}),q.size===0){O(C);return}setTimeout(ht,10)}V.get("KHR_parallel_shader_compile")!==null?ht():setTimeout(ht,10)})};let Ci=null;function Xi(C){Ci&&Ci(C)}function Jc(){Hn.stop()}function Kc(){Hn.start()}let Hn=new Ru;Hn.setAnimationLoop(Xi),typeof self<"u"&&Hn.setContext(self),this.setAnimationLoop=function(C){Ci=C,tt.setAnimationLoop(C),C===null?Hn.stop():Hn.start()},tt.addEventListener("sessionstart",Jc),tt.addEventListener("sessionend",Kc),this.render=function(C,F){if(F!==void 0&&F.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(I===!0)return;if(C.matrixWorldAutoUpdate===!0&&C.updateMatrixWorld(),F.parent===null&&F.matrixWorldAutoUpdate===!0&&F.updateMatrixWorld(),tt.enabled===!0&&tt.isPresenting===!0&&(tt.cameraAutoUpdate===!0&&tt.updateCamera(F),F=tt.getCamera()),C.isScene===!0&&C.onBeforeRender(v,C,F,P),p=Zt.get(C,M.length),p.init(F),M.push(p),kt.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),it.setFromProjectionMatrix(kt),At=this.localClippingEnabled,lt=at.init(this.clippingPlanes,At),g=mt.get(C,_.length),g.init(),_.push(g),tt.enabled===!0&&tt.isPresenting===!0){let ht=v.xr.getDepthSensingMesh();ht!==null&&ma(ht,F,-1/0,v.sortObjects)}ma(C,F,0,v.sortObjects),g.finish(),v.sortObjects===!0&&g.sort(ut,gt),Gt=tt.enabled===!1||tt.isPresenting===!1||tt.hasDepthSensing()===!1,Gt&&Nt.addToRenderList(g,C),this.info.render.frame++,lt===!0&&at.beginShadows();let X=p.state.shadowsArray;wt.render(X,C,F),lt===!0&&at.endShadows(),this.info.autoReset===!0&&this.info.reset();let q=g.opaque,O=g.transmissive;if(p.setupLights(),F.isArrayCamera){let ht=F.cameras;if(O.length>0)for(let _t=0,Pt=ht.length;_t<Pt;_t++){let It=ht[_t];Qc(q,O,C,It)}Gt&&Nt.render(C);for(let _t=0,Pt=ht.length;_t<Pt;_t++){let It=ht[_t];jc(g,C,It,It.viewport)}}else O.length>0&&Qc(q,O,C,F),Gt&&Nt.render(C),jc(g,C,F);P!==null&&(A.updateMultisampleRenderTarget(P),A.updateRenderTargetMipmap(P)),C.isScene===!0&&C.onAfterRender(v,C,F),he.resetDefaultState(),S=-1,w=null,M.pop(),M.length>0?(p=M[M.length-1],lt===!0&&at.setGlobalState(v.clippingPlanes,p.state.camera)):p=null,_.pop(),_.length>0?g=_[_.length-1]:g=null};function ma(C,F,X,q){if(C.visible===!1)return;if(C.layers.test(F.layers)){if(C.isGroup)X=C.renderOrder;else if(C.isLOD)C.autoUpdate===!0&&C.update(F);else if(C.isLight)p.pushLight(C),C.castShadow&&p.pushShadow(C);else if(C.isSprite){if(!C.frustumCulled||it.intersectsSprite(C)){q&&Vt.setFromMatrixPosition(C.matrixWorld).applyMatrix4(kt);let _t=j.update(C),Pt=C.material;Pt.visible&&g.push(C,_t,Pt,X,Vt.z,null)}}else if((C.isMesh||C.isLine||C.isPoints)&&(!C.frustumCulled||it.intersectsObject(C))){let _t=j.update(C),Pt=C.material;if(q&&(C.boundingSphere!==void 0?(C.boundingSphere===null&&C.computeBoundingSphere(),Vt.copy(C.boundingSphere.center)):(_t.boundingSphere===null&&_t.computeBoundingSphere(),Vt.copy(_t.boundingSphere.center)),Vt.applyMatrix4(C.matrixWorld).applyMatrix4(kt)),Array.isArray(Pt)){let It=_t.groups;for(let Wt=0,Jt=It.length;Wt<Jt;Wt++){let zt=It[Wt],ue=Pt[zt.materialIndex];ue&&ue.visible&&g.push(C,_t,ue,X,Vt.z,zt)}}else Pt.visible&&g.push(C,_t,Pt,X,Vt.z,null)}}let ht=C.children;for(let _t=0,Pt=ht.length;_t<Pt;_t++)ma(ht[_t],F,X,q)}function jc(C,F,X,q){let O=C.opaque,ht=C.transmissive,_t=C.transparent;p.setupLightsView(X),lt===!0&&at.setGlobalState(v.clippingPlanes,X),q&&Z.viewport(z.copy(q)),O.length>0&&Mr(O,F,X),ht.length>0&&Mr(ht,F,X),_t.length>0&&Mr(_t,F,X),Z.buffers.depth.setTest(!0),Z.buffers.depth.setMask(!0),Z.buffers.color.setMask(!0),Z.setPolygonOffset(!1)}function Qc(C,F,X,q){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[q.id]===void 0&&(p.state.transmissionRenderTarget[q.id]=new rn(1,1,{generateMipmaps:!0,type:V.has("EXT_color_buffer_half_float")||V.has("EXT_color_buffer_float")?hr:Di,minFilter:en,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ae.workingColorSpace}));let ht=p.state.transmissionRenderTarget[q.id],_t=q.viewport||z;ht.setSize(_t.z,_t.w);let Pt=v.getRenderTarget();v.setRenderTarget(ht),v.getClearColor(H),Y=v.getClearAlpha(),Y<1&&v.setClearColor(16777215,.5),v.clear(),Gt&&Nt.render(X);let It=v.toneMapping;v.toneMapping=Rn;let Wt=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),p.setupLightsView(q),lt===!0&&at.setGlobalState(v.clippingPlanes,q),Mr(C,X,q),A.updateMultisampleRenderTarget(ht),A.updateRenderTargetMipmap(ht),V.has("WEBGL_multisampled_render_to_texture")===!1){let Jt=!1;for(let zt=0,ue=F.length;zt<ue;zt++){let _e=F[zt],be=_e.object,ai=_e.geometry,fe=_e.material,Ut=_e.group;if(fe.side===Ge&&be.layers.test(q.layers)){let qi=fe.side;fe.side=Ke,fe.needsUpdate=!0,th(be,X,q,ai,fe,Ut),fe.side=qi,fe.needsUpdate=!0,Jt=!0}}Jt===!0&&(A.updateMultisampleRenderTarget(ht),A.updateRenderTargetMipmap(ht))}v.setRenderTarget(Pt),v.setClearColor(H,Y),Wt!==void 0&&(q.viewport=Wt),v.toneMapping=It}function Mr(C,F,X){let q=F.isScene===!0?F.overrideMaterial:null;for(let O=0,ht=C.length;O<ht;O++){let _t=C[O],Pt=_t.object,It=_t.geometry,Wt=q===null?_t.material:q,Jt=_t.group;Pt.layers.test(X.layers)&&th(Pt,F,X,It,Wt,Jt)}}function th(C,F,X,q,O,ht){C.onBeforeRender(v,F,X,q,O,ht),C.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,C.matrixWorld),C.normalMatrix.getNormalMatrix(C.modelViewMatrix),O.onBeforeRender(v,F,X,q,C,ht),O.transparent===!0&&O.side===Ge&&O.forceSinglePass===!1?(O.side=Ke,O.needsUpdate=!0,v.renderBufferDirect(X,F,q,O,C,ht),O.side=Cn,O.needsUpdate=!0,v.renderBufferDirect(X,F,q,O,C,ht),O.side=Ge):v.renderBufferDirect(X,F,q,O,C,ht),C.onAfterRender(v,F,X,q,O,ht)}function br(C,F,X){F.isScene!==!0&&(F=ce);let q=J.get(C),O=p.state.lights,ht=p.state.shadowsArray,_t=O.state.version,Pt=yt.getParameters(C,O.state,ht,F,X),It=yt.getProgramCacheKey(Pt),Wt=q.programs;q.environment=C.isMeshStandardMaterial?F.environment:null,q.fog=F.fog,q.envMap=(C.isMeshStandardMaterial?L:b).get(C.envMap||q.environment),q.envMapRotation=q.environment!==null&&C.envMap===null?F.environmentRotation:C.envMapRotation,Wt===void 0&&(C.addEventListener("dispose",$t),Wt=new Map,q.programs=Wt);let Jt=Wt.get(It);if(Jt!==void 0){if(q.currentProgram===Jt&&q.lightsStateVersion===_t)return ih(C,Pt),Jt}else Pt.uniforms=yt.getUniforms(C),C.onBeforeCompile(Pt,v),Jt=yt.acquireProgram(Pt,It),Wt.set(It,Jt),q.uniforms=Pt.uniforms;let zt=q.uniforms;return(!C.isShaderMaterial&&!C.isRawShaderMaterial||C.clipping===!0)&&(zt.clippingPlanes=at.uniform),ih(C,Pt),q.needsLights=Nf(C),q.lightsStateVersion=_t,q.needsLights&&(zt.ambientLightColor.value=O.state.ambient,zt.lightProbe.value=O.state.probe,zt.directionalLights.value=O.state.directional,zt.directionalLightShadows.value=O.state.directionalShadow,zt.spotLights.value=O.state.spot,zt.spotLightShadows.value=O.state.spotShadow,zt.rectAreaLights.value=O.state.rectArea,zt.ltc_1.value=O.state.rectAreaLTC1,zt.ltc_2.value=O.state.rectAreaLTC2,zt.pointLights.value=O.state.point,zt.pointLightShadows.value=O.state.pointShadow,zt.hemisphereLights.value=O.state.hemi,zt.directionalShadowMap.value=O.state.directionalShadowMap,zt.directionalShadowMatrix.value=O.state.directionalShadowMatrix,zt.spotShadowMap.value=O.state.spotShadowMap,zt.spotLightMatrix.value=O.state.spotLightMatrix,zt.spotLightMap.value=O.state.spotLightMap,zt.pointShadowMap.value=O.state.pointShadowMap,zt.pointShadowMatrix.value=O.state.pointShadowMatrix),q.currentProgram=Jt,q.uniformsList=null,Jt}function eh(C){if(C.uniformsList===null){let F=C.currentProgram.getUniforms();C.uniformsList=Ts.seqWithValue(F.seq,C.uniforms)}return C.uniformsList}function ih(C,F){let X=J.get(C);X.outputColorSpace=F.outputColorSpace,X.batching=F.batching,X.batchingColor=F.batchingColor,X.instancing=F.instancing,X.instancingColor=F.instancingColor,X.instancingMorph=F.instancingMorph,X.skinning=F.skinning,X.morphTargets=F.morphTargets,X.morphNormals=F.morphNormals,X.morphColors=F.morphColors,X.morphTargetsCount=F.morphTargetsCount,X.numClippingPlanes=F.numClippingPlanes,X.numIntersection=F.numClipIntersection,X.vertexAlphas=F.vertexAlphas,X.vertexTangents=F.vertexTangents,X.toneMapping=F.toneMapping}function Uf(C,F,X,q,O){F.isScene!==!0&&(F=ce),A.resetTextureUnits();let ht=F.fog,_t=q.isMeshStandardMaterial?F.environment:null,Pt=P===null?v.outputColorSpace:P.isXRRenderTarget===!0?P.texture.colorSpace:Us,It=(q.isMeshStandardMaterial?L:b).get(q.envMap||_t),Wt=q.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,Jt=!!X.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),zt=!!X.morphAttributes.position,ue=!!X.morphAttributes.normal,_e=!!X.morphAttributes.color,be=Rn;q.toneMapped&&(P===null||P.isXRRenderTarget===!0)&&(be=v.toneMapping);let ai=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,fe=ai!==void 0?ai.length:0,Ut=J.get(q),qi=p.state.lights;if(lt===!0&&(At===!0||C!==w)){let wi=C===w&&q.id===S;at.setState(q,C,wi)}let de=!1;q.version===Ut.__version?(Ut.needsLights&&Ut.lightsStateVersion!==qi.state.version||Ut.outputColorSpace!==Pt||O.isBatchedMesh&&Ut.batching===!1||!O.isBatchedMesh&&Ut.batching===!0||O.isBatchedMesh&&Ut.batchingColor===!0&&O.colorTexture===null||O.isBatchedMesh&&Ut.batchingColor===!1&&O.colorTexture!==null||O.isInstancedMesh&&Ut.instancing===!1||!O.isInstancedMesh&&Ut.instancing===!0||O.isSkinnedMesh&&Ut.skinning===!1||!O.isSkinnedMesh&&Ut.skinning===!0||O.isInstancedMesh&&Ut.instancingColor===!0&&O.instanceColor===null||O.isInstancedMesh&&Ut.instancingColor===!1&&O.instanceColor!==null||O.isInstancedMesh&&Ut.instancingMorph===!0&&O.morphTexture===null||O.isInstancedMesh&&Ut.instancingMorph===!1&&O.morphTexture!==null||Ut.envMap!==It||q.fog===!0&&Ut.fog!==ht||Ut.numClippingPlanes!==void 0&&(Ut.numClippingPlanes!==at.numPlanes||Ut.numIntersection!==at.numIntersection)||Ut.vertexAlphas!==Wt||Ut.vertexTangents!==Jt||Ut.morphTargets!==zt||Ut.morphNormals!==ue||Ut.morphColors!==_e||Ut.toneMapping!==be||Ut.morphTargetsCount!==fe)&&(de=!0):(de=!0,Ut.__version=q.version);let Pi=Ut.currentProgram;de===!0&&(Pi=br(q,F,O));let os=!1,gi=!1,Xs=!1,we=Pi.getUniforms(),Ni=Ut.uniforms;if(Z.useProgram(Pi.program)&&(os=!0,gi=!0,Xs=!0),q.id!==S&&(S=q.id,gi=!0),os||w!==C){Z.buffers.depth.getReversed()?(dt.copy(C.projectionMatrix),Rd(dt),Cd(dt),we.setValue(B,"projectionMatrix",dt)):we.setValue(B,"projectionMatrix",C.projectionMatrix),we.setValue(B,"viewMatrix",C.matrixWorldInverse);let xn=we.map.cameraPosition;xn!==void 0&&xn.setValue(B,Dt.setFromMatrixPosition(C.matrixWorld)),et.logarithmicDepthBuffer&&we.setValue(B,"logDepthBufFC",2/(Math.log(C.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&we.setValue(B,"isOrthographic",C.isOrthographicCamera===!0),w!==C&&(w=C,gi=!0,Xs=!0)}if(O.isSkinnedMesh){we.setOptional(B,O,"bindMatrix"),we.setOptional(B,O,"bindMatrixInverse");let wi=O.skeleton;wi&&(wi.boneTexture===null&&wi.computeBoneTexture(),we.setValue(B,"boneTexture",wi.boneTexture,A))}O.isBatchedMesh&&(we.setOptional(B,O,"batchingTexture"),we.setValue(B,"batchingTexture",O._matricesTexture,A),we.setOptional(B,O,"batchingIdTexture"),we.setValue(B,"batchingIdTexture",O._indirectTexture,A),we.setOptional(B,O,"batchingColorTexture"),O._colorsTexture!==null&&we.setValue(B,"batchingColorTexture",O._colorsTexture,A));let qs=X.morphAttributes;if((qs.position!==void 0||qs.normal!==void 0||qs.color!==void 0)&&Ot.update(O,X,Pi),(gi||Ut.receiveShadow!==O.receiveShadow)&&(Ut.receiveShadow=O.receiveShadow,we.setValue(B,"receiveShadow",O.receiveShadow)),q.isMeshGouraudMaterial&&q.envMap!==null&&(Ni.envMap.value=It,Ni.flipEnvMap.value=It.isCubeTexture&&It.isRenderTargetTexture===!1?-1:1),q.isMeshStandardMaterial&&q.envMap===null&&F.environment!==null&&(Ni.envMapIntensity.value=F.environmentIntensity),gi&&(we.setValue(B,"toneMappingExposure",v.toneMappingExposure),Ut.needsLights&&kf(Ni,Xs),ht&&q.fog===!0&&st.refreshFogUniforms(Ni,ht),st.refreshMaterialUniforms(Ni,q,$,ot,p.state.transmissionRenderTarget[C.id]),Ts.upload(B,eh(Ut),Ni,A)),q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(Ts.upload(B,eh(Ut),Ni,A),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&we.setValue(B,"center",O.center),we.setValue(B,"modelViewMatrix",O.modelViewMatrix),we.setValue(B,"normalMatrix",O.normalMatrix),we.setValue(B,"modelMatrix",O.matrixWorld),q.isShaderMaterial||q.isRawShaderMaterial){let wi=q.uniformsGroups;for(let xn=0,yn=wi.length;xn<yn;xn++){let nh=wi[xn];N.update(nh,Pi),N.bind(nh,Pi)}}return Pi}function kf(C,F){C.ambientLightColor.needsUpdate=F,C.lightProbe.needsUpdate=F,C.directionalLights.needsUpdate=F,C.directionalLightShadows.needsUpdate=F,C.pointLights.needsUpdate=F,C.pointLightShadows.needsUpdate=F,C.spotLights.needsUpdate=F,C.spotLightShadows.needsUpdate=F,C.rectAreaLights.needsUpdate=F,C.hemisphereLights.needsUpdate=F}function Nf(C){return C.isMeshLambertMaterial||C.isMeshToonMaterial||C.isMeshPhongMaterial||C.isMeshStandardMaterial||C.isShadowMaterial||C.isShaderMaterial&&C.lights===!0}this.getActiveCubeFace=function(){return T},this.getActiveMipmapLevel=function(){return E},this.getRenderTarget=function(){return P},this.setRenderTargetTextures=function(C,F,X){J.get(C.texture).__webglTexture=F,J.get(C.depthTexture).__webglTexture=X;let q=J.get(C);q.__hasExternalTextures=!0,q.__autoAllocateDepthBuffer=X===void 0,q.__autoAllocateDepthBuffer||V.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),q.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(C,F){let X=J.get(C);X.__webglFramebuffer=F,X.__useDefaultFramebuffer=F===void 0},this.setRenderTarget=function(C,F=0,X=0){P=C,T=F,E=X;let q=!0,O=null,ht=!1,_t=!1;if(C){let It=J.get(C);if(It.__useDefaultFramebuffer!==void 0)Z.bindFramebuffer(B.FRAMEBUFFER,null),q=!1;else if(It.__webglFramebuffer===void 0)A.setupRenderTarget(C);else if(It.__hasExternalTextures)A.rebindTextures(C,J.get(C.texture).__webglTexture,J.get(C.depthTexture).__webglTexture);else if(C.depthBuffer){let zt=C.depthTexture;if(It.__boundDepthTexture!==zt){if(zt!==null&&J.has(zt)&&(C.width!==zt.image.width||C.height!==zt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");A.setupDepthRenderbuffer(C)}}let Wt=C.texture;(Wt.isData3DTexture||Wt.isDataArrayTexture||Wt.isCompressedArrayTexture)&&(_t=!0);let Jt=J.get(C).__webglFramebuffer;C.isWebGLCubeRenderTarget?(Array.isArray(Jt[F])?O=Jt[F][X]:O=Jt[F],ht=!0):C.samples>0&&A.useMultisampledRTT(C)===!1?O=J.get(C).__webglMultisampledFramebuffer:Array.isArray(Jt)?O=Jt[X]:O=Jt,z.copy(C.viewport),k.copy(C.scissor),U=C.scissorTest}else z.copy(Rt).multiplyScalar($).floor(),k.copy(Yt).multiplyScalar($).floor(),U=le;if(Z.bindFramebuffer(B.FRAMEBUFFER,O)&&q&&Z.drawBuffers(C,O),Z.viewport(z),Z.scissor(k),Z.setScissorTest(U),ht){let It=J.get(C.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+F,It.__webglTexture,X)}else if(_t){let It=J.get(C.texture),Wt=F||0;B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,It.__webglTexture,X||0,Wt)}S=-1},this.readRenderTargetPixels=function(C,F,X,q,O,ht,_t){if(!(C&&C.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Pt=J.get(C).__webglFramebuffer;if(C.isWebGLCubeRenderTarget&&_t!==void 0&&(Pt=Pt[_t]),Pt){Z.bindFramebuffer(B.FRAMEBUFFER,Pt);try{let It=C.texture,Wt=It.format,Jt=It.type;if(!et.textureFormatReadable(Wt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!et.textureTypeReadable(Jt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}F>=0&&F<=C.width-q&&X>=0&&X<=C.height-O&&B.readPixels(F,X,q,O,Bt.convert(Wt),Bt.convert(Jt),ht)}finally{let It=P!==null?J.get(P).__webglFramebuffer:null;Z.bindFramebuffer(B.FRAMEBUFFER,It)}}},this.readRenderTargetPixelsAsync=async function(C,F,X,q,O,ht,_t){if(!(C&&C.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Pt=J.get(C).__webglFramebuffer;if(C.isWebGLCubeRenderTarget&&_t!==void 0&&(Pt=Pt[_t]),Pt){let It=C.texture,Wt=It.format,Jt=It.type;if(!et.textureFormatReadable(Wt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!et.textureTypeReadable(Jt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(F>=0&&F<=C.width-q&&X>=0&&X<=C.height-O){Z.bindFramebuffer(B.FRAMEBUFFER,Pt);let zt=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,zt),B.bufferData(B.PIXEL_PACK_BUFFER,ht.byteLength,B.STREAM_READ),B.readPixels(F,X,q,O,Bt.convert(Wt),Bt.convert(Jt),0);let ue=P!==null?J.get(P).__webglFramebuffer:null;Z.bindFramebuffer(B.FRAMEBUFFER,ue);let _e=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await Ad(B,_e,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,zt),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,ht),B.deleteBuffer(zt),B.deleteSync(_e),ht}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(C,F=null,X=0){C.isTexture!==!0&&(er("WebGLRenderer: copyFramebufferToTexture function signature has changed."),F=arguments[0]||null,C=arguments[1]);let q=Math.pow(2,-X),O=Math.floor(C.image.width*q),ht=Math.floor(C.image.height*q),_t=F!==null?F.x:0,Pt=F!==null?F.y:0;A.setTexture2D(C,0),B.copyTexSubImage2D(B.TEXTURE_2D,X,0,0,_t,Pt,O,ht),Z.unbindTexture()},this.copyTextureToTexture=function(C,F,X=null,q=null,O=0){C.isTexture!==!0&&(er("WebGLRenderer: copyTextureToTexture function signature has changed."),q=arguments[0]||null,C=arguments[1],F=arguments[2],O=arguments[3]||0,X=null);let ht,_t,Pt,It,Wt,Jt,zt,ue,_e,be=C.isCompressedTexture?C.mipmaps[O]:C.image;X!==null?(ht=X.max.x-X.min.x,_t=X.max.y-X.min.y,Pt=X.isBox3?X.max.z-X.min.z:1,It=X.min.x,Wt=X.min.y,Jt=X.isBox3?X.min.z:0):(ht=be.width,_t=be.height,Pt=be.depth||1,It=0,Wt=0,Jt=0),q!==null?(zt=q.x,ue=q.y,_e=q.z):(zt=0,ue=0,_e=0);let ai=Bt.convert(F.format),fe=Bt.convert(F.type),Ut;F.isData3DTexture?(A.setTexture3D(F,0),Ut=B.TEXTURE_3D):F.isDataArrayTexture||F.isCompressedArrayTexture?(A.setTexture2DArray(F,0),Ut=B.TEXTURE_2D_ARRAY):(A.setTexture2D(F,0),Ut=B.TEXTURE_2D),B.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,F.flipY),B.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,F.premultiplyAlpha),B.pixelStorei(B.UNPACK_ALIGNMENT,F.unpackAlignment);let qi=B.getParameter(B.UNPACK_ROW_LENGTH),de=B.getParameter(B.UNPACK_IMAGE_HEIGHT),Pi=B.getParameter(B.UNPACK_SKIP_PIXELS),os=B.getParameter(B.UNPACK_SKIP_ROWS),gi=B.getParameter(B.UNPACK_SKIP_IMAGES);B.pixelStorei(B.UNPACK_ROW_LENGTH,be.width),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,be.height),B.pixelStorei(B.UNPACK_SKIP_PIXELS,It),B.pixelStorei(B.UNPACK_SKIP_ROWS,Wt),B.pixelStorei(B.UNPACK_SKIP_IMAGES,Jt);let Xs=C.isDataArrayTexture||C.isData3DTexture,we=F.isDataArrayTexture||F.isData3DTexture;if(C.isRenderTargetTexture||C.isDepthTexture){let Ni=J.get(C),qs=J.get(F),wi=J.get(Ni.__renderTarget),xn=J.get(qs.__renderTarget);Z.bindFramebuffer(B.READ_FRAMEBUFFER,wi.__webglFramebuffer),Z.bindFramebuffer(B.DRAW_FRAMEBUFFER,xn.__webglFramebuffer);for(let yn=0;yn<Pt;yn++)Xs&&B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,J.get(C).__webglTexture,O,Jt+yn),C.isDepthTexture?(we&&B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,J.get(F).__webglTexture,O,_e+yn),B.blitFramebuffer(It,Wt,ht,_t,zt,ue,ht,_t,B.DEPTH_BUFFER_BIT,B.NEAREST)):we?B.copyTexSubImage3D(Ut,O,zt,ue,_e+yn,It,Wt,ht,_t):B.copyTexSubImage2D(Ut,O,zt,ue,_e+yn,It,Wt,ht,_t);Z.bindFramebuffer(B.READ_FRAMEBUFFER,null),Z.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else we?C.isDataTexture||C.isData3DTexture?B.texSubImage3D(Ut,O,zt,ue,_e,ht,_t,Pt,ai,fe,be.data):F.isCompressedArrayTexture?B.compressedTexSubImage3D(Ut,O,zt,ue,_e,ht,_t,Pt,ai,be.data):B.texSubImage3D(Ut,O,zt,ue,_e,ht,_t,Pt,ai,fe,be):C.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,O,zt,ue,ht,_t,ai,fe,be.data):C.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,O,zt,ue,be.width,be.height,ai,be.data):B.texSubImage2D(B.TEXTURE_2D,O,zt,ue,ht,_t,ai,fe,be);B.pixelStorei(B.UNPACK_ROW_LENGTH,qi),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,de),B.pixelStorei(B.UNPACK_SKIP_PIXELS,Pi),B.pixelStorei(B.UNPACK_SKIP_ROWS,os),B.pixelStorei(B.UNPACK_SKIP_IMAGES,gi),O===0&&F.generateMipmaps&&B.generateMipmap(Ut),Z.unbindTexture()},this.copyTextureToTexture3D=function(C,F,X=null,q=null,O=0){return C.isTexture!==!0&&(er("WebGLRenderer: copyTextureToTexture3D function signature has changed."),X=arguments[0]||null,q=arguments[1]||null,C=arguments[2],F=arguments[3],O=arguments[4]||0),er('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(C,F,X,q,O)},this.initRenderTarget=function(C){J.get(C).__webglFramebuffer===void 0&&A.setupRenderTarget(C)},this.initTexture=function(C){C.isCubeTexture?A.setTextureCube(C,0):C.isData3DTexture?A.setTexture3D(C,0):C.isDataArrayTexture||C.isCompressedArrayTexture?A.setTexture2DArray(C,0):A.setTexture2D(C,0),Z.unbindTexture()},this.resetState=function(){T=0,E=0,P=null,Z.reset(),he.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return nn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorspace=ae._getDrawingBufferColorSpace(t),e.unpackColorSpace=ae._getUnpackColorSpace()}};var po=class s{constructor(t,e=1,i=1e3){this.isFog=!0,this.name="",this.color=new ct(t),this.near=e,this.far=i}clone(){return new s(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},mo=class extends Ue{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new ui,this.environmentIntensity=1,this.environmentRotation=new ui,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}};var ar=class extends hi{constructor(t=null,e=1,i=1,n,r,o,a,l,c=_i,h=_i,f,d){super(null,o,a,l,c,h,n,r,f,d),this.isDataTexture=!0,this.image={data:t,width:e,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var lr=class extends ne{constructor(t,e,i,n=1){super(t,e,i),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=n}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){let t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}},Ms=new Tt,nu=new Tt,Wr=[],su=new on,bx=new Tt,js=new Kt,Qs=new an,fi=class extends Kt{constructor(t,e,i){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new lr(new Float32Array(i*16),16),this.instanceColor=null,this.morphTexture=null,this.count=i,this.boundingBox=null,this.boundingSphere=null;for(let n=0;n<i;n++)this.setMatrixAt(n,bx)}computeBoundingBox(){let t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new on),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let i=0;i<e;i++)this.getMatrixAt(i,Ms),su.copy(t.boundingBox).applyMatrix4(Ms),this.boundingBox.union(su)}computeBoundingSphere(){let t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new an),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let i=0;i<e;i++)this.getMatrixAt(i,Ms),Qs.copy(t.boundingSphere).applyMatrix4(Ms),this.boundingSphere.union(Qs)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){let i=e.morphTargetInfluences,n=this.morphTexture.source.data.data,r=i.length+1,o=t*r+1;for(let a=0;a<i.length;a++)i[a]=n[o+a]}raycast(t,e){let i=this.matrixWorld,n=this.count;if(js.geometry=this.geometry,js.material=this.material,js.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Qs.copy(this.boundingSphere),Qs.applyMatrix4(i),t.ray.intersectsSphere(Qs)!==!1))for(let r=0;r<n;r++){this.getMatrixAt(r,Ms),nu.multiplyMatrices(i,Ms),js.matrixWorld=nu,js.raycast(t,Wr);for(let o=0,a=Wr.length;o<a;o++){let l=Wr[o];l.instanceId=r,l.object=this,e.push(l)}Wr.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new lr(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}setMorphAt(t,e){let i=e.morphTargetInfluences,n=i.length+1;this.morphTexture===null&&(this.morphTexture=new ar(new Float32Array(n*this.count),n,this.count,yc,Oi));let r=this.morphTexture.source.data.data,o=0;for(let c=0;c<i.length;c++)o+=i[c];let a=this.geometry.morphTargetsRelative?1:1-o,l=n*t;r[l]=a,r.set(i,l+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}};var cr=class extends ln{static get type(){return"LineBasicMaterial"}constructor(t){super(),this.isLineBasicMaterial=!0,this.color=new ct(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},go=new D,xo=new D,ru=new Tt,tr=new rr,Xr=new an,qa=new D,ou=new D,Kl=class extends Ue{constructor(t=new xe,e=new cr){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,i=[0];for(let n=1,r=e.count;n<r;n++)go.fromBufferAttribute(e,n-1),xo.fromBufferAttribute(e,n),i[n]=i[n-1],i[n]+=go.distanceTo(xo);t.setAttribute("lineDistance",new ie(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,e){let i=this.geometry,n=this.matrixWorld,r=t.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Xr.copy(i.boundingSphere),Xr.applyMatrix4(n),Xr.radius+=r,t.ray.intersectsSphere(Xr)===!1)return;ru.copy(n).invert(),tr.copy(t.ray).applyMatrix4(ru);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=i.index,d=i.attributes.position;if(h!==null){let u=Math.max(0,o.start),x=Math.min(h.count,o.start+o.count);for(let y=u,g=x-1;y<g;y+=c){let p=h.getX(y),_=h.getX(y+1),M=qr(this,t,tr,l,p,_);M&&e.push(M)}if(this.isLineLoop){let y=h.getX(x-1),g=h.getX(u),p=qr(this,t,tr,l,y,g);p&&e.push(p)}}else{let u=Math.max(0,o.start),x=Math.min(d.count,o.start+o.count);for(let y=u,g=x-1;y<g;y+=c){let p=qr(this,t,tr,l,y,y+1);p&&e.push(p)}if(this.isLineLoop){let y=qr(this,t,tr,l,x-1,u);y&&e.push(y)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){let n=e[i[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=n.length;r<o;r++){let a=n[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function qr(s,t,e,i,n,r){let o=s.geometry.attributes.position;if(go.fromBufferAttribute(o,n),xo.fromBufferAttribute(o,r),e.distanceSqToSegment(go,xo,qa,ou)>i)return;qa.applyMatrix4(s.matrixWorld);let l=t.ray.origin.distanceTo(qa);if(!(l<t.near||l>t.far))return{distance:l,point:ou.clone().applyMatrix4(s.matrixWorld),index:n,face:null,faceIndex:null,barycoord:null,object:s}}var au=new D,lu=new D,yo=class extends Kl{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,i=[];for(let n=0,r=e.count;n<r;n+=2)au.fromBufferAttribute(e,n),lu.fromBufferAttribute(e,n+1),i[n]=n===0?0:i[n-1],i[n+1]=i[n]+au.distanceTo(lu);t.setAttribute("lineDistance",new ie(i,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var jl=class extends ln{static get type(){return"PointsMaterial"}constructor(t){super(),this.isPointsMaterial=!0,this.color=new ct(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},cu=new Tt,Ql=new rr,Yr=new an,Zr=new D,In=class extends Ue{constructor(t=new xe,e=new jl){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,e){let i=this.geometry,n=this.matrixWorld,r=t.params.Points.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Yr.copy(i.boundingSphere),Yr.applyMatrix4(n),Yr.radius+=r,t.ray.intersectsSphere(Yr)===!1)return;cu.copy(n).invert(),Ql.copy(t.ray).applyMatrix4(cu);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=i.index,f=i.attributes.position;if(c!==null){let d=Math.max(0,o.start),u=Math.min(c.count,o.start+o.count);for(let x=d,y=u;x<y;x++){let g=c.getX(x);Zr.fromBufferAttribute(f,g),hu(Zr,g,l,n,t,e,this)}}else{let d=Math.max(0,o.start),u=Math.min(f.count,o.start+o.count);for(let x=d,y=u;x<y;x++)Zr.fromBufferAttribute(f,x),hu(Zr,x,l,n,t,e,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){let n=e[i[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=n.length;r<o;r++){let a=n[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function hu(s,t,e,i,n,r,o){let a=Ql.distanceSqToPoint(s);if(a<e){let l=new D;Ql.closestPointToPoint(s,l),l.applyMatrix4(i);let c=n.ray.origin.distanceTo(l);if(c<n.near||c>n.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var vo=class extends hi{constructor(t,e,i,n,r,o,a,l,c){super(t,e,i,n,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var re=class s extends xe{constructor(t=1,e=1,i=1,n=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:i,radialSegments:n,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;n=Math.floor(n),r=Math.floor(r);let h=[],f=[],d=[],u=[],x=0,y=[],g=i/2,p=0;_(),o===!1&&(t>0&&M(!0),e>0&&M(!1)),this.setIndex(h),this.setAttribute("position",new ie(f,3)),this.setAttribute("normal",new ie(d,3)),this.setAttribute("uv",new ie(u,2));function _(){let v=new D,I=new D,T=0,E=(e-t)/i;for(let P=0;P<=r;P++){let S=[],w=P/r,z=w*(e-t)+t;for(let k=0;k<=n;k++){let U=k/n,H=U*l+a,Y=Math.sin(H),W=Math.cos(H);I.x=z*Y,I.y=-w*i+g,I.z=z*W,f.push(I.x,I.y,I.z),v.set(Y,E,W).normalize(),d.push(v.x,v.y,v.z),u.push(U,1-w),S.push(x++)}y.push(S)}for(let P=0;P<n;P++)for(let S=0;S<r;S++){let w=y[S][P],z=y[S+1][P],k=y[S+1][P+1],U=y[S][P+1];(t>0||S!==0)&&(h.push(w,z,U),T+=3),(e>0||S!==r-1)&&(h.push(z,k,U),T+=3)}c.addGroup(p,T,0),p+=T}function M(v){let I=x,T=new se,E=new D,P=0,S=v===!0?t:e,w=v===!0?1:-1;for(let k=1;k<=n;k++)f.push(0,g*w,0),d.push(0,w,0),u.push(.5,.5),x++;let z=x;for(let k=0;k<=n;k++){let H=k/n*l+a,Y=Math.cos(H),W=Math.sin(H);E.x=S*W,E.y=g*w,E.z=S*Y,f.push(E.x,E.y,E.z),d.push(0,w,0),T.x=Y*.5+.5,T.y=W*.5*w+.5,u.push(T.x,T.y),x++}for(let k=0;k<n;k++){let U=I+k,H=z+k;v===!0?h.push(H,H+1,U):h.push(H+1,H,U),P+=3}c.addGroup(p,P,v===!0?1:2),p+=P}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},je=class s extends re{constructor(t=1,e=1,i=32,n=1,r=!1,o=0,a=Math.PI*2){super(0,t,e,i,n,r,o,a),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:i,heightSegments:n,openEnded:r,thetaStart:o,thetaLength:a}}static fromJSON(t){return new s(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},tc=class s extends xe{constructor(t=[],e=[],i=1,n=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:i,detail:n};let r=[],o=[];a(n),c(i),h(),this.setAttribute("position",new ie(r,3)),this.setAttribute("normal",new ie(r.slice(),3)),this.setAttribute("uv",new ie(o,2)),n===0?this.computeVertexNormals():this.normalizeNormals();function a(_){let M=new D,v=new D,I=new D;for(let T=0;T<e.length;T+=3)u(e[T+0],M),u(e[T+1],v),u(e[T+2],I),l(M,v,I,_)}function l(_,M,v,I){let T=I+1,E=[];for(let P=0;P<=T;P++){E[P]=[];let S=_.clone().lerp(v,P/T),w=M.clone().lerp(v,P/T),z=T-P;for(let k=0;k<=z;k++)k===0&&P===T?E[P][k]=S:E[P][k]=S.clone().lerp(w,k/z)}for(let P=0;P<T;P++)for(let S=0;S<2*(T-P)-1;S++){let w=Math.floor(S/2);S%2===0?(d(E[P][w+1]),d(E[P+1][w]),d(E[P][w])):(d(E[P][w+1]),d(E[P+1][w+1]),d(E[P+1][w]))}}function c(_){let M=new D;for(let v=0;v<r.length;v+=3)M.x=r[v+0],M.y=r[v+1],M.z=r[v+2],M.normalize().multiplyScalar(_),r[v+0]=M.x,r[v+1]=M.y,r[v+2]=M.z}function h(){let _=new D;for(let M=0;M<r.length;M+=3){_.x=r[M+0],_.y=r[M+1],_.z=r[M+2];let v=g(_)/2/Math.PI+.5,I=p(_)/Math.PI+.5;o.push(v,1-I)}x(),f()}function f(){for(let _=0;_<o.length;_+=6){let M=o[_+0],v=o[_+2],I=o[_+4],T=Math.max(M,v,I),E=Math.min(M,v,I);T>.9&&E<.1&&(M<.2&&(o[_+0]+=1),v<.2&&(o[_+2]+=1),I<.2&&(o[_+4]+=1))}}function d(_){r.push(_.x,_.y,_.z)}function u(_,M){let v=_*3;M.x=t[v+0],M.y=t[v+1],M.z=t[v+2]}function x(){let _=new D,M=new D,v=new D,I=new D,T=new se,E=new se,P=new se;for(let S=0,w=0;S<r.length;S+=9,w+=6){_.set(r[S+0],r[S+1],r[S+2]),M.set(r[S+3],r[S+4],r[S+5]),v.set(r[S+6],r[S+7],r[S+8]),T.set(o[w+0],o[w+1]),E.set(o[w+2],o[w+3]),P.set(o[w+4],o[w+5]),I.copy(_).add(M).add(v).divideScalar(3);let z=g(I);y(T,w+0,_,z),y(E,w+2,M,z),y(P,w+4,v,z)}}function y(_,M,v,I){I<0&&_.x===1&&(o[M]=_.x-1),v.x===0&&v.z===0&&(o[M]=I/2/Math.PI+.5)}function g(_){return Math.atan2(_.z,-_.x)}function p(_){return Math.atan2(-_.y,Math.sqrt(_.x*_.x+_.z*_.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.vertices,t.indices,t.radius,t.details)}};var _o=class s extends tc{constructor(t=1,e=0){let i=(1+Math.sqrt(5))/2,n=[-1,i,0,1,i,0,-1,-i,0,1,-i,0,0,-1,i,0,1,i,0,-1,-i,0,1,-i,i,0,-1,i,0,1,-i,0,-1,-i,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(n,r,t,e),this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new s(t.radius,t.detail)}};var Qn=class s extends xe{constructor(t=1,e=32,i=16,n=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:i,phiStart:n,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),i=Math.max(2,Math.floor(i));let l=Math.min(o+a,Math.PI),c=0,h=[],f=new D,d=new D,u=[],x=[],y=[],g=[];for(let p=0;p<=i;p++){let _=[],M=p/i,v=0;p===0&&o===0?v=.5/e:p===i&&l===Math.PI&&(v=-.5/e);for(let I=0;I<=e;I++){let T=I/e;f.x=-t*Math.cos(n+T*r)*Math.sin(o+M*a),f.y=t*Math.cos(o+M*a),f.z=t*Math.sin(n+T*r)*Math.sin(o+M*a),x.push(f.x,f.y,f.z),d.copy(f).normalize(),y.push(d.x,d.y,d.z),g.push(T+v,1-M),_.push(c++)}h.push(_)}for(let p=0;p<i;p++)for(let _=0;_<e;_++){let M=h[p][_+1],v=h[p][_],I=h[p+1][_],T=h[p+1][_+1];(p!==0||o>0)&&u.push(M,v,T),(p!==i-1||l<Math.PI)&&u.push(v,I,T)}this.setIndex(u),this.setAttribute("position",new ie(x,3)),this.setAttribute("normal",new ie(y,3)),this.setAttribute("uv",new ie(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var Mo=class s extends xe{constructor(t=1,e=.4,i=12,n=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:i,tubularSegments:n,arc:r},i=Math.floor(i),n=Math.floor(n);let o=[],a=[],l=[],c=[],h=new D,f=new D,d=new D;for(let u=0;u<=i;u++)for(let x=0;x<=n;x++){let y=x/n*r,g=u/i*Math.PI*2;f.x=(t+e*Math.cos(g))*Math.cos(y),f.y=(t+e*Math.cos(g))*Math.sin(y),f.z=e*Math.sin(g),a.push(f.x,f.y,f.z),h.x=t*Math.cos(y),h.y=t*Math.sin(y),d.subVectors(f,h).normalize(),l.push(d.x,d.y,d.z),c.push(x/n),c.push(u/i)}for(let u=1;u<=i;u++)for(let x=1;x<=n;x++){let y=(n+1)*u+x-1,g=(n+1)*(u-1)+x-1,p=(n+1)*(u-1)+x,_=(n+1)*u+x;o.push(y,g,_),o.push(g,p,_)}this.setIndex(o),this.setAttribute("position",new ie(a,3)),this.setAttribute("normal",new ie(l,3)),this.setAttribute("uv",new ie(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new s(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}};var Be=class extends ln{static get type(){return"MeshLambertMaterial"}constructor(t){super(),this.isMeshLambertMaterial=!0,this.color=new ct(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new ct(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=wu,this.normalScale=new se(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ui,this.combine=pc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};function $r(s,t,e){return!s||!e&&s.constructor===t?s:typeof t.BYTES_PER_ELEMENT=="number"?new t(s):Array.prototype.slice.call(s)}function wx(s){return ArrayBuffer.isView(s)&&!(s instanceof DataView)}var Ds=class{constructor(t,e,i,n){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=n!==void 0?n:new e.constructor(i),this.sampleValues=e,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,i=this._cachedIndex,n=e[i],r=e[i-1];i:{t:{let o;e:{n:if(!(t<n)){for(let a=i+2;;){if(n===void 0){if(t<r)break n;return i=e.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===a)break;if(r=n,n=e[++i],t<n)break t}o=e.length;break e}if(!(t>=r)){let a=e[1];t<a&&(i=2,r=a);for(let l=i-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===l)break;if(n=r,r=e[--i-1],t>=r)break t}o=i,i=0;break e}break i}for(;i<o;){let a=i+o>>>1;t<e[a]?o=a:i=a+1}if(n=e[i],r=e[i-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===void 0)return i=e.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,r,n)}return this.interpolate_(i,r,t,n)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,i=this.sampleValues,n=this.valueSize,r=t*n;for(let o=0;o!==n;++o)e[o]=i[r+o];return e}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},ec=class extends Ds{constructor(t,e,i,n){super(t,e,i,n),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:ah,endingEnd:ah}}intervalChanged_(t,e,i){let n=this.parameterPositions,r=t-2,o=t+1,a=n[r],l=n[o];if(a===void 0)switch(this.getSettings_().endingStart){case lh:r=t,a=2*e-i;break;case ch:r=n.length-2,a=e+n[r]-n[r+1];break;default:r=t,a=i}if(l===void 0)switch(this.getSettings_().endingEnd){case lh:o=t,l=2*i-e;break;case ch:o=1,l=i+n[1]-n[0];break;default:o=t-1,l=e}let c=(i-e)*.5,h=this.valueSize;this._weightPrev=c/(e-a),this._weightNext=c/(l-i),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(t,e,i,n){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this._offsetPrev,f=this._offsetNext,d=this._weightPrev,u=this._weightNext,x=(i-e)/(n-e),y=x*x,g=y*x,p=-d*g+2*d*y-d*x,_=(1+d)*g+(-1.5-2*d)*y+(-.5+d)*x+1,M=(-1-u)*g+(1.5+u)*y+.5*x,v=u*g-u*y;for(let I=0;I!==a;++I)r[I]=p*o[h+I]+_*o[c+I]+M*o[l+I]+v*o[f+I];return r}},ic=class extends Ds{constructor(t,e,i,n){super(t,e,i,n)}interpolate_(t,e,i,n){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=(i-e)/(n-e),f=1-h;for(let d=0;d!==a;++d)r[d]=o[c+d]*f+o[l+d]*h;return r}},nc=class extends Ds{constructor(t,e,i,n){super(t,e,i,n)}interpolate_(t){return this.copySampleValue_(t-1)}},Ui=class{constructor(t,e,i,n){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=$r(e,this.TimeBufferType),this.values=$r(i,this.ValueBufferType),this.setInterpolation(n||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,i;if(e.toJSON!==this.toJSON)i=e.toJSON(t);else{i={name:t.name,times:$r(t.times,Array),values:$r(t.values,Array)};let n=t.getInterpolation();n!==t.DefaultInterpolation&&(i.interpolation=n)}return i.type=t.ValueTypeName,i}InterpolantFactoryMethodDiscrete(t){return new nc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new ic(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new ec(this.times,this.values,this.getValueSize(),t)}setInterpolation(t){let e;switch(t){case eo:e=this.InterpolantFactoryMethodDiscrete;break;case Ll:e=this.InterpolantFactoryMethodLinear;break;case xa:e=this.InterpolantFactoryMethodSmooth;break}if(e===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return console.warn("THREE.KeyframeTrack:",i),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return eo;case this.InterpolantFactoryMethodLinear:return Ll;case this.InterpolantFactoryMethodSmooth:return xa}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let i=0,n=e.length;i!==n;++i)e[i]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let i=0,n=e.length;i!==n;++i)e[i]*=t}return this}trim(t,e){let i=this.times,n=i.length,r=0,o=n-1;for(;r!==n&&i[r]<t;)++r;for(;o!==-1&&i[o]>e;)--o;if(++o,r!==0||o!==n){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=i.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),t=!1);let i=this.times,n=this.values,r=i.length;r===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==r;a++){let l=i[a];if(typeof l=="number"&&isNaN(l)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,l),t=!1;break}if(o!==null&&o>l){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,l,o),t=!1;break}o=l}if(n!==void 0&&wx(n))for(let a=0,l=n.length;a!==l;++a){let c=n[a];if(isNaN(c)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),i=this.getValueSize(),n=this.getInterpolation()===xa,r=t.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=t[a],h=t[a+1];if(c!==h&&(a!==1||c!==t[0]))if(n)l=!0;else{let f=a*i,d=f-i,u=f+i;for(let x=0;x!==i;++x){let y=e[f+x];if(y!==e[d+x]||y!==e[u+x]){l=!0;break}}}if(l){if(a!==o){t[o]=t[a];let f=a*i,d=o*i;for(let u=0;u!==i;++u)e[d+u]=e[f+u]}++o}}if(r>0){t[o]=t[r];for(let a=r*i,l=o*i,c=0;c!==i;++c)e[l+c]=e[a+c];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=e.slice(0,o*i)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),i=this.constructor,n=new i(this.name,t,e);return n.createInterpolant=this.createInterpolant,n}};Ui.prototype.TimeBufferType=Float32Array;Ui.prototype.ValueBufferType=Float32Array;Ui.prototype.DefaultInterpolation=Ll;var ts=class extends Ui{constructor(t,e,i){super(t,e,i)}};ts.prototype.ValueTypeName="bool";ts.prototype.ValueBufferType=Array;ts.prototype.DefaultInterpolation=eo;ts.prototype.InterpolantFactoryMethodLinear=void 0;ts.prototype.InterpolantFactoryMethodSmooth=void 0;var sc=class extends Ui{};sc.prototype.ValueTypeName="color";var rc=class extends Ui{};rc.prototype.ValueTypeName="number";var oc=class extends Ds{constructor(t,e,i,n){super(t,e,i,n)}interpolate_(t,e,i,n){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(i-e)/(n-e),c=t*a;for(let h=c+a;c!==h;c+=4)We.slerpFlat(r,0,o,c-a,o,c,l);return r}},bo=class extends Ui{InterpolantFactoryMethodLinear(t){return new oc(this.times,this.values,this.getValueSize(),t)}};bo.prototype.ValueTypeName="quaternion";bo.prototype.InterpolantFactoryMethodSmooth=void 0;var es=class extends Ui{constructor(t,e,i){super(t,e,i)}};es.prototype.ValueTypeName="string";es.prototype.ValueBufferType=Array;es.prototype.DefaultInterpolation=eo;es.prototype.InterpolantFactoryMethodLinear=void 0;es.prototype.InterpolantFactoryMethodSmooth=void 0;var ac=class extends Ui{};ac.prototype.ValueTypeName="vector";var lc=class{constructor(t,e,i){let n=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=i,this.itemStart=function(h){a++,r===!1&&n.onStart!==void 0&&n.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,n.onProgress!==void 0&&n.onProgress(h,o,a),o===a&&(r=!1,n.onLoad!==void 0&&n.onLoad())},this.itemError=function(h){n.onError!==void 0&&n.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,f){return c.push(h,f),this},this.removeHandler=function(h){let f=c.indexOf(h);return f!==-1&&c.splice(f,2),this},this.getHandler=function(h){for(let f=0,d=c.length;f<d;f+=2){let u=c[f],x=c[f+1];if(u.global&&(u.lastIndex=0),u.test(h))return x}return null}}},Sx=new lc,cc=class{constructor(t){this.manager=t!==void 0?t:Sx,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(t,e){let i=this;return new Promise(function(n,r){i.load(t,n,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}};cc.DEFAULT_MATERIAL_NAME="__DEFAULT";var wo=class extends Ue{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new ct(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}},So=class extends wo{constructor(t,e,i){super(t,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Ue.DEFAULT_UP),this.updateMatrix(),this.groundColor=new ct(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}},Ya=new Tt,uu=new D,fu=new D,hc=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new se(512,512),this.map=null,this.mapPass=null,this.matrix=new Tt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new or,this._frameExtents=new se(1,1),this._viewportCount=1,this._viewports=[new Ee(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera,i=this.matrix;uu.setFromMatrixPosition(t.matrixWorld),e.position.copy(uu),fu.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(fu),e.updateMatrixWorld(),Ya.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ya),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Ya)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}};var uc=class extends hc{constructor(){super(new co(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},To=class extends wo{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ue.DEFAULT_UP),this.updateMatrix(),this.target=new Ue,this.shadow=new uc}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}};var Sc="\\[\\]\\.:\\/",Tx=new RegExp("["+Sc+"]","g"),Tc="[^"+Sc+"]",Ex="[^"+Sc.replace("\\.","")+"]",Ax=/((?:WC+[\/:])*)/.source.replace("WC",Tc),Rx=/(WCOD+)?/.source.replace("WCOD",Ex),Cx=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Tc),Px=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Tc),Ix=new RegExp("^"+Ax+Rx+Cx+Px+"$"),zx=["material","materials","bones","map"],fc=class{constructor(t,e,i){let n=i||Te.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,n)}getValue(t,e){this.bind();let i=this._targetGroup.nCachedObjects_,n=this._bindings[i];n!==void 0&&n.getValue(t,e)}setValue(t,e){let i=this._bindings;for(let n=this._targetGroup.nCachedObjects_,r=i.length;n!==r;++n)i[n].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,i=t.length;e!==i;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,i=t.length;e!==i;++e)t[e].unbind()}},Te=class s{constructor(t,e,i){this.path=e,this.parsedPath=i||s.parseTrackName(e),this.node=s.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,i){return t&&t.isAnimationObjectGroup?new s.Composite(t,e,i):new s(t,e,i)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(Tx,"")}static parseTrackName(t){let e=Ix.exec(t);if(e===null)throw new Error("PropertyBinding: Cannot parse trackName: "+t);let i={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},n=i.nodeName&&i.nodeName.lastIndexOf(".");if(n!==void 0&&n!==-1){let r=i.nodeName.substring(n+1);zx.indexOf(r)!==-1&&(i.nodeName=i.nodeName.substring(0,n),i.objectName=r)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+t);return i}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let i=t.skeleton.getBoneByName(e);if(i!==void 0)return i}if(t.children){let i=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===e||a.uuid===e)return a;let l=i(a.children);if(l)return l}return null},n=i(t.children);if(n)return n}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let i=this.resolvedProperty;for(let n=0,r=i.length;n!==r;++n)t[e++]=i[n]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let i=this.resolvedProperty;for(let n=0,r=i.length;n!==r;++n)i[n]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let i=this.resolvedProperty;for(let n=0,r=i.length;n!==r;++n)i[n]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let i=this.resolvedProperty;for(let n=0,r=i.length;n!==r;++n)i[n]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,i=e.objectName,n=e.propertyName,r=e.propertyIndex;if(t||(t=s.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=e.objectIndex;switch(i){case"materials":if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[i]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[i]}if(c!==void 0){if(t[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let o=t[n];if(o===void 0){let c=e.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+n+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.needsUpdate!==void 0?a=this.Versioning.NeedsUpdate:t.matrixWorldNeedsUpdate!==void 0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(n==="morphTargetInfluences"){if(!t.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=n;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Te.Composite=fc;Te.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Te.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Te.prototype.GetterByBindingType=[Te.prototype._getValue_direct,Te.prototype._getValue_array,Te.prototype._getValue_arrayElement,Te.prototype._getValue_toArray];Te.prototype.SetterByBindingTypeAndVersioning=[[Te.prototype._setValue_direct,Te.prototype._setValue_direct_setNeedsUpdate,Te.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Te.prototype._setValue_array,Te.prototype._setValue_array_setNeedsUpdate,Te.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Te.prototype._setValue_arrayElement,Te.prototype._setValue_arrayElement_setNeedsUpdate,Te.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Te.prototype._setValue_fromArray,Te.prototype._setValue_fromArray_setNeedsUpdate,Te.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Ty=new Float32Array(1);typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:dc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=dc);var m={renderer:null,scene:null,camera:null,time:0,dt:.016666666666666666,hour:17,timeScale:.016666666666666666,paused:!0,state:"title",city:null,physics:null,vehicles:[],humans:[],player:null,input:null,cam:null,fx:null,hud:null,audio:null,traffic:null,peds:null,police:null,missions:null,pickups:null,sky:null,weapons:null,vehicleRenderer:null,humanRenderer:null,save:null,settings:{quality:"medium",sensitivity:1,volume:.8,music:.6,vibrate:!0,showFps:!1},stats:{kills:0,copsKilled:0,carsStolen:0,carsDestroyed:0,distance:0,jumps:0,maxWanted:0}};function Xe(s){if(m.settings.vibrate)try{window.NT&&window.NT.vibrate?window.NT.vibrate(s):navigator.vibrate&&navigator.vibrate(s)}catch{}}var Ct=(s,t,e)=>s<t?t:s>e?e:s,Se=(s,t,e)=>s+(t-s)*e,Ec=(s,t,e)=>{let i=Ct((e-s)/(t-s),0,1);return i*i*(3-2*i)},Lu=Math.PI*2;function ii(s){return s=(s+Math.PI)%Lu,s<0&&(s+=Lu),s-Math.PI}function Ns(s,t,e){let i=ii(t-s);return Math.abs(i)<=e?t:s+Math.sign(i)*e}function fr(s,t,e){return s<t?Math.min(s+e,t):Math.max(s-e,t)}var ze=(s,t)=>1-Math.exp(-s*t);function cn(s){let t=s>>>0,e=()=>{t=t+1831565813>>>0;let i=t;return i=Math.imul(i^i>>>15,i|1),i^=i+Math.imul(i^i>>>7,i|61),((i^i>>>14)>>>0)/4294967296};return e.range=(i,n)=>i+(n-i)*e(),e.int=(i,n)=>Math.floor(i+(n-i+1)*e()),e.pick=i=>i[Math.floor(e()*i.length)],e.chance=i=>e()<i,e}var Q=(s=0,t=1)=>s+(t-s)*Math.random(),dr=(s,t)=>Math.floor(s+(t-s+1)*Math.random()),Me=s=>s[Math.floor(Math.random()*s.length)],me=s=>Math.random()<s;function hn(s){let t=Math.floor(Math.abs(s)).toString().replace(/\B(?=(\d{3})+(?!\d))/g,",");return(s<0?"-$":"$")+t}function Ac(s){s=Math.max(0,Math.ceil(s));let t=Math.floor(s/60),e=s%60;return t+":"+(e<10?"0":"")+e}var He=100,Et=8,pr=4.5,oe=.12,qe=15,ni=11,un=-((qe-1)/2)*He,fn=-((ni-1)/2)*He,pi=[2,5.8],Ae=-.6,Ht=s=>un+s*He,qt=s=>fn+s*He,pt={minX:un-Et-pr,maxX:un+(qe-1)*He+Et+pr,minZ:fn-Et-pr,maxZ:fn+(ni-1)*He+Et+pr},bt={minX:pt.minX-55,maxX:pt.maxX+150,minZ:pt.minZ-55,maxZ:pt.maxZ+55,r:45},Ft={x0:780,x1:1010,z0:-8,z1:8,y:1.3,ramp:16},Du=["DDDDSSMTTTTMOO","DDDDMMTTTTTMOO","DDDMMMTTBTTMOO","DDMMMMTTTTMMOO","MMMMMMMMMMMMOO","RRRMMMMMMMMMOO","RRRRMMMPPMMMOO","RRRRRMMPPMMROO","RRRRRRRRRRRROO","RRRRRRRRRRRROO"],Uu={D:"The Docks",S:"Solace Stadium",M:"Midtown",T:"Downtown",B:"Downtown",O:"Ocean Drive",R:"Palm Heights",P:"Starlight Park"},Lx=[15910088,12574930,14011626,15980214,12770540,16050896,15649240,16777215,15790056],Rc=[16732072,4180223,16734780,8185962,16769162];function ku(s=1337){let t=cn(s),e=qe-1,i=ni-1,n=[];for(let R=0;R<i;R++)for(let V=0;V<e;V++)n.push({i:V,j:R,d:Du[R][V],group:R*e+V});let r=(R,V)=>R<0||V<0||R>=e||V>=i?null:n[V*e+R],o=R=>{let V=r(R[0][0],R[0][1]).group;for(let[et,Z]of R)r(et,Z).group=V};o([[4,0],[5,0]]),o([[7,6],[8,6],[7,7],[8,7]]);let a=[];for(let R=0;R<ni;R++)for(let V=0;V<qe;V++)a.push({id:R*qe+V,i:V,j:R,x:Ht(V),z:qt(R),nb:[],light:!1,phase:0});let l=(R,V)=>R<0||V<0||R>=qe||V>=ni?null:a[V*qe+R],c=[],h=new Map,f=(R,V)=>{let et={id:c.length,a:R.id,b:V.id,horiz:R.j===V.j};c.push(et),h.set(R.id+":"+V.id,et),h.set(V.id+":"+R.id,et),R.nb.push(V.id),V.nb.push(R.id)};for(let R=0;R<ni;R++)for(let V=0;V<qe-1;V++){let et=r(V,R-1),Z=r(V,R);et&&Z&&et.group===Z.group||f(l(V,R),l(V+1,R))}for(let R=0;R<qe;R++)for(let V=0;V<ni-1;V++){let et=r(R-1,V),Z=r(R,V);et&&Z&&et.group===Z.group||f(l(R,V),l(R,V+1))}for(let R of a)R.light=R.nb.length>=3,R.phase=t()*18;let d=Et+pr,u=new Map;for(let R of n)u.has(R.group)||u.set(R.group,[]),u.get(R.group).push(R);let x=[];for(let[R,V]of u){let et=99,Z=-1,nt=99,J=-1;for(let A of V)et=Math.min(et,A.i),Z=Math.max(Z,A.i),nt=Math.min(nt,A.j),J=Math.max(J,A.j);x.push({group:R,d:V[0].d,i0:et,i1:Z,j0:nt,j1:J,cells:V,ox0:Ht(et)+Et,ox1:Ht(Z+1)-Et,oz0:qt(nt)+Et,oz1:qt(J+1)-Et,x0:Ht(et)+d,x1:Ht(Z+1)-d,z0:qt(nt)+d,z1:qt(J+1)-d})}let y=(R,V)=>x.find(et=>R>=et.i0&&R<=et.i1&&V>=et.j0&&V<=et.j1),g=[],p=[],_=[],M={palms:[],trees:[],lamps:[],lights:[],umbrellas:[],benches:[],hydrants:[],bins:[]},v=[],I=[],T=[],E=[],P=[],S=[],w={},z=[],k=[],U=[],H=(R,V,et,Z,nt)=>p.push({minX:R,maxX:V,minZ:et,maxZ:Z,h:nt}),Y=R=>(R.y0=R.y0??oe,R.seed=R.seed??t(),g.push(R),R.collide!==!1&&H(R.x-R.w/2,R.x+R.w/2,R.z-R.d/2,R.z+R.d/2,R.y0+R.h),R),W=R=>Math.max(1,Math.round(R))*3.6,ot=(R,V,et)=>{let Z=V-R.x0,nt=R.x1-V,J=et-R.z0,A=R.z1-et,b=Math.min(Z,nt,J,A);return b===Z?[-1,0]:b===nt?[1,0]:b===J?[0,-1]:[0,1]},$=(R,V,et,Z)=>{let nt=[],J=(R.x1-R.x0-Z*(V-1))/V,A=(R.z1-R.z0-Z*(et-1))/et;for(let b=0;b<V;b++)for(let L=0;L<et;L++){let G=R.x0+b*(J+Z),K=R.z0+L*(A+Z);nt.push({x0:G,z0:K,x1:G+J,z1:K+A,cx:G+J/2,cz:K+A/2,w:J,d:A,a:b,b:L,nx:V,nz:et})}return nt},ut=(R,V)=>{P.push({x0:R.x0,z0:R.z0,x1:R.x1,z1:R.z1,kind:"asphalt"});let et=R.w>R.d,Z=Math.floor((et?R.w:R.d)/3.2)-1;for(let nt=0;nt<Z;nt++){let J=(nt+1)/(Z+1);if(!(t()<.45))if(et){let A=R.x0+J*R.w;T.push({x:A,z:R.cz-R.d*.22,h:Math.PI}),R.d>16&&T.push({x:A,z:R.cz+R.d*.22,h:0})}else{let A=R.z0+J*R.d;T.push({x:R.cx-R.w*.22,z:A,h:-Math.PI/2}),R.w>16&&T.push({x:R.cx+R.w*.22,z:A,h:Math.PI/2})}}M.lamps.push({x:R.cx,z:R.cz,rot:0,solo:!0}),_.push({x:R.cx,z:R.cz,r:.3,h:7})},gt=["glass","glass","darkglass","office","office"],Rt=[16777215,14674421,13625087,15267839,16774364,14221300,15786239],Yt=["office","brick","deco","hotel","office","brick"],le=[16777215,15918808,14272432,13162728,16767426,14741720,16119285,16769256],it=(R,V)=>{let et=R-8.6,Z=V-2.4;return 40+170*Math.exp(-(et*et*.08+Z*Z*.12))},lt=(R,V,et,Z,nt,J)=>{let A=t.pick(gt),b=t.pick(Rt),L=Math.max(8,Math.round(nt*t.range(.55,1)/3.6)),G=L*3.6,K=t()<.7,j=t()<.45&&G>60,yt=Y({x:R,z:V,w:et,d:Z,h:j?W(L*.62):G,style:A,color:b,shop:K,roof:"flat"}),st=yt;if(j){let at=t.range(2.5,5);st=Y({x:R,z:V,w:et-at*2,d:Z-at*2,h:W(L*.38),y0:yt.y0+yt.h,style:A,color:b,roof:"flat",collide:!1}),t()<.5&&st.w>14&&(st=Y({x:R,z:V,w:st.w-6,d:st.d-6,h:W(t.int(3,7)),y0:st.y0+st.h,style:A,color:b,roof:"flat",collide:!1}))}let mt=st.y0+st.h;t()<.55&&z.push({type:"antenna",x:st.x+t.range(-2,2),z:st.z+t.range(-2,2),y:mt,h:t.range(8,26)});let Zt=t.int(1,4);for(let at=0;at<Zt;at++)g.push({x:st.x+t.range(-st.w*.3,st.w*.3),z:st.z+t.range(-st.d*.3,st.d*.3),w:t.range(2,5),d:t.range(2,5),h:t.range(1.5,3.5),y0:mt,style:"plain",color:12567752,roof:"flat",seed:t(),collide:!1});return t()<.12&&At(st.x,st.z,st.w+.3,st.d+.3,mt-.6,t.pick([16052454,12572927,16765578])),{roofY:mt}};function At(R,V,et,Z,nt,J){v.push({x0:R-et/2,x1:R+et/2,y0:nt,y1:nt+.25,z0:V-Z/2-.05,z1:V-Z/2+.15,color:J}),v.push({x0:R-et/2,x1:R+et/2,y0:nt,y1:nt+.25,z0:V+Z/2-.15,z1:V+Z/2+.05,color:J}),v.push({x0:R-et/2-.05,x1:R-et/2+.15,y0:nt,y1:nt+.25,z0:V-Z/2,z1:V+Z/2,color:J}),v.push({x0:R+et/2-.15,x1:R+et/2+.05,y0:nt,y1:nt+.25,z0:V-Z/2,z1:V+Z/2,color:J})}let dt=(R,V)=>{let[et,Z]=ot(V,R.cx,R.cz),nt=et!==0,J=t.range(10,14),A=t.range(8.5,11.5),b=nt?A:J,L=nt?J:A,G=(nt?R.w:R.d)*.5-(nt?b:L)*.5-t.range(5,7),K=R.cx+et*G*.6,j=R.cz+Z*G*.6,yt=t()<.35,st=t.pick([16777215,16774108,16769768,14678015,15269864,16773320,15787263,16767416]),mt=t.pick([12607546,12080178,9080729,6122106,13793866,8014650]);Y({x:K,z:j,w:b,d:L,h:yt?7.2:3.9,style:"house",color:st,roof:"gable",roofColor:mt,ridgeAlongX:!nt});let Zt=R.cx+et*(nt?R.w:R.d)*.36,at=R.cz+Z*(nt?R.w:R.d)*.36,wt=t()<.5?1:-1,Nt=nt?Zt:Zt+wt*(b*.5+2.5),Ot=nt?at+wt*(L*.5+2.5):at;if(P.push({x0:Nt-(nt?4:1.8),x1:Nt+(nt?4:1.8),z0:Ot-(nt?1.8:4),z1:Ot+(nt?1.8:4),kind:"drive"}),t()<.55&&T.push({x:Nt,z:Ot,h:Math.atan2(-et,-Z)}),t()<.4){let Qt=R.cx-et*(nt?R.w:R.d)*.28,Bt=R.cz-Z*(nt?R.w:R.d)*.28;S.push({x:Qt,z:Bt,w:nt?4:7,d:nt?7:4})}let St=t.int(1,3);for(let Qt=0;Qt<St;Qt++){let Bt=R.x0+2+t()*(R.w-4),he=R.z0+2+t()*(R.d-4);Math.abs(Bt-K)<b/2+2&&Math.abs(he-j)<L/2+2||(t()<.6?(M.palms.push({x:Bt,z:he,s:t.range(.7,1.1),rot:t()*6.28}),_.push({x:Bt,z:he,r:.4,h:8})):(M.trees.push({x:Bt,z:he,s:t.range(.8,1.3),rot:t()*6.28}),_.push({x:Bt,z:he,r:.5,h:6})))}};for(let R of x){let V=R.i0,et=R.j0,Z=(R.x0+R.x1)/2,nt=(R.z0+R.z1)/2;switch(R.cx=Z,R.cz=nt,R.d){case"T":{P.push({x0:R.x0,z0:R.z0,x1:R.x1,z1:R.z1,kind:"plaza"});let J=it(V+.5,et+.5),A=t.int(0,3);if(A===0)lt(Z,nt,t.range(44,58),t.range(44,58),J);else if(A===1){let b=$(R,2,1,10);for(let L of b)lt(L.cx,L.cz,L.w-t.range(2,6),L.d-t.range(8,20),J)}else if(A===2){let b=$(R,1,2,10);for(let L of b)lt(L.cx,L.cz,L.w-t.range(8,20),L.d-t.range(2,6),J)}else{let b=$(R,2,2,8);for(let L of b)t()<.2?ut(L,R):lt(L.cx,L.cz,L.w-t.range(2,6),L.d-t.range(2,6),J*.8)}break}case"B":{P.push({x0:R.x0,z0:R.z0,x1:R.x1,z1:R.z1,kind:"plaza"});let J=Z,A=R.z0+18;Y({x:J,z:A,w:52,d:30,h:18,style:"office",color:15985106,roof:"flat",shop:!1,bank:!0});for(let b=0;b<8;b++){let L=J-21+b*6;g.push({x:L,z:A+16.2,w:1.6,d:1.6,h:14,y0:oe,style:"plain",color:16775402,roof:"flat",seed:0,collide:!1}),_.push({x:L,z:A+16.2,r:.9,h:14})}g.push({x:J,z:A+16.4,w:50,d:3.2,h:2.2,y0:oe+14,style:"plain",color:16775402,roof:"flat",seed:0,collide:!1}),I.push({text:"SOLACE NATIONAL BANK",x:J,y:oe+15.1,z:A+18.05,rot:0,w:30,h:1.6,color:"#ffd76a",bg:"#3a2a10"}),w.bank={x:J,z:A+20.5},z.push({type:"fountain",x:Z,z:R.z1-18}),_.push({x:Z,z:R.z1-18,r:5.2,h:1.2}),w.plaza={x:Z,z:R.z1-8};for(let b=0;b<6;b++){let L=b/6*Math.PI*2,G=Z+Math.cos(L)*14,K=R.z1-18+Math.sin(L)*11;M.trees.push({x:G,z:K,s:1,rot:L}),_.push({x:G,z:K,r:.5,h:6})}break}case"M":{P.push({x0:R.x0,z0:R.z0,x1:R.x1,z1:R.z1,kind:"plaza"});let J=t()<.5?2:3,b=$(R,J,2,6);for(let L of b){if(t()<.16){ut(L,R);continue}let G=t.pick(Yt),K=t.int(2,8),j=L.w-t.range(1,4),yt=L.d-t.range(1,4),st=Y({x:L.cx,z:L.cz,w:j,d:yt,h:W(K),style:G,color:t.pick(le),shop:t()<.8,roof:"flat"});t()<.06&&At(st.x,st.z,st.w+.3,st.d+.3,st.y0+4.2,t.pick(Rc)),t()<.4&&g.push({x:st.x+t.range(-j/4,j/4),z:st.z+t.range(-yt/4,yt/4),w:3,d:3,h:2.5,y0:st.y0+st.h,style:"plain",color:11580600,roof:"flat",seed:0,collide:!1}),t()<.25&&K>=3&&z.push({type:"watertank",x:st.x+t.range(-j/4,j/4),z:st.z+t.range(-yt/4,yt/4),y:st.y0+st.h})}break}case"O":{P.push({x0:R.x0,z0:R.z0,x1:R.x1,z1:R.z1,kind:"plaza"});let J=$(R,2,3,5);for(let A of J){let b=t.int(2,7),L=t.pick(Lx),G=Y({x:A.cx,z:A.cz,w:A.w-t.range(1,3),d:A.d-t.range(1,3),h:W(b),style:t()<.75?"deco":"hotel",color:L,shop:t()<.7,roof:"flat"});t()<.4&&At(G.x,G.z,G.w+.3,G.d+.3,G.y0+G.h-.9,t.pick(Rc)),g.push({x:G.x,z:G.z,w:G.w*.5,d:G.d*.5,h:2.2,y0:G.y0+G.h,style:"plain",color:L,roof:"flat",seed:0,collide:!1});let K=A.a===0?G.x-G.w/2:G.x+G.w/2;t()<.22&&v.push({x0:K-.2,x1:K+.2,y0:G.y0+5,y1:G.y0+G.h-1.5,z0:G.z-.2,z1:G.z+.2,color:t.pick(Rc)})}for(let A=R.oz0+6;A<R.oz1-4;A+=14)for(let b of[R.ox0+2.2,R.ox1-2.2])M.palms.push({x:b,z:A,s:t.range(.95,1.25),rot:t()*6.28}),_.push({x:b,z:A,r:.45,h:10});break}case"R":{P.push({x0:R.x0,z0:R.z0,x1:R.x1,z1:R.z1,kind:"grass"});let J=$(R,3,3,2);for(let A of J){if(A.a===1&&A.b===1){for(let b=0;b<3;b++){let L=A.x0+3+t()*(A.w-6),G=A.z0+3+t()*(A.d-6);M.trees.push({x:L,z:G,s:t.range(.9,1.4),rot:t()*6.28}),_.push({x:L,z:G,r:.5,h:7})}continue}dt(A,R)}break}case"D":{P.push({x0:R.x0,z0:R.z0,x1:R.x1,z1:R.z1,kind:"concrete"});let J=t();if(J<.45){let A=t.range(46,62),b=t.range(28,38),L=Z+t.range(-4,4),G=R.z0+b/2+3;Y({x:L,z:G,w:A,d:b,h:t.pick([10.8,12.6,14.4]),style:"warehouse",color:t.pick([12999226,9411237,6258585,5216911,13677706]),roof:"flat"}),kt(R.x0+4,R.z1-26,R.x1-4,R.z1-4)}else if(J<.8)kt(R.x0+4,R.z0+4,R.x1-4,R.z1-4);else for(let A=0;A<2;A++)for(let b=0;b<2;b++){let L=R.x0+18+A*38,G=R.z0+18+b*38;z.push({type:"tank",x:L,z:G,r:11,h:13}),_.push({x:L,z:G,r:11,h:13})}break}case"S":{P.push({x0:R.x0,z0:R.z0,x1:R.x1,z1:R.z1,kind:"asphalt"});let J=Z,A=nt,b=62,L=24;z.push({type:"stadium",x:J,z:A,ax:b,az:L,h:22});let G=28;for(let K=0;K<G;K++){let j=K/G*Math.PI*2,yt=(K+1)/G*Math.PI*2,st=J+Math.cos(j)*b,mt=A+Math.sin(j)*L,Zt=J+Math.cos(yt)*b,at=A+Math.sin(yt)*L;H(Math.min(st,Zt)-1.5,Math.max(st,Zt)+1.5,Math.min(mt,at)-1.5,Math.max(mt,at)+1.5,22)}H(J-b+4,J+b-4,A-L+4,A+L-4,22),w.stadium={x:J,z:R.z1-4};for(let K=R.x0+6;K<R.x1-6;K+=3.4)t()<.5&&T.push({x:K,z:R.z1-5,h:0});I.push({text:"SOLACE STADIUM",x:J,y:16,z:A+L+1.2,rot:0,w:26,h:3,color:"#22f3ff",bg:"#101030"});break}case"P":{P.push({x0:R.x0,z0:R.z0,x1:R.x1,z1:R.z1,kind:"grass"}),z.push({type:"pond",x:Z+20,z:nt-15,rx:26,rz:17}),w.park={x:Z,z:nt+40},P.push({x0:R.x0,x1:R.x1,z0:nt+30,z1:nt+35,kind:"path"}),P.push({x0:Z-42,x1:Z-37,z0:R.z0,z1:R.z1,kind:"path"});for(let J=0;J<90;J++){let A=R.x0+4+t()*(R.x1-R.x0-8),b=R.z0+4+t()*(R.z1-R.z0-8);((A-Z-20)/32)**2+((b-nt+15)/23)**2<1||Math.abs(b-nt-32.5)<5||Math.abs(A-Z+39.5)<5||Math.abs(A-(Z-10))<14&&Math.abs(b-(nt+60))<14||(t()<.3?(M.palms.push({x:A,z:b,s:t.range(.8,1.2),rot:t()*6.28}),_.push({x:A,z:b,r:.4,h:9})):(M.trees.push({x:A,z:b,s:t.range(.9,1.6),rot:t()*6.28}),_.push({x:A,z:b,r:.55,h:8})))}for(let J=0;J<12;J++)M.benches.push({x:R.x0+10+J*13,z:nt+28.5,rot:0});E.push({x:Z-10,z:nt+60,h:0,len:14,wid:7,height:2.6,name:"Park Kicker"}),z.push({type:"gazebo",x:Z-50,z:nt-40}),_.push({x:Z-50,z:nt-40,r:5,h:5});break}}}function kt(R,V,et,Z){let nt=[14178090,2781144,12729147,3906650,9080729,14721072,2795688],J=Math.floor((Z-V)/6);for(let A=0;A<J;A++){let b=V+3+A*6;if(A%3===2)continue;let L=R+1;for(;L+12<et;){if(t()<.8){let G=t.int(1,3);for(let K=0;K<G;K++)g.push({x:L+6,z:b,w:12,d:2.5,h:2.6,y0:oe+K*2.6,style:"container",color:t.pick(nt),roof:"flat",seed:t(),collide:!1});H(L,L+12,b-1.25,b+1.25,oe+G*2.6)}L+=12.6}}}let Dt=(R,V,et)=>{let Z=y(R,V),nt=(Ht(R)+Ht(R+1))/2,J=(qt(V)+qt(V+1))/2,A=He/2-Et-1.6,b={n:[0,-A],s:[0,A],w:[-A,0],e:[A,0]}[et];return{x:nt+b[0],z:J+b[1],lot:Z}},Vt=(R,V,et,Z,nt)=>{let J={s:{x:R.x,z:R.z+R.d/2+.06,rot:0},n:{x:R.x,z:R.z-R.d/2-.06,rot:Math.PI},e:{x:R.x+R.w/2+.06,z:R.z,rot:Math.PI/2},w:{x:R.x-R.w/2-.06,z:R.z,rot:-Math.PI/2}}[V],A=Math.min(et.length*1.15+2,(V==="e"||V==="w"?R.d:R.w)-1);I.push({text:et,x:J.x,y:R.y0+5.6,z:J.z,rot:J.rot,w:A,h:1.8,color:Z,bg:nt})},ce=(R,V)=>{let et=null,Z=1e9;for(let nt of g){if(nt.collide===!1||nt.style==="container"||nt.style==="plain")continue;let J=Math.hypot(nt.x-R,nt.z-V);J<Z&&(Z=J,et=nt)}return et},Gt=(R,V,et,Z,nt,J,A)=>{let b=Dt(V,et,Z);if(w[R]={x:b.x,z:b.z},nt){let L=ce(b.x,b.z);L&&Vt(L,Z,nt,J,A)}return b};Gt("club",12,3,"e","CLUB MIRAGE","#ff2bd6","#200018"),Gt("safehouse",12,6,"e","HOTEL FLAMINGO","#ff7ab8","#1a0710"),Gt("garage",3,4,"s","DEX AUTO","#ffb020","#1a1000"),Gt("gunshop",6,4,"s","SOLACE ARMS","#ff3b3b","#140404"),Gt("respray1",2,3,"s","QUICK COAT","#22f3ff","#001418"),Gt("respray2",11,1,"w","QUICK COAT","#22f3ff","#001418"),Gt("police",5,5,"n","POLICE","#4aa3ff","#04102a"),Gt("hospital",10,6,"n","HOSPITAL","#ff4040","#ffffff"),Gt("docksYard",1,1,"s",null),Gt("carlot",9,4,"s","SUNSET MOTORS","#9dff2e","#0a1400"),w.beach={x:pt.maxX+60,z:120},w.pierEnd={x:Ft.x1-40,z:0};for(let R of c){let V=a[R.a],et=a[R.b],Z=R.horiz?et.x-V.x:et.z-V.z,nt=Math.floor(Z/34);for(let J=1;J<=nt;J++){let A=J/(nt+1);for(let b of[-1,1]){let L=Et+.9,G=R.horiz?V.x+(et.x-V.x)*A:V.x+b*L,K=R.horiz?V.z+b*L:V.z+(et.z-V.z)*A,j=R.horiz?b>0?Math.PI:0:b>0?-Math.PI/2:Math.PI/2;M.lamps.push({x:G,z:K,rot:j}),_.push({x:G,z:K,r:.22,h:7})}}if(t()<.35){let J=t.range(.2,.8),A=t()<.5?-1:1,b=Et+1.4,L=R.horiz?V.x+(et.x-V.x)*J:V.x+A*b,G=R.horiz?V.z+A*b:V.z+(et.z-V.z)*J;M.hydrants.push({x:L,z:G,rot:0})}}for(let R of a)if(R.light)for(let V of R.nb){let et=a[V],Z=Math.sign(R.x-et.x),nt=Math.sign(R.z-et.z),J=-nt,A=Z,b=Et+.7,L=R.x-Z*b+J*b,G=R.z-nt*b+A*b;M.lights.push({x:L,z:G,rot:Math.atan2(-Z,-nt),node:R.id,axis:Z!==0?"x":"z",dx:Z,dz:nt}),_.push({x:L,z:G,r:.25,h:6})}for(let R=pt.minZ+10;R<pt.maxZ-10;R+=18)M.palms.push({x:pt.maxX+4,z:R+t.range(-3,3),s:t.range(1,1.35),rot:t()*6.28}),_.push({x:pt.maxX+4,z:R,r:.45,h:10});for(let R=pt.minX+30;R<pt.maxX-30;R+=26)R<Ht(4)||M.palms.push({x:R+t.range(-4,4),z:pt.minZ-5,s:t.range(.9,1.2),rot:t()*6.28});for(let R=pt.minX+20;R<pt.maxX-20;R+=24)M.palms.push({x:R+t.range(-4,4),z:pt.maxZ+6,s:t.range(.9,1.25),rot:t()*6.28});for(let R=pt.minZ+140;R<pt.maxZ-20;R+=24)M.palms.push({x:pt.minX-6,z:R+t.range(-4,4),s:t.range(.9,1.2),rot:t()*6.28});for(let R=0;R<70;R++){let V=pt.maxX+45+t()*85,et=pt.minZ+20+t()*(pt.maxZ-pt.minZ-40);Math.abs(et)<16||M.umbrellas.push({x:V,z:et,rot:t()*6.28,color:t.pick([14174778,2783928,15777856,16052714,3836522,14711354])})}for(let R=-420;R<=420;R+=140)Math.abs(R)<30||(z.push({type:"lifeguard",x:pt.maxX+110,z:R}),H(pt.maxX+108,pt.maxX+112,R-2,R+2,5));z.push({type:"pier"}),z.push({type:"ferris",x:Ft.x1-30,z:0}),H(Ft.x1-34,Ft.x1-26,-14,-9,30),H(Ft.x1-34,Ft.x1-26,9,14,30),H(Ft.x0+Ft.ramp,Ft.x1,Ft.z1-.1,Ft.z1+.4,Ft.y+1.2),H(Ft.x0+Ft.ramp,Ft.x1,Ft.z0-.4,Ft.z0+.1,Ft.y+1.2),H(Ft.x1,Ft.x1+.5,Ft.z0,Ft.z1,Ft.y+1.2),z.push({type:"lighthouse",x:bt.maxX-30,z:bt.maxZ-30}),_.push({x:bt.maxX-30,z:bt.maxZ-30,r:4.5,h:30});for(let R=0;R<4;R++){let V=pt.minX+60+R*85;z.push({type:"crane",x:V,z:bt.minZ+20}),H(V-9,V-7,bt.minZ+12,bt.minZ+14,40),H(V+7,V+9,bt.minZ+12,bt.minZ+14,40),H(V-9,V-7,bt.minZ+26,bt.minZ+28,40),H(V+7,V+9,bt.minZ+26,bt.minZ+28,40)}E.push({x:Ht(2)-20,z:qt(2)+50,h:Math.PI/2,len:16,wid:8,height:3.2,name:"Container Leap"}),E.push({x:pt.maxX+70,z:260,h:Math.PI,len:18,wid:8,height:3,name:"Dune Launcher"}),E.push({x:pt.maxX+70,z:-300,h:0,len:18,wid:8,height:3,name:"Coral Kicker"}),E.push({x:Ht(13)+2,z:qt(8)+52,h:0,len:14,wid:7,height:2.4,name:"Ocean Drive Hop"}),E.push({x:Ht(4)+50,z:pt.maxZ+22,h:Math.PI/2,len:18,wid:8,height:3.4,name:"Shoreline Flyer"}),E.push({x:Ft.x0+120,z:0,h:Math.PI/2,len:12,wid:6,height:2,name:"Pier Pop",y0:Ft.y});for(let R of E)U.push({name:R.name,ramp:R});let Re=[[pt.maxX+140,-480],[pt.maxX+120,470],[Ft.x1-4,5],[Ht(0)-40,qt(10)+40],[Ht(7)+50,qt(6)+50],[Ht(1)+50,qt(0)+30],[Ht(4)+90,qt(0)+70],[Ht(8)+50,qt(2)+80],[Ht(10)+50,qt(9)+50],[Ht(3)+50,qt(7)+50],[Ht(13)+50,qt(0)+20],[Ht(6)+50,qt(4)+50],[bt.minX+30,bt.minZ+140],[Ht(11)+50,qt(7)+50],[Ht(9)+50,qt(9)+85],[Ht(0)+20,qt(4)+50],[bt.maxX-45,bt.maxZ-30],[Ht(5)+50,qt(2)+50],[Ht(12)+50,qt(5)+50],[Ht(2)+50,qt(9)+50]];for(let[R,V]of Re)k.push({x:R,z:V});return{seed:s,nodes:a,edges:c,edgeMap:h,cells:n,lots:x,buildings:g,boxes:p,circles:_,props:M,neon:v,signs:I,parking:T,ramps:E,grounds:P,pools:S,places:w,extras:z,collect:k,jumps:U,districtAt:(R,V)=>{if(R>pt.maxX)return"Coral Beach";if(R<pt.minX||V<pt.minZ||V>pt.maxZ)return"Port Solace Coast";let et=Ct(Math.floor((R-un)/He),0,e-1),Z=Ct(Math.floor((V-fn)/He),0,i-1);return Uu[Du[Z][et]]},getEdge:(R,V)=>h.get(R+":"+V),nodeAtGrid:l}}function ki(s,t,e){let i=Math.round((t-un)/He),n=Math.round((e-fn)/He),r=null,o=1e18;for(let a=-1;a<=1;a++)for(let l=-1;l<=1;l++){let c=s.nodeAtGrid(Ct(i+l,0,qe-1),Ct(n+a,0,ni-1));if(!c||c.nb.length===0)continue;let h=(c.x-t)**2+(c.z-e)**2;h<o&&(o=h,r=c)}return r}function Nu(s,t,e){let i=(t-un)/He,n=(e-fn)/He,r=Math.round(i),o=Math.round(n),a=r>=0&&r<qe,l=o>=0&&o<ni,c=a&&Math.abs(t-Ht(r))<Et,h=l&&Math.abs(e-qt(o))<Et;if(c&&h)return s.nodeAtGrid(r,o).nb.length>0;if(c){let f=Math.floor(n);return f<0||f>=ni-1?!1:!!s.getEdge(s.nodeAtGrid(r,f).id,s.nodeAtGrid(r,f+1).id)}if(h){let f=Math.floor(i);return f<0||f>=qe-1?!1:!!s.getEdge(s.nodeAtGrid(f,o).id,s.nodeAtGrid(f+1,o).id)}return!1}function Fs(s,t){let e=(bt.minX+bt.maxX)/2,i=(bt.minZ+bt.maxZ)/2,n=(bt.maxX-bt.minX)/2-bt.r,r=(bt.maxZ-bt.minZ)/2-bt.r,o=Math.abs(s-e)-n,a=Math.abs(t-i)-r,l=Math.max(o,0),c=Math.max(a,0);return Math.hypot(l,c)+Math.min(Math.max(o,a),0)-bt.r}var Ou=1024,Dx=256,Pc={white:[0,0],asphalt:[1,0],sidewalk:[2,0],grass:[3,0],sand:[0,1],roof:[1,1],glass:[2,1],office:[3,1],deco:[0,2],house:[1,2],warehouse:[2,2],shop:[3,2],darkglass:[0,3],hotel:[1,3],brick:[2,3],container:[3,3]};function mr(s){let[t,e]=Pc[s]||Pc.white;return[t/4,1-(e+1)/4]}function is(s,t,e,i,n,r,o,a=.08,l=2){for(let c=0;c<o;c++){let h=r()<.5?0:255;s.fillStyle=`rgba(${h},${h},${h},${a*r()})`,s.fillRect(t+r()*i,e+r()*n,l,l)}}function Bu(){let s=cn(99),t=Ou,e=Dx,i=document.createElement("canvas");i.width=i.height=t;let n=i.getContext("2d"),r=document.createElement("canvas");r.width=r.height=t;let o=r.getContext("2d");o.fillStyle="#000",o.fillRect(0,0,t,t);let a=(u,x)=>{let[y,g]=Pc[u],p=y*e,_=g*e;n.save(),n.beginPath(),n.rect(p,_,e,e),n.clip(),n.translate(p,_),o.save(),o.translate(p,_),x(n,(v,I,T,E,P=1)=>{o.fillStyle=`rgba(255,255,255,${P})`,o.fillRect(v,I,T,E)}),n.restore(),o.restore()},l=(u,x,y,g,p,_,M,v=!0)=>{let I=u.createLinearGradient(x,y,x+g*.4,y+p);I.addColorStop(0,_),I.addColorStop(1,M),u.fillStyle=I,u.fillRect(x,y,g,p),v&&(u.fillStyle="rgba(255,255,255,0.10)",u.beginPath(),u.moveTo(x+g*.15,y),u.lineTo(x+g*.45,y),u.lineTo(x+g*.1,y+p),u.lineTo(x-g*.2,y+p),u.closePath(),u.fill())};a("white",u=>{u.fillStyle="#ffffff",u.fillRect(0,0,e,e)}),a("asphalt",u=>{u.fillStyle="#3b3e44",u.fillRect(0,0,e,e),is(u,0,0,e,e,s,5e3,.18,2),u.strokeStyle="rgba(20,20,22,0.35)",u.lineWidth=1.5;for(let x=0;x<4;x++){u.beginPath();let y=s()*e,g=s()*e;u.moveTo(y,g);for(let p=0;p<6;p++)y+=(s()-.5)*40,g+=(s()-.5)*40,u.lineTo(y,g);u.stroke()}}),a("sidewalk",u=>{u.fillStyle="#aaa59c",u.fillRect(0,0,e,e),is(u,0,0,e,e,s,2500,.12,2),u.strokeStyle="rgba(80,76,70,0.45)",u.lineWidth=3;for(let x=0;x<=4;x++)u.beginPath(),u.moveTo(x*64,0),u.lineTo(x*64,e),u.stroke(),u.beginPath(),u.moveTo(0,x*64),u.lineTo(e,x*64),u.stroke()}),a("grass",u=>{u.fillStyle="#5a9a45",u.fillRect(0,0,e,e);for(let x=0;x<6e3;x++){let y=s();u.fillStyle=y<.5?"rgba(40,90,30,0.35)":"rgba(140,190,90,0.3)",u.fillRect(s()*e,s()*e,2,3)}}),a("sand",u=>{u.fillStyle="#e2c992",u.fillRect(0,0,e,e),is(u,0,0,e,e,s,7e3,.15,1.5)}),a("roof",u=>{u.fillStyle="#9a9ea4",u.fillRect(0,0,e,e),is(u,0,0,e,e,s,8e3,.2,2)}),a("glass",(u,x)=>{u.fillStyle="#c7d3de",u.fillRect(0,0,e,e);for(let y=0;y<2;y++)for(let g=0;g<2;g++){let p=y*128+5,_=g*128+5;l(u,p,_,118,112,"#9cc8ec","#2f5f8e"),x(p,_,118,112)}u.fillStyle="#e8eef3",u.fillRect(0,120,e,9),u.fillRect(0,248,e,8)}),a("office",(u,x)=>{u.fillStyle="#ece8e0",u.fillRect(0,0,e,e),is(u,0,0,e,e,s,1500,.08,2);for(let y=0;y<2;y++)for(let g=0;g<2;g++){let p=y*128+22,_=g*128+26;u.fillStyle="#8a8680",u.fillRect(p-3,_-3,90,78),l(u,p,_,84,72,"#7ea3c2","#2b3f55"),u.fillStyle="rgba(230,230,230,0.6)",u.fillRect(p+41,_,3,72),x(p,_,84,72),u.fillStyle="#d6d0c4",u.fillRect(p-6,_+74,96,6)}}),a("deco",(u,x)=>{u.fillStyle="#fbf7f0",u.fillRect(0,0,e,e);for(let y=0;y<2;y++){let g=y*128+34;u.fillStyle="#6a7d8c",u.fillRect(0,g-3,e,58);for(let p=0;p<4;p++){let _=p*64+6;l(u,_,g,52,52,"#a8e0f0","#2c6f8a",!1),x(_,g,52,52)}u.fillStyle="rgba(0,0,0,0.12)",u.fillRect(0,g-10,e,6),u.fillStyle="rgba(255,255,255,0.9)",u.fillRect(0,g-14,e,4),u.fillStyle="rgba(0,0,0,0.08)",u.fillRect(0,g+66,e,3),u.fillRect(0,g+74,e,3)}}),a("house",(u,x)=>{u.fillStyle="#fbf8f2",u.fillRect(0,0,e,e),u.strokeStyle="rgba(0,0,0,0.06)",u.lineWidth=2;for(let y=4;y<e;y+=12)u.beginPath(),u.moveTo(0,y),u.lineTo(e,y),u.stroke();for(let y=0;y<2;y++)for(let g=0;g<2;g++){let p=y*128+34,_=g*128+30;u.fillStyle="#ffffff",u.fillRect(p-6,_-6,72,82),l(u,p,_,60,70,"#bfe3f5","#46708c"),u.fillStyle="#ffffff",u.fillRect(p+28,_,4,70),u.fillRect(p,_+33,60,4),x(p,_,60,70),u.fillStyle="rgba(70,110,140,0.55)",u.fillRect(p-20,_-4,12,78),u.fillRect(p+68,_-4,12,78)}}),a("warehouse",(u,x)=>{u.fillStyle="#d9d9d9",u.fillRect(0,0,e,e);for(let y=0;y<e;y+=16)u.fillStyle="rgba(0,0,0,0.16)",u.fillRect(y,0,5,e),u.fillStyle="rgba(255,255,255,0.22)",u.fillRect(y+7,0,3,e);is(u,0,0,e,e,s,1500,.15,3);for(let y=0;y<2;y++){let g=y*128+30;l(u,g,12,68,20,"#c0d4e0","#56707f",!1),x(g,12,68,20,.6)}u.fillStyle="rgba(120,60,20,0.18)";for(let y=0;y<10;y++)u.fillRect(s()*e,s()*e,3,30+s()*60)}),a("shop",(u,x)=>{u.fillStyle="#f4efe6",u.fillRect(0,0,e,e);let y=["#e8455b","#ffffff"];for(let g=0;g<16;g++)u.fillStyle=y[g%2],u.fillRect(g*16,6,16,40);u.fillStyle="rgba(0,0,0,0.25)",u.fillRect(0,46,e,6);for(let g=0;g<2;g++){let p=g*128+10;u.fillStyle="#3d3a36",u.fillRect(p-4,62,116,176);let _=u.createLinearGradient(0,66,0,236);_.addColorStop(0,"#ffe3a8"),_.addColorStop(1,"#c7864a"),u.fillStyle=_,u.fillRect(p,66,108,168),u.fillStyle="rgba(80,40,20,0.35)";for(let M=0;M<4;M++)u.fillRect(p+6+s()*80,120+s()*80,14+s()*20,20+s()*40);u.fillStyle="rgba(255,255,255,0.15)",u.fillRect(p+10,66,16,168),x(p,66,108,168),u.fillStyle="#3d3a36",u.fillRect(p+52,66,4,168)}}),a("darkglass",(u,x)=>{u.fillStyle="#1b2230",u.fillRect(0,0,e,e);for(let y=0;y<2;y++)for(let g=0;g<2;g++){let p=y*128+3,_=g*128+3;l(u,p,_,122,122,"#3b4f6a","#0c1220"),x(p,_,122,122,.9)}u.fillStyle="#5a6577",u.fillRect(0,0,3,e),u.fillRect(125,0,6,e),u.fillRect(253,0,3,e)}),a("hotel",(u,x)=>{u.fillStyle="#faf6ee",u.fillRect(0,0,e,e);for(let y=0;y<2;y++){for(let p=0;p<2;p++){let _=p*128+14,M=y*128+14;l(u,_,M,100,86,"#9fd6ea","#2d6a85"),u.fillStyle="rgba(255,255,255,0.7)",u.fillRect(_+49,M,3,86),x(_,M,100,86)}let g=y*128+100;u.fillStyle="#e0d8ca",u.fillRect(0,g,e,14),u.fillStyle="rgba(40,50,60,0.55)",u.fillRect(0,g-28,e,3);for(let p=4;p<e;p+=10)u.fillRect(p,g-28,2,28);u.fillStyle="rgba(0,0,0,0.12)",u.fillRect(0,g+14,e,6)}}),a("brick",(u,x)=>{u.fillStyle="#9c4f3a",u.fillRect(0,0,e,e);for(let y=0;y<e;y+=10){let g=y/10%2?0:12;for(let p=-24;p<e;p+=24)u.fillStyle=`rgba(${150+s()*40},${70+s()*25},${50+s()*20},1)`,u.fillRect(p+g+1,y+1,22,8)}for(let y=0;y<2;y++)for(let g=0;g<2;g++){let p=y*128+30,_=g*128+24;u.fillStyle="#e8e0d0",u.fillRect(p-5,_-8,78,92),l(u,p,_,68,76,"#8fb4c8","#2e4656"),u.fillStyle="#e8e0d0",u.fillRect(p,_+36,68,4),x(p,_,68,76)}}),a("container",u=>{u.fillStyle="#e6e6e6",u.fillRect(0,0,e,e);for(let x=0;x<e;x+=12)u.fillStyle="rgba(0,0,0,0.18)",u.fillRect(x,0,4,e),u.fillStyle="rgba(255,255,255,0.25)",u.fillRect(x+6,0,2,e);u.fillStyle="rgba(0,0,0,0.3)",u.fillRect(0,0,e,8),u.fillRect(0,e-8,e,8),is(u,0,0,e,e,s,800,.2,3)});let c=n.getImageData(0,0,t,t).data,h=o.getImageData(0,0,t,t).data,f=new Uint8Array(t*t*4);for(let u=0;u<t;u++){let x=(t-1-u)*t*4,y=u*t*4;for(let g=0;g<t*4;g+=4)f[y+g]=c[x+g],f[y+g+1]=c[x+g+1],f[y+g+2]=c[x+g+2],f[y+g+3]=h[x+g]}let d=new ar(f,t,t,vi,Di);return d.colorSpace=Ve,d.generateMipmaps=!0,d.minFilter=en,d.magFilter=Ti,d.wrapS=d.wrapT=tn,d.anisotropy=4,d.needsUpdate=!0,d}var Ic={value:0},Cc=4/Ou,Fu=.25;function Hu(s){let t=new Be({map:s,vertexColors:!0});return t.onBeforeCompile=e=>{e.uniforms.uNight=Ic,e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
attribute vec3 tinfo;
varying vec3 vTinfo;
varying vec3 vWpos;
varying float vUp;`).replace("#include <uv_vertex>",`#include <uv_vertex>
	vTinfo = tinfo;
	vWpos = position;
	vUp = normal.y;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying vec3 vTinfo;
varying vec3 vWpos;
varying float vUp;
uniform float uNight;
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}`).replace("#include <map_fragment>",`
  float winMask = 0.0;
  vec3 winGlow = vec3(0.0);
  #ifdef USE_MAP
    vec2 g = vMapUv * ${(Fu-2*Cc).toFixed(6)};
    vec2 tuv = vTinfo.xy + ${Cc.toFixed(6)} + fract(vMapUv) * ${(Fu-2*Cc).toFixed(6)};
    vec4 texel = textureGrad(map, tuv, dFdx(g), dFdy(g));
    winMask = texel.a;
    diffuseColor.rgb *= texel.rgb;
    float mode = floor(vTinfo.z);
    float sd = floor((fract(vTinfo.z) - 0.05) / 0.9 * 200.0) / 200.0;
    vec2 cellId = floor(vMapUv * 2.0);
    float h = hash12(cellId + sd * 731.0);
    float lit = mode > 1.5 ? 0.0 : (mode > 0.5 ? 1.0 : step(0.62, h));
    vec3 wc = mix(vec3(1.0, 0.70, 0.36), vec3(0.62, 0.84, 1.0), step(0.7, hash12(cellId.yx + sd * 91.0)));
    winGlow = wc * lit * winMask * uNight * (mode > 0.5 ? 0.55 : 1.05);
    // weathering: dirt and shade near the ground, streaks, broad colour drift
    float facade = 1.0 - step(0.5, abs(vUp));
    float ground = smoothstep(0.0, 3.2, vWpos.y);
    float streak = hash12(floor(vec2(vWpos.x + vWpos.z, 0.0) * 0.9) + sd) * 0.12;
    float drift = hash12(floor(vWpos.xz / 23.0)) * 0.14;
    diffuseColor.rgb *= mix(1.0, (0.72 + 0.28 * ground) * (1.0 - streak * (1.0 - winMask)) * (0.93 + drift), facade);
    diffuseColor.rgb *= mix(0.9 + drift * 0.7, 1.0, facade);
  #endif
`).replace("#include <color_fragment>",`
  #if defined( USE_COLOR )
    diffuseColor.rgb *= mix(vColor, vec3(1.0), winMask * 0.8);
  #endif
`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
	totalEmissiveRadiance += winGlow;`)},t.customProgramCacheKey=()=>"city-atlas-v1",t}function Vu(s,t,e){let i=document.createElement("canvas"),n=128,r=i.getContext("2d");r.font="86px Anton, Impact, Arial Black, sans-serif";let o=Math.min(2048,Math.max(256,Math.ceil(r.measureText(s).width+80)));i.width=o,i.height=n;let a=i.getContext("2d");a.fillStyle=e,a.fillRect(0,0,o,n);let l=a.createLinearGradient(0,0,0,n);l.addColorStop(0,"rgba(255,255,255,0.10)"),l.addColorStop(1,"rgba(0,0,0,0.18)"),a.fillStyle=l,a.fillRect(0,0,o,n),a.strokeStyle="rgba(0,0,0,0.55)",a.lineWidth=8,a.strokeRect(4,4,o-8,n-8),a.font="86px Anton, Impact, Arial Black, sans-serif",a.textAlign="center",a.textBaseline="middle",a.fillStyle="rgba(0,0,0,0.35)",a.fillText(s,o/2+3,n/2+7),a.fillStyle=t,a.fillText(s,o/2,n/2+4);let c=new vo(i);return c.colorSpace=Ve,c.anisotropy=4,{tex:c,aspect:o/n}}var zc=250,bi=7.2,Lt=(s,t=1)=>{let e=new ct(s);return t!==1&&e.multiplyScalar(t),e},Hs=class{constructor(){this.p=[],this.n=[],this.uv=[],this.c=[],this.t=[],this.i=[],this.vc=0}vert(t,e,i,n,r,o,a,l,c,h,f){return this.p.push(t,e,i),this.n.push(n,r,o),this.uv.push(a,l),this.c.push(c.r,c.g,c.b),this.t.push(h[0],h[1],f),this.vc++}quad(t,e,i,n,r,o,a,l,c,h,f="white",d=2,u=0){let x=mr(f),y=d+.05+.9*(Math.floor(u%1*200)+.5)/200,g=this.vert(t[0],t[1],t[2],r[0],r[1],r[2],o,a,h,x,y);this.vert(e[0],e[1],e[2],r[0],r[1],r[2],l,a,h,x,y),this.vert(i[0],i[1],i[2],r[0],r[1],r[2],l,c,h,x,y),this.vert(n[0],n[1],n[2],r[0],r[1],r[2],o,c,h,x,y),this.i.push(g,g+1,g+2,g,g+2,g+3)}top(t,e,i,n,r,o,a="white",l=0,c=2){let h=.5,f=.5,d=.5,u=.5;if(l>0){let _=Math.floor(t/l/8)*8,M=Math.floor(e/l/8)*8;h=t/l-_,d=i/l-_,f=e/l-M,u=n/l-M}let x=mr(a),y=c+.5,g=[0,1,0],p=this.vert(t,r,n,0,1,0,h,u,o,x,y);this.vert(i,r,n,0,1,0,d,u,o,x,y),this.vert(i,r,e,0,1,0,d,f,o,x,y),this.vert(t,r,e,0,1,0,h,f,o,x,y),this.i.push(p,p+1,p+2,p,p+2,p+3)}box(t,e,i,n,r,o,a,l={}){let c=l.tile||"white",h=l.uScale||0,f=l.vScale||0,d=l.mode??2,u=l.seed||0,x=l.topTile||c,y=l.topColor||a,g=n-t,p=r-e,_=o-i,M=h?Math.max(1,Math.round(g/h)):0,v=h?Math.max(1,Math.round(_/h)):0,I=f?p/f:0,T=l.vOff||0,E=w=>h?w:.5,P=f?T:.5,S=f?T+I:.5;this.quad([t,e,o],[n,e,o],[n,r,o],[t,r,o],[0,0,1],E(0),P,E(M),S,a,c,d,u),this.quad([n,e,i],[t,e,i],[t,r,i],[n,r,i],[0,0,-1],E(0),P,E(M),S,a,c,d,u+.13),this.quad([n,e,o],[n,e,i],[n,r,i],[n,r,o],[1,0,0],E(0),P,E(v),S,a,c,d,u+.27),this.quad([t,e,i],[t,e,o],[t,r,o],[t,r,i],[-1,0,0],E(0),P,E(v),S,a,c,d,u+.41),!l.noTop&&(x==="roof"?this.top(t,i,n,o,r,y,"roof",8,2):this.top(t,i,n,o,r,y,x,l.topScale||0,2))}geo(t,e,i,n="white",r=2){let o=t.index?t.toNonIndexed():t,a=o.attributes.position,l=o.attributes.normal,c=new Xt().getNormalMatrix(e),h=new D,f=new D,d=mr(n),u=this.vc,x=o.attributes.color,y=new ct;for(let g=0;g<a.count;g++)h.fromBufferAttribute(a,g).applyMatrix4(e),f.fromBufferAttribute(l,g).applyMatrix3(c).normalize(),x?(y.setRGB(x.getX(g)*i.r,x.getY(g)*i.g,x.getZ(g)*i.b),this.vert(h.x,h.y,h.z,f.x,f.y,f.z,.5,.5,y,d,r+.5)):this.vert(h.x,h.y,h.z,f.x,f.y,f.z,.5,.5,i,d,r+.5);for(let g=0;g<a.count;g++)this.i.push(u+g)}build(){let t=new xe;return t.setAttribute("position",new ie(this.p,3)),t.setAttribute("normal",new ie(this.n,3)),t.setAttribute("uv",new ie(this.uv,2)),t.setAttribute("color",new ie(this.c,3)),t.setAttribute("tinfo",new ie(this.t,3)),t.setIndex(this.vc>65535?new zs(this.i,1):new Is(this.i,1)),t.computeBoundingSphere(),t.computeBoundingBox(),t}},Gu={glass:{tile:"glass",u:bi,v:bi,mode:0},darkglass:{tile:"darkglass",u:bi,v:bi,mode:0},office:{tile:"office",u:bi,v:bi,mode:0},deco:{tile:"deco",u:bi,v:bi,mode:0},hotel:{tile:"hotel",u:bi,v:bi,mode:0},brick:{tile:"brick",u:bi,v:bi,mode:0},house:{tile:"house",u:8,v:7.2,mode:0},warehouse:{tile:"warehouse",u:8,v:0,mode:0},container:{tile:"container",u:4,v:0,mode:2},plain:{tile:"white",u:0,v:0,mode:2}};function Ux(s,t){let e=Gu[t.style]||Gu.plain,i=t.x-t.w/2,n=t.x+t.w/2,r=t.z-t.d/2,o=t.z+t.d/2,a=t.y0,l=t.y0+t.h,c=Lt(t.color??16777215),h=Lt(14211804),f=t.seed||0;if(t.style==="warehouse"||t.style==="container"){s.box(i,a,r,n,l,o,c,{tile:e.tile,uScale:e.u,vScale:t.h,mode:e.mode,seed:f,topTile:t.style==="container"?"container":"roof",topColor:t.style==="container"?c:h,topScale:4});return}if(t.style==="plain"){s.box(i,a,r,n,l,o,c,{tile:"white",mode:2,noTop:!1});return}let d=a;if(t.shop&&t.h>7&&(s.box(i,a,r,n,a+4.2,o,c,{tile:"shop",uScale:bi,vScale:4.2,mode:1,seed:f,noTop:!0}),d=a+4.2),t.roof==="gable"){s.box(i,d,r,n,l,o,c,{tile:e.tile,uScale:e.u,vScale:e.v,mode:e.mode,seed:f,noTop:!0}),kx(s,i,r,n,o,l,t.ridgeAlongX,c,Lt(t.roofColor??12080178));return}if(s.box(i,d,r,n,l,o,c,{tile:e.tile,uScale:e.u,vScale:e.v,mode:e.mode,seed:f,topTile:"roof",topColor:h}),t.h>6&&t.w>6&&t.d>6){let y=c.clone().multiplyScalar(.92);s.box(i,l,r,n,l+.9,r+.4,y),s.box(i,l,o-.4,n,l+.9,o,y),s.box(i,l,r+.4,i+.4,l+.9,o-.4,y),s.box(n-.4,l,r+.4,n,l+.9,o-.4,y)}}function kx(s,t,e,i,n,r,o,a,l){if(o){let f=(e+n)/2,d=(n-e)/2,u=2.4,x=Math.hypot(d,u);s.quad([i+.5,r-.2,e-.5],[t-.5,r-.2,e-.5],[t-.5,r+2.4,f],[i+.5,r+2.4,f],[0,d/x,-u/x],.5,.5,.5,.5,l),s.quad([t-.5,r-.2,n+.5],[i+.5,r-.2,n+.5],[i+.5,r+2.4,f],[t-.5,r+2.4,f],[0,d/x,u/x],.5,.5,.5,.5,l),s.quad([t,r,e],[t,r,n],[t,r+2.4,f],[t,r+2.4,f],[-1,0,0],.5,.5,.5,.5,a),s.quad([i,r,n],[i,r,e],[i,r+2.4,f],[i,r+2.4,f],[1,0,0],.5,.5,.5,.5,a)}else{let f=(t+i)/2,d=(i-t)/2,u=2.4,x=Math.hypot(d,u);s.quad([t-.5,r-.2,e-.5],[t-.5,r-.2,n+.5],[f,r+2.4,n+.5],[f,r+2.4,e-.5],[-u/x,d/x,0],.5,.5,.5,.5,l),s.quad([i+.5,r-.2,n+.5],[i+.5,r-.2,e-.5],[f,r+2.4,e-.5],[f,r+2.4,n+.5],[u/x,d/x,0],.5,.5,.5,.5,l),s.quad([t,r,n],[i,r,n],[f,r+2.4,n],[f,r+2.4,n],[0,0,1],.5,.5,.5,.5,a),s.quad([i,r,e],[t,r,e],[f,r+2.4,e],[f,r+2.4,e],[0,0,-1],.5,.5,.5,.5,a)}}var Po={plaza:{tile:"sidewalk",color:15262422,scale:6},grass:{tile:"grass",color:16777215,scale:8},concrete:{tile:"roof",color:13223616,scale:10},asphalt:{tile:"asphalt",color:14211288,scale:10},drive:{tile:"roof",color:14736854,scale:4},path:{tile:"sand",color:14272928,scale:6}};function Lc(s,t,e,i,n,r,o){let a=Lt(16777215),l=Lt(11118239),c=oe;if(r){s.top(t,e,i,r.z0,c,a,"sidewalk",4,2),s.top(t,r.z1,i,n,c,a,"sidewalk",4,2),s.top(t,r.z0,r.x0,r.z1,c,a,"sidewalk",4,2),s.top(r.x1,r.z0,i,r.z1,c,a,"sidewalk",4,2);let h=Po[o]||Po.plaza;s.top(r.x0,r.z0,r.x1,r.z1,c,Lt(h.color),h.tile,h.scale,2)}else s.top(t,e,i,n,c,a,"sidewalk",4,2);s.quad([t,0,n],[i,0,n],[i,c,n],[t,c,n],[0,0,1],.5,.5,.5,.5,l),s.quad([i,0,e],[t,0,e],[t,c,e],[i,c,e],[0,0,-1],.5,.5,.5,.5,l),s.quad([i,0,n],[i,0,e],[i,c,e],[i,c,n],[1,0,0],.5,.5,.5,.5,l),s.quad([t,0,e],[t,0,n],[t,c,n],[t,c,e],[-1,0,0],.5,.5,.5,.5,l)}function qu(s,t,e){let i=Bu(),n=Hu(i),r=new Map,o=(p,_)=>{let M=Math.floor(p/zc)+","+Math.floor(_/zc);return r.has(M)||r.set(M,new Hs),r.get(M)},a=cn(4242);for(let p of s.lots){let _=o((p.ox0+p.ox1)/2,(p.oz0+p.oz1)/2);Lc(_,p.ox0,p.oz0,p.ox1,p.oz1,{x0:p.x0,z0:p.z0,x1:p.x1,z1:p.z1},Nx(s,p))}{let p=Ht(0)-Et,_=Ht(qe-1)+Et,M=qt(0)-Et,v=qt(ni-1)+Et,I=[[pt.minX,pt.minZ,pt.maxX,M],[pt.minX,v,pt.maxX,pt.maxZ],[pt.minX,M,p,v],[_,M,pt.maxX,v]];for(let[T,E,P,S]of I){let w=Math.ceil(Math.max(P-T,S-E)/zc);for(let z=0;z<w;z++)if(P-T>S-E){let k=T+(P-T)*z/w,U=T+(P-T)*(z+1)/w;Lc(o((k+U)/2,E),k,E,U,S,null)}else{let k=E+(S-E)*z/w,U=E+(S-E)*(z+1)/w;Lc(o(T,(k+U)/2),T,k,P,U,null)}}}for(let p of s.grounds){let _=Po[p.kind]||Po.plaza;o((p.x0+p.x1)/2,(p.z0+p.z1)/2).top(p.x0,p.z0,p.x1,p.z1,oe+.015,Lt(_.color),_.tile,_.scale,2)}for(let p of s.pools){let _=o(p.x,p.z);_.box(p.x-p.w/2-.4,oe,p.z-p.d/2-.4,p.x+p.w/2+.4,oe+.06,p.z+p.d/2+.4,Lt(15790320)),_.top(p.x-p.w/2,p.z-p.d/2,p.x+p.w/2,p.z+p.d/2,oe+.08,Lt(4182256),"white",0,2)}let l=Lt(16777215),c=Lt(16053492,1.1),h=Lt(16761891),f=.025;for(let p of s.nodes){if(!p.nb.length)continue;o(p.x,p.z).top(p.x-Et,p.z-Et,p.x+Et,p.z+Et,0,l,"asphalt",10,2)}for(let p of s.edges){let _=s.nodes[p.a],M=s.nodes[p.b],v=o((_.x+M.x)/2,(_.z+M.z)/2);if(p.horiz){let I=_.x+Et,T=M.x-Et,E=_.z;v.top(I,E-Et,T,E+Et,0,l,"asphalt",10,2),v.top(I,E-.3,T,E-.15,f,h),v.top(I,E+.15,T,E+.3,f,h);for(let P=I+4;P<T-6;P+=9)v.top(P,E-3.95,P+3,E-3.8,f,c),v.top(P,E+3.8,P+3,E+3.95,f,c);v.top(I,E-Et+.3,T,E-Et+.45,f,c),v.top(I,E+Et-.45,T,E+Et-.3,f,c),M.light&&Wu(v,T,E,-1,c),_.light&&Wu(v,I,E,1,c)}else{let I=_.z+Et,T=M.z-Et,E=_.x;v.top(E-Et,I,E+Et,T,0,l,"asphalt",10,2),v.top(E-.3,I,E-.15,T,f,h),v.top(E+.15,I,E+.3,T,f,h);for(let P=I+4;P<T-6;P+=9)v.top(E-3.95,P,E-3.8,P+3,f,c),v.top(E+3.8,P,E+3.95,P+3,f,c);v.top(E-Et+.3,I,E-Et+.45,T,f,c),v.top(E+Et-.45,I,E+Et-.3,T,f,c),M.light&&Xu(v,E,T,-1,c),_.light&&Xu(v,E,I,1,c)}}for(let p of s.buildings)Ux(o(p.x,p.z),p);Fx(o,s);let d=Bx(s,o,t,a);for(let p of s.ramps){let _=o(p.x,p.z);Ox(_,p)}let u=[];for(let p of r.values()){if(!p.vc)continue;let _=new Kt(p.build(),n);_.castShadow=!0,_.receiveShadow=!0,_.matrixAutoUpdate=!1,t.add(_),u.push(_)}let x=new Hs;for(let p of s.neon)x.box(p.x0,p.y0,p.z0,p.x1,p.y1,p.z1,Lt(p.color,1));let y=new Oe({vertexColors:!0}),g=new Kt(x.build(),y);g.matrixAutoUpdate=!1,t.add(g);for(let p of s.signs){let{tex:_,aspect:M}=Vu(p.text,p.color,p.bg),v=p.w,I=Math.min(p.h,v/M*1)||p.h,T=new Kt(new Bi(v,Math.max(I,v/M)),new Oe({map:_}));T.position.set(p.x,p.y,p.z),T.rotation.y=p.rot,t.add(T)}return{meshes:u,material:n,atlas:i,neonMat:y,dynamic:d}}function Nx(s,t){switch(t.d){case"R":case"P":return"grass";case"D":return"concrete";case"S":return"asphalt";default:return"plaza"}}function Wu(s,t,e,i,n){let r=t+i*1,o=t+i*4.2,a=Math.min(r,o),l=Math.max(r,o);for(let h=-Et+.8;h<Et-.6;h+=1.4)s.top(a,e+h,l,e+h+.7,.025,n);let c=t+i*5.2;i<0?s.top(c-.5,e,c,e+Et-.4,.025,n):s.top(c,e-Et+.4,c+.5,e,.025,n)}function Xu(s,t,e,i,n){let r=e+i*1,o=e+i*4.2,a=Math.min(r,o),l=Math.max(r,o);for(let h=-Et+.8;h<Et-.6;h+=1.4)s.top(t+h,a,t+h+.7,l,.025,n);let c=e+i*5.2;i<0?s.top(t-Et+.4,c-.5,t,c,.025,n):s.top(t,c,t+Et-.4,c+.5,.025,n)}function Os(s,t){let e=Fs(s,t);return e<=0?0:-Math.min(e*.085,7)}function Fx(s,t){let e=pt.maxX-pt.minX,i=pt.maxZ-pt.minZ,n=Math.round(e/10),r=Math.round(i/10),o=e/n,a=i/r,l=Math.ceil((pt.minX-(bt.minX-90))/o),c=Math.ceil((bt.maxX+90-pt.maxX)/o),h=Math.ceil((pt.minZ-(bt.minZ-90))/a),f=Math.ceil((bt.maxZ+90-pt.maxZ)/a),d=Lt(16777215),u=Lt(13218954),x=Lt(9206622),y=Lt(12105392),g=Ht(4)+20;for(let _=-h;_<r+f;_++)for(let M=-l;M<n+c;M++){if(M>=0&&M<n&&_>=0&&_<r)continue;let v=pt.minX+M*o,I=v+o,T=pt.minZ+_*a,E=T+a,P=(v+I)/2,S=(T+E)/2,w=Fs(P,S);if(w>85)continue;let z=P<g&&S<pt.minZ,k=z?Bs(v,T):Os(v,T),U=z?Bs(I,T):Os(I,T),H=z?Bs(I,E):Os(I,E),Y=z?Bs(v,E):Os(v,E),W=d;z?W=y:w>14?W=x:w>3&&(W=u);let ot=s(P,S),$=z?"roof":"sand",ut=8,gt=Math.floor(v/ut/8)*8,Rt=Math.floor(T/ut/8)*8,Yt=v/ut-gt,le=I/ut-gt,it=T/ut-Rt,lt=E/ut-Rt,At=(k+Y-U-H)/(2*o),dt=(k+U-Y-H)/(2*a),kt=Math.hypot(At,1,dt),Dt=[At/kt,1/kt,dt/kt],Vt=mr($),ce=ot.vert(v,Y,E,Dt[0],Dt[1],Dt[2],Yt,lt,W,Vt,2.5);ot.vert(I,H,E,Dt[0],Dt[1],Dt[2],le,lt,W,Vt,2.5),ot.vert(I,U,T,Dt[0],Dt[1],Dt[2],le,it,W,Vt,2.5),ot.vert(v,k,T,Dt[0],Dt[1],Dt[2],Yt,it,W,Vt,2.5),ot.i.push(ce,ce+1,ce+2,ce,ce+2,ce+3)}s(pt.minX+200,bt.minZ).box(bt.minX+10,-4,bt.minZ-1,g,0,bt.minZ+1,Lt(9407622))}function Bs(s,t){return Fs(s,t)<=.5?0:-6}function Ox(s,t){let e=t.y0||0,i=Math.sin(t.h),n=Math.cos(t.h),r=t.len,o=t.wid/2,a=(E,P,S)=>[t.x+E*n+P*i,e+S,t.z-E*i+P*n],l=a(-o,-r/2,0),c=a(o,-r/2,0),h=a(o,r/2,t.height),f=a(-o,r/2,t.height),d=Lt(16738859),u=Lt(16765503),x=[c[0]-l[0],c[1]-l[1],c[2]-l[2]],y=[f[0]-l[0],f[1]-l[1],f[2]-l[2]],g=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],p=Math.hypot(...g),_=[g[0]/p,g[1]/p,g[2]/p];_[1]<0?s.quad(c,l,f,h,[-_[0],-_[1],-_[2]],.5,.5,.5,.5,d):s.quad(l,c,h,f,_,.5,.5,.5,.5,d);for(let E=0;E<4;E++){let P=.1+E*.22,S=P+.08,w=a(-o,-r/2+r*P,t.height*P+.03),z=a(o,-r/2+r*P,t.height*P+.03),k=a(o,-r/2+r*S,t.height*S+.03),U=a(-o,-r/2+r*S,t.height*S+.03);_[1]<0?s.quad(z,w,U,k,[-_[0],-_[1],-_[2]],.5,.5,.5,.5,u):s.quad(w,z,k,U,_,.5,.5,.5,.5,u)}let M=a(-o,r/2,0),v=a(o,r/2,0),I=Lt(10107412),T=(E,P,S)=>{let w=[P[0]-E[0],P[1]-E[1],P[2]-E[2]],z=[S[0]-E[0],S[1]-E[1],S[2]-E[2]],k=[w[1]*z[2]-w[2]*z[1],w[2]*z[0]-w[0]*z[2],w[0]*z[1]-w[1]*z[0]],U=Math.hypot(...k)||1;s.quad(E,P,S,S,[k[0]/U,k[1]/U,k[2]/U],.5,.5,.5,.5,I)};T(l,M,f),T(l,f,M),T(c,h,v),T(c,v,h),s.quad(v,M,f,h,[i,0,n],.5,.5,.5,.5,I),s.quad(M,v,h,f,[-i,0,-n],.5,.5,.5,.5,I)}function Bx(s,t,e,i){let n=new Tt,r={ferris:null,lighthouseBeam:null,antennaLights:[]},o=(c,h,f,d,u,x,y,g)=>c.box(h-u/2,f,d-y/2,h+u/2,f+x,d+y/2,Lt(g)),a=new Hs;for(let c of s.extras)switch(c.type){case"antenna":{let h=t(c.x,c.z);o(h,c.x,c.y,c.z,.5,c.h,.5,13159632),o(h,c.x,c.y,c.z,1.6,1,1.6,9080726),a.box(c.x-.35,c.y+c.h,c.z-.35,c.x+.35,c.y+c.h+.6,c.z+.35,Lt(16719904));break}case"watertank":{let h=t(c.x,c.z);for(let[f,d]of[[-1,-1],[1,-1],[-1,1],[1,1]])o(h,c.x+f*1.3,c.y,c.z+d*1.3,.25,2.2,.25,5981750);n.makeTranslation(c.x,c.y+3.6,c.z),h.geo(new re(2,2,2.8,10),n,Lt(9071182)),n.makeTranslation(c.x,c.y+5.4,c.z),h.geo(new je(2.2,1,10),n,Lt(5061164));break}case"fountain":{let h=t(c.x,c.z);n.makeTranslation(c.x,oe+.4,c.z),h.geo(new re(5,5.2,.8,24),n,Lt(15789024)),n.makeTranslation(c.x,oe+.82,c.z),h.geo(new re(4.5,4.5,.05,24),n,Lt(4176096)),n.makeTranslation(c.x,oe+1.6,c.z),h.geo(new re(.6,.9,2.4,10),n,Lt(15789024)),n.makeTranslation(c.x,oe+2.9,c.z),h.geo(new re(1.8,.8,.4,16),n,Lt(15789024)),n.makeTranslation(c.x,oe+3.4,c.z),h.geo(new je(.5,1.4,8),n,Lt(10479871));break}case"tank":{let h=t(c.x,c.z);n.makeTranslation(c.x,oe+c.h/2,c.z),h.geo(new re(c.r,c.r,c.h,24),n,Lt(15263972)),n.makeTranslation(c.x,oe+c.h+.8,c.z),h.geo(new re(c.r*.4,c.r,1.6,24),n,Lt(13684940)),n.makeTranslation(c.x,oe+c.h*.55,c.z),h.geo(new re(c.r+.05,c.r+.05,1.2,24,1,!0),n,Lt(16738859));break}case"pond":{let h=t(c.x,c.z);n.makeScale(c.rx,1,c.rz).premultiply(new Tt().makeTranslation(c.x,oe+.03,c.z)),h.geo(new re(1,1,.02,32),n,Lt(2795448)),n.makeScale(c.rx+1.2,1,c.rz+1.2).premultiply(new Tt().makeTranslation(c.x,oe+.01,c.z)),h.geo(new re(1,1,.02,32),n,Lt(14272928));break}case"gazebo":{let h=t(c.x,c.z);n.makeTranslation(c.x,oe+.2,c.z),h.geo(new re(5,5,.4,8),n,Lt(15921128));for(let f=0;f<8;f++){let d=f/8*Math.PI*2+Math.PI/8;o(h,c.x+Math.cos(d)*4.4,oe+.4,c.z+Math.sin(d)*4.4,.3,3.2,.3,16777215)}n.makeTranslation(c.x,oe+4.6,c.z),h.geo(new je(5.6,2.2,8),n,Lt(3837834));break}case"stadium":{let h=t(c.x,c.z),f=48,d=Lt(15330802),u=Lt(7109258),x=Lt(3107792),y=Lt(16777215);for(let g=0;g<f;g++){let p=g/f*Math.PI*2,_=(g+1)/f*Math.PI*2,M=[c.x+Math.cos(p)*c.ax,c.z+Math.sin(p)*c.az],v=[c.x+Math.cos(_)*c.ax,c.z+Math.sin(_)*c.az],I=.62,T=[c.x+Math.cos(p)*c.ax*I,c.z+Math.sin(p)*c.az*I],E=[c.x+Math.cos(_)*c.ax*I,c.z+Math.sin(_)*c.az*I],P=(p+_)/2,S=Math.cos(P)/c.ax,w=Math.sin(P)/c.az,z=Math.hypot(S,w);h.quad([v[0],0,v[1]],[M[0],0,M[1]],[M[0],c.h,M[1]],[v[0],c.h,v[1]],[S/z,0,w/z],.5,.5,.5,.5,g%2?d:y),h.quad([T[0],2,T[1]],[E[0],2,E[1]],[v[0],c.h,v[1]],[M[0],c.h,M[1]],[-S/z*.6,.8,-w/z*.6],.5,.5,.5,.5,g%3?x:u),h.quad([T[0],0,T[1]],[E[0],0,E[1]],[E[0],2,E[1]],[T[0],2,T[1]],[-S/z,0,-w/z],.5,.5,.5,.5,u),a.box(Math.min(M[0],v[0])-.2,c.h-.4,Math.min(M[1],v[1])-.2,Math.max(M[0],v[0])+.2,c.h,Math.max(M[1],v[1])+.2,Lt(g%2?15921126:14078923))}n.makeScale(c.ax*.62,1,c.az*.62).premultiply(new Tt().makeTranslation(c.x,.3,c.z)),h.geo(new re(1,1,.1,40),n,Lt(4168250));for(let[g,p]of[[-1,-1],[1,-1],[-1,1],[1,1]]){let _=c.x+g*c.ax*.8,M=c.z+p*c.az*.95;o(h,_,0,M,.8,34,.8,12567754),o(h,_,34,M,5,3,1,5264990),a.box(_-2.3,34.3,M-.6,_+2.3,36.7,M+.6,Lt(16774872))}break}case"lifeguard":{let h=t(c.x,c.z);for(let[d,u]of[[-1,-1],[1,-1],[-1,1],[1,1]])o(h,c.x+d*1.4,0,c.z+u*1.4,.25,2.6,.25,15790320);o(h,c.x,2.6,c.z,3.4,.25,3.4,16052454);let f=i.pick([15254074,14174778,4889288,16052714]);o(h,c.x,2.85,c.z,3,2.2,3,f),n.makeRotationY(Math.PI/4).premultiply(new Tt().makeTranslation(c.x,5.5,c.z)),h.geo(new je(2.7,1.2,4),n,Lt(16728128));break}case"pier":{let h=Ft,f=Lt(10120005);for(let u=h.x0+h.ramp;u<h.x1;u+=40){let x=t(u+20,0),y=Math.min(h.x1,u+40);x.box(u,h.y-.4,h.z0,y,h.y,h.z1,f,{tile:"container",uScale:2,vScale:0,topTile:"container",topColor:f,topScale:3});for(let g=u;g<y;g+=10)o(x,g,-5,h.z0+.5,.6,5+h.y-.4,.6,5914672),o(x,g,-5,h.z1-.5,.6,5+h.y-.4,.6,5914672);x.box(u,h.y,h.z1-.15,y,h.y+1.1,h.z1,Lt(16053492)),x.box(u,h.y,h.z0,y,h.y+1.1,h.z0+.15,Lt(16053492))}t(h.x0,0).quad([h.x0,.02,h.z1],[h.x0+h.ramp,h.y,h.z1],[h.x0+h.ramp,h.y,h.z0],[h.x0,.02,h.z0],[-.08,1,0],0,0,1,1,f);for(let u=h.x0+h.ramp+10;u<h.x1;u+=24)s.props.lamps.push({x:u,z:h.z1-.6,rot:Math.PI,y:h.y}),s.props.lamps.push({x:u,z:h.z0+.6,rot:0,y:h.y});break}case"ferris":{let h=t(c.x,c.z),f=30;for(let E of[-11,11])for(let P of[-7,7]){let S=new D(c.x,Ft.y+f,c.z+E*.25),w=new D(c.x+P,Ft.y,c.z+E),z=S.clone().add(w).multiplyScalar(.5),k=S.distanceTo(w),U=new We().setFromUnitVectors(new D(0,1,0),S.clone().sub(w).normalize());n.compose(z,U,new D(1,1,1)),h.geo(new te(.7,k,.7),n,Lt(15921906))}let d=new Ei;d.position.set(c.x,Ft.y+f,c.z);let u=24,x=new Mo(u,.35,6,64),y=new Be({color:14606046}),g=new Kt(x,y);g.position.z=1.2;let p=new Kt(x,y);p.position.z=-1.2,d.add(g,p);let _=new Hs;for(let E=0;E<16;E++){let P=E/16*Math.PI*2;n.makeRotationZ(P).premultiply(new Tt);let S=new Tt().makeRotationZ(P).multiply(new Tt().makeTranslation(0,u/2,0));_.geo(new te(.25,u,.25),S.clone().premultiply(new Tt().makeTranslation(0,0,1.2)),Lt(15132390)),_.geo(new te(.25,u,.25),S.clone().premultiply(new Tt().makeTranslation(0,0,-1.2)),Lt(15132390))}_.geo(new re(1.2,1.2,3.4,12),new Tt().makeRotationX(Math.PI/2),Lt(11579568));let M=new Kt(_.build(),new Be({vertexColors:!0}));d.add(M);let v=new te(2.2,2.4,2);v.translate(0,-1.4,0);let I=new fi(v,new Be({color:16777215}),16),T=[13124154,3108776,14727226,4165466,14711338,15263976];for(let E=0;E<16;E++)I.setColorAt(E,new ct(T[E%T.length]));I.frustumCulled=!1,e.add(d),e.add(I),r.ferris={wheel:d,cabins:I,R:u,cx:c.x,cy:Ft.y+f,cz:c.z,angle:0};break}case"lighthouse":{let h=t(c.x,c.z);for(let x=0;x<6;x++){let y=3.8-x*.35,g=3.8-(x+1)*.35;n.makeTranslation(c.x,x*4.5+2.25,c.z),h.geo(new re(g,y,4.5,16),n,Lt(x%2?14826299:16316664))}n.makeTranslation(c.x,27+1.5,c.z),a.geo(new re(1.6,1.6,3,12),n,Lt(16774320)),n.makeTranslation(c.x,31,c.z),h.geo(new je(2.4,2.2,12),n,Lt(2763306)),n.makeTranslation(c.x,27,c.z),h.geo(new re(2.8,2.8,.4,16),n,Lt(3355443));let f=new je(4,60,16,1,!0);f.translate(0,-30,0),f.rotateZ(Math.PI/2);let d=new Oe({color:16773808,transparent:!0,opacity:.18,blending:ei,depthWrite:!1,side:Ge}),u=new Kt(f,d);u.position.set(c.x,28.5,c.z),e.add(u),r.lighthouseBeam=u;break}case"crane":{let h=t(c.x,c.z),f=16747034,d=c.z-8,u=c.z+8;for(let x of[-8,8]){for(let y of[d,u])o(h,c.x+x,0,y,1.6,34,1.6,f);o(h,c.x+x,8,c.z,1.2,1.2,16,f),o(h,c.x+x,34,c.z,1.8,2.4,18,f)}o(h,c.x,34,d,18,2.4,1.8,f),o(h,c.x,34,u,18,2.4,1.8,f),h.box(c.x-1.6,37,c.z-50,c.x+1.6,39.5,c.z+18,Lt(f)),o(h,c.x,30.5,c.z-2,4,3.5,4,3095110),o(h,c.x,39.5,c.z+10,6,3,8,5264990),a.box(c.x-.4,39.5,c.z-50,c.x+.4,40.3,c.z-49.2,Lt(16719904));break}}let l=new Kt(a.build(),new Oe({vertexColors:!0}));return e.add(l),r}function Yu(s,t,e){if(s.ferris){let i=s.ferris;i.angle+=t*.08,i.wheel.rotation.z=i.angle;let n=new Tt;for(let r=0;r<16;r++){let o=i.angle+r/16*Math.PI*2;n.makeTranslation(i.cx+Math.sin(o)*0,i.cy+Math.cos(o)*i.R,i.cz),n.makeTranslation(i.cx-Math.sin(o)*i.R,i.cy+Math.cos(o)*i.R,i.cz),i.cabins.setMatrixAt(r,n)}i.cabins.instanceMatrix.needsUpdate=!0}s.lighthouseBeam&&(s.lighthouseBeam.rotation.y+=t*.9,s.lighthouseBeam.visible=e>.3,s.lighthouseBeam.material.opacity=.2*e)}var Hx=[{h:0,zen:329498,hor:1449014,sun:9085152,si:.55,hs:5925552,hg:2760760,hi:.95},{h:4.8,zen:461343,hor:1975360,sun:9085152,si:.5,hs:5925552,hg:2760760,hi:.95},{h:6,zen:3095658,hor:15243882,sun:16754792,si:1,hs:9079456,hg:3813424,hi:.8},{h:7.5,zen:4160214,hor:16763296,sun:16767400,si:1.8,hs:9352415,hg:4864554,hi:.8},{h:10,zen:2780888,hor:11853055,sun:16773594,si:2.25,hs:10274544,hg:5917240,hi:.82},{h:15,zen:2780374,hor:12377343,sun:16772304,si:2.2,hs:10274544,hg:5917240,hi:.8},{h:17.2,zen:3824796,hor:15909002,sun:16756848,si:2,hs:11053248,hg:4864560,hi:.85},{h:18.3,zen:3030894,hor:15700056,sun:16742972,si:1.3,hs:10127528,hg:3811880,hi:.85},{h:19.3,zen:1317948,hor:6965850,sun:9079496,si:.6,hs:5922964,hg:2761264,hi:.9},{h:20.5,zen:461340,hor:1975360,sun:9085152,si:.55,hs:5925552,hg:2760760,hi:.95},{h:24,zen:329498,hor:1449014,sun:9085152,si:.55,hs:5925552,hg:2760760,hi:.95}],ns=Hx.map(s=>({...s,zenC:new ct(s.zen),horC:new ct(s.hor),sunC:new ct(s.sun),hsC:new ct(s.hs),hgC:new ct(s.hg)})),Io=class{constructor(t,e){this.scene=t,this.hemi=new So(12115199,6969928,1.1),t.add(this.hemi),this.sun=new To(16777215,2.5),this.sun.target=new Ue,t.add(this.sun,this.sun.target),this.setQuality(e),this.uniforms={uZenith:{value:new ct},uHorizon:{value:new ct},uSunDir:{value:new D(0,1,0)},uSunColor:{value:new ct},uNight:{value:0},uTime:{value:0}};let i=new Pe({uniforms:this.uniforms,side:Ke,depthWrite:!1,fog:!1,vertexShader:`
        varying vec3 vDir;
        void main() {
          vDir = position;
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,fragmentShader:`
        uniform vec3 uZenith, uHorizon, uSunColor, uSunDir;
        uniform float uNight, uTime;
        varying vec3 vDir;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; }
          return v;
        }
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55));
          // below the horizon: fade toward a darker sea haze
          col = mix(col, uHorizon * 0.55, clamp(-h * 4.0, 0.0, 1.0));
          float s = max(dot(d, normalize(uSunDir)), 0.0);
          float sunUp = smoothstep(-0.08, 0.05, uSunDir.y);
          col += uSunColor * (pow(s, 900.0) * 14.0 + pow(s, 24.0) * 0.45 + pow(s, 4.0) * 0.12) * sunUp;
          // moon opposite the sun
          float m = max(dot(d, normalize(-uSunDir + vec3(0.0, 0.25, 0.0))), 0.0);
          col += vec3(0.85, 0.9, 1.0) * smoothstep(0.9993, 0.9996, m) * uNight;
          col += vec3(0.3, 0.35, 0.6) * pow(m, 60.0) * 0.25 * uNight;
          // stars
          if (h > 0.0) {
            vec3 sd = d * 260.0;
            float st = hash(floor(sd.xz + sd.y * 13.0));
            float star = smoothstep(0.9965, 1.0, st) * smoothstep(0.0, 0.25, h);
            col += vec3(star) * uNight * (0.6 + 0.4 * sin(uTime * 3.0 + st * 100.0));
          }
          // clouds
          if (h > 0.0) {
            vec2 cuv = d.xz / (h + 0.12) * 1.6 + vec2(uTime * 0.004, uTime * 0.0015);
            float c = fbm(cuv);
            float cov = smoothstep(0.52, 0.8, c) * smoothstep(0.0, 0.18, h);
            vec3 cc = mix(uHorizon * 1.05 + uSunColor * 0.25, vec3(1.0), 0.35 * (1.0 - uNight));
            cc = mix(cc, uZenith * 1.6 + vec3(0.04), uNight * 0.85);
            col = mix(col, cc, cov * 0.85);
          }
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`});this.dome=new Kt(new Qn(1500,32,16),i),this.dome.frustumCulled=!1,this.dome.renderOrder=-1,t.add(this.dome),t.fog=new po(12575743,120,900),this.night=0,this.sunDir=new D,this._a={}}setQuality(t){let e=this.sun;e.castShadow=t!=="low";let i=t==="high"?2048:1024;e.shadow.mapSize.x!==i&&(e.shadow.mapSize.set(i,i),e.shadow.map&&(e.shadow.map.dispose(),e.shadow.map=null));let n=t==="high"?70:50,r=e.shadow.camera;r.left=-n,r.right=n,r.top=n,r.bottom=-n,r.near=1,r.far=400,r.updateProjectionMatrix(),e.shadow.bias=-6e-4,e.shadow.normalBias=.6,this.shadowExt=n,this.fogFar=t==="low"?520:t==="high"?1e3:780}sample(t){let e=ns[0],i=ns[1];for(let o=0;o<ns.length-1;o++)if(t>=ns[o].h&&t<=ns[o+1].h){e=ns[o],i=ns[o+1];break}let n=(t-e.h)/(i.h-e.h||1),r=this._a;return r.zen=(r.zen||new ct).copy(e.zenC).lerp(i.zenC,n),r.hor=(r.hor||new ct).copy(e.horC).lerp(i.horC,n),r.sun=(r.sun||new ct).copy(e.sunC).lerp(i.sunC,n),r.hs=(r.hs||new ct).copy(e.hsC).lerp(i.hsC,n),r.hg=(r.hg||new ct).copy(e.hgC).lerp(i.hgC,n),r.si=Se(e.si,i.si,n),r.hi=Se(e.hi,i.hi,n),r}update(t,e,i){let n=this.sample(t),r=(t-6)/12*Math.PI,o=Math.cos(r),a=Math.sin(r);this.sunDir.set(o,a,.38).normalize();let l=Ec(-.12,.12,a);this.night=1-Ec(-.28,.06,a),Ic.value=this.night;let c=this.sunDir.clone();a<.05&&c.set(-o,Math.max(.35,-a),-.2).normalize(),this.sun.color.copy(n.sun),this.sun.intensity=n.si*(a<.05?.5:1),this.hemi.color.copy(n.hs),this.hemi.groundColor.copy(n.hg),this.hemi.intensity=n.hi;let f=this.shadowExt*2/this.sun.shadow.mapSize.x,d=Math.round(e.x/f)*f,u=Math.round(e.z/f)*f;this.sun.position.set(d+c.x*150,e.y+c.y*150,u+c.z*150),this.sun.target.position.set(d,e.y,u),this.sun.target.updateMatrixWorld();let x=this.uniforms;x.uZenith.value.copy(n.zen),x.uHorizon.value.copy(n.hor),x.uSunDir.value.copy(this.sunDir),x.uSunColor.value.copy(n.sun),x.uNight.value=this.night,x.uTime.value=m.time,this.dome.position.copy(i),this.scene.fog.color.copy(n.hor).lerp(n.zen,.25),this.scene.fog.near=90,this.scene.fog.far=this.fogFar,this.horizon=n.hor,this.zenith=n.zen,this.sunColor=n.sun}};var zo=class{constructor(t){let e=(bt.minX+bt.maxX)/2,i=(bt.minZ+bt.maxZ)/2;this.uniforms=bc.merge([ft.fog,{uTime:{value:0},uSunDir:{value:new D(0,1,0)},uSunColor:{value:new ct(1,1,1)},uSky:{value:new ct(.6,.8,1)},uZenith:{value:new ct(.2,.4,.9)},uNight:{value:0},uLand:{value:new Ee(e,i,(bt.maxX-bt.minX)/2-bt.r,(bt.maxZ-bt.minZ)/2-bt.r)},uLandR:{value:bt.r}}]);let n=new Pe({uniforms:this.uniforms,fog:!0,vertexShader:`
        varying vec3 vWorld;
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,fragmentShader:`
        uniform float uTime, uNight, uLandR;
        uniform vec3 uSunDir, uSunColor, uSky, uZenith;
        uniform vec4 uLand;
        varying vec3 vWorld;
        #include <fog_pars_fragment>
        float landSdf(vec2 p) {
          vec2 q = abs(p - uLand.xy) - uLand.zw;
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uLandR;
        }
        void main() {
          vec2 p = vWorld.xz;
          float t = uTime;
          vec2 g = vec2(0.0);
          g += vec2(cos(p.x * 0.09 + t * 1.1 + p.y * 0.03), 0.0) * 0.10;
          g += vec2(0.0, cos(p.y * 0.12 + t * 0.85 - p.x * 0.02)) * 0.09;
          g += vec2(cos(p.x * 0.41 + p.y * 0.23 + t * 2.3), cos(p.y * 0.37 - p.x * 0.19 + t * 2.0)) * 0.05;
          g += vec2(cos(p.x * 1.3 + p.y * 0.9 + t * 3.7), cos(p.y * 1.1 - p.x * 1.2 + t * 3.1)) * 0.025;
          vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
          vec3 v = normalize(cameraPosition - vWorld);
          float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
          float d = landSdf(p);
          float shallow = 1.0 - smoothstep(4.0, 80.0, d);
          vec3 deep = vec3(0.01, 0.12, 0.22);
          vec3 sh = vec3(0.05, 0.55, 0.62);
          vec3 base = mix(deep, sh, shallow * 0.9);
          vec3 refl = mix(uSky, uZenith, 0.35);
          vec3 col = mix(base, refl, 0.15 + fres * 0.7);
          vec3 r = reflect(-normalize(uSunDir), n);
          float spec = pow(max(dot(r, v), 0.0), 180.0);
          float sunUp = smoothstep(-0.05, 0.1, uSunDir.y);
          col += uSunColor * spec * 3.0 * sunUp;
          // moon glints at night
          vec3 rm = reflect(-normalize(vec3(-uSunDir.x, 0.4, -uSunDir.z)), n);
          col += vec3(0.6, 0.7, 1.0) * pow(max(dot(rm, v), 0.0), 120.0) * uNight * 0.8;
          // shore foam
          float foamBand = 1.0 - smoothstep(0.0, 6.0, d - 6.5 + sin(t * 1.3 + p.x * 0.05 + p.y * 0.04) * 2.0);
          float foam = foamBand * (0.55 + 0.45 * sin(p.x * 0.7 + p.y * 0.5 + t * 2.0));
          col = mix(col, vec3(0.95), clamp(foam, 0.0, 1.0) * 0.55 * (1.0 - uNight * 0.6));
          col *= mix(1.0, 0.45, uNight);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`}),r=new Bi(6e3,6e3,1,1);r.rotateX(-Math.PI/2),this.mesh=new Kt(r,n),this.mesh.position.set(e,Ae,i),this.mesh.frustumCulled=!1,t.add(this.mesh)}update(t,e){let i=this.uniforms;i.uTime.value=t,i.uSunDir.value.copy(e.sunDir),i.uSunColor.value.copy(e.sunColor),i.uSky.value.copy(e.horizon),i.uZenith.value.copy(e.zenith),i.uNight.value=e.night}};function zn(s,t=!1){let e=s[0].index!==null,i=new Set(Object.keys(s[0].attributes)),n=new Set(Object.keys(s[0].morphAttributes)),r={},o={},a=s[0].morphTargetsRelative,l=new xe,c=0;for(let h=0;h<s.length;++h){let f=s[h],d=0;if(e!==(f.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(let u in f.attributes){if(!i.has(u))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+u+'" attribute exists among all geometries, or in none of them.'),null;r[u]===void 0&&(r[u]=[]),r[u].push(f.attributes[u]),d++}if(d!==i.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==f.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(let u in f.morphAttributes){if(!n.has(u))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;o[u]===void 0&&(o[u]=[]),o[u].push(f.morphAttributes[u])}if(t){let u;if(e)u=f.index.count;else if(f.attributes.position!==void 0)u=f.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,u,h),c+=u}}if(e){let h=0,f=[];for(let d=0;d<s.length;++d){let u=s[d].index;for(let x=0;x<u.count;++x)f.push(u.getX(x)+h);h+=s[d].attributes.position.count}l.setIndex(f)}for(let h in r){let f=Zu(r[h]);if(!f)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;l.setAttribute(h,f)}for(let h in o){let f=o[h][0].length;if(f===0)break;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[h]=[];for(let d=0;d<f;++d){let u=[];for(let y=0;y<o[h].length;++y)u.push(o[h][y][d]);let x=Zu(u);if(!x)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;l.morphAttributes[h].push(x)}}return l}function Zu(s){let t,e,i,n=-1,r=0;for(let c=0;c<s.length;++c){let h=s[c];if(t===void 0&&(t=h.array.constructor),t!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=h.itemSize),e!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(i===void 0&&(i=h.normalized),i!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(n===-1&&(n=h.gpuType),n!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=h.count*e}let o=new t(r),a=new ne(o,e,i),l=0;for(let c=0;c<s.length;++c){let h=s[c];if(h.isInterleavedBufferAttribute){let f=l/e;for(let d=0,u=h.count;d<u;d++)for(let x=0;x<e;x++){let y=h.getComponent(d,x);a.setComponent(d+f,x,y)}}else o.set(h.array,l);l+=h.count*e}return n!==void 0&&(a.gpuType=n),a}function dn(s={}){let t=new Be({vertexColors:!0,...s});return t.onBeforeCompile=e=>{e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
attribute float paint;`).replace("vColor.xyz *= instanceColor.xyz;","vColor.xyz = mix(vColor.xyz, vColor.xyz * instanceColor.xyz, paint);")},t.customProgramCacheKey=()=>"paint-v1",t}var Gi=class{constructor(){this.p=[],this.n=[],this.c=[],this.k=[]}quad(t,e,i,n,r,o){let a=e[0]-t[0],l=e[1]-t[1],c=e[2]-t[2],h=n[0]-t[0],f=n[1]-t[1],d=n[2]-t[2],u=l*d-c*f,x=c*h-a*d,y=a*f-l*h,g=Math.hypot(u,x,y)||1;u/=g,x/=g,y/=g;for(let p of[t,e,i,t,i,n])this.p.push(p[0],p[1],p[2]),this.n.push(u,x,y),this.c.push(r[0],r[1],r[2]),this.k.push(o)}prism(t,e,i,n,r,o,a,l,c,h,f=0){let[d,u,x,y,g]=c,[p,_,M,v,I]=h,T=E=>E+f;this.quad([T(-t),n,i],[T(t),n,i],[T(r),l,a],[T(-r),l,a],d,p),this.quad([T(t),n,e],[T(-t),n,e],[T(-r),l,o],[T(r),l,o],u,_),this.quad([T(t),n,i],[T(t),n,e],[T(r),l,o],[T(r),l,a],x,M),this.quad([T(-t),n,e],[T(-t),n,i],[T(-r),l,a],[T(-r),l,o],y,v),g&&this.quad([T(-r),l,a],[T(r),l,a],[T(r),l,o],[T(-r),l,o],g,I)}box(t,e,i,n,r,o,a,l,c={}){let h=(t+n)/2,f=(n-t)/2,d=[a,a,a,a,a];c.front&&(d[0]=c.front),c.back&&(d[1]=c.back);let u=[l,l,l,l,l];c.front&&(u[0]=c.frontPaint??0),c.back&&(u[1]=c.backPaint??0),this.prism(f,i,o,e,f,i,o,r,d,u,h),c.bottom&&this.quad([t,e,i],[n,e,i],[n,e,o],[t,e,o],c.bottom,0)}build(){let t=new xe;return t.setAttribute("position",new ie(this.p,3)),t.setAttribute("normal",new ie(this.n,3)),t.setAttribute("color",new ie(this.c,3)),t.setAttribute("paint",new ie(this.k,1)),t.computeBoundingSphere(),t}},ye=s=>{let t=new ct(s);return[t.r,t.g,t.b]},ee=[1,1,1],Hi=ye(1713459),Vi=ye(1842464),Vx=ye(12106946),Dc=ye(921361),Ln={compact:{name:"Pico",len:3.9,wid:1.76,hgt:1.48,clear:.28,belt:.86,wheelR:.32,wheelbase:2.45,cab:[-1.5,.95,-1.05,.35],maxSpeed:37,accel:9.5,brake:24,grip:7.6,steer:.62,mass:.9,health:700,price:0,colors:[13124154,3829413,15255114,6986346,16053492,14256698,8022682,10133670]},sedan:{name:"Cruiser",len:4.7,wid:1.86,hgt:1.46,clear:.28,belt:.88,wheelR:.34,wheelbase:2.8,cab:[-1.65,1.15,-1.15,.45],maxSpeed:45,accel:10.5,brake:25,grip:7.6,steer:.6,mass:1,health:900,colors:[2830134,14278114,9051172,2046835,4021322,12165754,7040886,16777215]},taxi:{name:"Cab",base:"sedan",len:4.7,wid:1.86,hgt:1.46,clear:.28,belt:.88,wheelR:.34,wheelbase:2.8,cab:[-1.65,1.15,-1.15,.45],maxSpeed:44,accel:10.5,brake:25,grip:7.6,steer:.6,mass:1,health:900,colors:[16761370]},police:{name:"Interceptor",base:"sedan",len:4.8,wid:1.9,hgt:1.48,clear:.28,belt:.9,wheelR:.35,wheelbase:2.85,cab:[-1.7,1.15,-1.15,.45],maxSpeed:56,accel:15,brake:28,grip:8.8,steer:.62,mass:1.15,health:1100,colors:[16054008]},sports:{name:"Vortex GT",len:4.45,wid:1.96,hgt:1.22,clear:.22,belt:.74,wheelR:.35,wheelbase:2.65,cab:[-1.35,.85,-.85,.2],maxSpeed:64,accel:17,brake:30,grip:9.6,steer:.58,mass:.95,health:800,spoiler:!0,colors:[13114661,2052e3,15254058,16053492,1052690,14708778,3107658,9080726]},muscle:{name:"Bruiser",len:4.9,wid:1.98,hgt:1.36,clear:.26,belt:.86,wheelR:.36,wheelbase:2.9,cab:[-1.55,.7,-1,.3],maxSpeed:56,accel:15.5,brake:24,grip:6.4,steer:.6,mass:1.15,health:1e3,spoiler:!0,stripes:!0,colors:[16742938,2046835,1052690,13114661,16053492,2792847]},suv:{name:"Ranger",len:4.85,wid:2,hgt:1.86,clear:.38,belt:1.12,wheelR:.4,wheelbase:2.9,cab:[-2.1,1.35,-1.85,.95],maxSpeed:43,accel:9.8,brake:23,grip:7.2,steer:.58,mass:1.35,health:1200,colors:[1052690,16053492,4872810,9051172,3100474,12759680]},van:{name:"Hauler",len:5.2,wid:2.05,hgt:2.35,clear:.34,belt:1.2,wheelR:.38,wheelbase:3.1,cab:[-2.5,1.55,-2.45,1.25],maxSpeed:35,accel:7.5,brake:20,grip:6.6,steer:.55,mass:1.6,health:1300,van:!0,colors:[16053492,15327951,6000569,14042437]},truck:{name:"Mule",len:7.4,wid:2.4,hgt:3.3,clear:.42,belt:1.35,wheelR:.5,wheelbase:4.6,cab:[2,3.6,2.2,3.3],maxSpeed:30,accel:6,brake:18,grip:6.5,steer:.5,mass:2.8,health:1800,truck:!0,colors:[14042437,2845872,16053492,15317321]},super:{name:"Stingray",len:4.55,wid:2.04,hgt:1.12,clear:.2,belt:.68,wheelR:.36,wheelbase:2.7,cab:[-1,.55,-.45,.05],maxSpeed:74,accel:21,brake:33,grip:10.4,steer:.56,mass:.95,health:750,spoiler:!0,colors:[14163486,15778841,2776496,16053492,1118481,16742938]}},gr=Object.keys(Ln);function Ju(s){let t=Ln[s],e=new Gi,i=t.len,n=t.wid/2,r=t.hgt,o=t.clear,a=t.belt,l=i/2,c=-i/2;if(t.truck){let M=l-2.3;return e.box(-n,o,M,n,1.7,l-.15,ee,1,{front:Dc}),e.prism(n-.05,M,l-.35,1.7,n-.15,M,l-.85,3,[Hi,ee,Hi,Hi,ee],[0,1,0,0,1]),e.box(-n,.9,c+.2,n,r,M-.25,ye(15921906),0,{back:ye(14211288)}),e.box(-n+.1,o,c+.2,n-.1,.9,M,Vi,0),e.box(-n,o,l-.15,n,.75,l+.12,Vx,0),e.box(-n,o,c,n,.7,c+.25,Vi,0),e.build()}if(t.van)return e.box(-n,o,c+.1,n,a,l-.6,ee,1,{bottom:Vi}),e.prism(n,l-.6,l-.05,o,n,l-.6,l-.25,a,[Dc,ee,ee,ee,ee],[0,1,1,1,1]),e.prism(n,c+.1,l-.6,a,n-.06,c+.1,l-1.3,r,[Hi,ee,ee,ee,ee],[0,1,1,1,1]),e.box(n-.04,a+.15,l-2.2,n+.01,r-.25,l-1.1,Hi,0),e.box(-n-.01,a+.15,l-2.2,-n+.04,r-.25,l-1.1,Hi,0),$u(e,n,l,c,o),e.build();let h=t.spoiler?.18:.1;e.box(-n,o,c,n,a,l-.35,ee,1,{back:ee,backPaint:1,bottom:Vi}),e.prism(n,l-.35,l,o,n,l-.35,l-h-.25,a,[Dc,ee,ee,ee,ee],[0,1,1,1,1]);let[f,d,u,x]=t.cab,y=.08,g=t.key==="super"?.3:.24,p=r;e.prism(n-y,f,d,a,n-g,u,x,p,[Hi,Hi,Hi,Hi,ee],[0,0,0,0,1]);let _=(f+d)/2;return e.box(n-.2,a,_-.06,n-y+.005,p-.04,_+.06,ee,1),e.box(-n+y-.005,a,_-.06,-n+.2,p-.04,_+.06,ee,1),$u(e,n,l,c,o),e.box(n,a-.05,d-.15,n+.16,a+.1,d,ee,1),e.box(-n-.16,a-.05,d-.15,-n,a+.1,d,ee,1),t.spoiler&&(e.box(-n+.1,a+.25,c+.05,n-.1,a+.32,c+.4,ee,1),e.box(-n+.3,a,c+.15,-n+.4,a+.25,c+.3,Vi,0),e.box(n-.4,a,c+.15,n-.3,a+.25,c+.3,Vi,0)),t.stripes&&(e.box(-.35,a+.003,c+.3,-.12,a+.006,f,ye(16777215),0),e.box(.12,a+.003,c+.3,.35,a+.006,f,ye(16777215),0),e.box(-.35,a+.003,d,-.12,a+.006,l-.4,ye(16777215),0),e.box(.12,a+.003,d,.35,a+.006,l-.4,ye(16777215),0)),s==="police"&&(e.box(n-.005,o+.08,f-.4,n+.01,a-.12,d+.2,ye(1316378),0),e.box(-n-.01,o+.08,f-.4,-n+.005,a-.12,d+.2,ye(1316378),0),e.box(-.62,r,-.1,.62,r+.1,.18,Vi,0),e.box(-n+.25,o+.05,l,n-.25,a-.1,l+.22,Vi,0),e.box(n-.002,a-.28,f,n+.012,a-.16,d,ye(3107839),0),e.box(-n-.012,a-.28,f,-n+.002,a-.16,d,ye(3107839),0)),s==="taxi"&&(e.box(-.35,r,-.15,.35,r+.26,.15,ye(16774084),0),e.box(n-.002,a-.3,c+.4,n+.012,a-.22,l-.6,ye(1118481),0),e.box(-n-.012,a-.3,c+.4,-n+.002,a-.22,l-.6,ye(1118481),0)),e.build()}function $u(s,t,e,i,n){s.box(-t+.02,n-.05,e-.05,t-.02,n+.28,e+.12,Vi,0),s.box(-t+.02,n-.05,i-.12,t-.02,n+.28,i+.05,Vi,0)}function Ku(s){let t=Ln[s],e=t.wid/2,i=t.len/2,n=t.truck?.95:t.clear+(t.belt-t.clear)*.62,r=[[e-.32,n,i+.01,0],[-e+.32,n,i+.01,0],[e-.25,n+(t.van||t.truck?.1:.05),-i-.01,1],[-e+.25,n+(t.van||t.truck?.1:.05),-i-.01,1]];return s==="police"&&r.push([.35,t.hgt+.15,.04,2],[-.35,t.hgt+.15,.04,3]),r}function ju(){let s=new re(1,1,1,12,1);s.rotateZ(Math.PI/2);let t=s.attributes.position.count,e=new Float32Array(t*3),i=new Float32Array(t),n=s.attributes.position;for(let r=0;r<t;r++){let o=Math.hypot(n.getY(r),n.getZ(r)),l=Math.abs(n.getX(r))>.49&&o<.6,c=ye(l?13225169:1579291);e.set(c,r*3)}return s.setAttribute("color",new ne(e,3)),s.setAttribute("paint",new ne(i,1)),s}function Qu(){let s={};{let e=new Gi;e.box(-.18,-.12,-.11,.18,.12,.11,ee,1),e.box(-.185,.07,-.115,.185,.12,.115,ye(2762018),0),s.pelvis=e.build()}{let e=new Gi;e.prism(.18,-.11,.11,0,.23,-.12,.12,.52,[ee,ee,ee,ee,ee],[1,1,1,1,1]),e.box(-.08,.5,-.06,.08,.56,.08,ye(15321512),0),s.torso=e.build()}{let e=new Gi;e.box(-.115,.04,-.12,.115,.3,.12,ee,1),e.box(-.06,-.02,-.05,.06,.05,.05,ee,1),e.box(.035,.17,.12,.07,.2,.125,ye(1710618),0),e.box(-.07,.17,.12,-.035,.2,.125,ye(1710618),0),e.box(-.04,.095,.12,.04,.11,.124,ye(6957610),0),e.box(-.02,.12,.12,.02,.16,.15,ee,1),s.head=e.build()}{let e=new Gi;e.box(-.125,.24,-.13,.125,.34,.11,ee,1),e.box(-.125,.12,-.135,.125,.25,-.08,ee,1),s.hair=e.build()}{let e=new Gi;e.box(-.06,-.6,-.06,.06,0,.06,ee,1),e.box(-.05,-.7,-.05,.05,-.6,.06,ee,1),s.arm=e.build()}{let e=new Gi;e.box(-.08,-.84,-.08,.08,0,.08,ee,1),e.box(-.085,-.93,-.1,.085,-.84,.15,ye(1907481),0),s.leg=e.build()}{let e=new Gi;e.box(-.03,-.04,-.05,.03,.05,.28,ye(2105892),0),e.box(-.025,-.15,-.02,.025,-.04,.05,ye(2895408),0),s.gun=e.build()}return s}var tf=[16767925,15843965,14724201,13010498,9262372,6044193,16769220,14197887],ef=[1774608,3875604,6965802,12095584,14205040,8010270,1052688,12434877,2759186],nf=[15921386,11022893,2899548,5991226,13218954,8027520,1842206,5209256,9187129,14198842,3108714,14273456,7031354,12872266],sf=[2766160,3885670,2829101,4868942,7035717,12759948,15131352,5595210,8020552];var Gx=1,Wx=24,Uc=class{constructor(t,e,i,n,r){this.id=Gx++,this.type=t,this.T=Ln[t],this.x=e,this.z=i,this.h=n,this.y=m.physics?m.physics.groundHeight(e,i):0,this.vx=0,this.vz=0,this.vy=0,this.w=0,this.vF=0,this.color=new ct(r??Me(this.T.colors)),this.health=this.T.health,this.maxHealth=this.T.health,this.driver=null,this.passenger=null,this.ai=null,this.throttle=0,this.steer=0,this.handbrake=!1,this.steerAngle=0,this.spin=0,this.pitch=0,this.roll=0,this.onGround=!0,this.airTime=0,this.burnT=0,this.wrecked=!1,this.wreckT=0,this.removed=!1,this.sinkT=0,this.siren=!1,this.isPolice=t==="police",this.persistent=!1,this.lastHitBy=null,this.hornT=0,this.braking=!1,this.smokeT=0,this.n=Math.max(3,Math.ceil(this.T.len/this.T.wid)+1),this.r=this.T.wid/2,this.mass=this.T.mass,this.skidT=0,this.slip=0,this.locked=!1,this.label=null,this.lastCrash=0}get speed(){return Math.hypot(this.vx,this.vz)}get fx(){return Math.sin(this.h)}get fz(){return Math.cos(this.h)}circleOffsets(){let t=this.T.len/2-this.r,e=[];for(let i=0;i<this.n;i++)e.push(-t+2*t*i/(this.n-1));return e}seatPos(t=1){let e=this.T,i=t*(e.truck?.55:.36),n=e.truck?e.len/2-1.4:(e.cab[0]+e.cab[1])/2-.15,r=this.fx,o=this.fz;return{x:this.x+r*n+o*i,z:this.z+o*n-r*i,y:this.y}}nearestDoor(t,e){let i=this.doorPos(1),n=this.doorPos(-1);return Math.hypot(i.x-t,i.z-e)<=Math.hypot(n.x-t,n.z-e)?i:n}doorPos(t=1){let e=this.T,i=t*(e.wid/2+.75),n=e.truck?e.len/2-1.6:(e.cab[0]+e.cab[1])/2,r=this.fx,o=this.fz;return{x:this.x+r*n+o*i,z:this.z+o*n-r*i}}damage(t,e){this.wrecked||(e&&(this.lastHitBy=e),this.health-=t,this.health<=0&&this.burnT===0&&(this.health=0,this.burnT=1e-4))}explode(){if(!this.wrecked){if(this.wrecked=!0,this.burnT=0,this.health=0,this.siren=!1,this.vy=7,this.onGround=!1,this.w+=Q(-2,2),m.fx.explosion(this.x,this.y+1,this.z,1.2),m.weapons.blast(this.x,this.y+.8,this.z,9,160,this.lastHitBy,this),this.driver){let t=this.driver;t.isPlayer?(m.player.exitVehicle(!0),t.knock(this.vx*.3+Math.sin(this.h+1.6)*6,6,this.vz*.3+Math.cos(this.h+1.6)*6),t.damage(55,null,"explosion")):(t.exitVehicle(!0),t.damage(1e3,this.lastHitBy,"explosion"))}if(this.passenger){let t=this.passenger;t.exitVehicle(!0),t.damage(1e3,this.lastHitBy,"explosion")}this.lastHitBy&&this.lastHitBy.isPlayer&&(m.stats.carsDestroyed++,m.police.crime(this.isPolice?"copcar":"carboom",this.x,this.z)),m.missions&&m.missions.onVehicleDestroyed(this)}}update(t){let e=this.T,i=m.physics;if(this.removed)return;this.burnT>0?(this.burnT+=t,this.smokeT-=t,this.smokeT<=0&&(this.smokeT=.05,m.fx.fire(this.x+this.fx*e.len*.3,this.y+e.belt+.2,this.z+this.fz*e.len*.3)),this.burnT>4.5&&this.explode()):!this.wrecked&&this.health<this.maxHealth*.35&&(this.smokeT-=t,this.smokeT<=0&&(this.smokeT=this.health<this.maxHealth*.18?.06:.14,m.fx.smoke(this.x+this.fx*e.len*.35,this.y+e.belt+.1,this.z+this.fz*e.len*.35,this.health<this.maxHealth*.18?.25:.55))),this.wrecked&&(this.wreckT+=t,this.smokeT-=t,this.smokeT<=0&&this.wreckT<20&&(this.smokeT=.18,m.fx.smoke(this.x,this.y+1.2,this.z,.15)));let n=this.wrecked||this.sinkT>0,r=n?0:this.throttle,o=Math.sin(this.h),a=Math.cos(this.h),l=-a,c=o;if(this.onGround){let d=this.vx*o+this.vz*a,u=this.vx*l+this.vz*c,x=Math.abs(d);if(this.braking=!1,r>.02)if(d<-.5)d=Math.min(0,d+e.brake*r*t),this.braking=!0;else{let I=1-Math.min(1,(d/e.maxSpeed)**2);d+=e.accel*r*Math.max(.03,I)*t}else r<-.02?d>.5?(d=Math.max(0,d+e.brake*r*t),this.braking=!0):(d-=e.accel*.55*-r*t,d<-e.maxSpeed*.3&&(d=-e.maxSpeed*.3)):d=fr(d,0,(n?6:1.4+x*.04)*t);this.handbrake&&(d=fr(d,0,6.5*t),this.braking=!0),n&&this.wrecked&&(d=fr(d,0,8*t));let y=e.grip;this.handbrake&&(y*=.2),Math.abs(u)>5&&(y*=.7),this.slip=Math.abs(u),u*=Math.exp(-y*t);let g=e.steer*(1-Math.min(.62,x/75));this.steerAngle=fr(this.steerAngle,(n?0:this.steer)*g,3.2*t);let p=-(d/e.wheelbase)*Math.tan(this.steerAngle);this.handbrake&&x>6&&(p*=1.45),this.w=Se(this.w,p,ze(9,t)),this.h+=this.w*t;let _=Math.sin(this.h),M=Math.cos(this.h);this.vx=_*d+-M*u,this.vz=M*d+_*u,this.vF=d;let v=this.braking?-.035*Math.min(1,x/15):r>0?.025*r:0;this.pitch=Se(this.pitch,v,ze(6,t)),this.roll=Se(this.roll,Ct(d*this.w*.01,-.09,.09),ze(6,t)),this.spin+=d/e.wheelR*t}else this.w*=1-.4*t,this.h+=this.w*t,this.spin+=this.vF/e.wheelR*t,this.pitch=Se(this.pitch,Ct(this.vy*.02,-.35,.25),ze(2,t)),this.roll=Se(this.roll,0,ze(2,t));this.x+=this.vx*t,this.z+=this.vz*t;let h=i.groundHeight(this.x,this.z);if(this.onGround)if(h>=this.y-.35){let d=(h-this.y)/t;this.vy=Math.min(d,Math.abs(this.vF)*.6+2),this.y=h}else this.onGround=!1,this.airTime=0,this.airStart={x:this.x,z:this.z};if(!this.onGround&&(this.airTime+=t,this.vy-=Wx*t,this.y+=this.vy*t,this.y<=h)){let d=-this.vy;this.y=h,this.vy=0,this.onGround=!0,d>9&&(this.damage((d-9)*18),this.driver&&this.driver.isPlayer&&(m.cam.shake(Math.min(.6,d*.03)),m.audio.crash(Math.min(1,d/20)),Xe(40))),this.driver&&this.driver.isPlayer&&this.airTime>.6&&m.missions.onLanded(this,this.airTime)}if(Ae-h>.9&&this.y<Ae+.3&&this.sinkT===0&&(this.sinkT=1e-4,m.fx.splash(this.x,Ae,this.z,2),m.audio.splash()),this.sinkT>0){if(this.sinkT+=t,this.vx*=1-2.5*t,this.vz*=1-2.5*t,this.y=Math.max(h,Ae-.4-this.sinkT*.5),this.vy=0,this.onGround=!0,this.sinkT>1.2&&this.driver){let d=this.driver;d.isPlayer?m.player.exitVehicle(!0):d.exitVehicle(!0)}this.sinkT>1.2&&this.passenger&&this.passenger.exitVehicle(!0),this.sinkT>8&&(this.removed=!0);return}this.collideStatic(t),i.inBounds(this.x,this.z)||(this.vx*=-.5,this.vz*=-.5,this.x-=Math.sign(this.x)*.5)}collideStatic(){let t=m.physics,e=this.circleOffsets(),i=Math.sin(this.h),n=Math.cos(this.h);for(let r=0;r<e.length;r++){let o=e[r],a=this.x+i*o,l=this.z+n*o,c=t.resolveCircle(a,l,this.r,this.y+.3);if(!c.hit)continue;this.x+=c.x-a,this.z+=c.z-l;let h=c.nx,f=c.nz,d=this.vx*h+this.vz*f;if(d<0){let u=-d;this.vx-=1.3*d*h,this.vz-=1.3*d*f,this.vx*=.96,this.vz*=.96;let x=i*f-n*h;this.w-=o*x*u*.09,this.onImpact(u,null)}}}onImpact(t,e){if(t>4.5){let n=(t-4.5)*16/this.mass*(this.driver&&this.driver.isPlayer?.6:1);this.damage(n,e&&e.driver?e.driver:this.lastHitBy)}let i=this.driver&&this.driver.isPlayer;t>3&&m.time-this.lastCrash>.25&&(this.lastCrash=m.time,(i||m.cam.distTo(this.x,this.z)<40)&&m.audio.crash(Math.min(1,t/22),this.x,this.z),t>7&&m.fx.sparks(this.x+this.fx*this.T.len*.45,this.y+.6,this.z+this.fz*this.T.len*.45,8),i&&(m.cam.shake(Math.min(.5,t*.025)),Xe(Math.min(80,t*4)))),this.ai&&this.ai.onHit&&this.ai.onHit(t,e)}};function of(){let s=m.vehicles;for(let e=0;e<s.length;e++){let i=s[e];if(!i.removed)for(let n=e+1;n<s.length;n++){let r=s[n];if(r.removed)continue;let o=(i.T.len+r.T.len)/2+.3,a=i.x-r.x,l=i.z-r.z;a*a+l*l>o*o||Math.abs(i.y-r.y)>2.2||Xx(i,r)}}let t=m.humans;for(let e of t)if(!(e.removed||e.vehicle))for(let i of s){if(i.removed)continue;let n=e.x-i.x,r=e.z-i.z,o=i.T.len/2+.6;n*n+r*r>o*o||e.y>i.y+i.T.hgt+.2||e.y+1.6<i.y||qx(e,i)}}function Xx(s,t){let e=s.circleOffsets(),i=t.circleOffsets(),n=Math.sin(s.h),r=Math.cos(s.h),o=Math.sin(t.h),a=Math.cos(t.h);for(let l of e)for(let c of i){let h=s.x+n*l,f=s.z+r*l,d=t.x+o*c,u=t.z+a*c,x=h-d,y=f-u,g=s.r+t.r,p=x*x+y*y;if(p>=g*g)continue;let _=Math.sqrt(p)||.001,M=x/_,v=y/_,I=g-_,T=s.wrecked?s.mass*1.5:s.mass,E=t.wrecked?t.mass*1.5:t.mass,P=E/(T+E),S=T/(T+E);s.x+=M*I*P,s.z+=v*I*P,t.x-=M*I*S,t.z-=v*I*S;let w=s.vx-t.vx,z=s.vz-t.vz,k=w*M+z*v;if(k<0){let U=-1.3*k/(1/T+1/E);s.vx+=U/T*M,s.vz+=U/T*v,t.vx-=U/E*M,t.vz-=U/E*v;let H=n*v-r*M,Y=o*v-a*M;s.w-=l*H*(U/T)*.06,t.w+=c*Y*(U/E)*.06;let W=-k;if(s.driver&&s.driver.isPlayer&&(t.lastHitBy=s.driver),t.driver&&t.driver.isPlayer&&(s.lastHitBy=t.driver),s.onImpact(W,t),t.onImpact(W,s),W>6){let ot=m.player;(s.driver===ot&&t.isPolice||t.driver===ot&&s.isPolice)&&m.police.crime("rampolice",s.x,s.z)}}return}}function qx(s,t){let e=Math.sin(t.h),i=Math.cos(t.h),n=s.x-t.x,r=s.z-t.z,o=n*e+r*i,a=n*i-r*e,l=t.T.len/2+s.radius,c=t.T.wid/2+s.radius;if(Math.abs(o)>=l||Math.abs(a)>=c)return;let h=l-Math.abs(o),f=c-Math.abs(a),d,u,x;if(f<h){let p=Math.sign(a)||1;d=i*p,u=-e*p,x=f}else{let p=Math.sign(o)||1;d=e*p,u=i*p,x=h}let y=(t.vx-s.vx)*d+(t.vz-s.vz)*u,g=t.speed;if(y>5&&g>5&&s.state!=="dead"){let p=g*5.5+y*2,_=t.driver||null;s.knock(t.vx*.9+d*3,Math.min(9,2.5+g*.22),t.vz*.9+u*3),s.damage(p,_,"vehicle"),t.vx*=.93,t.vz*=.93,t.driver&&t.driver.isPlayer&&(m.audio.thud(.8),Xe(30),s.kind==="cop"?m.police.crime("hitcop",s.x,s.z):m.police.crime("hitped",s.x,s.z)),s.isPlayer&&t.driver&&!t.driver.isPlayer&&m.cam.shake(.3)}else{if(s.x+=d*x,s.z+=u*x,s.state==="dead"||s.state==="ragdoll")return;let p=s.vx*d+s.vz*u;p<0&&(s.vx-=p*d,s.vz-=p*u),g>1&&(t.vx*=.995,t.vz*=.995)}}var Lo=40,ss=new Tt,Vs=new Tt,Gs=new We,Do=new ui,mi=new D,pn=new D,rf=new ct(1709844),Uo=class{constructor(t){this.material=dn(),this.bodies={};for(let n of gr){let r=new fi(Ju(n),this.material,Lo);r.count=0,r.castShadow=!0,r.receiveShadow=!0,r.frustumCulled=!1,r.instanceMatrix.setUsage(di),r.setColorAt(0,new ct(1,1,1)),t.add(r),this.bodies[n]=r}let e=Lo*3;this.wheels=new fi(ju(),this.material,e*4),this.wheels.count=0,this.wheels.castShadow=!0,this.wheels.frustumCulled=!1,this.wheels.setColorAt(0,new ct(1,1,1)),t.add(this.wheels),this.lights=new fi(new te(1,1,1),new Oe({color:16777215}),e*6),this.lights.count=0,this.lights.frustumCulled=!1,this.lights.setColorAt(0,new ct(1,1,1)),t.add(this.lights),this.lightDefs={};for(let n of gr)this.lightDefs[n]=Ku(n);this.maxGlow=e*6;let i=new xe;this.glowPos=new Float32Array(this.maxGlow*3),this.glowCol=new Float32Array(this.maxGlow*3),this.glowSize=new Float32Array(this.maxGlow),i.setAttribute("position",new ne(this.glowPos,3).setUsage(di)),i.setAttribute("color",new ne(this.glowCol,3).setUsage(di)),i.setAttribute("size",new ne(this.glowSize,1).setUsage(di)),this.glow=new In(i,kc()),this.glow.frustumCulled=!1,t.add(this.glow),this.carMatrix=new Map,this._c=new ct}update(t,e,i){let n={};for(let f of gr)n[f]=0;let r=0,o=0,a=0,l=this._c,c=Math.floor(m.time*6)%2;for(let f of t){if(f.removed)continue;let d=f.x-i.x,u=f.z-i.z;if(d*d+u*u>420*420)continue;let x=f.T,y=this.bodies[f.type],g=n[f.type]++;if(g>=Lo)continue;Do.set(-f.pitch,f.h,f.roll,"YXZ"),Gs.setFromEuler(Do),mi.set(f.x,f.y,f.z),pn.set(1,1,1),ss.compose(mi,Gs,pn),f.matrix=f.matrix||new Tt,f.matrix.copy(ss),y.setMatrixAt(g,ss),y.setColorAt(g,f.wrecked?rf:f.color);let p=x.wid/2-.16,_=x.wheelR,M=x.wheelbase/2,v=x.truck?[M-.3,-M+.3]:[M,-M];for(let E=0;E<4;E++){let P=E%2?-1:1,S=E<2;Do.set(f.spin,S?f.steerAngle*-1:0,0,"YXZ"),Gs.setFromEuler(Do),mi.set(P*p,_,S?v[0]:v[1]),pn.set(.28,_,_),Vs.compose(mi,Gs,pn),Vs.premultiply(ss),this.wheels.setMatrixAt(r,Vs),this.wheels.setColorAt(r,f.wrecked?rf:Yx),r++}if(f.wrecked)continue;let I=this.lightDefs[f.type],T=e>.25||f.isPolice;for(let[E,P,S,w]of I){if(w===0)l.setRGB(T?1:.8,T?1:.8,T?.85:.75),pn.set(.42,.13,.05);else if(w===1){let Y=f.braking?1:T?.55:.3;l.setRGB(Y,.02,.02),pn.set(.36,.12,.05)}else if(w===2){let Y=f.siren&&c===0;l.setRGB(Y?1:.35,.05,.05),pn.set(.5,.14,.24)}else{let Y=f.siren&&c===1;l.setRGB(.05,.12,Y?1:.35),pn.set(.5,.14,.24)}Gs.identity(),mi.set(E,P,S),Vs.compose(mi,Gs,pn),Vs.premultiply(ss),this.lights.setMatrixAt(o,Vs),this.lights.setColorAt(o,l),o++;let z=0,k=0,U=0,H=0;if(w===0&&T&&e>.25?(z=3.2,k=1,U=.95,H=.8):w===1&&(f.braking||e>.25)?(z=f.braking?2.4:1.4,k=1,U=.08,H=.05):w===2&&f.siren&&c===0?(z=5,k=1,U=.1,H=.1):w===3&&f.siren&&c===1&&(z=5,k=.15,U=.3,H=1),z>0&&a<this.maxGlow){mi.set(E,P,S+(w===0?.1:w===1?-.1:0)).applyMatrix4(ss),this.glowPos[a*3]=mi.x,this.glowPos[a*3+1]=mi.y,this.glowPos[a*3+2]=mi.z;let Y=w>=2?1:Math.max(.4,e);this.glowCol[a*3]=k*Y,this.glowCol[a*3+1]=U*Y,this.glowCol[a*3+2]=H*Y,this.glowSize[a]=z,a++}}f.type==="taxi"&&e>.2&&a<this.maxGlow&&(mi.set(0,x.hgt+.15,0).applyMatrix4(ss),this.glowPos.set([mi.x,mi.y,mi.z],a*3),this.glowCol.set([1,.8,.3],a*3),this.glowSize[a]=1.6,a++)}for(let f of gr){let d=this.bodies[f];d.count=Math.min(n[f],Lo),d.instanceMatrix.needsUpdate=!0,d.instanceColor&&(d.instanceColor.needsUpdate=!0)}this.wheels.count=r,this.wheels.instanceMatrix.needsUpdate=!0,this.wheels.instanceColor&&(this.wheels.instanceColor.needsUpdate=!0),this.lights.count=o,this.lights.instanceMatrix.needsUpdate=!0,this.lights.instanceColor&&(this.lights.instanceColor.needsUpdate=!0);let h=this.glow.geometry;h.setDrawRange(0,a),h.attributes.position.needsUpdate=!0,h.attributes.color.needsUpdate=!0,h.attributes.size.needsUpdate=!0}},Yx=new ct(1,1,1);function kc(s=1){return new Pe({uniforms:{uScale:{value:600},uOpacity:{value:s}},vertexShader:`
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uScale;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(size * uScale / -mv.z, 1.0, 256.0);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      varying vec3 vColor;
      uniform float uOpacity;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d) * 2.0;
        float a = smoothstep(1.0, 0.0, r);
        a = a * a;
        gl_FragColor = vec4(vColor * a * uOpacity, 1.0);
      }`,blending:ei,depthWrite:!1,transparent:!0})}function Ai(s,t,e,i,n){let r=new Uc(s,t,e,i,n);return m.vehicles.push(r),r}var Ws=class{constructor(t=[]){this.pts=t,this.i=0}set(t){this.pts=t,this.i=0}get done(){return this.i>=this.pts.length-1}target(t,e,i){let n=this.pts;if(n.length<2)return n.length?{x:n[0].x,z:n[0].z,left:Math.hypot(n[0].x-t,n[0].z-e),proj:n[0]}:null;for(;this.i<n.length-1;){let v=n[this.i],I=n[this.i+1],T=I.x-v.x,E=I.z-v.z,P=T*T+E*E||1;if(((t-v.x)*T+(e-v.z)*E)/P>1)this.i++;else break}if(this.i>=n.length-1){let v=n[n.length-1];return{x:v.x,z:v.z,left:Math.hypot(v.x-t,v.z-e),proj:v}}let r=n[this.i],o=n[this.i+1],a=o.x-r.x,l=o.z-r.z,c=Math.hypot(a,l)||1,h=Ct(((t-r.x)*a+(e-r.z)*l)/(c*c),0,1),f=r.x+a*h,d=r.z+l*h,u={x:f,z:d},x=i,y=this.i,g=c*(1-h),p=f,_=d,M=g;for(let v=y+1;v<n.length-1;v++)M+=Math.hypot(n[v+1].x-n[v].x,n[v+1].z-n[v].z);for(;x>0;){let v=y===this.i?{x:f,z:d}:n[y],I=n[y+1],T=Math.hypot(I.x-v.x,I.z-v.z);if(T>=x||y+1>=n.length-1){let E=T>0?Math.min(1,x/T):1;p=v.x+(I.x-v.x)*E,_=v.z+(I.z-v.z)*E;break}x-=T,y++}return{x:p,z:_,left:M,proj:u}}};function rs(s,t,e,i,n,r){let o=Math.atan2(t-s.x,e-s.z),a=ii(o-s.h),l=s.vx*Math.sin(s.h)+s.vz*Math.cos(s.h);if(r.stuckT=r.stuckT||0,r.revT=r.revT||0,r.revT>0){r.revT-=n,s.throttle=-.8,s.steer=Ct(a*2,-1,1),s.handbrake=!1;return}let c=Ct(-a*2.3,-1,1),h,f=i-l;f>.5?h=Ct(f*.35,.25,1):f<-1.2?h=-Ct(-f*.25,.2,1):h=0,Math.abs(a)>.6&&l>9&&(h=Math.min(h,-.4)),s.handbrake=!1,s.throttle=h,s.steer=c,h>.2&&Math.abs(l)<.8?r.stuckT+=n:r.stuckT=Math.max(0,r.stuckT-n*2),r.stuckT>1.4&&(r.stuckT=0,r.revT=Q(.9,1.5))}function Nc(s,t,e,i,n){let r=t.x-s.x,o=t.z-s.z,a=Math.hypot(r,o)||1,l=r/a,c=o/a,h=-c,f=l;return i?{x:t.x-l*n+h*e,z:t.z-c*n+f*e}:{x:s.x+l*n+h*e,z:s.z+c*n+f*e}}function af(s,t,e,i,n=i){let r=[];r.push(Nc(s,t,i,!1,Et+1));let o=Nc(s,t,i,!0,Et+5.5);if(r.push(o),e){let a=Nc(t,e,n,!1,Et+1.5),l=Math.sign(t.x-s.x),c=Math.sign(t.z-s.z),h=Math.sign(e.x-t.x),f=Math.sign(e.z-t.z);if(!(l===h&&c===f)){let u,x;l!==0?(u=a.x,x=o.z):(u=o.x,x=a.z);for(let y of[.25,.5,.75]){let g=1-y;r.push({x:g*g*o.x+2*g*y*u+y*y*a.x,z:g*g*o.z+2*g*y*x+y*y*a.z})}}r.push(a)}return r}function Fc(s,t,e){let i=e.nb.filter(a=>a!==t.id);if(!i.length)return s.nodes[t.id];let n=Math.sign(e.x-t.x),r=Math.sign(e.z-t.z),o=i.find(a=>{let l=s.nodes[a];return Math.sign(l.x-e.x)===n&&Math.sign(l.z-e.z)===r});return o!==void 0&&Math.random()<.45?s.nodes[o]:s.nodes[i[Math.floor(Math.random()*i.length)]]}function ko(s,t,e){if(!t||!e)return[];if(t===e)return[t];let i=new Int32Array(s.nodes.length).fill(-1),n=new Uint8Array(s.nodes.length),r=[t.id];n[t.id]=1;let o=0;for(;o<r.length;){let c=r[o++];if(c===e.id)break;for(let h of s.nodes[c].nb)n[h]||(n[h]=1,i[h]=c,r.push(h))}if(!n[e.id])return[];let a=[],l=e.id;for(;l!==-1&&(a.push(s.nodes[l]),l!==t.id);)l=i[l];return a.reverse()}function No(s,t,e){let i=(e+s.phase)%20;return t==="x"?i<8?"g":i<10?"y":"r":i>=10&&i<18?"g":i>=18?"y":"r"}function Ie(s,t,e=0){let i=s.index?s.toNonIndexed():s,n=new ct(t),r=i.attributes.position.count,o=new Float32Array(r*3),a=new Float32Array(r).fill(e);for(let l=0;l<r;l++)o[l*3]=n.r,o[l*3+1]=n.g,o[l*3+2]=n.b;return i.setAttribute("color",new ne(o,3)),i.setAttribute("paint",new ne(a,1)),i.attributes.uv&&i.deleteAttribute("uv"),i}function Zx(){let s=[],t=cn(7),e=8.5,i=7,n=0;for(let a=0;a<i;a++){let l=.3-a*.022,c=.3-(a+1)*.022,h=e/i,f=new re(c,l,h,7,1),d=.035*(a+1)*(a+1)*.35;f.rotateZ(-.05*a*.6),f.translate(n,h*a+h/2,0),n=d,s.push(Ie(f,a%2?9071176:7755834))}let r={x:n,y:e},o=9;for(let a=0;a<o;a++){let l=a/o*Math.PI*2+t()*.3,c=3.6+t()*.8,h=1.3+t()*.5,f=[],d=6,u=Math.cos(l),x=Math.sin(l);for(let p=0;p<d;p++){let _=p/d,M=(p+1)/d,v=(z,k)=>{let U=z*c,H=r.y+.5*z-h*z*z,Y=(.6*Math.sin(Math.PI*Math.min(1,z*1.1))+.04)*k;return[r.x+u*U-x*Y,H+Math.abs(Y)*-.25,x*U+u*Y]},I=v(_,-1),T=v(_,1),E=v(M,1),P=v(M,-1),S=v(_,0),w=v(M,0);S[1]+=.12,w[1]+=.12,f.push(...I,...S,...w,...I,...w,...P,...S,...T,...E,...S,...E,...w)}let y=new xe;y.setAttribute("position",new ie(f,3)),y.computeVertexNormals();let g=[3115578,3840576,2783797,4630602][a%4];s.push(Ie(y,g))}for(let a=0;a<4;a++){let l=new Qn(.17,5,4);l.translate(r.x+Math.cos(a*1.6)*.3,r.y-.3,Math.sin(a*1.6)*.3),s.push(Ie(l,5913114))}return zn(s)}function $x(){let s=[],t=new re(.18,.26,3.2,6);t.translate(0,1.6,0),s.push(Ie(t,6965808));let e=[[0,3.8,0,1.9],[.9,3.3,.4,1.3],[-.8,3.4,-.3,1.4],[.1,4.8,.2,1.3]];for(let[i,n,r,o]of e){let a=new _o(o,0);a.translate(i,n,r),s.push(Ie(a,16777215,1))}return zn(s)}function Jx(){let s=[],t=new re(.08,.12,7,6);t.translate(0,3.5,0),s.push(Ie(t,4869975));let e=new re(.2,.25,.5,6);e.translate(0,.25,0),s.push(Ie(e,3817029));let i=new te(.1,.1,2);i.translate(0,6.95,1),s.push(Ie(i,4869975));let n=new te(.45,.16,.8);n.translate(0,6.92,1.9),s.push(Ie(n,3817029));let r=new te(.36,.04,.65);return r.translate(0,6.83,1.9),s.push(Ie(r,16773312)),zn(s)}function Kx(){let s=[],t=new re(.09,.11,4.4,6);t.translate(0,2.2,0),s.push(Ie(t,2829875));let e=new te(.44,1.2,.34);e.translate(0,4.6,.02),s.push(Ie(e,1711135));let i=new te(.62,1.4,.04);return i.translate(0,4.6,-.16),s.push(Ie(i,1118740)),zn(s)}function jx(){let s=[],t=new re(.04,.04,2.4,5);t.translate(0,1.2,0),s.push(Ie(t,14540253));let e=new je(1.5,.6,8,1,!0);e.translate(0,2.4,0),s.push(Ie(e,16777215,1));let i=new te(.9,.02,1.8);return i.translate(.9,.02,.4),s.push(Ie(i,16777215,1)),zn(s)}function Qx(){let s=[],t=new te(1.8,.08,.45);t.translate(0,.48,0),s.push(Ie(t,9067060));let e=new te(1.8,.4,.06);e.translate(0,.8,-.2),s.push(Ie(e,9067060));for(let i of[-.75,.75]){let n=new te(.08,.48,.4);n.translate(i,.24,0),s.push(Ie(n,2829875))}return zn(s)}function ty(){let s=[],t=new re(.15,.18,.7,7);t.translate(0,.35,0),s.push(Ie(t,14034984));let e=new Qn(.16,6,4);e.translate(0,.72,0),s.push(Ie(e,14034984));let i=new re(.06,.06,.45,5);return i.rotateZ(Math.PI/2),i.translate(0,.45,0),s.push(Ie(i,12066591)),zn(s)}var mn=class{constructor(t,e,i,n,r={}){this.items=n,this.max=Math.min(n.length,r.max??1200),this.mesh=new fi(e,i,Math.max(1,this.max)),this.mesh.count=0,this.mesh.frustumCulled=!1,this.mesh.castShadow=r.shadow??!0,this.mesh.receiveShadow=!1,this.mesh.setColorAt(0,new ct(1,1,1)),t.add(this.mesh),this.mats=new Float32Array(n.length*16),this.cols=new Float32Array(n.length*3);let o=new Tt,a=new We,l=new D,c=new D,h=new D(0,1,0),f=new ct;n.forEach((d,u)=>{let x=d.y??m.physics.groundHeight(d.x,d.z);l.set(d.x,x,d.z),a.setFromAxisAngle(h,d.rot||0);let y=d.s||1;c.set(y,y,y),o.compose(l,a,c),o.toArray(this.mats,u*16),f.set(d.color??r.color??16777215),r.tint&&r.tint(f,u),this.cols[u*3]=f.r,this.cols[u*3+1]=f.g,this.cols[u*3+2]=f.b}),this.visible=[]}refresh(t,e,i){let n=i*i,r=this.mesh.instanceMatrix.array,o=this.mesh.instanceColor.array,a=0;this.visible.length=0;for(let l=0;l<this.items.length&&a<this.max;l++){let c=this.items[l],h=c.x-t,f=c.z-e;h*h+f*f>n||(r.set(this.mats.subarray(l*16,l*16+16),a*16),o[a*3]=this.cols[l*3],o[a*3+1]=this.cols[l*3+1],o[a*3+2]=this.cols[l*3+2],this.visible.push(l),a++)}this.mesh.count=a,this.mesh.instanceMatrix.needsUpdate=!0,this.mesh.instanceColor.needsUpdate=!0}},Fo=class{constructor(t,e){let i=dn(),n=dn({side:Ge}),r=cn(31),o=h=>({...h,y:h.y??m.physics.groundHeight(h.x,h.z)});this.palms=new mn(t,Zx(),n,e.props.palms.map(o),{max:900}),this.trees=new mn(t,$x(),i,e.props.trees.map(o),{max:900,tint:h=>h.setHSL(.25+r()*.1,.45+r()*.2,.28+r()*.1)}),this.lamps=new mn(t,Jx(),i,e.props.lamps.map(h=>({...h,y:h.y??oe})),{max:1400,shadow:!1}),this.signals=new mn(t,Kx(),i,e.props.lights.map(h=>({...h,y:oe})),{max:700,shadow:!1}),this.umbrellas=new mn(t,jx(),n,e.props.umbrellas.map(h=>({...h,y:m.physics.groundHeight(h.x,h.z)})),{max:120}),this.benches=new mn(t,Qx(),i,e.props.benches.map(h=>({...h,y:oe})),{max:100,shadow:!1}),this.hydrants=new mn(t,ty(),i,e.props.hydrants.map(h=>({...h,y:oe})),{max:200,shadow:!1}),this.sets=[this.palms,this.trees,this.lamps,this.signals,this.umbrellas,this.benches,this.hydrants],this.lightItems=e.props.lights;let a=new te(.24,.24,.08);this.signalLamps=new fi(a,new Oe({color:16777215}),700*3),this.signalLamps.count=0,this.signalLamps.frustumCulled=!1,this.signalLamps.setColorAt(0,new ct(1,1,1)),t.add(this.signalLamps);let l=1400,c=new xe;this.glowPos=new Float32Array(l*3),this.glowCol=new Float32Array(l*3),this.glowSize=new Float32Array(l),c.setAttribute("position",new ne(this.glowPos,3)),c.setAttribute("color",new ne(this.glowCol,3)),c.setAttribute("size",new ne(this.glowSize,1)),this.glowMat=kc(0),this.glow=new In(c,this.glowMat),this.glow.frustumCulled=!1,t.add(this.glow),this.lastX=1e9,this.lastZ=1e9,this._m=new Tt,this._v=new D,this._c=new ct}update(t,e){let i=t.position.x,n=t.position.z,r=m.settings.quality,o=r==="low"?200:r==="high"?380:290;if(Math.hypot(i-this.lastX,n-this.lastZ)>25||this.forceRefresh){this.forceRefresh=!1,this.lastX=i,this.lastZ=n;for(let p of this.sets)p.refresh(i,n,p===this.umbrellas||p===this.benches||p===this.hydrants?o*.6:o);let u=this.lamps.visible,x=0,y=this._v,g=this._m;for(let p of u){g.fromArray(this.lamps.mats,p*16),y.set(0,6.75,1.9).applyMatrix4(g),this.glowPos[x*3]=y.x,this.glowPos[x*3+1]=y.y,this.glowPos[x*3+2]=y.z;let _=p*7%5!==0;this.glowCol[x*3]=1,this.glowCol[x*3+1]=_?.72:.92,this.glowCol[x*3+2]=_?.42:1,this.glowSize[x]=6.5,x++}this.glow.geometry.setDrawRange(0,x),this.glow.geometry.attributes.position.needsUpdate=!0,this.glow.geometry.attributes.color.needsUpdate=!0,this.glow.geometry.attributes.size.needsUpdate=!0}this.glowMat.uniforms.uOpacity.value=e*.85,this.glow.visible=e>.05;let a=this.signals.visible,l=0,c=this._m,h=this._c,f=this.signalLamps,d=m.time;for(let u of a){let x=this.lightItems[u],y=m.city.nodes[x.node],g=No(y,x.axis,d);c.fromArray(this.signals.mats,u*16);for(let p=0;p<3;p++){let _=p===0&&g==="r"||p===1&&g==="y"||p===2&&g==="g",M=p===0?[1,.08,.05]:p===1?[1,.75,.05]:[.1,1,.45],v=_?1:.12;h.setRGB(M[0]*v,M[1]*v,M[2]*v),this._v.set(0,4.98-p*.38,.2);let I=this._m2||(this._m2=new Tt);I.makeTranslation(this._v.x,this._v.y,this._v.z).premultiply(c),f.setMatrixAt(l,I),f.setColorAt(l,h),l++}}f.count=l,f.instanceMatrix.needsUpdate=!0,f.instanceColor.needsUpdate=!0}},Oo=class{constructor(t,e=900){let i=new Bi(1,1);i.rotateX(-Math.PI/2);let n=new Pe({uniforms:{uOpacity:{value:0}},vertexShader:`
        varying vec2 vUv;
        varying vec3 vCol;
        void main() {
          vUv = uv;
          #ifdef USE_INSTANCING_COLOR
            vCol = instanceColor;
          #else
            vCol = vec3(1.0);
          #endif
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,fragmentShader:`
        varying vec2 vUv;
        varying vec3 vCol;
        uniform float uOpacity;
        void main() {
          vec2 d = vUv - 0.5;
          float r = length(d) * 2.0;
          float a = smoothstep(1.0, 0.0, r);
          gl_FragColor = vec4(vCol * a * a * uOpacity, 1.0);
        }`,transparent:!0,depthWrite:!1,blending:ei,polygonOffset:!0,polygonOffsetFactor:-2});this.mesh=new fi(i,n,e),this.mesh.count=0,this.mesh.frustumCulled=!1,this.mesh.renderOrder=1,this.mesh.setColorAt(0,new ct(1,1,1)),t.add(this.mesh),this.mat=n,this.max=e,this.n=0,this._m=new Tt,this._q=new We,this._p=new D,this._s=new D,this._c=new ct,this._up=new D(0,1,0)}begin(){this.n=0}add(t,e,i,n,r,o,a,l,c){this.n>=this.max||(this._p.set(t,e,i),this._q.setFromAxisAngle(this._up,o),this._s.set(n,1,r),this._m.compose(this._p,this._q,this._s),this.mesh.setMatrixAt(this.n,this._m),this._c.setRGB(a,l,c),this.mesh.setColorAt(this.n,this._c),this.n++)}end(t){this.mesh.count=this.n,this.mesh.instanceMatrix.needsUpdate=!0,this.mesh.instanceColor.needsUpdate=!0,this.mat.uniforms.uOpacity.value=t,this.mesh.visible=t>.02&&this.n>0}};var Dn=16,lf=4096,cf=(s,t)=>(s+lf)*8192+(t+lf),Bo=class{constructor(t){this.city=t,this.grid=new Map,this.cols=[],this.stamp=1;for(let e of t.boxes)this.add({t:0,minX:e.minX,maxX:e.maxX,minZ:e.minZ,maxZ:e.maxZ,h:e.h,s:0});for(let e of t.circles)this.add({t:1,x:e.x,z:e.z,r:e.r,h:e.h,s:0,minX:e.x-e.r,maxX:e.x+e.r,minZ:e.z-e.r,maxZ:e.z+e.r});this.ramps=t.ramps.map(e=>({...e,s:Math.sin(e.h),c:Math.cos(e.h),y0:e.y0||0})),this.docksX=Ht(4)+20,this._res={x:0,z:0,nx:0,nz:0,hit:!1,depth:0}}add(t){let e=this.cols.length;this.cols.push(t);let i=Math.floor(t.minX/Dn),n=Math.floor(t.maxX/Dn),r=Math.floor(t.minZ/Dn),o=Math.floor(t.maxZ/Dn);for(let a=i;a<=n;a++)for(let l=r;l<=o;l++){let c=cf(a,l),h=this.grid.get(c);h||this.grid.set(c,h=[]),h.push(e)}}query(t,e,i,n,r){let o=++this.stamp,a=Math.floor(t/Dn),l=Math.floor(i/Dn),c=Math.floor(e/Dn),h=Math.floor(n/Dn);for(let f=a;f<=l;f++)for(let d=c;d<=h;d++){let u=this.grid.get(cf(f,d));if(u)for(let x=0;x<u.length;x++){let y=this.cols[u[x]];if(y.s!==o&&(y.s=o,r(y)===!0))return}}}resolveCircle(t,e,i,n=0){let r=this._res;r.hit=!1,r.nx=0,r.nz=0,r.depth=0;for(let o=0;o<2;o++){let a=!1;if(this.query(t-i,e-i,t+i,e+i,l=>{if(!(n>l.h-.2))if(l.t===0){let c=Ct(t,l.minX,l.maxX),h=Ct(e,l.minZ,l.maxZ),f=t-c,d=e-h,u=f*f+d*d;if(u>=i*i)return;let x,y,g;if(u>1e-10){let p=Math.sqrt(u);x=f/p,y=d/p,g=i-p}else{let p=t-l.minX,_=l.maxX-t,M=e-l.minZ,v=l.maxZ-e,I=Math.min(p,_,M,v);I===p?(x=-1,y=0,g=p+i):I===_?(x=1,y=0,g=_+i):I===M?(x=0,y=-1,g=M+i):(x=0,y=1,g=v+i)}t+=x*g,e+=y*g,r.nx+=x*g,r.nz+=y*g,r.depth=Math.max(r.depth,g),r.hit=a=!0}else{let c=t-l.x,h=e-l.z,f=i+l.r,d=c*c+h*h;if(d>=f*f)return;let u=Math.sqrt(d)||1e-5,x=f-u,y=c/u,g=h/u;t+=y*x,e+=g*x,r.nx+=y*x,r.nz+=g*x,r.depth=Math.max(r.depth,x),r.hit=a=!0}}),!a)break}if(r.hit){let o=Math.hypot(r.nx,r.nz)||1;r.nx/=o,r.nz/=o}return r.x=t,r.z=e,r}raycast(t,e,i,n,r=1.5,o=1.5,a=!1){let l=i-t,c=n-e,h=Math.hypot(l,c),f=1,d=Math.max(1,Math.ceil(h/32));for(let u=0;u<d;u++){let x=u/d,y=(u+1)/d;if(x>f)break;let g=t+l*x,p=e+c*x,_=t+l*y,M=e+c*y;this.query(Math.min(g,_)-.5,Math.min(p,M)-.5,Math.max(g,_)+.5,Math.max(p,M)+.5,v=>{let I;if(v.t===0)I=ey(t,e,l,c,v);else{if(a&&v.r<1.5)return;I=iy(t,e,l,c,v.x,v.z,v.r)}I<f&&r+(o-r)*I<=v.h&&(f=I)})}return f}los(t,e,i,n,r=1.6,o=1.6){return this.raycast(t,e,i,n,r,o,!0)>=.999}groundHeight(t,e){let i;t>=Ft.x0&&t<=Ft.x1&&e>=Ft.z0&&e<=Ft.z1?i=t<Ft.x0+Ft.ramp?.02+(t-Ft.x0)/Ft.ramp*(Ft.y-.02):Ft.y:t>pt.minX&&t<pt.maxX&&e>pt.minZ&&e<pt.maxZ?i=Nu(this.city,t,e)?0:oe:t<this.docksX&&e<pt.minZ?i=Bs(t,e):i=Os(t,e);for(let n=0;n<this.ramps.length;n++){let r=this.ramps[n],o=t-r.x,a=e-r.z,l=o*r.c-a*r.s,c=o*r.s+a*r.c;if(Math.abs(l)<r.wid/2&&Math.abs(c)<r.len/2){let h=r.y0+r.height*((c+r.len/2)/r.len);h>i&&(i=h)}}return i}waterDepth(t,e){let i=this.groundHeight(t,e);return Ae-i}inBounds(t,e){return Fs(t,e)<260}};function ey(s,t,e,i,n){let r=0,o=1;if(Math.abs(e)<1e-9){if(s<n.minX||s>n.maxX)return 1/0}else{let a=(n.minX-s)/e,l=(n.maxX-s)/e;if(a>l){let c=a;a=l,l=c}if(a>r&&(r=a),l<o&&(o=l),r>o)return 1/0}if(Math.abs(i)<1e-9){if(t<n.minZ||t>n.maxZ)return 1/0}else{let a=(n.minZ-t)/i,l=(n.maxZ-t)/i;if(a>l){let c=a;a=l,l=c}if(a>r&&(r=a),l<o&&(o=l),r>o)return 1/0}return r}function iy(s,t,e,i,n,r,o){let a=s-n,l=t-r,c=e*e+i*i,h=2*(a*e+l*i),f=a*a+l*l-o*o;if(f<0)return 0;let d=h*h-4*c*f;if(d<0||c<1e-12)return 1/0;let u=(-h-Math.sqrt(d))/(2*c);return u>=0&&u<=1?u:1/0}var ny=1,Oc=class{constructor(t,e,i,n={}){this.id=ny++,this.kind=t,this.isPlayer=t==="player",this.x=e,this.z=i,this.y=m.physics?m.physics.groundHeight(e,i):0,this.vx=0,this.vy=0,this.vz=0,this.h=n.h??Q(0,Math.PI*2),this.radius=.32,this.maxHealth=n.health??100,this.health=this.maxHealth,this.armor=n.armor??0,this.alive=!0,this.state="normal",this.t=0,this.onGround=!0,this.inWater=!1,this.moveX=0,this.moveZ=0,this.moveSpeed=0,this.wantJump=!1,this.faceH=null,this.phase=Q(0,6),this.walkAmt=0,this.punchT=0,this.aimT=0,this.hitT=0,this.handsUp=0,this.spinX=0,this.spinZ=0,this.spinVX=0,this.spinVZ=0,this.scale=n.scale??Q(.92,1.08),this.colors={skin:new ct(n.skin??Me(tf)),hair:new ct(n.hair??Me(ef)),shirt:new ct(n.shirt??Me(nf)),pants:new ct(n.pants??Me(sf))},this.bald=n.bald??me(.08),this.weapon=n.weapon??"fist",this.fireT=0,this.reloadT=0,this.clip=0,this.vehicle=null,this.seatSide=1,this.ai=null,this.removed=!1,this.deadT=0,this.lastHitBy=null,this.money=n.money??Math.floor(Q(5,60)),this.persistent=!1,this.blip=null,this.hidden=!1}get speed(){return Math.hypot(this.vx,this.vz)}damage(t,e,i="gun"){if(this.alive&&!(this.godT>0)){if(this.lastHitBy=e||this.lastHitBy,this.armor>0&&i!=="fall"){let n=Math.min(this.armor,t*.7);this.armor-=n,t-=n}this.health-=t,this.hitT=.25,this.ai&&this.ai.onDamage&&this.ai.onDamage(e,t,i),this.isPlayer&&m.player.onDamaged(t,e,i),this.health<=0&&this.die(e,i)}}die(t,e){if(this.alive){if(this.alive=!1,this.health=0,this.vehicle&&this.exitVehicle(!0),this.state==="normal"||this.state==="swim"||this.state==="getup"){let i=0,n=0;if(t){let r=this.x-t.x,o=this.z-t.z,a=Math.hypot(r,o)||1;i=r/a*2,n=o/a*2}this.knock(this.vx+i,1.5,this.vz+n)}this.isPlayer?m.player.onDeath(t,e):(t&&t.isPlayer&&(m.stats.kills++,this.kind==="cop"?(m.stats.copsKilled++,m.police.crime("killcop",this.x,this.z)):m.police.crime("kill",this.x,this.z)),this.kind!=="cop"&&this.money>0&&me(.7)&&m.pickups.dropCash(this.x,this.z,this.money),m.missions.onHumanKilled(this,t))}}knock(t,e,i){if(this.vehicle)return;this.state="ragdoll",this.t=0,this.vx=t,this.vy=e,this.vz=i,this.onGround=!1;let n=Math.hypot(t,i),r=(t*Math.sin(this.h)+i*Math.cos(this.h))/(n||1);this.spinVX=(r>=0?-1:1)*Ct(n*.9,2,12),this.spinVZ=Q(-2,2)}enterVehicle(t,e=1){this.vehicle=t,this.seatSide=e,this.state="drive",e===1?t.driver=this:t.passenger=this,this.vx=this.vz=this.vy=0}exitVehicle(t=!1){let e=this.vehicle;if(!e)return;e.driver===this&&(e.driver=null),e.passenger===this&&(e.passenger=null);let i=e.doorPos(this.seatSide),n=i.x,r=i.z,o=m.physics.resolveCircle(n,r,this.radius,e.y);n=o.x,r=o.z,this.x=n,this.z=r,this.y=Math.max(e.y,m.physics.groundHeight(n,r)),this.h=e.h,this.vehicle=null,this.state=this.alive?"normal":"dead",this.alive||(this.state="ragdoll"),t&&e.speed>6&&this.alive&&this.knock(e.vx*.7,2,e.vz*.7),e.throttle=0,e.handbrake=!t}update(t){if(this.removed)return;if(this.godT>0&&(this.godT-=t),this.hitT=Math.max(0,this.hitT-t),this.punchT=Math.max(0,this.punchT-t),this.state==="drive"){let u=this.vehicle;if(!u){this.state="normal";return}let x=u.seatPos(this.seatSide);this.x=x.x,this.z=x.z,this.y=u.y,this.h=u.h;return}let e=m.physics;if(this.state==="ragdoll"){this.t+=t,this.vy-=20*t,this.x+=this.vx*t,this.z+=this.vz*t,this.y+=this.vy*t,this.spinX+=this.spinVX*t,this.spinZ+=this.spinVZ*t;let u=e.groundHeight(this.x,this.z);this.y<=u&&(this.y=u,this.vy<-6?this.vy=-this.vy*.25:this.vy=0,this.vx*=1-4*t,this.vz*=1-4*t,this.spinVX*=1-6*t,this.spinVZ*=1-6*t,this.t>1&&Math.hypot(this.vx,this.vz)<.6&&(this.fallFrom=this.spinX,this.fallTarget=Math.round((this.spinX+Math.PI/2)/Math.PI)*Math.PI-Math.PI/2,this.alive?(this.state="getup",this.t=0):(this.state="dead",this.t=0,this.deadT=0)));let x=e.resolveCircle(this.x,this.z,this.radius,this.y);if(x.hit){this.x=x.x,this.z=x.z;let g=this.vx*x.nx+this.vz*x.nz;g<0&&(this.vx-=1.4*g*x.nx,this.vz-=1.4*g*x.nz)}Ae-u>1.1&&this.y<Ae&&(this.y=Ae-1.2,this.vx*=.9,this.vz*=.9,this.alive?this.state="normal":this.state="dead");return}if(this.state==="dead"){this.deadT+=t;let u=e.groundHeight(this.x,this.z);Ae-u>1.1&&(this.y=Ae-.9-Math.min(2,this.deadT*.2));return}if(this.state==="getup"){this.t+=t,this.vx*=.8,this.vz*=.8,this.t>.75&&(this.state="normal",this.t=0);return}let i=e.groundHeight(this.x,this.z),n=Ae-i;this.inWater=n>1.1&&this.y<Ae-.6;let r=this.moveSpeed;this.inWater&&(r=Math.min(r,2.2));let o=this.moveX*r,a=this.moveZ*r,l=this.onGround||this.inWater?11:2.5,c=Math.min(1,l*t);this.vx+=(o-this.vx)*c,this.vz+=(a-this.vz)*c;let h=Math.hypot(this.vx,this.vz);if(this.faceH!==null&&this.faceH!==void 0?this.h=Ns(this.h,this.faceH,14*t):h>.3&&(this.h=Ns(this.h,Math.atan2(this.vx,this.vz),10*t)),this.wantJump&&this.onGround&&!this.inWater&&(this.vy=5.4,this.onGround=!1),this.wantJump=!1,this.x+=this.vx*t,this.z+=this.vz*t,this.inWater){this.vy=0,this.y=Se(this.y,Ae-1.25,ze(5,t)),this.onGround=!1;let u=e.groundHeight(this.x,this.z);Ae-u<1&&(this.y=Math.max(this.y,u),this.inWater=!1,this.onGround=!0)}else{this.vy-=18*t,this.y+=this.vy*t;let u=e.groundHeight(this.x,this.z);this.onGround&&u<this.y&&u>this.y-.5&&this.vy<=0?(this.y=u,this.vy=0):this.y<=u?(this.vy<-14&&this.damage((-this.vy-14)*8,null,"fall"),this.y=u,this.vy=0,this.onGround=!0):this.y>u+.05&&(this.onGround=!1),Ae-u>1.1&&this.y<Ae-.5&&(this.inWater=!0,m.fx.splash(this.x,Ae,this.z,1))}let f=e.resolveCircle(this.x,this.z,this.radius,this.y);if(f.hit){this.x=f.x,this.z=f.z;let u=this.vx*f.nx+this.vz*f.nz;u<0&&(this.vx-=u*f.nx,this.vz-=u*f.nz),this.blocked=(this.blocked||0)+t}else this.blocked=0;let d=Math.hypot(this.vx,this.vz);this.walkAmt=Se(this.walkAmt,Math.min(1,d/2),ze(8,t)),this.phase+=t*(d<.2?0:2.2+d*1.05),this.running=d>4}};function mf(){let s=m.humans;for(let t=0;t<s.length;t++){let e=s[t];if(!(e.removed||e.vehicle||e.state==="dead"))for(let i=t+1;i<s.length;i++){let n=s[i];if(n.removed||n.vehicle||n.state==="dead")continue;let r=e.x-n.x,o=e.z-n.z,a=e.radius+n.radius,l=r*r+o*o;if(l>=a*a||Math.abs(e.y-n.y)>1.5)continue;let c=Math.sqrt(l)||.01,h=(a-c)*.5,f=r/c,d=o/c;e.x+=f*h,e.z+=d*h,n.x-=f*h,n.z-=d*h}}}var Un=140,xr=new Tt,si=new Tt,sy=new Tt,ry=new Tt,Ho=new Tt,hf=new We,uf=new ui,ff=new D,df=new D,oy=new ct(1,1,1),pf={smg:!0,shotgun:!0,rifle:!0};function gn(s,t,e,i="XYZ"){return uf.set(s,t,e,i),Ho.makeRotationFromEuler(uf)}var Vo=class{constructor(t){let e=Qu();this.mat=dn();let i=(n,r)=>{let o=new fi(n,this.mat,r);return o.count=0,o.castShadow=!0,o.frustumCulled=!1,o.instanceMatrix.setUsage(di),o.setColorAt(0,new ct(1,1,1)),t.add(o),o};this.pelvis=i(e.pelvis,Un),this.torso=i(e.torso,Un),this.head=i(e.head,Un),this.hair=i(e.hair,Un),this.arm=i(e.arm,Un*2),this.leg=i(e.leg,Un*2),this.gun=i(e.gun,Un)}update(t,e){let i=0,n=0,r=0,o=0;for(let a of t){if(a.removed||a.hidden)continue;let l=a.x-e.x,c=a.z-e.z,h=l*l+c*c;if(h>170*170||a.vehicle&&h>50*50)continue;if(i>=Un)break;this.pose(a);let f=a.scale;xr.copy(this.root),si.copy(xr).multiply(this.pelvisLocal),this.pelvis.setMatrixAt(i,si),this.pelvis.setColorAt(i,a.colors.pants);let d=sy.copy(xr).multiply(this.torsoLocal);this.torso.setMatrixAt(i,d),this.torso.setColorAt(i,a.colors.shirt),si.copy(d).multiply(this.headLocal),this.head.setMatrixAt(i,si),this.head.setColorAt(i,a.colors.skin),!a.bald||a.kind==="cop"?(this.hair.setMatrixAt(i,si),this.hair.setColorAt(i,a.colors.hair)):(Ho.makeScale(0,0,0),this.hair.setMatrixAt(i,Ho)),si.copy(d).multiply(this.armL),this.arm.setMatrixAt(n,si),this.arm.setColorAt(n++,a.colors.skin);let u=ry.copy(d).multiply(this.armR);if(this.arm.setMatrixAt(n,u),this.arm.setColorAt(n++,a.colors.skin),si.copy(xr).multiply(this.legL),this.leg.setMatrixAt(r,si),this.leg.setColorAt(r++,a.colors.pants),si.copy(xr).multiply(this.legR),this.leg.setMatrixAt(r,si),this.leg.setColorAt(r++,a.colors.pants),a.weapon&&a.weapon!=="fist"&&a.state!=="drive"&&a.alive&&a.state==="normal"){let x=pf[a.weapon];si.copy(u).multiply(Ho.makeTranslation(0,-.66,.02)),si.multiply(gn(Math.PI/2,0,0)),x&&si.multiply(cy(1.3,1.1,1.9)),this.gun.setMatrixAt(o,si),this.gun.setColorAt(o++,oy)}i++}for(let a of[this.pelvis,this.torso,this.head,this.hair])a.count=i,a.instanceMatrix.needsUpdate=!0,a.instanceColor.needsUpdate=!0;this.arm.count=n,this.arm.instanceMatrix.needsUpdate=!0,this.arm.instanceColor.needsUpdate=!0,this.leg.count=r,this.leg.instanceMatrix.needsUpdate=!0,this.leg.instanceColor.needsUpdate=!0,this.gun.count=o,this.gun.instanceMatrix.needsUpdate=!0,this.gun.instanceColor.needsUpdate=!0}pose(t){this.root=this.root||new Tt,this.pelvisLocal=this.pelvisLocal||new Tt,this.torsoLocal=this.torsoLocal||new Tt,this.headLocal=this.headLocal||new Tt,this.armL=this.armL||new Tt,this.armR=this.armR||new Tt,this.legL=this.legL||new Tt,this.legR=this.legR||new Tt;let e=t.scale,i=.95,n=0,r=0,o=0,a=0,l=0,c=.08,h=-.08,f=null,d=0,u=0,x=Math.sin(t.phase),y=t.state;if(y==="drive")i=.5,r=o=-1.45,a=l=-1.15,c=.2,h=-.2,d=t.vehicle?t.vehicle.T.clear-.05:0;else if(y==="ragdoll"||y==="dead"||y==="getup"){let g,p=t.fallTarget??-Math.PI/2,_=t.fallFrom??p;if(y==="dead")g=Se(_,p,Math.min(1,t.deadT*5));else if(y==="getup"){let M=Ct(t.t/.75,0,1);g=Se(_,p,Math.min(1,t.t*6))*(1-M*M)}else g=t.spinX;f=gn(g,0,y==="ragdoll"?t.spinZ*.3:0).clone(),d=y==="ragdoll"?.5:.12*(y==="dead"?1:1-t.t/.75),i=.95,a=-.4,l=.3,c=1.1,h=-1,r=.25,o=-.2,y==="ragdoll"&&(a=Math.sin(t.t*13)*1.2,l=Math.cos(t.t*11)*1.2,r=Math.sin(t.t*9)*.6,o=-r)}else if(t.inWater)f=gn(1.25,0,0).clone(),d=.95,a=Math.sin(t.phase*.8)*2.5,l=Math.sin(t.phase*.8+Math.PI)*2.5,r=x*.4,o=-x*.4;else{let g=t.walkAmt,p=t.running?1:0,_=.55+p*.35;if(r=x*_*g,o=-x*_*g,a=-x*(.45+p*.45)*g,l=x*(.45+p*.45)*g,n=g*(.06+p*.16),i=.95+Math.abs(Math.cos(t.phase))*.04*g,!t.onGround&&!t.inWater&&(r=-.6,o=.3,a=-2.4,l=-2.4,c=.5,h=-.5),t.handsUp>0)a=l=-Math.PI*.95*t.handsUp,c=.15,h=-.15;else if(t.punchT>0){let M=Math.sin((1-t.punchT/.35)*Math.PI);l=-Math.PI/2*M-.2,h=-.15,n+=.1*M}else t.aimT>0&&t.weapon!=="fist"&&(l=-Math.PI/2+.05,h=.12,pf[t.weapon]&&(a=-1.35,c=-.55));t.hitT>0&&(n-=t.hitT*.8),t.cower&&(a=l=-2.6,c=.6,h=-.6,n=.4,i=.7,r=-.8,o=-.8)}ff.set(t.x,t.y+d,t.z),hf.setFromAxisAngle(ay,t.h),df.set(e,e,e),this.root.compose(ff,hf,df),f&&this.root.multiply(f),this.pelvisLocal.makeTranslation(0,i,0),this.torsoLocal.makeTranslation(0,i+.1,0).multiply(gn(n,0,0)),this.headLocal.makeTranslation(0,.56,0).multiply(gn(0,u,0)),this.armL.makeTranslation(.29,.5,0).multiply(gn(a,0,c)),this.armR.makeTranslation(-.29,.5,0).multiply(gn(l,0,h)),this.legL.makeTranslation(.1,i,0).multiply(gn(r,0,0)),this.legR.makeTranslation(-.1,i,0).multiply(gn(o,0,0))}},ay=new D(0,1,0),ly=new Tt;function cy(s,t,e){return ly.makeScale(s,t,e)}function ri(s,t,e,i){let n=new Oc(s,t,e,i);return m.humans.push(n),n}var Go=class{constructor(){this.stick={x:0,y:0,active:!1},this.lookDX=0,this.lookDY=0,this.down=Object.create(null),this.pressedSet=Object.create(null),this.keys=Object.create(null),this.stickId=null,this.lookId=null,this.lookLast=null,this.stickOrigin=null,this.stickR=58,this.enabled=!0,this.lastTouch=0}bind(){let t=document.getElementById("stickzone"),e=document.getElementById("stick"),i=document.getElementById("knob"),n=document.getElementById("lookzone");this.stickEl=e,this.knob=i,t.addEventListener("pointerdown",a=>{if(this.stickId!==null)return;this.stickId=a.pointerId,t.setPointerCapture(a.pointerId);let l=t.getBoundingClientRect(),c=Ct(a.clientX,l.left+70,l.right-20),h=Ct(a.clientY,l.top+40,l.bottom-70);this.stickOrigin={x:c,y:h},e.style.left=c-l.left+"px",e.style.top=h-l.top+"px",e.classList.add("active"),this.updateStick(a.clientX,a.clientY),a.preventDefault()});let r=a=>{a.pointerId===this.stickId&&(this.stickId=null,this.stick.x=this.stick.y=0,this.stick.active=!1,i.style.transform="",e.classList.remove("active"))};t.addEventListener("pointermove",a=>{a.pointerId===this.stickId&&this.updateStick(a.clientX,a.clientY)}),t.addEventListener("pointerup",r),t.addEventListener("pointercancel",r),n.addEventListener("pointerdown",a=>{this.lookId===null&&(this.lookId=a.pointerId,n.setPointerCapture(a.pointerId),this.lookLast={x:a.clientX,y:a.clientY},this.lookStart={x:a.clientX,y:a.clientY,t:performance.now()},a.preventDefault())}),n.addEventListener("pointermove",a=>{a.pointerId===this.lookId&&(this.lookDX+=a.clientX-this.lookLast.x,this.lookDY+=a.clientY-this.lookLast.y,this.lookLast={x:a.clientX,y:a.clientY})});let o=a=>{a.pointerId===this.lookId&&(this.lookId=null)};n.addEventListener("pointerup",o),n.addEventListener("pointercancel",o);for(let a of document.querySelectorAll("[data-btn]")){let l=a.dataset.btn,c=f=>{f.preventDefault(),f.stopPropagation();try{a.setPointerCapture(f.pointerId)}catch{}this.down[l]=(this.down[l]||0)+1,this.pressedSet[l]=!0,a.classList.add("down"),a._pid=a._pid||new Set,a._pid.add(f.pointerId),this.onButton&&this.onButton(l)},h=f=>{!a._pid||!a._pid.has(f.pointerId)||(a._pid.delete(f.pointerId),this.down[l]=Math.max(0,(this.down[l]||1)-1),a._pid.size||a.classList.remove("down"))};a.addEventListener("pointerdown",c),a.addEventListener("pointerup",h),a.addEventListener("pointercancel",h),a.addEventListener("lostpointercapture",h)}window.addEventListener("keydown",a=>{if(a.repeat)return;this.keys[a.code]=!0;let l=gf[a.code];l&&(this.down[l]=(this.down[l]||0)+1,this.pressedSet[l]=!0,this.onButton&&this.onButton(l))}),window.addEventListener("keyup",a=>{this.keys[a.code]=!1;let l=gf[a.code];l&&(this.down[l]=0)}),window.addEventListener("blur",()=>{this.keys=Object.create(null),this.down=Object.create(null)}),document.addEventListener("contextmenu",a=>a.preventDefault())}updateStick(t,e){let i=this.stickOrigin,n=t-i.x,r=e-i.y,o=Math.hypot(n,r),a=this.stickR;o>a&&(n=n/o*a,r=r/o*a),this.knob.style.transform=`translate(${n}px, ${r}px)`;let l=n/a,c=r/a;Math.hypot(l,c)<.12&&(l=0,c=0),this.stick.x=l,this.stick.y=c,this.stick.active=!0}move(){let t=this.stick.x,e=this.stick.y,i=this.keys;(i.KeyA||i.ArrowLeft)&&(t-=1),(i.KeyD||i.ArrowRight)&&(t+=1),(i.KeyW||i.ArrowUp)&&(e-=1),(i.KeyS||i.ArrowDown)&&(e+=1);let n=Math.hypot(t,e);return n>1&&(t/=n,e/=n),{x:t,y:e,mag:Math.min(1,n)}}isDown(t){return(this.down[t]||0)>0}pressed(t){return this.pressedSet[t]?(this.pressedSet[t]=!1,!0):!1}consumeLook(){let t={dx:this.lookDX,dy:this.lookDY};return this.lookDX=0,this.lookDY=0,t}clearPresses(){for(let t in this.pressedSet)this.pressedSet[t]=!1}resetAll(){this.down=Object.create(null),this.pressedSet=Object.create(null),this.stick.x=this.stick.y=0,this.stickId=null,this.lookId=null;for(let t of document.querySelectorAll("[data-btn].down"))t.classList.remove("down");this.knob&&(this.knob.style.transform="")}},gf={Space:"jump",ShiftLeft:"sprint",ShiftRight:"sprint",KeyF:"enter",Enter:"enter",ControlLeft:"fire",KeyJ:"fire",KeyQ:"weapon",KeyM:"map",Escape:"pause",KeyP:"pause",KeyH:"horn",KeyR:"radio",KeyK:"handbrake"};var Wo=class{constructor(t){this.cam=t,this.yaw=0,this.pitch=.22,this.dist=5.5,this.curDist=5.5,this.target=new D,this.smoothTarget=new D,this.shakeAmt=0,this.lastLook=-10,this.fov=62,this.mode="title",this.titleT=0,this._v=new D,this.first=!0}shake(t){this.shakeAmt=Math.min(1,this.shakeAmt+t)}distTo(t,e){return Math.hypot(t-this.cam.position.x,e-this.cam.position.z)}forward(){return{x:Math.sin(this.yaw),z:Math.cos(this.yaw)}}snapBehind(t){this.yaw=t,this.first=!0}update(t,e){let i=e.consumeLook(),n=m.settings.sensitivity;this.mode!=="title"&&(i.dx||i.dy)&&(this.yaw-=i.dx*.0052*n,this.pitch=Ct(this.pitch+i.dy*.0038*n,-.25,1.25),this.lastLook=m.time);let r=m.player,o,a,l,c,h=62;if(this.mode==="title"){this.titleT+=t;let v=this.titleT*.035,I=m.titleFocus||{x:300,z:0};o=I.x+Math.sin(v)*40,a=30,l=I.z+Math.cos(v)*40,this.yaw=v+Math.PI*.85,this.pitch=.18,c=160,h=55}else if(r&&r.human.vehicle){let v=r.human.vehicle;o=v.x,a=v.y+1.3+v.T.hgt*.35,l=v.z,c=4.2+v.T.len*.95;let I=v.speed;if(m.time-this.lastLook>1.3&&I>2.5){let T=v.h;v.vx*Math.sin(v.h)+v.vz*Math.cos(v.h)<-3?T=v.h:I>6&&(T=Math.atan2(v.vx,v.vz));let P=1.2+Math.min(3.5,I*.12);this.yaw=Ns(this.yaw,T,P*t*(1+Math.abs(ii(T-this.yaw)))),this.pitch=Se(this.pitch,.2,ze(1.5,t))}h=62+Ct(I*.32,0,18)}else if(r){let v=r.human;o=v.x,a=v.y+1.55,l=v.z,(v.state==="dead"||v.state==="ragdoll")&&(a=v.y+1),c=r.aiming?3.9:5.2,v.inWater&&(a=v.y+1.8);let I=v.speed;if(m.time-this.lastLook>2&&I>3&&!r.aiming){let T=Math.atan2(v.vx,v.vz);Math.abs(ii(T-this.yaw))<2.2&&(this.yaw=Ns(this.yaw,T,.6*t))}this.mode==="dead"&&(this.yaw+=t*.25,this.pitch=Se(this.pitch,.9,ze(1,t)),c=9)}else return;this.target.set(o,a,l),this.first&&(this.smoothTarget.copy(this.target),this.first=!1,this.curDist=c),this.smoothTarget.lerp(this.target,this.mode==="title"?1:ze(18,t));let f=Math.cos(this.pitch),d=Math.sin(this.pitch),u=-Math.sin(this.yaw)*f,x=-Math.cos(this.yaw)*f,y=d,g=c;if(this.mode!=="title"){let v=this.smoothTarget.x+u*(c+.4),I=this.smoothTarget.z+x*(c+.4),T=this.smoothTarget.y+y*(c+.4),E=m.physics.raycast(this.smoothTarget.x,this.smoothTarget.z,v,I,this.smoothTarget.y,T,!0);E<1&&(g=Math.max(.9,(c+.4)*E-.45))}g<this.curDist?this.curDist=g:this.curDist=Se(this.curDist,g,ze(2.5,t)),this.dist=this.curDist;let p=this.smoothTarget.x+u*this.dist,_=this.smoothTarget.y+y*this.dist,M=this.smoothTarget.z+x*this.dist;if(this.mode!=="title"){let v=m.physics.groundHeight(p,M);_=Math.max(_,Math.max(v,Ae)+.4)}if(this.shakeAmt>.001){let v=this.shakeAmt*.35;p+=Q(-v,v),_+=Q(-v,v),M+=Q(-v,v),this.shakeAmt*=Math.exp(-5*t)}this.cam.position.set(p,_,M),this._v.copy(this.smoothTarget),this.mode!=="title"&&(this._v.y+=.15),this.cam.lookAt(this._v),this.fov=Se(this.fov,h,ze(3,t)),Math.abs(this.cam.fov-this.fov)>.05&&(this.cam.fov=this.fov,this.cam.updateProjectionMatrix())}project(t,e,i){let n=this._v.set(t,e,i).project(this.cam);return n.z>1||n.z<-1?null:{x:(n.x*.5+.5)*window.innerWidth,y:(-n.y*.5+.5)*window.innerHeight}}};var Xo=class{constructor(t,e,i){this.max=e,this.n=0,this.pos=new Float32Array(e*3),this.vel=new Float32Array(e*3),this.col=new Float32Array(e*3),this.alpha=new Float32Array(e),this.size=new Float32Array(e),this.life=new Float32Array(e),this.maxLife=new Float32Array(e),this.s0=new Float32Array(e),this.s1=new Float32Array(e),this.a0=new Float32Array(e),this.grav=new Float32Array(e),this.drag=new Float32Array(e);let n=new xe;this.gPos=new ne(new Float32Array(e*3),3).setUsage(di),this.gCol=new ne(new Float32Array(e*3),3).setUsage(di),this.gA=new ne(new Float32Array(e),1).setUsage(di),this.gS=new ne(new Float32Array(e),1).setUsage(di),n.setAttribute("position",this.gPos),n.setAttribute("color",this.gCol),n.setAttribute("alpha",this.gA),n.setAttribute("size",this.gS);let r=new Pe({uniforms:{uScale:{value:600}},vertexShader:`
        attribute vec3 color;
        attribute float alpha;
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uScale;
        void main() {
          vColor = color; vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(size * uScale / -mv.z, 1.0, 300.0);
          gl_Position = projectionMatrix * mv;
        }`,fragmentShader:i?`
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.0, r);
          gl_FragColor = vec4(vColor * a * a * vAlpha, 1.0);
        }`:`
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.2, r);
          gl_FragColor = vec4(vColor, a * vAlpha);
        }`,transparent:!0,depthWrite:!1,blending:i?ei:An});this.points=new In(n,r),this.points.frustumCulled=!1,this.points.renderOrder=i?3:2,t.add(this.points)}emit(t,e,i,n,r,o,a,l,c,h,f,d,u,x=0,y=0){let g=this.n;g>=this.max?g=Math.floor(Math.random()*this.max):this.n++,this.pos[g*3]=t,this.pos[g*3+1]=e,this.pos[g*3+2]=i,this.vel[g*3]=n,this.vel[g*3+1]=r,this.vel[g*3+2]=o,this.col[g*3]=h,this.col[g*3+1]=f,this.col[g*3+2]=d,this.life[g]=a,this.maxLife[g]=a,this.s0[g]=l,this.s1[g]=c,this.a0[g]=u,this.grav[g]=x,this.drag[g]=y}update(t){let e=0;for(;e<this.n;){if(this.life[e]-=t,this.life[e]<=0){let c=--this.n;e!==c&&this.copy(c,e);continue}let l=1-this.drag[e]*t;this.vel[e*3]*=l,this.vel[e*3+2]*=l,this.vel[e*3+1]=this.vel[e*3+1]*l-this.grav[e]*t,this.pos[e*3]+=this.vel[e*3]*t,this.pos[e*3+1]+=this.vel[e*3+1]*t,this.pos[e*3+2]+=this.vel[e*3+2]*t,e++}let i=this.gPos.array,n=this.gCol.array,r=this.gA.array,o=this.gS.array;for(let l=0;l<this.n;l++){let c=1-this.life[l]/this.maxLife[l];i[l*3]=this.pos[l*3],i[l*3+1]=this.pos[l*3+1],i[l*3+2]=this.pos[l*3+2],n[l*3]=this.col[l*3],n[l*3+1]=this.col[l*3+1],n[l*3+2]=this.col[l*3+2],r[l]=this.a0[l]*(1-c)*Math.min(1,c*8+.3),o[l]=this.s0[l]+(this.s1[l]-this.s0[l])*c}this.points.geometry.setDrawRange(0,this.n),this.gPos.needsUpdate=!0,this.gCol.needsUpdate=!0,this.gA.needsUpdate=!0,this.gS.needsUpdate=!0}copy(t,e){for(let i=0;i<3;i++)this.pos[e*3+i]=this.pos[t*3+i],this.vel[e*3+i]=this.vel[t*3+i],this.col[e*3+i]=this.col[t*3+i];this.life[e]=this.life[t],this.maxLife[e]=this.maxLife[t],this.s0[e]=this.s0[t],this.s1[e]=this.s1[t],this.a0[e]=this.a0[t],this.grav[e]=this.grav[t],this.drag[e]=this.drag[t]}},qo=class{constructor(t){this.add=new Xo(t,1400,!0),this.alpha=new Xo(t,1400,!1),this.maxT=96;let e=new xe;this.tPos=new Float32Array(this.maxT*6),this.tCol=new Float32Array(this.maxT*6),this.tLife=new Float32Array(this.maxT),this.tData=new Float32Array(this.maxT*6),e.setAttribute("position",new ne(this.tPos,3).setUsage(di)),e.setAttribute("color",new ne(this.tCol,3).setUsage(di)),this.tracers=new yo(e,new cr({vertexColors:!0,transparent:!0,blending:ei,depthWrite:!1})),this.tracers.frustumCulled=!1,t.add(this.tracers),this.tIdx=0}setScale(t){this.add.points.material.uniforms.uScale.value=t,this.alpha.points.material.uniforms.uScale.value=t}update(t){this.add.update(t),this.alpha.update(t);for(let e=0;e<this.maxT;e++)if(this.tLife[e]>0){this.tLife[e]-=t;let i=Math.max(0,this.tLife[e]/.09);for(let n=0;n<2;n++)this.tCol[e*6+n*3]=1*i,this.tCol[e*6+n*3+1]=.85*i*(n?1:.6),this.tCol[e*6+n*3+2]=.5*i*(n?1:.3)}this.tracers.geometry.attributes.position.needsUpdate=!0,this.tracers.geometry.attributes.color.needsUpdate=!0}tracer(t,e,i,n,r,o){let a=this.tIdx;this.tIdx=(this.tIdx+1)%this.maxT,this.tPos.set([t,e,i,n,r,o],a*6),this.tLife[a]=.09}muzzle(t,e,i,n,r){this.add.emit(t,e,i,n*2,0,r*2,.06,.9,.3,1,.8,.35,1);for(let o=0;o<3;o++)this.add.emit(t,e,i,n*Q(4,10)+Q(-1,1),Q(-1,1),r*Q(4,10)+Q(-1,1),.07,.35,.1,1,.7,.3,1)}sparks(t,e,i,n=8){for(let r=0;r<n;r++)this.add.emit(t,e,i,Q(-5,5),Q(1,6),Q(-5,5),Q(.2,.45),.18,.05,1,.75,.3,1,14,1)}dust(t,e,i,n=4){for(let r=0;r<n;r++)this.alpha.emit(t,e,i,Q(-1,1),Q(.5,2),Q(-1,1),Q(.4,.7),.3,1.2,.65,.6,.55,.6,0,2)}blood(t,e,i,n=6){for(let r=0;r<n;r++)this.alpha.emit(t,e,i,Q(-1.5,1.5),Q(.5,3),Q(-1.5,1.5),Q(.3,.5),.18,.3,.5,.02,.04,.9,9,1)}smoke(t,e,i,n=.4){let r=n;this.alpha.emit(t+Q(-.3,.3),e,i+Q(-.3,.3),Q(-.4,.4),Q(1.5,2.8),Q(-.4,.4),Q(1.4,2.2),.7,3.2,r,r,r*1.05,.5,-.3,.6)}tireSmoke(t,e,i){this.alpha.emit(t,e,i,Q(-.5,.5),Q(.4,1),Q(-.5,.5),Q(.8,1.3),.6,2.6,.85,.85,.85,.35,0,1)}fire(t,e,i){this.add.emit(t+Q(-.4,.4),e,i+Q(-.4,.4),Q(-.3,.3),Q(1.5,3.5),Q(-.3,.3),Q(.35,.6),1.1,.3,1,Q(.35,.6),.1,1),Math.random()<.4&&this.smoke(t,e+1,i,.12)}splash(t,e,i,n=1){for(let r=0;r<10*n;r++)this.alpha.emit(t+Q(-n,n),e+.1,i+Q(-n,n),Q(-2,2),Q(2,5)*n,Q(-2,2),Q(.5,.9),.4,.9,.9,.95,1,.8,12,.5)}pickupSparkle(t,e,i,n,r,o){for(let a=0;a<14;a++)this.add.emit(t,e,i,Q(-3,3),Q(1,5),Q(-3,3),Q(.4,.7),.4,.1,n,r,o,1,6,2)}explosion(t,e,i,n=1){for(let o=0;o<40*n;o++){let a=Math.random()*Math.PI*2,l=Q(3,13)*n;this.add.emit(t,e+Q(0,1),i,Math.cos(a)*l,Q(1,9)*n,Math.sin(a)*l,Q(.4,.9),Q(2.5,4)*n,.6,1,Q(.35,.7),.08,1,2,3)}this.add.emit(t,e+1,i,0,0,0,.25,14*n,22*n,1,.8,.4,1);for(let o=0;o<30*n;o++){let a=Math.random()*Math.PI*2,l=Q(1,6)*n;this.alpha.emit(t,e+Q(0,2),i,Math.cos(a)*l,Q(1,5),Math.sin(a)*l,Q(1.8,3.2),2,7*n,.13,.12,.12,.75,-.5,1.2)}this.sparks(t,e+1,i,30);let r=m.cam.distTo(t,i);m.cam.shake(Math.max(0,.9-r*.015)),m.audio.explosion(t,i)}};var Ye={fist:{name:"Fists",melee:!0,dmg:14,range:1.8,rate:.42,price:0},pistol:{name:"Pistol",dmg:26,range:55,rate:.24,clip:12,spread:.025,auto:!1,reload:1.1,price:300,ammoPack:48,ammoPrice:60},smg:{name:"SMG",dmg:15,range:45,rate:.085,clip:32,spread:.06,auto:!0,reload:1.5,price:1e3,ammoPack:128,ammoPrice:120},shotgun:{name:"Shotgun",dmg:15,pellets:8,range:24,rate:.85,clip:6,spread:.12,auto:!1,reload:1.9,price:1400,ammoPack:24,ammoPrice:100},rifle:{name:"Rifle",dmg:34,range:85,rate:.12,clip:30,spread:.022,auto:!0,reload:1.8,price:3e3,ammoPack:120,ammoPrice:200}},yr=["fist","pistol","smg","shotgun","rifle"],Yo=class{constructor(){}muzzleOf(t){let e=Math.sin(t.h),i=Math.cos(t.h),n=-i,r=e,o=t.vehicle?t.y+1.3:t.y+1.38*t.scale;return{x:t.x+e*.55+n*.22,y:o,z:t.z+i*.55+r*.22,fx:e,fz:i}}fire(t,e={}){let i=Ye[t.weapon]||Ye.fist;if(t.fireT>0||t.reloadT>0)return!1;if(i.melee)return this.punch(t,e.target);let n=t.isPlayer;if(n){let a=m.player.inv;if(a[t.weapon]<=0)return m.audio.click(),t.fireT=.3,!1;if(t.clip<=0)return t.reloadT=i.reload,m.audio.reload(),!1;a[t.weapon]--,t.clip--,t.clip<=0&&a[t.weapon]>0&&(t.reloadT=i.reload,setTimeout(()=>m.audio.reload(),150))}t.fireT=i.rate*(n?1:Q(1.6,2.6)),t.aimT=1.2;let r=this.muzzleOf(t);m.fx.muzzle(r.x,r.y,r.z,r.fx,r.fz),m.audio.gun(t.weapon,r.x,r.z),n&&(Xe(i.auto?12:22),m.police.crime("shoot",t.x,t.z)),m.peds.panic(t.x,t.z,45,t);let o=i.pellets||1;for(let a=0;a<o;a++)e.hitChance!==void 0&&e.target?this.npcShot(t,e.target,i,r,e.hitChance):this.rayShot(t,i,r,e);return!0}rayShot(t,e,i,n){let r,o,a,l=n.target;if(l&&l.heli&&(l={x:l.heli.x,y:l.heli.y-2,z:l.heli.z,T:{hgt:2}}),l){let S=l.T?l.y+l.T.hgt*.5:l.state==="dead"||l.state==="ragdoll"?l.y+.3:l.y+1.25*l.scale;r=l.x-i.x,o=S-i.y,a=l.z-i.z}else{let S=n.dir;r=S.x,o=S.y,a=S.z}let c=Math.hypot(r,o,a)||1;r/=c,o/=c,a/=c;let h=e.spread*(n.moving?1.6:1);r+=Q(-h,h),o+=Q(-h,h)*.6,a+=Q(-h,h);let f=Math.hypot(r,o,a);r/=f,o/=f,a/=f;let u=e.range,x=null,y=null;for(let S of m.humans){if(S===t||S.removed||S.state==="dead"||S.vehicle)continue;let w=S.x-i.x,z=S.z-i.z,k=w*r+z*a,U=Math.hypot(r,a)||1,H=k/(U*U);if(H<0)continue;let Y=H*1,W=i.x+r*Y,ot=i.z+a*Y,$=(W-S.x)**2+(ot-S.z)**2,ut=S.state==="ragdoll"?.6:.42;if($>ut*ut)continue;let gt=i.y+o*Y,Rt=S.state==="ragdoll"?S.y+.9:S.y+1.85*S.scale;gt<S.y-.1||gt>Rt||Y<u&&(u=Y,x=S,y=null)}for(let S of m.vehicles){if(S.removed||t.vehicle===S)continue;let w=hy(i.x,i.y,i.z,r,o,a,S,u);w<u&&(u=w,y=S,x=null)}let g=null,p=m.police&&m.police.heli;if(p){let S=p.rayHit(i.x,i.y,i.z,r,o,a);S<u&&(u=S,g=p,x=null,y=null)}let _=i.x+r*u,M=i.y+o*u,v=i.z+a*u,I=m.physics.raycast(i.x,i.z,_,v,i.y,M),T=_,E=M,P=v;if(I<1)x=null,y=null,g=null,T=i.x+(_-i.x)*I,E=i.y+(M-i.y)*I,P=i.z+(v-i.z)*I,m.fx.dust(T,E,P,3),m.fx.sparks(T,E,P,3);else{let S=m.physics.groundHeight(T,P);!x&&!y&&E<S+.05&&m.fx.dust(T,S+.1,P,2)}if(m.fx.tracer(i.x,i.y,i.z,T,E,P),g&&(m.fx.sparks(T,E,P,6),g.damage(e.dmg,t),t.isPlayer&&m.hud.hitMarker(!1)),x){let S=E>x.y+1.55*x.scale&&x.state==="normal",w=e.dmg*(S?2.2:1)*(e.pellets?Ct(1.3-u/e.range,.35,1.2):1);m.fx.blood(T,E,P,S?10:5),x.damage(w,t,"gun"),e.pellets&&u<8&&x.state==="normal"&&x.knock(r*5,2,a*5),t.isPlayer&&m.hud.hitMarker(!x.alive)}else y&&(m.fx.sparks(T,E,P,5),y.damage(e.dmg*.9,t),y.driver&&!y.driver.isPlayer&&me(.25)&&y.driver.damage(e.dmg*.6,t,"gun"),y.ai&&y.ai.onShot&&y.ai.onShot(t),t.isPlayer&&(m.hud.hitMarker(!1),y.isPolice&&m.police.crime("shootcop",y.x,y.z)))}npcShot(t,e,i,n,r){let o=e.vehicle,a=o?o.y+1:e.y+1.2,l=o?o.x:e.x,c=o?o.z:e.z,h=m.physics.raycast(n.x,n.z,l,c,n.y,a,!0)>=.999,f=h&&me(r),d=l,u=a,x=c;if(!f){if(d+=Q(-2.2,2.2),u+=Q(-.6,1.4),x+=Q(-2.2,2.2),!h){let y=m.physics.raycast(n.x,n.z,d,x,n.y,u,!0);d=n.x+(d-n.x)*y,u=n.y+(u-n.y)*y,x=n.z+(x-n.z)*y}m.fx.dust(d,Math.max(u,.1),x,1),e.isPlayer&&Math.hypot(d-e.x,x-e.z)<3&&m.audio.whiz()}m.fx.tracer(n.x,n.y,n.z,d,u,x),f&&(o?(o.damage(i.dmg*(o.driver&&o.driver.isPlayer?.45:.8),t),m.fx.sparks(d,u,x,4),me(.35)&&e.damage(i.dmg*.35,t,"gun")):(e.damage(i.dmg*(e.isPlayer?.55:1),t,"gun"),m.fx.blood(d,u,x,4)))}punch(t,e){t.fireT=Ye.fist.rate,t.punchT=.35,m.audio.swing();let i=null,n=1e9,r=Math.sin(t.h),o=Math.cos(t.h),a=e?[e]:m.humans;for(let l of a){if(l===t||l.removed||l.vehicle||l.state==="dead")continue;let c=l.x-t.x,h=l.z-t.z,f=Math.hypot(c,h);f>Ye.fist.range+.3||Math.abs(l.y-t.y)>1.2||(c*r+h*o)/(f||1)<.35||f<n&&(n=f,i=l)}if(i){let l=i;setTimeout(()=>{if(l.removed||!l.alive)return;m.audio.punch();let c=Ye.fist.dmg*(t.isPlayer?1:.6)*Q(.85,1.2);l.damage(c,t,"melee"),l.alive&&(l.health<35||me(.25))&&l.state==="normal"?l.knock(r*4,2.5,o*4):l.alive?(l.vx+=r*2.5,l.vz+=o*2.5):l.knock(r*4,2,o*4),t.isPlayer&&(Xe(25),m.police.crime(l.kind==="cop"?"punchcop":"punch",l.x,l.z),m.hud.hitMarker(!l.alive)),l.isPlayer&&m.cam.shake(.15)},120)}return!0}blast(t,e,i,n,r,o,a){for(let l of m.humans){if(l.removed||a&&l.isPlayer&&l.state==="ragdoll"&&l.t<.05)continue;let c=Math.hypot(l.x-t,l.z-i,l.y+1-e);if(c>n)continue;let h=1-c/n;if(l.vehicle)continue;let f=(l.x-t)/(c||1),d=(l.z-i)/(c||1);l.knock(f*12*h,4+6*h,d*12*h),l.damage(r*h,o,"explosion")}for(let l of m.vehicles){if(l.removed||l===a)continue;let c=Math.hypot(l.x-t,l.z-i);if(c>n+1)continue;let h=1-Math.min(1,c/(n+1)),f=(l.x-t)/(c||1),d=(l.z-i)/(c||1);l.vx+=f*10*h/l.mass,l.vz+=d*10*h/l.mass,l.vy=Math.max(l.vy,4*h),l.onGround=!1,l.w+=Q(-1.5,1.5)*h,l.damage(r*4*h,o)}m.peds.panic(t,i,80,null)}};function hy(s,t,e,i,n,r,o,a){let l=Math.sin(o.h),c=Math.cos(o.h),h=s-o.x,f=e-o.z,d=h*c-f*l,u=h*l+f*c,x=i*c-r*l,y=i*l+r*c,g=o.T.wid/2,p=o.T.len/2,_=0,M=a,v=(T,E,P)=>{if(Math.abs(E)<1e-8)return T>=-P&&T<=P;let S=(-P-T)/E,w=(P-T)/E;if(S>w){let z=S;S=w,w=z}return _=Math.max(_,S),M=Math.min(M,w),_<=M};if(!v(d,x,g)||!v(u,y,p))return 1/0;let I=t+n*_;return I<o.y||I>o.y+o.T.hgt+.2?1/0:_}var uy=s=>document.getElementById(s),jo=120,kn=bt.minX-jo,Nn=bt.minZ-jo,Zo=bt.maxX-bt.minX+jo*2+140,$o=bt.maxZ-bt.minZ+jo*2,ve=1,Ko=class{constructor(){this.el={};for(let t of["hud","controls","minimap","hpbar","arbar","district","clock","money","wanted","weaponicon","ammo","objective","timer","subtitle","hint","toast","bigmsg","reticle","speedo","spd","carname","carhp","radio","fps","flash","vignette","footbtns","carbtns","mmN","mapview","bigmap","pause","settings","help","shop","title","pauseStats","shopList","shopTitle","shopMoney"])this.el[t]=uy(t);this.stars=[...this.el.wanted.querySelectorAll("i")],this.mm=this.el.minimap.getContext("2d"),this.subQ=[],this.subT=0,this.hintT=0,this.toastT=0,this.bigT=0,this.radioT=0,this.textT=0,this.gpsT=0,this.gpsPath=null,this.gpsKey="",this.waypoint=null,this.fpsAcc=0,this.fpsN=0,this.lastMoney=-1,this.flashV=0,this.hitT=0,this.menuStack=[],this.buildMapImage(),this.bindMenus(),window.__setSafeInsets=(t,e,i,n)=>{let r=document.documentElement.style;r.setProperty("--safe-l",t+"px"),r.setProperty("--safe-t",e+"px"),r.setProperty("--safe-r",i+"px"),r.setProperty("--safe-b",n+"px")}}buildMapImage(){let t=document.createElement("canvas");t.width=Math.ceil(Zo*ve),t.height=Math.ceil($o*ve);let e=t.getContext("2d"),i=o=>(o-kn)*ve,n=o=>(o-Nn)*ve;e.fillStyle="#2b4a5a",e.fillRect(0,0,t.width,t.height),e.fillStyle="#8f8467",fy(e,i(bt.minX),n(bt.minZ),(bt.maxX-bt.minX)*ve,(bt.maxZ-bt.minZ)*ve,bt.r*ve),e.fill(),e.fillStyle="#34363a",e.fillRect(i(pt.minX),n(pt.minZ),(pt.maxX-pt.minX)*ve,(pt.maxZ-pt.minZ)*ve);let r={R:"#3c4239",P:"#3e5a37",D:"#3b3c3e",S:"#3a3c40",T:"#393b3f",B:"#393b3f",M:"#3a3c40",O:"#3d3c40"};for(let o of m.city.lots)e.fillStyle=r[o.d]||"#373b45",e.fillRect(i(o.ox0),n(o.oz0),(o.ox1-o.ox0)*ve,(o.oz1-o.oz0)*ve);e.fillStyle="#26282c";for(let o of m.city.buildings)o.collide!==!1&&e.fillRect(i(o.x-o.w/2),n(o.z-o.d/2),o.w*ve,o.d*ve);for(let o of m.city.extras)o.type==="pond"?(e.fillStyle="#2b4a5a",e.beginPath(),e.ellipse(i(o.x),n(o.z),o.rx*ve,o.rz*ve,0,0,Math.PI*2),e.fill()):o.type==="stadium"&&(e.fillStyle="#5a6070",e.beginPath(),e.ellipse(i(o.x),n(o.z),o.ax*ve,o.az*ve,0,0,Math.PI*2),e.fill(),e.fillStyle="#2f6a34",e.beginPath(),e.ellipse(i(o.x),n(o.z),o.ax*.6*ve,o.az*.6*ve,0,0,Math.PI*2),e.fill());e.fillStyle="#8e9296";for(let o of m.city.nodes)o.nb.length&&e.fillRect(i(o.x-Et),n(o.z-Et),Et*2*ve,Et*2*ve);for(let o of m.city.edges){let a=m.city.nodes[o.a],l=m.city.nodes[o.b];o.horiz?e.fillRect(i(a.x),n(a.z-Et),(l.x-a.x)*ve,Et*2*ve):e.fillRect(i(a.x-Et),n(a.z),Et*2*ve,(l.z-a.z)*ve)}e.fillStyle="#7a5a3a",e.fillRect(i(Ft.x0),n(Ft.z0),(Ft.x1-Ft.x0)*ve,(Ft.z1-Ft.z0)*ve),this.mapImg=t,this.mapX=i,this.mapZ=n}bindMenus(){let t=(e,i)=>{for(let n of e.querySelectorAll("[data-act]"))n.addEventListener("click",()=>{m.audio.click(),i(n.dataset.act)})};t(this.el.pause,e=>{e==="resume"?m.resume():e==="map"?this.openMap():e==="settings"?this.openSettings("pause"):e==="help"?this.openHelp("pause"):e==="save"?(m.saveGame(),this.toast("Saved")):e==="title"&&m.toTitle()}),t(this.el.settings,e=>{e==="back"&&this.closeSub("settings")}),t(this.el.help,e=>{e==="back"&&this.closeSub("help")}),t(this.el.mapview,e=>{e==="closemap"&&this.closeMap()}),t(this.el.shop,e=>{e==="closeshop"&&this.closeShop()});for(let e of this.el.settings.querySelectorAll(".seg")){let i=e.dataset.set;for(let n of e.querySelectorAll("span"))n.addEventListener("click",()=>{let r=n.dataset.v;r==="true"?r=!0:r==="false"&&(r=!1),m.settings[i]=r,m.applySettings(),this.syncSettings(),m.audio.click()})}for(let e of this.el.settings.querySelectorAll("input[type=range]"))e.addEventListener("input",()=>{m.settings[e.dataset.set]=parseFloat(e.value),m.applySettings()});this.el.bigmap.addEventListener("pointerdown",e=>this.mapTap(e))}syncSettings(){for(let t of this.el.settings.querySelectorAll(".seg")){let e=String(m.settings[t.dataset.set]);for(let i of t.querySelectorAll("span"))i.classList.toggle("on",i.dataset.v===e)}for(let t of this.el.settings.querySelectorAll("input[type=range]"))t.value=m.settings[t.dataset.set]}show(t,e){this.el[t].classList.toggle("hidden",!e)}openPause(){let t=m.stats,e=Math.min(m.save.story||0,6),i="&nbsp;&nbsp;&nbsp;";this.el.pauseStats.innerHTML=`${hn(m.player.money)}${i}Story ${e}/6${i}Shells ${(m.save.shells||[]).length}/20${i}Jumps ${(m.save.jumps||[]).length}/6<br>Kills ${t.kills}${i}Cars stolen ${t.carsStolen}${i}Driven ${(t.distance/1e3).toFixed(1)} km`,this.show("pause",!0)}openSettings(t){this.syncSettings(),this.settingsFrom=t,this.show("settings",!0),t==="pause"&&this.show("pause",!1),t==="title"&&this.show("title",!1)}openHelp(t){this.helpFrom=t,this.show("help",!0),t==="pause"&&this.show("pause",!1),t==="title"&&this.show("title",!1)}closeSub(t){this.show(t,!1);let e=t==="settings"?this.settingsFrom:this.helpFrom;e==="pause"?this.show("pause",!0):e==="title"&&this.show("title",!0)}openMap(){m.pauseGame(!0),this.show("pause",!1),this.show("mapview",!0),this.mapOpenFromPause=m.state==="paused",this.drawBigMap()}closeMap(){this.show("mapview",!1),m.resume()}mapTap(t){let e=this.el.bigmap.getBoundingClientRect(),i=(t.clientX-e.left-this.bm.ox)/this.bm.s+kn,n=(t.clientY-e.top-this.bm.oy)/this.bm.s+Nn;this.waypoint&&Math.hypot(this.waypoint.x-i,this.waypoint.z-n)<40?this.waypoint=null:this.waypoint={x:i,z:n},this.gpsKey="",m.audio.click(),this.drawBigMap()}drawBigMap(){let t=this.el.bigmap,e=Math.min(2,window.devicePixelRatio||1);t.width=Math.floor(t.clientWidth*e),t.height=Math.floor(t.clientHeight*e);let i=t.getContext("2d");i.setTransform(e,0,0,e,0,0);let n=t.clientWidth,r=t.clientHeight,o=Math.min(n/Zo,r/$o)*.98,a=(n-Zo*o)/2,l=(r-$o*o)/2;this.bm={s:o,ox:a,oy:l},i.fillStyle="#2b4a5a",i.fillRect(0,0,n,r),i.drawImage(this.mapImg,a,l,Zo*o,$o*o);let c=(y,g)=>[a+(y-kn)*o,l+(g-Nn)*o],h=this.gpsPath;h&&h.length>1&&(i.strokeStyle=m.missions.gps?"rgba(242,194,48,0.95)":"rgba(163,92,240,0.95)",i.lineWidth=4,i.lineJoin="round",i.beginPath(),h.forEach((y,g)=>{let[p,_]=c(y.x,y.z);g?i.lineTo(p,_):i.moveTo(p,_)}),i.stroke());for(let y of this.blips()){let[g,p]=c(y.x,y.z);Jo(i,g,p,y,1.4)}if(this.waypoint){let[y,g]=c(this.waypoint.x,this.waypoint.z);Jo(i,y,g,{color:"#a35cf0",icon:"way"},1.6)}let f=m.player.pos(),[d,u]=c(f.x,f.z);dy(i,d,u,m.player.human.vehicle?m.player.human.vehicle.h:m.player.human.h,1.6),i.font='700 14px "Barlow Condensed", Arial',i.textAlign="center",i.fillStyle="rgba(255,255,255,0.75)";let x=[["Downtown",Ht(8),qt(2)],["Ocean Drive",Ht(13),qt(5)],["Midtown",Ht(5),qt(5)],["Palm Heights",Ht(3),qt(8)],["The Docks",Ht(2),qt(2)],["Coral Beach",pt.maxX+70,qt(8)],["Starlight Park",Ht(8),qt(7)]];for(let[y,g,p]of x){let[_,M]=c(g,p);i.fillText(y,_,M)}}blips(){let t=[];for(let n of m.pickups.markers)n.hidden||!n.blip||t.push({x:n.x,z:n.z,color:n.blip.color,icon:n.blip.icon,edge:!0});for(let n of m.humans)n.removed||!n.alive||(n.blip?t.push({x:n.x,z:n.z,color:n.blip.color,icon:"dot",edge:!0}):n.kind==="cop"&&m.police.level>0&&!n.vehicle?t.push({x:n.x,z:n.z,color:"#4aa3ff",icon:"small"}):n.ai&&n.ai.hostile&&n.ai.target&&t.push({x:n.x,z:n.z,color:"#ff3b3b",icon:"small"}));let e=Math.floor(m.time*4)%2;for(let n of m.vehicles)n.removed||(n.blip?t.push({x:n.x,z:n.z,color:n.blip.color,icon:"car",edge:!0}):n.isPolice&&n.siren&&t.push({x:n.x,z:n.z,color:e?"#ff3b3b":"#3b6bff",icon:"dot"}));let i=m.police.heli;return i&&i.active&&!i.dead&&t.push({x:i.x,z:i.z,color:e?"#ff3b3b":"#3b6bff",icon:"heli"}),t}openShop(t){m.pauseGame(!0),this.shopKind=t,this.show("shop",!0),this.renderShop()}renderShop(){let t=m.player,e=this.el.shopList;e.innerHTML="",this.el.shopMoney.textContent="Cash: "+hn(t.money);let i=[];if(this.shopKind==="guns"){this.el.shopTitle.textContent="Solace Arms";for(let n of["pistol","smg","shotgun","rifle"]){let r=Ye[n];t.owns(n)?i.push({label:`${r.name} ammo +${r.ammoPack} (have ${t.inv[n]})`,price:r.ammoPrice,buy:()=>t.giveWeapon(n,r.ammoPack)}):i.push({label:`${r.name} + ${r.ammoPack} rounds`,price:r.price,buy:()=>t.giveWeapon(n,r.ammoPack)})}i.push({label:"Body armor",price:250,owned:t.human.armor>=100,buy:()=>{t.human.armor=100}}),i.push({label:"First aid",price:100,owned:t.human.health>=t.human.maxHealth,buy:()=>{t.human.health=t.human.maxHealth}})}else{this.el.shopTitle.textContent="Sunset Motors";let n=[["suv",3e3],["muscle",4500],["sports",7500],["super",18e3]];for(let[r,o]of n)i.push({label:`${Ln[r].name}, parked out front`,price:o,buy:()=>{m.pickups.buyCar(r,0),this.closeShop(),this.toast(`${Ln[r].name} bought`)}})}for(let n of i){let r=document.createElement("div"),o=t.money>=n.price&&!n.owned;r.className="shopitem"+(o?"":n.owned?" owned":" cant"),r.innerHTML=`<span>${n.label}</span><span class="p">${n.owned?"Full":hn(n.price)}</span>`,r.addEventListener("click",()=>{if(!o){m.audio.click();return}t.addMoney(-n.price),n.buy(),m.audio.cash(),this.shopKind==="guns"&&this.renderShop()}),e.appendChild(r)}}closeShop(){this.show("shop",!1),m.resume()}objective(t){this.el.objective.innerHTML=t||""}timer(t){this.el.timer.textContent=t||""}subtitles(t){this.subQ.push(...t),this.subT<=0&&this.nextSub()}nextSub(){let t=this.subQ.shift();if(!t){this.el.subtitle.innerHTML="",this.subT=0;return}this.el.subtitle.innerHTML=t[0],this.subT=t[1]}hint(t,e=2.5){this.el.hint.innerHTML=t,this.hintT=e}toast(t,e=2){this.el.toast.textContent=t,this.toastT=e}bigMessage(t,e,i="info",n=2.5){let r=this.el.bigmsg;r.className="",r.offsetWidth,r.className="show "+i,r.querySelector(".t").textContent=t,r.querySelector(".s").textContent=e||"",this.bigT=n}radio(t){this.el.radio.innerHTML=t?`${t[0]}${t[1]?`<small>${t[1]}</small>`:""}`:"",this.radioT=2.5}carName(t){this.el.carname.textContent=t.toUpperCase()}weaponChanged(){this.textT=0}moneyChanged(t){t>0&&(this.el.money.classList.remove("flashup"),this.el.money.offsetWidth,this.el.money.classList.add("flashup")),this.textT=0}damageFlash(t){this.flashV=Math.max(this.flashV,.25+t*.35)}hitMarker(t){this.hitT=.15,this.el.reticle.style.borderColor=t?"#ffffff":""}fade(){let t=this.el.flash;t.style.background="#000",t.style.transition="none",t.style.opacity="1",requestAnimationFrame(()=>{t.style.transition="opacity 0.8s",t.style.opacity="0",setTimeout(()=>{t.style.background="",t.style.transition=""},900)})}update(t){let e=m.player,i=e.human,n=i.vehicle;if(this.subT>0&&(this.subT-=t,this.subT<=0&&this.nextSub()),this.hintT>0&&(this.hintT-=t,this.hintT<=0&&(this.el.hint.innerHTML="")),this.toastT>0&&(this.toastT-=t,this.toastT<=0&&(this.el.toast.textContent="")),this.bigT>0&&(this.bigT-=t,this.bigT<=0&&(this.el.bigmsg.className="")),this.radioT>0&&(this.radioT-=t,this.radioT<=0&&(this.el.radio.textContent="")),this.flashV=Math.max(0,this.flashV-t*1.5),this.el.flash.style.opacity=this.flashV.toFixed(2),this.el.vignette.style.opacity=i.alive&&i.health<35?(.5+.3*Math.sin(m.time*6)).toFixed(2):"0",this.textT-=t,this.textT<=0){this.textT=.15,this.el.hpbar.style.width=Ct(i.health/i.maxHealth*100,0,100)+"%",this.el.arbar.style.width=Ct(i.armor,0,100)+"%",this.el.arbar.parentElement.style.opacity=i.armor>0?"1":"0.35";let r=Math.floor(m.hour),o=Math.floor(m.hour%1*60);this.el.clock.textContent=`${r<10?"0":""}${r}:${o<10?"0":""}${o}`,this.lastMoney!==e.money&&(this.lastMoney=e.money,this.el.money.textContent=hn(e.money));let a=Ye[i.weapon];this.el.weaponicon.textContent=a.name,this.el.ammo.textContent=i.weapon==="fist"?"":i.reloadT>0?"RELOAD":`${i.clip}/${Math.max(0,e.inv[i.weapon]-i.clip)}`;let l=e.pos();this.el.district.textContent=m.city.districtAt(l.x,l.z);let c=m.police.level;this.stars.forEach((d,u)=>d.classList.toggle("on",u<c)),this.el.wanted.classList.toggle("flash",c>0&&!m.police.seen),this.el.wanted.style.visibility=c>0?"visible":"hidden",this.show("footbtns",!n),this.show("carbtns",!!n),this.el.footbtns.querySelector(".enter").classList.toggle("glow",!!e.nearCar&&!n),this.el.speedo.classList.toggle("show",!!n),n&&(this.el.spd.textContent=Math.round(n.speed*3.6),this.el.carhp.style.width=Ct(n.health/n.maxHealth*100,0,100)+"%");let f=m.pickups.near;f&&f.d<6&&this.hintT<=0&&!m.missions.active?this.el.hint.innerHTML=f.m.label:this.hintT<=0&&(this.el.hint.innerHTML=""),m.settings.showFps?this.el.fps.textContent=`${Math.round(this.fps||0)} fps \xB7 ${m.renderer.info.render.calls} dc`:this.el.fps.textContent=""}this.fpsAcc+=t,this.fpsN++,this.fpsAcc>.5&&(this.fps=this.fpsN/this.fpsAcc,this.fpsAcc=0,this.fpsN=0),this.updateReticle(),this.updateGps(t),this.drawMinimap()}updateReticle(){let t=m.player,e=this.el.reticle,i=t.target;if(this.hitT=Math.max(0,this.hitT-1/60),i&&!i.removed&&(t.aiming||t.human.aimT>0||t.human.vehicle)){let n=i.T?i.y+(i.T.hgt||1)*.6:i.y+1.25,r=m.cam.project(i.x,n,i.z);if(r){e.style.display="block",e.style.left=r.x+"px",e.style.top=r.y+"px",e.classList.toggle("hostile",!!(i.kind==="cop"||i.kind==="gang"||i.ai&&i.ai.hostile)),e.style.transform=this.hitT>0?"scale(1.35)":"";return}}e.style.display="none"}updateGps(t){this.gpsT-=t;let e=m.missions.gps||this.waypoint;if(!e){this.gpsPath=null;return}if(this.waypoint&&!m.missions.gps){let l=m.player.pos();if(Math.hypot(l.x-this.waypoint.x,l.z-this.waypoint.z)<25){this.waypoint=null,this.toast("Arrived");return}}let i=e.x.toFixed(0)+","+e.z.toFixed(0);if(this.gpsT>0&&i===this.gpsKey)return;this.gpsT=1,this.gpsKey=i;let n=m.player.pos(),r=ki(m.city,n.x,n.z),o=ki(m.city,e.x,e.z),a=ko(m.city,r,o);this.gpsPath=[{x:n.x,z:n.z},...a.map(l=>({x:l.x,z:l.z})),{x:e.x,z:e.z}]}drawMinimap(){let t=this.el.minimap,e=this.mm,i=t.width,n=t.height,r=m.player.pos(),o=m.player.human.vehicle,l=o?Ct(1.25-o.speed*.012,.75,1.25):1.5,c=m.cam.yaw-Math.PI;e.setTransform(1,0,0,1,0,0),e.fillStyle="#2b4a5a",e.fillRect(0,0,i,n),e.save(),e.translate(i/2,n/2),e.rotate(c),e.scale(l,l),e.translate(-(r.x-kn),-(r.z-Nn)),e.imageSmoothingEnabled=!0;let h=i/l*.75,f=Ct(r.x-kn-h,0,this.mapImg.width),d=Ct(r.z-Nn-h,0,this.mapImg.height),u=Math.min(h*2,this.mapImg.width-f),x=Math.min(h*2,this.mapImg.height-d);u>0&&x>0&&e.drawImage(this.mapImg,f,d,u,x,f,d,u,x),m.police.level>0&&!m.police.seen&&(e.fillStyle="rgba(216,56,47,0.22)",e.beginPath(),e.arc(m.police.lastSeen.x-kn,m.police.lastSeen.z-Nn,m.police.searchRadius,0,Math.PI*2),e.fill()),this.gpsPath&&this.gpsPath.length>1&&(e.strokeStyle=m.missions.gps?"rgba(242,194,48,0.95)":"rgba(163,92,240,0.95)",e.lineWidth=6/l,e.lineJoin="round",e.lineCap="round",e.beginPath(),this.gpsPath.forEach((k,U)=>{U?e.lineTo(k.x-kn,k.z-Nn):e.moveTo(k.x-kn,k.z-Nn)}),e.stroke()),e.restore();let y=Math.cos(c),g=Math.sin(c),p=(k,U)=>{let H=(k-r.x)*l,Y=(U-r.z)*l;return[i/2+H*y-Y*g,n/2+H*g+Y*y]},_=Math.min(i,n)/2-10,M=i/2-10,v=n/2-10,I=this.blips();this.waypoint&&I.push({x:this.waypoint.x,z:this.waypoint.z,color:"#a35cf0",icon:"way",edge:!0});for(let k of I){let[U,H]=p(k.x,k.z),Y=U-i/2,W=H-n/2,ot=Math.max(Math.abs(Y)/M,Math.abs(W)/v);if(ot>1){if(!k.edge)continue;U=i/2+Y/ot,H=n/2+W/ot,Jo(e,U,H,k,1.5,!0)}else Jo(e,U,H,k,1.8)}let T=o?o.h:m.player.human.h,E=Math.atan2(Math.sin(T)*y-Math.cos(T)*g,-(Math.sin(T)*g+Math.cos(T)*y));xf(e,i/2,n/2,E,2);let[P,S]=p(r.x,r.z-1e3),w=Math.max(Math.abs(P-i/2)/(M+2),Math.abs(S-n/2)/(v+2))||1,z=this.el.mmN;z.style.left=(i/2+(P-i/2)/w)/i*100+"%",z.style.top=(n/2+(S-n/2)/w)/n*100+"%",z.style.transform="translate(-50%,-50%)"}};function fy(s,t,e,i,n,r){s.beginPath(),s.moveTo(t+r,e),s.arcTo(t+i,e,t+i,e+n,r),s.arcTo(t+i,e+n,t,e+n,r),s.arcTo(t,e+n,t,e,r),s.arcTo(t,e,t+i,e,r),s.closePath()}function Jo(s,t,e,i,n=1,r=!1){s.save(),s.translate(t,e),s.scale(n,n);let o=i.color||"#fff";switch(s.lineWidth=1.5,s.strokeStyle="#000",s.fillStyle=o,i.icon){case"small":s.beginPath(),s.arc(0,0,2.6,0,Math.PI*2),s.fill(),s.stroke();break;case"car":s.fillRect(-4,-3,8,6),s.strokeRect(-4,-3,8,6);break;case"heli":s.beginPath(),s.arc(0,0,4,0,Math.PI*2),s.fill(),s.stroke(),s.strokeStyle=o,s.beginPath(),s.moveTo(-7,-5),s.lineTo(7,5),s.moveTo(7,-5),s.lineTo(-7,5),s.stroke();break;case"R":case"D":s.beginPath(),s.arc(0,0,6.5,0,Math.PI*2),s.fill(),s.stroke(),s.fillStyle="#fff",s.font="bold 9px Arial",s.textAlign="center",s.textBaseline="middle",s.fillText(i.icon,0,.5);break;case"flag":s.beginPath(),s.arc(0,0,5.5,0,Math.PI*2),s.fill(),s.stroke(),s.fillStyle="#000",s.fillRect(-1.5,-3.5,1.2,7),s.fillRect(-.5,-3.5,4,3);break;case"way":s.beginPath(),s.moveTo(0,6),s.lineTo(-5,-3),s.arc(0,-3,5,Math.PI,0),s.closePath(),s.fill(),s.stroke();break;case"gun":case"spray":case"home":s.beginPath(),s.rect(-5,-5,10,10),s.fill(),s.stroke(),s.fillStyle="#000",s.font="bold 8px Arial",s.textAlign="center",s.textBaseline="middle",s.fillText(i.icon==="gun"?"$":i.icon==="spray"?"S":"H",0,.5);break;default:s.beginPath(),s.arc(0,0,r?4:4.5,0,Math.PI*2),s.fill(),s.stroke()}s.restore()}function dy(s,t,e,i,n){xf(s,t,e,Math.atan2(Math.sin(i),-Math.cos(i)),n)}function xf(s,t,e,i,n){s.save(),s.translate(t,e),s.rotate(i),s.scale(n,n),s.fillStyle="#ffffff",s.strokeStyle="#000",s.lineWidth=1.2,s.beginPath(),s.moveTo(0,-7),s.lineTo(5,5),s.lineTo(0,2.5),s.lineTo(-5,5),s.closePath(),s.fill(),s.stroke(),s.restore()}var vr=s=>440*Math.pow(2,(s-69)/12),Qo=class{constructor(){this.ctx=null,this.ready=!1,this.station=0,this.stations=[["Neon 88.3","Synthwave"],["Tide 102","House"],["K-Solace 94.7","Lo-fi"],["Radio off",""]]}init(){if(this.ctx){this.ctx.state!=="running"&&this.ctx.resume();return}let t=window.AudioContext||window.webkitAudioContext;if(!t)return;let e=new t({latencyHint:"interactive"});this.ctx=e,this.comp=e.createDynamicsCompressor(),this.comp.threshold.value=-14,this.comp.ratio.value=4,this.comp.connect(e.destination),this.master=e.createGain(),this.master.connect(this.comp),this.sfx=e.createGain(),this.sfx.connect(this.master),this.music=e.createGain(),this.music.connect(this.master),this.noise=this.makeNoise(2),this.delay=e.createDelay(1),this.delay.delayTime.value=.36,this.delayFb=e.createGain(),this.delayFb.gain.value=.32,this.delay.connect(this.delayFb),this.delayFb.connect(this.delay),this.delayOut=e.createGain(),this.delayOut.gain.value=.35,this.delay.connect(this.delayOut),this.delayOut.connect(this.music),this.setupEngine(),this.setupLoops(),this.radio=new Bc(this),this.ready=!0,this.applyVolume()}applyVolume(){this.ready&&(this.sfx.gain.value=m.settings.volume,this.music.gain.value=m.settings.music*.55)}suspend(){this.ctx&&this.ctx.state==="running"&&this.ctx.suspend()}resume(){this.ctx&&this.ctx.state!=="running"&&this.ctx.resume()}makeNoise(t){let e=this.ctx,i=e.createBuffer(1,e.sampleRate*t,e.sampleRate),n=i.getChannelData(0);for(let r=0;r<n.length;r++)n[r]=Math.random()*2-1;return i}att(t,e,i=120){if(t===void 0)return 1;let n=m.cam.distTo(t,e),r=Ct(1-n/i,0,1);return r*r}noiseHit({t=0,dur:e=.2,type:i="lowpass",f:n=1e3,f1:r=null,q:o=.7,gain:a=.5,attack:l=.002,dest:c=null}){if(!this.ready||a<.002)return;let h=this.ctx,f=h.currentTime+t,d=h.createBufferSource();d.buffer=this.noise,d.loop=!0;let u=h.createBiquadFilter();u.type=i,u.frequency.setValueAtTime(n,f),r&&u.frequency.exponentialRampToValueAtTime(Math.max(20,r),f+e),u.Q.value=o;let x=h.createGain();x.gain.setValueAtTime(1e-4,f),x.gain.exponentialRampToValueAtTime(a,f+l),x.gain.exponentialRampToValueAtTime(1e-4,f+e),d.connect(u),u.connect(x),x.connect(c||this.sfx),d.start(f,Math.random()*1.5),d.stop(f+e+.05)}tone({t=0,type:e="sine",f:i=440,f1:n=null,dur:r=.2,gain:o=.3,attack:a=.005,dest:l=null,curve:c="exp"}){if(!this.ready||o<.002)return;let h=this.ctx,f=h.currentTime+t,d=h.createOscillator();d.type=e,d.frequency.setValueAtTime(i,f),n&&d.frequency.exponentialRampToValueAtTime(Math.max(10,n),f+r);let u=h.createGain();u.gain.setValueAtTime(1e-4,f),u.gain.exponentialRampToValueAtTime(o,f+a),c==="exp"?u.gain.exponentialRampToValueAtTime(1e-4,f+r):u.gain.linearRampToValueAtTime(1e-4,f+r),d.connect(u),u.connect(l||this.sfx),d.start(f),d.stop(f+r+.05)}gun(t,e,i){let n=this.att(e,i,220),r={pistol:[.55,2200,.12],smg:[.4,2600,.08],shotgun:[.8,1400,.25],rifle:[.6,2400,.14]}[t]||[.5,2e3,.12];this.noiseHit({dur:r[2],f:r[1],f1:300,gain:r[0]*n,type:"lowpass"}),this.tone({type:"triangle",f:160,f1:40,dur:r[2]*1.2,gain:r[0]*.8*n})}explosion(t,e){let i=this.att(t,e,400);this.noiseHit({dur:1.6,f:1200,f1:60,gain:.9*i,attack:.01}),this.tone({type:"sine",f:90,f1:25,dur:1.2,gain:.9*i}),this.noiseHit({t:.05,dur:.5,f:4e3,f1:500,gain:.25*i,type:"bandpass",q:.5})}crash(t=.5,e,i){let n=e===void 0?1:this.att(e,i,80);this.noiseHit({dur:.25+t*.3,f:2500,f1:200,gain:(.25+t*.5)*n,type:"lowpass"}),this.tone({type:"square",f:120+Q(-20,20),f1:50,dur:.15,gain:.15*t*n}),t>.4&&this.noiseHit({t:.04,dur:.4,f:5e3,gain:.08*t*n,type:"highpass"})}thud(t=.6){this.tone({type:"sine",f:110,f1:45,dur:.18,gain:.6*t}),this.noiseHit({dur:.08,f:800,gain:.25*t})}punch(){this.tone({type:"sine",f:140,f1:60,dur:.12,gain:.5}),this.noiseHit({dur:.06,f:1500,gain:.3})}swing(){this.noiseHit({dur:.12,f:900,f1:2500,gain:.08,type:"bandpass",q:2})}pickup(){this.tone({type:"triangle",f:660,dur:.1,gain:.25}),this.tone({t:.08,type:"triangle",f:990,dur:.18,gain:.25})}cash(){this.tone({type:"square",f:1320,dur:.06,gain:.08}),this.tone({t:.06,type:"square",f:1760,dur:.12,gain:.08})}click(){this.tone({type:"square",f:900,dur:.03,gain:.08})}reload(){this.noiseHit({dur:.05,f:3e3,gain:.15,type:"bandpass",q:3}),this.noiseHit({t:.25,dur:.06,f:2e3,gain:.18,type:"bandpass",q:3})}whiz(){this.noiseHit({dur:.12,f:3e3,f1:800,gain:.12,type:"bandpass",q:6})}splash(){this.noiseHit({dur:.7,f:1800,f1:300,gain:.35})}door(){this.tone({type:"square",f:180,f1:90,dur:.07,gain:.12}),this.noiseHit({t:.05,dur:.08,f:600,gain:.2})}spray(){this.noiseHit({dur:1.2,f:6e3,gain:.15,type:"highpass"}),this.chime()}horn(t,e,i=!1){let n=i?.5:.35*this.att(t,e,90);for(let r of[415,523])this.tone({type:"square",f:r,dur:.38,gain:n*.35,attack:.01,curve:"lin"})}beep(t){this.tone({type:"square",f:t?1320:660,dur:t?.5:.25,gain:.18})}chime(){[784,988,1175].forEach((t,e)=>this.tone({t:e*.08,type:"triangle",f:t,dur:.4,gain:.2}))}wantedUp(){[880,660].forEach((t,e)=>this.tone({t:e*.12,type:"square",f:t,dur:.14,gain:.12}))}missionStart(){[523,659,784,1047].forEach((t,e)=>this.tone({t:e*.09,type:"triangle",f:t,dur:.35,gain:.18}))}missionPassed(){let t=[[523,0],[659,.12],[784,.24],[1047,.36],[988,.6],[1047,.75]];for(let[e,i]of t)this.tone({t:i,type:"square",f:e,dur:.3,gain:.09}),this.tone({t:i,type:"triangle",f:e/2,dur:.35,gain:.15})}missionFailed(){[392,370,349,330].forEach((t,e)=>this.tone({t:e*.18,type:"sawtooth",f:t,dur:.3,gain:.08}))}death(){this.tone({type:"sawtooth",f:300,f1:60,dur:1.4,gain:.15}),this.noiseHit({dur:1.2,f:600,f1:80,gain:.2})}busted(){[600,450,600,450].forEach((t,e)=>this.tone({t:e*.2,type:"square",f:t,dur:.18,gain:.1}))}setupEngine(){let t=this.ctx;this.eng=t.createGain(),this.eng.gain.value=0,this.engF=t.createBiquadFilter(),this.engF.type="lowpass",this.engF.frequency.value=600,this.engF.Q.value=3,this.o1=t.createOscillator(),this.o1.type="sawtooth",this.o2=t.createOscillator(),this.o2.type="square",this.o3=t.createOscillator(),this.o3.type="sawtooth";let e=t.createGain();e.gain.value=.5;let i=t.createGain();i.gain.value=.35,this.o1.connect(this.engF),this.o2.connect(e),e.connect(this.engF),this.o3.connect(i),i.connect(this.engF),this.engF.connect(this.eng),this.eng.connect(this.sfx),this.o1.start(),this.o2.start(),this.o3.start(),this.tyreSrc=t.createBufferSource(),this.tyreSrc.buffer=this.noise,this.tyreSrc.loop=!0,this.tyreF=t.createBiquadFilter(),this.tyreF.type="bandpass",this.tyreF.frequency.value=1800,this.tyreF.Q.value=4,this.tyreG=t.createGain(),this.tyreG.gain.value=0,this.tyreSrc.connect(this.tyreF),this.tyreF.connect(this.tyreG),this.tyreG.connect(this.sfx),this.tyreSrc.start(),this.siren=t.createOscillator(),this.siren.type="square",this.sirenF=t.createBiquadFilter(),this.sirenF.type="lowpass",this.sirenF.frequency.value=2200,this.sirenG=t.createGain(),this.sirenG.gain.value=0,this.siren.connect(this.sirenF),this.sirenF.connect(this.sirenG),this.sirenG.connect(this.sfx),this.siren.start(),this.gear=1}setupLoops(){let t=this.ctx,e=(i,n)=>{let r=t.createBufferSource();r.buffer=this.noise,r.loop=!0;let o=t.createBiquadFilter();o.type=n,o.frequency.value=i;let a=t.createGain();return a.gain.value=0,r.connect(o),o.connect(a),a.connect(this.sfx),r.start(0,Math.random()),a};this.cityG=e(380,"lowpass"),this.oceanG=e(700,"lowpass"),this.windG=e(900,"bandpass")}update(t){if(!this.ready)return;let i=this.ctx.currentTime,n=m.paused,r=m.player,o=r&&r.human&&r.human.vehicle;if(o&&!n&&!o.wrecked){let u=Math.abs(o.vF),x=o.T.maxSpeed,y=[0,.16,.32,.5,.7,.9,1.2].map(P=>P*x),g=1;for(;g<y.length-1&&u>y[g];)g++;let p=y[g-1],_=y[g],M=Ct((u-p)/(_-p||1),0,1)*.75+.25,v=Math.abs(o.throttle),I=o.T.truck?32:o.type==="super"||o.type==="sports"?58:o.type==="muscle"?40:48,T=I+M*I*2.1+v*8;this.o1.frequency.setTargetAtTime(T,i,.05),this.o2.frequency.setTargetAtTime(T*.5,i,.05),this.o3.frequency.setTargetAtTime(T*1.01+1.5,i,.05),this.engF.frequency.setTargetAtTime(250+M*1100+v*900,i,.08),this.eng.gain.setTargetAtTime(.07+v*.07+M*.03,i,.08);let E=o.onGround?Ct((o.slip-3.5)/8,0,1)+(o.handbrake&&o.speed>6?.5:0):0;this.tyreG.gain.setTargetAtTime(Math.min(.22,E*.2),i,.05),this.windG.gain.setTargetAtTime(Ct(o.speed/60,0,1)*.06,i,.2)}else this.eng.gain.setTargetAtTime(0,i,.1),this.tyreG.gain.setTargetAtTime(0,i,.05),this.windG.gain.setTargetAtTime(0,i,.2);let a=1e9;if(!n)for(let u of m.vehicles)u.siren&&!u.removed&&(a=Math.min(a,m.cam.distTo(u.x,u.z)));let l=Ct(1-a/160,0,1);this.sirenG.gain.setTargetAtTime(l*l*.07,i,.1);let c=720+330*Math.sin(i*2*Math.PI*.32);this.siren.frequency.setTargetAtTime(c,i,.03);let h=r&&r.human?r.pos():{x:0,z:0},f=Ct(1-(pt.maxX-h.x)/160,0,1),d=m.sky?m.sky.night:0;this.cityG.gain.setTargetAtTime(n?0:.05*(1-f*.6)*(1-d*.4),i,.3),this.oceanG.gain.setTargetAtTime(n?0:f*(.07+.04*Math.sin(i*.7)),i,.3),this.radio.update(!!o&&!n&&this.station<3)}nextStation(){this.ready&&(this.station=(this.station+1)%this.stations.length,this.radio.switchTo(this.station),m.hud.radio(this.stations[this.station]),this.noiseHit({dur:.25,f:3e3,gain:.08,type:"bandpass",q:1}))}},Bc=class{constructor(t){this.a=t,this.ctx=t.ctx,this.out=this.ctx.createGain(),this.out.gain.value=0,this.out.connect(t.music),this.next=0,this.step=0,this.playing=!1,this.station=0,this.bar=0,this.seed=Math.random(),this.pattern=null}switchTo(t){this.station=t,this.step=0,this.bar=0,this.next=this.ctx.currentTime+.1}update(t){let i=this.ctx.currentTime;if(this.out.gain.setTargetAtTime(t?1:0,i,.25),!t){this.playing=!1;return}this.playing||(this.playing=!0,this.next=i+.05);let r=60/([100,122,78][this.station]||100)/4;for(;this.next<i+.25;)this.schedule(this.next,this.step,r),this.next+=r*(this.station===2&&this.step%2===0?1.18:this.station===2?.82:1),this.step++,this.step%16===0&&this.bar++}kick(t,e=.9){let i=this.ctx,n=i.createOscillator(),r=i.createGain();n.frequency.setValueAtTime(150,t),n.frequency.exponentialRampToValueAtTime(42,t+.13),r.gain.setValueAtTime(e,t),r.gain.exponentialRampToValueAtTime(.001,t+.3),n.connect(r),r.connect(this.out),n.start(t),n.stop(t+.32)}snare(t,e=.35){let i=this.ctx,n=i.createBufferSource(),r=i.createBiquadFilter(),o=i.createGain();n.buffer=this.a.noise,r.type="highpass",r.frequency.value=1400,o.gain.setValueAtTime(e,t),o.gain.exponentialRampToValueAtTime(.001,t+.18),n.connect(r),r.connect(o),o.connect(this.out),n.start(t,Math.random()),n.stop(t+.2);let a=i.createOscillator(),l=i.createGain();a.type="triangle",a.frequency.value=190,l.gain.setValueAtTime(e*.6,t),l.gain.exponentialRampToValueAtTime(.001,t+.08),a.connect(l),l.connect(this.out),a.start(t),a.stop(t+.1)}hat(t,e=!1,i=.12){let n=this.ctx,r=n.createBufferSource(),o=n.createBiquadFilter(),a=n.createGain();r.buffer=this.a.noise,o.type="highpass",o.frequency.value=7500;let l=e?.2:.035;a.gain.setValueAtTime(i,t),a.gain.exponentialRampToValueAtTime(.001,t+l),r.connect(o),o.connect(a),a.connect(this.out),r.start(t,Math.random()),r.stop(t+l+.02)}bass(t,e,i,n=.22,r="sawtooth"){let o=this.ctx,a=o.createOscillator(),l=o.createBiquadFilter(),c=o.createGain();a.type=r,a.frequency.value=vr(e),l.type="lowpass",l.Q.value=6,l.frequency.setValueAtTime(300,t),l.frequency.exponentialRampToValueAtTime(1400,t+.02),l.frequency.exponentialRampToValueAtTime(260,t+i),c.gain.setValueAtTime(1e-4,t),c.gain.exponentialRampToValueAtTime(n,t+.01),c.gain.exponentialRampToValueAtTime(.001,t+i),a.connect(l),l.connect(c),c.connect(this.out),a.start(t),a.stop(t+i+.02)}lead(t,e,i,n=.06,r="square"){let o=this.ctx,a=o.createOscillator(),l=o.createBiquadFilter(),c=o.createGain();a.type=r,a.frequency.value=vr(e),l.type="lowpass",l.frequency.value=2600,c.gain.setValueAtTime(1e-4,t),c.gain.exponentialRampToValueAtTime(n,t+.01),c.gain.exponentialRampToValueAtTime(.001,t+i),a.connect(l),l.connect(c),c.connect(this.out),c.connect(this.a.delay),a.start(t),a.stop(t+i+.02)}pad(t,e,i,n=.035){let r=this.ctx,o=r.createBiquadFilter(),a=r.createGain();o.type="lowpass",o.frequency.value=1300,a.gain.setValueAtTime(1e-4,t),a.gain.linearRampToValueAtTime(n,t+i*.3),a.gain.linearRampToValueAtTime(1e-4,t+i),o.connect(a),a.connect(this.out);for(let l of e)for(let c of[-7,7]){let h=r.createOscillator();h.type="sawtooth",h.frequency.value=vr(l),h.detune.value=c,h.connect(o),h.start(t),h.stop(t+i+.05)}}keys(t,e,i,n=.05){let r=this.ctx,o=r.createGain();o.gain.setValueAtTime(1e-4,t),o.gain.exponentialRampToValueAtTime(n,t+.01),o.gain.exponentialRampToValueAtTime(.001,t+i),o.connect(this.out);for(let a of e){let l=r.createOscillator();l.type="sine",l.frequency.value=vr(a);let c=r.createOscillator();c.type="triangle",c.frequency.value=vr(a+12),c.detune.value=4;let h=r.createGain();h.gain.value=.3,l.connect(o),c.connect(h),h.connect(o),l.start(t),l.stop(t+i+.05),c.start(t),c.stop(t+i+.05)}}schedule(t,e,i){let n=e%16,r=this.bar;if(this.station===0){let a=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]][r%4];n%8===0&&this.kick(t),(n===4||n===12)&&this.snare(t,.3),n%2===0&&this.hat(t,!1,.06),n%2===0&&this.bass(t,a[0]-24+(n%4===2?12:0),i*1.8,.2),n===0&&this.pad(t,a.map(c=>c+12),i*16,.022);let l=[0,1,2,1];if(r%8>=4&&this.lead(t,a[l[n%4]]+24,i*.9,.035),r%8<4&&(n===0||n===6||n===10)){let c=[76,74,72,71,72,74,76,79];this.lead(t,c[(r*3+n)%c.length],i*3.5,.045,"sawtooth")}}else if(this.station===1){let a=[[50,53,57,60],[55,59,62,65],[48,52,55,59],[45,48,52,55]][r%4];n%4===0&&this.kick(t,.85),n%4===2&&this.hat(t,!0,.07),(n===4||n===12)&&this.snare(t,.18),n%4===2&&this.bass(t,a[0]-12,i*1.6,.2,"square"),(n===3||n===10)&&this.keys(t,a.map(l=>l+12),i*2,.04),r%4===3&&n>=12&&this.hat(t,!1,.08)}else if(this.station===2){let a=[[53,57,60,64],[52,55,59,62],[50,53,57,60],[48,52,55,59]][r%4];if((n===0||n===7||n===10)&&this.kick(t,.6),(n===4||n===12)&&this.snare(t,.16),n%2===0&&this.hat(t,!1,.045),n===0&&this.keys(t,a,i*14,.045),(n===0||n===8)&&this.bass(t,a[0]-12,i*6,.16,"triangle"),n%4===0&&Math.random()<.5){let l=[72,74,76,79,81];this.lead(t,Me(l),i*2.5,.025,"triangle")}Math.random()<.3&&this.a.noiseHit({t:t-this.ctx.currentTime,dur:.02,f:5e3,gain:.02,type:"highpass",dest:this.out})}}};var ta={Downtown:["sedan","sedan","taxi","taxi","compact","suv","sports","van"],"Ocean Drive":["sports","sports","muscle","taxi","compact","sedan","super","suv"],Midtown:["sedan","compact","compact","taxi","van","suv","muscle","truck"],"Palm Heights":["suv","suv","sedan","compact","muscle","van"],"The Docks":["truck","truck","van","van","suv","sedan"],"Solace Stadium":["sedan","suv","compact","muscle"],"Starlight Park":["compact","sedan","suv"]},Fn=class{constructor(t,e,i,n){this.v=t,this.from=e,this.to=i,this.lane=n,this.next=Fc(m.city,e,i),this.f=new Ws,this.cruise=Q(10.5,14.5),this.mem={},this.panicT=0,this.scanT=Math.random()*.2,this.obstacleD=99,this.honkT=0,this.waitT=0,this.build()}build(){let t=pi[this.lane];this.f.set(af(this.from,this.to,this.next,t))}onHit(t,e){t>4&&(this.panicT=Q(8,16),e&&e.driver&&e.driver.isPlayer&&me(.2)&&m.audio.horn(this.v.x,this.v.z))}onShot(){this.panicT=Q(10,18)}update(t){let e=this.v;if(e.wrecked||!e.driver){e.throttle=0,e.handbrake=!0;return}if(e.health<e.maxHealth*.25||e.sinkT>0){let c=e.driver;c.exitVehicle(),c.ai=new m.peds.PedBrain(c),c.ai.flee(e.x,e.z,Q(8,14)),e.ai=null;return}let n=5+e.speed*.55,r=this.f.target(e.x,e.z,n);if((this.f.done||r&&r.left<2&&this.joined!==!1)&&(this.from=this.to,this.to=this.next,this.next=Fc(m.city,this.from,this.to),me(.15)&&(this.lane=1-this.lane),this.build(),r=this.f.target(e.x,e.z,n)),!r)return;let o=Math.hypot(r.proj.x-e.x,r.proj.z-e.z);if(o<6&&(this.joined=!0),o>14&&this.joined&&this.panicT<=0&&(this.lost=!0),this.joined||(r={x:r.proj.x+(r.x-r.proj.x)*.5,z:r.proj.z+(r.z-r.proj.z)*.5,proj:r.proj,left:r.left}),this.lost){e.throttle=0,e.handbrake=!0;return}let a=this.panicT>0;a&&(this.panicT-=t);let l=a?24:this.cruise;if(this.f.i>=1&&!a&&(l=Math.min(l,8)),!a&&this.to.light&&this.f.i===0){let c=this.from.j===this.to.j?"x":"z",h=No(this.to,c,m.time),f=this.f.pts[1],d=Math.hypot(f.x-e.x,f.z-e.z);(h==="r"||h==="y"&&d>14)&&(l=Math.min(l,Math.max(0,Math.sqrt(Math.max(0,d-1.5)*2*6))),d<2.5&&(l=0))}this.scanT-=t,this.scanT<=0&&(this.scanT=.15,this.obstacleD=this.scan()),this.obstacleD<99&&(a?this.obstacleD<3&&(l=Math.min(l,6)):(l=Math.min(l,Math.max(0,(this.obstacleD-6.5)*.9)),this.obstacleD<6&&(l=0))),rs(e,r.x,r.z,l,t,this.mem),l===0&&e.speed<2?(e.throttle=0,e.handbrake=!0,this.mem.stuckT=0,this.waitT+=t,this.obstacleD<99&&this.waitT>4&&this.blocker&&this.blocker.isPlayer&&m.time>this.honkT&&(this.honkT=m.time+Q(2,5),m.audio.horn(e.x,e.z))):this.waitT=0}scan(){let t=this.v,e=Math.sin(t.h),i=Math.cos(t.h),n=-i,r=e,o=8+t.speed*1.3,a=99;this.blocker=null;for(let l of m.vehicles){if(l===t||l.removed)continue;let c=l.x-t.x,h=l.z-t.z;if(Math.abs(c)>o+5||Math.abs(h)>o+5)continue;let f=c*e+h*i;if(f<=0||f>o+l.T.len/2||Math.abs(c*n+h*r)>2+l.T.wid*.3)continue;let u=f-l.T.len/2-t.T.len/2+4;u<a&&(a=u,this.blocker=l.driver)}for(let l of m.humans){if(this.panicT>0)break;if(l.removed||l.vehicle||l.state==="dead")continue;let c=l.x-t.x,h=l.z-t.z;if(Math.abs(c)>o||Math.abs(h)>o)continue;let f=c*e+h*i;if(f<=0||f>Math.min(o,16)||Math.abs(c*n+h*r)>1.8)continue;let u=f-t.T.len/2+3;u<a&&(a=u,this.blocker=l)}return a}},ea=class{constructor(){this.spawnT=0,this.parkT=0,this.city=m.city;for(let t of this.city.parking)t.active=!1,t.car=null}desired(){let t=m.settings.quality;return t==="low"?12:t==="high"?24:18}update(t){let e=m.player.pos();for(let i of m.vehicles)i.ai&&!i.removed&&i.ai.update(t);if(this.spawnT-=t,this.spawnT<=0){this.spawnT=.35,this.cull(e);let i=m.vehicles.filter(n=>n.ai instanceof Fn).length;i<this.desired()&&this.trySpawn(e,i<this.desired()*.5)}this.parkT-=t,this.parkT<=0&&(this.parkT=.5,this.updateParking(e))}cull(t){let e=m.camera;for(let i of m.vehicles){if(i.removed||i.persistent)continue;if(m.player.human.vehicle===i||i===m.player.lastVehicle)if(i===m.player.lastVehicle&&Math.hypot(i.x-t.x,i.z-t.z)>300)m.player.lastVehicle=null;else continue;if(i.isPolice&&i.policeUnit&&!i.policeUnit.released)continue;let n=Math.hypot(i.x-t.x,i.z-t.z),r=this.visible(i.x,i.z,e);n>420||n>230&&!r||i.wrecked&&i.wreckT>40&&!r||i.removedSoon&&!r?this.remove(i):i.ai&&i.ai.lost&&!r&&n>60&&this.remove(i)}}remove(t){t.removed=!0,t.driver&&!t.driver.isPlayer&&(t.driver.removed=!0),t.passenger&&!t.passenger.isPlayer&&(t.passenger.removed=!0),t.parkSpot&&(t.parkSpot.car=null)}visible(t,e,i){let n=t-i.position.x,r=e-i.position.z,o=Math.hypot(n,r);return o<30?!0:(n*Math.sin(m.cam.yaw)+r*Math.cos(m.cam.yaw))/o>.5}trySpawn(t,e){let i=this.city;for(let n=0;n<8;n++){let r=Me(i.edges),o=i.nodes[r.a],a=i.nodes[r.b],l=(o.x+a.x)/2,c=(o.z+a.z)/2,h=Math.hypot(l-t.x,c-t.z);if(h<70||h>230||!e&&this.visible(l,c,m.camera)&&h<160)continue;let f=me(.5),d=f?o:a,u=f?a:o,x=me(.5)?0:1,y=Q(.25,.7),g=u.x-d.x,p=u.z-d.z,_=Math.hypot(g,p),M=g/_,v=p/_,I=pi[x],T=d.x+g*y+-v*I,E=d.z+p*y+M*I;if(m.vehicles.some(H=>!H.removed&&Math.abs(H.x-T)<12&&Math.abs(H.z-E)<12))continue;let P=i.districtAt(T,E),S=ta[P]||ta.Midtown,w=Me(S),z=Ai(w,T,E,Math.atan2(M,v)),k=Q(7,11);return z.vx=M*k,z.vz=v*k,ri("ped",T,E).enterVehicle(z,1),z.ai=new Fn(z,d,u,x),z.ai.joined=!0,z}return null}updateParking(t){for(let e of this.city.parking){let i=Math.hypot(e.x-t.x,e.z-t.z);if(!e.noSpawn){if(i<150&&!e.active){if(e.active=!0,Math.abs(Math.sin(e.x*12.9898+e.z*78.233)*43758.5453)%1<.55&&!e.car){let r=this.city.districtAt(e.x,e.z),o=ta[r]||ta.Midtown,a=Me(o.filter(c=>c!=="truck"));if(m.vehicles.some(c=>!c.removed&&Math.abs(c.x-e.x)<3&&Math.abs(c.z-e.z)<3))continue;let l=Ai(a,e.x,e.z,e.h+Q(-.05,.05));l.parkSpot=e,l.handbrake=!0,e.car=l}}else if(i>230&&e.active){if(e.active=!1,e.car&&!e.car.removed&&e.car!==m.player.human.vehicle&&e.car!==m.player.lastVehicle&&!e.car.persistent){let n=e.car;Math.hypot(n.x-e.x,n.z-e.z)<2&&!n.driver&&this.remove(n)}e.car=null}}}}};var yf=Et+2.3;function ia(s,t,e){return{x:s.x+t*yf,z:s.z+e*yf}}function Hc(s,t,e,i){let n=[],r=s.nodeAtGrid(t.i+e,t.j),o=s.nodeAtGrid(t.i,t.j+i),a=r&&s.getEdge(t.id,r.id),l=o&&s.getEdge(t.id,o.id);return a&&n.push({n:r,sx:-e,sz:i,kind:"walk"}),l&&n.push({n:o,sx:e,sz:-i,kind:"walk"}),l&&n.push({n:t,sx:-e,sz:i,kind:"cross"}),a&&n.push({n:t,sx:e,sz:-i,kind:"cross"}),n}var Ri=class{constructor(t){this.h=t,this.mode="walk",this.cur=null,this.prev=null,this.tgt=null,this.speed=Q(1.15,1.65),this.t=0,this.fleeFrom=null,this.fleeT=0,this.fight=null,this.home=null}place(t,e,i){this.cur={n:t,sx:e,sz:i},this.pickNext()}pickNext(){let t=m.city,e=this.cur,i=Hc(t,e.n,e.sx,e.sz);if(i.length>1&&this.prev&&(i=i.filter(o=>!(o.n===this.prev.n&&o.sx===this.prev.sx&&o.sz===this.prev.sz))),i.length||(i=Hc(t,e.n,e.sx,e.sz)),!i.length){this.mode="idle",this.t=5;return}let n=Me(i);if(n.kind==="cross"&&me(.55)){let o=i.filter(a=>a.kind==="walk");o.length&&(n=Me(o))}this.prev=this.cur,this.cur=n;let r=ia(n.n,n.sx,n.sz);this.tgt={x:r.x+Q(-.8,.8),z:r.z+Q(-.8,.8)}}resnap(){let t=m.city,e=this.h,i=Ct(Math.round((e.x-un)/He),0,qe-1),n=Ct(Math.round((e.z-fn)/He),0,ni-1),r=t.nodeAtGrid(i,n);if(!r||!r.nb.length){this.mode="wander",this.home={x:e.x,z:e.z};return}let o=e.x>=r.x?1:-1,a=e.z>=r.z?1:-1;this.prev=null,this.cur={n:r,sx:o,sz:a};let l=ia(r,o,a);this.tgt=l}flee(t,e,i){this.h.alive&&(this.mode="flee",this.fleeFrom={x:t,z:e},this.fleeT=i,this.h.cower=!1)}onDamage(t,e,i){let n=this.h;if(!(!n.alive||!t)){if(i==="melee"&&t.isPlayer&&me(.3)&&n.kind==="ped"){this.mode="fight",this.fight=t,this.t=12;return}this.flee(t.x,t.z,Q(8,14))}}update(t){let e=this.h;if(!e.alive||e.state!=="normal"){e.moveSpeed=0;return}switch(e.faceH=null,this.mode){case"walk":{if(!this.tgt){this.resnap();break}let i=this.tgt.x-e.x,n=this.tgt.z-e.z,r=Math.hypot(i,n);r<1?this.pickNext():(e.moveX=i/r,e.moveZ=n/r,e.moveSpeed=this.speed),e.blocked>1.5&&(e.blocked=0,this.pickNext()),me(t*.025)&&(this.mode="idle",this.t=Q(2,6));break}case"idle":{e.moveSpeed=0,this.t-=t,this.t<=0&&(this.mode=this.home?"wander":"walk");break}case"wander":{if(this.home||(this.home={x:e.x,z:e.z}),(!this.tgt||Math.hypot(this.tgt.x-e.x,this.tgt.z-e.z)<1||e.blocked>1.2)&&(e.blocked=0,this.tgt={x:this.home.x+Q(-14,14),z:this.home.z+Q(-14,14)},me(.4))){this.mode="idle",this.t=Q(3,9);break}let i=this.tgt.x-e.x,n=this.tgt.z-e.z,r=Math.hypot(i,n)||1;e.moveX=i/r,e.moveZ=n/r,e.moveSpeed=this.speed*.8;break}case"flee":{this.fleeT-=t;let i=e.x-this.fleeFrom.x,n=e.z-this.fleeFrom.z,r=Math.hypot(i,n)||1;if(i/=r,n/=r,e.blocked>.4){let o=this.slide||(this.slide=me(.5)?1:-1),a=-n*o,l=i*o;i=a,n=l,e.blocked>2&&(e.blocked=0,this.slide=-o)}e.moveX=i,e.moveZ=n,e.moveSpeed=5.6,this.fleeT<=0&&(this.mode="walk",this.resnap());break}case"cower":{e.moveSpeed=0,e.cower=!0,this.t-=t,this.t<=0&&(e.cower=!1,this.flee(this.fleeFrom.x,this.fleeFrom.z,Q(6,10)));break}case"fight":{let i=this.fight;if(this.t-=t,!i||!i.alive||this.t<=0||i.vehicle){this.mode="walk",this.resnap();break}let n=i.x-e.x,r=i.z-e.z,o=Math.hypot(n,r)||1;if(e.faceH=Math.atan2(n,r),o>25){this.mode="walk",this.resnap();break}o>1.3?(e.moveX=n/o,e.moveZ=r/o,e.moveSpeed=4.5):(e.moveSpeed=0,m.weapons.fire(e,{target:i}));break}}}},Wi=class{constructor(t,e={}){this.h=t,this.home={x:t.x,z:t.z},this.hostile=e.hostile??!1,this.target=null,this.accuracy=e.accuracy??.3,this.aggro=e.aggro??22,this.keep=e.keep??Q(7,13),this.strafeT=0,this.strafe=1,this.losT=0,this.los=!1,this.group=e.group||null,this.leash=e.leash??120,this.loseT=0}onDamage(t){if(t&&t!==this.h&&(this.hostile=!0,this.target=t,this.group))for(let e of this.group)e.ai&&e.ai!==this&&e.alive&&(e.ai.hostile=!0,e.ai.target=e.ai.target||t)}update(t){let e=this.h;if(!e.alive||e.state!=="normal"){e.moveSpeed=0;return}let i=m.player.human;if(!this.target&&i.alive){let f=Math.hypot(i.x-e.x,i.z-e.z);this.hostile&&f<60?this.target=i:f<this.aggro*.5&&m.player.armed()&&!i.vehicle&&(this.hostile=!0,this.target=i)}let n=this.target;if(!n||!n.alive||n.removed){this.target=null,e.faceH=null;let f=this.home.x-e.x,d=this.home.z-e.z,u=Math.hypot(f,d);u>3?(e.moveX=f/u,e.moveZ=d/u,e.moveSpeed=1.4):e.moveSpeed=0;return}let r=n.vehicle?n.vehicle.x:n.x,o=n.vehicle?n.vehicle.z:n.z,a=r-e.x,l=o-e.z,c=Math.hypot(a,l)||1;if(a/=c,l/=c,this.losT-=t,this.losT<=0&&(this.losT=.3,this.los=m.physics.los(e.x,e.z,r,o,e.y+1.5,(n.vehicle?n.vehicle.y:n.y)+1.2)),c>this.leash?(this.loseT+=t,this.loseT>6&&(this.target=null,this.hostile=!1,this.loseT=0)):this.loseT=0,e.faceH=Math.atan2(a,l),e.weapon==="fist"){c>1.3?(e.moveX=a,e.moveZ=l,e.moveSpeed=5):(e.moveSpeed=0,m.weapons.fire(e,{target:n}));return}if(this.strafeT-=t,this.strafeT<=0&&(this.strafeT=Q(1,2.5),this.strafe=me(.5)?1:-1),!this.los||c>this.keep+5?(e.moveX=a,e.moveZ=l,e.moveSpeed=5.2,e.blocked>.5&&(e.moveX=-l*this.strafe,e.moveZ=a*this.strafe)):c<this.keep-4?(e.moveX=-a,e.moveZ=-l,e.moveSpeed=2.5):(e.moveX=-l*this.strafe,e.moveZ=a*this.strafe,e.moveSpeed=1.6),e.aimT=1,this.los&&c<45){let f=n.vehicle?n.vehicle.speed:n.speed,d=this.accuracy*Ct(1.15-c/45,.2,1)*(f>6?.55:1)*(n.vehicle?.7:1);n.isPlayer&&m.player.diffEase&&(d*=m.player.diffEase),m.weapons.fire(e,{target:n,hitChance:d})}}},na=class{constructor(){this.PedBrain=Ri,this.spawnT=0,this.gangT=0,this.gangSpots=[];for(let t of m.city.lots)t.d==="D"&&this.gangSpots.push({x:(t.x0+t.x1)/2+Q(-10,10),z:t.z1-2,members:[]})}desired(){let t=m.settings.quality;return t==="low"?14:t==="high"?34:24}update(t){for(let e of m.humans)(e.ai&&!e.removed&&!e.vehicle||e.vehicle&&e.ai&&e.ai.inCar)&&e.ai.update(t);if(this.spawnT-=t,this.spawnT<=0){this.spawnT=.3;let e=m.player.pos();this.cull(e),m.humans.filter(n=>n.kind==="ped"&&!n.vehicle&&!n.removed&&n.alive).length<this.desired()&&this.trySpawn(e)}this.gangT-=t,this.gangT<=0&&(this.gangT=1,this.updateGangs())}cull(t){for(let e of m.humans){if(e.removed||e.isPlayer||e.vehicle||e.persistent||e.kind==="cop"&&e.ai&&e.ai.unit&&!e.ai.unit.released)continue;let i=Math.hypot(e.x-t.x,e.z-t.z);(i>210||e.state==="dead"&&(e.deadT>40||i>120))&&(e.removed=!0)}}trySpawn(t){let e=m.city;if(t.x>pt.maxX-120&&me(.45)){let i=Q(pt.maxX+25,bt.maxX-25),n=t.z+Q(-140,140),r=Math.hypot(i-t.x,n-t.z);if(r>30&&r<150&&n>bt.minZ+20&&n<bt.maxZ-20){let o=ri("ped",i,n,{shirt:Me([15921386,13124154,3829413,14727242,3108714,14273456]),pants:Me([3829413,13124154,2766160,14205040,15131352,5991226])});o.ai=new Ri(o),o.ai.mode="wander",o.ai.home={x:i,z:n};return}}for(let i=0;i<6;i++){let n=Ct(Math.round((t.x-un)/He)+dr(-2,2),0,qe-1),r=Ct(Math.round((t.z-fn)/He)+dr(-2,2),0,ni-1),o=e.nodeAtGrid(n,r);if(!o||!o.nb.length)continue;let a=me(.5)?1:-1,l=me(.5)?1:-1,c=Hc(e,o,a,l).filter(_=>_.kind==="walk");if(!c.length)continue;let h=Me(c),f=ia(o,a,l),d=ia(h.n,h.sx,h.sz),u=Q(.1,.9),x=f.x+(d.x-f.x)*u,y=f.z+(d.z-f.z)*u,g=Math.hypot(x-t.x,y-t.z);if(g<35||g>160||g<70&&m.traffic.visible(x,y,m.camera))continue;let p=ri("ped",x,y);if(p.ai=new Ri(p),p.ai.prev={n:o,sx:a,sz:l},p.ai.cur=h,p.ai.tgt=d,me(.2)){let _=ri("ped",x+.9,y+.6);_.ai=new Ri(_),_.ai.prev={n:o,sx:a,sz:l},_.ai.cur=h,_.ai.tgt={x:d.x+.8,z:d.z+.6},_.ai.speed=p.ai.speed}return}}updateGangs(){let t=m.player.pos();for(let e of this.gangSpots){e.members=e.members.filter(n=>!n.removed);let i=Math.hypot(e.x-t.x,e.z-t.z);if(i<140&&i>45&&e.members.length===0&&!e.cleared){let n=[],r=dr(2,4);for(let o=0;o<r;o++){let a=ri("gang",e.x+Q(-4,4),e.z+Q(-3,1),{shirt:Me([4860510,3809864,6042992]),pants:1776411,hair:789516,health:90,weapon:me(.6)?"pistol":me(.5)?"smg":"fist",money:dr(30,120)});a.ai=new Wi(a,{accuracy:.28,aggro:18,group:n}),a.h=Q(0,6.28),n.push(a),e.members.push(a)}}else if(i>220&&e.members.length){for(let n of e.members)n.persistent||(n.removed=!0);e.members=[]}}}panic(t,e,i,n){for(let r of m.humans){if(r.removed||!r.alive||r.vehicle||!(r.ai instanceof Ri)||r.ai.mode==="fight"||r.ai.mode==="flee"||r.ai.mode==="cower")continue;let o=Math.hypot(r.x-t,r.z-e);if(!(o>i))if(me(.18)&&o<i*.5)r.ai.mode="cower",r.ai.t=Q(3,7),r.ai.fleeFrom={x:t,z:e};else{let a=n?n.x:t,l=n?n.z:e;r.ai.flee(a,l,Q(7,14))}}for(let r of m.vehicles)r.ai&&r.ai.onShot&&Math.hypot(r.x-t,r.z-e)<i*.7&&(r.ai.panicT=Math.max(r.ai.panicT||0,Q(6,12)))}};var vf=[0,20,200,650,1500,3e3],py={shoot:4,punch:8,punchcop:160,hitped:35,kill:70,killcop:420,hitcop:160,shootcop:120,copcar:420,carboom:60,rampolice:90,carjack:30,stealcop:220,robbery:1500},_f={shirt:2772890,pants:1120295,hair:989747,bald:!1},sa=class{constructor(t){this.scene=t,this.level=0,this.heat=0,this.lastSeen={x:0,z:0},this.unseenT=0,this.seen=!1,this.checkT=0,this.units=[],this.heli=null,this.spawnT=0,this.radius=0}get searchRadius(){return 80+this.level*30}copNear(t,e,i){for(let n of m.humans)if(n.kind==="cop"&&n.alive&&!n.removed&&Math.hypot(n.x-t,n.z-e)<i)return!0;for(let n of m.vehicles)if(n.isPolice&&n.driver&&!n.removed&&Math.hypot(n.x-t,n.z-e)<i)return!0;return!1}crime(t,e,i){if(!m.player||m.player.dead||m.player.busted||m.missions&&m.missions.noCops)return;let n=py[t]||0;this.level===0&&!this.copNear(e,i,60)&&(t==="shoot"||t==="punch"||t==="carjack"||t==="hitped")&&(n*=.5),this.heat+=n;let r=0;for(let o=5;o>=1;o--)if(this.heat>=vf[o]){r=o;break}if(r>this.level&&this.setLevel(r),this.level>0){let o=m.player.pos();this.lastSeen={x:o.x,z:o.z},this.unseenT=0}}setLevel(t){if(t=Ct(t,0,5),t>this.level&&(m.audio.wantedUp(),Xe(60),this.level===0)){let e=m.player.pos();this.lastSeen={x:e.x,z:e.z}}this.level=t,this.heat=Math.max(this.heat,vf[t]),this.unseenT=0,m.stats.maxWanted=Math.max(m.stats.maxWanted,t)}clear(t=!1){this.level>0&&!t&&(m.hud.toast("Lost them"),m.audio.chime()),this.level=0,this.heat=0,this.unseenT=0;for(let e of this.units)this.release(e);this.units=[]}release(t){t.released=!0;let e=t.car;if(e&&!e.removed&&!e.wrecked&&e.driver&&!e.driver.isPlayer){e.siren=!1;let i=ki(m.city,e.x,e.z),n=m.city.nodes[i.nb[0]];e.ai=new Fn(e,n,i,0)}}update(t){let e=m.player.human;if(this.units=this.units.filter(i=>{if(i.released)return!1;let n=i.cops.some(o=>!o.removed&&o.alive),r=i.car&&!i.car.removed&&!i.car.wrecked;return!n&&!r?!1:!n&&r&&!i.car.driver?(i.released=!0,!1):!0}),this.level>0&&m.player.alive()){if(this.checkT-=t,this.checkT<=0&&(this.checkT=.25,this.seen=this.canSee(e),this.seen)){let r=m.player.pos();this.lastSeen={x:r.x,z:r.z}}this.seen?this.unseenT=0:this.unseenT+=t;let i=m.player.pos(),n=Math.hypot(i.x-this.lastSeen.x,i.z-this.lastSeen.z)>this.searchRadius;if((this.unseenT>6+this.level*2&&n||this.unseenT>24+this.level*6)&&this.clear(),this.spawnT-=t,this.spawnT<=0){this.spawnT=2.2;let r=[0,1,2,3,4,5][this.level];this.units.filter(a=>a.car&&!a.car.wrecked&&!a.car.removed).length<r&&this.spawnUnit();for(let a of this.units){if(!a.car||a.car.removed)continue;let l=Math.hypot(a.car.x-i.x,a.car.z-i.z),c=a.cops.every(h=>h.removed||!h.alive||Math.hypot(h.x-i.x,h.z-i.z)>220);if(l>320&&c){a.car.removed=!0;for(let h of a.cops)h.removed=!0;a.released=!0}}}this.level>=3&&(!this.heli||this.heli.dead)&&(this.heli||(this.heli=new Vc(this.scene)),this.heli.dead&&this.heli.deadT>25&&this.heli.reset(),this.heli.active||this.heli.spawn())}else this.seen=!1;this.heli&&this.heli.update(t,this.level)}canSee(t){let e=m.player.pos(),i=(t.vehicle?t.vehicle.y:t.y)+1.2;for(let n of m.humans){if(n.kind!=="cop"||!n.alive||n.removed)continue;let r=Math.hypot(n.x-e.x,n.z-e.z);if(r<18||r<75&&m.physics.los(n.x,n.z,e.x,e.z,n.y+1.5,i))return!0}return!!(this.heli&&this.heli.active&&!this.heli.dead&&Math.hypot(this.heli.x-e.x,this.heli.z-e.z)<65)}spawnUnit(){let t=m.city,e=m.player.pos(),i=null;for(let f=0;f<20;f++){let d=Me(t.nodes);if(!d.nb.length)continue;let u=Math.hypot(d.x-e.x,d.z-e.z);if(!(u<110||u>230)&&!(m.traffic.visible(d.x,d.z,m.camera)&&u<160)){i=d;break}}if(!i)return;let n=Math.atan2(e.x-i.x,e.z-i.z),r=i.x+Math.cos(n)*pi[0],o=i.z-Math.sin(n)*pi[0];if(m.vehicles.some(f=>!f.removed&&Math.hypot(f.x-r,f.z-o)<8))return;let a=Ai("police",r,o,n);a.siren=!0;let l={car:a,cops:[],released:!1};a.policeUnit=l;let c=ri("cop",r,o,{..._f,weapon:this.level>=4?"smg":"pistol",health:100,armor:this.level>=4?50:0,money:0});c.enterVehicle(a,1);let h=ri("cop",r,o,{..._f,weapon:this.level>=3?"shotgun":"pistol",health:100,armor:this.level>=4?50:0,money:0});h.enterVehicle(a,-1),l.cops.push(c,h),a.ai=new _r(a,l),c.ai=new ra(c,l),h.ai=new ra(h,l),this.units.push(l)}bust(){m.player.dead||m.player.busted||m.player.onBusted()}},_r=class{constructor(t,e){this.v=t,this.unit=e,this.f=new Ws,this.routeT=0,this.mem={},this.los=!1,this.losT=0,this.deployed=!1}onHit(){}update(t){let e=this.v;if(e.wrecked||!e.driver||e.driver.isPlayer){e.driver||(e.throttle=0,e.handbrake=!0);return}let i=m.player.human,n=m.police;if(n.level===0)return;let r=i.vehicle||i,o=r.x,a=r.z,l=Math.hypot(o-e.x,a-e.z);this.losT-=t,this.losT<=0&&(this.losT=.4,this.los=l<90&&m.physics.los(e.x,e.z,o,a,e.y+1.2,r.y+1));let c=i.vehicle&&i.vehicle.speed<2&&n.level===1;if((!i.vehicle||c)&&l<22&&this.los){if(e.throttle=e.vF>1?-1:0,e.steer=0,e.handbrake=e.speed<4,e.speed<2.5)for(let y of this.unit.cops)y.vehicle===e&&y.alive&&y.exitVehicle();return}if(l<70&&this.los){let y=Ct(l/18,0,1.4),g=o+(r.vx||0)*y,p=a+(r.vz||0)*y,_=Ct(l*1.1,10,e.T.maxSpeed*.95);rs(e,g,p,_,t,this.mem);return}if(this.routeT-=t,this.routeT<=0||this.f.done){this.routeT=1.6;let y=Math.sin(e.h),g=Math.cos(e.h),p=ki(m.city,e.x+y*55,e.z+g*55),_=ki(m.city,o,a),v=ko(m.city,p,_).map(I=>({x:I.x,z:I.z}));v.push({x:o,z:a}),this.f.set(v)}let h=8+e.speed*.5,f=this.f.pts[0],d;if(this.f.i===0&&f&&Math.hypot(f.x-e.x,f.z-e.z)>h+4?d={x:f.x,z:f.z}:d=this.f.target(e.x,e.z,h),!d)return;let x=Math.abs(ii(Math.atan2(d.x-e.x,d.z-e.z)-e.h))>.5?13:34;rs(e,d.x,d.z,x,t,this.mem)}},ra=class{constructor(t,e){this.h=t,this.unit=e,this.combat=new Wi(t,{hostile:!0,accuracy:.3,keep:Q(7,13),leash:400}),this.arrestT=0,this.inCar=!0,this.shootT=0}onDamage(t){t&&t.isPlayer&&m.police.crime("hitcop",this.h.x,this.h.z)}update(t){let e=this.h,i=m.police,n=m.player.human,r=this.unit.car;if(e.vehicle){if(this.inCar=!0,e.vehicle.passenger===e&&i.level>=2&&n.alive){let h=n.vehicle?n.vehicle.x:n.x,f=n.vehicle?n.vehicle.z:n.z,d=Math.hypot(h-e.x,f-e.z);this.shootT-=t,d<32&&this.shootT<=0&&(this.shootT=Q(.7,1.4),e.h=Math.atan2(h-e.x,f-e.z),m.weapons.fire(e,{target:n,hitChance:.14}))}return}if(this.inCar=!1,!e.alive||e.state!=="normal")return;let o=r&&!r.removed&&!r.wrecked;if(i.level===0||this.unit.released){o&&Math.hypot(r.x-e.x,r.z-e.z)<45?this.goToCar(r,t):e.moveSpeed=0;return}let a=n.vehicle?n.vehicle.x:n.x,l=n.vehicle?n.vehicle.z:n.z,c=Math.hypot(a-e.x,l-e.z);if(n.vehicle&&n.vehicle.speed>7&&c>22&&o&&Math.hypot(r.x-e.x,r.z-e.z)<35){this.goToCar(r,t);return}if(i.level===1){e.faceH=Math.atan2(a-e.x,l-e.z);let h=n.vehicle?3:1.7;c>h?(e.moveX=(a-e.x)/c,e.moveZ=(l-e.z)/c,e.moveSpeed=5.2,this.arrestT=Math.max(0,this.arrestT-t)):(e.moveSpeed=0,(n.vehicle?n.vehicle.speed<1.2:n.speed<3.5)&&(this.arrestT+=t),m.player.arrestProgress=Math.max(m.player.arrestProgress||0,this.arrestT/1.2),this.arrestT>1.2&&i.bust());return}this.combat.target=n,this.combat.hostile=!0,this.combat.accuracy=.15+i.level*.04,this.combat.update(t)}goToCar(t,e){let i=this.h,n=t.driver?-1:1;if(n===-1&&t.passenger){i.moveSpeed=0;return}let r=t.doorPos(n),o=r.x-i.x,a=r.z-i.z,l=Math.hypot(o,a);i.faceH=null,l<1.6?(i.enterVehicle(t,n),n===1&&!(t.ai instanceof _r)&&(t.ai=new _r(t,this.unit))):(i.moveX=o/l,i.moveZ=a/l,i.moveSpeed=5)}},Vc=class{constructor(t){let e=new Ei,i=dn(),n=new Kt(new te(2.4,2.2,5),new Be({color:1780298}));n.position.y=0;let r=new Kt(new te(2.2,1.6,1.4),new Be({color:9418968}));r.position.set(0,.1,3);let o=new Kt(new te(2.45,.4,5.02),new Be({color:16777215}));o.position.y=-.3;let a=new Kt(new te(.5,.5,5.5),new Be({color:1780298}));a.position.set(0,.5,-5);let l=new Kt(new te(.2,1.6,1),new Be({color:1780298}));l.position.set(0,1.1,-7.5);let c=new te(.15,.15,4.5),h=new Be({color:2236962}),f=new Kt(c,h);f.position.set(1.1,-1.5,0);let d=new Kt(c,h);d.position.set(-1.1,-1.5,0),this.rotor=new Kt(new te(.3,.06,11),new Be({color:1118481})),this.rotor.position.y=1.35,this.rotor2=this.rotor.clone(),this.rotor2.rotation.y=Math.PI/2,this.rotor.add(this.rotor2),this.rotor2.position.set(0,0,0),this.tail=new Kt(new te(.05,1.6,.2),h),this.tail.position.set(.3,1.1,-7.5),e.add(n,r,o,a,l,f,d,this.rotor,this.tail);for(let x of e.children)x.castShadow=!0;let u=new je(6,40,20,1,!0);u.translate(0,-20,0),this.beam=new Kt(u,new Oe({color:15267071,transparent:!0,opacity:.12,blending:ei,depthWrite:!1,side:Ge})),t.add(this.beam),this.group=e,this.group.visible=!1,this.beam.visible=!1,t.add(e),this.active=!1,this.dead=!1,this.deadT=0,this.health=600,this.x=0,this.y=60,this.z=0,this.h=0,this.vx=0,this.vz=0,this.vy=0,this.orbit=0,this.fireT=0,this.lightOn=0}reset(){this.dead=!1,this.active=!1,this.health=600,this.group.visible=!1,this.beam.visible=!1}spawn(){let t=m.player.pos(),e=Q(0,Math.PI*2);this.x=t.x+Math.cos(e)*200,this.z=t.z+Math.sin(e)*200,this.y=80,this.vx=this.vz=this.vy=0,this.active=!0,this.dead=!1,this.health=600,this.group.visible=!0}damage(t,e){this.dead||(this.health-=t,e&&e.isPlayer&&m.police.crime("shootcop",this.x,this.z),this.health<=0&&(this.dead=!0,this.deadT=0,this.spinV=3,m.fx.explosion(this.x,this.y,this.z,1),e&&e.isPlayer&&m.hud.toast("Chopper down")))}ceiling(t,e){let i=0;return m.physics.query(t-40,e-40,t+40,e+40,n=>{n.h>i&&(i=n.h)}),i}update(t,e){if(!this.active)return;if(this.rotor.rotation.y+=t*30,this.dead){if(this.deadT+=t,this.y>-5){this.vy-=14*t,this.y+=this.vy*t,this.x+=this.vx*t,this.z+=this.vz*t,this.h+=this.spinV*t,Math.random()<.5&&m.fx.fire(this.x,this.y,this.z);let d=m.physics.groundHeight(this.x,this.z);this.y<d+1&&(this.y=-50,m.fx.explosion(this.x,d+1,this.z,1.5),m.weapons.blast(this.x,d+1,this.z,10,150,null),this.group.visible=!1,this.beam.visible=!1)}this.sync();return}let i=m.player.human,n=m.player.pos();if(e<3){this.vx=Se(this.vx,(this.x-n.x)*.2,ze(1,t)),this.vz=Se(this.vz,(this.z-n.z)*.2,ze(1,t)),this.y+=t*8,this.x+=this.vx*t,this.z+=this.vz*t,Math.hypot(this.x-n.x,this.z-n.z)>350&&this.reset(),this.sync();return}this.orbit+=t*.35;let r=n.x+Math.cos(this.orbit)*30,o=n.z+Math.sin(this.orbit)*30;this.ceilT=(this.ceilT||0)-t,this.ceilT<=0&&(this.ceilT=1,this.ceil=this.ceiling(this.x,this.z));let a=Math.max(38,(this.ceil||0)+18),l=r-this.x,c=o-this.z,h=Math.hypot(l,c)||1,f=Math.min(38,h*.8);if(this.vx=Se(this.vx,l/h*f,ze(1.2,t)),this.vz=Se(this.vz,c/h*f,ze(1.2,t)),this.x+=this.vx*t,this.z+=this.vz*t,this.y=Se(this.y,a,ze(.8,t)),this.h=Math.atan2(n.x-this.x,n.z-this.z),this.fireT-=t,e>=4&&this.fireT<=0&&i.alive&&(this.fireT=Q(.5,1),m.physics.raycast(this.x,this.z,n.x,n.z,this.y,1.5,!0)>=.999)){let u=me(.12),x=n.x+(u?0:Q(-3,3)),y=n.z+(u?0:Q(-3,3));m.fx.tracer(this.x,this.y-1,this.z,x,(i.vehicle?i.vehicle.y:i.y)+1,y),m.audio.gun("rifle",this.x,this.z),u&&(i.vehicle?i.vehicle.damage(25,null):i.damage(9,null,"gun"))}this.sync()}sync(){let t=this.group;t.position.set(this.x,this.y,this.z);let e=this.vx*Math.sin(this.h)+this.vz*Math.cos(this.h);t.rotation.set(Ct(e*.008,-.25,.25),this.h,0,"YXZ");let i=m.sky?m.sky.night:0,n=!this.dead&&i>.3&&this.active;if(this.beam.visible=n,n){let r=m.player.pos();this.beam.position.set(this.x,this.y-1.2,this.z);let o=new D(r.x-this.x,(r.y||0)-this.y,r.z-this.z),a=o.length();o.normalize(),this.beam.quaternion.setFromUnitVectors(new D(0,-1,0),o),this.beam.scale.set(1,a/40,1)}}rayHit(t,e,i,n,r,o){if(!this.active||this.dead)return 1/0;let a=this.x-t,l=this.y-e,c=this.z-i,h=a*n+l*r+c*o;if(h<0)return 1/0;let f=t+n*h-this.x,d=e+r*h-this.y,u=i+o*h-this.z;return f*f+d*d+u*u<9?h:1/0}};var Gc={health:{color:16726891,glow:[1,.25,.4]},armor:{color:2795775,glow:[.2,.6,1]},cash:{color:7127114,glow:[.4,1,.4]},weapon:{color:15909424,glow:[1,.85,.3]},shell:{color:16747130,glow:[1,.55,.45]}};function my(s){switch(s){case"health":{let t=new te(.75,.25,.25),e=new te(.25,.75,.25);return[t,e]}case"armor":return[new re(.4,.3,.7,6)];case"cash":return[new te(.6,.3,.35)];case"weapon":return[new te(.15,.25,.8),new te(.12,.35,.15).translate(0,-.2,-.2)];case"shell":return[new je(.45,.7,7)];default:return[new te(.5,.5,.5)]}}var oa=class{constructor(t){this.scene=t,this.items=[],this.markers=[],this.arrows=[],this.geos={},this.mats={};for(let e of Object.keys(Gc))this.geos[e]=my(e),this.mats[e]=new Oe({color:Gc[e].color});this.markerGeo=new re(1,1,1,28,1,!0),this.markerGeo.translate(0,.5,0),this.arrowGeo=new je(.6,1.2,4),this.arrowGeo.rotateX(Math.PI),this.t=0,this.near=null,this.serviceCool=0,this.placeWorldPickups()}add(t,e,i,n={}){let r=n.y??m.physics.groundHeight(e,i)+.9,o=new Ei;for(let l of this.geos[t])o.add(new Kt(l,this.mats[t]));o.position.set(e,r,i),this.scene.add(o);let a={type:t,x:e,y:r,z:i,mesh:o,active:!0,respawn:n.respawn??0,timer:0,amount:n.amount??50,weapon:n.weapon,ttl:n.ttl??0,id:n.id};return this.items.push(a),a}dropCash(t,e,i){this.add("cash",t+Q(-.5,.5),e+Q(-.5,.5),{amount:i,ttl:30})}placeWorldPickups(){let t=m.city.places,e=[["health",t.hospital.x+4,t.hospital.z-2],["health",t.safehouse.x-2,t.safehouse.z+6],["armor",t.police.x+6,t.police.z-1],["weapon",t.safehouse.x-3,t.safehouse.z-8,"pistol"],["weapon",t.docksYard.x+10,t.docksYard.z-8,"smg"],["weapon",t.stadium.x-30,t.stadium.z,"shotgun"],["weapon",t.pierEnd.x-20,4,"smg"],["armor",t.docksYard.x-12,t.docksYard.z-10],["health",t.park.x-20,t.park.z],["health",t.plaza.x+8,t.plaza.z],["weapon",t.park.x+30,t.park.z-60,"rifle"],["armor",t.beach.x+40,t.beach.z-200],["health",t.beach.x+20,t.beach.z+180],["weapon",t.garage.x+5,t.garage.z+2,"pistol"]];for(let[n,r,o,a]of e)this.add(n,r,o,{respawn:60,weapon:a,amount:n==="weapon"?a==="pistol"?36:a==="rifle"?60:a==="shotgun"?16:90:50});let i=m.save.shells||[];m.city.collect.forEach((n,r)=>{if(i.includes(r))return;let o=Math.max(m.physics.groundHeight(n.x,n.z),oe)+1.1;this.add("shell",n.x,n.z,{y:o,id:r})})}collect(t){let e=m.player,i=e.human;switch(t.type){case"health":if(i.health>=i.maxHealth)return!1;i.health=Math.min(i.maxHealth,i.health+t.amount),m.hud.toast("Health");break;case"armor":if(i.armor>=100)return!1;i.armor=Math.min(100,i.armor+t.amount),m.hud.toast("Armor");break;case"cash":e.addMoney(t.amount);break;case"weapon":{let r=t.weapon,o=!e.owns(r);e.giveWeapon(r,t.amount),m.hud.toast(`${Ye[r].name}${o?"":" ammo"} +${t.amount}`);break}case"shell":{let r=m.save;r.shells=r.shells||[],r.shells.includes(t.id)||r.shells.push(t.id);let o=r.shells.length;e.addMoney(100),m.hud.bigMessage(`Shell ${o} of 20`,o>=20?"That was the last one. $10,000 bonus.":"","info",2.2),o>=20&&e.addMoney(1e4),m.saveGame();break}}m.audio.pickup(),Xe(20);let n=Gc[t.type].glow;return m.fx.pickupSparkle(t.x,t.y,t.z,n[0],n[1],n[2]),!0}addMarker(t,e,i={}){let n=new ct(i.color??15909424),r=new Pe({uniforms:{uColor:{value:n},uTime:{value:0}},vertexShader:"varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`uniform vec3 uColor; uniform float uTime; varying float vY;
        void main(){ float a = (1.0 - vY) * (0.55 + 0.15 * sin(uTime * 4.0 + vY * 6.0)); gl_FragColor = vec4(uColor * a, 1.0); }`,transparent:!0,depthWrite:!1,blending:ei,side:Ge}),o=i.r??1.6,a=i.h??2.2,l=new Kt(this.markerGeo,r),c=i.y??m.physics.groundHeight(t,e);l.position.set(t,c,e),l.scale.set(o,a,o),this.scene.add(l);let h={x:t,z:e,y:c,r:o,mesh:l,color:n,active:!0,onEnter:i.onEnter,blip:i.blip??null,label:i.label,vehicleOnly:!!i.vehicleOnly,footOnly:!!i.footOnly,inside:!1,kind:i.kind||"generic",hidden:!1,route:!!i.route};return this.markers.push(h),h}removeMarker(t){t&&(t.active=!1,this.scene.remove(t.mesh),t.mesh.material.dispose(),this.markers=this.markers.filter(e=>e!==t))}addArrow(t,e=15909424){let i=new Kt(this.arrowGeo,new Oe({color:e}));this.scene.add(i);let n={target:t,mesh:i,color:e};return this.arrows.push(n),n}removeArrow(t){t&&(this.scene.remove(t.mesh),this.arrows=this.arrows.filter(e=>e!==t))}setupServices(){let t=m.city.places;this.addMarker(t.gunshop.x,t.gunshop.z,{color:15263976,footOnly:!0,blip:{color:"#e8e8e8",icon:"gun"},label:"Solace Arms. Guns, ammo and armor.",kind:"shop",onEnter:()=>m.hud.openShop("guns")}),this.addMarker(t.carlot.x,t.carlot.z,{color:15263976,footOnly:!0,blip:{color:"#e8e8e8",icon:"car"},label:"Sunset Motors. Cars for sale.",kind:"shop",onEnter:()=>m.hud.openShop("cars")});for(let e of["respray1","respray2"])this.addMarker(t[e].x,t[e].z,{color:15263976,r:3,blip:{color:"#e8e8e8",icon:"spray"},label:"Quick Coat. Respray for $100.",kind:"respray",onEnter:i=>this.respray(i)});this.addMarker(t.safehouse.x,t.safehouse.z,{color:7127114,footOnly:!0,blip:{color:"#6cc04a",icon:"home"},label:"Hotel Flamingo. Your room: save and heal.",kind:"save",onEnter:()=>this.safehouse()})}respray(t){let e=m.player;if(!t){m.hud.hint("You need a car for a respray.",3);return}if(!(this.serviceCool>0)){if(t.isPolice){m.hud.hint("They won't touch a cop car.",3);return}if(e.money<100){m.hud.hint("A respray costs $100.",3);return}this.serviceCool=6,e.addMoney(-100),t.health=t.maxHealth,t.burnT=0,t.color.setHex(Me(t.T.colors.length>1?t.T.colors:[9051172,2046835,16053492,1052690])),m.police.level>0&&m.police.clear(!0),m.hud.fade(),m.hud.bigMessage("Resprayed","Car fixed. The cops lost you.","info",2),m.audio.spray()}}safehouse(){if(this.serviceCool>0)return;this.serviceCool=8;let t=m.player.human;t.health=t.maxHealth,m.saveGame(),m.hud.bigMessage("Game saved","Health restored","info",2),m.audio.chime()}buyCar(t,e){let i=m.player;if(i.money<e)return!1;i.addMoney(-e);let n=m.city.places.carlot,r=Ai(t,n.x,n.z+6,Math.PI/2);return r.persistent=!0,i.lastVehicle=r,m.audio.chime(),r}update(t){this.t+=t,this.serviceCool=Math.max(0,this.serviceCool-t);let i=m.player.human,n=i.vehicle,r=n?n.x:i.x,o=n?n.z:i.z,a=n?n.y:i.y;for(let c of this.items){if(!c.active){c.respawn>0&&(c.timer-=t,c.timer<=0&&(c.active=!0,c.mesh.visible=!0));continue}if(c.ttl>0&&(c.ttl-=t,c.ttl<=0)){c.active=!1,c.dead=!0,this.scene.remove(c.mesh);continue}c.mesh.rotation.y=this.t*2.2,c.mesh.position.y=c.y+Math.sin(this.t*3+c.x)*.15,Math.hypot(c.x-r,c.z-o)<(n?2.6:1.3)&&Math.abs(c.y-a-1)<2.2&&i.alive&&this.collect(c)&&(c.active=!1,c.mesh.visible=!1,c.respawn>0?c.timer=c.respawn:(c.dead=!0,this.scene.remove(c.mesh)))}this.items=this.items.filter(c=>!c.dead);let l=null;for(let c of this.markers){if(c.mesh.material.uniforms.uTime.value=this.t,c.mesh.visible=!c.hidden&&Math.hypot(c.x-r,c.z-o)<400,c.hidden||!c.onEnter)continue;let h=Math.hypot(c.x-r,c.z-o),f=h<c.r+(n?1:.2)&&Math.abs(a-c.y)<3;f&&!c.inside&&i.alive?(c.inside=!0,c.vehicleOnly&&!n?m.hud.hint("You need a vehicle for this.",2):c.footOnly&&n?m.hud.hint("Get out of the car to go in.",2):c.onEnter(n)):f||(c.inside=!1),h<30&&c.label&&(!l||h<l.d)&&(l={m:c,d:h})}this.near=l;for(let c of this.arrows){let h=c.target;if(!h||h.removed){c.mesh.visible=!1;continue}c.mesh.visible=!0;let f=h.T?h.y+h.T.hgt+1.6:h.y+2.6;c.mesh.position.set(h.x,f+Math.sin(this.t*4)*.25,h.z),c.mesh.rotation.y=this.t*2}}};var oi="<b>Rosa:</b> ",On="<b>Dex:</b> ",aa=class{constructor(t,e){this.mgr=t,this.def=e,this.stage=0,this.t=0,this.stageT=0,this.tracked={markers:[],arrows:[],vehicles:[],humans:[]},this.timerLeft=0,this.onTimer=null,this.data={},this.blips=[]}objective(t){m.hud.objective(t)}say(t){m.hud.subtitles(t)}next(t){this.stage=t??this.stage+1,this.stageT=0}marker(t,e,i={}){let n=m.pickups.addMarker(t,e,{color:15909424,...i});return n.blip=i.blip??{color:"#f2c230",icon:"dot"},n.route=i.route??!0,this.tracked.markers.push(n),m.missions.setGps(t,e),n}dropMarker(t){m.pickups.removeMarker(t),this.tracked.markers=this.tracked.markers.filter(e=>e!==t),m.missions.setGps(null)}arrow(t,e){let i=m.pickups.addArrow(t,e);return this.tracked.arrows.push(i),i}dropArrow(t){m.pickups.removeArrow(t),this.tracked.arrows=this.tracked.arrows.filter(e=>e!==t)}blip(t,e="#ff3b3b"){t.blip={color:e},this.blips.push(t)}car(t,e,i,n,r){let o=Ai(t,e,i,n,r);return o.persistent=!0,this.tracked.vehicles.push(o),o}enemy(t,e,i={}){let n=ri(i.kind||"gang",t,e,{shirt:i.shirt??Me([4860510,3809864,6042992]),pants:i.pants??1776411,hair:i.hair??789516,weapon:i.weapon??"pistol",health:i.health??90,armor:i.armor??0,money:i.money??60,scale:i.scale});return n.persistent=!0,n.ai=new Wi(n,{hostile:i.hostile??!1,accuracy:i.accuracy??.26,aggro:i.aggro??30,group:i.group}),i.group&&i.group.push(n),this.tracked.humans.push(n),this.blip(n,"#ff3b3b"),n}timer(t,e){this.timerLeft=t,this.onTimer=e}clearTimer(){this.timerLeft=0,this.onTimer=null,m.hud.timer("")}pass(){this.mgr.pass()}fail(t){this.mgr.fail(t)}cleanup(t){for(let e of this.tracked.markers)m.pickups.removeMarker(e);for(let e of this.tracked.arrows)m.pickups.removeArrow(e);for(let e of this.blips)e.blip=null;for(let e of this.tracked.vehicles)e.persistent=!1,e.locked=!1,e.ai&&e.ai.race&&(e.ai=null),!t&&e!==m.player.human.vehicle&&e.driver&&!e.driver.isPlayer&&(e.removedSoon=!0);for(let e of this.tracked.humans)e.persistent=!1,e.alive&&e.ai instanceof Wi&&!t&&(e.ai.hostile=!1,e.ai.target=null);m.hud.objective(""),m.hud.timer(""),m.missions.setGps(null)}playerIn(t){return m.player.human.vehicle===t}near(t,e,i){let n=m.player.pos();return Math.hypot(n.x-t,n.z-e)<i}};function gy(s){return s.map(([t,e])=>({x:Ht(t),z:qt(e)}))}var Wc=class{constructor(t,e,i){this.v=t,this.cps=e,this.i=0,this.mem={},this.skill=i,this.frozen=!0,this.race=!0,this.done=!1}progress(){let t=this.cps[Math.min(this.i,this.cps.length-1)];return this.i*1e4-Math.hypot(t.x-this.v.x,t.z-this.v.z)}update(t){let e=this.v;if(this.frozen||this.done||e.wrecked||!e.driver){e.throttle=0,e.handbrake=!0,e.steer=0;return}let i=this.cps,n=i[this.i],r=Math.hypot(n.x-e.x,n.z-e.z);if(r<11){if(this.i++,this.i>=i.length){this.done=!0,this.finishT=m.time;return}n=i[this.i],r=Math.hypot(n.x-e.x,n.z-e.z)}let o=i[Math.min(this.i+1,i.length-1)],a=this.i>0?i[this.i-1]:{x:e.x,z:e.z},l=Math.atan2(n.x-a.x,n.z-a.z),c=Math.atan2(o.x-n.x,o.z-n.z),h=Math.abs(ii(c-l))>.5&&this.i<i.length-1,f=n.x,d=n.z;if(h&&r<22){let p=(22-r)/22*.6;f+=(o.x-n.x)/(Math.hypot(o.x-n.x,o.z-n.z)||1)*12*p,d+=(o.z-n.z)/(Math.hypot(o.x-n.x,o.z-n.z)||1)*12*p}let u=e.speed,x=e.T.maxSpeed*.86*this.skill,y=u*u/(2*14)+10;h&&r<y&&(x=14);let g=m.missions.race;if(g){let p=this.progress()-g.playerProgress();p>3e3?x*=.85:p<-6e3&&(x*=1.12)}rs(e,f,d,x,t,this.mem)}},Xc={kings:{title:"Ocean Drive Run",nodes:[[13,3],[13,5],[13,8],[11,8],[9,8],[9,6],[9,4],[9,1],[11,1],[13,1]],start:{i:13,j:1,dirZ:1},reward:3e3},coastal:{title:"Coastal Sprint",nodes:[[14,7],[14,5],[14,3],[14,1],[14,0],[12,0],[10,0],[8,0],[6,0]],start:{i:14,j:9,dirZ:-1},reward:1200}},Mf=[{id:"welcome",title:"Ride Along",giver:"club",reward:500,start(s){s.say([[oi+"You're Kai? You're late.",2.6],[oi+"Dex needs a driver. His shop's in Midtown. Find something with wheels and get over there.",4.2]]),s.objective("Get in a car. Walk up to one and tap the car button.")},update(s){if(s.stage===0&&m.player.human.vehicle){s.next(1);let t=m.city.places.garage;s.m=s.marker(t.x,t.z,{vehicleOnly:!0,r:3,onEnter:()=>s.next(2)}),s.objective("Drive to <b>Dex Auto</b>.")}s.stage===1&&!m.player.human.vehicle&&s.stageT>1?s.objective("Get a car and drive to <b>Dex Auto</b>."):s.stage===1&&m.player.human.vehicle&&s.objective("Drive to <b>Dex Auto</b>."),s.stage===2&&(s.say([[On+"Rosa's guy? Huh. Thought you'd be taller.",2.8],[On+"Come back when you want to make some actual money.",3]]),s.pass())}},{id:"hotwheels",title:"Repo Man",giver:"garage",reward:1500,start(s){s.say([[On+"Guy downtown bought a Stingray with money he owes me.",3.2],[On+"It's parked on the plaza by the bank. Bring it back in one piece. Mostly one piece.",4]]);let t=m.city.places.plaza;s.data.car=s.car("super",t.x+6,t.z-2,Math.PI/2,16719904),s.data.arrow=s.arrow(s.data.car,15909424),s.blip(s.data.car,"#f2c230"),m.missions.setGps(t.x,t.z),s.objective("Steal the <b>Stingray</b> parked at Solace Plaza.")},update(s){let t=s.data.car;if(t.wrecked||t.removed||t.sinkT>0)return s.fail("The Stingray got wrecked.");if(s.stage===0&&s.playerIn(t)){s.next(1),s.dropArrow(s.data.arrow),t.blip=null,m.police.setLevel(Math.max(1,m.police.level)),m.hud.toast("Car alarm");let e=m.city.places.garage;s.data.m=s.marker(e.x,e.z,{r:3,onEnter:i=>{i===t&&(s.data.arrived=!0)}})}s.stage===1&&(s.playerIn(t)?(s.data.arrow2&&(s.dropArrow(s.data.arrow2),s.data.arrow2=null),s.objective(m.police.level>0?"Lose the cops, then take the Stingray to <b>Dex Auto</b>.":"Take the Stingray to <b>Dex Auto</b>.")):(s.objective("Get back in the <b>Stingray</b>."),s.data.arrow2||(s.data.arrow2=s.arrow(t,15909424))),s.data.arrived&&(s.data.arrived=!1,m.police.level>0?m.hud.hint("Dex won't open the door with cops on your tail.",3):(m.player.exitVehicle(),t.locked=!0,s.say([[On+"Look at her. Ok, there's a dent. I'll pretend I didn't see it.",3.4]]),s.pass())))}},{id:"delivery",title:"Pickup at the Docks",giver:"club",reward:2e3,start(s){s.say([[oi+"There's a bag at the container yard with my name on it.",3.2],[oi+"The Purple Kings have been sitting on it all week.",3],[oi+"Here. Take this, and don't make me regret it.",3]]),m.player.giveWeapon("pistol",48);let t=m.city.places.docksYard,e=t.x,i=t.z-14;s.data.pkg={x:e,z:i},s.data.m=s.marker(e,i,{footOnly:!0,color:15909424,onEnter:()=>{s.data.got=!0}});let n=[];for(let r=0;r<5;r++)s.enemy(e+Q(-12,12),i+Q(-10,8),{weapon:r<2?"smg":"pistol",group:n,accuracy:.22,aggro:28});s.objective("Get the <b>bag</b> from the container yard at the docks.")},update(s){if(s.stage===0&&s.data.got){s.next(1),s.dropMarker(s.data.m),m.hud.toast("Got the bag");let t=m.city.places.club;s.data.m2=s.marker(t.x,t.z,{color:15909424,r:2.5,onEnter:()=>{s.data.done=!0}}),s.timer(180,()=>s.fail("Too slow. The buyer left.")),s.objective("Bring the bag to <b>Club Mirage</b>.");for(let e of s.tracked.humans)e.ai&&(e.ai.hostile=!0,e.ai.target=m.player.human)}s.stage===1&&s.data.done&&(s.clearTimer(),s.say([[oi+"Good. You didn't open it, right?",2.6],[oi+"Don't answer that.",2]]),s.pass())}},{id:"kings",title:"Ocean Drive Run",giver:"garage",reward:3e3,start(s){s.say([[On+"The Kings race up Ocean Drive most nights. Winner gets paid.",3.4],[On+"I put money on you, so don't embarrass me.",3]]),m.missions.setupRace(s,Xc.kings,!0)},update(s,t){m.missions.updateRace(s,t)}},{id:"viper",title:"Viper",giver:"club",reward:5e3,start(s){s.say([[oi+"Viper runs the Kings out of the stadium parking lot.",3],[oi+"He's been leaning on my people. Go have a word with him. A final one.",3.8]]);let t=m.city.places.stadium;for(let i of m.city.parking)Math.hypot(i.x-t.x,i.z-t.z)<45&&(i.noSpawn=!0);for(let i of m.vehicles)i.parkSpot&&i.parkSpot.noSpawn&&m.traffic.remove(i);let e=[];s.data.boss=s.enemy(t.x,t.z-3,{weapon:"smg",health:260,armor:60,shirt:2820669,pants:2820669,hair:14205040,group:e,accuracy:.3,money:800,scale:1.1}),s.data.boss.blip={color:"#d8382f"},s.data.arrow=s.arrow(s.data.boss,16726843);for(let i=0;i<5;i++)s.enemy(t.x+Q(-14,14),t.z+Q(-6,2),{weapon:i%2?"smg":"pistol",group:e});s.data.car=s.car("muscle",t.x+10,qt(1)-pi[1],-Math.PI/2,1118481),m.missions.setGps(t.x,t.z),s.objective("Find <b>Viper</b> at the stadium lot.")},update(s){let t=s.data.boss;if(!t.alive)return s.say([[oi+"Viper's done? Keep your head down for a while. Cops are going to be everywhere.",4]]),m.police.setLevel(Math.max(2,m.police.level)),s.pass();let e=m.player.pos(),i=Math.hypot(t.x-e.x,t.z-e.z);s.stage===0&&(i<40||t.health<t.maxHealth*.8)&&(s.next(1),m.hud.toast("He's running"),s.objective("Don't let <b>Viper</b> get away."),t.ai={update:()=>{let n=s.data.car;if(!t.alive||t.state!=="normal"||t.vehicle)return;if(n.wrecked||n.removed){t.ai=new Wi(t,{hostile:!0,accuracy:.35});return}let r=n.nearestDoor(t.x,t.z),o=r.x-t.x,a=r.z-t.z,l=Math.hypot(o,a);if(l<1.6){if(n.driver&&!n.driver.isPlayer&&n.driver.exitVehicle(),n.driver){t.ai=new Wi(t,{hostile:!0,accuracy:.35});return}t.enterVehicle(n,1);let c=Math.sin(n.h),h=Math.cos(n.h),f=ki(m.city,n.x-c*50,n.z-h*50),d=ki(m.city,n.x+c*50,n.z+h*50);(f===d||!m.city.getEdge(f.id,d.id))&&(d=ki(m.city,n.x,n.z),f=m.city.nodes[d.nb[0]]);let u=new Fn(n,f,d,1);u.panicT=1e9,n.ai=u}else t.moveX=o/l,t.moveZ=a/l,t.moveSpeed=6,t.faceH=null},onDamage:()=>{}})}},{id:"bigscore",title:"The Bank Job",giver:"club",reward:25e3,start(s){s.say([[oi+"My crew is going into Solace National tonight.",3],[oi+"They need someone on the door while they work the vault.",3.2],[oi+"When it opens, you drive. Fast.",2.6]]),m.player.giveWeapon("smg",128);let t=m.city.places.bank;s.data.m=s.marker(t.x,t.z,{footOnly:!0,color:15909424,r:4,onEnter:()=>{}}),s.objective("Go to <b>Solace National Bank</b> downtown."),s.data.hold=0},update(s,t){let e=m.city.places.bank;if(s.stage===0&&s.near(e.x,e.z,4.5)&&!m.player.human.vehicle&&(s.next(1),m.police.setLevel(3),m.hud.toast("Silent alarm tripped"),s.objective("Hold the door while the crew works on the vault.")),s.stage===1&&(s.near(e.x,e.z,7)&&!m.player.human.vehicle?s.data.hold+=t:s.objective("Get back to the bank door!"),s.near(e.x,e.z,7)&&s.objective(`Vault <b>${Math.min(100,Math.floor(s.data.hold/20*100))}%</b>. Keep the cops off the door.`),s.data.hold>=20&&(s.next(2),s.dropMarker(s.data.m),m.police.setLevel(4),m.hud.bigMessage("Vault open","$25,000. Now lose the cops.","info",2.4),s.objective("<b>Lose the cops.</b>"))),s.stage===2&&m.police.level===0){s.next(3);let i=m.city.places.club;s.data.m2=s.marker(i.x,i.z,{color:15909424,r:2.5,onEnter:()=>{s.data.done=!0}}),s.objective("Bring the money to <b>Club Mirage</b>.")}s.stage===3&&s.data.done&&(s.say([[oi+"Twenty-five grand. Not bad for a guy who showed up late.",3.4],[oi+"Stick around, Kai. There's always more work.",3]]),s.pass())}}],la=class{constructor(){this.active=null,this.giver=null,this.raceMarker=null,this.gps=null,this.race=null,this.noCops=!1,this.cool=0}get storyIndex(){return m.save.story||0}init(){this.placeGiver();let t=Xc.coastal.start;this.raceMarker=m.pickups.addMarker(Ht(t.i)-pi[1],qt(t.j)-18,{color:14711338,r:3,vehicleOnly:!0,blip:{color:"#e07a2a",icon:"flag"},label:"Coastal Sprint. Street race, $1,200 to the winner.",onEnter:()=>this.startSide("coastal")})}placeGiver(){this.giver&&(m.pickups.removeMarker(this.giver),this.giver=null);let t=Mf[this.storyIndex];if(!t)return;let e=m.city.places[t.giver];this.giver=m.pickups.addMarker(e.x,e.z,{color:15909424,footOnly:!0,r:1.7,blip:{color:"#f2c230",icon:t.giver==="club"?"R":"D"},label:`${t.title}. ${t.giver==="club"?"Rosa, Club Mirage":"Dex, Dex Auto"}`,onEnter:()=>this.start(t)})}start(t){if(!(this.active||this.cool>0)){if(m.police.level>0){m.hud.hint("Nobody wants to talk while the cops are after you.",3);return}m.pickups.removeMarker(this.giver),this.giver=null,this.raceMarker&&(this.raceMarker.hidden=!0),this.active=new aa(this,t),m.hud.bigMessage(t.title,"","info",2.2),m.audio.missionStart(),t.start(this.active)}}startSide(t){if(this.active||this.cool>0)return;if(m.police.level>0){m.hud.hint("Lose the cops before the race.",3);return}let e=Xc[t],i={id:"race-"+t,title:e.title,reward:e.reward,side:!0,start:n=>this.setupRace(n,e,!1),update:(n,r)=>this.updateRace(n,r)};this.giver&&(this.giver.hidden=!0),this.raceMarker.hidden=!0,this.active=new aa(this,i),m.hud.bigMessage(e.title,"","info",2),i.start(this.active)}update(t){this.cool=Math.max(0,this.cool-t);let e=this.active;if(e){if(e.t+=t,e.stageT+=t,e.timerLeft>0&&(e.timerLeft-=t,m.hud.timer(Ac(e.timerLeft)),e.timerLeft<=0)){e.timerLeft=0;let i=e.onTimer;e.onTimer=null,i&&i()}this.active===e&&e.def.update(e,t)}}pass(){let t=this.active;if(!t)return;let e=t.def;t.cleanup(!0),this.active=null,this.race=null,m.player.addMoney(e.reward),m.hud.bigMessage("Mission passed",hn(e.reward),"pass",3.2),m.audio.missionPassed(),Xe(80),e.side?m.save.races=(m.save.races||0)+1:(m.save.story=this.storyIndex+1,m.save.story>=Mf.length&&setTimeout(()=>m.hud.bigMessage("Story complete","The rest of the city is yours to mess around in.","pass",5),3600)),this.cool=3,this.placeGiver(),this.raceMarker&&(this.raceMarker.hidden=!1),m.saveGame()}fail(t){let e=this.active;e&&(e.cleanup(!1),this.active=null,this.race=null,m.hud.bigMessage("Mission failed",t||"","fail",3),m.audio.missionFailed(),this.cool=4,this.placeGiver(),this.raceMarker&&(this.raceMarker.hidden=!1))}setGps(t,e){this.gps=t==null?null:{x:t,z:e}}setupRace(t,e,i){let n=gy(e.nodes),r=e.start,o=Ht(r.i),a=qt(r.j),l=r.dirZ,c=l>0?0:Math.PI,h=l>0?-1:1,f=[{x:o+h*pi[0],z:a+l*24},{x:o+h*pi[1],z:a+l*24},{x:o+h*pi[0],z:a+l*33},{x:o+h*pi[1],z:a+l*33}];for(let _ of m.vehicles)_.removed||_===m.player.human.vehicle||Math.hypot(_.x-o,_.z-(a+l*28))<30&&m.traffic.remove(_);let d=[],u=["sports","muscle","super"],x=[2845872,14708778,15258186];for(let _=0;_<3;_++){let M=t.car(u[_],f[_].x,f[_].z,c,x[_]),v=ri("ped",M.x,M.z,{shirt:1118481});v.persistent=!0,t.tracked.humans.push(v),v.enterVehicle(M,1),M.ai=new Wc(M,n,[.9,.95,.88][_]),M.blip={color:"#e07a2a"},t.blips.push(M),d.push(M)}let y=m.player.human.vehicle,g=f[3];!y||y.wrecked?(y=t.car(i?"sports":"muscle",g.x,g.z,c,13114661),m.player.human.vehicle&&m.player.exitVehicle(),m.player.enterNow(y)):(y.x=g.x,y.z=g.z,y.h=c,y.vx=y.vz=0,y.w=0,y.y=m.physics.groundHeight(y.x,y.z)),m.cam.snapBehind(c);let p={R:e,pts:n,racers:d,player:y,i:0,countdown:3.5,started:!1,finished:[],outT:0,cpMarker:null,playerProgress:()=>{let _=n[Math.min(p.i,n.length-1)],M=m.player.pos();return p.i*1e4-Math.hypot(_.x-M.x,_.z-M.z)}};this.race=p,t.data.race=p,this.placeCheckpoint(t),t.objective(`Win the race. Checkpoint 1/${n.length}`),m.police.noCops=!1}placeCheckpoint(t){let e=this.race;e.cpMarker&&t.dropMarker(e.cpMarker);let i=e.pts[e.i];i&&(e.cpMarker=t.marker(i.x,i.z,{color:e.i===e.pts.length-1?16777215:14711338,r:7,h:6,blip:{color:"#e07a2a",icon:"flag"}}))}updateRace(t,e){let i=this.race;if(!i)return;let n=i.player;if(!i.started){i.countdown-=e,n.throttle=0,n.handbrake=!0;let l=Math.ceil(i.countdown);if(l!==i.lastN&&l>=1&&l<=3&&(i.lastN=l,m.hud.bigMessage(String(l),"","info",.8),m.audio.beep(!1)),i.countdown<=0){i.started=!0,m.player.raceLock=!1;for(let c of i.racers)c.ai&&(c.ai.frozen=!1);m.hud.bigMessage("GO!","","pass",.8),m.audio.beep(!0)}else{m.player.raceLock=!0;return}}if(n.wrecked||n.removed)return t.fail("Your car is wrecked.");if(m.player.human.vehicle!==n)return i.outT+=e,t.objective(`Get back in your car (${Math.ceil(10-i.outT)})`),i.outT>10?t.fail("You left your car."):void 0;i.outT=0;let r=i.pts[i.i];if(Math.hypot(r.x-n.x,r.z-n.z)<11){if(i.i++,m.audio.beep(!1),i.i>=i.pts.length){let l=1+i.racers.filter(c=>c.ai&&c.ai.done).length;return l===1?(t.def.side||t.say([[On+"First! Ha. I had twenty bucks on you.",3]]),t.pass()):t.fail(`You came ${l===2?"2nd":l===3?"3rd":"last"}. Only the winner gets paid.`)}this.placeCheckpoint(t)}let o=i.playerProgress(),a=1+i.racers.filter(l=>l.ai&&l.ai.race&&(l.ai.done||l.ai.progress()>o)).length;t.objective(`Position <b>${a}/4</b>   Checkpoint ${i.i+1}/${i.pts.length}`)}onHumanKilled(t,e){}onVehicleDestroyed(t){}onLanded(t,e){let i=t.airStart;if(!i)return;let n=null;for(let c of m.city.ramps)if(Math.hypot(c.x-i.x,c.z-i.z)<c.len){n=c;break}if(!n)return;let r=Math.hypot(t.x-i.x,t.z-i.z);if(e<.8||r<12)return;m.save.jumps=m.save.jumps||[];let o=m.city.ramps.indexOf(n),a=!m.save.jumps.includes(o),l=Math.floor(r*6+e*60)+(a?500:0);a&&m.save.jumps.push(o),m.stats.jumps++,m.player.addMoney(l),m.hud.bigMessage(a?"Stunt jump":"Nice jump",`${r.toFixed(0)} m, ${e.toFixed(1)} s in the air. ${hn(l)}`,"info",2.4),m.audio.chime()}};var ca=class{constructor(){this.human=null,this.money=0,this.inv={fist:1/0,pistol:0,smg:0,shotgun:0,rifle:0},this.owned={fist:!0},this.lastVehicle=null,this.aiming=!1,this.target=null,this.dead=!1,this.busted=!1,this.endT=0,this.entering=null,this.arrestProgress=0,this.diffEase=.85,this.raceLock=!1,this.nearCar=null,this.fireHeld=!1}spawn(t,e,i){return this.human=ri("player",t,e,{skin:13010498,hair:1774608,shirt:3112838,pants:14867920,h:i,scale:1.02,bald:!1,money:0}),this.human.persistent=!0,this.human.health=100,this.human}pos(){let t=this.human,e=t.vehicle;return e?{x:e.x,y:e.y,z:e.z}:{x:t.x,y:t.y,z:t.z}}alive(){return this.human&&this.human.alive&&!this.dead&&!this.busted}armed(){return this.human.weapon!=="fist"}owns(t){return!!this.owned[t]}giveWeapon(t,e){let i=!this.owned[t];this.owned[t]=!0,this.inv[t]=(this.inv[t]||0)+e,i||this.human.weapon==="fist"?this.selectWeapon(t):this.human.weapon===t&&this.human.clip<=0&&(this.human.clip=Math.min(this.inv[t],Ye[t].clip))}selectWeapon(t){let e=this.human;e.weapon=t,e.reloadT=0,e.fireT=.15,e.clip=t==="fist"?0:Math.min(this.inv[t],Ye[t].clip),m.hud.weaponChanged()}cycleWeapon(){let t=yr.indexOf(this.human.weapon);for(let e=1;e<=yr.length;e++){let i=yr[(t+e)%yr.length];if(i==="fist"||this.owned[i]&&this.inv[i]>0){this.selectWeapon(i),m.audio.click();return}}}addMoney(t){this.money=Math.max(0,Math.floor(this.money+t)),m.hud.moneyChanged(t),t>0&&m.audio.cash()}update(t,e){let i=this.human;if(this.dead||this.busted){this.endT+=t,i.moveSpeed=0,this.busted&&(i.handsUp=Math.min(1,i.handsUp+t*3)),this.endT>4.2&&this.respawn();return}if(i.handsUp=Math.max(0,i.handsUp-t*4),i.fireT=Math.max(0,i.fireT-t),i.reloadT>0&&(i.reloadT-=t,i.reloadT<=0)){let n=Ye[i.weapon];n&&n.clip&&(i.clip=Math.min(this.inv[i.weapon],n.clip))}i.aimT=Math.max(0,i.aimT-t),this.arrestProgress=Math.max(0,(this.arrestProgress||0)-t*.5),e.pressed("weapon")&&this.cycleWeapon(),i.vehicle?this.drive(t,e):this.foot(t,e)}foot(t,e){let i=this.human;if(i.state!=="normal"){i.moveSpeed=0,this.target=null;return}if(this.entering){let M=this.entering;M.t+=t;let v=M.v;if(v.removed||v.wrecked||v.driver&&v.driver.isPlayer){this.entering=null;return}if(!M.door){let S=v.doorPos(1),w=v.doorPos(-1);M.door=Math.hypot(S.x-i.x,S.z-i.z)<=Math.hypot(w.x-i.x,w.z-i.z)?1:-1}let I=v.doorPos(M.door),T=I.x-i.x,E=I.z-i.z,P=Math.hypot(T,E);P<.9||M.t>1.4?(this.entering=null,this.enterVehicle(v)):(i.moveX=T/P,i.moveZ=E/P,i.moveSpeed=5.5,i.faceH=null),e.move().mag>.6&&M.t>.2&&(this.entering=null);return}let n=e.move(),r=m.cam.yaw,o=Math.sin(r),a=Math.cos(r),l=-a,c=o,h=o*-n.y+l*n.x,f=a*-n.y+c*n.x,d=Math.hypot(h,f);d>.001&&(h/=d,f/=d),i.moveX=h,i.moveZ=f;let u=e.isDown("sprint"),x=n.mag<.08?0:n.mag<.6?2:5;u&&n.mag>.1&&(x=7.6),this.aiming&&(x=Math.min(x,3.2)),i.moveSpeed=x,e.pressed("jump")&&(i.wantJump=!0);let y=Ye[i.weapon],g=e.isDown("fire"),p=e.pressed("fire"),_=y.auto?g:p;if(g||p?(!this.target||!this.validTarget(this.target,y))&&(this.target=this.findTarget(y)):i.aimT<=0&&(this.target=null),this.aiming=(g||i.aimT>0)&&i.weapon!=="fist",this.target&&(g||i.aimT>0)){let M=this.target;i.faceH=Math.atan2(M.x-i.x,M.z-i.z)}else this.aiming?i.faceH=r:i.faceH=null;if(_){i.h=i.faceH??i.h;let M=this.target,v={x:Math.sin(i.h),y:-Math.sin(m.cam.pitch)*.35+.02,z:Math.cos(i.h)};i.weapon==="fist"?m.weapons.fire(i,{target:M&&!M.T?M:null}):m.weapons.fire(i,{target:M,dir:v,moving:i.speed>2.5}),i.weapon!=="fist"&&i.clip<=0&&this.inv[i.weapon]<=0&&(m.hud.hint("Out of ammo. Solace Arms sells more.",2),this.selectWeapon("fist"))}if(this.nearCar=this.findCar(),e.pressed("enter")&&this.nearCar){this.entering={v:this.nearCar,t:0};let M=this.nearCar;if(M.driver&&!M.driver.isPlayer){let v=M.driver;v.exitVehicle(),M.ai=null,v.kind==="cop"||(v.ai=new Ri(v),Math.random()<.25?(v.ai.mode="fight",v.ai.fight=i,v.ai.t=10):v.ai.flee(i.x,i.z,Q(8,14))),v.knock(Math.sin(M.h+Math.PI/2)*3,1.5,Math.cos(M.h+Math.PI/2)*3),m.stats.carsStolen++,m.police.crime(M.isPolice?"stealcop":"carjack",M.x,M.z),m.audio.punch()}else M.isPolice&&m.police.crime("stealcop",M.x,M.z);if(M.passenger&&!M.passenger.isPlayer&&M.passenger.kind!=="cop"){let v=M.passenger;v.exitVehicle(),v.ai=new Ri(v),v.ai.flee(i.x,i.z,10)}}}findCar(){let t=this.human,e=null,i=6;for(let n of m.vehicles){if(n.removed||n.wrecked||n.sinkT>0||n.locked||n.burnT>0)continue;let r=n.x-t.x,o=n.z-t.z;if(Math.abs(r)>8||Math.abs(o)>8||Math.abs(n.y-t.y)>2)continue;let a=n.doorPos(1),l=Math.min(Math.hypot(a.x-t.x,a.z-t.z),Math.hypot(r,o)-n.T.len*.3);l<i&&(i=l,e=n)}return e}enterVehicle(t){let e=this.human;if(t.driver&&!t.driver.isPlayer){let i=t.driver;i.exitVehicle(),i.ai=new Ri(i),i.ai.flee(e.x,e.z,10)}t.driver||(e.enterVehicle(t,1),t.ai=null,t.handbrake=!1,t.siren=(t.isPolice&&m.police.level>0,!1),this.lastVehicle=t,this.target=null,this.aiming=!1,m.cam.snapBehind(t.h),m.hud.carName(t.T.name),m.audio.door(),t.parkSpot&&(t.parkSpot.car=null,t.parkSpot=null))}enterNow(t){let e=this.human;e.vehicle&&e.exitVehicle(),e.x=t.x,e.z=t.z,this.enterVehicle(t)}exitVehicle(t=!1){let e=this.human,i=e.vehicle;i&&(e.exitVehicle(t),i.throttle=0,i.steer=0,m.audio.door(),m.cam.first=!0)}drive(t,e){let i=this.human,n=i.vehicle;if(this.raceLock){n.throttle=0,n.handbrake=!0;return}let r=e.move(),o=r.x;o=Math.sign(o)*Math.pow(Math.abs(o),1.35);let a=0;if(e.isDown("gas")?a=1:e.isDown("brake")?a=-1:r.y<-.35?a=Ct(-r.y*1.25,0,1):r.y>.55&&(a=-Ct(r.y,0,1)),n.throttle=a,n.steer=o,n.handbrake=e.isDown("handbrake")||e.isDown("jump"),e.pressed("horn")&&(m.audio.horn(n.x,n.z,!0),m.peds.panic(n.x+Math.sin(n.h)*8,n.z+Math.cos(n.h)*8,10,null)),e.pressed("radio")&&m.audio.nextStation(),m.stats.distance+=n.speed*t,n.onGround&&(n.slip>5||n.handbrake&&n.speed>8)&&Math.random()<.6){let h=Math.sin(n.h),f=Math.cos(n.h),d=-n.T.len*.35;m.fx.tireSmoke(n.x+h*d+f*.8,n.y+.2,n.z+f*d-h*.8),m.fx.tireSmoke(n.x+h*d-f*.8,n.y+.2,n.z+f*d+h*.8)}let l=Ye[i.weapon],c=i.weapon!=="fist"?i.weapon:this.owned.pistol&&this.inv.pistol>0?"pistol":null;if(c&&(e.isDown("fire")||e.pressed("fire"))){i.weapon!==c&&this.selectWeapon(c);let h=this.findTarget(Ye[c],!0);if(h){let f=i.h;i.h=Math.atan2(h.x-i.x,h.z-i.z),m.weapons.fire(i,{target:h}),i.h=f}}else!c&&e.pressed("fire")&&m.hud.hint("You need a gun to shoot from a car.",2);e.pressed("enter")&&(this.exitVehicle(n.speed>9),n.speed>9&&Xe(60)),n.burnT>0&&!this.burnHint&&(this.burnHint=!0,m.hud.hint("Your car is on fire. Get out!",2.5)),n.burnT===0&&(this.burnHint=!1)}validTarget(t,e){if(!t||t.removed||t.heli)return!1;let i=this.human;if(t.T){if(t.wrecked)return!1}else if(!t.alive||t.vehicle)return!1;return Math.hypot(t.x-i.x,t.z-i.z)<(e.melee?3:e.range*.9)}findTarget(t,e=!1){let i=this.human,n=t.melee?2.6:Math.min(t.range*.85,e?32:60),r=m.cam.yaw,o=Math.sin(r),a=Math.cos(r),l=t.melee?1.2:e?1.4:.62,c=null,h=1e9,f=(d,u)=>{let x=d.x-i.x,y=d.z-i.z,g=Math.hypot(x,y);if(g>n||g<.3)return;let p=Math.acos(Ct((x*o+y*a)/g,-1,1));if(p>l)return;let _=p*1.6+g/n+u;_>=h||!t.melee&&!m.physics.los(i.x,i.z,d.x,d.z,i.y+1.4,(d.y||0)+1.2)||(h=_,c=d)};for(let d of m.humans){if(d===i||d.removed||!d.alive||d.vehicle||Math.abs(d.y-i.y)>6)continue;let u=d.kind==="cop"?m.police.level>0?-.8:.2:d.kind==="gang"&&d.ai&&d.ai.hostile?-1:0;f(d,u)}if(!t.melee){for(let u of m.vehicles)u.removed||u.wrecked||u===i.vehicle||f(u,u.isPolice&&m.police.level>0?-.3:.7);let d=m.police.heli;if(d&&d.active&&!d.dead){let u=d.x-i.x,x=d.z-i.z;Math.hypot(u,x)<80&&c===null&&(c={x:d.x,y:d.y-1,z:d.z,heli:d,T:{hgt:2}})}}return c}onDamaged(t,e,i){m.hud.damageFlash(Math.min(1,t/30)),Xe(Math.min(70,15+t))}onDeath(){this.dead||(this.dead=!0,this.endT=0,m.cam.mode="dead",m.hud.bigMessage("Wasted","Hospital bill: $200","dead",4),m.audio.death(),Xe(200),m.missions.active&&m.missions.fail("You died."))}onBusted(){if(this.busted||this.dead)return;this.busted=!0,this.endT=0;let t=this.human;t.vehicle&&this.exitVehicle(),t.moveSpeed=0,m.cam.mode="dead",m.hud.bigMessage("Arrested","Bail cost you 10% of your cash","fail",4),m.audio.busted(),m.missions.active&&m.missions.fail("You were arrested.")}respawn(){let t=this.human,e=this.busted,i=m.city.places,n=e?i.police:i.hospital;e?this.addMoney(-Math.floor(this.money*.1)):this.addMoney(-Math.min(200,this.money)),t.vehicle&&t.exitVehicle(),t.x=n.x,t.z=n.z,t.y=m.physics.groundHeight(n.x,n.z),t.vx=t.vz=t.vy=0,t.alive=!0,t.state="normal",t.health=t.maxHealth,t.armor=0,t.handsUp=0,t.deadT=0,t.godT=3,this.dead=!1,this.busted=!1,this.target=null,this.entering=null,m.police.clear(!0),m.cam.mode="play",m.cam.first=!0,m.hour=(m.hour+6)%24,m.hud.fade()}};var bf="neontide.save.v1",wf="neontide.settings.v1";function ha(){try{let s=localStorage.getItem(bf);return s?JSON.parse(s):null}catch{return null}}function Sf(s){try{return localStorage.setItem(bf,JSON.stringify(s)),!0}catch{return!1}}function Tf(){try{let s=localStorage.getItem(wf);return s?JSON.parse(s):null}catch{return null}}function Ef(s){try{localStorage.setItem(wf,JSON.stringify(s))}catch{}}var fa=1/60,De=s=>document.getElementById(s);function Bn(s,t){return De("loadfill").style.width=Math.round(s*100)+"%",t&&(De("loadtext").textContent=t),new Promise(e=>setTimeout(e,16))}function $c(){let s=window.devicePixelRatio||1,t=m.settings.quality;return t==="low"?Math.min(s,.85):t==="high"?Math.min(s,2):Math.min(s,1.25)}var Af=["<b>Quick Coat</b> resprays get the cops off your back for $100.","Cops lose track of you faster once you are out of their sight and outside the red circle on the map.","The handbrake swings the back end out. Handy for tight corners.","People sometimes drop cash when they go down.","There are 20 shells hidden around Port Solace. Each one is worth $100.","Your room at the <b>Hotel Flamingo</b> saves the game and patches you up.","Hit one of the orange ramps fast enough and it pays out.","Solace Arms sells body armor. Worth it before the bank job.","Tap anywhere on the big map to set a waypoint."];async function xy(){if(!document.fonts||!document.fonts.load)return;let s=new Promise(t=>setTimeout(t,2500));await Promise.race([Promise.all(["40px Anton",'600 20px "Barlow Condensed"','700 20px "Barlow Condensed"','500 20px "Barlow Condensed"'].map(t=>document.fonts.load(t))),s]).catch(()=>{})}async function yy(){De("loadtip").innerHTML=Af[Math.floor(Math.random()*Af.length)],await xy();let s=Tf();if(s&&Object.assign(m.settings,s),!s){let r=navigator.deviceMemory||4;m.settings.quality=r<=3?"low":"medium"}await Bn(.05,"Loading");let t=De("game"),e;try{e=new fo({canvas:t,antialias:m.settings.quality==="high",powerPreference:"high-performance",stencil:!1})}catch{De("loadtext").textContent="WebGL is not available on this device.";return}e.setPixelRatio($c()),e.setSize(window.innerWidth,window.innerHeight,!1),e.outputColorSpace=Ve,e.shadowMap.enabled=m.settings.quality!=="low",e.shadowMap.type=Eo,e.shadowMap.autoUpdate=!0,m.renderer=e;let i=new mo;m.scene=i;let n=new ti(62,window.innerWidth/window.innerHeight,.5,2200);m.camera=n,await Bn(.12,"Loading map"),m.city=ku(1337),m.physics=new Bo(m.city),await Bn(.25,"Loading city"),m.cityMesh=qu(m.city,i,m.settings.quality),await Bn(.55,"Loading city"),m.sky=new Io(i,m.settings.quality),m.water=new zo(i),await Bn(.65,"Loading props"),m.props=new Fo(i,m.city),m.pools=new Oo(i),await Bn(.75,"Loading people"),m.vehicleRenderer=new Uo(i),m.humanRenderer=new Vo(i),m.fx=new qo(i),m.weapons=new Yo,m.input=new Go,m.input.bind(),m.cam=new Wo(n),m.audio=new Qo,m.save=ha()||{story:0,shells:[],jumps:[]},m.hud=new Ko,m.police=new sa(i),m.player=new ca,vy(),m.traffic=new ea,m.peds=new na,m.pickups=new oa(i),m.pickups.setupServices(),m.missions=new la,m.missions.init(),m.titleFocus={x:Ht(11),z:qt(5)},m.saveGame=Pf,m.pauseGame=pa,m.resume=zf,m.toTitle=by,m.applySettings=_y,await Bn(.9,"Compiling shaders"),m.sky.update(m.hour,{x:0,y:0,z:0},n.position),m.cam.update(.016,m.input),e.compile(i,n),e.render(i,n),await Bn(1,"Done"),window.addEventListener("resize",If),window.__onAndroidBack=wy,window.__onAppPause=()=>{m.state==="play"&&pa(!1),m.audio.suspend()},window.__onAppResume=()=>{m.audio.resume()},document.addEventListener("visibilitychange",()=>{document.hidden?window.__onAppPause():window.__onAppResume()}),da(),De("loading").classList.add("hidden"),Zc=performance.now(),requestAnimationFrame(Df)}function vy(){let s=m.save,t=m.city.places,e=m.player,i=t.safehouse.x,n=t.safehouse.z+2;s.pos&&Number.isFinite(s.pos.x)&&(i=s.pos.x,n=s.pos.z),e.spawn(i,n,Math.PI),e.money=s.money??300,s.inv&&Object.assign(e.inv,s.inv),s.owned&&Object.assign(e.owned,s.owned),e.inv.fist=1/0,s.health&&(e.human.health=s.health),s.armor&&(e.human.armor=s.armor),s.hour!==void 0&&(m.hour=s.hour),s.stats&&Object.assign(m.stats,s.stats),s.weapon&&e.owned[s.weapon]&&e.selectWeapon(s.weapon);let r=Ai("muscle",Ht(13)-10.3,t.safehouse.z+6.5,0,15131092);r.handbrake=!0,m.cam.yaw=Math.PI}function Pf(){let s=m.player,t=s.human,e=s.pos(),i=m.save;i.money=s.money,i.inv={...s.inv,fist:0},i.owned={...s.owned},i.weapon=t.weapon,i.health=Math.max(30,t.health),i.armor=t.armor,i.hour=m.hour,i.stats={...m.stats},s.alive()&&m.physics.waterDepth(e.x,e.z)<0&&(i.pos={x:e.x,z:e.z}),i.time=Date.now(),Sf(i)}function _y(){let s=m.renderer;s.setPixelRatio($c()),s.setSize(window.innerWidth,window.innerHeight,!1);let t=m.settings.quality!=="low";s.shadowMap.enabled!==t&&(s.shadowMap.enabled=t,m.scene.traverse(i=>{i.material&&(Array.isArray(i.material)?i.material:[i.material]).forEach(n=>{n.needsUpdate=!0})})),m.sky.setQuality(m.settings.quality),m.props.forceRefresh=!0,m.audio.applyVolume();let e=window.innerHeight*s.getPixelRatio()*.9;m.fx.setScale(e),Ef(m.settings)}function If(){m.renderer.setPixelRatio($c()),m.renderer.setSize(window.innerWidth,window.innerHeight,!1),m.camera.aspect=window.innerWidth/window.innerHeight,m.camera.updateProjectionMatrix();let s=window.innerHeight*m.renderer.getPixelRatio()*.9;m.fx.setScale(s),m.vehicleRenderer&&(m.vehicleRenderer.glow.material.uniforms.uScale.value=s),m.props&&(m.props.glowMat.uniforms.uScale.value=s),(m.state==="map"||!De("mapview").classList.contains("hidden"))&&m.hud.drawBigMap()}function da(){m.state="title",m.paused=!0,m.cam.mode="title",De("title").classList.remove("hidden");let s=!!ha();De("btnContinue").classList.toggle("disabled",!s),De("btnContinue").textContent="Continue",da.bound||(da.bound=!0,De("btnContinue").addEventListener("click",()=>Rf(!1)),De("btnNew").addEventListener("click",()=>{ha()&&!confirm("Start a new game? Your saved progress will be replaced when you next save.")||Rf(!0)}),De("btnSettings1").addEventListener("click",()=>{m.audio.init(),m.hud.openSettings("title")}),De("btnHelp1").addEventListener("click",()=>{m.audio.init(),m.hud.openHelp("title")})),If()}function Rf(s){if(m.audio.init(),m.audio.click(),s&&My(),De("title").classList.add("hidden"),De("hud").classList.remove("hidden"),De("controls").classList.remove("hidden"),m.cam.mode="play",m.cam.first=!0,m.state="play",m.paused=!1,m.input.resetAll(),(s||!m.started)&&(m.started=!0,(m.save.story||0)===0)){m.hud.subtitles([["Rosa wants to see you at <b>Club Mirage</b>. Follow the <b>R</b> on your map.",4.2],["Left side of the screen moves you, right side moves the camera.",4],["There's a car parked right behind you.",3]]);let t=m.city.places.club;m.missions.setGps(t.x,t.z),m.started=!0,m.firstGps=!0}}function My(){m.save={story:0,shells:[],jumps:[]};let s=m.player;s.human.vehicle&&s.exitVehicle();let t=m.city.places;s.human.x=t.safehouse.x,s.human.z=t.safehouse.z+2,s.human.y=m.physics.groundHeight(s.human.x,s.human.z),s.money=300,s.inv={fist:1/0,pistol:0,smg:0,shotgun:0,rifle:0},s.owned={fist:!0},s.selectWeapon("fist"),s.human.health=100,s.human.armor=0,m.hour=17;for(let e of Object.keys(m.stats))m.stats[e]=0;m.police.clear(!0),m.missions.active&&m.missions.fail(""),m.missions.placeGiver();for(let e of m.pickups.items)e.type==="shell"&&(e.dead=!0,m.scene.remove(e.mesh));m.pickups.items=m.pickups.items.filter(e=>!e.dead),m.city.collect.forEach((e,i)=>{let n=Math.max(m.physics.groundHeight(e.x,e.z),.12)+1.1;m.pickups.add("shell",e.x,e.z,{y:n,id:i})}),m.cam.yaw=Math.PI}function pa(s=!1){m.state==="play"&&(m.state="paused",m.paused=!0,m.input.resetAll(),s||m.hud.openPause())}function zf(){for(let s of["pause","settings","help","mapview","shop"])De(s).classList.add("hidden");m.state!=="title"&&(m.state="play",m.paused=!1,m.input.resetAll(),m.audio.resume())}function by(){Pf();for(let s of["pause","settings","help","mapview","shop","hud","controls"])De(s).classList.add("hidden");da()}function wy(){let s=t=>!De(t).classList.contains("hidden");return s("settings")?(m.hud.closeSub("settings"),!0):s("help")?(m.hud.closeSub("help"),!0):s("mapview")?(m.hud.closeMap(),!0):s("shop")?(m.hud.closeShop(),!0):m.state==="play"?(pa(),!0):m.state==="paused"?(zf(),!0):!1}var Zc=0,ua=0,qc=0;function Lf(s){m.time+=s;let t=m.input;if(t.pressed("pause")){pa();return}if(t.pressed("map")){m.hud.openMap();return}m.player.update(s,t),m.missions.update(s),m.traffic.update(s),m.police.update(s),m.peds.update(s);for(let e of m.vehicles)e.removed||e.update(s);for(let e of m.humans)e.removed||e.update(s);of(),mf(),m.pickups.update(s),m.fx.update(s),m.hour=(m.hour+s/75)%24,m.firstGps&&m.missions.active&&(m.firstGps=!1)}function Df(s){requestAnimationFrame(Df);let t=(s-Zc)/1e3;if(Zc=s,t>.1&&(t=.1),t<=0&&(t=.001),m.state==="play"){ua+=t;let n=0;for(;ua>=fa&&n<4&&(Lf(fa),ua-=fa,n++,m.state==="play"););n===4&&(ua=0),qc-=t,qc<=0&&(qc=.5,m.vehicles=m.vehicles.filter(r=>!r.removed),m.humans=m.humans.filter(r=>!r.removed||r.isPlayer))}else m.state==="title"&&(m.time+=t,m.hour=18.1+Math.sin(m.time*.02)*.4);m.input.clearPresses&&m.state!=="play"&&m.input.clearPresses(),m.cam.update(t,m.input);let e=m.camera,i=m.state==="title"?{x:m.titleFocus.x,y:0,z:m.titleFocus.z}:m.player.pos();m.sky.update(m.hour,i,e.position),m.water.update(m.time,m.sky),m.props.update(e,m.sky.night),Sy(e),m.vehicleRenderer.update(m.vehicles,m.sky.night,e.position),m.humanRenderer.update(m.humans,e.position),Yu(m.cityMesh.dynamic,t,m.sky.night),m.cityMesh.neonMat.color.setScalar(.32+m.sky.night*.68),m.state!=="title"&&m.hud.update(t),m.audio.ready&&m.audio.update(t),m.renderer.render(m.scene,e)}window.__G=m;window.__spawnVehicle=Ai;window.__step=s=>{for(let t=0;t<s&&(Lf(fa),m.state==="play");t++);m.vehicles=m.vehicles.filter(t=>!t.removed),m.humans=m.humans.filter(t=>!t.removed||t.isPlayer)};var Yc=new D,Cf=new Tt;function Sy(s){let t=m.pools,e=m.sky.night;if(t.begin(),e>.05){let i=s.position.x,n=s.position.z,r=m.props.lamps;for(let a of r.visible){let l=r.items[a];if(Math.abs(l.x-i)>170||Math.abs(l.z-n)>170)continue;Cf.fromArray(r.mats,a*16),Yc.set(0,0,2.4).applyMatrix4(Cf);let c=a*7%5!==0;t.add(Yc.x,(l.y||0)+.03,Yc.z,13,13,0,1,c?.62:.85,c?.3:.9)}let o=Math.floor(m.time*6)%2;for(let a of m.vehicles){if(a.removed||a.wrecked||Math.abs(a.x-i)>140||Math.abs(a.z-n)>140)continue;let l=Math.sin(a.h),c=Math.cos(a.h),h=a.T.len/2+6.5;t.add(a.x+l*h,a.y+.04,a.z+c*h,5.5,13,a.h,.85,.8,.62),a.siren&&t.add(a.x,a.y+.04,a.z,9,9,0,o?1:.1,.08,o?.1:1)}}t.end(e*.55)}yy().catch(s=>{console.error(s);let t=document.getElementById("loadtext");t&&(t.textContent="Error: "+(s&&s.message?s.message:s))});})();
