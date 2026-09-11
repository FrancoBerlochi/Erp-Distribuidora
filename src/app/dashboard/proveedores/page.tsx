/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Search, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Mail, 
  MapPin, 
  Edit3, 
  Trash2, 
  Send, 
  FileSpreadsheet, 
  Package, 
  Boxes, 
  DollarSign, 
  ArrowDownToLine, 
  Check, 
  X, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  ListOrdered
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAdminProducts } from '@/lib/products-cache';
import { 
  getSuppliers, 
  saveSupplier, 
  deleteSupplier, 
  getPurchaseOrders, 
  createPurchaseOrder, 
  receivePurchaseOrder,
  generateRestockWhatsAppUrl,
  exportRestockToExcel,
  DEFAULT_SUPPLIERS
} from '@/lib/suppliers-service';
import { Supplier, PurchaseOrder, RestockOrderItem } from '@/lib/pos-types';

export default function ProveedoresPage() {
  const { products, loading: loadingProducts, mutate: mutateProducts } = useAdminProducts();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proveedores' | 'stock_critico' | 'nuevo_pedido' | 'ordenes'>('stock_critico');

  // Filtros
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchCritical, setSearchCritical] = useState('');
  const [criticalFilter, setCriticalFilter] = useState<'all' | 'out_of_stock' | 'low_stock'>('all');
  const [ordersFilter, setOrdersFilter] = useState<'all' | 'pending' | 'received'>('all');

  // Selección de artículos críticos para reposición
  const [selectedCriticalIds, setSelectedCriticalIds] = useState<Record<string, boolean>>({});

  // Formulario / Modal de Proveedor
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Partial<Supplier> | null>(null);
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Estado del Constructor de Pedido
  const [orderSupplierId, setOrderSupplierId] = useState<string>('');
  const [orderItems, setOrderItems] = useState<RestockOrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  // Modal de Recepción de Mercadería
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(null);
  const [receivePayload, setReceivePayload] = useState<{ [productId: string]: { received_qty: number; new_cost: number } }>({});
  const [processingReceive, setProcessingReceive] = useState(false);

  // Carga de datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [sups, ords] = await Promise.all([
        getSuppliers(),
        getPurchaseOrders(),
      ]);
      setSuppliers(sups);
      setOrders(ords);
    } catch (err) {
      console.error('Error cargando datos de proveedores:', err);
      toast.error('Error al sincronizar datos de proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Artículos con stock crítico o en quiebre
  const criticalProducts = useMemo(() => {
    return products.filter((p) => {
      const minStock = p.min_stock !== undefined && p.min_stock !== null ? Number(p.min_stock) : 5;
      const currentStock = Number(p.stock || 0);
      return currentStock <= minStock;
    });
  }, [products]);

  // Artículos críticos filtrados
  const filteredCriticalProducts = useMemo(() => {
    return criticalProducts.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchCritical.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchCritical)) ||
        (p.category && p.category.toLowerCase().includes(searchCritical.toLowerCase()));
      
      if (!matchSearch) return false;

      const currentStock = Number(p.stock || 0);
      if (criticalFilter === 'out_of_stock') return currentStock <= 0;
      if (criticalFilter === 'low_stock') return currentStock > 0;
      return true;
    });
  }, [criticalProducts, searchCritical, criticalFilter]);

  // Proveedores filtrados
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchSupplier.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.cuit && s.cuit.toLowerCase().includes(q)) ||
        (s.contact_name && s.contact_name.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q))
      );
    });
  }, [suppliers, searchSupplier]);

  // Órdenes filtradas
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (ordersFilter === 'pending') return o.status === 'pending';
      if (ordersFilter === 'received') return o.status === 'received';
      return true;
    });
  }, [orders, ordersFilter]);

  // Métricas
  const outOfStockCount = criticalProducts.filter(p => Number(p.stock || 0) <= 0).length;
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const pendingOrdersCost = orders
    .filter(o => o.status === 'pending')
    .reduce((acc, o) => acc + (Number(o.total_estimated_cost) || 0), 0);

  // Toggle selección de crítico
  const toggleSelectCritical = (id: string) => {
    setSelectedCriticalIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAllCritical = () => {
    const allSelected = filteredCriticalProducts.every(p => selectedCriticalIds[p.id]);
    const next: Record<string, boolean> = {};
    if (!allSelected) {
      filteredCriticalProducts.forEach(p => { next[p.id] = true; });
    }
    setSelectedCriticalIds(next);
  };

  // Pasar artículos críticos seleccionados al armador de pedido
  const handleBuildOrderFromCritical = (singleProduct?: any, targetSupplierId?: string) => {
    let prodsToInclude: any[] = [];
    if (singleProduct) {
      prodsToInclude = [singleProduct];
    } else {
      const selectedList = filteredCriticalProducts.filter(p => selectedCriticalIds[p.id]);
      // Si no seleccionó ninguno manualmente con checkboxes, cargar todos los críticos
      prodsToInclude = selectedList.length > 0 ? selectedList : filteredCriticalProducts;
    }

    if (prodsToInclude.length === 0) {
      toast.warning('No hay artículos críticos disponibles para armar el pedido');
      return;
    }

    const newItems: RestockOrderItem[] = prodsToInclude.map(p => {
      const minStock = p.min_stock !== undefined && p.min_stock !== null ? Number(p.min_stock) : 5;
      const currentStock = Number(p.stock || 0);
      const suggested = Math.max(1, (minStock * 2) - currentStock);
      const cost = Number(p.cost_price || (p.price ? p.price * 0.7 : 0));

      return {
        product_id: p.id,
        product_name: p.name,
        barcode: p.barcode,
        current_stock: currentStock,
        min_stock: minStock,
        quantity_suggested: suggested,
        quantity_ordered: suggested,
        cost_price: cost,
        estimated_subtotal: suggested * cost,
      };
    });

    // FUSIONAR con ítems existentes (no destruir lo que ya estaba agregado al pedido)
    setOrderItems(prev => {
      const merged = [...prev];
      for (const item of newItems) {
        const existingIdx = merged.findIndex(it => it.product_id === item.product_id);
        if (existingIdx >= 0) {
          const qty = Math.max(merged[existingIdx].quantity_ordered, item.quantity_ordered);
          merged[existingIdx] = {
            ...merged[existingIdx],
            quantity_ordered: qty,
            estimated_subtotal: qty * merged[existingIdx].cost_price,
          };
        } else {
          merged.push(item);
        }
      }
      return merged;
    });

    // Limpiar selección de checkboxes tras pasar al pedido
    setSelectedCriticalIds({});

    const chosenSupplier = targetSupplierId || orderSupplierId || (suppliers.length > 0 ? suppliers[0].id : '');
    if (chosenSupplier) {
      setOrderSupplierId(chosenSupplier);
    }

    setActiveTab('nuevo_pedido');
    toast.info(`Se incorporaron ${newItems.length} producto(s) en la orden de reposición`);
  };

  // Iniciar pedido para un proveedor específico
  const handleStartOrderForSupplier = (supplier: Supplier) => {
    setOrderSupplierId(supplier.id);
    if (orderItems.length === 0 && criticalProducts.length > 0) {
      handleBuildOrderFromCritical(undefined, supplier.id);
    } else {
      setActiveTab('nuevo_pedido');
    }
  };

  // Modificar cantidad u orden en el constructor de forma inmutable
  const updateOrderItemQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setOrderItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        quantity_ordered: newQty,
        estimated_subtotal: newQty * item.cost_price,
      };
    }));
  };

  const updateOrderItemCost = (index: number, newCost: number) => {
    if (newCost < 0) return;
    setOrderItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        cost_price: newCost,
        estimated_subtotal: item.quantity_ordered * newCost,
      };
    }));
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  // Agregar producto manualmente al pedido
  const handleAddProductToOrder = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    if (orderItems.some(it => it.product_id === prod.id)) {
      toast.warning('Este producto ya está en el pedido');
      return;
    }

    const minStock = prod.min_stock !== undefined && prod.min_stock !== null ? Number(prod.min_stock) : 5;
    const currentStock = Number(prod.stock || 0);
    const suggested = Math.max(1, (minStock * 2) - currentStock);
    const cost = Number(prod.cost_price || prod.price * 0.7);

    setOrderItems(prev => [
      ...prev,
      {
        product_id: prod.id,
        product_name: prod.name,
        barcode: prod.barcode,
        current_stock: currentStock,
        min_stock: minStock,
        quantity_suggested: suggested,
        quantity_ordered: suggested,
        cost_price: cost,
        estimated_subtotal: suggested * cost,
      }
    ]);
  };

  // Totales de la orden en construcción
  const totalOrderUnits = orderItems.reduce((acc, it) => acc + (Number(it.quantity_ordered) || 0), 0);
  const totalOrderCost = orderItems.reduce((acc, it) => acc + (Number(it.estimated_subtotal) || 0), 0);
  const selectedSupplierObj = suppliers.find(s => s.id === orderSupplierId) || suppliers[0];

  // Enviar pedido por WhatsApp
  const handleSendWhatsAppOrder = () => {
    if (!selectedSupplierObj) {
      toast.error('Selecciona un proveedor para enviar el pedido');
      return;
    }
    if (orderItems.length === 0) {
      toast.error('Agrega productos al pedido antes de enviar');
      return;
    }
    if (!selectedSupplierObj.phone) {
      toast.warning('El proveedor no tiene número de teléfono registrado');
      return;
    }

    const url = generateRestockWhatsAppUrl(
      selectedSupplierObj.phone,
      selectedSupplierObj.name,
      orderItems,
      orderNotes
    );

    window.open(url, '_blank');
  };

  // Descargar Excel de la orden
  const handleExportExcelOrder = () => {
    if (!selectedSupplierObj) {
      toast.error('Selecciona un proveedor para exportar');
      return;
    }
    if (orderItems.length === 0) {
      toast.error('Agrega productos al pedido para generar la planilla');
      return;
    }

    const tempNumber = `OC-PRE-${Math.floor(1000 + Math.random() * 9000)}`;
    exportRestockToExcel(selectedSupplierObj.name, tempNumber, orderItems, orderNotes);
    toast.success('Planilla Excel generada y descargada');
  };

  // Guardar orden de reposición en la base de datos
  const handleSavePurchaseOrder = async () => {
    if (!selectedSupplierObj) {
      toast.error('Selecciona un proveedor');
      return;
    }
    if (orderItems.length === 0) {
      toast.error('El pedido debe tener al menos un artículo');
      return;
    }

    setSavingOrder(true);
    try {
      const created = await createPurchaseOrder({
        supplier_id: selectedSupplierObj.id,
        supplier_name: selectedSupplierObj.name,
        supplier_phone: selectedSupplierObj.phone,
        status: 'pending',
        items: orderItems,
        total_items: totalOrderUnits,
        total_estimated_cost: totalOrderCost,
        notes: orderNotes,
      });

      toast.success(`Orden ${created.order_number} registrada como Pendiente de Entrega`);
      setOrders(prev => [created, ...prev]);
      setOrderItems([]);
      setOrderNotes('');
      setSelectedCriticalIds({});
      setActiveTab('ordenes');
    } catch (err) {
      console.error('Error guardando orden de compra:', err);
      toast.error('Error al guardar la orden de reposición');
    } finally {
      setSavingOrder(false);
    }
  };

  // Guardar / Editar Proveedor
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierToEdit || !supplierToEdit.name) {
      toast.error('El nombre o razón social es obligatorio');
      return;
    }

    setSavingSupplier(true);
    try {
      const saved = await saveSupplier(supplierToEdit);
      toast.success(supplierToEdit.id ? 'Proveedor actualizado' : 'Proveedor creado exitosamente');
      setSuppliers(prev => {
        const idx = prev.findIndex(s => s.id === saved.id);
        if (idx >= 0) {
          const upd = [...prev];
          upd[idx] = saved;
          return upd;
        }
        return [saved, ...prev];
      });
      setSupplierModalOpen(false);
      setSupplierToEdit(null);
    } catch (err) {
      console.error('Error guardando proveedor:', err);
      toast.error('Error al guardar proveedor');
    } finally {
      setSavingSupplier(false);
    }
  };

  // Eliminar Proveedor
  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar al proveedor "${name}"?`)) return;
    try {
      await deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      toast.info('Proveedor eliminado');
    } catch (err) {
      console.error('Error eliminando proveedor:', err);
      toast.error('Error al eliminar');
    }
  };

  // Abrir Modal de Recepción
  const handleOpenReceiveModal = (order: PurchaseOrder) => {
    setOrderToReceive(order);
    const initialPayload: { [productId: string]: { received_qty: number; new_cost: number } } = {};
    order.items.forEach(it => {
      initialPayload[it.product_id] = {
        received_qty: it.quantity_ordered,
        new_cost: it.cost_price,
      };
    });
    setReceivePayload(initialPayload);
    setReceiveModalOpen(true);
  };

  // Procesar Recepción de Mercadería
  const handleConfirmReceive = async () => {
    if (!orderToReceive) return;

    setProcessingReceive(true);
    try {
      const itemsToReceive = orderToReceive.items.map(it => ({
        product_id: it.product_id,
        product_name: it.product_name,
        received_quantity: Number(receivePayload[it.product_id]?.received_qty ?? it.quantity_ordered),
        new_cost_price: Number(receivePayload[it.product_id]?.new_cost ?? it.cost_price),
      }));

      const res = await receivePurchaseOrder(orderToReceive.id, itemsToReceive);

      if (res.success || res.updatedCount > 0) {
        toast.success(`¡Recepción exitosa! Se actualizaron ${res.updatedCount} artículos en inventario y costos.`);
        // Refrescar productos en memoria
        await mutateProducts();
        // Actualizar estado local de órdenes
        setOrders(prev => prev.map(o => o.id === orderToReceive.id ? { ...o, status: 'received', received_at: new Date().toISOString() } : o));
        setReceiveModalOpen(false);
        setOrderToReceive(null);
      } else {
        toast.error('No se pudo actualizar el inventario. Verifica la conexión.');
      }
    } catch (err) {
      console.error('Error confirmando recepción:', err);
      toast.error('Error procesando la recepción de mercadería');
    } finally {
      setProcessingReceive(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ENCABEZADO PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Proveedores y Reposición de Stock
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Control de proveedores, detección de quiebres de inventario y pedidos automatizados por WhatsApp y Excel.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSupplierToEdit({
                name: '',
                cuit: '',
                contact_name: '',
                phone: '',
                email: '',
                address: '',
                category: '',
                payment_terms: 'Contado',
                notes: '',
              });
              setSupplierModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proveedor
          </button>

          <button
            onClick={() => setActiveTab('nuevo_pedido')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            Armar Pedido
          </button>

          <button
            onClick={loadData}
            title="Refrescar datos"
            className="p-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* METRICAS / KPIS OPERATIVOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Proveedores Activos */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Proveedores Activos
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {suppliers.length}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Empresas y viajantes registrados
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Artículos en Quiebre / Críticos */}
        <div 
          onClick={() => setActiveTab('stock_critico')}
          className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition-all"
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Stock Crítico / Quiebre
              </p>
              {outOfStockCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                  {outOfStockCount} AGOTADOS
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {criticalProducts.length}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Artículos bajo stock de seguridad
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Órdenes Pendientes */}
        <div 
          onClick={() => { setActiveTab('ordenes'); setOrdersFilter('pending'); }}
          className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-all"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Órdenes en Espera
            </p>
            <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {pendingOrdersCount}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Aguardando entrega de mercadería
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Presupuesto en Tránsito */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Inversión en Tránsito
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              ${pendingOrdersCost.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Monto en pedidos pendientes
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-2xl px-2 pt-2 shadow-sm overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('stock_critico')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'stock_critico'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Stock Crítico y Reposición
          {criticalProducts.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {criticalProducts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('nuevo_pedido')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'nuevo_pedido'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Generador de Pedido
          {orderItems.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              {orderItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('proveedores')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'proveedores'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          Directorio de Proveedores
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {suppliers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ordenes')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'ordenes'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          Historial y Recepción de Mercadería
          {pendingOrdersCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
              {pendingOrdersCount} pendientes
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: STOCK CRÍTICO Y REPOSICIÓN INTELIGENTE                        */}
      {/* ========================================================================= */}
      {activeTab === 'stock_critico' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCritical}
                onChange={(e) => setSearchCritical(e.target.value)}
                placeholder="Buscar por nombre, código o rubro..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
                <button
                  onClick={() => setCriticalFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    criticalFilter === 'all'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Todos ({criticalProducts.length})
                </button>
                <button
                  onClick={() => setCriticalFilter('out_of_stock')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    criticalFilter === 'out_of_stock'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-red-500'
                  }`}
                >
                  Quiebre Total ({outOfStockCount})
                </button>
                <button
                  onClick={() => setCriticalFilter('low_stock')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    criticalFilter === 'low_stock'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-amber-500'
                  }`}
                >
                  Stock Bajo ({criticalProducts.length - outOfStockCount})
                </button>
              </div>

              <button
                onClick={selectAllCritical}
                className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              >
                {filteredCriticalProducts.length > 0 && filteredCriticalProducts.every(p => selectedCriticalIds[p.id])
                  ? 'Deseleccionar Todos'
                  : 'Seleccionar Todos'}
              </button>
            </div>
          </div>

          {/* Tabla de Artículos Críticos */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {loadingProducts ? (
              <div className="p-12 text-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
                <p>Analizando niveles de stock del catálogo...</p>
              </div>
            ) : filteredCriticalProducts.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  ¡Excelente! No hay quiebres ni alertas de stock crítico
                </h4>
                <p className="text-sm mt-1">
                  Todos tus artículos superan el umbral mínimo de seguridad establecido.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={filteredCriticalProducts.length > 0 && filteredCriticalProducts.every(p => selectedCriticalIds[p.id])}
                          onChange={selectAllCritical}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                        />
                      </th>
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4 text-center">Stock Actual</th>
                      <th className="py-3 px-4 text-center">Stock Mínimo</th>
                      <th className="py-3 px-4 text-center">Sugerido a Pedir</th>
                      <th className="py-3 px-4 text-right">Costo Estimado</th>
                      <th className="py-3 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredCriticalProducts.map((p) => {
                      const minStock = p.min_stock !== undefined && p.min_stock !== null ? Number(p.min_stock) : 5;
                      const currentStock = Number(p.stock || 0);
                      const isOutOfStock = currentStock <= 0;
                      const suggested = Math.max(1, (minStock * 2) - currentStock);
                      const cost = Number(p.cost_price || p.price * 0.7);
                      const isSelected = Boolean(selectedCriticalIds[p.id]);

                      return (
                        <tr 
                          key={p.id}
                          className={`transition-colors ${
                            isSelected 
                              ? 'bg-amber-50/70 dark:bg-amber-950/20' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCritical(p.id)}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                            <div>
                              <span>{p.name}</span>
                              {p.barcode && (
                                <span className="block text-xs text-gray-400 font-mono">
                                  Cód: {p.barcode}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            <span className="px-2 py-0.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800">
                              {p.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 animate-pulse">
                                0 u. (Agotado)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                {currentStock} u.
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-gray-500 dark:text-gray-400">
                            {minStock} u.
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
                              +{suggested} u.
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-800 dark:text-gray-200">
                            ${(suggested * cost).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                            <span className="block text-[11px] font-normal text-gray-400">
                              (${cost.toLocaleString('es-AR')} c/u)
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleBuildOrderFromCritical(p)}
                              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                            >
                              Pedir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Barra Flotante de Acción cuando hay seleccionados */}
          {Object.values(selectedCriticalIds).some(Boolean) && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 dark:bg-gray-800/95 text-white backdrop-blur-md px-6 py-3.5 rounded-2xl shadow-2xl border border-gray-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <span className="font-bold text-amber-400">
                  {Object.values(selectedCriticalIds).filter(Boolean).length} artículos
                </span>
                <span className="text-gray-300 text-sm ml-2">seleccionados para reposición</span>
              </div>
              <button
                onClick={() => handleBuildOrderFromCritical()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                Armar Pedido con Seleccionados
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: GENERADOR DE PEDIDO DE COMPRA (WHATSAPP + EXCEL)               */}
      {/* ========================================================================= */}
      {activeTab === 'nuevo_pedido' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-500" />
                  Orden de Reposición y Compra
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selecciona el proveedor destinatario, ajusta cantidades y exporta a WhatsApp o planilla Excel.
                </p>
              </div>

              {/* Selector de Proveedor */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Proveedor Destino:
                </label>
                <select
                  value={orderSupplierId}
                  onChange={(e) => setOrderSupplierId(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.contact_name ? `(${s.contact_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Datos del Proveedor Seleccionado */}
            {selectedSupplierObj && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">Razón Social y CUIT:</span>
                  <strong className="text-gray-900 dark:text-white text-sm">
                    {selectedSupplierObj.name}
                  </strong>
                  <span className="block text-gray-500">{selectedSupplierObj.cuit || 'Sin CUIT'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">Vendedor / WhatsApp:</span>
                  <strong className="text-gray-900 dark:text-white text-sm flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedSupplierObj.phone || 'Sin teléfono'}
                  </strong>
                  <span className="block text-gray-500">{selectedSupplierObj.contact_name || 'Atención Comercial'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">Condición de Pago:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 text-sm">
                    {selectedSupplierObj.payment_terms || 'Contado'}
                  </strong>
                  <span className="block text-gray-500 truncate">{selectedSupplierObj.notes || 'Sin notas especiales'}</span>
                </div>
              </div>
            )}

            {/* Selector Rápido para Añadir Otros Productos del Catálogo */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                + Agregar producto del catálogo:
              </span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddProductToOrder(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full sm:w-80 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100"
              >
                <option value="">Seleccionar artículo para incorporar...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stock || 0})
                  </option>
                ))}
              </select>

              {criticalProducts.length > 0 && orderItems.length === 0 && (
                <button
                  type="button"
                  onClick={() => handleBuildOrderFromCritical()}
                  className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Cargar automáticamente todos los artículos con stock crítico
                </button>
              )}
            </div>

            {/* Tabla de Artículos del Pedido */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              {orderItems.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Boxes className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="font-semibold text-gray-600 dark:text-gray-300">No hay productos agregados al pedido aún</p>
                  <p className="text-xs mt-1">Ve a la pestaña de &quot;Stock Crítico&quot; para seleccionarlos o agrégalos con el selector superior.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4 text-center">Stock Actual</th>
                      <th className="py-3 px-4 text-center">Cantidad a Pedir</th>
                      <th className="py-3 px-4 text-center">Costo Unit. ($)</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                      <th className="py-3 px-4 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {orderItems.map((item, index) => (
                      <tr key={item.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-4 text-xs font-mono text-gray-400">{index + 1}</td>
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                          {item.product_name}
                          {item.barcode && (
                            <span className="block text-xs text-gray-400 font-mono">
                              Cód: {item.barcode}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-gray-500">
                          {item.current_stock} u.
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateOrderItemQuantity(index, item.quantity_ordered - 1)}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity_ordered}
                              onChange={(e) => updateOrderItemQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-16 py-1 text-center bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateOrderItemQuantity(index, item.quantity_ordered + 1)}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-gray-400 text-xs">$</span>
                            <input
                              type="number"
                              step="any"
                              value={item.cost_price}
                              onChange={(e) => updateOrderItemCost(index, parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-900 dark:text-white text-right"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-white">
                          ${item.estimated_subtotal.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => removeOrderItem(index)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Observaciones y Totales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Notas de Entrega u Observaciones para el Preventista:
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Ej: Entregar antes de las 13hs. Favor de avisar confirmación de precios."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl space-y-2 border border-gray-200 dark:border-gray-800">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Total de Artículos:</span>
                  <strong>{orderItems.length} líneas</strong>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Total de Bultos / Unidades:</span>
                  <strong>{totalOrderUnits} u.</strong>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>Presupuesto Estimado:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ${totalOrderCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de Envío y Guardado */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={handleExportExcelOrder}
                disabled={orderItems.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Excel (.xlsx)
              </button>

              <button
                type="button"
                onClick={handleSendWhatsAppOrder}
                disabled={orderItems.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Enviar Pedido por WhatsApp
              </button>

              <button
                type="button"
                onClick={handleSavePurchaseOrder}
                disabled={savingOrder || orderItems.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {savingOrder ? 'Guardando...' : 'Registrar Orden en Espera'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: DIRECTORIO DE PROVEEDORES                                      */}
      {/* ========================================================================= */}
      {activeTab === 'proveedores' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchSupplier}
                onChange={(e) => setSearchSupplier(e.target.value)}
                placeholder="Buscar por nombre, CUIT o preventista..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                setSupplierToEdit({
                  name: '',
                  cuit: '',
                  contact_name: '',
                  phone: '',
                  email: '',
                  address: '',
                  category: '',
                  payment_terms: 'Contado',
                  notes: '',
                });
                setSupplierModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proveedor
            </button>
          </div>

          {/* Grid de Tarjetas de Proveedores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-base">
                        {s.name}
                      </h4>
                      {s.cuit && (
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                          CUIT: {s.cuit}
                        </span>
                      )}
                    </div>
                    {s.category && (
                      <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        {s.category}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {s.contact_name && (
                      <p className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium">Contacto:</span>
                        <strong className="text-gray-800 dark:text-gray-200">{s.contact_name}</strong>
                      </p>
                    )}
                    {s.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{s.phone}</span>
                      </p>
                    )}
                    {s.email && (
                      <p className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate">{s.email}</span>
                      </p>
                    )}
                    {s.payment_terms && (
                      <p className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium">Plazo de Pago:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{s.payment_terms}</span>
                      </p>
                    )}
                    {s.notes && (
                      <p className="text-[11px] text-gray-500 italic mt-1 line-clamp-2">
                        &quot;{s.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-1">
                    {s.phone && (
                      <a
                        href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir chat de WhatsApp"
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-all"
                      >
                        <Send className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setSupplierToEdit(s);
                        setSupplierModalOpen(true);
                      }}
                      title="Editar proveedor"
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(s.id, s.name)}
                      title="Eliminar proveedor"
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleStartOrderForSupplier(s)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-xl transition-all"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Hacer Pedido
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: HISTORIAL DE ÓRDENES Y RECEPCIÓN RÁPIDA                       */}
      {/* ========================================================================= */}
      {activeTab === 'ordenes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white">
              Órdenes de Reposición
            </h3>

            <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-semibold">
              <button
                onClick={() => setOrdersFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  ordersFilter === 'all'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Todas ({orders.length})
              </button>
              <button
                onClick={() => setOrdersFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  ordersFilter === 'pending'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Pendientes ({pendingOrdersCount})
              </button>
              <button
                onClick={() => setOrdersFilter('received')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  ordersFilter === 'received'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Recibidas ({orders.length - pendingOrdersCount})
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>No se encontraron órdenes registradas con este filtro.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="py-3 px-4">N° Orden</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Proveedor</th>
                      <th className="py-3 px-4 text-center">Unidades</th>
                      <th className="py-3 px-4 text-right">Monto Estimado</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredOrders.map((ord) => {
                      const isPending = ord.status === 'pending';
                      const dateFormatted = new Date(ord.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      });

                      return (
                        <tr key={ord.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">
                            {ord.order_number}
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">
                            {dateFormatted}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-200">
                            {ord.supplier_name}
                          </td>
                          <td className="py-3 px-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {ord.total_items} u. ({ord.items?.length || 0} ítems)
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-white">
                            ${Number(ord.total_estimated_cost || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {ord.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                <Clock className="w-3 h-3" />
                                En Espera
                              </span>
                            ) : ord.status === 'cancelled' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                <X className="w-3 h-3" />
                                Cancelado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                Recibido
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {ord.status === 'pending' ? (
                                <button
                                  onClick={() => handleOpenReceiveModal(ord)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow transition-all"
                                >
                                  <ArrowDownToLine className="w-3.5 h-3.5" />
                                  Ingresar Mercadería
                                </button>
                              ) : ord.status === 'cancelled' ? (
                                <span className="text-xs text-red-500 font-medium">
                                  Orden Cancelada
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  Ingresado {ord.received_at ? new Date(ord.received_at).toLocaleDateString('es-AR') : ''}
                                </span>
                              )}

                              <button
                                onClick={() => exportRestockToExcel(ord.supplier_name, ord.order_number, ord.items, ord.notes)}
                                title="Descargar planilla Excel"
                                className="p-1.5 text-gray-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              >
                                <FileSpreadsheet className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ALTA / EDICIÓN DE PROVEEDOR                                        */}
      {/* ========================================================================= */}
      {supplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                {supplierToEdit?.id ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
              </h3>
              <button
                onClick={() => setSupplierModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Nombre o Razón Social *
                </label>
                <input
                  type="text"
                  required
                  value={supplierToEdit?.name || ''}
                  onChange={(e) => setSupplierToEdit({ ...supplierToEdit, name: e.target.value })}
                  placeholder="Ej: Arcor Distribución S.A."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    CUIT (Opcional)
                  </label>
                  <input
                    type="text"
                    value={supplierToEdit?.cuit || ''}
                    onChange={(e) => setSupplierToEdit({ ...supplierToEdit, cuit: e.target.value })}
                    placeholder="30-12345678-9"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Rubro / Categoría
                  </label>
                  <input
                    type="text"
                    value={supplierToEdit?.category || ''}
                    onChange={(e) => setSupplierToEdit({ ...supplierToEdit, category: e.target.value })}
                    placeholder="Golosinas, Bebidas, Limpieza..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Vendedor o Preventista
                  </label>
                  <input
                    type="text"
                    value={supplierToEdit?.contact_name || ''}
                    onChange={(e) => setSupplierToEdit({ ...supplierToEdit, contact_name: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={supplierToEdit?.phone || ''}
                    onChange={(e) => setSupplierToEdit({ ...supplierToEdit, phone: e.target.value })}
                    placeholder="54911..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={supplierToEdit?.email || ''}
                    onChange={(e) => setSupplierToEdit({ ...supplierToEdit, email: e.target.value })}
                    placeholder="pedidos@proveedor.com"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Plazo de Pago
                  </label>
                  <input
                    type="text"
                    value={supplierToEdit?.payment_terms || ''}
                    onChange={(e) => setSupplierToEdit({ ...supplierToEdit, payment_terms: e.target.value })}
                    placeholder="Contado, 15 días, 30 días..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Notas de Entrega o Domicilio
                </label>
                <textarea
                  rows={2}
                  value={supplierToEdit?.notes || ''}
                  onChange={(e) => setSupplierToEdit({ ...supplierToEdit, notes: e.target.value })}
                  placeholder="Días de entrega, requisitos mínimos de bultos, etc."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSupplier}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all disabled:opacity-50"
                >
                  {savingSupplier ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECEPCIÓN RÁPIDA DE MERCADERÍA (ACTUALIZAR STOCK Y COSTOS)         */}
      {/* ========================================================================= */}
      {receiveModalOpen && orderToReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-3xl w-full p-6 border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
                  Recepción de Mercadería: {orderToReceive.order_number}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Proveedor: <strong>{orderToReceive.supplier_name}</strong>. Confirma cantidades recibidas y actualiza costos si hubo variación.
                </p>
              </div>
              <button
                onClick={() => setReceiveModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-gray-200 dark:border-gray-800 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4 text-center">Stock Actual</th>
                    <th className="py-3 px-4 text-center">Pedido</th>
                    <th className="py-3 px-4 text-center">Cant. Recibida</th>
                    <th className="py-3 px-4 text-center">Nuevo Costo ($)</th>
                    <th className="py-3 px-4 text-center">Stock Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {orderToReceive.items.map((it) => {
                    const prodInCatalog = products.find(p => p.id === it.product_id);
                    const currentStock = prodInCatalog ? Number(prodInCatalog.stock || 0) : it.current_stock;
                    const recQty = receivePayload[it.product_id]?.received_qty ?? it.quantity_ordered;
                    const newCost = receivePayload[it.product_id]?.new_cost ?? it.cost_price;
                    const finalStock = currentStock + Number(recQty || 0);

                    return (
                      <tr key={it.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                          {it.product_name}
                          {it.barcode && (
                            <span className="block text-xs text-gray-400 font-mono">
                              Cód: {it.barcode}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-gray-500">
                          {currentStock} u.
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {it.quantity_ordered} u.
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            value={recQty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setReceivePayload(prev => ({
                                ...prev,
                                [it.product_id]: { ...prev[it.product_id], received_qty: val }
                              }));
                            }}
                            className="w-20 px-2 py-1 text-center bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-gray-400 text-xs">$</span>
                            <input
                              type="number"
                              step="any"
                              value={newCost}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setReceivePayload(prev => ({
                                  ...prev,
                                  [it.product_id]: { ...prev[it.product_id], new_cost: val }
                                }));
                              }}
                              className="w-24 px-2 py-1 text-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-900 dark:text-white focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-lg text-xs">
                            {finalStock} u.
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300">
              💡 <strong>Impacto Inmediato:</strong> Al confirmar, las unidades recibidas se sumarán al inventario de Supabase y los nuevos costos quedarán registrados para el cálculo de rentabilidad del POS y catálogo.
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setReceiveModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                disabled={processingReceive}
                className="flex items-center gap-2 px-6 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {processingReceive ? 'Ingresando a Inventario...' : 'Confirmar Ingreso a Inventario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
