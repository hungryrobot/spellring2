import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Plus, Eye, ChevronDown, ChevronUp, TrendingUp, Star } from "lucide-react";
import { type Spell } from "../../../shared/schema";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { getSpellColor } from "@/lib/spell-colors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SpellCardProps {
  spell: Spell;
  variant?: "library" | "ring";
  onAdd?: (spell: Spell, upcastLevel?: number) => void;
  onRemove?: (ringId: number) => void;
  onToggleFavorite?: (spellId: number) => void;
  ringId?: number;
  disabled?: boolean;
  upcastLevel?: number;
  currentCapacity?: number;
}

export default function SpellCard({ 
  spell, 
  variant = "library", 
  onAdd, 
  onRemove, 
  onToggleFavorite,
  ringId, 
  disabled = false,
  upcastLevel = 0,
  currentCapacity = 0
}: SpellCardProps) {
  const isRingCard = variant === "ring";
  const baseLevel = spell.level === 0 ? 1 : spell.level;
  const effectiveLevel = baseLevel + upcastLevel;
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Check if spell can be upcast - look for multiple indicators
  const spellColor = getSpellColor(spell.id, spell.name);
  
  const canUpcast = (
    (spell.upcast && spell.upcast.toLowerCase() !== 'no' && spell.upcast.trim() !== '') ||
    (spell.description && spell.description.toLowerCase().includes('at higher levels')) ||
    (spell.spell && spell.spell.toLowerCase().includes('at higher levels'))
  );
  
  // Generate upcast level options (limited by ring capacity)
  const getUpcastOptions = () => {
    const options = [];
    const remainingCapacity = 5 - currentCapacity;
    
    // The highest level we can cast at is limited by remaining capacity
    const maxCastLevel = Math.min(9, remainingCapacity);
    
    // For cantrips (level 0), start upcast options at level 2
    // since they're treated as level 1 for storage but can be upcast to higher levels
    const startLevel = spell.level === 0 ? 2 : baseLevel;
    
    // Generate all possible casting levels
    for (let level = baseLevel; level <= maxCastLevel; level++) {
      // For cantrips, include base level (1) and upcast levels (2+)
      // For regular spells, include all levels from base up
      if (spell.level === 0) {
        options.push(level); // Include level 1 (base) and 2+ (upcast)
      } else {
        options.push(level);
      }
    }
    return options;
  };

  // Create audio context for spell cast sound
  const playSpellCastSound = () => {
    try {
      // Create a simple spell cast sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a magical "whoosh" sound
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.type = 'sine';
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Audio not supported or failed to play
    }
  };

  // Create audio context for add spell sound
  const playAddSpellSound = () => {
    try {
      // Create a different magical sound for adding spells
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a bright "chime" sound for adding
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.type = 'triangle';
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Audio not supported or failed to play
    }
  };

  // Simplified styling without class colors

  return (
    <Card 
      className={cn(
        "p-4 transition-all duration-200",
        isRingCard 
          ? `bg-white border-2` 
          : disabled 
            ? "bg-gray-100 border-gray-300 border-2 opacity-30 cursor-not-allowed"
            : spell.isFavorite
              ? "bg-blue-50 border-blue-300 border-[3px] hover:shadow-md cursor-pointer"
              : "bg-white border-[3px] hover:shadow-md cursor-pointer"
      )}
      style={isRingCard ? { borderColor: spellColor.fill } : {}}
    >
      <div className="space-y-3">
        {/* Mobile-optimized layout */}
        <div className="space-y-2">
          {/* Spell title - always first for clarity */}
          <div className="flex items-center gap-2">
            {/* Color indicator dot for ring cards */}
            {isRingCard && (
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: spellColor.fill }}
              />
            )}
            
            {/* Favorite star button for library cards */}
            {!isRingCard && onToggleFavorite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(spell.id);
                }}
                className={cn(
                  "p-2 h-auto",
                  spell.isFavorite 
                    ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50" 
                    : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
                )}
                title={spell.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star className={cn("w-5 h-5", spell.isFavorite ? "fill-current" : "")} />
              </Button>
            )}

            <h3 className={cn(
              "font-semibold text-lg", 
              disabled ? "text-gray-400" : 
              spell.isFavorite ? "text-gray-800" : "text-gray-900"
            )}>
              {spell.name}
            </h3>
            
            {/* Range badge */}
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs px-2 py-1",
                disabled ? "border-gray-300 text-gray-400" : 
                spell.isFavorite ? "border-blue-300 text-blue-700 bg-blue-50" : "border-gray-300 text-gray-600"
              )}
            >
              {spell.range || 'Unknown'}
            </Badge>
          </div>
          
          {/* Action buttons - full width for mobile */}
          <div className="flex gap-2">
            {/* Add spell button for library cards - full width on mobile */}
            {!isRingCard && onAdd && !disabled ? (
              canUpcast ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      className={cn(
                        "flex-1 min-h-[44px] text-sm font-medium border-2 gap-2",
                        "bg-yellow-400 border-yellow-600 text-yellow-900 hover:bg-yellow-500"
                      )}
                      size="default"
                    >
                      {spell.level === 0 ? "Add Cantrip" : `Add Level ${spell.level} Spell`}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {getUpcastOptions().map((level) => (
                      <DropdownMenuItem
                        key={level}
                        onClick={(e) => {
                          e.stopPropagation();
                          playAddSpellSound();
                          onAdd(spell, level - baseLevel);
                        }}
                        className="cursor-pointer touch-manipulation py-3 text-base"
                      >
                        {spell.level === 0 && level === 1 ? "Cantrip (Base)" :
                         spell.level === 0 && level > 1 ? `Level ${level} (Upcast)` :
                         level === baseLevel ? `Level ${level} (Base)` : 
                         `Level ${level} (Upcast)`}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  className={cn(
                    "flex-1 min-h-[44px] text-sm font-medium border-2",
                    disabled ? "border-gray-300 text-gray-400 bg-gray-100" : 
                    "border-gray-400 text-gray-600 bg-white hover:bg-gray-50"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    playAddSpellSound();
                    onAdd(spell, 0);
                  }}
                  disabled={disabled}
                  size="default"
                >
                  {spell.level === 0 ? "Add Cantrip" : `Add Level ${spell.level} Spell`}
                </Button>
              )
            ) : null}

            {isRingCard && onRemove && ringId && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  playSpellCastSound();
                  setTimeout(() => {
                    onRemove(ringId);
                  }, 50);
                }}
                className="flex-1 min-h-[44px] text-red-600 hover:text-red-700 hover:bg-red-50 border-2 border-red-200 gap-2"
                variant="outline"
                size="default"
              >
                {upcastLevel > 0 ? (
                  <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {spell.level === 0 && upcastLevel === 0 ? "Cast Cantrip" :
                   spell.level === 0 && upcastLevel > 0 ? `Cast Level ${effectiveLevel} (Upcasted)` :
                   upcastLevel > 0 ? `Cast Level ${effectiveLevel} (Upcasted)` : 
                   `Cast Level ${effectiveLevel}`}
                </span>
              </Button>
            )}
          </div>

          {/* Spell details badges - separate row for mobile */}
          <div className="flex flex-wrap gap-2">
            
            {/* Type badge if different from spell name area */}
            {spell.type && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-sm px-2 py-1",
                  disabled ? "border-gray-300 text-gray-400" : 
                  spell.isFavorite ? "border-blue-300 text-blue-700 bg-blue-50" : "border-gray-300 text-gray-600"
                )}
              >
                {spell.type}
              </Badge>
            )}
          </div>
        </div>

        {/* Show details button - separate section */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsDescriptionExpanded(!isDescriptionExpanded);
            }}
            className={cn(
              "text-gray-500 hover:text-gray-700 hover:bg-gray-100 gap-1 min-h-[36px]",
              disabled && "text-gray-400 hover:text-gray-400"
            )}
          >
            {isDescriptionExpanded ? (
              <>
                <Eye className="w-4 h-4" />
                <span className="text-sm">Hide details</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span className="text-sm">Show details</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

          {/* Collapsible additional info */}
          {isDescriptionExpanded && (
            <div className="mb-2">
              {/* Concentration, Upcast badges */}
              <div className="flex flex-wrap gap-2 mb-2">
                {spell.concentration && spell.concentration.toLowerCase() === 'yes' && (
                  <Badge 
                    variant="outline" 
                    className="text-xs flex items-center gap-1 border-gray-500 text-gray-600"
                  >
                    <Zap className="w-3 h-3" />
                    Concentration
                  </Badge>
                )}

                {spell.upcast && spell.upcast.toLowerCase() !== 'no' && (
                  <Badge 
                    variant="outline" 
                    className="text-xs flex items-center gap-1 border-gray-500 text-gray-600"
                  >
                    <TrendingUp className="w-3 h-3" />
                    Upcastable
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Description and Details */}
          {isDescriptionExpanded && (
            <div className="mb-2">
              <p className="text-sm mb-2 text-gray-600">
                {spell.description}
              </p>
            </div>
          )}
      </div>
    </Card>
  );
}