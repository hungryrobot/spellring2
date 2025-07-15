// Spell color system for consistent theming
export const getSpellColor = (spellId: number, spellName: string) => {
  // Create a consistent color based on spell ID and name
  const hash = spellId + spellName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Define a palette of magical colors
  const colors = [
    { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-900', fill: '#ef4444' },
    { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-900', fill: '#3b82f6' },
    { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-900', fill: '#22c55e' },
    { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-900', fill: '#a855f7' },
    { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-900', fill: '#f97316' },
    { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-pink-900', fill: '#ec4899' },
    { bg: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-indigo-900', fill: '#6366f1' },
    { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-teal-900', fill: '#14b8a6' },
    { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-cyan-900', fill: '#06b6d4' },
    { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-emerald-900', fill: '#10b981' },
    { bg: 'bg-violet-500', border: 'border-violet-600', text: 'text-violet-900', fill: '#8b5cf6' },
    { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-rose-900', fill: '#f43f5e' },
  ];
  
  return colors[Math.abs(hash) % colors.length];
};