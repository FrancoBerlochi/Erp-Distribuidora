/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCartStore } from '@/lib/store';
import { useProducts, optimizeImageUrl } from '@/lib/products-cache';
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
  Sparkles
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

const OFFER_FILTERS = [
  { id: 'any_discount', label: 'Todas las Ofertas', check: (p: any) => p.discount_percentage > 0 },
  { id: 'high_discount', label: '20% OFF o más', check: (p: any) => p.discount_percentage >= 20 },
  { id: 'mid_discount', label: '10% a 19% OFF', check: (p: any) => p.discount_percentage >= 10 && p.discount_percentage < 20 },
];

function CatalogoContent() {
  const { products, loading } = useProducts();
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get('categoria');

  // Estados de Selección Múltiple
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('featured');

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
        ? `🛒 ${qty}x ${product.name} agregados al carrito!`
        : `🛒 ${product.name} agregado al carrito!`
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

      // 2. Filtro Múltiple de Categorías (OR dentro de categorías)
      if (selectedCategories.length > 0) {
        const prodCat = (p.category || 'Sin Categoría').trim().toLowerCase();
        const matchCat = selectedCategories.some(
          (c) => c.trim().toLowerCase() === prodCat
        );
        if (!matchCat) return false;
      }

      // 3. Filtro Múltiple de Marcas (OR dentro de marcas)
      if (selectedBrands.length > 0) {
        const detected = detectBrand(p.name);
        if (!detected || !selectedBrands.includes(detected)) return false;
      }

      // 4. Filtro Múltiple de Ofertas
      if (selectedOffers.length > 0) {
        const matchOffer = selectedOffers.some((offerId) => {
          const filterDef = OFFER_FILTERS.find((f) => f.id === offerId);
          return filterDef ? filterDef.check(p) : true;
        });
        if (!matchOffer) return false;
      }

      // 5. Filtro Múltiple de Rango de Precio
      if (selectedPriceRanges.length > 0) {
        const price = p.discount_percentage > 0
          ? p.price - p.price * (p.discount_percentage / 100)
          : p.price;

        const matchRange = selectedPriceRanges.some((rangeId) => {
          const rangeDef = PRICE_RANGES.find((r) => r.id === rangeId);
          if (!rangeDef) return true;
          return price >= rangeDef.min && price <= rangeDef.max;
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
    if (sortBy === 'price_asc') {
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
    } else if (sortBy === 'discount_desc') {
      result.sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [
    products,
    searchQuery,
    selectedCategories,
    selectedBrands,
    selectedOffers,
    selectedPriceRanges,
    onlyInStock,
    sortBy,
  ]);

  // Alternadores de selección múltiple
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

  const toggleOffer = (offerId: string) => {
    setSelectedOffers((prev) =>
      prev.includes(offerId)
        ? prev.filter((o) => o !== offerId)
        : [...prev, offerId]
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
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedOffers([]);
    setSelectedPriceRanges([]);
    setOnlyInStock(false);
    setSearchQuery('');
    setBrandSearch('');
  };

  const totalActiveFilters =
    selectedCategories.length +
    selectedBrands.length +
    selectedOffers.length +
    selectedPriceRanges.length +
    (onlyInStock ? 1 : 0) +
    (searchQuery ? 1 : 0);

  // Componente de Panel de Filtros (Reutilizado en Desktop Sidebar y en Mobile Drawer)
  const FilterSidebarContent = (
    <div className="space-y-6 text-sm">
      {/* Encabezado del Panel de Filtros */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
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

      {/* 1. GRUPO: CATEGORÍA (MÚLTIPLE) */}
      <div className="space-y-2.5">
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
                {/* Conteo resaltado en rojo estilo Coto */}
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

      {/* 2. GRUPO: MARCA (MÚLTIPLE) */}
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

      {/* 3. GRUPO: OFERTAS (MÚLTIPLE) */}
      <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-secondary fill-secondary" />
          <span>Ofertas y Descuentos</span>
        </h3>
        <div className="space-y-1 pl-1">
          {OFFER_FILTERS.map((offer) => {
            const count = products.filter(offer.check).length;
            const isChecked = selectedOffers.includes(offer.id);

            return (
              <label
                key={offer.id}
                onClick={() => toggleOffer(offer.id)}
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
                  <span className="truncate text-xs sm:text-sm">{offer.label}</span>
                </div>
                <span className="font-black text-[#dc2626] dark:text-red-400 text-xs shrink-0 ml-1">
                  ({count})
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 4. GRUPO: RANGO DE PRECIO (MÚLTIPLE) */}
      <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
          Rango de Precio
        </h3>
        <div className="space-y-1 pl-1">
          {PRICE_RANGES.map((range) => {
            const count = products.filter((p) => {
              const price = p.discount_percentage > 0
                ? p.price - p.price * (p.discount_percentage / 100)
                : p.price;
              return price >= range.min && price <= range.max;
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
      {/* Cabecera / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            <Link href="/" className="hover:text-primary flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-bold">Productos</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            Nuestros Productos
            {!loading && (
              <span className="text-xs bg-blue-50 dark:bg-blue-950/60 text-primary dark:text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                {filteredProducts.length} productos
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Explora todos nuestros productos con precios mayoristas y minoristas actualizados.
          </p>
        </div>

        {/* Buscador de productos rápido */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full px-4 py-2 w-full sm:w-80 shadow-xs">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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
            <option value="featured">Relevancia</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
            <option value="discount_desc">Mayor descuento</option>
            <option value="name_asc">Nombre A-Z</option>
          </select>
        </div>
      </div>

      {/* ESTRUCTURA PRINCIPAL DE 2 COLUMNAS (Sidebar lateral + Grilla de productos) */}
      <div className="flex items-start gap-8">
        {/* SIDEBAR LATERAL DESKTOP (Inspirada en Coto Digital con estilo propio) */}
        <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs max-h-[calc(100vh-6rem)] overflow-y-auto">
          {FilterSidebarContent}
        </aside>

        {/* COLUMNA CENTRAL / DERECHA: BARRA DE SELECCIÓN ACTIVA + GRILLA */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* BARRA: "Su selección:" (Estilo exacto de la imagen del usuario con tags interactivos) */}
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

              {/* Chips / Píldoras de Filtros Activos con '✕' para remover cada uno */}
              <div className="flex flex-wrap items-center gap-2">
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

                {/* Ofertas activas */}
                {selectedOffers.map((offerId) => {
                  const offerDef = OFFER_FILTERS.find((f) => f.id === offerId);
                  return (
                    <span
                      key={`chip-offer-${offerId}`}
                      className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-950/50 text-secondary border border-red-200 dark:border-red-900/60 text-xs font-extrabold px-3 py-1 rounded-full shadow-2xs"
                    >
                      <Flame className="w-3 h-3 fill-secondary" />
                      <span>{offerDef?.label || 'Oferta'}</span>
                      <button
                        type="button"
                        onClick={() => toggleOffer(offerId)}
                        className="hover:bg-red-200 dark:hover:bg-red-900/80 rounded-full p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

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

                {/* Stock solo activo */}
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

                {/* Texto de búsqueda activo */}
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
              Mostrando <span className="text-gray-900 dark:text-white font-extrabold">{filteredProducts.length}</span> de <span className="text-gray-900 dark:text-white font-extrabold">{products.length}</span> productos
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <span>Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-900 dark:text-white focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer"
              >
                <option value="featured">Más relevantes</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="discount_desc">Mayor descuento (%)</option>
                <option value="name_asc">Nombre A-Z</option>
              </select>
            </div>
          </div>

          {/* GRILLA DE PRODUCTOS */}
          {loading && products.length === 0 ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-700 dark:text-gray-300 font-semibold">Cargando productos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 shadow-xs max-w-md mx-auto space-y-3">
              <Package className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-lg text-gray-900 dark:text-white font-bold">
                No se encontraron productos
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Prueba quitando algunos de los filtros seleccionados o busca con otro término.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Limpiar todos los filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-5">
              {filteredProducts.map((product) => {
                const hasDiscount = product.discount_percentage > 0;
                const finalPrice = hasDiscount
                  ? product.price - product.price * (product.discount_percentage / 100)
                  : product.price;

                const detected = detectBrand(product.name);

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setModalQuantity(1);
                    }}
                    className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-all flex flex-col h-full cursor-pointer group hover:-translate-y-1"
                  >
                    <div className="h-36 sm:h-52 w-full bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center relative p-2.5 sm:p-5 border-b border-gray-100 dark:border-gray-800">
                      {product.image_url_1 ? (
                        <img
                          src={optimizeImageUrl(product.image_url_1, 400)}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs sm:text-sm font-medium">Sin imagen</span>
                      )}

                      {/* Badge de Descuento con color rojo destacado */}
                      {hasDiscount && (
                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-secondary text-white text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-md z-10">
                          -{product.discount_percentage}% OFF
                        </div>
                      )}
                    </div>

                    <div className="p-3 sm:p-4 flex flex-col flex-1">
                      {/* Categoría y Marca si aplica */}
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        {product.category && product.category !== 'Sin Categoría' && (
                          <span className="text-[10px] sm:text-xs text-primary dark:text-blue-400 font-extrabold uppercase tracking-wider line-clamp-1">
                            {product.category}
                          </span>
                        )}
                        {detected && (
                          <>
                            <span className="text-[10px] text-gray-300 dark:text-gray-600">•</span>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                              {detected}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="font-bold text-xs sm:text-sm md:text-base text-gray-900 dark:text-white leading-tight line-clamp-2 mb-1">
                        {product.name}
                      </h3>

                      <p className="hidden sm:block text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 flex-1">
                        {product.description}
                      </p>

                      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mt-auto pt-2.5 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div>
                          {hasDiscount && (
                            <p className="text-[10px] sm:text-xs text-gray-400 line-through">
                              ${product.price.toFixed(2)}
                            </p>
                          )}
                          <p className="text-sm sm:text-lg font-black text-primary dark:text-blue-400 leading-none">
                            ${finalPrice.toFixed(2)}
                          </p>
                          {product.wholesale_price && Number(product.wholesale_price) > 0 && (
                            <span className="inline-block mt-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              x{product.wholesale_min_qty || 6}+: ${Number(product.wholesale_price).toFixed(2)}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(product, e)}
                          className="w-full sm:w-auto bg-gray-900 hover:bg-primary dark:bg-primary dark:hover:bg-primary/90 text-white py-1.5 px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 sm:hidden" />
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

      {/* DRAWER MÓVIL DE FILTROS (Off-Canvas con animación) */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
          />

          {/* Panel Deslizable */}
          <div className="relative ml-auto w-full max-w-xs bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Header del Drawer */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
              <span className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#dc2626]" />
                Filtros de Productos
              </span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-4 overflow-y-auto flex-1">
              {FilterSidebarContent}
            </div>

            {/* Footer fijo con botón aplicar */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/80 flex items-center gap-3 flex-shrink-0">
              {totalActiveFilters > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-3 py-2 text-xs font-bold text-[#dc2626] hover:underline"
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md"
              >
                Ver {filteredProducts.length} productos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Producto */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col md:flex-row relative border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 z-10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Columna de Imagen */}
            <div className="md:w-1/2 bg-gray-50 dark:bg-gray-900/60 p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800 min-h-[250px] md:min-h-[400px]">
              {selectedProduct.image_url_1 ? (
                <img
                  src={optimizeImageUrl(selectedProduct.image_url_1, 600)}
                  alt={selectedProduct.name}
                  className="max-h-[300px] md:max-h-[380px] w-auto object-contain drop-shadow-md"
                />
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <Package className="w-12 h-12 mb-2" />
                  <span>Sin imagen</span>
                </div>
              )}
              {selectedProduct.discount_percentage > 0 && (
                <div className="absolute top-4 left-4 bg-secondary text-white font-black text-xs px-3 py-1.5 rounded-full shadow-md">
                  -{selectedProduct.discount_percentage}% OFF
                </div>
              )}
            </div>

            {/* Columna de Detalles */}
            <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold text-primary dark:text-blue-400 uppercase tracking-wider mb-2 block">
                  {selectedProduct.category || 'General'}
                </span>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-3">
                  {selectedProduct.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {selectedProduct.description || 'Sin descripción detallada disponible.'}
                </p>

                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-2xl md:text-3xl font-black text-primary dark:text-blue-400">
                    $
                    {(
                      selectedProduct.price -
                      (selectedProduct.discount_percentage > 0
                        ? selectedProduct.price * (selectedProduct.discount_percentage / 100)
                        : 0)
                    ).toFixed(2)}
                  </span>
                  {selectedProduct.discount_percentage > 0 && (
                    <span className="text-base text-gray-400 line-through">
                      ${selectedProduct.price.toFixed(2)}
                    </span>
                  )}
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      selectedProduct.stock > 10
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    Stock: {selectedProduct.stock}
                  </span>
                </div>

                {selectedProduct.wholesale_price && Number(selectedProduct.wholesale_price) > 0 && (
                  <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-semibold">
                    <span>⚡ Precio Mayorista (llevando {selectedProduct.wholesale_min_qty || 6}+ u.):</span>
                    <span className="font-extrabold text-sm">${Number(selectedProduct.wholesale_price).toFixed(2)} c/u</span>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Cantidad:</span>
                  <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800">
                    <button
                      onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 font-bold text-sm text-gray-900 dark:text-white">
                      {modalQuantity}
                    </span>
                    <button
                      onClick={() => setModalQuantity(Math.min(selectedProduct.stock || 999, modalQuantity + 1))}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleAddToCart(selectedProduct, undefined, modalQuantity);
                    setSelectedProduct(null);
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Agregar {modalQuantity} al carrito</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300 font-semibold">Cargando productos...</p>
        </div>
      }
    >
      <CatalogoContent />
    </Suspense>
  );
}
