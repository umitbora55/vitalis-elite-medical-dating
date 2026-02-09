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
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <h2 className="text-xl font-serif text-white flex items-center gap-2">
          <SlidersHorizontal size={20} className="text-gold-500" />
          Discovery Settings
        </h2>
        <button 
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Availability Toggle */}
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-full border border-green-500/20">
                    <Clock size={20} className="text-green-500" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">Available Now Only</h3>
                    <p className="text-xs text-slate-500">Show users who are free right now.</p>
                </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={filters.showAvailableOnly}
                    onChange={() => setFilters(prev => ({ ...prev, showAvailableOnly: !prev.showAvailableOnly }))}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
        </div>

        {/* Age Range */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gold-500 font-bold uppercase tracking-wider text-xs mb-1">
            <Calendar size={16} />
            <span>Age Preference</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-3 flex flex-col">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Min Age</label>
                <input 
                  type="number" 
                  min="20" 
                  max="80" 
                  value={filters.ageRange[0]} 
                  onChange={(e) => handleAgeChange(0, e.target.value)}
                  className="bg-transparent text-white font-serif text-xl outline-none mt-1"
                />
             </div>
             <div className="text-slate-600 font-serif italic">to</div>
             <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-3 flex flex-col">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Max Age</label>
                <input 
                  type="number" 
                  min="20" 
                  max="80" 
                  value={filters.ageRange[1]} 
                  onChange={(e) => handleAgeChange(1, e.target.value)}
                  className="bg-transparent text-white font-serif text-xl outline-none mt-1"
                />
             </div>
          </div>
        </div>

        {/* Distance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gold-500 font-bold uppercase tracking-wider text-xs">
                <MapPin size={16} />
                <span>Maximum Distance</span>
            </div>
            <span className="text-white font-bold font-serif">{filters.maxDistance} km</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="150" 
            value={filters.maxDistance} 
            onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: parseInt(e.target.value) }))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-gold-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
             <span>1 km</span>
             <span>150 km</span>
          </div>
        </div>

        {/* Specialty Filter */}
        <div className="space-y-4 pb-12">
           <div className="flex items-center gap-2 text-gold-500 font-bold uppercase tracking-wider text-xs mb-1">
                <Briefcase size={16} />
                <span>Specialties</span>
           </div>
           <p className="text-sm text-slate-400 mb-2">Select the medical fields you are interested in.</p>
           
           <div className="flex flex-wrap gap-2">
             {Object.values(Specialty).map((spec) => {
               const isSelected = filters.specialties.includes(spec);
               return (
                 <button
                   key={spec}
                   onClick={() => handleSpecialtyToggle(spec)}
                   className={`px-4 py-2.5 rounded-lg text-sm border transition-all duration-200 ${
                     isSelected 
                       ? 'bg-gold-500 border-gold-500 text-white font-medium shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                       : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                   }`}
                 >
                   {spec}
                 </button>
               );
             })}
           </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-slate-900 border-t border-slate-800">
         <button 
           onClick={() => onSave(filters)}
           className="w-full py-4 bg-white text-slate-950 rounded-full font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors shadow-lg"
         >
           Save Preferences
         </button>
      </div>
    </div>
  );
};