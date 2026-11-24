const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }';
const FRAG = `
uniform sampler2D map; uniform sampler2D mask; uniform sampler2D rim;
uniform vec3 uGrade; uniform vec3 uTint; uniform vec4 uUv; uniform float uMode; uniform float uRim; uniform float uFlip;
varying vec2 vUv;
vec3 toLinear( vec3 c ) { return mix( c / 12.92, pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, c ) ); }
void main() {
  vec2 uv = vec2( mix( vUv.x, 1.0 - vUv.x, uFlip ), vUv.y );
  vec4 tex = texture2D( map, uUv.xy + uv * uUv.zw );
  float a = uMode > 0.5 ? tex.a : texture2D( mask, uv ).r;
  if ( a < 0.5 ) discard;
  vec3 d = clamp( tex.rgb, 0.0, 1.0 );
  if ( uRim > 0.5 ) { vec4 r = texture2D( rim, uv ); d = mix( d, r.rgb, r.a ); }
  vec3 s = clamp( ( d - 0.42 ) / uGrade.y + 0.42, 0.0, 1.0 );
  vec3 c = toLinear( s );
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  c = clamp( vec3( l ) + ( c - vec3( l ) ) / uGrade.z, 0.0, 1.0 );
  vec3 k = 2.51 - 2.43 * c, b = 0.03 - 0.59 * c;
  vec3 x = ( - b + sqrt( b * b + 0.56 * k * c ) ) / ( 2.0 * k );
  gl_FragColor = vec4( x / ( uGrade.x * uTint ), 1.0 );
}`;

const made = [];
export function headMaterial(THREE) {
  const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, side: THREE.FrontSide, uniforms: {
    map: { value: null }, mask: { value: null }, rim: { value: null }, uGrade: { value: new THREE.Vector3(0.82, 1.18, 0.96) }, uTint: { value: new THREE.Vector3(1.03, 0.985, 0.98) },
    uUv: { value: new THREE.Vector4(0, 0, 1, 1) }, uMode: { value: 0 }, uRim: { value: 0 }, uFlip: { value: 0 } } });
  made.push(m);
  return m;
}
export function setGrade(o) { for (const m of made) { m.uniforms.uGrade.value.set(o.exposure, o.contrast, o.saturation); m.uniforms.uTint.value.set(...o.tint); } }
export function roundMask(THREE, radius = 0.42) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(3, 3, 122, 122, 128 * radius); g.fill();
  return new THREE.CanvasTexture(c);
}
