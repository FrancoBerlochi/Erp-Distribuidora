'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Check, X } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Alimentos',
  'Limpieza',
  'Bebidas',
  'Snacks',
  'Cuidado Personal',
  'Sin Categoría'
];

interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
}

export default function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data } = await supabase.from('products').select('category');
        if (data) {
          const dbCategories = data
            .map(p => p.category)
            .filter(Boolean);
          
          const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...dbCategories]));
          setCategories(combined);
        }
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    }
    loadCategories();
  }, []);

  // Si el valor actual no está en la lista, incluirlo
  useEffect(() => {
    if (value && !categories.includes(value)) {
      setCategories(prev => Array.from(new Set([...prev, value])));
    }
  }, [value, categories]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__new__') {
      setIsCreatingNew(true);
      setNewCategoryName('');
    } else {
      onChange(selected);
    }
  };

  const handleConfirmNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setIsCreatingNew(false);
      return;
    }
    if (!categories.includes(trimmed)) {
      setCategories(prev => [...prev, trimmed]);
    }
    onChange(trimmed);
    setIsCreatingNew(false);
  };

  const handleCancelNewCategory = () => {
    setIsCreatingNew(false);
    setNewCategoryName('');
  };

  if (isCreatingNew) {
    return (
      <div>
        <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">
          Crear Nueva Categoría *
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            placeholder="Ej: Lácteos, Golosinas, Panadería..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmNewCategory();
              } else if (e.key === 'Escape') {
                handleCancelNewCategory();
              }
            }}
            className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary/20 outline-none font-semibold placeholder:text-gray-400 shadow-sm"
          />
          <button
            type="button"
            onClick={handleConfirmNewCategory}
            className="bg-primary text-white p-2.5 rounded-lg hover:bg-primary/90 font-bold text-sm flex items-center gap-1 shadow-sm transition-colors"
            title="Guardar categoría"
          >
            <Check className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleCancelNewCategory}
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 p-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-bold text-sm flex items-center gap-1 transition-colors"
            title="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 font-medium">
          Presiona Enter o el botón de check para usarla en este producto.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-bold text-gray-900 dark:text-gray-100">
          Categoría *
        </label>
        <button
          type="button"
          onClick={() => setIsCreatingNew(true)}
          className="text-xs text-primary dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> + Nueva categoría
        </button>
      </div>

      <select
        value={value || ''}
        onChange={handleSelectChange}
        className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-semibold cursor-pointer shadow-sm"
      >
        <option value="" disabled className="text-gray-400">
          -- Selecciona una categoría --
        </option>
        {categories.map((cat) => (
          <option key={cat} value={cat} className="text-gray-900 dark:text-white py-1">
            {cat}
          </option>
        ))}
        <option value="__new__" className="font-bold text-primary dark:text-blue-400 py-1 bg-blue-50 dark:bg-blue-950/30">
          ➕ + Crear nueva categoría personalizada...
        </option>
      </select>
    </div>
  );
}
