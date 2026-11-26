import React from 'react';
import { Reveal } from './Chapter';
import { METHODOLOGY } from './methodology';

/** Sección "Agentic Lab" de la home: cómo trabaja el lab (diferencial). */
export const Methodology: React.FC = () => (
    <section id="metodologia" className="cw-section" aria-labelledby="met-t">
        <div className="cw-wrap">
            <Reveal className="cw-intro-head">
                <div>
                    <span className="cw-mono">Agentic Lab</span>
                    <h2 id="met-t" className="cw-display cw-h2">
                        {METHODOLOGY.title}
                    </h2>
                </div>
                <p className="cw-lead">{METHODOLOGY.lead}</p>
            </Reveal>
            <Reveal>
                <ul className="cw-points">
                    {METHODOLOGY.points.map((p) => (
                        <li key={p.t}>
                            <b>{p.t}</b>
                            <span>{p.d}</span>
                        </li>
                    ))}
                </ul>
            </Reveal>
        </div>
    </section>
);

export default Methodology;
