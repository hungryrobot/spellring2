import { cn } from "@/lib/utils";
import { getSpellColor } from "@/lib/spell-colors";

interface RingVisualProps {
  ringStorage: Array<{
    id: number;
    spell: {
      id: number;
      name: string;
      level: number;
    };
    upcastLevel: number;
  }>;
  className?: string;
}

export default function RingVisual({ ringStorage, className }: RingVisualProps) {
  // Calculate filled slots with spell information
  const filledSlots: Array<{ spellId: number; spellName: string; color: string }> = [];
  
  ringStorage.forEach(item => {
    const baseLevel = item.spell.level === 0 ? 1 : item.spell.level;
    const effectiveLevel = baseLevel + (item.upcastLevel || 0);
    const spellColor = getSpellColor(item.spell.id, item.spell.name);
    
    // Add the appropriate number of slots for this spell
    for (let i = 0; i < effectiveLevel; i++) {
      filledSlots.push({
        spellId: item.spell.id,
        spellName: item.spell.name,
        color: spellColor.fill
      });
    }
  });

  // Create 5 slots (70 degrees each, with 2 degree gaps)
  const slots = Array.from({ length: 5 }, (_, index) => {
    const slotData = index < filledSlots.length ? filledSlots[index] : null;
    const startAngle = index * 72 - 90; // Start from top, 72 degrees per slot (70 + 2 gap)
    
    return {
      index,
      slotData,
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
            if (!slot.slotData) return null;
            
            return (
              <path
                key={`slot-${slot.index}`}
                d={createArcPath(slot.startAngle, slot.endAngle, 43, 16)}
                fill={slot.slotData.color}
                className="transition-all duration-300"
              />
            );
          })}
          
          {/* Magical sparkle effect for filled slots */}
          {slots.map((slot) => {
            if (!slot.slotData) return null;
            
            const midAngle = (slot.startAngle + slot.endAngle) / 2;
            const midAngleRad = (midAngle * Math.PI) / 180;
            const sparkleX = 50 + 35 * Math.cos(midAngleRad);
                  r="0.8"
                  fill="#fef3c7"
                  className="animate-pulse"
                  style={{ animationDelay: '0.5s' }}
                />
              </g>
            );
          })}
        </svg>
        
        {/* Capacity text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs font-bold text-gray-700">
              {filledSlots.length}/5
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}