import {
    EffectComposer,
    Bloom,
    Noise,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

const isMobile =
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768);

const PostEffects: React.FC = () => {
    return (
        <EffectComposer multisampling={0}>
            <Bloom
                intensity={isMobile ? 0.3 : 0.5}
                luminanceThreshold={0.6}
                luminanceSmoothing={0.4}
                mipmapBlur
            />
            <Noise
                opacity={0.035}
                blendFunction={BlendFunction.SOFT_LIGHT}
                premultiply
            />
        </EffectComposer>
    );
};

export default PostEffects;
