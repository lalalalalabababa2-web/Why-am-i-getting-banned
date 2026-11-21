// Ocean surface: procedural waves (normal only), shallow-water tint near the coast, sun glint, foam.

import * as THREE from 'three';
import { LAND, WATER_LEVEL } from './citygen.js';

export class Water {
  constructor(scene) {
    const cx = (LAND.minX + LAND.maxX) / 2, cz = (LAND.minZ + LAND.maxZ) / 2;
    this.uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(1, 1, 1) },
        uSky: { value: new THREE.Color(0.6, 0.8, 1) },
        uZenith: { value: new THREE.Color(0.2, 0.4, 0.9) },
        uNight: { value: 0 },
        uLand: { value: new THREE.Vector4(cx, cz, (LAND.maxX - LAND.minX) / 2 - LAND.r, (LAND.maxZ - LAND.minZ) / 2 - LAND.r) },
        uLandR: { value: LAND.r },
      },
    ]);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      fog: true,
      vertexShader: `
        varying vec3 vWorld;
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
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
        }`,
    });
    const geo = new THREE.PlaneGeometry(6000, 6000, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(cx, WATER_LEVEL, cz);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  update(time, sky) {
    const u = this.uniforms;
    u.uTime.value = time;
    u.uSunDir.value.copy(sky.sunDir);
    u.uSunColor.value.copy(sky.sunColor);
    u.uSky.value.copy(sky.horizon);
    u.uZenith.value.copy(sky.zenith);
    u.uNight.value = sky.night;
  }
}
