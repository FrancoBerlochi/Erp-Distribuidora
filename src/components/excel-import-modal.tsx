/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useMemo } from 'react';
import type { WorkBook } from 'xlsx';
import { supabase } from '@/lib/supabase';
import { invalidateProductsCache } from '@/lib/products-cache';
import { toast } from 'react-toastify';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Percent,
  Check,
  Tag,
  Barcode,
  DollarSign,
  Package,
  Layers,
  FileText
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export type SystemField = 
  | 'name'
  | 'barcode'
  | 'price'
  | 'cost_price'
  | 'wholesale_price'
  | 'wholesale_min_qty'
  | 'stock'
  | 'category'
  | 'description'
  | 'discount_percentage';

interface FieldConfig {
  key: SystemField;
  label: string;
  required: boolean;
  icon: any;
  description: string;
  synonyms: string[];
}

const SYSTEM_FIELDS: FieldConfig[] = [
  {
    key: 'name',
    label: 'Nombre del Producto',
    required: true,
    icon: Tag,
    description: 'Nombre o título principal del artículo.',
    synonyms: ['nombre', 'producto', 'articulo', 'descripcion', 'name', 'item', 'detalle', 'titulo', 'prod', 'denominacion', 'concepto'],
  },
  {
    key: 'barcode',
    label: 'Código de Barras / EAN / SKU',
    required: false,
    icon: Barcode,
    description: 'Identificador único para actualizar precios y stock sin duplicar.',
    synonyms: ['codigo', 'cod', 'barcode', 'codigobarra', 'cod_barra', 'ean', 'ean13', 'upc', 'art', 'articulo_id', 'sku', 'ref', 'referencia', 'cod_art'],
  },
  {
    key: 'price',
    label: 'Precio de Venta al Público ($)',
    required: false,
    icon: DollarSign,
    description: 'Precio final de venta. Si se omite, puede calcularse sumando margen al costo.',
    synonyms: ['precio', 'price', 'pvp', 'p.pub', 'ppub', 'publico', 'venta', 'p.venta', 'pventa', 'final', 'precio_venta', 'precio_publico', 'precio_lista', 'lista', 'importe', 'p.publico'],
  },
  {
    key: 'wholesale_price',
    label: 'Precio Mayorista ($)',
    required: false,
    icon: DollarSign,
    description: 'Precio especial para compras mayoristas o bulto cerrado.',
    synonyms: ['mayorista', 'precio_mayorista', 'pmayorista', 'p.mayorista', 'may', 'p_may', 'mayor', 'precio_mayor', 'bulto', 'xmayor', 'precio_bulto'],
  },
  {
    key: 'wholesale_min_qty',
    label: 'Mínimo Unidades Mayorista',
    required: false,
    icon: Package,
    description: 'Cantidad mínima para acceder al precio mayorista (por defecto 6 u.).',
    synonyms: ['minimo_mayorista', 'min_mayorista', 'cant_mayorista', 'min_mayor', 'bulto_cerrado', 'min_bulto', 'min_qty', 'min_unidades'],
  },
  {
    key: 'cost_price',
    label: 'Precio de Costo ($)',
    required: false,
    icon: DollarSign,
    description: 'Costo neto de compra del proveedor.',
    synonyms: ['costo', 'cost', 'precio_costo', 'pcosto', 'p.costo', 'neto', 'neto_iva', 'compra', 'precio_compra', 'pcompra', 'p.compra', 'costo_neto', 'subtotal'],
  },
  {
    key: 'stock',
    label: 'Stock Actual (Unidades)',
    required: false,
    icon: Package,
    description: 'Cantidad física disponible en el almacén.',
    synonyms: ['stock', 'cant', 'cantidad', 'unidades', 'cant.', 'existencia', 'saldo', 'inventario', 'disponible', 'qty', 'quantity'],
  },
  {
    key: 'category',
    label: 'Categoría / Rubro',
    required: false,
    icon: Layers,
    description: 'Rubro del producto (Bebidas, Almacén, Limpieza, etc.).',
    synonyms: ['categoria', 'category', 'rubro', 'familia', 'seccion', 'grupo', 'linea', 'depto', 'departamento'],
  },
  {
    key: 'description',
    label: 'Descripción / Presentación',
    required: false,
    icon: FileText,
    description: 'Detalle ampliado, tamaño o notas del artículo.',
    synonyms: ['descripcion', 'description', 'detalle', 'observaciones', 'presentacion', 'info', 'notas', 'desc'],
  },
  {
    key: 'discount_percentage',
    label: 'Descuento Promocional (%)',
    required: false,
    icon: Percent,
    description: 'Porcentaje de descuento para ofertas.',
    synonyms: ['descuento', 'discount', 'dto', 'dto.', '% dto', 'descuento_porcentaje', '% descuento', 'rebaja', 'bonificacion'],
  },
];

export default function ExcelImportModal({
  isOpen,
  onClose,
  onSuccess,
}: ExcelImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'processing' | 'summary'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);

  const [columnMapping, setColumnMapping] = useState<Record<SystemField, string>>({
    name: '',
    barcode: '',
    price: '',
    cost_price: '',
    wholesale_price: '',
    wholesale_min_qty: '',
    stock: '',
    category: '',
    description: '',
    discount_percentage: '',
  });

  const [operationMode, setOperationMode] = useState<'upsert' | 'update_only' | 'insert_only'>('upsert');
  const [matchMode, setMatchMode] = useState<'barcode_or_name' | 'barcode_only' | 'name_only'>('barcode_or_name');

  const [applyMargin, setApplyMargin] = useState(false);
  const [marginPercent, setMarginPercent] = useState<number>(30);
  const [marginCondition, setMarginCondition] = useState<'if_empty' | 'always'>('if_empty');
  const [roundTo, setRoundTo] = useState<'none' | '10' | '50' | '100'>('10');

  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [importSummary, setImportSummary] = useState<{
    total: number;
    updated: number;
    inserted: number;
    skipped: number;
    errors: string[];
  }>({ total: 0, updated: 0, inserted: 0, skipped: 0, errors: [] });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeKey = (key: string) => {
    return String(key || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const cleanNumber = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let str = String(val).trim().replace(/[$€\s]/g, '');
    if (!str) return 0;

    if (str.includes(',') && str.includes('.')) {
      const lastComma = str.lastIndexOf(',');
      const lastDot = str.lastIndexOf('.');
      if (lastDot < lastComma) {
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      const parts = str.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        str = str.replace(',', '.');
      } else {
        str = str.replace(',', '.');
      }
    }

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const roundPrice = (price: number): number => {
    if (roundTo === '10') return Math.round(price / 10) * 10;
    if (roundTo === '50') return Math.round(price / 50) * 50;
    if (roundTo === '100') return Math.round(price / 100) * 100;
    return Math.round(price * 100) / 100;
  };

  const autoDetectMapping = (headers: string[]): Record<SystemField, string> => {
    const newMapping: Record<SystemField, string> = {
      name: '',
      barcode: '',
      price: '',
      cost_price: '',
      wholesale_price: '',
      wholesale_min_qty: '',
      stock: '',
      category: '',
      description: '',
      discount_percentage: '',
    };

    const assignedHeaders = new Set<string>();

    SYSTEM_FIELDS.forEach((sysField) => {
      let bestMatch = '';
      let bestScore = 0;

      for (const header of headers) {
        if (assignedHeaders.has(header)) continue;
        const normHeader = normalizeKey(header);

        for (const synonym of sysField.synonyms) {
          const normSyn = normalizeKey(synonym);
          if (normHeader === normSyn) {
            if (bestScore < 100) {
              bestScore = 100;
              bestMatch = header;
            }
          } else if (normHeader.startsWith(normSyn) || normHeader.includes(normSyn)) {
            if (bestScore < 50) {
              bestScore = 50;
              bestMatch = header;
            }
          }
        }
      }

      if (bestMatch) {
        newMapping[sysField.key] = bestMatch;
        assignedHeaders.add(bestMatch);
      }
    });

    if (!newMapping.name && newMapping.description) {
      newMapping.name = newMapping.description;
      newMapping.description = '';
    }

    return newMapping;
  };

  const handleFileUpload = async (uploadedFile: File) => {
    try {
      const XLSX = await import('xlsx');
      const buffer = await uploadedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        throw new Error('El archivo Excel no contiene hojas de cálculo.');
      }

      setFile(uploadedFile);
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      const initialSheet = wb.SheetNames[0];
      setSelectedSheet(initialSheet);

      await loadSheetData(wb, initialSheet);
      setStep('mapping');
    } catch (err: any) {
      console.error('Error al procesar archivo:', err);
      toast.error(err.message || 'Error al leer el archivo Excel.');
    }
  };

  const loadSheetData = async (wb: WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const XLSX = await import('xlsx');
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (rows.length === 0) {
      toast.warn('La hoja seleccionada está vacía.');
      setRawRows([]);
      setAvailableHeaders([]);
      return;
    }

    const headers = Object.keys(rows[0] || {}).filter((h) => h && !h.startsWith('__EMPTY'));
    setRawRows(rows);
    setAvailableHeaders(headers);

    const detected = autoDetectMapping(headers);
    setColumnMapping(detected);
  };

  const handleSheetChange = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      await loadSheetData(workbook, sheetName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const resolveProductFromRow = (row: Record<string, any>) => {
    const rawName = columnMapping.name ? String(row[columnMapping.name] || '').trim() : '';
    const rawBarcode = columnMapping.barcode ? String(row[columnMapping.barcode] || '').trim() : '';
    const rawCategory = columnMapping.category ? String(row[columnMapping.category] || '').trim() : 'Almacén';
    const rawDesc = columnMapping.description ? String(row[columnMapping.description] || '').trim() : '';

    const rawCost = columnMapping.cost_price ? cleanNumber(row[columnMapping.cost_price]) : 0;
    let finalPrice = columnMapping.price ? cleanNumber(row[columnMapping.price]) : 0;

    if (applyMargin && rawCost > 0) {
      const calculatedMarginPrice = roundPrice(rawCost * (1 + marginPercent / 100));
      if (marginCondition === 'always' || (marginCondition === 'if_empty' && finalPrice <= 0)) {
        finalPrice = calculatedMarginPrice;
      }
    }

    const rawStock = columnMapping.stock ? Math.max(0, Math.floor(cleanNumber(row[columnMapping.stock]))) : 10;
    const rawDiscount = columnMapping.discount_percentage ? Math.min(100, Math.max(0, cleanNumber(row[columnMapping.discount_percentage]))) : 0;
    const rawWholesalePrice = columnMapping.wholesale_price ? cleanNumber(row[columnMapping.wholesale_price]) : null;
    const rawWholesaleMinQty = columnMapping.wholesale_min_qty ? Math.max(1, Math.floor(cleanNumber(row[columnMapping.wholesale_min_qty]))) : null;

    const isValid = rawName.length > 0 && finalPrice > 0;
    let reason = '';
    if (!rawName) reason = 'Falta Nombre';
    else if (finalPrice <= 0) reason = 'Precio debe ser > 0';

    return {
      name: rawName,
      barcode: rawBarcode || null,
      price: finalPrice,
      cost_price: rawCost,
      wholesale_price: rawWholesalePrice && rawWholesalePrice > 0 ? rawWholesalePrice : null,
      wholesale_min_qty: rawWholesaleMinQty || 6,
      stock: rawStock,
      category: rawCategory || 'Almacén',
      description: rawDesc,
      discount_percentage: rawDiscount,
      isValid,
      reason,
    };
  };

  const previewRows = useMemo(() => {
    return rawRows.slice(0, 5).map((row, idx) => ({
      originalIndex: idx + 1,
      ...resolveProductFromRow(row),
    }));
  }, [rawRows, columnMapping, applyMargin, marginPercent, marginCondition, roundTo]);

  const handleExecuteImport = async () => {
    if (!columnMapping.name) {
      toast.warn('Debes asignar al menos la columna "Nombre del Producto".');
      return;
    }

    setStep('processing');
    setProgressPercent(5);
    setProgressStatus('Consultando productos existentes en la base de datos...');

    try {
      const { data: currentProducts, error: fetchErr } = await supabase
        .from('products')
        .select('id, name, barcode, price, cost_price, stock');

      if (fetchErr) throw fetchErr;

      const barcodeMap = new Map<string, any>();
      const nameMap = new Map<string, any>();

      (currentProducts || []).forEach((p) => {
        if (p.barcode) {
          barcodeMap.set(String(p.barcode).trim().toLowerCase(), p);
        }
        if (p.name) {
          nameMap.set(String(p.name).trim().toLowerCase(), p);
        }
      });

      setProgressPercent(15);
      setProgressStatus(`Analizando ${rawRows.length} registros del archivo...`);

      let updatedCount = 0;
      let insertedCount = 0;
      let skippedCount = 0;
      const errorList: string[] = [];

      const toUpdate: { id: string; fields: Record<string, any> }[] = [];
      const toInsert: Record<string, any>[] = [];

      rawRows.forEach((row, idx) => {
        const item = resolveProductFromRow(row);

        if (!item.isValid) {
          skippedCount++;
          if (idx < 5) errorList.push(`Fila #${idx + 1}: ${item.reason}`);
          return;
        }

        let matched: any = null;
        if (matchMode !== 'name_only' && item.barcode) {
          matched = barcodeMap.get(item.barcode.toLowerCase());
        }
        if (!matched && matchMode !== 'barcode_only' && item.name) {
          matched = nameMap.get(item.name.toLowerCase());
        }

        if (matched) {
          if (operationMode === 'insert_only') {
            skippedCount++;
            return;
          }

          const updateFields: Record<string, any> = {};
          if (columnMapping.price || applyMargin) updateFields.price = item.price;
          if (columnMapping.cost_price) updateFields.cost_price = item.cost_price;
          if (columnMapping.wholesale_price && item.wholesale_price != null) updateFields.wholesale_price = item.wholesale_price;
          if (columnMapping.wholesale_min_qty && item.wholesale_min_qty != null) updateFields.wholesale_min_qty = item.wholesale_min_qty;
          if (columnMapping.stock) updateFields.stock = item.stock;
          if (columnMapping.category && item.category) updateFields.category = item.category;
          if (columnMapping.description && item.description) updateFields.description = item.description;
          if (columnMapping.discount_percentage) updateFields.discount_percentage = item.discount_percentage;
          if (columnMapping.barcode && item.barcode && !matched.barcode) updateFields.barcode = item.barcode;

          toUpdate.push({ id: matched.id, fields: updateFields });
        } else {
          if (operationMode === 'update_only') {
            skippedCount++;
            return;
          }

          const insertRecord: Record<string, any> = {
            name: item.name,
            barcode: item.barcode,
            price: item.price,
            cost_price: item.cost_price,
            stock: item.stock,
            category: item.category,
            description: item.description,
            discount_percentage: item.discount_percentage,
            image_url_1: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
            image_url_2: null,
          };
          if (item.wholesale_price != null && item.wholesale_price > 0) {
            insertRecord.wholesale_price = item.wholesale_price;
            insertRecord.wholesale_min_qty = item.wholesale_min_qty || 6;
          }

          toInsert.push(insertRecord);
        }
      });

      const totalOperations = toUpdate.length + toInsert.length;
      let completedOps = 0;

      if (toUpdate.length > 0) {
        setProgressStatus(`Actualizando ${toUpdate.length} productos existentes...`);
        const updateBatchSize = 20;

        for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
          const batch = toUpdate.slice(i, i + updateBatchSize);
          await Promise.all(
            batch.map(async (u) => {
              let { error } = await supabase.from('products').update(u.fields).eq('id', u.id);
              if (error && error.code === '42703') {
                const safeFields = { ...u.fields };
                delete safeFields.wholesale_price;
                delete safeFields.wholesale_min_qty;
                const retry = await supabase.from('products').update(safeFields).eq('id', u.id);
                error = retry.error;
              }

              if (error) {
                console.error('Error actualizando producto', u.id, error);
              } else {
                updatedCount++;
              }
            })
          );

          completedOps += batch.length;
          const currentPct = 20 + Math.floor((completedOps / (totalOperations || 1)) * 70);
          setProgressPercent(Math.min(90, currentPct));
        }
      }

      if (toInsert.length > 0) {
        setProgressStatus(`Insertando ${toInsert.length} productos nuevos...`);
        const insertBatchSize = 50;

        for (let i = 0; i < toInsert.length; i += insertBatchSize) {
          const batch = toInsert.slice(i, i + insertBatchSize);
          let { error } = await supabase.from('products').insert(batch);
          if (error && error.code === '42703') {
            const safeBatch = batch.map((b) => {
              const copy = { ...b };
              delete copy.wholesale_price;
              delete copy.wholesale_min_qty;
              return copy;
            });
            const retry = await supabase.from('products').insert(safeBatch);
            error = retry.error;
          }

          if (error) {
            console.error('Error insertando lote de productos', error);
            errorList.push(`Error al insertar lote: ${error.message}`);
          } else {
            insertedCount += batch.length;
          }

          completedOps += batch.length;
          const currentPct = 20 + Math.floor((completedOps / (totalOperations || 1)) * 70);
          setProgressPercent(Math.min(95, currentPct));
        }
      }

      setProgressStatus('Sincronizando catálogo en tiempo real...');
      await invalidateProductsCache();
      setProgressPercent(100);

      setImportSummary({
        total: rawRows.length,
        updated: updatedCount,
        inserted: insertedCount,
        skipped: skippedCount,
        errors: errorList,
      });

      setStep('summary');
      toast.success(`¡Proceso completado! ${updatedCount} actualizados, ${insertedCount} creados.`);
      onSuccess();
    } catch (err: any) {
      console.error('Error en proceso masivo:', err);
      toast.error('Ocurrió un error durante la importación: ' + (err.message || 'Error de conexión'));
      setStep('mapping');
    }
  };

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const templateData = [
      {
        'CODIGO_EAN': '7791234567890',
        'ARTICULO': 'Coca Cola Original 2.25L',
        'RUBRO': 'Bebidas',
        'PRECIO_COSTO': 2100.00,
        'PRECIO_VENTA': 2850.00,
        'STOCK': 48,
        'DESCRIPCION': 'Gaseosa sabor cola descartable.',
        'DESCUENTO': 0,
      },
      {
        'CODIGO_EAN': '7799876543210',
        'ARTICULO': 'Detergente Magistral 500ml',
        'RUBRO': 'Limpieza',
        'PRECIO_COSTO': 1400.00,
        'PRECIO_VENTA': 1950.50,
        'STOCK': 120,
        'DESCRIPCION': 'Detergente lavavajilla concentrado.',
        'DESCUENTO': 10,
      },
      {
        'CODIGO_EAN': '7795556667778',
        'ARTICULO': 'Papas Fritas Clásicas 150g',
        'RUBRO': 'Snacks',
        'PRECIO_COSTO': 1050.00,
        'PRECIO_VENTA': 1490.00,
        'STOCK': 75,
        'DESCRIPCION': 'Snack crocante.',
        'DESCUENTO': 15,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'Lista_Precios');

    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 35 },
      { wch: 12 },
    ];

    XLSX.writeFile(wb, 'plantilla_lista_proveedor_distribuidora.xlsx');
  };

  const resetAll = () => {
    setStep('upload');
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setRawRows([]);
    setAvailableHeaders([]);
    setColumnMapping({
      name: '',
      barcode: '',
      price: '',
      cost_price: '',
      wholesale_price: '',
      wholesale_min_qty: '',
      stock: '',
      category: '',
      description: '',
      discount_percentage: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  Actualizador Inteligente de Catálogo
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" /> Auto-Mapeo
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sube la lista de cualquier proveedor sin importar sus nombres de columnas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={step === 'processing'}
            className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PASO 1: SUBIDA */}
        {step === 'upload' && (
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-1">
                  Arrastra y suelta tu lista de precios aquí, o <span className="text-emerald-600 dark:text-emerald-400 underline">explora</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Compatible con planillas de proveedores en formatos <strong>.xlsx, .xls y .csv</strong>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
              />
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-emerald-900 dark:text-emerald-300 text-center sm:text-left">
                <HelpCircle className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong>¿Cómo funciona?</strong> No necesitas formatear tu archivo. En el siguiente paso podrás elegir qué columna de tu Excel corresponde a cada dato y aplicar aumentos de margen directo.
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Descargar Plantilla Ejemplo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: MAPEO */}
        {step === 'mapping' && (
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white block">
                    {file?.name}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {rawRows.length} filas detectadas • {availableHeaders.length} columnas
                  </span>
                </div>
              </div>

              {sheetNames.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Hoja:</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-hidden"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={resetAll}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Cambiar archivo
              </button>
            </div>

            {/* Opciones de Operación */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setOperationMode('upsert')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  operationMode === 'upsert'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs">Actualizar y Crear</span>
                  {operationMode === 'upsert' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] opacity-80">
                  Actualiza existentes y agrega los productos nuevos que no estén en el catálogo.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOperationMode('update_only')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  operationMode === 'update_only'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/20'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs">Solo Actualizar</span>
                  {operationMode === 'update_only' && <Check className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-[11px] opacity-80">
                  Modifica únicamente precios y stock de productos que ya existen.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOperationMode('insert_only')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  operationMode === 'insert_only'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs">Solo Crear Nuevos</span>
                  {operationMode === 'insert_only' && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] opacity-80">
                  Agrega los artículos que no tengas, ignorando los que ya existen.
                </p>
              </button>
            </div>

            {/* Mapeador de Columnas */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs">
              <div className="bg-gray-100/70 dark:bg-gray-800/70 p-3 sm:px-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  Mapeo de Columnas (Tu Excel vs. Sistema)
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                  El sistema autodetectó las mejores coincidencias
                </span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {SYSTEM_FIELDS.map((field) => {
                  const Icon = field.icon;
                  const assignedHeader = columnMapping[field.key];
                  const sampleValue = assignedHeader && rawRows[0] ? rawRows[0][assignedHeader] : null;

                  return (
                    <div key={field.key} className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <div className="flex items-start gap-2.5 max-w-sm">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              {field.label}
                            </span>
                            {field.required ? (
                              <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase">
                                *Requerido
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">Opcional</span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 line-clamp-1">{field.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:w-1/2">
                        <select
                          value={assignedHeader}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          className={`w-full text-xs font-semibold rounded-xl px-3 py-2 border transition-all cursor-pointer ${
                            assignedHeader
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-gray-900 dark:text-white'
                              : field.required
                              ? 'bg-red-50/40 dark:bg-red-950/20 border-red-300 dark:border-red-900 text-gray-800 dark:text-gray-200'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
                          }`}
                        >
                          <option value="">-- No asignar / Omitir --</option>
                          {availableHeaders.map((hdr) => (
                            <option key={hdr} value={hdr}>
                              Columna: &quot;{hdr}&quot;
                            </option>
                          ))}
                        </select>

                        {assignedHeader && sampleValue !== null && sampleValue !== undefined && (
                          <div className="text-[10px] text-gray-400 font-mono truncate max-w-[180px] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md flex-shrink-0" title={String(sampleValue)}>
                            Ej: {String(sampleValue)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculadora de Margen sobre Costo */}
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                    <Percent className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 dark:text-white">
                      Calculadora de Margen de Ganancia sobre Costo
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Ideal si tu proveedor solo te envía precios de costo.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyMargin}
                    onChange={(e) => setApplyMargin(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {applyMargin && (
                <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                      Margen a Sumar (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={marginPercent}
                        onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-800 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white"
                      />
                      <Percent className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                      ¿Cuándo Aplicar?
                    </label>
                    <select
                      value={marginCondition}
                      onChange={(e) => setMarginCondition(e.target.value as any)}
                      className="w-full bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-900 dark:text-white"
                    >
                      <option value="if_empty">Solo si no hay Precio de Venta</option>
                      <option value="always">Siempre (Recalcular todos)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                      Redondeo Comercial
                    </label>
                    <select
                      value={roundTo}
                      onChange={(e) => setRoundTo(e.target.value as any)}
                      className="w-full bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-900 dark:text-white"
                    >
                      <option value="10">A $10 (Ej: $1.243 -&gt; $1.240)</option>
                      <option value="50">A $50 (Ej: $1.234 -&gt; $1.250)</option>
                      <option value="100">A $100 (Ej: $1.240 -&gt; $1.200)</option>
                      <option value="none">Sin Redondeo (Exacto)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Previsualización en Vivo */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs">
              <div className="bg-gray-100/70 dark:bg-gray-800/70 p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  Previsualización en Vivo (Muestra de las primeras 5 filas)
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {previewRows.filter((r) => r.isValid).length} de {previewRows.length} válidos
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                    <tr>
                      <th className="p-2.5 w-10">#</th>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Producto</th>
                      <th className="p-2.5">Costo</th>
                      <th className="p-2.5">Precio Venta</th>
                      <th className="p-2.5">Stock</th>
                      <th className="p-2.5">Categoría</th>
                      <th className="p-2.5 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {previewRows.map((r) => (
                      <tr key={r.originalIndex} className={!r.isValid ? 'bg-red-50/30 dark:bg-red-950/20' : ''}>
                        <td className="p-2.5 font-mono text-gray-400">{r.originalIndex}</td>
                        <td className="p-2.5 font-mono text-gray-500 dark:text-gray-400">
                          {r.barcode || '—'}
                        </td>
                        <td className="p-2.5 font-bold text-gray-900 dark:text-white max-w-[200px] truncate">
                          {r.name || <span className="text-red-500 font-normal italic">Sin nombre</span>}
                        </td>
                        <td className="p-2.5 font-mono text-gray-600 dark:text-gray-400">
                          {r.cost_price > 0 ? `$${r.cost_price.toFixed(2)}` : '—'}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ${r.price.toFixed(2)}
                        </td>
                        <td className="p-2.5 font-mono">{r.stock} u.</td>
                        <td className="p-2.5">
                          <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                            {r.category}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold">
                          {r.isValid ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Listo
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 text-[10px] inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> {r.reason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: PROCESAMIENTO */}
        {step === 'processing' && (
          <div className="p-10 sm:p-16 flex flex-col items-center justify-center text-center space-y-6 flex-1">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-pulse">
                <RefreshCw className="w-10 h-10 animate-spin" />
              </div>
            </div>

            <div className="space-y-2 max-w-md w-full">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Sincronizando Catálogo...
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {progressStatus}
              </p>

              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden mt-4 border border-gray-200 dark:border-gray-700">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-gray-400 block pt-1">
                {progressPercent}% completado
              </span>
            </div>
          </div>
        )}

        {/* PASO 4: RESUMEN */}
        {step === 'summary' && (
          <div className="p-6 sm:p-10 overflow-y-auto flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-900 dark:text-white">
                ¡Actualización Masiva Exitosa!
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tu catálogo y precios están sincronizados y vigentes tanto en el POS como en la tienda web.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Filas</span>
                <span className="text-lg font-black text-gray-900 dark:text-white font-mono">{importSummary.total}</span>
              </div>
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Actualizados</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">{importSummary.updated}</span>
              </div>
              <div className="bg-blue-50/70 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800 text-center">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block">Creados Nuevos</span>
                <span className="text-lg font-black text-blue-700 dark:text-blue-300 font-mono">{importSummary.inserted}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Omitidos / Error</span>
                <span className="text-lg font-black text-gray-600 dark:text-gray-400 font-mono">{importSummary.skipped}</span>
              </div>
            </div>

            {importSummary.errors.length > 0 && (
              <div className="w-full max-w-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3.5 text-left text-xs space-y-1 text-amber-900 dark:text-amber-200">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Notas del proceso:
                </span>
                <ul className="list-disc list-inside text-[11px] opacity-90">
                  {importSummary.errors.slice(0, 4).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0 bg-gray-50/50 dark:bg-gray-900">
          {step === 'mapping' ? (
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {step !== 'summary' && step !== 'processing' && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}

            {step === 'mapping' && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={!columnMapping.name}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all disabled:opacity-40 cursor-pointer"
              >
                <span>Procesar {rawRows.length} Registros</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 'summary' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  resetAll();
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Ver Catálogo Actualizado</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
