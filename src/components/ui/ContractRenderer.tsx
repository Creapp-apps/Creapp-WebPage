import React, { useState, useEffect, useMemo } from 'react';

interface ContractRendererProps {
  template: string;
  variables: Record<string, string>;
  onValidityChange: (isValid: boolean) => void;
  brandPrimary: string;
  isGeneratingPDF?: boolean;
}

const ContractRenderer: React.FC<ContractRendererProps> = ({ 
  template, 
  variables, 
  onValidityChange,
  brandPrimary,
  isGeneratingPDF = false
}) => {
  // Store the values of the dynamic inputs. Key corresponds to the placeholder label.
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Parse the template to find all required interactive inputs
  const requiredInputs = useMemo(() => {
    const inputs: string[] = [];
    const regex = /\[input:([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(template)) !== null) {
      if (!inputs.includes(match[1])) {
        inputs.push(match[1]);
      }
    }
    return inputs;
  }, [template]);

  // Check validity whenever inputValues change
  useEffect(() => {
    const isValid = requiredInputs.length === 0 || requiredInputs.every(key => {
      const val = inputValues[key];
      return val && val.trim().length > 0;
    });
    onValidityChange(isValid);
  }, [inputValues, requiredInputs, onValidityChange]);

  const handleInputChange = (label: string, value: string) => {
    setInputValues(prev => ({ ...prev, [label]: value }));
  };

  // Render the parsed template
  const renderContent = () => {
    if (!template) return null;

    // Split the string by either {variable} or [input:Label]
    const parts = template.split(/(\{[^}]+\}|\[input:[^\]]+\])/g);

    return parts.map((part, index) => {
      if (!part) return null;

      // Handle Variables: {variable}
      if (part.startsWith('{') && part.endsWith('}')) {
        const varName = part.slice(1, -1);
        const value = variables[varName] !== undefined ? variables[varName] : part;
        return (
          <span key={index} className="font-bold text-white">
            {value}
          </span>
        );
      }

      // Handle Interactive Inputs: [input:Label]
      if (part.startsWith('[input:') && part.endsWith(']')) {
        const label = part.slice(7, -1);
        const value = inputValues[label] || '';
        
        if (isGeneratingPDF) {
          return (
            <span
              key={index}
              className="mx-1 md:mx-2 font-bold"
              style={{
                color: brandPrimary,
                textDecoration: 'underline',
                textUnderlineOffset: '4px',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              {value}
            </span>
          );
        }
        
        const inputWidth = Math.max(120, Math.min(320, (value || label).length * 8.5 + 16));
        return (
          <input
            key={index}
            type="text"
            placeholder={label}
            value={value}
            onChange={(e) => handleInputChange(label, e.target.value)}
            className="mx-1 md:mx-2 bg-transparent border-b-2 font-bold focus:outline-none text-center placeholder-opacity-50 transition-all duration-150 inline-block text-base md:text-sm"
            style={{ 
              borderColor: `${brandPrimary}66`, 
              color: brandPrimary,
              width: `${inputWidth}px`
            }}
          />
        );
      }

      // Handle normal text segments (can include newlines)
      return (
        <span key={index} className="whitespace-pre-wrap break-words">
          {part}
        </span>
      );
    });
  };

  return (
    <div className="leading-loose text-center break-words">
      {renderContent()}
    </div>
  );
};

export default ContractRenderer;
