import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { ProposalVideoComposition } from './components/video/ProposalVideoComposition';

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ProposalVideo"
        component={ProposalVideoComposition as any}
        durationInFrames={1440} // 48 seconds
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          aspectRatio: "16:9",
          clientName: "Cliente de Prueba",
          brandPrimary: "#8b5cf6",
          brandSecondary: "#ec4899",
          heroTitle: "Solución Tecnológica Premium",
          inclusions: [],
          exclusions: [],
          milestones: [],
          payments: [],
          totalValue: 5000,
          clientLogoUrl: ""
        }}
      />
      <Composition
        id="ProposalVideoVertical"
        component={ProposalVideoComposition as any}
        durationInFrames={1440} // 48 seconds
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          aspectRatio: "9:16",
          clientName: "Cliente de Prueba",
          brandPrimary: "#8b5cf6",
          brandSecondary: "#ec4899",
          heroTitle: "Solución Tecnológica Premium",
          inclusions: [],
          exclusions: [],
          milestones: [],
          payments: [],
          totalValue: 5000,
          clientLogoUrl: ""
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
