/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCartStore } from '@/lib/store';
import { useDiscountedProducts, optimizeImageUrl } from '@/lib/products-cache';
import { toast } from 'react-toastify';
import { 
  X, 
  Search, 
  Flame, 
  ShoppingCart, 
  Plus, 
  Minus, 
  SlidersHorizontal, 
  Home, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Tag, 
  Package, 
  Percent, 
  ArrowUpDown,
  ArrowLeft
} from 'lucide-react';

const KNOWN_BRANDS = [
  'Coca Cola', 'Sprite', 'Fanta', 'Villavicencio', 'Bonafont', 'Quilmes', 'Corona', 
  'Stella Artois', 'Cepita', 'Baggio', 'Trapiche', 'Branca', 'Gatorade', 'Red Bull', 
  'Cocinero', 'Natura', 'Lucchetti', 'Matarazzo', 'Pureza', 'Blancaflor', 'Ledesma', 
  'Playadito', 'Taragüi', 'La Virginia', 'Nescafé', 'Arcor', 'La Campagnola', 'Hellmanns', 
  'Marolio', "Lay's", 'Lays', 'Doritos', 'Pringles', 'Cheetos', 'Twistos', 'Saladix', 
  'Rex', 'Ala', 'Skip', 'Ariel', 'Vivere', 'Magistral', 'Cif', 'Ayudín', 'Procénex', 
  'Poett', 'La Serenísima', 'Sancor', 'Ilolay', 'Tregar', 'Danone', 'Yogurísimo', 
  'Casancrem', 'Milkaut', 'Milka', 'Bon o Bon', 'Kit Kat', 'Cadbury', 'Mogul', 'Sugus', 
  'Rocklets', 'Dove', 'Rexona', 'Axe', 'Sedal', 'Pantene', 'Colgate', 'Gillette', 'Plusbelle'
];

function detectBrand(productName: string): string | null {
  const lower = productName.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  return null;
}

const PRICE_RANGES = [
  { id: 'under_2000', label: 'Hasta $2.000', min: 0, max: 2000 },
  { id: '2000_5000', label: '$2.000 a $5.000', min: 2000, max: 5000 },
  { id: '5000_10000', label: '$5.000 a $10.000', min: 5000, max: 10000 },
  { id: 'over_10000', label: 'Más de $10.000', min: 10000, max: Infinity },
];

const DISCOUNT_TIERS = [
  { id: 'discount_30_plus', label: '30% OFF o más', check: (p: any) => (p.discount_percentage || 0) >= 30 },
  { id: 'discount_20_29', label: '20% a 29% OFF', check: (p: any) => (p.discount_percentage || 0) >= 20 && (p.discount_percentage || 0) < 30 },
  { id: 'discount_15_19', label: '15% a 19% OFF', check: (p: any) => (p.discount_percentage || 0) >= 15 && (p.discount_percentage || 0) < 20 },
  { id: 'discount_10_14', label: '10% a 14% OFF', check: (p: any) => (p.discount_percentage || 0) >= 10 && (p.discount_percentage || 0) < 15 },
  { id: 'discount_under_10', label: 'Hasta 10% OFF', check: (p: any) => (p.discount_percentage || 0) > 0 && (p.discount_percentage || 0) < 10 },
];

function OfertasContent() {
  const { products, loading } = useDiscountedProducts();
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get('categoria');

  // Estados de Selección Múltiple
  const [selectedDiscounts, setSelectedDiscounts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('discount_desc'); // Por defecto en Ofertas: mayor descuento

  // Estados de Interfaz
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  // Estados de Modal de Producto
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const addItem = useCartStore((state) => state.addItem);

  // Inicializar categoría desde URL
  useEffect(() => {
    if (initialCategoryParam) {
      setSelectedCategories([initialCategoryParam]);
    }
  }, [initialCategoryParam]);

  // Manejo del Carrito
  const handleAddToCart = (product: any, e?: React.MouseEvent, qty: number = 1) => {
    if (e) e.stopPropagation();

    const price = product.price;
    const finalPrice = product.discount_percentage > 0
      ? price - (price * (product.discount_percentage / 100))
      : price;

    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      discount_percentage: product.discount_percentage,
      image_url: product.image_url_1,
      quantity: qty,
      stock: product.stock,
      wholesale_price: product.wholesale_price,
      wholesale_min_qty: product.wholesale_min_qty,
      promo_type: product.promo_type,
      promo_second_unit_discount: product.promo_second_unit_discount,
      promo_min_qty: product.promo_min_qty,
      promo_discount_percentage: product.promo_discount_percentage,
    });

    toast.success(
      qty > 1
        ? `🔥 ${qty}x ${product.name} agregados al carrito con descuento!`
        : `🔥 ${product.name} agregado al carrito con descuento!`
    );
  };

  // Extraer lista de categorías con conteo
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category?.trim() || 'Sin Categoría';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  // Extraer lista de marcas disponibles con conteo
  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const brand = detectBrand(p.name);
      if (brand) {
        counts[brand] = (counts[brand] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  // Filtrar marcas con el buscador interno de marcas
  const visibleBrands = useMemo(() => {
    let list = brandCounts;
    if (brandSearch.trim()) {
      list = list.filter((b) => b.name.toLowerCase().includes(brandSearch.toLowerCase()));
    }
    return showAllBrands ? list : list.slice(0, 8);
  }, [brandCounts, showAllBrands, brandSearch]);

  const visibleCategories = useMemo(() => {
    return showAllCategories ? categoryCounts : categoryCounts.slice(0, 7);
  }, [categoryCounts, showAllCategories]);

  // Filtro Maestro con lógica múltiple
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // 1. Filtro por Búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = p.description && p.description.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }

      // 2. Filtro Múltiple de Tramos de Descuento
      if (selectedDiscounts.length > 0) {
        const matchTier = selectedDiscounts.some((tierId) => {
          const tierDef = DISCOUNT_TIERS.find((t) => t.id === tierId);
          return tierDef ? tierDef.check(p) : true;
        });
        if (!matchTier) return false;
      }

      // 3. Filtro Múltiple de Categorías (OR dentro de categorías)
      if (selectedCategories.length > 0) {
        const prodCat = (p.category || 'Sin Categoría').trim().toLowerCase();
        const matchCat = selectedCategories.some(
          (c) => c.trim().toLowerCase() === prodCat
        );
        if (!matchCat) return false;
      }

      // 4. Filtro Múltiple de Marcas (OR dentro de marcas)
      if (selectedBrands.length > 0) {
        const detected = detectBrand(p.name);
        if (!detected || !selectedBrands.includes(detected)) return false;
      }

      // 5. Filtro Múltiple de Rango de Precio (Calculado sobre el precio ya rebajado)
      if (selectedPriceRanges.length > 0) {
        const finalPrice = p.discount_percentage > 0
          ? p.price - p.price * (p.discount_percentage / 100)
          : p.price;

        const matchRange = selectedPriceRanges.some((rangeId) => {
          const rangeDef = PRICE_RANGES.find((r) => r.id === rangeId);
          if (!rangeDef) return true;
          return finalPrice >= rangeDef.min && finalPrice <= rangeDef.max;
        });
        if (!matchRange) return false;
      }

      // 6. Solo con Stock
      if (onlyInStock && p.stock <= 0) {
        return false;
      }

      return true;
    });

    // Ordenamiento
    if (sortBy === 'discount_desc') {
      result.sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => {
        const pa = a.discount_percentage > 0 ? a.price * (1 - a.discount_percentage / 100) : a.price;
        const pb = b.discount_percentage > 0 ? b.price * (1 - b.discount_percentage / 100) : b.price;
        return pa - pb;
      });
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => {
        const pa = a.discount_percentage > 0 ? a.price * (1 - a.discount_percentage / 100) : a.price;
        const pb = b.discount_percentage > 0 ? b.price * (1 - b.discount_percentage / 100) : b.price;
        return pb - pa;
      });
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [
    products,
    searchQuery,
    selectedDiscounts,
    selectedCategories,
    selectedBrands,
    selectedPriceRanges,
    onlyInStock,
    sortBy,
  ]);

  // Alternadores de selección múltiple
  const toggleDiscount = (tierId: string) => {
    setSelectedDiscounts((prev) =>
      prev.includes(tierId) ? prev.filter((id) => id !== tierId) : [...prev, tierId]
    );
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const toggleBrand = (brandName: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName)
        ? prev.filter((b) => b !== brandName)
        : [...prev, brandName]
    );
  };

  const togglePriceRange = (rangeId: string) => {
    setSelectedPriceRanges((prev) =>
      prev.includes(rangeId)
        ? prev.filter((r) => r !== rangeId)
        : [...prev, rangeId]
    );
  };

  const clearAllFilters = () => {
    setSelectedDiscounts([]);
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedPriceRanges([]);
    setOnlyInStock(false);
    setSearchQuery('');
    setBrandSearch('');
  };

  const totalActiveFilters =
    selectedDiscounts.length +
    selectedCategories.length +
    selectedBrands.length +
    selectedPriceRanges.length +
    (onlyInStock ? 1 : 0) +
    (searchQuery ? 1 : 0);

  // Componente de Panel de Filtros
  const FilterSidebarContent = (
    <div className="space-y-6 text-sm">
      {/* Encabezado del Panel de Filtros */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#dc2626]" />
          <span className="font-extrabold text-base text-gray-900 dark:text-white">Filtros</span>
          {totalActiveFilters > 0 && (
            <span className="text-[11px] font-black bg-[#dc2626] text-white px-2 py-0.5 rounded-full">
              {totalActiveFilters}
            </span>
          )}
        </div>
        {totalActiveFilters > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-bold text-[#dc2626] hover:text-red-700 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Limpiar todo
          </button>
        )}
      </div>

      {/* 1. GRUPO: NIVEL DE DESCUENTO (MÚLTIPLE) */}
      <div className="space-y-2.5">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-secondary fill-secondary" />
          <span>Porcentaje de Descuento</span>
        </h3>
        <div className="space-y-1 pl-1">
          {DISCOUNT_TIERS.map((tier) => {
            const count = products.filter(tier.check).length;
            if (count === 0 && !selectedDiscounts.includes(tier.id)) return null;
            const isChecked = selectedDiscounts.includes(tier.id);

            return (
              <label
                key={tier.id}
                onClick={() => toggleDiscount(tier.id)}
                className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer select-none transition-colors group ${
                  isChecked
                    ? 'bg-red-50/80 dark:bg-red-950/40 text-[#dc2626] dark:text-red-400 font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                      isChecked
                        ? 'bg-[#dc2626] border-[#dc2626] text-white'
                        : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 bg-white dark:bg-gray-800'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate text-xs sm:text-sm">{tier.label}</span>
                </div>
                <span className="font-black text-[#dc2626] dark:text-red-400 text-xs shrink-0 ml-1">
                  ({count})
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. GRUPO: CATEGORÍA (MÚLTIPLE) */}
      {categoryCounts.length > 0 && (
        <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
            Categoría
          </h3>
          <div className="space-y-1 pl-1">
            {visibleCategories.map((cat) => {
              const isChecked = selectedCategories.includes(cat.name);
              return (
                <label
                  key={cat.name}
                  onClick={() => toggleCategory(cat.name)}
                  className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer select-none transition-colors group ${
                    isChecked
                      ? 'bg-red-50/80 dark:bg-red-950/40 text-[#dc2626] dark:text-red-400 font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                        isChecked
                          ? 'bg-[#dc2626] border-[#dc2626] text-white'
                          : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate text-xs sm:text-sm">{cat.name}</span>
                  </div>
                  <span className="font-black text-[#dc2626] dark:text-red-400 text-xs shrink-0 ml-1">
                    ({cat.count})
                  </span>
                </label>
              );
            })}

            {categoryCounts.length > 7 && (
              <button
                type="button"
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="text-xs font-extrabold text-[#dc2626] hover:text-red-700 dark:text-red-400 pt-1.5 pl-2 flex items-center gap-1 cursor-pointer"
              >
                {showAllCategories ? (
                  <>
                    <span>Menos categorías</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Más categorías ({categoryCounts.length - 7})</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. GRUPO: MARCA (MÚLTIPLE) */}
      {brandCounts.length > 0 && (
        <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
              Marca
            </h3>
            {brandCounts.length > 8 && (
              <span className="text-[11px] text-gray-400 font-semibold">{brandCounts.length} marcas</span>
            )}
          </div>

          {/* Mini buscador si hay muchas marcas */}
          {brandCounts.length > 8 && (
            <div className="relative mb-1.5">
              <input
                type="text"
                placeholder="Buscar marca..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-hidden focus:ring-1 focus:ring-red-500"
              />
              {brandSearch && (
                <button
                  type="button"
                  onClick={() => setBrandSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div className="space-y-1 pl-1 max-h-56 overflow-y-auto pr-1">
            {visibleBrands.map((brand) => {
              const isChecked = selectedBrands.includes(brand.name);
              return (
                <label
                  key={brand.name}
                  onClick={() => toggleBrand(brand.name)}
                  className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer select-none transition-colors group ${
                    isChecked
                      ? 'bg-red-50/80 dark:bg-red-950/40 text-[#dc2626] dark:text-red-400 font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                        isChecked
                          ? 'bg-[#dc2626] border-[#dc2626] text-white'
                          : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate text-xs sm:text-sm">{brand.name}</span>
                  </div>
                  <span className="font-black text-[#dc2626] dark:text-red-400 text-xs shrink-0 ml-1">
                    ({brand.count})
                  </span>
                </label>
              );
            })}

            {brandCounts.length > 8 && !brandSearch && (
              <button
                type="button"
                onClick={() => setShowAllBrands(!showAllBrands)}
                className="text-xs font-extrabold text-[#dc2626] hover:text-red-700 dark:text-red-400 pt-1.5 pl-2 flex items-center gap-1 cursor-pointer"
              >
                {showAllBrands ? (
                  <>
                    <span>Menos marcas</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Más marcas ({brandCounts.length - 8})</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. GRUPO: RANGO DE PRECIO (MÚLTIPLE) */}
      <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
          Rango de Precio (Promocional)
        </h3>
        <div className="space-y-1 pl-1">
          {PRICE_RANGES.map((range) => {
            const count = products.filter((p) => {
              const finalPrice = p.discount_percentage > 0
                ? p.price - p.price * (p.discount_percentage / 100)
                : p.price;
              return finalPrice >= range.min && finalPrice <= range.max;
            }).length;
            const isChecked = selectedPriceRanges.includes(range.id);

            return (
              <label
                key={range.id}
                onClick={() => togglePriceRange(range.id)}
                className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer select-none transition-colors group ${
                  isChecked
                    ? 'bg-red-50/80 dark:bg-red-950/40 text-[#dc2626] dark:text-red-400 font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                      isChecked
                        ? 'bg-[#dc2626] border-[#dc2626] text-white'
                        : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 bg-white dark:bg-gray-800'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate text-xs sm:text-sm">{range.label}</span>
                </div>
                <span className="font-black text-[#dc2626] dark:text-red-400 text-xs shrink-0 ml-1">
                  ({count})
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 5. GRUPO: DISPONIBILIDAD */}
      <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
          Disponibilidad
        </h3>
        <div className="space-y-1 pl-1">
          <label
            onClick={() => setOnlyInStock(!onlyInStock)}
            className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer select-none transition-colors group ${
              onlyInStock
                ? 'bg-red-50/80 dark:bg-red-950/40 text-[#dc2626] dark:text-red-400 font-bold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                  onlyInStock
                    ? 'bg-[#dc2626] border-[#dc2626] text-white'
                    : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 bg-white dark:bg-gray-800'
                }`}
              >
                {onlyInStock && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="truncate text-xs sm:text-sm">En stock inmediato</span>
            </div>
            <span className="font-black text-[#dc2626] dark:text-red-400 text-xs shrink-0 ml-1">
              ({products.filter((p) => p.stock > 0).length})
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">
        <Link href="/" className="hover:text-primary flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          <span>Inicio</span>
        </Link>
        <span>/</span>
        <span className="text-secondary dark:text-red-400 font-bold">Ofertas y Promociones</span>
      </div>

      {/* Banner de Ofertas */}
      <section className="mb-8 relative rounded-3xl overflow-hidden shadow-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white p-6 sm:p-8 md:p-10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold mb-3 border border-white/30">
            <Percent className="w-4 h-4" /> Descuentos Imperdibles
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tight">
            Zona de Ofertas y Promociones 🔥
          </h1>
          <p className="text-white/90 text-xs sm:text-base mb-5 leading-relaxed">
            Aprovecha nuestros precios mayoristas con rebajas directas en productos seleccionados. ¡Stock limitado!
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 bg-white text-red-600 font-bold px-5 py-2 rounded-full hover:bg-white/90 transition-all text-xs sm:text-sm shadow-md"
            >
              <ArrowLeft className="w-4 h-4" /> Ver Catálogo Completo
            </Link>
          </div>
        </div>

        {/* Elemento decorativo de fondo */}
        <div className="absolute -bottom-10 -right-10 opacity-15 pointer-events-none">
          <Tag className="w-72 h-72 text-white transform rotate-12" />
        </div>
      </section>

      {/* Barra de Búsqueda y Resumen Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span>Productos en Descuento</span>
            {!loading && (
              <span className="text-xs bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 font-bold px-3 py-0.5 rounded-full border border-red-200 dark:border-red-900/50">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'oferta' : 'ofertas'}
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Filtra por descuento, marca o categoría para encontrar las mejores oportunidades.
          </p>
        </div>

        {/* Buscador de ofertas */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full px-4 py-2 w-full sm:w-80 shadow-xs">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar entre ofertas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Botón de Filtros para Mobile (< lg) */}
      <div className="lg:hidden flex items-center justify-between gap-3 mb-4 p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex items-center gap-2 font-extrabold text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2 rounded-xl transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#dc2626]" />
          <span>Filtros</span>
          {totalActiveFilters > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#dc2626] text-white text-[11px] font-black flex items-center justify-center">
              {totalActiveFilters}
            </span>
          )}
        </button>

        {/* Selector de Orden en Mobile */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent font-bold text-gray-900 dark:text-white outline-hidden cursor-pointer"
          >
            <option value="discount_desc">Mayor descuento</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
            <option value="name_asc">Nombre A-Z</option>
          </select>
        </div>
      </div>

      {/* ESTRUCTURA PRINCIPAL: SIDEBAR + GRILLA */}
      <div className="flex items-start gap-8">
        {/* SIDEBAR LATERAL DESKTOP */}
        <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs max-h-[calc(100vh-6rem)] overflow-y-auto">
          {FilterSidebarContent}
        </aside>

        {/* COLUMNA CENTRAL / DERECHA */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* BARRA: "Su selección:" */}
          {totalActiveFilters > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white">
                  Su selección:
                </span>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-[#dc2626] hover:text-red-700 dark:text-red-400 hover:underline cursor-pointer"
                >
                  Limpiar todo ({totalActiveFilters})
                </button>
              </div>

              {/* Chips de Filtros Activos con '✕' */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Descuentos activos */}
                {selectedDiscounts.map((tierId) => {
                  const tierDef = DISCOUNT_TIERS.find((t) => t.id === tierId);
                  return (
                    <span
                      key={`chip-discount-${tierId}`}
                      className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-950/50 text-[#dc2626] dark:text-red-400 border border-red-200 dark:border-red-900/60 text-xs font-extrabold px-3 py-1 rounded-full shadow-2xs"
                    >
                      <Flame className="w-3 h-3 fill-secondary text-secondary" />
                      <span>{tierDef?.label || 'Descuento'}</span>
                      <button
                        type="button"
                        onClick={() => toggleDiscount(tierId)}
                        className="hover:bg-red-200 dark:hover:bg-red-900/80 rounded-full p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                {/* Categorías activas */}
                {selectedCategories.map((cat) => (
                  <span
                    key={`chip-cat-${cat}`}
                    className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-950/50 text-[#dc2626] dark:text-red-400 border border-red-200 dark:border-red-900/60 text-xs font-extrabold px-3 py-1 rounded-full shadow-2xs"
                  >
                    <span>Categoría: {cat}</span>
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="hover:bg-red-200 dark:hover:bg-red-900/80 rounded-full p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Marcas activas */}
                {selectedBrands.map((brand) => (
                  <span
                    key={`chip-brand-${brand}`}
                    className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 text-xs font-extrabold px-3 py-1 rounded-full shadow-2xs"
                  >
                    <span>Marca: {brand}</span>
                    <button
                      type="button"
                      onClick={() => toggleBrand(brand)}
                      className="hover:bg-amber-200 dark:hover:bg-amber-900/80 rounded-full p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Rangos de precio activos */}
                {selectedPriceRanges.map((rangeId) => {
                  const rangeDef = PRICE_RANGES.find((r) => r.id === rangeId);
                  return (
                    <span
                      key={`chip-price-${rangeId}`}
                      className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 text-primary dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 text-xs font-extrabold px-3 py-1 rounded-full shadow-2xs"
                    >
                      <span>{rangeDef?.label || 'Precio'}</span>
                      <button
                        type="button"
                        onClick={() => togglePriceRange(rangeId)}
                        className="hover:bg-blue-200 dark:hover:bg-blue-900/80 rounded-full p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                {/* Stock activo */}
                {onlyInStock && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 text-xs font-extrabold px-3 py-1 rounded-full shadow-2xs">
                    <span>En stock</span>
                    <button
                      type="button"
                      onClick={() => setOnlyInStock(false)}
                      className="hover:bg-emerald-200 dark:hover:bg-emerald-900/80 rounded-full p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Búsqueda activa */}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                    <span>Búsqueda: &quot;{searchQuery}&quot;</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* BARRA SUPERIOR DE LA GRILLA: Contador y Ordenar por */}
          <div className="hidden lg:flex items-center justify-between py-2 px-1">
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Mostrando <span className="text-gray-900 dark:text-white font-extrabold">{filteredProducts.length}</span> de <span className="text-gray-900 dark:text-white font-extrabold">{products.length}</span> ofertas
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <span>Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-900 dark:text-white focus:ring-1 focus:ring-secondary focus:outline-hidden cursor-pointer"
              >
                <option value="discount_desc">Mayor descuento (%)</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="name_asc">Nombre A-Z</option>
              </select>
            </div>
          </div>

          {/* GRILLA DE PRODUCTOS EN OFERTA */}
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
              <p className="text-gray-700 dark:text-gray-300 font-semibold">Buscando las mejores ofertas...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 shadow-xs max-w-md mx-auto space-y-3">
              <Package className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-lg text-gray-900 dark:text-white font-bold">
                No se encontraron ofertas
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Prueba quitando algunos de los filtros seleccionados o busca con otro término.
              </p>
              {totalActiveFilters > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#dc2626] bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 px-4 py-2 rounded-xl transition-colors cursor-pointer mt-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer filtros</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => {
                const finalPrice = product.price - (product.price * (product.discount_percentage / 100));
                const ahorro = product.price - finalPrice;

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setModalQuantity(1);
                    }}
                    className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-red-200/80 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-red-400 dark:hover:border-red-900 transition-all duration-200 flex flex-col group cursor-pointer relative"
                  >
                    {/* Contenedor de Imagen */}
                    <div className="relative aspect-square w-full bg-gray-50 dark:bg-gray-800/40 p-3 sm:p-4 flex items-center justify-center overflow-hidden border-b border-gray-100 dark:border-gray-800">
                      {product.image_url_1 ? (
                        <img
                          src={optimizeImageUrl(product.image_url_1, 300)}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs font-semibold">Sin imagen</span>
                      )}

                      {/* Badge de Descuento Promocional */}
                      <div className="absolute top-2 right-2 bg-[#dc2626] text-white text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-md z-10 flex items-center gap-1 animate-pulse">
                        <Flame className="w-3 h-3 fill-white" />
                        <span>-{product.discount_percentage}% OFF</span>
                      </div>
                    </div>

                    {/* Contenido del Producto */}
                    <div className="p-3 sm:p-4 flex flex-col flex-1">
                      {product.category && (
                        <span className="text-[10px] sm:text-xs font-extrabold text-primary dark:text-blue-400 uppercase tracking-wider mb-1 line-clamp-1">
                          {product.category}
                        </span>
                      )}

                      <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug mb-1 group-hover:text-secondary transition-colors">
                        {product.name}
                      </h3>

                      {product.description && (
                        <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 flex-1">
                          {product.description}
                        </p>
                      )}

                      {/* Badge de Ahorro */}
                      <div className="hidden sm:block bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 px-2 py-1 rounded-lg my-1 text-[11px] text-red-800 dark:text-red-300 font-semibold">
                        Ahorras: <span className="font-black">${ahorro.toFixed(2)}</span> por un.
                      </div>

                      {/* Precios */}
                      <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-base sm:text-xl font-black text-[#dc2626]">
                            ${finalPrice.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            ${product.price.toFixed(2)}
                          </span>
                        </div>
                        {product.wholesale_price && Number(product.wholesale_price) > 0 && (
                          <div className="mb-2">
                            <span className="inline-block bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Mayorista x{product.wholesale_min_qty || 6}+: ${Number(product.wholesale_price).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Botón de Agregar */}
                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(product, e, 1)}
                          className="w-full bg-[#dc2626] hover:bg-red-700 text-white py-1.5 sm:py-2 px-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-sm transition-all active:scale-98 cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* DRAWER / MODAL LATERAL DE FILTROS PARA MÓVILES (< lg) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Fondo oscuro atenuado */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xs bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
              {/* Cabecera del drawer */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#dc2626]" />
                  <span className="font-extrabold text-base text-gray-900 dark:text-white">
                    Filtros de Ofertas
                  </span>
                  {totalActiveFilters > 0 && (
                    <span className="text-[11px] font-black bg-[#dc2626] text-white px-2 py-0.5 rounded-full">
                      {totalActiveFilters}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido scrolleable de filtros */}
              <div className="flex-1 overflow-y-auto p-4">
                {FilterSidebarContent}
              </div>

              {/* Pie con botón de aplicar */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
                {totalActiveFilters > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex-1 bg-[#dc2626] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                >
                  Ver {filteredProducts.length} ofertas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES DEL PRODUCTO */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full flex flex-col md:flex-row relative border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 z-10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Imagen del Producto en Modal */}
            <div className="w-full md:w-1/2 bg-gray-50 dark:bg-gray-800/60 p-6 flex items-center justify-center relative min-h-[240px]">
              {selectedProduct.image_url_1 ? (
                <img
                  src={optimizeImageUrl(selectedProduct.image_url_1, 500)}
                  alt={selectedProduct.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain max-h-[280px]"
                />
              ) : (
                <span className="text-gray-400 font-medium">Sin imagen</span>
              )}
              <div className="absolute top-4 left-4 bg-[#dc2626] text-white text-xs font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-white" />
                <span>-{selectedProduct.discount_percentage}% OFF</span>
              </div>
            </div>

            {/* Info y Selector de Cantidad */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold text-primary dark:text-blue-400 uppercase tracking-wider mb-1 block">
                  {selectedProduct.category || 'General'}
                </span>
                <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white mb-2">
                  {selectedProduct.name}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  {selectedProduct.description || 'Sin descripción detallada disponible.'}
                </p>

                <div className="flex items-baseline gap-2.5 mb-4">
                  <span className="text-2xl font-black text-[#dc2626]">
                    $
                    {(
                      selectedProduct.price -
                      (selectedProduct.discount_percentage > 0
                        ? selectedProduct.price * (selectedProduct.discount_percentage / 100)
                        : 0)
                    ).toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    ${selectedProduct.price.toFixed(2)}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      selectedProduct.stock > 10
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    Stock: {selectedProduct.stock}
                  </span>
                </div>

                {selectedProduct.wholesale_price && Number(selectedProduct.wholesale_price) > 0 && (
                  <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-semibold">
                    <span>⚡ Precio Mayorista (llevando {selectedProduct.wholesale_min_qty || 6}+ u.):</span>
                    <span className="font-extrabold text-sm">${Number(selectedProduct.wholesale_price).toFixed(2)} c/u</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Cantidad:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                      disabled={modalQuantity <= 1}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-all cursor-pointer font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-black text-sm w-7 text-center text-gray-900 dark:text-white">
                      {modalQuantity}
                    </span>
                    <button
                      onClick={() => setModalQuantity(Math.min(selectedProduct.stock || 999, modalQuantity + 1))}
                      disabled={modalQuantity >= (selectedProduct.stock || 999)}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-all cursor-pointer font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleAddToCart(selectedProduct, undefined, modalQuantity);
                    setSelectedProduct(null);
                  }}
                  className="w-full bg-[#dc2626] hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer text-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Agregar {modalQuantity > 1 ? `(${modalQuantity})` : ''} al Carrito</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OfertasPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300 font-semibold">Cargando mejores ofertas...</p>
        </div>
      }
    >
      <OfertasContent />
    </Suspense>
  );
}
