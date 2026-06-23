import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import IconResolver from '../ui/IconResolver';

interface Inclusion {
  title?: string;
  description?: string;
  icon_name?: string;
}

interface Milestone {
  title?: string;
  duration?: string;
  description?: string;
}

interface Payment {
  id?: string;
  proposal_id?: string;
  percentage?: string | number;
  label?: string;
  description?: string;
  tooltip?: string;
  sort_order?: number;
  milestone_name?: string;
  amount?: number;
}

interface Exclusion {
  title?: string;
  tooltip?: string;
}

interface ProposalVideoCompositionProps {
  clientName: string;
  brandPrimary: string;
  brandSecondary: string;
  heroTitle: string;
  inclusions: Inclusion[];
  exclusions: Exclusion[];
  milestones: Milestone[];
  payments: Payment[];
  totalValue: number;
  clientLogoUrl?: string;
  aspectRatio?: '16:9' | '9:16';
  currency?: string;
}

// Helper to format currency
const formatPrice = (value: number, currency: string = 'USD') => {
  const formattedVal = Math.round(value).toLocaleString('es-AR');
  const displayCurrency = currency === 'ARS' ? 'ARS' : currency === 'USD' ? 'US$' : currency;
  return `${displayCurrency} ${formattedVal}`;
};

// Background Floating Particles Component
const FloatingParticles: React.FC<{ frame: number; primaryColor: string; secondaryColor: string }> = ({ frame, primaryColor, secondaryColor }) => {
  // Create a static set of initial coordinates for 35 floating particles
  const particles = React.useMemo(() => {
    return Array.from({ length: 35 }).map((_, i) => ({
      x: (i * 12345 + 500) % 1920,
      y: (i * 54321 + 300) % 1080,
      size: (i % 3) + 1.5, // 1.5px to 4.5px
      speedX: ((i % 5) - 2) * 0.12,
      speedY: -((i % 4) + 1) * 0.12,
      color: i % 2 === 0 ? primaryColor : secondaryColor,
    }));
  }, [primaryColor, secondaryColor]);

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
      {particles.map((p, i) => {
        // Simple linear movement wrapped around borders
        const currentX = (p.x + p.speedX * frame + 1920) % 1920;
        const currentY = (p.y + p.speedY * frame + 1080) % 1080;
        
        // Soft pulsing effect
        const pulseOpacity = 0.12 + 0.08 * Math.sin(frame / 12 + i);

        return (
          <circle
            key={i}
            cx={currentX}
            cy={currentY}
            r={p.size}
            fill={p.color}
            opacity={pulseOpacity}
            style={{
              filter: p.size > 3 ? 'blur(0.5px)' : 'none',
            }}
          />
        );
      })}
    </svg>
  );
};

// Word pop animation component for high-impact vertical presentation titles
const WordPop: React.FC<{ text: string; primaryColor: string; secondaryColor: string; frame: number; delayOffset?: number }> = ({ text, primaryColor, secondaryColor, frame, delayOffset = 0 }) => {
  const words = text.split(' ');
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px', width: '100%' }}>
      {words.map((word, i) => {
        const wordDelay = delayOffset + i * 4;
        const wordSpring = spring({ frame: frame - wordDelay, fps: 30, config: { damping: 10, stiffness: 150 } });
        const scale = interpolate(wordSpring, [0, 0.5, 1], [0.3, 1.3, 1], { extrapolateRight: 'clamp' });
        const opacity = interpolate(wordSpring, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });
        
        // Check if word contains highlight markers like [word]
        const isHighlighted = word.startsWith('[') && word.endsWith(']');
        const cleanedWord = word.replace('[', '').replace(']', '');
        
        return (
          <span key={i} style={{
            display: 'inline-block',
            transform: `scale(${scale})`,
            opacity: opacity,
            fontWeight: '950',
            background: isHighlighted ? `linear-gradient(to right, ${primaryColor}, ${secondaryColor || primaryColor})` : 'none',
            WebkitBackgroundClip: isHighlighted ? 'text' : 'none',
            WebkitTextFillColor: isHighlighted ? 'transparent' : 'inherit',
            textShadow: isHighlighted ? `0 0 25px ${primaryColor}40` : 'none',
          }}>
            {cleanedWord}
          </span>
        );
      })}
    </span>
  );
};

export const ProposalVideoComposition: React.FC<ProposalVideoCompositionProps> = ({
  clientName = 'Cliente',
  brandPrimary = '#0f172a',
  brandSecondary = '#3b82f6',
  heroTitle = 'SOFTWARE LAB',
  inclusions = [],
  exclusions = [],
  milestones = [],
  payments = [],
  totalValue = 0,
  clientLogoUrl = '',
  aspectRatio = '16:9',
  currency = 'USD',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = aspectRatio === '9:16';

  // Color values
  const primaryColor = brandPrimary || '#3b82f6';
  const secondaryColor = brandSecondary || '#1d4ed8';

  // Base layout styles for slides
  const slideBgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: '#030712',
    backgroundImage: `radial-gradient(circle at 80% 20%, ${primaryColor}15 0%, transparent 50%), radial-gradient(circle at 20% 80%, ${secondaryColor}10 0%, transparent 60%)`,
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isVertical ? '80px 45px' : '80px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#030712' }}>
      {/* FLOATING PARTICLES LAYER */}
      <FloatingParticles frame={frame} primaryColor={primaryColor} secondaryColor={secondaryColor} />

      {/* BACKGROUND FLOATING DECORATIONS */}
      <div style={{
        position: 'absolute',
        width: isVertical ? '250px' : '400px',
        height: isVertical ? '250px' : '400px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}20 0%, transparent 70%)`,
        top: '-50px',
        right: '-50px',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute',
        width: isVertical ? '300px' : '500px',
        height: isVertical ? '300px' : '500px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${secondaryColor}15 0%, transparent 70%)`,
        bottom: '-100px',
        left: '-100px',
        filter: 'blur(50px)',
      }} />

      {/* HEADER DECORATION (visible across all frames) */}
      <div style={{
        position: 'absolute',
        top: '40px',
        left: isVertical ? '45px' : '80px',
        right: isVertical ? '45px' : '80px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: primaryColor }} />
          <span style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '2px', color: '#f3f4f6' }}>CREAPP</span>
        </div>
        <span style={{ fontSize: isVertical ? '9px' : '11px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {heroTitle}
        </span>
      </div>

      {/* SLIDE 1: INTRO (0s - 8s / 0 - 240 frames) */}
      <Sequence from={0} durationInFrames={240}>
        <IntroSlide
          clientName={clientName}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          heroTitle={heroTitle}
          slideBgStyle={slideBgStyle}
          clientLogoUrl={clientLogoUrl}
          aspectRatio={aspectRatio}
        />
      </Sequence>

      {/* SLIDE 2: DELIVERABLES / ALCANCE (8s - 14s / 240 - 420 frames) */}
      <Sequence from={240} durationInFrames={180}>
        <DeliverablesSlide
          inclusions={inclusions}
          primaryColor={primaryColor}
          slideBgStyle={slideBgStyle}
          aspectRatio={aspectRatio}
        />
      </Sequence>

      {/* SLIDE 3: EXCLUSIONES / FUERA DE ALCANCE (14s - 20s / 420 - 600 frames) */}
      <Sequence from={420} durationInFrames={180}>
        <ExclusionsSlide
          exclusions={exclusions}
          slideBgStyle={slideBgStyle}
          aspectRatio={aspectRatio}
        />
      </Sequence>

      {/* SLIDE 4: TIMELINE / HITOS DE TRABAJO (20s - 26s / 600 - 780 frames) */}
      <Sequence from={600} durationInFrames={180}>
        <TimelineSlide
          milestones={milestones}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          slideBgStyle={slideBgStyle}
          aspectRatio={aspectRatio}
        />
      </Sequence>

      {/* SLIDE 5: WEEKS / DETALLE DE SEMANAS (26s - 32s / 780 - 960 frames) */}
      <Sequence from={780} durationInFrames={180}>
        <WeeksDetailSlide
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          slideBgStyle={slideBgStyle}
          aspectRatio={aspectRatio}
        />
      </Sequence>

      {/* SLIDE 6: METHODOLOGY / METODOLOGÍA (32s - 38s / 960 - 1140 frames) */}
      <Sequence from={960} durationInFrames={180}>
        <MethodologySlide
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          slideBgStyle={slideBgStyle}
          aspectRatio={aspectRatio}
        />
      </Sequence>

      {/* SLIDE 7: FINANCIALS / PRESUPUESTO (38s - 44s / 1140 - 1320 frames) */}
      <Sequence from={1140} durationInFrames={180}>
        <FinancialsSlide
          totalValue={totalValue}
          payments={payments}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          slideBgStyle={slideBgStyle}
          aspectRatio={aspectRatio}
          currency={currency}
        />
      </Sequence>

      {/* SLIDE 8: OUTRO / CONTRATO Y FIRMA (44s - 48s / 1320 - 1440 frames) */}
      <Sequence from={1320} durationInFrames={120}>
        <OutroSlide
          clientName={clientName}
          primaryColor={primaryColor}
          slideBgStyle={slideBgStyle}
          aspectRatio={aspectRatio}
        />
      </Sequence>

      {/* FOOTER WATERMARK */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: isVertical ? '45px' : '80px',
        right: isVertical ? '45px' : '80px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        fontSize: '11px',
        color: '#4b5563',
      }}>
        <span>Propuesta Comercial Interactiva</span>
        <span>© {new Date().getFullYear()} creapp.cc</span>
      </div>
    </div>
  );
};

// ==========================================
// INDIVIDUAL SLIDE COMPONENTS WITH ANIMATIONS
// ==========================================

// 1. Intro Slide
const IntroSlide: React.FC<{
  clientName: string;
  primaryColor: string;
  secondaryColor: string;
  heroTitle: string;
  slideBgStyle: React.CSSProperties;
  clientLogoUrl?: string;
  aspectRatio?: '16:9' | '9:16';
}> = ({ clientName, primaryColor, secondaryColor, heroTitle, slideBgStyle, clientLogoUrl = '', aspectRatio = '16:9' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = aspectRatio === '9:16';

  // Exit transition of the entire slide starts at frame 225
  const exit = spring({ frame: frame - 225, fps, config: { damping: 12, stiffness: 100 } });

  // Overall slide container transitions
  const slideOpacity = interpolate(exit, [0, 1], [1, 0]);
  const slideScale = interpolate(exit, [0, 1], [1, 0.92]);
  const rotateY = interpolate(exit, [0, 1], [0, -35]);
  const translateX = interpolate(exit, [0, 1], [0, -350]);
  const transform = `perspective(1200px) scale(${slideScale}) rotateY(${rotateY}deg) translateX(${translateX}px)`;

  // FASE 1: Cobranding / Unión de Logos (frames 0 a 110)
  // Coordinates based on aspectRatio
  const logoCreappOffset = interpolate(frame, [0, 45], [-800, isVertical ? -200 : -150], { extrapolateRight: 'clamp' });
  const logoClientOffset = interpolate(frame, [0, 45], [800, isVertical ? 200 : 150], { extrapolateRight: 'clamp' });
  
  // Both logos scale down and fade out at the end of the alliance phase
  const logoScale = interpolate(frame, [0, 25, 45, 100, 108], [0, 1.15, 1, 1, 0], { extrapolateRight: 'clamp' });
  const logoOpacity = interpolate(frame, [0, 15, 100, 108], [0, 1, 1, 0], { extrapolateRight: 'clamp' });

  // Flash impact effect when collision happens at frame 45
  const flashProgress = interpolate(frame, [44, 46, 48, 68], [0, 0.95, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const flashScale = interpolate(frame, [44, 68], [0.5, 6.0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Connection 'x' opacity and scale
  const connXOpacity = interpolate(frame, [45, 52, 100, 108], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const connXScale = interpolate(frame, [45, 52], [0.2, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Text subtitle beneath logos
  const textAllianceOpacity = interpolate(frame, [49, 57, 100, 108], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const textAllianceY = interpolate(frame, [49, 57], [25, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // FASE 2: Propuesta Principal (frames 100 a 240)
  const showMainProposal = frame >= 100;
  const mainEntrance = spring({ frame: frame - 100, fps, config: { damping: 13, stiffness: 95 } });
  const mainOpacity = interpolate(frame, [100, 115], [0, 1], { extrapolateLeft: 'clamp' });
  const mainScale = interpolate(mainEntrance, [0, 1], [0.88, 1]);
  const mainY = interpolate(mainEntrance, [0, 1], [30, 0]);

  // Client Initial for the stylized Client logo
  const clientInitial = clientName ? clientName.charAt(0).toUpperCase() : 'C';

  return (
    <div style={{ 
      ...slideBgStyle, 
      transform, 
      opacity: slideOpacity, 
      position: 'relative', 
      overflow: 'hidden' 
    }}>
      {/* Background soft lighting glow */}
      <div style={{
        position: 'absolute',
        width: isVertical ? '500px' : '800px',
        height: isVertical ? '500px' : '800px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}18 0%, transparent 70%)`,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 0,
      }} />

      {/* FASE 1: BRAND ALLIANCE CONTAINER */}
      {frame < 110 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
        }}>
          {/* Collision Flash Effect */}
          <div style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,255,255,0.98) 0%, ${primaryColor}60 30%, transparent 70%)`,
            opacity: flashProgress,
            transform: `scale(${flashScale})`,
            pointerEvents: 'none',
            zIndex: 3,
          }} />

          {/* Stellar Spark Particles Explosion (36 Dynamic Elements) */}
          {Array.from({ length: 36 }).map((_, index) => {
            const angle = (index * 360) / 36;
            const angleRad = ((angle + (index % 3) * 12) * Math.PI) / 180;
            const maxDist = isVertical ? 150 + (index % 6) * 35 : 200 + (index % 6) * 55; // Distance particle travels
            const size = 4 + (index % 4) * 2;       // Particle size (4px to 10px)
            const pDelay = (index % 5) * 2;        // Slight latency between sparks
            
            // Interpolate animations specifically for this particle
            const progress = interpolate(frame, [45 + pDelay, 88], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const opacity = interpolate(frame, [45 + pDelay, 45 + pDelay + 6, 85], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            
            const x = Math.cos(angleRad) * progress * maxDist;
            const y = Math.sin(angleRad) * progress * maxDist;
            const isStar = index % 3 === 0;

            const colorPalette = [
              '#ffffff', 
              primaryColor, 
              secondaryColor, 
              '#fffbeb', 
              '#e0e7ff'
            ];
            const color = colorPalette[index % colorPalette.length];

            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  width: `${size}px`,
                  height: `${size}px`,
                  borderRadius: isStar ? '1px' : '50%',
                  background: color,
                  boxShadow: `0 0 12px ${color}`,
                  opacity: opacity,
                  transform: `translate(${x}px, ${y}px) rotate(${progress * 180}deg) scale(${interpolate(progress, [0, 0.8, 1], [0.1, 1, 0])})`,
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              />
            );
          })}

          {/* Logos Row / Column */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            position: 'relative', 
            height: isVertical ? '650px' : '180px', 
            width: '100%', 
            maxWidth: '700px' 
          }}>
            
            {/* Connection symbol (X) */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              fontSize: isVertical ? '90px' : '38px',
              fontWeight: 900,
              color: '#ffffff',
              opacity: connXOpacity,
              transform: `translate(-50%, -50%) scale(${connXScale})`,
              zIndex: 4,
              textShadow: '0 0 15px rgba(255,255,255,0.7)',
            }}>
              ×
            </div>

            {/* Logo 1: CREAPP */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: isVertical ? '250px' : '165px',
              height: isVertical ? '250px' : '165px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isVertical 
                ? `translate(-50%, calc(-50% + ${logoCreappOffset}px)) scale(${logoScale})`
                : `translate(calc(-50% + ${logoCreappOffset}px), -50%) scale(${logoScale})`,
              opacity: logoOpacity,
              zIndex: 2,
            }}>
              <img
                src="/CREAPP LOGO VECTOR.png"
                alt="CREAPP Logo"
                style={{
                  width: isVertical ? '210px' : '140px',
                  height: isVertical ? '210px' : '140px',
                  objectFit: 'contain',
                }}
              />
            </div>

            {/* Logo 2: CLIENT */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: isVertical ? '250px' : '165px',
              height: isVertical ? '250px' : '165px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isVertical
                ? `translate(-50%, calc(-50% + ${logoClientOffset}px)) scale(${logoScale})`
                : `translate(calc(-50% + ${logoClientOffset}px), -50%) scale(${logoScale})`,
              opacity: logoOpacity,
              zIndex: 2,
              borderRadius: clientLogoUrl ? '0%' : '50%',
              border: clientLogoUrl ? 'none' : `2px solid ${secondaryColor}30`,
              background: clientLogoUrl ? 'transparent' : '#0a0f1d',
              boxShadow: clientLogoUrl ? 'none' : `0 0 25px ${secondaryColor}20`,
            }}>
              {clientLogoUrl ? (
                <img
                  src={clientLogoUrl}
                  alt="Client Logo"
                  style={{
                    width: isVertical ? '210px' : '140px',
                    height: isVertical ? '210px' : '140px',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                /* Stylized high tech client avatar with glow */
                <div style={{
                  width: isVertical ? '190px' : '100px',
                  height: isVertical ? '190px' : '100px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${secondaryColor}25, #000000 70%)`,
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isVertical ? '80px' : '44px',
                  fontWeight: 900,
                  color: '#ffffff',
                  fontFamily: 'system-ui, sans-serif',
                  textShadow: `0 0 20px ${secondaryColor}`,
                }}>
                  {clientInitial}
                </div>
              )}
            </div>

          </div>

          {/* Alliance Text Description */}
          <div style={{
            marginTop: isVertical ? '70px' : '35px',
            textAlign: 'center',
            opacity: textAllianceOpacity,
            transform: `translateY(${textAllianceY}px)`,
          }}>
            <p style={{
              margin: 0,
              fontSize: isVertical ? '26px' : '15px',
              fontWeight: 'bold',
              color: primaryColor,
              letterSpacing: isVertical ? '4.5px' : '3px',
              textTransform: 'uppercase',
            }}>
              Alianza Estratégica
            </p>
            <h3 style={{
              margin: isVertical ? '18px 0 0 0' : '8px 0 0 0',
              fontSize: isVertical ? '52px' : '28px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.5px',
            }}>
              CREAPP <span style={{ color: '#9ca3af', fontWeight: 300 }}>×</span> {clientName}
            </h3>
            <p style={{
              margin: isVertical ? '14px 0 0 0' : '6px 0 0 0',
              fontSize: isVertical ? '24px' : '14px',
              color: '#9ca3af',
              fontWeight: 400,
            }}>
              Construyendo juntos una solución de alto impacto.
            </p>
          </div>
        </div>
      )}

      {/* FASE 2: MAIN PROPOSAL TITLE CONTENT */}
      {showMainProposal && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: isVertical ? '45px' : '20px', 
          textAlign: 'center',
          zIndex: 2,
          position: 'relative',
          opacity: mainOpacity,
          transform: `scale(${mainScale}) translateY(${mainY}px)`,
        }}>
          {/* Dynamic Badge */}
          <div style={{
            padding: isVertical ? '14px 32px' : '6px 16px',
            borderRadius: '50px',
            border: `1px solid ${primaryColor}40`,
            background: `${primaryColor}10`,
            fontSize: isVertical ? '24px' : '13px',
            fontWeight: 'bold',
            color: primaryColor,
            letterSpacing: isVertical ? '3.5px' : '2.5px',
            textTransform: 'uppercase',
            boxShadow: `0 0 15px ${primaryColor}20`,
          }}>
            Propuesta Comercial
          </div>

          {/* Hero Title */}
          {isVertical ? (
            <h1 style={{
              fontSize: '76px',
              fontWeight: 950,
              margin: 0,
              letterSpacing: '-2px',
              lineHeight: '1.2',
              textTransform: 'uppercase',
              maxWidth: '95%',
            }}>
              <WordPop 
                text={`DISEÑO Y DESARROLLO [${heroTitle.toUpperCase()}]`} 
                primaryColor={primaryColor} 
                secondaryColor={secondaryColor} 
                frame={frame - 110} 
              />
            </h1>
          ) : (
            <h1 style={{
              fontSize: '68px',
              fontWeight: 950,
              margin: 0,
              letterSpacing: '-1.5px',
              lineHeight: '1.15',
              textTransform: 'uppercase',
              maxWidth: '850px',
            }}>
              Diseño y Desarrollo <span style={{
                background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: `0 0 40px ${primaryColor}20`,
              }}>{heroTitle}</span>
            </h1>
          )}

          {/* Client Name Subtitle */}
          <p style={{
            fontSize: isVertical ? '32px' : '22px',
            color: '#9ca3af',
            margin: isVertical ? '30px 0 0 0' : '10px 0 0 0',
            fontWeight: 300,
          }}>
            Preparado exclusivamente para <strong style={{ color: '#ffffff', fontWeight: '800' }}>{clientName}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

// 2. Deliverables Slide
const DeliverablesSlide: React.FC<{
  inclusions: Inclusion[];
  primaryColor: string;
  slideBgStyle: React.CSSProperties;
  aspectRatio?: '16:9' | '9:16';
}> = ({ inclusions, primaryColor, slideBgStyle, aspectRatio = '16:9' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = aspectRatio === '9:16';

  // Slide is 180 frames. Exit transition starts at frame 165.
  const entrance = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const exit = spring({ frame: frame - 165, fps, config: { damping: 12, stiffness: 100 } });

  // Transitions: slide in from right with Y-rotation, exit with zoom out & blur
  const entranceX = interpolate(entrance, [0, 1], [isVertical ? 1080 : 300, 0]);
  const exitX = interpolate(exit, [0, 1], [0, isVertical ? -1080 : 0]);
  const entranceRotateY = isVertical ? 0 : interpolate(entrance, [0, 1], [30, 0]);
  const exitScale = isVertical ? 1 : interpolate(exit, [0, 1], [1, 0.85]);
  const exitBlur = isVertical ? 0 : interpolate(exit, [0, 1], [0, 12]);
  const opacity = entrance * interpolate(exit, [0, 1], [1, 0]);
  const transform = isVertical
    ? `translateX(${entranceX + exitX}px)`
    : `perspective(1200px) translateX(${entranceX}px) rotateY(${entranceRotateY}deg) scale(${exitScale})`;

  const titleY = interpolate(entrance, [0, 1], [30, 0]);

  // Render deliverables dynamically (limit to 4 on vertical to avoid overflow, 6 on horizontal)
  const itemsToShow = inclusions.filter(inc => inc.title).slice(0, isVertical ? 4 : 6);
  const isLargeGrid = itemsToShow.length > 4;
  const gridGap = isVertical ? '14px' : (isLargeGrid ? '16px' : '24px');

  return (
    <div style={{ 
      ...slideBgStyle, 
      transform, 
      opacity, 
      filter: `blur(${exitBlur}px)`,
      justifyContent: isVertical ? 'center' : 'flex-start', 
      paddingTop: isVertical ? '0px' : '160px',
      paddingLeft: isVertical ? '50px' : '80px',
      paddingRight: isVertical ? '50px' : '80px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Floating Grid Particles */}
      {[...Array(6)].map((_, i) => {
        const offset = i * 60;
        const py = interpolate((frame + offset) % 120, [0, 120], [800, 100]);
        const px = isVertical ? 50 + i * 80 : 150 + i * 160;
        const pOpacity = interpolate((frame + offset) % 120, [0, 20, 100, 120], [0, 0.15, 0.15, 0]);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${px}px`,
            top: `${py}px`,
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: primaryColor,
            opacity: pOpacity,
            filter: 'blur(1px)',
            zIndex: 0,
          }} />
        );
      })}

      {/* Animated Wave Graph in the background */}
      <svg style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        width: '100%',
        height: isVertical ? '80px' : '140px',
        opacity: 0.12,
        zIndex: 0,
      }}>
        <path
          d={`M 0 70 Q 480 ${70 + 40 * Math.sin(frame / 10)} 960 70 T 1920 70 L 1920 140 L 0 140 Z`}
          fill={`url(#wave-grad-${primaryColor.replace('#', '')})`}
        />
        <defs>
          <linearGradient id={`wave-grad-${primaryColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: isVertical ? '50px' : '25px', zIndex: 1, position: 'relative' }}>
        <div style={{ opacity: entrance }}>
          {isVertical ? (
            <h2 style={{ fontSize: '72px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-2px', lineHeight: '1.2' }}>
              <WordPop 
                text={`ALCANCE Y [ENTREGABLES]`} 
                primaryColor={primaryColor} 
                secondaryColor={primaryColor} 
                frame={frame - 10} 
              />
            </h2>
          ) : (
            <h2 style={{ fontSize: '52px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
              Alcance & <span style={{ color: primaryColor, fontStyle: 'italic' }}>Entregables</span>
            </h2>
          )}
          <p style={{ fontSize: isVertical ? '26px' : '20px', color: '#9ca3af', margin: isVertical ? '20px 0 0 0' : '8px 0 0 0', fontWeight: 400 }}>
            Componentes principales contemplados dentro del alcance del proyecto.
          </p>
        </div>

        {/* Grid Container */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isVertical ? '1fr' : '1fr 1fr',
          gap: isVertical ? '28px' : gridGap,
          width: '100%',
        }}>
          {itemsToShow.map((item, index) => {
            const delay = 15 + index * 10;
            const itemSpring = spring({ frame: frame - delay, fps, config: { damping: 12 } });
            const itemY = interpolate(itemSpring, [0, 1], [50, 0]);
            const itemScale = interpolate(itemSpring, [0, 1], [0.9, 1]);
            const itemRotate = interpolate(itemSpring, [0, 1], [3, 0]);

            return (
              <div key={index} style={{
                opacity: itemSpring,
                transform: `translateY(${itemY}px) scale(${itemScale}) rotateX(${itemRotate}deg)`,
                padding: isVertical ? '35px 40px' : (isLargeGrid ? '18px 22px' : '22px 28px'),
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                display: 'flex',
                gap: isVertical ? '30px' : '20px',
                alignItems: 'center',
                boxSizing: 'border-box',
                boxShadow: '0 12px 35px -10px rgba(0, 0, 0, 0.4)',
              }}>
                <div style={{
                  padding: isVertical ? '32px' : '16px',
                  borderRadius: '24px',
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 15px ${primaryColor}25`,
                  flexShrink: 0
                }}>
                  <IconResolver name={item.icon_name || 'CheckCircle2'} className={isVertical ? 'w-12 h-12' : 'w-7 h-7'} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, textAlign: 'left' }}>
                  <h3 style={{ fontSize: isVertical ? '38px' : '22px', fontWeight: '800', margin: 0, textTransform: 'uppercase', color: '#f3f4f6', lineHeight: '1.2' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: isVertical ? '26px' : '15px', color: '#e5e7eb', margin: 0, lineHeight: '1.45', fontWeight: 400 }}>
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Bento Box Grid for Deliverables */}
        <div style={{
          opacity: spring({ frame: frame - 50, fps, config: { damping: 15 } }),
          transform: `translateY(${interpolate(spring({ frame: frame - 50, fps, config: { damping: 15 } }), [0, 1], [30, 0])}px)`,
          marginTop: isVertical ? '50px' : '15px',
          display: 'grid',
          gridTemplateColumns: isVertical ? '1fr' : '1fr 1fr 1fr',
          gap: isVertical ? '28px' : '20px',
          width: '100%',
        }}>
          {/* Card 1: Soporte & QA */}
          <div style={{
            padding: isVertical ? '30px 36px' : '22px 28px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: isVertical ? '14px' : '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: primaryColor, boxShadow: `0 0 10px ${primaryColor}`, flexShrink: 0 }} />
              <span style={{ fontSize: isVertical ? '28px' : '16px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                GARANTÍA DE SOPORTE & QA
              </span>
            </div>
            <p style={{ fontSize: isVertical ? '24px' : '15px', color: '#e5e7eb', fontWeight: 400, margin: 0, lineHeight: '1.45' }}>
              Fases dedicadas de aseguramiento de calidad (QA) y soporte técnico post-lanzamiento.
            </p>
          </div>

          {/* Card 2: Código Limpio */}
          <div style={{
            padding: isVertical ? '30px 36px' : '22px 28px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: isVertical ? '14px' : '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: primaryColor, boxShadow: `0 0 10px ${primaryColor}`, flexShrink: 0 }} />
              <span style={{ fontSize: isVertical ? '28px' : '16px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                CÓDIGO LIMPIO & ESCALABLE
              </span>
            </div>
            <p style={{ fontSize: isVertical ? '24px' : '15px', color: '#e5e7eb', fontWeight: 400, margin: 0, lineHeight: '1.45' }}>
              Arquitectura modular y documentación técnica bajo estándares óptimos de desarrollo.
            </p>
          </div>

          {/* Card 3: Metodología Interactiva (only shown on horizontal to prevent mobile vertical overflow) */}
          {!isVertical && (
            <div style={{
              padding: '22px 28px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: primaryColor, boxShadow: `0 0 10px ${primaryColor}` }} />
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  DESPLIEGUES CONTINUOS
                </span>
              </div>
              <p style={{ fontSize: '15px', color: '#e5e7eb', fontWeight: 400, margin: 0, lineHeight: '1.45' }}>
                Integración continua (CI/CD) y despliegue rápido en entornos de staging para pruebas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 2b. Exclusions Slide
const ExclusionsSlide: React.FC<{
  exclusions: Exclusion[];
  slideBgStyle: React.CSSProperties;
  aspectRatio?: '16:9' | '9:16';
}> = ({ exclusions, slideBgStyle, aspectRatio = '16:9' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = aspectRatio === '9:16';

  // Slide is 180 frames. Exit transition starts at frame 165.
  const entrance = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const exit = spring({ frame: frame - 165, fps, config: { damping: 12, stiffness: 100 } });

  // Transitions: lateral swipe for vertical, radial clip path sweep entry + 3D rotate-down exit for horizontal
  const entranceX = interpolate(entrance, [0, 1], [isVertical ? 1080 : 0, 0]);
  const exitX = interpolate(exit, [0, 1], [0, isVertical ? -1080 : 0]);
  const clipProgress = interpolate(entrance, [0, 1], [0, 100]);
  const exitRotateX = isVertical ? 0 : interpolate(exit, [0, 1], [0, -90]);
  const exitScale = isVertical ? 1 : interpolate(exit, [0, 1], [1, 0.8]);
  const opacity = entrance * interpolate(exit, [0, 1], [1, 0]);
  const transform = isVertical
    ? `translateX(${entranceX + exitX}px)`
    : `perspective(1200px) rotateX(${exitRotateX}deg) scale(${exitScale})`;
  const clipPath = isVertical ? 'none' : `circle(${clipProgress}% at 50% 50%)`;

  const titleY = interpolate(entrance, [0, 1], [30, 0]);

  // Render up to 4 items in vertical to avoid overflow, 6 in horizontal
  const itemsToShow = exclusions.filter(exc => exc.title).slice(0, isVertical ? 4 : 6);
  const isLargeGrid = itemsToShow.length > 4;
  const gridGap = isVertical ? '14px' : (isLargeGrid ? '16px' : '24px');

  return (
    <div style={{ 
      ...slideBgStyle, 
      transform, 
      opacity, 
      clipPath,
      justifyContent: isVertical ? 'center' : 'flex-start', 
      paddingTop: isVertical ? '0px' : '160px',
      paddingLeft: isVertical ? '50px' : '80px',
      paddingRight: isVertical ? '50px' : '80px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Animated Diagonal Security Stripes */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.04,
        background: `repeating-linear-gradient(45deg, #f43f5e, #f43f5e 10px, transparent 10px, transparent 20px)`,
        transform: `translateX(${frame * 0.4}px)`,
        zIndex: 0,
      }} />

      {/* Floating Red Orb */}
      <div style={{
        position: 'absolute',
        left: '-10%',
        bottom: '-10%',
        width: isVertical ? '200px' : '350px',
        height: isVertical ? '200px' : '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(244,63,94,0.08) 0%, transparent 70%)',
        transform: `scale(${1 + 0.08 * Math.sin(frame / 12)})`,
        zIndex: 0,
      }} />

      {/* Animated Limit Boundary Graph in the background */}
      <svg style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        width: '100%',
        height: isVertical ? '80px' : '140px',
        opacity: 0.06,
        zIndex: 0,
      }}>
        {/* Animated grid lines pattern representing a boundary zone */}
        {[...Array(20)].map((_, i) => {
          const x = i * 100 + ((frame * 1.2) % 100);
          return (
            <line
              key={i}
              x1={x}
              y1="0"
              x2={x - 40}
              y2="140"
              stroke="#f43f5e"
              strokeWidth="2.5"
            />
          );
        })}
      </svg>

      <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: isVertical ? '50px' : '25px', zIndex: 1, position: 'relative' }}>
        <div style={{ opacity: entrance }}>
          {isVertical ? (
            <h2 style={{ fontSize: '72px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-2px', lineHeight: '1.2' }}>
              <WordPop 
                text={`FUERA DE [ALCANCE]`} 
                primaryColor="#f43f5e" 
                secondaryColor="#f43f5e" 
                frame={frame - 10} 
              />
            </h2>
          ) : (
            <h2 style={{ fontSize: '52px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
              Fuera de <span style={{ color: '#f43f5e', fontStyle: 'italic' }}>Alcance</span>
            </h2>
          )}
          <p style={{ fontSize: isVertical ? '26px' : '20px', color: '#9ca3af', margin: isVertical ? '20px 0 0 0' : '8px 0 0 0', fontWeight: 400 }}>
            Aspectos, integraciones y requerimientos no contemplados en el desarrollo de la presente propuesta.
          </p>
        </div>

        {/* Grid Container */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isVertical ? '1fr' : '1fr 1fr',
          gap: isVertical ? '28px' : gridGap,
          width: '100%',
        }}>
          {itemsToShow.length > 0 ? (
            itemsToShow.map((item, index) => {
              const delay = 15 + index * 10;
              const itemSpring = spring({ frame: frame - delay, fps, config: { damping: 12 } });
              const itemY = interpolate(itemSpring, [0, 1], [40, 0]);
              const itemScale = interpolate(itemSpring, [0, 1], [0.95, 1]);

              return (
                <div key={index} style={{
                  opacity: itemSpring,
                  transform: `translateY(${itemY}px) scale(${itemScale})`,
                  padding: isVertical ? '35px 40px' : (isLargeGrid ? '18px 22px' : '22px 28px'),
                  borderRadius: '20px',
                  border: '1px solid rgba(244, 63, 94, 0.15)',
                  background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.03) 0%, rgba(244, 63, 94, 0.01) 100%)',
                  display: 'flex',
                  gap: isVertical ? '30px' : '20px',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  boxShadow: '0 12px 35px -10px rgba(0, 0, 0, 0.4)',
                }}>
                  <div style={{
                    padding: isVertical ? '32px' : '16px',
                    borderRadius: '24px',
                    backgroundColor: 'rgba(244, 63, 94, 0.12)',
                    color: '#f43f5e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(244, 63, 94, 0.25)',
                    flexShrink: 0
                  }}>
                    <IconResolver name="XCircle" className={isVertical ? 'w-12 h-12' : 'w-7 h-7'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, textAlign: 'left' }}>
                    <h3 style={{ fontSize: isVertical ? '38px' : '22px', fontWeight: '800', margin: 0, textTransform: 'uppercase', color: '#fca5a5', lineHeight: '1.2' }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: isVertical ? '26px' : '15px', color: '#fca5a5', opacity: 0.9, margin: 0, lineHeight: '1.45', fontWeight: 400 }}>
                      {item.tooltip || 'No incluido en el presupuesto base.'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              gridColumn: isVertical ? 'auto' : 'span 2',
              padding: isVertical ? '40px' : '40px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: isVertical ? '24px' : '18px',
              fontWeight: 400,
              background: 'rgba(255, 255, 255, 0.01)',
              borderRadius: '20px',
              border: '1px dashed rgba(255, 255, 255, 0.05)',
            }}>
              No se detallaron exclusiones adicionales.
            </div>
          )}
        </div>

        {/* Footer Bento Box Grid for Exclusions */}
        <div style={{
          opacity: spring({ frame: frame - 50, fps, config: { damping: 15 } }),
          transform: `translateY(${interpolate(spring({ frame: frame - 50, fps, config: { damping: 15 } }), [0, 1], [30, 0])}px)`,
          marginTop: isVertical ? '50px' : '15px',
          display: 'grid',
          gridTemplateColumns: isVertical ? '1fr' : '1fr 1fr 1fr',
          gap: isVertical ? '28px' : '20px',
          width: '100%',
        }}>
          {/* Card 1: Gestión de orden de cambio */}
          <div style={{
            padding: isVertical ? '30px 36px' : '22px 28px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px dashed rgba(244, 63, 94, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: isVertical ? '14px' : '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e', boxShadow: '0 0 10px #f43f5e', flexShrink: 0 }} />
              <span style={{ fontSize: isVertical ? '28px' : '16px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                GESTIÓN DE CAMBIOS
              </span>
            </div>
            <p style={{ fontSize: isVertical ? '24px' : '15px', color: '#fca5a5', opacity: 1, fontWeight: 400, margin: 0, lineHeight: '1.45' }}>
              Cualquier cambio o adición al alcance acordado requerirá una cotización y orden complementaria.
            </p>
          </div>

          {/* Card 2: Costos de infraestructura */}
          <div style={{
            padding: isVertical ? '30px 36px' : '22px 28px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px dashed rgba(244, 63, 94, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: isVertical ? '14px' : '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e', boxShadow: '0 0 10px #f43f5e', flexShrink: 0 }} />
              <span style={{ fontSize: isVertical ? '28px' : '16px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                SERVIDORES & APIS
              </span>
            </div>
            <p style={{ fontSize: isVertical ? '24px' : '15px', color: '#fca5a5', opacity: 1, fontWeight: 400, margin: 0, lineHeight: '1.45' }}>
              Los costos de servidores, dominios y consumo de APIs externas corren por cuenta del cliente.
            </p>
          </div>

          {/* Card 3: Soporte fuera de contrato (only shown on horizontal to prevent mobile vertical overflow) */}
          {!isVertical && (
            <div style={{
              padding: '22px 28px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: '1px dashed rgba(244, 63, 94, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e', boxShadow: '0 0 10px #f43f5e' }} />
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  ADMINISTRACIÓN POST-ENTREGA
                </span>
              </div>
              <p style={{ fontSize: '15px', color: '#fca5a5', opacity: 1, fontWeight: 400, margin: 0, lineHeight: '1.45' }}>
                El mantenimiento evolutivo y administración diaria del sistema no forman parte de este acuerdo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TimelineSlide: React.FC<{
  milestones: Milestone[];
  primaryColor: string;
  secondaryColor: string;
  slideBgStyle: React.CSSProperties;
  aspectRatio?: '16:9' | '9:16';
}> = ({ milestones, primaryColor, secondaryColor, slideBgStyle, aspectRatio = '16:9' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = aspectRatio === '9:16';

  // Slide is 180 frames. Exit transition starts at frame 165.
  const entrance = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const exit = spring({ frame: frame - 165, fps, config: { damping: 12, stiffness: 100 } });

  // Transitions: vertical translation entry and exit for horizontal, horizontal swipe for vertical
  const entranceX = interpolate(entrance, [0, 1], [isVertical ? 1080 : 0, 0]);
  const exitX = interpolate(exit, [0, 1], [0, isVertical ? -1080 : 0]);
  const entranceY = isVertical ? 0 : interpolate(entrance, [0, 1], [-200, 0]);
  const exitY = isVertical ? 0 : interpolate(exit, [0, 1], [0, 250]);
  const opacity = entrance * interpolate(exit, [0, 1], [1, 0]);
  const scale = isVertical ? 1 : interpolate(entrance, [0, 1], [0.85, 1]) * interpolate(exit, [0, 1], [1, 0.9]);
  const transform = isVertical
    ? `translateX(${entranceX + exitX}px)`
    : `translateY(${entranceY + exitY}px) scale(${scale})`;

  // Progress of the timeline connector line
  const lineProgress = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 80 } });
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 100]);

  // Show up to 4 milestones
  const itemsToShow = milestones.filter(m => m.title).slice(0, 4);

  // Rich metadata for timeline phases
  const milestoneSubItems = [
    [
      'Arquitectura base & DB',
      'Configuración de seguridad JWT',
      'Maquetado UX Mobile-First',
    ],
    [
      'Dashboard interactivo',
      'Control y log de suelos vivos',
      'Panel de acciones rápidas',
    ],
    [
      'Asistente de IA contextual',
      'QA & testing de integración',
      'Deploy de calculadoras',
    ],
    [
      'QA estético y responsivo',
      'Pruebas de regresión CSS',
      'Despliegue final en producción',
    ]
  ];

  const milestoneStatuses = [
    { label: 'Completado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    { label: 'Siguiente', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
    { label: 'En progreso', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
    { label: 'En espera', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.12)', border: 'rgba(156, 163, 175, 0.3)' }
  ];

  return (
    <div style={{ 
      ...slideBgStyle, 
      transform, 
      opacity, 
      justifyContent: isVertical ? 'center' : 'flex-start', 
      paddingTop: isVertical ? '0px' : '130px',
      paddingLeft: isVertical ? '50px' : '80px',
      paddingRight: isVertical ? '50px' : '80px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background radial soft light */}
      <div style={{
        position: 'absolute',
        top: '60%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isVertical ? '400px' : '600px',
        height: isVertical ? '250px' : '350px',
        borderRadius: '50%',
        background: `radial-gradient(ellipse, ${secondaryColor}08 0%, transparent 70%)`,
        zIndex: 0,
      }} />

      <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: isVertical ? '50px' : '30px', zIndex: 1, position: 'relative' }}>
        <div style={{ opacity: entrance }}>
          {isVertical ? (
            <h2 style={{ fontSize: '72px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-2px', lineHeight: '1.2' }}>
              <WordPop 
                text={`PLAN DE [TRABAJO]`} 
                primaryColor={primaryColor} 
                secondaryColor={secondaryColor} 
                frame={frame - 10} 
              />
            </h2>
          ) : (
            <h2 style={{ fontSize: '52px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
              Plan de <span style={{ color: primaryColor, fontStyle: 'italic' }}>Trabajo</span>
            </h2>
          )}
          <p style={{ fontSize: isVertical ? '26px' : '20px', color: '#9ca3af', margin: isVertical ? '20px 0 0 0' : '8px 0 0 0', fontWeight: 400 }}>
            Roadmap estructurado por fases y tiempos estimados de entrega.
          </p>
        </div>

        {/* Timeline Container */}
        <div style={{
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          justifyContent: 'space-between',
          position: 'relative',
          width: '100%',
          paddingTop: isVertical ? '10px' : '20px',
          gap: isVertical ? '24px' : '0px'
        }}>
          {/* Base connector track */}
          <div style={{
            position: 'absolute',
            top: isVertical ? '20px' : '47px',
            bottom: isVertical ? '20px' : 'auto',
            left: isVertical ? '45px' : '50px',
            right: isVertical ? 'auto' : '50px',
            height: isVertical ? 'auto' : '3px',
            width: isVertical ? '3px' : 'auto',
            background: 'rgba(255, 255, 255, 0.05)',
            zIndex: 1,
          }} />

          {/* Animated active connector line */}
          <div style={{
            position: 'absolute',
            top: isVertical ? '20px' : '47px',
            left: isVertical ? '45px' : '50px',
            width: isVertical ? '3px' : `calc(${lineWidth}% - 100px)`,
            height: isVertical ? `calc(${lineWidth}% - 60px)` : '3px',
            background: `linear-gradient(to ${isVertical ? 'bottom' : 'right'}, ${primaryColor}, ${secondaryColor})`,
            boxShadow: `0 0 8px ${primaryColor}`,
            zIndex: 1,
          }} />

          {itemsToShow.map((m, index) => {
            const delay = 15 + index * 12;
            const progressSpring = spring({ frame: frame - delay, fps, config: { damping: 12 } });
            const cardY = interpolate(progressSpring, [0, 1], [40, 0]);
            const cardScale = interpolate(progressSpring, [0, 1], [0.9, 1]);
            const pulse = 1 + 0.05 * Math.sin((frame - delay) / 5);

            return (
              <div key={index} style={{
                width: isVertical ? '100%' : `${92 / itemsToShow.length}%`,
                display: 'flex',
                flexDirection: isVertical ? 'row' : 'column',
                alignItems: isVertical ? 'flex-start' : 'center',
                textAlign: isVertical ? 'left' : 'center',
                zIndex: 2,
                opacity: progressSpring,
                transform: `translateY(${cardY}px) scale(${cardScale})`,
                gap: isVertical ? '18px' : '0px'
              }}>
                {/* Node bubble */}
                <div style={{
                  width: isVertical ? '90px' : '54px',
                  height: isVertical ? '90px' : '54px',
                  borderRadius: '50%',
                  backgroundColor: '#030712',
                  border: `3px solid ${index === 0 ? primaryColor : index === 1 ? secondaryColor : '#10b981'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isVertical ? '34px' : '20px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginBottom: isVertical ? '0px' : '15px',
                  boxShadow: `0 0 20px ${index === 0 ? primaryColor : index === 1 ? secondaryColor : '#10b981'}${frame > delay ? '50' : '00'}`,
                  transform: `scale(${pulse})`,
                  transition: 'box-shadow 0.3s ease',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>

                <div style={{
                  padding: isVertical ? '32px 36px' : '24px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  width: '100%',
                  boxSizing: 'border-box',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isVertical ? '12px' : '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: isVertical ? '24px' : '13px',
                      fontWeight: 'bold',
                      color: index === 0 ? primaryColor : index === 1 ? secondaryColor : '#10b981',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      {m.duration || 'Fase'}
                    </span>

                    <div style={{
                      padding: isVertical ? '10px 20px' : '3px 10px',
                      borderRadius: '12px',
                      fontSize: isVertical ? '20px' : '11px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      color: milestoneStatuses[index]?.color || '#ffffff',
                      backgroundColor: milestoneStatuses[index]?.bg || 'rgba(255,255,255,0.1)',
                      border: `1px solid ${milestoneStatuses[index]?.border || 'rgba(255,255,255,0.2)'}`
                    }}>
                      {milestoneStatuses[index]?.label || 'Espera'}
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: isVertical ? '36px' : '20px', fontWeight: '800', margin: '0 0 6px 0', color: '#f3f4f6', textTransform: 'uppercase', lineHeight: '1.2' }}>
                      {m.title}
                    </h3>
                    <p style={{ fontSize: isVertical ? '24px' : '14px', color: '#e5e7eb', margin: 0, lineHeight: '1.45', fontWeight: 400 }}>
                      {m.description}
                    </p>
                  </div>

                  {/* Sub-milestone details */}
                  <div style={{
                    marginTop: '4px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isVertical ? '12px' : '6px'
                  }}>
                    {(milestoneSubItems[index] || []).map((subItem, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: isVertical ? '10px' : '6px',
                          height: isVertical ? '10px' : '6px',
                          borderRadius: '50%',
                          backgroundColor: index === 0 ? primaryColor : index === 1 ? secondaryColor : '#10b981',
                          flexShrink: 0
                        }} />
                        <span style={{ fontSize: isVertical ? '22px' : '13px', color: '#e5e7eb', fontWeight: 400 }}>
                          {subItem}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Bento Box Grid for Timeline commitments */}
        <div style={{
          opacity: spring({ frame: frame - 60, fps, config: { damping: 15 } }),
          transform: `translateY(${interpolate(spring({ frame: frame - 60, fps, config: { damping: 15 } }), [0, 1], [30, 0])}px)`,
          marginTop: isVertical ? '50px' : '15px',
          display: 'grid',
          gridTemplateColumns: isVertical ? '1fr' : '1fr 1fr 1fr',
          gap: isVertical ? '28px' : '20px',
          width: '100%',
        }}>
          {/* Card 1: Demos Semanales */}
          <div style={{
            padding: isVertical ? '30px 36px' : '22px 28px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: isVertical ? '14px' : '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: primaryColor, boxShadow: `0 0 10px ${primaryColor}` }} />
              <span style={{ fontSize: isVertical ? '28px' : '16px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                DEMOS SEMANALES
              </span>
            </div>
            <p style={{ fontSize: isVertical ? '24px' : '15px', color: '#e5e7eb', fontWeight: 400, margin: 0, lineHeight: '1.45' }}>
              Presentaciones interactivas cada viernes para validar y aprobar el incremento de software desarrollado.
            </p>
          </div>

          {/* Card 2: Comunicación de Canales */}
          {!isVertical && (
            <div style={{
              padding: '22px 28px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: secondaryColor, boxShadow: `0 0 10px ${secondaryColor}` }} />
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  COMUNICACIÓN EN TIEMPO REAL
                </span>
              </div>
              <p style={{ fontSize: '15px', color: '#e5e7eb', fontWeight: 400, margin: 0, lineHeight: '1.45' }}>
                Línea directa continua para resolver dudas y coordinar prioridades en cada sprint.
              </p>
            </div>
          )}

          {/* Card 3: QA & Deploy */}
          <div style={{
            padding: isVertical ? '30px 36px' : '22px 28px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: isVertical ? '14px' : '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
              <span style={{ fontSize: isVertical ? '28px' : '16px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                QA & DESPLIEGUE FINAL
              </span>
            </div>
            <p style={{ fontSize: isVertical ? '24px' : '15px', color: '#e5e7eb', fontWeight: 400, margin: 0, lineHeight: '1.45' }}>
              Pruebas rigurosas de extremo a extremo y despliegue monitoreado para la salida a producción.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3b. Weeks Detail Slide
const WeeksDetailSlide: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  slideBgStyle: React.CSSProperties;
  aspectRatio?: '16:9' | '9:16';
}> = ({ primaryColor, secondaryColor, slideBgStyle, aspectRatio = '16:9' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = aspectRatio === '9:16';

  // Slide is 180 frames. Exit transition starts at frame 165.
  const entrance = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const exit = spring({ frame: frame - 165, fps, config: { damping: 12, stiffness: 100 } });

  // Transitions: slide up with skew entry, zoom out left exit for horizontal, horizontal swipe for vertical
  const entranceX = interpolate(entrance, [0, 1], [isVertical ? 1080 : 0, 0]);
  const exitX = interpolate(exit, [0, 1], [0, isVertical ? -1080 : -350]);
  const entranceY = isVertical ? 0 : interpolate(entrance, [0, 1], [400, 0]);
  const entranceSkew = isVertical ? 0 : interpolate(entrance, [0, 1], [8, 0]);
  const exitScale = isVertical ? 1 : interpolate(exit, [0, 1], [1, 0.85]);
  const opacity = entrance * interpolate(exit, [0, 1], [1, 0]);
  const transform = isVertical
    ? `translateX(${entranceX + exitX}px)`
    : `perspective(1200px) translateY(${entranceY}px) skewY(${entranceSkew}deg) translateX(${exitX}px) scale(${exitScale})`;

  const titleY = interpolate(entrance, [0, 1], [30, 0]);

  // Weeks data configuration
  const weeksData = [
    { title: 'Semanas 1-4', role: 'Setup, DB & Core UX', hours: 40, percentage: 25 },
    { title: 'Semanas 5-8', role: 'Dashboard & Acciones', hours: 40, percentage: 25 },
    { title: 'Semanas 9-12', role: 'Cálculos, FAQ & IA', hours: 40, percentage: 25 },
    { title: 'Semanas 13-16', role: 'Bento, QA & Deploy', hours: 40, percentage: 25 },
  ];

  return (
    <div style={{ 
      ...slideBgStyle, 
      transform, 
      opacity, 
      justifyContent: isVertical ? 'center' : 'flex-start', 
      paddingTop: isVertical ? '0px' : '160px',
      paddingLeft: isVertical ? '50px' : '80px',
      paddingRight: isVertical ? '50px' : '80px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Neon Grid Rings */}
      <div style={{
        position: 'absolute',
        right: '-5%',
        top: '20%',
        width: isVertical ? '200px' : '320px',
        height: isVertical ? '200px' : '320px',
        borderRadius: '50%',
        border: `1px dashed ${primaryColor}20`,
        transform: `rotate(${frame * 0.2}deg)`,
        zIndex: 0,
      }} />

      <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: isVertical ? '50px' : '25px', zIndex: 1, position: 'relative' }}>
        <div style={{ opacity: entrance }}>
          {isVertical ? (
            <h2 style={{ fontSize: '72px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-2px', lineHeight: '1.2' }}>
              <WordPop 
                text={`CRONOGRAMA DE [ESFUERZO]`} 
                primaryColor={primaryColor} 
                secondaryColor={secondaryColor} 
                frame={frame - 10} 
              />
            </h2>
          ) : (
            <h2 style={{ fontSize: '52px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
              Cronograma de <span style={{ color: primaryColor, fontStyle: 'italic' }}>Horas & Esfuerzo</span>
            </h2>
          )}
          <p style={{ fontSize: isVertical ? '26px' : '20px', color: '#9ca3af', margin: isVertical ? '20px 0 0 0' : '8px 0 0 0', fontWeight: 400 }}>
            Desglose estimado de 160 horas de programación distribuidas en 16 semanas.
          </p>
        </div>

        {/* Bento grid layout for hours progression */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isVertical ? '1fr' : '1fr 1fr',
          gap: isVertical ? '20px' : '24px',
          width: '100%',
        }}>
          {weeksData.map((phase, index) => {
            const delay = 15 + index * 10;
            const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 12 } });
            const cardY = interpolate(cardSpring, [0, 1], [40, 0]);
            const cardScale = interpolate(cardSpring, [0, 1], [0.95, 1]);
            const barProgress = spring({ frame: frame - (delay + 10), fps, config: { damping: 15, stiffness: 60 } });
            const currentWidth = interpolate(barProgress, [0, 1], [0, 100]);

            return (
              <div key={index} style={{
                opacity: cardSpring,
                transform: `translateY(${cardY}px) scale(${cardScale})`,
                padding: isVertical ? '30px 36px' : '28px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: isVertical ? '14px' : '14px',
                boxShadow: '0 8px 30px -5px rgba(0, 0, 0, 0.25)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: isVertical ? '24px' : '15px', fontWeight: 'bold', color: primaryColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {phase.title}
                  </span>
                  <span style={{ fontSize: isVertical ? '26px' : '16px', fontWeight: '900', color: '#ffffff' }}>
                    {phase.hours} hs
                  </span>
                </div>
                <div>
                  <h3 style={{ fontSize: isVertical ? '32px' : '22px', fontWeight: '800', margin: '0 0 6px 0', textTransform: 'uppercase', color: '#f3f4f6', lineHeight: '1.2' }}>
                    {phase.role}
                  </h3>
                  <p style={{ fontSize: isVertical ? '22px' : '15px', color: '#e5e7eb', margin: '0 0 8px 0', fontWeight: 400, lineHeight: 1.45 }}>
                    Implementación de arquitectura, maquetación, lógica interactiva y pruebas de performance.
                  </p>
                </div>
                {/* Visual progress bar */}
                <div style={{ width: '100%', height: isVertical ? '14px' : '8px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${currentWidth}%`,
                    height: '100%',
                    borderRadius: '6px',
                    background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                    boxShadow: `0 0 10px ${primaryColor}60`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Summary Bento Stats */}
        <div style={{
          opacity: spring({ frame: frame - 55, fps, config: { damping: 15 } }),
          transform: `translateY(${interpolate(spring({ frame: frame - 55, fps, config: { damping: 15 } }), [0, 1], [30, 0])}px)`,
          marginTop: isVertical ? '35px' : '10px',
          display: 'grid',
          gridTemplateColumns: isVertical ? '1fr 1fr' : '1fr 1fr 1fr',
          gap: isVertical ? '20px' : '24px',
          width: '100%',
        }}>
          {/* Stat 1: Total de Horas con Contador Animado */}
          <div style={{
            padding: isVertical ? '26px 30px' : '20px 24px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: `1px solid ${primaryColor}20`,
            display: 'flex',
            alignItems: 'center',
            gap: isVertical ? '16px' : '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              width: isVertical ? '65px' : '48px',
              height: isVertical ? '65px' : '48px',
              borderRadius: '12px',
              background: `${primaryColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${primaryColor}30`,
              boxShadow: `0 0 15px ${primaryColor}20`,
              flexShrink: 0
            }}>
              <svg width={isVertical ? "30" : "20"} height={isVertical ? "30" : "20"} viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
              <span style={{ fontSize: isVertical ? '20px' : '13px', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Esfuerzo
              </span>
              <span style={{ fontSize: isVertical ? '32px' : '26px', fontWeight: '900', color: '#ffffff', fontFamily: 'monospace' }}>
                {Math.round(interpolate(spring({ frame: frame - 35, fps, config: { damping: 20, stiffness: 45 } }), [0, 1], [0, 160]))} hs
              </span>
            </div>
          </div>

          {/* Stat 2: Garantía de Sprints con Check */}
          <div style={{
            padding: isVertical ? '26px 30px' : '20px 24px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: `1px solid ${secondaryColor}20`,
            display: 'flex',
            alignItems: 'center',
            gap: isVertical ? '16px' : '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              width: isVertical ? '65px' : '48px',
              height: isVertical ? '65px' : '48px',
              borderRadius: '12px',
              background: `${secondaryColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${secondaryColor}30`,
              boxShadow: `0 0 15px ${secondaryColor}20`,
              flexShrink: 0
            }}>
              <svg width={isVertical ? "30" : "20"} height={isVertical ? "30" : "20"} viewBox="0 0 24 24" fill="none" stroke={secondaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
              <span style={{ fontSize: isVertical ? '20px' : '13px', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Entregables
              </span>
              <span style={{ fontSize: isVertical ? '32px' : '26px', fontWeight: '900', color: '#ffffff' }}>
                100% Ok
              </span>
            </div>
          </div>

          {/* Stat 3: Ciclo Iterativo (Only in landscape) */}
          {!isVertical && (
            <div style={{
              padding: '20px 24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Metodología
                </span>
                <span style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff' }}>
                  Sprints Agile
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 3c. Methodology Slide
const MethodologySlide: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  slideBgStyle: React.CSSProperties;
  aspectRatio?: '16:9' | '9:16';
}> = ({ primaryColor, secondaryColor, slideBgStyle, aspectRatio = '16:9' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = aspectRatio === '9:16';

  // Slide is 180 frames. Exit transition starts at frame 165.
  const entrance = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const exit = spring({ frame: frame - 165, fps, config: { damping: 12, stiffness: 100 } });

  // Transitions: rotation and shift entry, fade and blur exit for horizontal, horizontal swipe for vertical
  const entranceX_vert = interpolate(entrance, [0, 1], [1080, 0]);
  const exitX_vert = interpolate(exit, [0, 1], [0, -1080]);
  const entranceX = isVertical ? 0 : interpolate(entrance, [0, 1], [-200, 0]);
  const entranceRotateY = isVertical ? 0 : interpolate(entrance, [0, 1], [-25, 0]);
  const exitY = isVertical ? 0 : interpolate(exit, [0, 1], [0, -180]);
  const exitScale = isVertical ? 1 : interpolate(exit, [0, 1], [1, 0.9]);
  const opacity = entrance * interpolate(exit, [0, 1], [1, 0]);
  const transform = isVertical
    ? `translateX(${entranceX_vert + exitX_vert}px)`
    : `perspective(1200px) translateX(${entranceX}px) rotateY(${entranceRotateY}deg) translateY(${exitY}px) scale(${exitScale})`;

  const titleY = interpolate(entrance, [0, 1], [30, 0]);

  // Agile weekly calendar tasks
  const agendaData = [
    { day: 'LUN', title: 'Sprint Kickoff', desc: 'Fijamos objetivos técnicos y validamos requerimientos semanales.' },
    { day: 'MAR - JUE', title: 'Desarrollo & Staging', desc: 'Desarrollo interactivo y despliegues en entornos de prueba continuos.' },
    { day: 'VIE', title: 'Demo & Aprobación', desc: 'Auditoría en vivo a las 16:00 hs para validar y aprobar el incremento de software.' },
  ];

  return (
    <div style={{ 
      ...slideBgStyle, 
      transform, 
      opacity, 
      justifyContent: isVertical ? 'center' : 'flex-start', 
      paddingTop: isVertical ? '0px' : '160px',
      paddingLeft: isVertical ? '50px' : '80px',
      paddingRight: isVertical ? '50px' : '80px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Soft Floating Glow */}
      <div style={{
        position: 'absolute',
        left: '20%',
        bottom: '-15%',
        width: isVertical ? '300px' : '500px',
        height: isVertical ? '220px' : '350px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}06 0%, transparent 70%)`,
        transform: `translateY(${Math.sin(frame / 10) * 15}px)`,
        zIndex: 0,
      }} />

      <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: isVertical ? '50px' : '25px', zIndex: 1, position: 'relative' }}>
        <div style={{ opacity: entrance }}>
          {isVertical ? (
            <h2 style={{ fontSize: '72px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-2px', lineHeight: '1.2' }}>
              <WordPop 
                text={`METODOLOGÍA [ÁGIL]`} 
                primaryColor={primaryColor} 
                secondaryColor={secondaryColor} 
                frame={frame - 10} 
              />
            </h2>
          ) : (
            <h2 style={{ fontSize: '52px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
              Metodología de <span style={{ color: primaryColor, fontStyle: 'italic' }}>Trabajo Ágil</span>
            </h2>
          )}
          <p style={{ fontSize: isVertical ? '26px' : '20px', color: '#9ca3af', margin: isVertical ? '20px 0 0 0' : '8px 0 0 0', fontWeight: 400 }}>
            Implementamos Scrum iterativo semanal para asegurar lanzamientos estables y correcciones rápidas.
          </p>
        </div>

        {/* Layout de dos columnas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isVertical ? '1fr' : '62% 38%',
          gap: isVertical ? '30px' : '32px',
          width: '100%',
          alignItems: 'start',
        }}>
          {/* Columna Izquierda: Agenda del Sprint */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isVertical ? '18px' : '16px',
            width: '100%',
          }}>
            {agendaData.map((item, index) => {
              const delay = 15 + index * 12;
              const itemSpring = spring({ frame: frame - delay, fps, config: { damping: 12 } });
              const itemX = interpolate(itemSpring, [0, 1], [50, 0]);

              return (
                <div key={index} style={{
                  opacity: itemSpring,
                  transform: `translateX(${itemX}px)`,
                  padding: isVertical ? '30px 36px' : '24px 30px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isVertical ? '24px' : '24px',
                  boxSizing: 'border-box',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                }}>
                  {/* Day Badge */}
                  <div style={{
                    width: isVertical ? '200px' : '150px',
                    padding: isVertical ? '14px 18px' : '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: `${primaryColor}15`,
                    border: `1px solid ${primaryColor}30`,
                    textAlign: 'center',
                    color: primaryColor,
                    fontWeight: '900',
                    fontSize: isVertical ? '24px' : '15px',
                    letterSpacing: '1.5px',
                    flexShrink: 0
                  }}>
                    {item.day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <h3 style={{ fontSize: isVertical ? '32px' : '22px', fontWeight: '800', margin: 0, textTransform: 'uppercase', color: '#f3f4f6', lineHeight: '1.2' }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: isVertical ? '22px' : '16px', color: '#e5e7eb', margin: 0, fontWeight: 400, lineHeight: 1.45 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Columna Derecha: Scrum Loop Interactive Widget */}
          <div style={{
            opacity: spring({ frame: frame - 25, fps, config: { damping: 15 } }),
            transform: `translateY(${interpolate(spring({ frame: frame - 25, fps, config: { damping: 15 } }), [0, 1], [30, 0])}px)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isVertical ? '50px 30px' : '30px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            minHeight: isVertical ? '350px' : '340px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Círculo giratorio de fondo (Scrum Loop SVG) */}
            <div style={{
              width: isVertical ? '220px' : '200px',
              height: isVertical ? '220px' : '200px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* Anillo de neón giratorio */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: `2.5px dashed ${primaryColor}40`,
                transform: `translate(-50%, -50%) rotate(${frame * 0.5}deg)`,
                boxShadow: `0 0 25px ${primaryColor}15`
              }} />
              
              {/* Segundo Anillo giratorio opuesto */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                border: `2px dashed ${secondaryColor}60`,
                transform: `translate(-50%, -50%) rotate(${-frame * 0.8}deg)`,
                boxShadow: `0 0 30px ${secondaryColor}20`
              }} />
 
              {/* Círculo de fondo palpitante */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '65%',
                height: '65%',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${primaryColor}20 0%, rgba(0,0,0,0.95) 90%)`,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transform: `translate(-50%, -50%) scale(${1 + Math.sin(frame / 8) * 0.03})`,
                boxShadow: `0 0 35px ${primaryColor}30, inset 0 0 20px ${primaryColor}20`,
                zIndex: 1,
              }} />

              {/* Contenedor de Texto Estático (Siempre Centrado Perfectamente) */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '65%',
                height: '65%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isVertical ? '6px' : '2px',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                pointerEvents: 'none'
              }}>
                {/* Icono de Loop */}
                <svg width={isVertical ? "32" : "24"} height={isVertical ? "32" : "24"} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${frame * 1.5}deg)` }}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span style={{ 
                  fontSize: isVertical ? '16px' : '11px', 
                  fontWeight: '900', 
                  color: primaryColor, 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  display: 'block',
                  width: '100%'
                }}>
                  Ciclo Scrum
                </span>
                <span style={{ 
                  fontSize: isVertical ? '20px' : '14px', 
                  fontWeight: '800', 
                  color: '#ffffff',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  display: 'block',
                  width: '100%'
                }}>
                  Iterativo
                </span>
              </div>
            </div>
 
            {/* Badges de soporte metodológico abajo */}
            <div style={{
              display: 'flex',
              gap: isVertical ? '24px' : '12px',
              marginTop: isVertical ? '40px' : '25px',
              width: '100%',
              justifyContent: 'center',
              zIndex: 3
            }}>
              <div style={{
                padding: isVertical ? '12px 24px' : '6px 12px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: isVertical ? '20px' : '11px',
                fontWeight: 600,
                color: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{ width: isVertical ? '10px' : '6px', height: isVertical ? '10px' : '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                Feedback Continuo
              </div>
              <div style={{
                padding: isVertical ? '12px 24px' : '6px 12px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: isVertical ? '20px' : '11px',
                fontWeight: 600,
                color: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{ width: isVertical ? '10px' : '6px', height: isVertical ? '10px' : '6px', borderRadius: '50%', backgroundColor: secondaryColor }} />
                Calidad Garantizada
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. Financials Slide
const FinancialsSlide: React.FC<{
  totalValue: number;
  payments: Payment[];
  primaryColor: string;
  secondaryColor: string;
  slideBgStyle: React.CSSProperties;
  aspectRatio?: '16:9' | '9:16';
  currency?: string;
}> = ({ totalValue, payments, primaryColor, secondaryColor, slideBgStyle, aspectRatio = '16:9', currency = 'USD' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = aspectRatio === '9:16';

  // Slide is 180 frames. Exit transition starts at frame 165.
  const entrance = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const exit = spring({ frame: frame - 165, fps, config: { damping: 12, stiffness: 100 } });

  // Transitions: 3D flip entry and rotation exit for horizontal, horizontal swipe for vertical
  const entranceX = interpolate(entrance, [0, 1], [isVertical ? 1080 : 0, 0]);
  const exitX = interpolate(exit, [0, 1], [0, isVertical ? -1080 : 0]);
  const entranceRotateX = isVertical ? 0 : interpolate(entrance, [0, 1], [45, 0]);
  const entranceScale = isVertical ? 1 : interpolate(entrance, [0, 1], [0.85, 1]);
  const exitRotateY = isVertical ? 0 : interpolate(exit, [0, 1], [0, 90]);
  const opacity = entrance * interpolate(exit, [0, 1], [1, 0]);
  const transform = isVertical
    ? `translateX(${entranceX + exitX}px)`
    : `perspective(1200px) rotateX(${entranceRotateX}deg) rotateY(${exitRotateY}deg) scale(${entranceScale})`;

  const titleY = interpolate(entrance, [0, 1], [30, 0]);
  const valueSpring = spring({ frame: frame - 15, fps, config: { damping: 12, stiffness: 80 } });
  const valueY = interpolate(valueSpring, [0, 1], [30, 0]);
  const valueScale = interpolate(valueSpring, [0, 1], [0.9, 1]);

  // Valid and fallback payments for display stability
  const rawPayments = payments && payments.length > 0 ? payments : [];
  const processedPayments = rawPayments
    .map(p => {
      const label = p.label || p.milestone_name || 'Hito de Pago';
      const pctString = String(p.percentage || '').replace(/[^0-9.]/g, '');
      const percentage = parseFloat(pctString) || 0;
      const amount = p.amount || (totalValue * percentage) / 100;
      return { label, percentage, amount };
    })
    .filter(p => p.percentage > 0);

  const validPayments = processedPayments.length > 0
    ? processedPayments
    : [
        { label: 'Anticipo / Inicio', percentage: 50, amount: totalValue * 0.5 },
        { label: 'Entrega Final / QA', percentage: 50, amount: totalValue * 0.5 }
      ];

  const displayPayments = validPayments;

  return (
    <div style={{ 
      ...slideBgStyle, 
      transform, 
      opacity, 
      justifyContent: isVertical ? 'center' : 'flex-start', 
      alignItems: 'center',
      paddingTop: isVertical ? '0px' : '160px',
      paddingLeft: isVertical ? '50px' : '80px',
      paddingRight: isVertical ? '50px' : '80px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Tech Radial Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.03,
        background: `radial-gradient(circle, ${primaryColor} 1.5px, transparent 1.5px) 0 0 / 40px 40px`,
        transform: `perspective(500px) rotateX(20deg) translateY(${frame * 0.3}px)`,
        zIndex: 0,
      }} />

      <div style={{ 
        width: '100%', 
        maxWidth: '1200px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: isVertical ? (displayPayments.length > 3 ? '25px' : '35px') : '35px', 
        zIndex: 1, 
        position: 'relative',
        textAlign: 'center'
      }}>
        {/* Título Centrado */}
        <div style={{ opacity: entrance }}>
          {isVertical ? (
            <h2 style={{ fontSize: displayPayments.length > 3 ? '60px' : '72px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-2px', lineHeight: '1.2' }}>
              <WordPop 
                text={`PRESUPUESTO Y [INVERSIÓN]`} 
                primaryColor={primaryColor} 
                secondaryColor={secondaryColor} 
                frame={frame - 10} 
              />
            </h2>
          ) : (
            <h2 style={{ fontSize: '52px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
              Presupuesto & <span style={{ color: primaryColor, fontStyle: 'italic' }}>Financiación</span>
            </h2>
          )}
          <p style={{ fontSize: isVertical ? (displayPayments.length > 3 ? '24px' : '26px') : '20px', color: '#9ca3af', margin: isVertical ? '20px 0 0 0' : '8px 0 0 0', fontWeight: 400 }}>
            Inversión del proyecto estructurada de forma clara y adaptada a tus necesidades.
          </p>
        </div>

        {/* Hero Budget Card */}
        <div style={{
          opacity: valueSpring,
          transform: `translateY(${valueY}px) scale(${valueScale})`,
          padding: isVertical ? (displayPayments.length > 3 ? '30px 40px' : '45px 50px') : '35px 60px',
          borderRadius: '24px',
          background: `linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)`,
          border: `1.5px solid ${primaryColor}40`,
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.4), 0 0 45px ${primaryColor}15`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isVertical ? (displayPayments.length > 3 ? '12px' : '20px') : '8px',
          minWidth: isVertical ? '100%' : '450px',
          boxSizing: 'border-box'
        }}>
          <p style={{ fontSize: isVertical ? (displayPayments.length > 3 ? '18px' : '22px') : '13px', fontWeight: 'bold', color: '#9ca3af', letterSpacing: isVertical ? '4px' : '3px', textTransform: 'uppercase', margin: 0 }}>
            INVERSIÓN TOTAL DEL PROYECTO
          </p>
          <h3 style={{ fontSize: isVertical ? (displayPayments.length > 3 ? '76px' : '90px') : '64px', fontWeight: 950, color: '#ffffff', margin: 0, letterSpacing: '-2px', fontFamily: 'monospace' }}>
            {currency === 'ARS' ? 'ARS' : 'US$'} {Math.round(interpolate(spring({ frame: frame - 25, fps, config: { damping: 22, stiffness: 50 } }), [0, 1], [0, totalValue])).toLocaleString('es-AR')}
          </h3>
          <div style={{
            padding: isVertical ? (displayPayments.length > 3 ? '10px 24px' : '14px 32px') : '6px 16px',
            borderRadius: '20px',
            background: `${primaryColor}15`,
            border: `1px solid ${primaryColor}30`,
            fontSize: isVertical ? (displayPayments.length > 3 ? '18px' : '22px') : '12px',
            fontWeight: 'bold',
            color: primaryColor,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginTop: isVertical ? '8px' : '8px'
          }}>
            Desarrollo Llave en Mano
          </div>
        </div>

        {/* Payment roadmap Horizontal / Vertical Stack */}
        <div style={{
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          justifyContent: 'center',
          alignItems: isVertical ? 'stretch' : 'center',
          gap: isVertical ? (displayPayments.length > 3 ? '16px' : '24px') : (displayPayments.length > 3 ? '16px' : '24px'),
          width: '100%',
          marginTop: isVertical ? (displayPayments.length > 3 ? '30px' : '50px') : '10px'
        }}>
          {displayPayments.map((pay, index) => {
            const delay = 35 + index * 12;
            const itemSpring = spring({ frame: frame - delay, fps, config: { damping: 14 } });
            const itemY = interpolate(itemSpring, [0, 1], [30, 0]);

            return (
              <div key={index} style={{
                opacity: itemSpring,
                transform: `translateY(${itemY}px)`,
                padding: isVertical ? (displayPayments.length > 3 ? '22px 28px' : '30px 36px') : (displayPayments.length > 3 ? '16px 20px' : '22px 30px'),
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: isVertical ? (displayPayments.length > 3 ? '22px' : '28px') : (displayPayments.length > 3 ? '16px' : '24px'),
                minWidth: isVertical ? '100%' : (displayPayments.length > 3 ? '230px' : '290px'),
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                boxSizing: 'border-box'
              }}>
                {/* Circular Percentage Badge */}
                <div style={{
                  width: isVertical ? (displayPayments.length > 3 ? '76px' : '90px') : (displayPayments.length > 3 ? '46px' : '54px'),
                  height: isVertical ? (displayPayments.length > 3 ? '76px' : '90px') : (displayPayments.length > 3 ? '46px' : '54px'),
                  borderRadius: '50%',
                  background: `${secondaryColor}15`,
                  border: `1.5px solid ${secondaryColor}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isVertical ? (displayPayments.length > 3 ? '24px' : '28px') : (displayPayments.length > 3 ? '14px' : '16px'),
                  fontWeight: '900',
                  color: secondaryColor,
                  boxShadow: `0 0 15px ${secondaryColor}15`,
                  flexShrink: 0
                }}>
                  {pay.percentage}%
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: isVertical ? '8px' : '3px', textAlign: 'left' }}>
                  <span style={{ fontSize: isVertical ? (displayPayments.length > 3 ? '18px' : '22px') : (displayPayments.length > 3 ? '11px' : '13px'), color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {pay.label}
                  </span>
                  <span style={{ fontSize: isVertical ? (displayPayments.length > 3 ? '28px' : '34px') : (displayPayments.length > 3 ? '17px' : '20px'), fontWeight: '900', color: '#ffffff' }}>
                    {formatPrice(pay.amount || 0, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 5. Outro Slide
const OutroSlide: React.FC<{
  clientName: string;
  primaryColor: string;
  slideBgStyle: React.CSSProperties;
  aspectRatio?: '16:9' | '9:16';
}> = ({ clientName, primaryColor, slideBgStyle, aspectRatio = '16:9' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = aspectRatio === '9:16';

  const titleSpring = spring({ frame, fps, config: { damping: 10 } });
  const btnSpring = spring({ frame: frame - 15, fps, config: { damping: 12, stiffness: 120 } });

  const titleY = interpolate(titleSpring, [0, 1], [30, 0]);
  const btnScale = interpolate(btnSpring, [0, 1], [0.8, 1]) * (1 + 0.02 * Math.sin(frame / 6));

  const width = isVertical ? 1080 : 1920;
  const height = isVertical ? 1920 : 1080;

  const entranceX = interpolate(titleSpring, [0, 1], [isVertical ? 1080 : 0, 0]);
  const slideOpacity = interpolate(titleSpring, [0, 1], [0.5, 1]);

  return (
    <div style={{ 
      ...slideBgStyle,
      transform: isVertical ? `translateX(${entranceX}px)` : 'none',
      opacity: isVertical ? slideOpacity : 1,
      position: 'relative',
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: isVertical ? '50px' : '0px',
      paddingRight: isVertical ? '50px' : '0px',
    }}>
      {/* Celebration Particle Field */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = interpolate(btnSpring, [0, 1], [0, (isVertical ? 120 : 200) + (i % 3) * (isVertical ? 40 : 60)]);
        const px = width / 2 + Math.cos(angle) * radius;
        const py = height / 2 + Math.sin(angle) * radius;
        const pSize = isVertical ? (2 + (i % 3) * 2) : (4 + (i % 3) * 4);
        const pOpacity = interpolate(btnSpring, [0, 0.8, 1], [0, 0.8, 0]);

        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${px}px`,
            top: `${py}px`,
            width: `${pSize}px`,
            height: `${pSize}px`,
            borderRadius: '50%',
            backgroundColor: i % 2 === 0 ? primaryColor : '#ffffff',
            opacity: pOpacity,
            filter: 'blur(0.5px)',
            transform: 'translate(-50%, -50%)',
            zIndex: 0,
          }} />
        );
      })}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isVertical ? '35px' : '30px', textAlign: 'center', zIndex: 1, position: 'relative', width: '100%', padding: isVertical ? '0 10px' : 0 }}>
        {/* Call to action message */}
        <div style={{ opacity: titleSpring }}>
          {isVertical ? (
            <h2 style={{ fontSize: '54px', fontWeight: 950, letterSpacing: '-2px', margin: 0, textTransform: 'uppercase', lineHeight: '1.2' }}>
              <WordPop 
                text={`¿COMENZAMOS A [CONSTRUIR]?`} 
                primaryColor={primaryColor} 
                secondaryColor={primaryColor} 
                frame={frame} 
              />
            </h2>
          ) : (
            <h2 style={{ fontSize: '64px', fontWeight: 950, letterSpacing: '-2px', margin: 0, textTransform: 'uppercase', lineHeight: '1.2' }}>
              ¿Comenzamos a <span style={{ color: primaryColor, fontStyle: 'italic' }}>Construir</span>?
            </h2>
          )}
          <p style={{ fontSize: isVertical ? '22px' : '24px', color: '#9ca3af', fontWeight: 400, marginTop: '12px', maxWidth: isVertical ? '100%' : '750px', lineHeight: '1.45' }}>
            Haz clic en "Aceptar propuesta" para iniciar formalmente el desarrollo del proyecto de <strong>{clientName}</strong>.
          </p>
        </div>

        {/* CTA Button mockup */}
        <div style={{
          transform: `scale(${btnScale})`,
          opacity: btnSpring,
          padding: isVertical ? '20px 36px' : '20px 42px',
          borderRadius: '16px',
          background: primaryColor,
          color: '#ffffff',
          fontSize: isVertical ? '16px' : '18px',
          fontWeight: '900',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          boxShadow: `0 0 40px ${primaryColor}50, 0 15px 35px ${primaryColor}30`,
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: isVertical ? '14px' : '12px',
        }}>
          <span>FIRMADO Y ACORDADO DIGITALMENTE</span>
        </div>
      </div>
    </div>
  );
};
