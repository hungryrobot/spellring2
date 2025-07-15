import { cn } from "@/lib/utils";

interface RingVisualProps {
  ringStorage: Array<{
    id: number;
    spell: {
      level: number;
    };
    upcastLevel: number;
  }>;
  className?: string;
}

export default function RingVisual({ ringStorage, className }: RingVisualProps) {
  // Calculate filled slots based on spell levels
  const filledSlots: number[] = [];
  
  ringStorage.forEach(item => {
    const baseLevel = item.spell.level === 0 ? 1 : item.spell.level;
    const effectiveLevel = baseLevel + (item.upcastLevel || 0);
    
    // Add the appropriate number of slots for this spell
    for (let i = 0; i < effectiveLevel; i++) {
      filledSlots.push(effectiveLevel);
    }
  });

  // Create 5 slots (70 degrees each, with 2 degree gaps)
  const slots = Array.from({ length: 5 }, (_, index) => {
    const isFilled = index < filledSlots.length;
    const startAngle = index * 72 - 90; // Start from top, 72 degrees per slot (70 + 2 gap)
    
    return {
      index,
      isFilled,
      startAngle,
      endAngle: startAngle + 70
    };
  });

  // Function to create SVG path for an arc
  const createArcPath = (startAngle: number, endAngle: number, radius: number, thickness: number) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const innerRadius = radius - thickness;
    
    const x1 = 50 + radius * Math.cos(startAngleRad);
    const y1 = 50 + radius * Math.sin(startAngleRad);
    const x2 = 50 + radius * Math.cos(endAngleRad);
    const y2 = 50 + radius * Math.sin(endAngleRad);
    
    const x3 = 50 + innerRadius * Math.cos(endAngleRad);
    const y3 = 50 + innerRadius * Math.sin(endAngleRad);
    const x4 = 50 + innerRadius * Math.cos(startAngleRad);
    const y4 = 50 + innerRadius * Math.sin(startAngleRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `;
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 100 100" className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
            className="opacity-30"
          />
          
          {/* Slot separators */}
          {slots.map((slot) => {
            const angle = slot.startAngle - 1; // Slightly before each slot
            const angleRad = (angle * Math.PI) / 180;
            const x1 = 50 + 27 * Math.cos(angleRad);
            const y1 = 50 + 27 * Math.sin(angleRad);
            const x2 = 50 + 43 * Math.cos(angleRad);
            const y2 = 50 + 43 * Math.sin(angleRad);
            
            return (
              <line
                key={`separator-${slot.index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#d1d5db"
                strokeWidth="1"
                className="opacity-50"
              />
            );
          })}
          
          {/* Filled slots */}
          {slots.map((slot) => {
            if (!slot.isFilled) return null;
            
            return (
              <path
                key={`slot-${slot.index}`}
                d={createArcPath(slot.startAngle, slot.endAngle, 43, 16)}
                fill="#10b981"
                className="transition-all duration-300"
              />
            );
          })}
          
          {/* Magical sparkle effect for filled slots */}
          {slots.map((slot) => {
            if (!slot.isFilled) return null;
            
            const midAngle = (slot.startAngle + slot.endAngle) / 2;
            const midAngleRad = (midAngle * Math.PI) / 180;
            const sparkleX = 50 + 35 * Math.cos(midAngleRad);
            const sparkleY = 50 + 35 * Math.sin(midAngleRad);
            
            return (
              <g key={`sparkle-${slot.index}`}>
                <circle
                  cx={sparkleX}
                  cy={sparkleY}
                  r="1.5"
                  fill="#fbbf24"
                  className="animate-pulse"
                />
                <circle
                  cx={sparkleX}
                  cy={sparkleY}
                  r="0.8"
                  fill="#fef3c7"
                  className="animate-pulse"
                  style={{ animationDelay: '0.5s' }}
                />
              </g>
            );
          })}
          
          {/* Center gem */}
          <circle
            cx="50"
            cy="50"
            r="8"
            fill="#7c3aed"
            className="drop-shadow-sm"
          />
          <circle
            cx="50"
            cy="50"
            r="5"
            fill="#a855f7"
            className="animate-pulse"
          />
          <circle
            cx="48"
            cy="48"
            r="2"
            fill="#e0e7ff"
            className="opacity-80"
          />
        </svg>
        
        {/* Capacity text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center transform rotate-90">
            <div className="text-xs font-bold text-purple-700">
              {filledSlots.length}/5
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}