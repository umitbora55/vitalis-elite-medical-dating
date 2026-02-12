import React, { useState } from 'react';
import { FilterPreferences, Specialty } from '../types';
import { X, SlidersHorizontal, MapPin, Briefcase, Calendar, Clock } from 'lucide-react';

interface FilterViewProps {
  initialFilters: FilterPreferences;
  onClose: () => void;
  onSave: (filters: FilterPreferences) => void;
}

export const FilterView: React.FC<FilterViewProps> = ({ initialFilters, onClose, onSave }) => {
  const [filters, setFilters] = useState<FilterPreferences>(initialFilters);

  const handleSpecialtyToggle = (specialty: Specialty) => {
    setFilters(prev => {
      const exists = prev.specialties.includes(specialty);
      if (exists) {
        return { ...prev, specialties: prev.specialties.filter(s => s !== specialty) };
      } else {
        return { ...prev, specialties: [...prev.specialties, specialty] };
      }
    });
  };

  const handleAgeChange = (index: 0 | 1, value: string) => {
    const val = parseInt(value) || 0;
    const newRange = [...filters.ageRange] as [number, number];
    newRange[index] = val;
    setFilters(prev => ({ ...prev, ageRange: newRange }));
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col animate-fade-in">
      {/* Header - Agent 1 & 4: Better spacing and touch targets */}
      <div className="flex items-center justify-between p-5 glass border-b border-slate-800/50 safe-top">
        <h2 className="text-xl font-serif text-white flex items-center gap-3">
          <div className="p-2 bg-gold-500/10 rounded-xl">
            <SlidersHorizontal size={20} className="text-gold-500" />
          </div>
          Discovery Settings
        </h2>
        <button
          onClick={onClose}
          aria-label="Close filters"
          className="btn-icon text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X size={22} strokeWidth={2} />
        </button>
      </div>

      {/* Content - Agent 1: Better spacing */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* Availability Toggle - Agent 3 & 5: Better card and toggle styling */}
        <div className="card-premium bg-slate-900/60 p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex-shrink-0">
                    <Clock size={22} className="text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-white font-semibold text-base mb-0.5">Available Now Only</h3>
                    <p className="text-sm text-slate-400">Show users who are free right now.</p>
                </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={filters.showAvailableOnly}
                    onChange={() => setFilters(prev => ({ ...prev, showAvailableOnly: !prev.showAvailableOnly }))}
                  />
                  <div className="w-12 h-7 bg-slate-700 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all after:duration-200 peer-checked:bg-emerald-500 transition-colors"></div>
            </label>
        </div>

        {/* Age Range - Agent 5: Better input styling */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gold-500 font-semibold uppercase tracking-wider text-xs">
            <Calendar size={16} strokeWidth={2.5} />
            <span>Age Preference</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex-1 card-premium bg-slate-900/60 p-4 flex flex-col">
                <label className="text-caption text-slate-500 uppercase font-bold mb-1">Min Age</label>
                <input
                  type="number"
                  min="20"
                  max="80"
                  value={filters.ageRange[0]}
                  onChange={(e) => handleAgeChange(0, e.target.value)}
                  className="bg-transparent text-white font-serif text-2xl outline-none focus:text-gold-400 transition-colors"
                />
             </div>
             <div className="text-slate-500 font-serif italic text-lg">to</div>
             <div className="flex-1 card-premium bg-slate-900/60 p-4 flex flex-col">
                <label className="text-caption text-slate-500 uppercase font-bold mb-1">Max Age</label>
                <input
                  type="number"
                  min="20"
                  max="80"
                  value={filters.ageRange[1]}
                  onChange={(e) => handleAgeChange(1, e.target.value)}
                  className="bg-transparent text-white font-serif text-2xl outline-none focus:text-gold-400 transition-colors"
                />
             </div>
          </div>
        </div>

        {/* Distance - Agent 5: Better slider styling */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gold-500 font-semibold uppercase tracking-wider text-xs">
                <MapPin size={16} strokeWidth={2.5} />
                <span>Maximum Distance</span>
            </div>
            <span className="text-white font-bold font-serif text-lg">{filters.maxDistance} km</span>
          </div>
          <input
            type="range"
            min="1"
            max="150"
            value={filters.maxDistance}
            onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: parseInt(e.target.value) }))}
            className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-gold-500"
          />
          <div className="flex justify-between text-sm text-slate-500">
             <span>1 km</span>
             <span>150 km</span>
          </div>
        </div>

        {/* Specialty Filter - Agent 3 & 4: Better tag buttons */}
        <div className="space-y-4 pb-16">
           <div className="flex items-center gap-2 text-gold-500 font-semibold uppercase tracking-wider text-xs">
                <Briefcase size={16} strokeWidth={2.5} />
                <span>Specialties</span>
           </div>
           <p className="text-sm text-slate-400">Select the medical fields you are interested in.</p>

           <div className="flex flex-wrap gap-2.5">
             {Object.values(Specialty).map((spec) => {
               const isSelected = filters.specialties.includes(spec);
               return (
                 <button
                   key={spec}
                   onClick={() => handleSpecialtyToggle(spec)}
                   className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all duration-200 active:scale-95 ${
                     isSelected
                       ? 'bg-gold-500 border-gold-500 text-slate-950 shadow-glow-gold'
                       : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                   }`}
                 >
                   {spec}
                 </button>
               );
             })}
           </div>
        </div>

      </div>

      {/* Footer Actions - Agent 4: Premium button */}
      <div className="p-5 glass border-t border-slate-800/50 safe-bottom">
         <button
           onClick={() => onSave(filters)}
           className="btn-primary w-full py-4 bg-white hover:bg-slate-100 text-slate-950"
         >
           Save Preferences
         </button>
      </div>
    </div>
  );
};
