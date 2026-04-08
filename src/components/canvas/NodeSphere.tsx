import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
    BufferGeometry,
    Float32BufferAttribute,
    ShaderMaterial,
    Color,
    AdditiveBlending,
    IcosahedronGeometry,
    EdgesGeometry,
    LineBasicMaterial,
    LineSegments,
    Vector2,
} from 'three';

interface NodeSphereProps {
    scrollProgress: React.MutableRefObject<number>;
}

const DESKTOP_PARTICLES = 2500;
const MOBILE_PARTICLES = 600;

const NodeSphere: React.FC<NodeSphereProps> = ({ scrollProgress }) => {
    const groupRef = useRef<any>(null);
    const pointsRef = useRef<any>(null);
    const wireframeRef = useRef<LineSegments>(null);
    const { pointer } = useThree();
    const mouseTarget = useRef(new Vector2(0, 0));

    const isMobile =
        typeof window !== 'undefined' &&
        (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768);

    const particleCount = isMobile ? MOBILE_PARTICLES : DESKTOP_PARTICLES;
    const wireDetail = isMobile ? 2 : 3;

    // Particle positions on a sphere surface
    const [positions, randoms] = useMemo(() => {
        const pos = new Float32Array(particleCount * 3);
        const rand = new Float32Array(particleCount);
        for (let i = 0; i < particleCount; i++) {
            const radius = 1.8 + Math.random() * 0.6;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = radius * Math.cos(phi);
            rand[i] = Math.random();
        }
        return [pos, rand];
    }, [particleCount]);

    // Particle shader material
    const particleMaterial = useMemo(
        () =>
            new ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uColor1: { value: new Color('#FF2D78') },
                    uColor2: { value: new Color('#9B30FF') },
                    uSize: { value: isMobile ? 1.2 : 1.8 },
                    uScrollProgress: { value: 0 },
                },
                vertexShader: `
          uniform float uTime;
          uniform float uSize;
          uniform float uScrollProgress;
          attribute float aRandom;
          varying float vAlpha;
          varying float vRandom;
          
          void main() {
            vec3 pos = position;
            float offset = aRandom * 6.2831;
            pos.x += sin(uTime * 0.5 + offset) * 0.08;
            pos.y += cos(uTime * 0.3 + offset * 1.5) * 0.08;
            pos.z += sin(uTime * 0.4 + offset * 0.7) * 0.06;
            float collapse = smoothstep(0.7, 1.0, uScrollProgress);
            pos *= mix(1.0, 0.1, collapse);
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            float twinkle = sin(uTime * 2.0 + aRandom * 10.0);
            twinkle = 0.5 + 0.5 * twinkle;
            gl_PointSize = (uSize * 30.0 * twinkle) * (1.0 / -mvPosition.z);
            vAlpha = 0.3 + 0.7 * twinkle;
            vRandom = aRandom;
          }
        `,
                fragmentShader: `
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          varying float vAlpha;
          varying float vRandom;
          
          void main() {
            float r = distance(gl_PointCoord, vec2(0.5));
            if (r > 0.5) discard;
            float glow = 1.0 - (r * 2.0);
            glow = pow(glow, 2.0);
            vec3 color = mix(uColor1, uColor2, vRandom);
            gl_FragColor = vec4(color, vAlpha * glow * 0.8);
          }
        `,
                transparent: true,
                depthWrite: false,
                blending: AdditiveBlending,
            }),
        [isMobile]
    );

    // Wireframe icosahedron — use primitive to avoid R3F JSX registration issues
    const wireframeMesh = useMemo(() => {
        const ico = new IcosahedronGeometry(1.6, wireDetail);
        const geo = new EdgesGeometry(ico);
        const mat = new LineBasicMaterial({
            color: '#FF2D78',
            transparent: true,
            opacity: 0.12,
        });
        return new LineSegments(geo, mat);
    }, [wireDetail]);

    // Particle geometry
    const particleGeo = useMemo(() => {
        const geo = new BufferGeometry();
        geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geo.setAttribute('aRandom', new Float32BufferAttribute(randoms, 1));
        return geo;
    }, [positions, randoms]);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const sp = scrollProgress.current;

        mouseTarget.current.lerp(pointer, 0.05);

        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.05 + mouseTarget.current.x * 0.3;
            groupRef.current.rotation.x = mouseTarget.current.y * 0.2;
            const scale = 1 + sp * 0.3;
            groupRef.current.scale.setScalar(scale);
        }

        if (pointsRef.current) {
            pointsRef.current.material.uniforms.uTime.value = t;
            pointsRef.current.material.uniforms.uScrollProgress.value = sp;
        }

        if (wireframeRef.current) {
            (wireframeRef.current.material as LineBasicMaterial).opacity =
                0.08 + sp * 0.12;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Wireframe via primitive — avoids R3F lowercase element registration issues */}
            <primitive object={wireframeMesh} ref={wireframeRef} />

            {/* Particle cloud */}
            <points ref={pointsRef} geometry={particleGeo} material={particleMaterial} />
        </group>
    );
};

export default NodeSphere;
