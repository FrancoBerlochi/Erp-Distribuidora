export type ErpModuleId =
  | 'pos'
  | 'caja'
  | 'clientes'
  | 'proveedores'
  | 'vencimientos'
  | 'etiquetas'
  | 'ecommerce'
  | 'rentabilidad'
  | 'reportes'
  | 'backup';

export type ErpPlanId = 'basico' | 'profesional' | 'enterprise' | 'custom';

export interface ErpModuleDefinition {
  id: ErpModuleId;
  name: string;
  shortDescription: string;
  description: string;
  category: 'operaciones' | 'inventario' | 'ventas_online' | 'gerencia';
  routePrefixes: string[];
  suggestedAddonPriceUSD: number;
  iconName: string;
  adminOnly?: boolean;
}

export const ERP_MODULES: Record<ErpModuleId, ErpModuleDefinition> = {
  pos: {
    id: 'pos',
    name: 'Punto de Venta (POS)',
    shortDescription: 'Caja rápida y escáner de barras',
    description: 'Terminal de ventas ultrarrápida con lector de código de barras, cámara y emisión de tickets.',
    category: 'operaciones',
    routePrefixes: ['/dashboard/pos'],
    suggestedAddonPriceUSD: 6,
    iconName: 'ScanBarcode',
  },
  caja: {
    id: 'caja',
    name: 'Gestión de Caja',
    shortDescription: 'Aperturas, egresos y cierre guiado',
    description: 'Control de turnos, retiros, ingresos extraordinarios y arqueos ciegos o guiados.',
    category: 'operaciones',
    routePrefixes: ['/dashboard/caja'],
    suggestedAddonPriceUSD: 4,
    iconName: 'Banknote',
  },
  clientes: {
    id: 'clientes',
    name: 'Cuentas Corrientes y Fiado',
    shortDescription: 'Cuentas corrientes, deudas y cobranzas',
    description: 'Ficha de clientes, límites de crédito fiado, historial de compras y registro de pagos parciales.',
    category: 'operaciones',
    routePrefixes: ['/dashboard/clientes'],
    suggestedAddonPriceUSD: 10,
    iconName: 'Users',
  },
  proveedores: {
    id: 'proveedores',
    name: 'Proveedores y Reposición',
    shortDescription: 'Compras, stock crítico y WhatsApp',
    description: 'Directorio de proveedores, cálculo de stock mínimo y generación de pedidos automáticos vía WhatsApp.',
    category: 'inventario',
    routePrefixes: ['/dashboard/proveedores'],
    suggestedAddonPriceUSD: 10,
    iconName: 'Truck',
    adminOnly: true,
  },
  vencimientos: {
    id: 'vencimientos',
    name: 'Lotes y Vencimientos (FEFO)',
    shortDescription: 'Control de caducidad y alertas FEFO',
    description: 'Trazabilidad por lote y fecha de vencimiento. Algoritmo FEFO para rotación óptima de mercadería perecedera.',
    category: 'inventario',
    routePrefixes: ['/dashboard/vencimientos'],
    suggestedAddonPriceUSD: 12,
    iconName: 'CalendarClock',
  },
  etiquetas: {
    id: 'etiquetas',
    name: 'Etiquetas de Góndola',
    shortDescription: 'Precios, códigos de barra y ofertas',
    description: 'Generador e impresor masivo de etiquetas térmicas y de góndola con códigos de barra y cartelería de ofertas.',
    category: 'inventario',
    routePrefixes: ['/dashboard/etiquetas'],
    suggestedAddonPriceUSD: 8,
    iconName: 'Tag',
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'Tienda Online & E-commerce',
    shortDescription: 'Catálogo web, carrito y Mercado Pago',
    description: 'Portal público de venta online para clientes B2C y B2B, checkout con Mercado Pago, banners y vitrinas personalizables.',
    category: 'ventas_online',
    routePrefixes: [
      '/dashboard/banners',
      '/dashboard/categorias',
      '/dashboard/mas-vendidos',
      '/dashboard/pagina',
    ],
    suggestedAddonPriceUSD: 25,
    iconName: 'Globe',
    adminOnly: true,
  },
  rentabilidad: {
    id: 'rentabilidad',
    name: 'Rentabilidad Financiera & CMV',
    shortDescription: 'Márgenes de venta, CMV y utilidad',
    description: 'Cálculo analítico del Costo de Mercadería Vendida, margen de contribución real y utilidad neta por producto.',
    category: 'gerencia',
    routePrefixes: ['/dashboard/rentabilidad'],
    suggestedAddonPriceUSD: 15,
    iconName: 'LineChart',
    adminOnly: true,
  },
  reportes: {
    id: 'reportes',
    name: 'Reportes Gerenciales y Analítica',
    shortDescription: 'Facturación, medios de cobro y horas pico',
    description: 'Dashboards ejecutivos con gráficos de evolución de ventas, medios de pago más usados y mapa de calor de horarios.',
    category: 'gerencia',
    routePrefixes: ['/dashboard/reportes'],
    suggestedAddonPriceUSD: 10,
    iconName: 'BarChart3',
    adminOnly: true,
  },
  backup: {
    id: 'backup',
    name: 'Copia de Seguridad y Auditoría',
    shortDescription: 'Respaldos JSON y auditoría Excel',
    description: 'Exportación completa cifrada de la base de datos, descargas para Excel y auditoría de integridad.',
    category: 'gerencia',
    routePrefixes: ['/dashboard/backup'],
    suggestedAddonPriceUSD: 10,
    iconName: 'Database',
    adminOnly: true,
  },
};

// Rutas públicas que pertenecen estrictamente a la Tienda Online (E-commerce)
export const ECOMMERCE_PUBLIC_ROUTES = [
  '/',
  '/catalogo',
  '/cart',
  '/checkout',
  '/checkout/success',
  '/ofertas',
  '/productos',
];

export interface ErpPlanDefinition {
  id: ErpPlanId;
  name: string;
  tagline: string;
  description: string;
  suggestedMonthlyPriceUSD: number;
  badgeClass: string;
  includedModules: ErpModuleId[];
}

export const ERP_PLANS: Record<ErpPlanId, ErpPlanDefinition> = {
  basico: {
    id: 'basico',
    name: 'Plan Básico (POS)',
    tagline: 'Para almacenes, kioscos y locales comerciales',
    description: 'Incluye la gestión de productos, inventario base, caja diaria y la terminal rápida de Punto de Venta con emisión de comprobantes.',
    suggestedMonthlyPriceUSD: 29,
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    includedModules: ['pos', 'caja'],
  },
  profesional: {
    id: 'profesional',
    name: 'Plan Profesional (Distribuidora)',
    tagline: 'Para distribuidoras y mayoristas con mostrador y reparto',
    description: 'Agrega cuentas corrientes/fiados, compras a proveedores con reposición por WhatsApp, control de lotes/vencimientos FEFO e impresión de etiquetas.',
    suggestedMonthlyPriceUSD: 69,
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    includedModules: [
      'pos',
      'caja',
      'clientes',
      'proveedores',
      'vencimientos',
      'etiquetas',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Plan Enterprise (Suite Completa)',
    tagline: 'Para empresas omnicanal de gran volumen y control directivo',
    description: 'Todo incluido: Tienda E-commerce pública integrada con Mercado Pago, análisis de Rentabilidad y CMV, reportes avanzados y copias de seguridad.',
    suggestedMonthlyPriceUSD: 129,
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    includedModules: [
      'pos',
      'caja',
      'clientes',
      'proveedores',
      'vencimientos',
      'etiquetas',
      'ecommerce',
      'rentabilidad',
      'reportes',
      'backup',
    ],
  },
  custom: {
    id: 'custom',
    name: 'Plan Personalizado (A Medida)',
    tagline: 'Elige los módulos exactos que tu cliente necesita',
    description: 'Permite armar un presupuesto a medida combinando el núcleo base con los add-ons específicos seleccionados.',
    suggestedMonthlyPriceUSD: 0,
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    includedModules: [],
  },
};
