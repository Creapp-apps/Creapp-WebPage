import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Monitor, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Project } from '../../lib/projectsService';
import PhoneMockup from './PhoneMockup';
import DesktopMockup from './DesktopMockup';

gsap.registerPlugin(ScrollTrigger);

const ShowroomSection: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [viewMode, setViewMode] = useState<'app' | 'site'>('app');
    const sectionRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const mockupRef = useRef<HTMLDivElement>(null);

    // Fetch active projects with production URLs (public query — no credentials)
    useEffect(() => {
        supabase
            .from('projects')
            .select('id, name, client, description, status, category, production_url, vercel_url, stack, color')
            .eq('status', 'active')
            .not('production_url', 'is', null)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error('[Showroom] Supabase query failed:', error.message);
                    console.error('[Showroom] This is likely an RLS issue. Run this SQL in Supabase:');
                    console.error('  CREATE POLICY "Public can read active projects" ON projects FOR SELECT USING (status = \'active\');');
                    return;
                }
                const live = (data ?? []) as Project[];
                console.log(`[Showroom] Loaded ${live.length} active projects`);
                setProjects(live);
                if (live.length > 0) setActiveProject(live[0]);

                // CRITICAL FIX: The section expands from 0 to 2000px height. 
                // We MUST tell GSAP to recalculate all trigger positions after the transition.
                setTimeout(() => {
                    ScrollTrigger.refresh();
                }, 100); // 1st refresh for layout stabilization

                setTimeout(() => {
                    ScrollTrigger.refresh();
                }, 800); // 2nd refresh after the 700ms CSS transition completes
            });
    }, []);

    // GSAP entrance animations
    useEffect(() => {
        if (!sectionRef.current) return;
        const ctx = gsap.context(() => {
            gsap.from(titleRef.current, {
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top 75%',
                },
                y: 50,
                opacity: 0,
                duration: 1,
                ease: 'power3.out',
            });

            // Premium Apple-style lateral staggered entrance for cards
            const leftElements = gsap.utils.toArray('.showroom-reveal');
            if (leftElements.length > 0) {
                gsap.fromTo(leftElements,
                    {
                        x: -40,
                        opacity: 0,
                        filter: 'blur(8px)',
                    },
                    {
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: 'top 65%',
                        },
                        x: 0,
                        opacity: 1,
                        filter: 'blur(0px)',
                        duration: 1.2,
                        stagger: 0.1,
                        ease: 'expo.out',
                    }
                );
            }

            // Mockup slides in from the right
            const mockupEl = gsap.utils.toArray('.mockup-reveal');
            if (mockupEl.length > 0) {
                gsap.fromTo(mockupEl,
                    {
                        x: 60,
                        opacity: 0,
                        filter: 'blur(12px)',
                        scale: 0.95,
                    },
                    {
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: 'top 60%',
                        },
                        x: 0,
                        opacity: 1,
                        filter: 'blur(0px)',
                        scale: 1,
                        duration: 1.5,
                        delay: 0.2,
                        ease: 'power4.out',
                    }
                );
            }
        }, sectionRef);

        return () => ctx.revert();
    }, [projects]);

    // Format URL to ensure it has https:// if the user typed 'trazapp.ar'
    const getFormattedUrl = (url?: string) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `https://${url}`;
    };

    // Get the current URL for the mockup (always use production_url for public viewing)
    const activeUrl = activeProject ? getFormattedUrl(activeProject.production_url) : '';

    const filteredProjects = projects.filter(p =>
        p.category === viewMode || (!p.category && viewMode === 'app')
    );

    // Keep the section visible if there are ANY active projects in the DB
    const hasProjects = projects.length > 0;
    const hasFilteredProjects = filteredProjects.length > 0;

    // Auto-select the first project in the new category when switching views
    useEffect(() => {
        if (projects.length > 0) {
            const newFiltered = projects.filter(p =>
                p.category === viewMode || (!p.category && viewMode === 'app')
            );
            setActiveProject(newFiltered.length > 0 ? newFiltered[0] : null);
        }
    }, [viewMode, projects]);

    // Fix: Force GSAP to recalculate scroll positions after layout changes.
    // Changing viewMode alters the grid height and cross-fades mockups. 
    // Without this, the pinned RocketProcess section below breaks because its top offset changes.
    useEffect(() => {
        const timer = setTimeout(() => {
            ScrollTrigger.refresh();
        }, 550); // Wait for the 500ms AnimatePresence transitions to finish
        return () => clearTimeout(timer);
    }, [viewMode, activeProject, projects]);

    return (
        <section
            ref={sectionRef}
            id="showroom"
            className="px-6 relative overflow-hidden transition-all duration-700 z-10"
            style={{
                opacity: hasProjects ? 1 : 0,
                maxHeight: hasProjects ? '2000px' : '0px',
                paddingTop: hasProjects ? '8rem' : '0',
                paddingBottom: hasProjects ? '8rem' : '0',
                overflow: 'hidden',
            }}
        >
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-electric/5 rounded-full blur-[200px] pointer-events-none" />

            {/* Title */}
            <div ref={titleRef} className="max-w-7xl mx-auto mb-16">
                <p className="text-cyan-electric text-xs tracking-[0.3em] uppercase mb-3">
                    Showroom
                </p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
                    Nuestros{' '}
                    <span className="text-gradient-cyan">Proyectos</span>
                </h2>
                <p className="text-slate-400 text-lg max-w-xl">
                    Apps reales, en producción. Explorá cada proyecto interactuando
                    directamente con la aplicación.
                </p>
            </div>

            {/* Main content: Grid + Mockup */}
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-12">
                {/* Project grid */}
                <div ref={gridRef} className="flex-1 w-full lg:max-w-[480px]">
                    {/* View mode toggle */}
                    <div className="showroom-reveal flex gap-1 mb-6 p-1 rounded-full bg-white/5 border border-white/5 w-fit">
                        <button
                            onClick={() => setViewMode('app')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${viewMode === 'app'
                                ? 'bg-cyan-electric/15 text-cyan-electric border border-cyan-electric/20'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <Smartphone size={14} /> App
                        </button>
                        <button
                            onClick={() => setViewMode('site')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${viewMode === 'site'
                                ? 'bg-cyan-electric/15 text-cyan-electric border border-cyan-electric/20'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <Monitor size={14} /> Site
                        </button>
                    </div>

                    {/* Project cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <AnimatePresence mode="popLayout">
                            {filteredProjects.map((project, index) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, x: -40, filter: 'blur(8px)' }}
                                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, x: -40, filter: 'blur(8px)' }}
                                    transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
                                    key={project.id}
                                    className={`showroom-reveal group relative text-left p-4 rounded-2xl border transition-all duration-300 overflow-hidden ${activeProject?.id === project.id
                                        ? 'bg-white/[0.06] border-cyan-electric/30 shadow-[0_0_30px_rgba(0,240,255,0.08)]'
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                                        }`}
                                    onClick={() => setActiveProject(project)}
                                    data-cursor-hover
                                >
                                    {/* Color accent dot */}
                                    <div
                                        className="w-3 h-3 rounded-full mb-3"
                                        style={{
                                            backgroundColor: project.color || '#FF2D78',
                                            boxShadow: `0 0 0 2px #050505, 0 0 0 3px ${project.color || '#FF2D78'}`,
                                        }}
                                    />

                                    <p className="text-sm font-bold text-white truncate mb-1">
                                        {project.name}
                                    </p>
                                    <p className="text-[10px] text-slate-500 truncate">
                                        {project.client}
                                    </p>

                                    {/* Stack badges */}
                                    {project.stack && project.stack.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {project.stack.slice(0, 2).map((tech) => (
                                                <span
                                                    key={tech}
                                                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-500"
                                                >
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {activeProject?.id === project.id && (
                                        <div
                                            className="absolute top-0 left-0 w-full h-[2px]"
                                            style={{
                                                background: `linear-gradient(90deg, transparent, ${project.color || '#FF2D78'}, transparent)`,
                                            }}
                                        />
                                    )}
                                </motion.div>
                            ))}

                            {!hasFilteredProjects && (
                                <motion.div
                                    key="empty-grid"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.4 }}
                                    className="col-span-full py-16 px-6 text-center border border-white/5 rounded-3xl bg-white/[0.02]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                        <Monitor size={20} className="text-slate-500" />
                                    </div>
                                    <p className="text-white font-bold mb-1">Categoría vacía</p>
                                    <p className="text-slate-500 text-xs">
                                        Aún no hay proyectos públicos asignados a esta categoría.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* External link */}
                    {activeProject?.production_url && (
                        <a
                            href={activeProject.production_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="showroom-reveal inline-flex items-center gap-2 mt-6 text-sm text-slate-400 hover:text-cyan-electric transition-colors"
                            data-cursor-hover
                        >
                            <ExternalLink size={14} />
                            Abrir {activeProject.name} en nueva pestaña
                        </a>
                    )}
                </div>

                {/* Dynamic Mockup (Phone or Desktop) */}
                <div
                    ref={mockupRef}
                    className="mockup-reveal flex-1 flex justify-center w-full lg:w-auto relative min-h-[660px] items-center"
                >
                    <AnimatePresence mode="wait">
                        {activeUrl ? (
                            viewMode === 'app' ? (
                                <motion.div
                                    key="phone-mockup"
                                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                    className="w-full flex justify-center"
                                >
                                    <PhoneMockup url={activeUrl} appName={activeProject?.name} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="desktop-mockup"
                                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                    className="w-full flex justify-center"
                                >
                                    <DesktopMockup url={activeUrl} appName={activeProject?.name} />
                                </motion.div>
                            )
                        ) : (
                            <motion.div
                                key="empty-mockup"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <div className="w-[320px] h-[660px] rounded-[3rem] bg-white/5 border border-white/10 flex items-center justify-center">
                                    <p className="text-slate-500 text-sm text-center px-8">
                                        Seleccioná un proyecto para interactuar
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
};

export default ShowroomSection;
