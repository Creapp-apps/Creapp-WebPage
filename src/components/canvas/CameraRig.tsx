import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils } from 'three';

interface CameraRigProps {
    scrollProgress: React.MutableRefObject<number>;
}

const CameraRig: React.FC<CameraRigProps> = ({ scrollProgress }) => {
    const { camera } = useThree();
    const currentZ = useRef(5);
    const currentY = useRef(0);

    useFrame(() => {
        const sp = scrollProgress.current;

        // Camera position keyframes based on scroll progress:
        // 0%    → z:5   (wide establishing)
        // 25%   → z:1.5 (zoom into sphere)
        // 50%   → z:3.5 (pull back for services)
        // 100%  → z:2   (tight on CTA)
        let targetZ: number;
        let targetY: number;

        if (sp < 0.25) {
            // 0% → 25%: zoom in
            const t = sp / 0.25;
            targetZ = MathUtils.lerp(5, 1.5, t);
            targetY = 0;
        } else if (sp < 0.5) {
            // 25% → 50%: pull back
            const t = (sp - 0.25) / 0.25;
            targetZ = MathUtils.lerp(1.5, 3.5, t);
            targetY = MathUtils.lerp(0, 0.3, t);
        } else if (sp < 0.75) {
            // 50% → 75%: hold
            targetZ = 3.5;
            targetY = MathUtils.lerp(0.3, 0, (sp - 0.5) / 0.25);
        } else {
            // 75% → 100%: close in
            const t = (sp - 0.75) / 0.25;
            targetZ = MathUtils.lerp(3.5, 2, t);
            targetY = 0;
        }

        // Smooth lerp (no re-renders, direct mutation)
        currentZ.current = MathUtils.lerp(currentZ.current, targetZ, 0.05);
        currentY.current = MathUtils.lerp(currentY.current, targetY, 0.05);

        camera.position.z = currentZ.current;
        camera.position.y = currentY.current;
        camera.lookAt(0, 0, 0);
    });

    return null;
};

export default CameraRig;
