import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import NodeSphere from './NodeSphere';
import CameraRig from './CameraRig';

interface WebGLCanvasProps {
    scrollProgress: React.MutableRefObject<number>;
}

const WebGLCanvas: React.FC<WebGLCanvasProps> = ({ scrollProgress }) => {
    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: -1 }}
        >
            <Canvas
                dpr={[1, 1.5]}
                camera={{ position: [0, 0, 5], fov: 50 }}
                gl={{
                    antialias: false,
                    powerPreference: 'high-performance',
                    alpha: true,
                }}
                style={{ background: '#050505' }}
            >
                <Suspense fallback={null}>
                    <ambientLight intensity={0.15} />
                    <pointLight position={[5, 5, 5]} intensity={0.5} color="#FF2D78" />
                    <pointLight position={[-5, -3, 3]} intensity={0.3} color="#9B30FF" />

                    <NodeSphere scrollProgress={scrollProgress} />
                    <CameraRig scrollProgress={scrollProgress} />
                </Suspense>
            </Canvas>
        </div>
    );
};

export default WebGLCanvas;
