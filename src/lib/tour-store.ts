import { create } from 'zustand';

export interface TourStep {
  id: string;
  category: string;
  categoryColor: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'orange';
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  route: string;
  highlights: Array<{
    title: string;
    desc: string;
    icon: string;
  }>;
  badge?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'orders',
    category: 'Ventas & Operaciones',
    categoryColor: 'blue',
    title: 'Pipeline de Pedidos en Tiempo Real',
    subtitle: 'Gestión unificada de ventas online y mostrador',
    description: 'Centralizá todas las compras que ingresan desde la tienda web y ventas presenciales. Cada pedido avanza por un flujo claro con notificaciones sonoras y sincronización inmediata sin recargar.',
    iconName: 'LayoutDashboard',
    route: '/dashboard',
    badge: 'Módulo Principal',
    highlights: [
      {
        icon: 'RefreshCw',
        title: 'Sincronización en vivo',
        desc: 'Los pedidos web impactan al segundo mediante Supabase Realtime.',
      },
      {
        icon: 'MessageSquare',
        title: 'Integración con WhatsApp',
        desc: 'Generá mensajes prediseñados y avisale al cliente el estado de su paquete con un clic.',
      },
      {
        icon: 'CheckCircle2',
        title: 'Gestión por etapas',
        desc: 'Pipeline visual de Pendiente → En Preparación → En Reparto → Entregado.',
      },
    ],
  },
  {
    id: 'pos',
    category: 'Operaciones de Caja',
    categoryColor: 'emerald',
    title: 'Punto de Venta (POS) Ultrarrápido',
    subtitle: 'Cobro ágil con lector de código de barras y cámara',
    description: 'Diseñado para atender colas de clientes a máxima velocidad. Funciona tanto con pistolas lectoras USB estándar como con la cámara del celular o tablet.',
    iconName: 'ScanBarcode',
    route: '/dashboard/pos',
    badge: 'Caja Rápida',
    highlights: [
      {
        icon: 'Barcode',
        title: 'Búsqueda por código o nombre',
        desc: 'Escanéá o escribí parte del producto; el autocompletado lo suma de inmediato.',
      },
      {
        icon: 'CreditCard',
        title: 'Cobros combinados',
        desc: 'Cobrá con Efectivo, QR Mercado Pago, Tarjetas, Transferencia o Cuenta Corriente (Fiado).',
      },
      {
        icon: 'Printer',
        title: 'Impresión de ticket térmico',
        desc: 'Compatible con comandas e impresoras de rollo de 58mm y 80mm.',
      },
    ],
  },
  {
    id: 'caja',
    category: 'Control Financiero',
    categoryColor: 'amber',
    title: 'Gestión de Caja y Arqueo Blindado',
    subtitle: 'Aperturas de turno, egresos y cierre guiado',
    description: 'Protegé el efectivo de tu local con trazabilidad completa. Cada cajero abre su turno con fondo inicial y registra gastos de caja chica o pagos a fleteros.',
    iconName: 'Banknote',
    route: '/dashboard/caja',
    badge: 'Seguridad de Efectivo',
    highlights: [
      {
        icon: 'ShieldCheck',
        title: 'Arqueo ciego o asistido',
        desc: 'El operador cuenta los billetes físicos y el sistema calcula automáticamente sobrantes o faltantes.',
      },
      {
        icon: 'ArrowDownRight',
        title: 'Egresos categorizados',
        desc: 'Justificá retiros para adelantos de sueldo, viáticos o compras de insumos.',
      },
      {
        icon: 'Receipt',
        title: 'Historial de turnos',
        desc: 'Auditoría histórica con fecha, hora y responsable de cada cierre.',
      },
    ],
  },
  {
    id: 'clientes',
    category: 'Cuentas Corrientes',
    categoryColor: 'purple',
    title: 'Clientes, Fiado y Límites de Crédito',
    subtitle: 'Cuentas corrientes organizadas sin libretas de papel',
    description: 'Fidelizá a tus clientes recurrentes y comerciantes dándoles cuenta corriente con total tranquilidad. Sabé al instante quién te debe, cuánto y desde cuándo.',
    iconName: 'Users',
    route: '/dashboard/clientes',
    badge: 'Cobranzas',
    highlights: [
      {
        icon: 'AlertTriangle',
        title: 'Límite de crédito estricto',
        desc: 'Bloqueo preventivo en el POS si el cliente supera su tope de fiado acordado.',
      },
      {
        icon: 'Send',
        title: 'Recordatorios por WhatsApp',
        desc: 'Enviá con un botón el detalle de la deuda y el link de pago directo.',
      },
      {
        icon: 'History',
        title: 'Historial de pagos parciales',
        desc: 'Registrá entregas de dinero a cuenta con recibos descargables.',
      },
    ],
  },
  {
    id: 'rentabilidad',
    category: 'Métricas & Finanzas',
    categoryColor: 'indigo',
    title: 'Rentabilidad, Costos y CMV',
    subtitle: 'Margen bruto, utilidad neta y costo de ventas',
    description: 'Dejá de adivinar si estás ganando dinero. El sistema analiza el Costo de Mercadería Vendida (CMV) y te muestra la utilidad neta real de cada artículo y categoría.',
    iconName: 'LineChart',
    route: '/dashboard/rentabilidad',
    badge: 'Inteligencia de Negocio',
    highlights: [
      {
        icon: 'Percent',
        title: 'Margen porcentual y en pesos',
        desc: 'Detectá al instante qué productos tienen bajo margen y cuáles son tus mejores fuentes de ganancia.',
      },
      {
        icon: 'TrendingUp',
        title: 'Utilidad neta acumulada',
        desc: 'Métricas de ganancia diaria, semanal y mensual descontando promociones y descuentos.',
      },
      {
        icon: 'Filter',
        title: 'Filtro por rubro',
        desc: 'Compará la rentabilidad de Almacén vs. Limpieza vs. Perfumería.',
      },
    ],
  },
  {
    id: 'proveedores',
    category: 'Abastecimiento',
    categoryColor: 'orange',
    title: 'Proveedores y Reposición de Stock',
    subtitle: 'Alertas de stock crítico y pedidos automáticos',
    description: 'Evitá quiebres de stock en tus productos estrella. El ERP calcula automáticamente los faltantes por debajo del stock mínimo y te arma la lista de compra para tus distribuidores.',
    iconName: 'Truck',
    route: '/dashboard/proveedores',
    badge: 'Stock Crítico',
    highlights: [
      {
        icon: 'AlertCircle',
        title: 'Semáforo de reposición',
        desc: 'Identificación visual de productos con stock agotado o en nivel crítico.',
      },
      {
        icon: 'MessageSquare',
        title: 'Pedido WhatsApp al proveedor',
        desc: 'El sistema redacta el texto con los bultos necesarios y abre el chat del proveedor listo para enviar.',
      },
      {
        icon: 'BookOpen',
        title: 'Agenda de proveedores',
        desc: 'Días de entrega, teléfonos y condiciones comerciales organizadas.',
      },
    ],
  },
  {
    id: 'vencimientos',
    category: 'Trazabilidad & Mermas',
    categoryColor: 'rose',
    title: 'Lotes y Control de Vencimientos (FEFO)',
    subtitle: 'Rotación inteligente para evitar mermas de mercadería',
    description: 'Cero pérdidas por productos vencidos en estanterías. El algoritmo FEFO (First Expired, First Out) te indica qué lote tenés que vender primero y te avisa con anticipación.',
    iconName: 'CalendarClock',
    route: '/dashboard/vencimientos',
    badge: 'Control FEFO',
    highlights: [
      {
        icon: 'Clock',
        title: 'Semáforo de caducidad',
        desc: 'Verde (OK), Amarillo (vence en 30 días) y Rojo (crítico o vencido).',
      },
      {
        icon: 'Flame',
        title: 'Liquidación preventiva',
        desc: 'Creá ofertas relámpago con descuento especial para rotar lotes próximos a vencer.',
      },
      {
        icon: 'Layers',
        title: 'Trazabilidad de lotes',
        desc: 'Identificá qué partida ingresó y a qué clientes se les entregó.',
      },
    ],
  },
  {
    id: 'etiquetas',
    category: 'Cartelería & Góndolas',
    categoryColor: 'cyan',
    title: 'Etiquetas de Góndola y Códigos de Barra',
    subtitle: 'Impresión masiva de precios y promociones',
    description: 'Mantené las góndolas de tu local siempre actualizadas. Generá e imprimí etiquetas con precios, códigos de barra, descripción y carteles llamativos para ofertas destacadas.',
    iconName: 'Tag',
    route: '/dashboard/etiquetas',
    badge: 'Impresión Masiva',
    highlights: [
      {
        icon: 'Grid',
        title: 'Formatos troquelados y térmicos',
        desc: 'Plantillas listas para hojas A4 adhesivas o impresoras térmicas de etiquetas continuas.',
      },
      {
        icon: 'Barcode',
        title: 'Generador de códigos de barra',
        desc: 'Código EAN-13 o Code-128 nítido y legible por cualquier lector.',
      },
      {
        icon: 'Zap',
        title: 'Selección masiva',
        desc: 'Filtrá por categoría o marca e imprimí 50 etiquetas con un solo clic.',
      },
    ],
  },
  {
    id: 'ecommerce',
    category: 'Canal Digital',
    categoryColor: 'blue',
    title: 'Tienda Online Sincronizada 24/7',
    subtitle: 'Catálogo web B2B y B2C con precios mayoristas y Mercado Pago',
    description: 'Expandí tus ventas con un portal web propio conectado al mismo inventario del local. Si vendés en el mostrador, el stock se descuenta automáticamente en la web y viceversa.',
    iconName: 'Globe',
    route: '/',
    badge: 'Omnicanal',
    highlights: [
      {
        icon: 'ShoppingCart',
        title: 'Reglas de precio mayorista',
        desc: 'Descuentos automáticos al llevar 3, 6 o más unidades por bulto cerrado.',
      },
      {
        icon: 'CreditCard',
        title: 'Checkout con Mercado Pago',
        desc: 'Cobros con tarjetas, dinero en cuenta o transferencia sin fricción.',
      },
      {
        icon: 'Sliders',
        title: 'Banners y vitrinas desde el panel',
        desc: 'Cambiá promociones, ofertas del día y categorías destacadas sin tocar código.',
      },
    ],
  },
];

interface ErpTourState {
  isOpen: boolean;
  currentStep: number;
  openTour: (stepIndex?: number) => void;
  closeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (stepIndex: number) => void;
}

export const useErpTourStore = create<ErpTourState>((set) => ({
  isOpen: false,
  currentStep: 0,
  openTour: (stepIndex = 0) => set({ isOpen: true, currentStep: stepIndex }),
  closeTour: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('distribuidora_erp_tour_seen', 'true');
      } catch {}
    }
    set({ isOpen: false });
  },
  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, TOUR_STEPS.length - 1),
    })),
  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),
  setStep: (stepIndex) =>
    set({
      currentStep: Math.max(0, Math.min(stepIndex, TOUR_STEPS.length - 1)),
    }),
}));
