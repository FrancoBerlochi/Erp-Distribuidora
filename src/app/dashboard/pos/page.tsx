/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useProducts, optimizeImageUrl } from '@/lib/products-cache';
import { 
  Search, 
  Barcode, 
  Camera, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart, 
  CreditCard, 
  Banknote, 
  QrCode, 
  ArrowLeftRight, 
  Lock, 
  KeyRound, 
  Check, 
  AlertCircle, 
  RotateCcw, 
  FileText, 
  Sparkles,
  Package,
  Layers,
  ArrowLeft,
  X,
  Users,
  UserCheck,
  Wallet,
  Phone,
  UserPlus,
  Printer
} from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  getActiveCashRegister, 
  openCashRegister, 
  executePOSSale, 
  playScannerBeep, 
  getStoredProfiles,
  POSSaleResult 
} from '@/lib/pos-service';
import { 
  CashRegisterSession, 
  POSCartItem, 
  PaymentMethod, 
  UserProfile,
  Customer
} from '@/lib/pos-types';
import { getCustomers, saveCustomer } from '@/lib/customers-service';
import POSCameraScanner from '@/components/pos-camera-scanner';
import POSPinModal from '@/components/pos-pin-modal';
import POSReceiptModal from '@/components/pos-receipt-modal';
import POSReturnModal from '@/components/pos-return-modal';
import POSReturnReceiptModal from '@/components/pos-return-receipt-modal';
import { CashReceiptModal } from '@/components/cash-receipt-modal';
import { POSReturn } from '@/lib/returns-service';
import { calculatePromoPricing, getPromoBadgeInfo } from '@/lib/promotions-engine';

export default function POSPage() {
  const { products, loading: loadingProducts } = useProducts();

  // Estados de Caja y Sesión
  const [cashRegister, setCashRegister] = useState<CashRegisterSession | null>(null);
  const [loadingCash, setLoadingCash] = useState(true);
  const [cashReceiptModalOpen, setCashReceiptModalOpen] = useState(false);
  const [cashReceiptSession, setCashReceiptSession] = useState<CashRegisterSession | null>(null);
  const [cashReceiptMode, setCashReceiptMode] = useState<'X' | 'Z'>('X');
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const profiles = getStoredProfiles();
    return profiles[0] || { id: 'usr-admin', email: 'admin@distribuidora.com', full_name: 'Administrador', role: 'admin', pin_code: '1234' };
  });

  // Estados de Carrito POS
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [priceListMode, setPriceListMode] = useState<'minorista' | 'mayorista'>('minorista');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Estados de Escáner y Modales
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [lastSaleResult, setLastSaleResult] = useState<POSSaleResult | null>(null);

  // Estados de Devolución y Notas de Crédito
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReceiptModalOpen, setReturnReceiptModalOpen] = useState(false);
  const [lastReturnResult, setLastReturnResult] = useState<POSReturn | null>(null);

  // Estados del Modal de Cobro
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [cashGivenStr, setCashGivenStr] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<'ticket_interno' | 'factura_c'>('ticket_interno');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerDoc, setCustomerDoc] = useState<string>('');
  const [customerDocType, setCustomerDocType] = useState<string>('DNI');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [surchargeAmount, setSurchargeAmount] = useState<number>(0);
  const [processingSale, setProcessingSale] = useState(false);

  // Estados para Fiado y Clientes en Cuenta Corriente
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [quickNewCustomerModal, setQuickNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustDoc, setNewCustDoc] = useState('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState('150000');
  const [creditPaidNowStr, setCreditPaidNowStr] = useState<string>('');

  // Estado para apertura rápida de caja si está cerrada
  const [openingCashModal, setOpeningCashModal] = useState(false);
  const [initialCashInput, setInitialCashInput] = useState<string>('');

  // Buffer para lector físico de código de barras (pistola USB/Bluetooth)
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Cargar sesión de caja activa
  const refreshCashRegister = async () => {
    setLoadingCash(true);
    try {
      const active = await getActiveCashRegister();
      setCashRegister(active);
    } catch {
      setCashRegister(null);
    } finally {
      setLoadingCash(false);
    }
  };

  // Cargar lista de clientes
  const refreshCustomers = async () => {
    try {
      const list = await getCustomers();
      setCustomers(list);
    } catch (err) {
      console.warn('Error cargando clientes:', err);
    }
  };

  useEffect(() => {
    refreshCashRegister();
    refreshCustomers();
  }, []);

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      toast.warn('Ingresa el nombre o razón social del cliente');
      return;
    }
    try {
      const created = await saveCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        document_number: newCustDoc.trim(),
        credit_limit: Number(newCustCreditLimit) || 0,
        current_balance: 0,
      });
      toast.success(`Cliente ${created.name} registrado con éxito`);
      await refreshCustomers();
      setSelectedCustomer(created);
      setCustomerName(created.name);
      setCustomerDoc(created.document_number || '');
      setQuickNewCustomerModal(false);
      setCustomerModalOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustDoc('');
    } catch {
      toast.error('Error al guardar cliente');
    }
  };

  // LISTENER GLOBAL DE TECLADO PARA LECTORES DE CÓDIGO DE BARRAS FÍSICOS
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input o textarea normal
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const now = Date.now();
      // Si el tiempo entre pulsaciones es muy corto (< 60ms), típicamente es un escáner láser
      if (now - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          handleBarcodeScanned(barcodeBufferRef.current.trim());
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [products]);

  // Manejo de código de barras escaneado (por pistola USB o cámara)
  const handleBarcodeScanned = (scannedCode: string) => {
    const cleanCode = scannedCode.trim().toLowerCase();
    
    // Buscar coincidencia por barcode o id
    const matched = products.find((p) => 
      (p.barcode && p.barcode.trim().toLowerCase() === cleanCode) ||
      p.id.toLowerCase() === cleanCode ||
      p.name.toLowerCase().includes(cleanCode)
    );

    if (matched) {
      playScannerBeep();
      addToCart(matched);
      toast.success(`⚡ Escaneado: ${matched.name}`);
    } else {
      toast.warn(`Código no encontrado: "${scannedCode}"`);
    }
  };

  // Categorías disponibles
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtrado de productos en grilla
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || (p.category || '').toLowerCase() === selectedCategory.toLowerCase();
      if (!matchCat) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBarcode = p.barcode && p.barcode.toLowerCase().includes(q);
        const matchCategory = p.category && p.category.toLowerCase().includes(q);
        if (!matchName && !matchBarcode && !matchCategory) return false;
      }

      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Helper para recalcular precio efectivo mayorista/minorista/promo de un item
  const evaluateItem = (
    item: POSCartItem,
    qty: number,
    mode: 'minorista' | 'mayorista'
  ): POSCartItem => {
    const regularPrice = item.regular_price;
    const discountPct = item.discount_percentage || 0;
    const baseDiscounted = discountPct > 0 ? regularPrice * (1 - discountPct / 100) : regularPrice;
    const hasWholesale = item.wholesale_price != null && Number(item.wholesale_price) > 0;
    const numWholesale = hasWholesale ? Number(item.wholesale_price) : baseDiscounted;
    const minQty = item.wholesale_min_qty || 6;

    let effectivePrice = baseDiscounted;
    let isWholesale = false;
    let promoDiscountAmount = 0;
    let promoDescription: string | null = null;
    let promoBadge = null;

    if (mode === 'mayorista' && hasWholesale) {
      effectivePrice = numWholesale;
      isWholesale = true;
    } else if (mode === 'minorista' && hasWholesale && qty >= minQty) {
      effectivePrice = numWholesale;
      isWholesale = true;
    } else if (item.promo_type && item.promo_type !== 'none') {
      const promoCalc = calculatePromoPricing(
        baseDiscounted,
        qty,
        {
          promo_type: item.promo_type as any,
          promo_second_unit_discount: item.promo_second_unit_discount,
          promo_min_qty: item.promo_min_qty,
          promo_discount_percentage: item.promo_discount_percentage,
        },
        item.cost_price ? Number(item.cost_price) : undefined
      );

      promoBadge = promoCalc.promoBadge;
      if (promoCalc.isPromoActive) {
        effectivePrice = promoCalc.effectiveUnitPrice;
        promoDiscountAmount = promoCalc.discountAmount;
        promoDescription = promoCalc.appliedDescription;
      }
    }

    return {
      ...item,
      quantity: qty,
      price: effectivePrice,
      is_wholesale: isWholesale,
      promo_discount_amount: promoDiscountAmount,
      promo_description: promoDescription,
      promo_badge: promoBadge,
    };
  };

  const handleTogglePriceList = (mode: 'minorista' | 'mayorista') => {
    setPriceListMode(mode);
    setCart((prev) => prev.map((item) => evaluateItem(item, item.quantity, mode)));
  };

  // OPERACIONES DE CARRITO POS
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const regularPrice = Number(product.price) || 0;
      const discountPct = Number(product.discount_percentage) || 0;
      const wholesalePrice = product.wholesale_price != null ? Number(product.wholesale_price) : null;
      const wholesaleMinQty = product.wholesale_min_qty || 6;

      if (existing) {
        return prev.map((item) => 
          item.id === product.id 
            ? evaluateItem(item, item.quantity + 1, priceListMode)
            : item
        );
      } else {
        const baseItem: POSCartItem = {
          id: product.id,
          name: product.name,
          price: regularPrice,
          regular_price: regularPrice,
          discount_percentage: discountPct,
          quantity: 1,
          stock: product.stock || 0,
          barcode: product.barcode,
          image_url_1: product.image_url_1,
          category: product.category,
          wholesale_price: wholesalePrice,
          wholesale_min_qty: wholesaleMinQty,
          cost_price: product.cost_price != null ? Number(product.cost_price) : null,
          promo_type: product.promo_type || null,
          promo_second_unit_discount: product.promo_second_unit_discount != null ? Number(product.promo_second_unit_discount) : null,
          promo_min_qty: product.promo_min_qty != null ? Number(product.promo_min_qty) : null,
          promo_discount_percentage: product.promo_discount_percentage != null ? Number(product.promo_discount_percentage) : null,
        };
        return [...prev, evaluateItem(baseItem, 1, priceListMode)];
      }
    });
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) => prev.map((item) => item.id === id ? evaluateItem(item, qty, priceListMode) : item));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  // CÁLCULOS DE TOTALES
  const subtotal = cart.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const promoSavingsTotal = cart.reduce((acc, it) => acc + (it.promo_discount_amount || 0), 0);
  const totalPayable = Math.max(0, subtotal - discountAmount + surchargeAmount);
  const cashGivenNumber = Number(cashGivenStr) || 0;
  const changeDue = paymentMethod === 'efectivo' && cashGivenNumber > totalPayable ? cashGivenNumber - totalPayable : 0;

  // Manejo de Apertura de Caja
  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const initial = Number(initialCashInput) || 0;
    const session = await openCashRegister(currentUser.full_name, initial);
    setCashRegister(session);
    setOpeningCashModal(false);
    toast.success(`🟢 Caja abierta con éxito con fondo de $${initial.toLocaleString('es-AR')}`);
  };

  // Manejo de Cobro / Finalizar Venta
  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      toast.warn('La canasta de venta está vacía');
      return;
    }

    if (!cashRegister || cashRegister.status !== 'open') {
      toast.error('Debe abrir la caja antes de registrar ventas');
      setOpeningCashModal(true);
      return;
    }

    if (paymentMethod === 'efectivo' && cashGivenNumber > 0 && cashGivenNumber < totalPayable) {
      toast.warn('El monto entregado en efectivo es menor al total a pagar');
      return;
    }

    if (paymentMethod === 'cuenta_corriente') {
      if (!selectedCustomer) {
        toast.error('Debes seleccionar un cliente para vender a Cuenta Corriente (Fiado)');
        setCustomerModalOpen(true);
        return;
      }
    }

    const paidNowNum = paymentMethod === 'cuenta_corriente' ? Math.max(0, Number(creditPaidNowStr) || 0) : undefined;
    const creditPortion = paymentMethod === 'cuenta_corriente' ? Math.max(0, totalPayable - (paidNowNum || 0)) : undefined;

    if (paymentMethod === 'cuenta_corriente' && paidNowNum !== undefined && paidNowNum > totalPayable) {
      toast.warn('El anticipo en efectivo no puede superar el total de la venta');
      return;
    }

    setProcessingSale(true);
    try {
      const result = await executePOSSale({
        items: cart,
        paymentMethod,
        customerName: selectedCustomer ? selectedCustomer.name : (customerName.trim() || 'Consumidor Final'),
        customerDoc: selectedCustomer ? selectedCustomer.document_number : customerDoc.trim(),
        customerDocType: selectedCustomer ? selectedCustomer.document_type : customerDocType,
        discountAmount,
        surchargeAmount,
        cashGiven: cashGivenNumber > 0 ? cashGivenNumber : totalPayable,
        invoiceType,
        cashierName: currentUser.full_name,
        cashRegisterId: cashRegister.id,
        customerId: selectedCustomer?.id,
        creditAmount: creditPortion,
        paidNowAmount: paidNowNum,
      });

      setLastSaleResult(result);
      setCart([]);
      setChargeModalOpen(false);
      setReceiptModalOpen(true);
      setCreditPaidNowStr('');
      refreshCashRegister();
      refreshCustomers();
      if (selectedCustomer && result.customerNewBalance !== undefined) {
        setSelectedCustomer((prev) => prev ? { ...prev, current_balance: result.customerNewBalance! } : null);
      }
      toast.success('¡Venta registrada con éxito!');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al procesar la venta');
    } finally {
      setProcessingSale(false);
    }
  };

  const formatMoney = (val: number) => `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="h-full flex flex-col min-h-0 bg-gray-100 dark:bg-gray-950 -m-4 sm:-m-6 lg:-m-8">
      {/* 1. BARRA SUPERIOR DEL POS */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Volver al panel"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-none">
                Terminal Punto de Venta (POS)
              </h1>
              <span className="text-[10px] font-extrabold bg-[#dc2626] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                Caja Mostrador
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Escanea códigos de barra o selecciona productos de la grilla
            </p>
          </div>
        </div>

        {/* Estado de Caja y Operador */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Badge de Estado de Caja */}
          {cashRegister?.status === 'open' ? (
            <Link
              href="/dashboard/caja"
              className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl text-xs font-extrabold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Caja Abierta</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setOpeningCashModal(true)}
              className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 px-3 py-1.5 rounded-xl text-xs font-extrabold text-[#dc2626] hover:bg-red-100 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Abrir Caja</span>
            </button>
          )}

          {/* Botón de Devolución / Anular Ticket */}
          <button
            type="button"
            onClick={() => setReturnModalOpen(true)}
            className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-red-400 hover:text-[#dc2626] px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
            title="Devolución o anulación de ticket de venta"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#dc2626]" />
            <span className="hidden sm:inline">Devolución</span>
          </button>

          {/* Botón de Arqueo Parcial (X) */}
          <button
            type="button"
            onClick={() => {
              if (cashRegister && cashRegister.status === 'open') {
                setCashReceiptSession(cashRegister);
                setCashReceiptMode('X');
                setCashReceiptModalOpen(true);
              } else {
                toast.info('La caja no está abierta actualmente.');
              }
            }}
            className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Arqueo Parcial de Caja (X) en tiempo real"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Arqueo X</span>
          </button>

          {/* Botón de Cajero / Cambio con PIN */}
          <button
            type="button"
            onClick={() => setPinModalOpen(true)}
            className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-400 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 transition-all cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">{currentUser.full_name}</span>
            <span className="text-[10px] uppercase bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded font-black">
              {currentUser.role}
            </span>
          </button>
        </div>
      </header>

      {/* 2. CONTENIDO PRINCIPAL: GRILLA IZQUIERDA + CARRITO DERECHO */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* COLUMNA IZQUIERDA: BUSCADOR + CATEGORÍAS + GRILLA DE PRODUCTOS */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
          {/* Buscador y Botón de Cámara */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, código de barra o categoría... (Foco automático)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Botón Escáner Cámara */}
            <button
              type="button"
              onClick={() => setCameraModalOpen(true)}
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-2xs"
              title="Escanear con cámara del celular o webcam"
            >
              <Camera className="w-4 h-4 text-[#dc2626]" />
              <span className="hidden sm:inline">Escanear</span>
            </button>
          </div>

          {/* Selector Horizontal de Categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#dc2626] text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              Todos ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#dc2626] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grilla Táctil de Productos */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {loadingProducts && products.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                Cargando inventario para el POS...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs p-8 text-center">
                <Package className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-2" />
                <p className="font-bold text-gray-700 dark:text-gray-300">No se encontraron productos</p>
                <p className="text-[11px]">Prueba buscando por otro nombre o código</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {filteredProducts.map((p) => {
                  const hasDiscount = (p.discount_percentage || 0) > 0;
                  const finalPrice = hasDiscount 
                    ? p.price - (p.price * (p.discount_percentage / 100)) 
                    : p.price;
                  const promoBadge = getPromoBadgeInfo({
                    promo_type: p.promo_type,
                    promo_second_unit_discount: p.promo_second_unit_discount,
                    promo_min_qty: p.promo_min_qty,
                    promo_discount_percentage: p.promo_discount_percentage,
                  });

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-[#dc2626] dark:hover:border-red-500 rounded-2xl p-2.5 flex flex-col text-left transition-all duration-150 active:scale-95 group cursor-pointer shadow-2xs relative"
                    >
                      {/* Miniatura */}
                      <div className="w-full aspect-square bg-gray-50 dark:bg-gray-900 rounded-xl mb-2 flex items-center justify-center overflow-hidden relative">
                        {promoBadge && (
                          <span className={`absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded-md border ${promoBadge.bgClass} ${promoBadge.textClass} ${promoBadge.borderClass} flex items-center gap-0.5 shadow-sm z-10`}>
                            <Sparkles className="w-2.5 h-2.5" />
                            {promoBadge.shortText}
                          </span>
                        )}
                        {p.image_url_1 ? (
                          <img
                            src={optimizeImageUrl(p.image_url_1, 200)}
                            alt={p.name}
                            className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                        )}

                        {hasDiscount && (
                          <span className="absolute top-1 right-1 bg-[#dc2626] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md z-10">
                            -{p.discount_percentage}%
                          </span>
                        )}
                      </div>

                      {/* Info Producto */}
                      <p className="font-bold text-xs text-gray-900 dark:text-white line-clamp-2 leading-tight flex-1 mb-1">
                        {p.name}
                      </p>

                      <div className="flex items-baseline justify-between mt-auto pt-1 border-t border-gray-100 dark:border-gray-700/60">
                        <div>
                          <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-none">
                            {formatMoney(finalPrice)}
                          </p>
                          {hasDiscount && (
                            <span className="text-[9px] text-gray-400 line-through block">
                              {formatMoney(p.price)}
                            </span>
                          )}
                          {p.wholesale_price && Number(p.wholesale_price) > 0 && (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                              May: {formatMoney(Number(p.wholesale_price))}
                            </span>
                          )}
                        </div>

                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          (p.stock || 0) <= 5 
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          Stk: {p.stock || 0}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: CANASTA DE VENTA TÁCTIL (TICKET EN PROCESO) */}
        <div className="w-full lg:w-96 xl:w-[420px] bg-white dark:bg-gray-900 flex flex-col shrink-0 min-h-0 border-t lg:border-t-0">
          {/* Cabecera Canasta */}
          <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#dc2626]" />
              <h2 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Ticket Actual ({cart.reduce((acc, it) => acc + it.quantity, 0)})
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[11px] font-bold text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Vaciar
              </button>
            )}
          </div>

          {/* Switch Selector de Lista de Precios */}
          <div className="px-3.5 py-2 bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Lista de Precios:</span>
            <div className="inline-flex bg-gray-200 dark:bg-gray-700 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => handleTogglePriceList('minorista')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  priceListMode === 'minorista'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs font-black'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Minorista
              </button>
              <button
                type="button"
                onClick={() => handleTogglePriceList('mayorista')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  priceListMode === 'mayorista'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>⚡ Mayorista</span>
              </button>
            </div>
          </div>

          {/* Asignación de Cliente / Fiado */}
          <div className="px-3.5 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            {!selectedCustomer ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-300 dark:border-gray-700">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">Consumidor Final</p>
                    <p className="text-[10px] text-gray-400">Sin cuenta corriente</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="text-xs font-bold text-[#dc2626] hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Asignar Cliente
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                      {selectedCustomer.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] mt-0.5 flex-wrap">
                    <span className="text-gray-500 dark:text-gray-400">
                      Deuda: <strong className={selectedCustomer.current_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600'}>{formatMoney(selectedCustomer.current_balance)}</strong>
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      Límite: <strong>{formatMoney(selectedCustomer.credit_limit)}</strong>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCustomerModalOpen(true)}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-1.5 py-1 rounded cursor-pointer"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                    title="Quitar cliente"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lista de Items en Canasta */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-2">
                  <Barcode className="w-6 h-6 text-gray-400" />
                </div>
                <p className="font-extrabold text-xs text-gray-700 dark:text-gray-300">Canasta vacía</p>
                <p className="text-[11px]">Escanea un código de barra o toca un producto</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-2.5 border border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-gray-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {formatMoney(item.regular_price)} c/u
                      </p>
                      {item.is_wholesale && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          ⚡ Mayorista
                        </span>
                      )}
                      {!item.is_wholesale && item.wholesale_price && Number(item.wholesale_price) > 0 && priceListMode === 'minorista' && (
                        <span className="text-[9px] text-gray-400">
                          (x{item.wholesale_min_qty || 6}+: {formatMoney(Number(item.wholesale_price))})
                        </span>
                      )}
                      {item.promo_badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${item.promo_badge.bgClass} ${item.promo_badge.textClass} ${item.promo_badge.borderClass} flex items-center gap-0.5`}>
                          <Sparkles className="w-2.5 h-2.5" />
                          {item.promo_description || item.promo_badge.shortText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stepper Cantidad */}
                  <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-black text-xs text-gray-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal del Item */}
                  <div className="text-right min-w-[65px]">
                    <p className="font-black text-xs text-gray-900 dark:text-white">
                      {formatMoney(item.price * item.quantity)}
                    </p>
                    {item.promo_discount_amount && item.promo_discount_amount > 0 ? (
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        Ahorro -{formatMoney(item.promo_discount_amount)}
                      </span>
                    ) : null}
                  </div>

                  {/* Quitar */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Pie de Totales y Botón Cobrar */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/90 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500 dark:text-gray-400 font-semibold">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              {promoSavingsTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Ahorro en Promociones
                  </span>
                  <span>-{formatMoney(promoSavingsTotal)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Descuento aplicado</span>
                  <span>-{formatMoney(discountAmount)}</span>
                </div>
              )}
              {surchargeAmount > 0 && (
                <div className="flex justify-between text-amber-600 font-bold">
                  <span>Recargo</span>
                  <span>+{formatMoney(surchargeAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-1.5 flex justify-between items-baseline">
                <span className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">
                  Total a Pagar
                </span>
                <span className="font-black text-2xl text-[#dc2626]">
                  {formatMoney(totalPayable)}
                </span>
              </div>
            </div>

            {/* BOTÓN COBRAR */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => {
                setCashGivenStr(totalPayable.toString());
                setChargeModalOpen(true);
              }}
              className="w-full bg-[#dc2626] hover:bg-red-700 disabled:opacity-40 text-white font-black py-3.5 px-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
            >
              <CreditCard className="w-5 h-5" />
              <span>COBRAR {formatMoney(totalPayable)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. MODAL DE COBRO (CHECKOUT DEL POS) */}
      {chargeModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-800 flex flex-col max-h-[92vh]">
            {/* Cabecera Modal Cobro */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-gray-900 dark:text-white">
                  Cobro de Venta
                </h3>
                <p className="text-xs text-gray-500">Selecciona el método de pago e ingresa datos</p>
              </div>
              <button
                type="button"
                onClick={() => setChargeModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Modal Cobro */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Total Grande */}
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 rounded-2xl text-center">
                <span className="text-xs font-bold text-[#dc2626] uppercase tracking-wider block">
                  Monto Total a Cobrar
                </span>
                <span className="text-3xl sm:text-4xl font-black text-[#dc2626]">
                  {formatMoney(totalPayable)}
                </span>
              </div>

              {/* Selector de Método de Pago */}
              <div>
                <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 block mb-2">
                  Método de Pago:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {[
                    { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                    { id: 'tarjeta_posnet', label: 'Posnet', icon: CreditCard },
                    { id: 'qr', label: 'QR / MP', icon: QrCode },
                    { id: 'transferencia', label: 'Transfer.', icon: ArrowLeftRight },
                    { id: 'cuenta_corriente', label: 'Cta. Cte.', icon: Wallet },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#dc2626] bg-red-50/80 dark:bg-red-950/50 text-[#dc2626] font-black shadow-xs'
                            : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold'
                        }`}
                      >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-[11px] sm:text-xs">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detalle según Método de Pago */}
              {paymentMethod === 'efectivo' && (
                <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      Dinero entregado por el cliente:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-500">$</span>
                      <input
                        type="number"
                        step="any"
                        value={cashGivenStr}
                        onChange={(e) => setCashGivenStr(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2 text-base font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dc2626] outline-none"
                      />
                    </div>
                  </div>

                  {/* Botones de billetes rápidos */}
                  <div className="flex flex-wrap gap-1.5">
                    {[totalPayable, 1000, 2000, 5000, 10000, 20000].map((amt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCashGivenStr(amt.toString())}
                        className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        {idx === 0 ? 'Exacto' : `$${amt.toLocaleString('es-AR')}`}
                      </button>
                    ))}
                  </div>

                  {/* Vuelto a Entregar */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300">
                      Vuelto a entregar:
                    </span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {formatMoney(changeDue)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'cuenta_corriente' && (
                <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-900 space-y-3">
                  {!selectedCustomer ? (
                    <div className="text-center space-y-2 py-3">
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        ⚠️ No has seleccionado un cliente para cargar la venta fiada en cuenta corriente.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCustomerModalOpen(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-black py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <Users className="w-4 h-4" />
                        <span>Asignar o Crear Cliente Ahora</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200/80 dark:border-amber-900/60">
                        <div>
                          <p className="text-xs font-black text-amber-950 dark:text-amber-100">
                            {selectedCustomer.name}
                          </p>
                          <p className="text-[10px] text-amber-800/80 dark:text-amber-300">
                            {selectedCustomer.document_type}: {selectedCustomer.document_number || 'S/D'} • Tel: {selectedCustomer.phone || 'S/T'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomerModalOpen(true)}
                          className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                        >
                          Cambiar
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                          <span className="text-[10px] text-gray-500 block">Deuda Actual:</span>
                          <span className="font-black text-red-600 dark:text-red-400 text-sm">
                            {formatMoney(selectedCustomer.current_balance)}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                          <span className="text-[10px] text-gray-500 block">Límite de Crédito:</span>
                          <span className="font-black text-gray-800 dark:text-gray-200 text-sm">
                            {formatMoney(selectedCustomer.credit_limit)}
                          </span>
                        </div>
                      </div>

                      {/* Pago Parcial / Mixto */}
                      <div className="space-y-1 pt-1">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                          Paga hoy en efectivo (de contado):
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-xs">$</span>
                          <input
                            type="number"
                            step="any"
                            value={creditPaidNowStr}
                            onChange={(e) => setCreditPaidNowStr(e.target.value)}
                            placeholder="0 (o anticipo si paga una parte)"
                            className="w-full bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-800 rounded-xl pl-7 pr-3 py-1.5 text-sm font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500">
                          Si deja una seña o anticipo, sumará a la caja chica y el saldo restante quedará anotado en cuenta corriente.
                        </p>
                      </div>

                      {/* Resumen de Deuda a Anotar */}
                      <div className="pt-2 border-t border-amber-200 dark:border-amber-900/60 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Total de la venta:</span>
                          <span className="font-bold">{formatMoney(totalPayable)}</span>
                        </div>
                        {Number(creditPaidNowStr) > 0 && (
                          <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                            <span>Abona hoy:</span>
                            <span>-{formatMoney(Number(creditPaidNowStr))}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-amber-900 dark:text-amber-200">
                          <span>Se anota en Cta. Cte.:</span>
                          <span>{formatMoney(Math.max(0, totalPayable - (Number(creditPaidNowStr) || 0)))}</span>
                        </div>
                        <div className="flex justify-between font-black text-red-600 dark:text-red-400 pt-1 border-t border-dashed border-amber-300 dark:border-amber-800">
                          <span>Nuevo Saldo Total del Cliente:</span>
                          <span>
                            {formatMoney(selectedCustomer.current_balance + Math.max(0, totalPayable - (Number(creditPaidNowStr) || 0)))}
                          </span>
                        </div>

                        {/* Alerta de Límite de Crédito Excedido */}
                        {(selectedCustomer.current_balance + Math.max(0, totalPayable - (Number(creditPaidNowStr) || 0))) > selectedCustomer.credit_limit && (
                          <div className="mt-2 bg-red-100 dark:bg-red-950/60 p-2.5 rounded-xl border border-red-300 dark:border-red-900 text-red-800 dark:text-red-300 flex items-start gap-2 text-[11px]">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                              <strong>Advertencia:</strong> Esta compra supera el límite acordado ({formatMoney(selectedCustomer.credit_limit)}). Se puede registrar bajo autorización expresa del comercio.
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {paymentMethod === 'tarjeta_posnet' && (
                <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200">
                  <p className="font-bold">Terminal Posnet / Lector de Tarjetas</p>
                  <p className="text-[11px] mt-0.5">Pasa la tarjeta por la terminal física de cobro y confirma la operación al finalizar.</p>
                </div>
              )}

              {paymentMethod === 'qr' && (
                <div className="bg-sky-50 dark:bg-sky-950/40 p-3 rounded-2xl border border-sky-200 dark:border-sky-900 text-xs text-sky-900 dark:text-sky-200 text-center space-y-1">
                  <p className="font-bold">QR Interoperable / Mercado Pago</p>
                  <p className="text-[11px]">Muestra el código QR del mostrador para que el cliente escanee desde su billetera.</p>
                </div>
              )}

              {paymentMethod === 'transferencia' && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <p className="font-bold">Alias: distribuidora.express</p>
                  <p className="text-[11px]">CBU: 0720000000000000000000 | Banco Santander</p>
                </div>
              )}

              {/* Selector de Comprobante: Ticket Interno vs. Factura ARCA */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 block">
                  Tipo de Comprobante:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceType('ticket_interno')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      invoiceType === 'ticket_interno'
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Ticket Interno
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceType('factura_c')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      invoiceType === 'factura_c'
                        ? 'border-[#dc2626] bg-[#dc2626] text-white shadow-xs'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Factura ARCA Tipo C
                  </button>
                </div>

                {/* Campos fiscales si elige Factura C */}
                {invoiceType === 'factura_c' && (
                  <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2 animate-in fade-in">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Doc:</label>
                        <select
                          value={customerDocType}
                          onChange={(e) => setCustomerDocType(e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-1.5 text-xs font-bold"
                        >
                          <option value="DNI">DNI</option>
                          <option value="CUIT">CUIT</option>
                          <option value="CUIL">CUIL</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 block mb-0.5">N° Documento:</label>
                        <input
                          type="text"
                          value={customerDoc}
                          onChange={(e) => setCustomerDoc(e.target.value)}
                          placeholder="Ej. 35123456"
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-1.5 text-xs font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Razón Social / Nombre:</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Consumidor Final"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-1.5 text-xs font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pie Modal Cobro */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/90 flex gap-2">
              <button
                type="button"
                onClick={() => setChargeModalOpen(false)}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl text-xs hover:bg-gray-100 transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={processingSale}
                onClick={handleFinalizeSale}
                className="flex-2 bg-[#dc2626] hover:bg-red-700 disabled:opacity-50 text-white font-black py-3 rounded-2xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{processingSale ? 'Procesando...' : 'Confirmar Venta'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL RÁPIDO DE APERTURA DE CAJA SI ESTÁ CERRADA */}
      {openingCashModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleOpenRegister}
            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Apertura de Caja</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpeningCashModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Para empezar a cobrar en el punto de venta, abre la sesión de caja del día o turno.
            </p>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Fondo de Cambio Inicial (Opcional):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                <input
                  type="number"
                  step="any"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  placeholder="0.00 (puede iniciar en $0)"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dc2626] outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpeningCashModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-colors"
              >
                Abrir Caja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. MODAL SELECTOR Y BUSCADOR DE CLIENTES */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-800 flex flex-col max-h-[85vh]">
            {/* Cabecera Modal Clientes */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                    Seleccionar Cliente
                  </h3>
                  <p className="text-[11px] text-gray-500">Para fiado en cuenta corriente o comprobante</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickNewCustomerModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Nuevo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Buscador de Clientes */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, teléfono o DNI/CUIT..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Lista de Clientes */}
            <div className="p-3 overflow-y-auto flex-1 space-y-2">
              {/* Opción Desasignar / Consumidor Final */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerModalOpen(false);
                  toast.info('Asignado: Consumidor Final');
                }}
                className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                  !selectedCustomer
                    ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 font-bold'
                    : 'border-dashed border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Consumidor Final</p>
                    <p className="text-[10px] text-gray-400">Sin saldo deudor ni límite de crédito</p>
                  </div>
                </div>
                {!selectedCustomer && (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
              </button>

              {customers
                .filter((c) => {
                  const q = customerSearchQuery.toLowerCase();
                  return (
                    c.name.toLowerCase().includes(q) ||
                    (c.phone && c.phone.includes(q)) ||
                    (c.document_number && c.document_number.includes(q))
                  );
                })
                .map((c) => {
                  const isSelected = selectedCustomer?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerName(c.name);
                        setCustomerDoc(c.document_number || '');
                        setCustomerDocType(c.document_type || 'DNI');
                        setCustomerModalOpen(false);
                        toast.info(`Cliente asignado: ${c.name}`);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs'
                          : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-xs text-gray-900 dark:text-white truncate">
                            {c.name}
                          </p>
                          {c.current_balance > 0 ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                              Deuda: {formatMoney(c.current_balance)}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              Al día
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {c.document_type}: {c.document_number || 'S/D'} • Tel: {c.phone || 'S/T'}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Límite: {formatMoney(c.credit_limit)} | Disponible: {formatMoney(Math.max(0, c.credit_limit - c.current_balance))}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {isSelected ? (
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-amber-600 hover:underline">
                            Elegir
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL RÁPIDO PARA CREAR CLIENTE DIRECTO DESDE POS */}
      {quickNewCustomerModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleQuickCreateCustomer}
            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800 p-5 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Nuevo Cliente</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickNewCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Nombre / Razón Social *:
              </label>
              <input
                type="text"
                required
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                placeholder="Ej. Kiosco Belgrano"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Teléfono (WhatsApp):
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="54911..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  DNI / CUIT:
                </label>
                <input
                  type="text"
                  value={newCustDoc}
                  onChange={(e) => setNewCustDoc(e.target.value)}
                  placeholder="20-3..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Límite de Crédito ($):
              </label>
              <input
                type="number"
                step="any"
                value={newCustCreditLimit}
                onChange={(e) => setNewCustCreditLimit(e.target.value)}
                placeholder="150000"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickNewCustomerModal(false)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
              >
                Guardar y Asignar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 7. MODALES AUXILIARES: CÁMARA, PIN Y TICKET */}
      <POSCameraScanner
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onScan={handleBarcodeScanned}
      />

      <POSPinModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        currentUserId={currentUser.id}
        onAuthenticate={(user) => {
          setCurrentUser(user);
          toast.success(`👋 Cajero activo: ${user.full_name}`);
        }}
      />

      <POSReceiptModal
        sale={lastSaleResult}
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setLastSaleResult(null);
        }}
      />

      <POSReturnModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        onSuccess={(returnRecord) => {
          setLastReturnResult(returnRecord);
          setReturnReceiptModalOpen(true);
          refreshCashRegister();
          refreshCustomers();
        }}
        cashierName={currentUser.full_name}
        activeCashRegisterId={cashRegister?.status === 'open' ? cashRegister.id : undefined}
      />

      <POSReturnReceiptModal
        returnRecord={lastReturnResult}
        isOpen={returnReceiptModalOpen}
        onClose={() => {
          setReturnReceiptModalOpen(false);
          setLastReturnResult(null);
        }}
      />

      <CashReceiptModal
        isOpen={cashReceiptModalOpen}
        onClose={() => {
          setCashReceiptModalOpen(false);
          setCashReceiptSession(null);
        }}
        session={cashReceiptSession}
        mode={cashReceiptMode}
      />
    </div>
  );
}
