import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ShaderMaterial, Color, AdditiveBlending } from 'three';

const StarField = (props: any) => {
    const ref = useRef<any>(null);

    // Generate star positions and random values for twinkle
    const [positions, randoms] = useMemo(() => {
        const count = 8000;
        const pos = new Float32Array(count * 3);
        const rand = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const r = 1.2;
            const theta = 2 * Math.PI * Math.random();
            const phi = Math.acos(2 * Math.random() - 1);

            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);

            rand[i] = Math.random();
        }
        return [pos, rand];
    }, []);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#a855f7") },
        uSize: { value: 1.0 } // Base pixel size multiplier
    }), []);

    useFrame((state, delta) => {
        // Rotation
        if (ref.current) {
            ref.current.rotation.x -= delta / 15;
            ref.current.rotation.y -= delta / 20;

            // Update time uniform
            ref.current.material.uniforms.uTime.value = state.clock.elapsedTime;

            // Gentle wave effect
            ref.current.position.y = Math.sin(state.clock.elapsedTime / 4) * 0.02;
        }
    });

    const shaderMaterial = useMemo(() => {
        return new ShaderMaterial({
            uniforms: uniforms,
            vertexShader: `
                uniform float uTime;
                uniform float uSize;
                attribute float aRandom;
                varying float vAlpha;
                
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    
                    // Twinkle effect: vary size and opacity based on time and random offset
                    float twinkle = sin(uTime * 2.0 + aRandom * 10.0);
                    twinkle = smoothstep(-1.0, 1.0, twinkle); // Normalize somewhat
                    
                    // Size attenuation
                    gl_PointSize = (40.0 * uSize * (0.5 + 0.5 * twinkle)) * (1.0 / -mvPosition.z);
                    
                    // Pass opacity to fragment
                    vAlpha = 0.4 + 0.6 * twinkle;
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                varying float vAlpha;
                
                void main() {
                    // Circular particle
                    float r = distance(gl_PointCoord, vec2(0.5));
                    if (r > 0.5) discard;
                    
                    // Soft edge
                    float glow = 1.0 - (r * 2.0);
                    glow = pow(glow, 1.5); 
                    
                    gl_FragColor = vec4(uColor, vAlpha * glow);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
        });
    }, [uniforms]);

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <points ref={ref}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={positions.length / 3}
                        array={positions}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-aRandom"
                        count={randoms.length}
                        array={randoms}
                        itemSize={1}
                    />
                </bufferGeometry>
                <primitive object={shaderMaterial} attach="material" />
            </points>
        </group>
    );
}

const Hero3D: React.FC = () => {
    return (
        <div className="absolute inset-0 z-0">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <StarField />
            </Canvas>
        </div>
    );
};

export default Hero3D;
