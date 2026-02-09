import React from 'react';
import { X } from 'lucide-react';
import { MessageTemplate } from '../../types';

interface TemplatesModalProps {
  isOpen: boolean;
  templates: MessageTemplate[];
  newTemplateText: string;
  isAddingTemplate: boolean;
  onClose: () => void;
  onSelectTemplate: (text: string) => void;
  onDeleteTemplate?: (id: string) => void;
  onNewTemplateChange: (value: string) => void;
  onToggleAdd: (open: boolean) => void;
  onAddTemplate: () => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  templates,
  newTemplateText,
  isAddingTemplate,
  onClose,
  onSelectTemplate,
  onDeleteTemplate,
  onNewTemplateChange,
  onToggleAdd,
  onAddTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-800">
          <h3 className="text-xl font-serif text-white">Quick Replies</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 hide-scrollbar space-y-2">
          {templates.map((template) => (
            <div key={template.id} className="group relative">
              <button
                onClick={() => onSelectTemplate(template.text)}
                className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm text-slate-300"
              >
                {template.text}
              </button>
              {template.isCustom && onDeleteTemplate && (
                <button
                  onClick={() => onDeleteTemplate(template.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {!isAddingTemplate ? (
          <button
            onClick={() => onToggleAdd(true)}
            className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:text-white transition-colors"
          >
            + Add New Template
          </button>
        ) : (
          <div className="space-y-3">
            <textarea
              value={newTemplateText}
              onChange={(e) => onNewTemplateChange(e.target.value)}
              placeholder="Write a new template..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-gold-500 focus:outline-none"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => onToggleAdd(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onAddTemplate}
                disabled={!newTemplateText.trim()}
                className="flex-1 py-2 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
