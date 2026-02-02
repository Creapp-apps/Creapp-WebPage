import React, { useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

// Define the structure for our syntax-highlighted tokens
interface Token {
    text: string;
    className?: string; // Tailwind classes for color
}

// The code lines broken down into tokens
const codeLines: Token[][] = [
    [
        { text: "import", className: "text-primary" },
        { text: " App ", className: "text-white" },
        { text: "from", className: "text-primary" },
        { text: " ", className: "" },
        { text: "'@creapp/core'", className: "text-green-400" },
        { text: ";", className: "text-slate-500" },
    ],
    [
        // Empty line
    ],
    [
        { text: "// Initialize scalable infrastructure", className: "text-slate-500 italic" }
    ],
    [
        { text: "const", className: "text-secondary" },
        { text: " startSystem ", className: "text-white" },
        { text: "=", className: "text-primary" },
        { text: " ", className: "" },
        { text: "async", className: "text-primary" },
        { text: " () ", className: "text-white" },
        { text: "=>", className: "text-primary" },
        { text: " {", className: "text-white" },
    ],
    [
        { text: "  ", className: "" }, // Indentation
        { text: "await", className: "text-primary" },
        { text: " App.", className: "text-white" },
        { text: "deploy", className: "text-yellow-400" },
        { text: "(", className: "text-white" },
        { text: "AWS_CLUSTER", className: "text-blue-400" },
        { text: ");", className: "text-white" },
    ],
    [
        { text: "}", className: "text-white" }
    ]
];

export const CodeTypewriter: React.FC = () => {
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);

    // Viewport detection
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    // Note: once: true means it starts when reflected, and we manage the loop internally. 
    // If we want it to pause when scrolling away, we can use once: false. 
    // User complaint was "it finishes before I get there", so waiting for view is key.

    useEffect(() => {
        if (!isInView) return; // Don't start until visible

        let timeout: NodeJS.Timeout;

        // Typing logic
        if (currentLineIndex < codeLines.length) {
            const currentLineTokens = codeLines[currentLineIndex];

            // Calculate total chars in current line
            const totalCharsInLine = currentLineTokens.reduce((acc, token) => acc + token.text.length, 0);

            if (currentCharIndex < totalCharsInLine) {
                // Type next char
                timeout = setTimeout(() => {
                    setCurrentCharIndex(prev => prev + 1);
                }, 30 + Math.random() * 40); // Random typing speed
            } else {
                // Move to next line
                timeout = setTimeout(() => {
                    setCurrentLineIndex(prev => prev + 1);
                    setCurrentCharIndex(0);
                }, 100); // Delay between lines
            }
        } else {
            // Finished typing all lines -> SCHEDULE RESET (Loop)
            // We do NOT change any state here immediately, so the effect cleanup won't run yet.
            timeout = setTimeout(() => {
                // Reset to start loop
                setCurrentLineIndex(0);
                setCurrentCharIndex(0);
            }, 2000); // Wait 2 seconds before restarting (reading time)
        }

        return () => clearTimeout(timeout);
    }, [currentLineIndex, currentCharIndex, isInView]);


    // Helper to render visible text based on current indices
    const renderVisibleCode = () => {
        return codeLines.map((line, lineIdx) => {
            // If line is future, don't render
            if (lineIdx > currentLineIndex) return null;

            // If line is past (fully typed), render completely
            if (lineIdx < currentLineIndex) {
                return (
                    <div key={lineIdx} className="whitespace-pre flex flex-wrap">
                        {line.map((token, tIdx) => (
                            <span key={tIdx} className={token.className}>{token.text}</span>
                        ))}
                    </div>
                );
            }

            // If line is current, we need to slice tokens
            if (lineIdx === currentLineIndex) {
                let charsRemaining = currentCharIndex;

                return (
                    <div key={lineIdx} className="whitespace-pre flex flex-wrap">
                        {line.map((token, tIdx) => {
                            // If we ran out of chars for this token, stop rendering for this line?
                            // No, logic: if charsRemaining <= 0, we don't render this token or subsequent ones.
                            if (charsRemaining <= 0) return null;

                            const textToRender = token.text.slice(0, charsRemaining);
                            charsRemaining -= token.text.length;

                            return (
                                <span key={tIdx} className={token.className}>
                                    {textToRender}
                                </span>
                            );
                        })}
                        {/* Cursor */}
                        <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="inline-block w-2.5 h-4 bg-primary ml-1 align-middle translate-y-1"
                        />
                    </div>
                );
            }
        });
    };

    return (
        <div ref={ref} className="font-mono text-sm space-y-2 text-slate-400 min-h-[160px]">
            {renderVisibleCode()}
        </div>
    );
};
