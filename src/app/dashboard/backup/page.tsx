/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileJson, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Package, 
  Users, 
  Truck, 
  Receipt, 
  RefreshCw,
  HardDrive,
  FileCheck,
  Layers,
  ArrowDownToLine,
  Info
} from 'lucide-react';
import { 
  exportFullBackupJSON, 
  exportAuditMasterExcel, 
  exportModuleData, 
  validateBackupJSON, 
  restoreBackupFromJSON, 
  getLastBackupInfo, 
  LastBackupInfo, 
  DistribuidoraBackupPayload, 
  RestoreResult 
} from '@/lib/backup-service';

export default function BackupPage() {
  const [lastBackup, setLastBackup] = useState<LastBackupInfo | null>(null);
  const [exportingJSON, setExportingJSON] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [exportingModule, setExportingModule] = useState<string | null>(null);

  // Estados de Restauración
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewPayload, setPreviewPayload] = useState<DistribuidoraBackupPayload | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'upsert' | 'skip_existing'>('upsert');
  const [restoring, setRestoring] = useState<boolean>(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshLastBackupInfo();
  }, []);

  const refreshLastBackupInfo = () => {
    const info = getLastBackupInfo();
    setLastBackup(info);
  };

  const handleExportJSON = async () => {
    setExportingJSON(true);
    try {
      await exportFullBackupJSON();
      refreshLastBackupInfo();
    } catch (err) {
      console.error('Error exportando JSON:', err);
      alert('Ocurrió un error al generar la copia JSON.');
    } finally {
      setExportingJSON(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await exportAuditMasterExcel();
    } catch (err) {
      console.error('Error exportando Excel:', err);
      alert('Ocurrió un error al generar la auditoría en Excel.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportModule = async (
    mod: 'products' | 'customers' | 'suppliers' | 'orders',
    format: 'xlsx' | 'csv'
  ) => {
    setExportingModule(`${mod}-${format}`);
    try {
      await exportModuleData(mod, format);
    } catch (err) {
      console.error(`Error exportando ${mod}:`, err);
    } finally {
      setExportingModule(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationError(null);
    setPreviewPayload(null);
    setRestoreResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = validateBackupJSON(content);
      if (res.valid && res.payload) {
        setPreviewPayload(res.payload);
      } else {
        setValidationError(res.error || 'Archivo inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!previewPayload) return;

    const confirmPrompt = window.confirm(
      '¿Estás seguro de que deseas restaurar esta copia de seguridad? Se sincronizarán los productos, clientes, deudas y ventas en el sistema.'
    );
    if (!confirmPrompt) return;

    setRestoring(true);
    try {
      const result = await restoreBackupFromJSON(previewPayload, restoreMode);
      setRestoreResult(result);
      if (result.success) {
        refreshLastBackupInfo();
      }
    } catch (err: any) {
      setRestoreResult({
        success: false,
        message: `Error al procesar la restauración: ${err.message}`,
        stats: { products: 0, customers: 0, suppliers: 0, orders: 0, returns: 0 },
        errors: [err.message],
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleResetRestore = () => {
    setSelectedFile(null);
    setPreviewPayload(null);
    setValidationError(null);
    setRestoreResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Copia de Seguridad y Exportación Masiva
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Respaldo total de la base de datos comercial, auditoría en Excel y recuperación de contingencia
            </p>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportJSON}
            disabled={exportingJSON}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {exportingJSON ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="w-4 h-4" />
            )}
            <span>{exportingJSON ? 'Generando Backup...' : 'Descargar Backup (.json)'}</span>
          </button>
        </div>
      </div>

      {/* Banner de Estado y Salud del Respaldo */}
      {lastBackup ? (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          lastBackup.daysAgo <= 3
            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
            : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
              lastBackup.daysAgo <= 3 ? 'bg-emerald-600' : 'bg-amber-500'
            }`}>
              {lastBackup.daysAgo <= 3 ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {lastBackup.daysAgo === 0
                    ? 'Copia de seguridad realizada hoy'
                    : `Última copia realizada hace ${lastBackup.daysAgo} ${lastBackup.daysAgo === 1 ? 'día' : 'días'}`}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  lastBackup.daysAgo <= 3
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                }`}>
                  {lastBackup.daysAgo <= 3 ? 'Estado: Protegido' : 'Recomendado actualizar'}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-2">
                <span>{lastBackup.filename}</span>
                <span>•</span>
                <span>{formatBytes(lastBackup.sizeBytes)}</span>
                <span>•</span>
                <span>{lastBackup.metadata.total_products} productos</span>
                <span>•</span>
                <span>{lastBackup.metadata.total_customers} clientes</span>
                <span>•</span>
                <span>{lastBackup.metadata.total_orders} ventas</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleExportJSON}
            disabled={exportingJSON}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex-shrink-0"
          >
            Actualizar Respaldo
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Aún no has generado una copia de seguridad
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300">
                Tus datos de catálogo, clientes, saldos fiados y ventas están únicamente en esta base. Te recomendamos descargar una copia maestra ahora.
              </div>
            </div>
          </div>
          <button
            onClick={handleExportJSON}
            disabled={exportingJSON}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex-shrink-0 transition-all shadow-sm"
          >
            Crear Primera Copia
          </button>
        </div>
      )}

      {/* Sección 1: Dos Grandes Pilares de Respaldo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pilar 1: Respaldo Completo JSON */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileJson className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                100% Cifrado y Fiel
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Copia Maestra de Contingencia (.json)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Descarga un archivo con toda la información viva del negocio: inventario, costos, precios mayoristas, promociones, cuentas corrientes, fiados, proveedores, órdenes de compra y arqueos de caja.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <div className="font-semibold text-gray-800 dark:text-gray-200">¿Para qué sirve?</div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Permite restaurar el sistema completo en otra computadora, recuperarse ante fallas de disco o migrar sin perder ningún dato.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportJSON}
            disabled={exportingJSON}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {exportingJSON ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{exportingJSON ? 'Generando archivo...' : 'Descargar Respaldo Maestro (.json)'}</span>
          </button>
        </div>

        {/* Pilar 2: Mega Planilla de Auditoría Excel */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                6 Hojas Independientes
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Mega Planilla de Auditoría Contable (.xlsx)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Genera un único libro de Excel estructurado para control administrativo y contable. Incluye Resumen de Capital, Inventario, Clientes con deuda, Proveedores, Ventas y Devoluciones.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <div className="font-semibold text-gray-800 dark:text-gray-200">Hojas contenidas en el archivo:</div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <span>• 1. Resumen General</span>
                <span>• 2. Inventario y Precios</span>
                <span>• 3. Clientes y Fiados</span>
                <span>• 4. Proveedores</span>
                <span>• 5. Historial de Ventas</span>
                <span>• 6. Devoluciones</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {exportingExcel ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>{exportingExcel ? 'Compilando Planilla...' : 'Descargar Auditoría Contable (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Sección 2: Exportaciones Rápidas por Módulo (1 Clic) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <div className="border-b border-gray-100 dark:border-gray-800/80 pb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Exportaciones Rápidas por Módulo (1 Clic)</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Descarga individual de secciones específicas en formato Excel o CSV para planillas operativas
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Módulo 1: Catálogo de Productos */}
          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Productos</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Precios, stock y costos</div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleExportModule('products', 'xlsx')}
                disabled={exportingModule === 'products-xlsx'}
                className="flex-1 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center"
              >
                .XLSX
              </button>
              <button
                onClick={() => handleExportModule('products', 'csv')}
                disabled={exportingModule === 'products-csv'}
                className="flex-1 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center"
              >
                .CSV
              </button>
            </div>
          </div>

          {/* Módulo 2: Clientes y Saldos Fiados */}
          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Clientes / Fiado</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Contactos y saldos</div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleExportModule('customers', 'xlsx')}
                disabled={exportingModule === 'customers-xlsx'}
                className="flex-1 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center"
              >
                .XLSX
              </button>
              <button
                onClick={() => handleExportModule('customers', 'csv')}
                disabled={exportingModule === 'customers-csv'}
                className="flex-1 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center"
              >
                .CSV
              </button>
            </div>
          </div>

          {/* Módulo 3: Proveedores */}
          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Proveedores</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Directorio y términos</div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleExportModule('suppliers', 'xlsx')}
                disabled={exportingModule === 'suppliers-xlsx'}
                className="flex-1 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center"
              >
                .XLSX
              </button>
              <button
                onClick={() => handleExportModule('suppliers', 'csv')}
                disabled={exportingModule === 'suppliers-csv'}
                className="flex-1 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center"
              >
                .CSV
              </button>
            </div>
          </div>

          {/* Módulo 4: Ventas y Comprobantes */}
          <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Historial Ventas</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Tickets y comprobantes</div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleExportModule('orders', 'xlsx')}
                disabled={exportingModule === 'orders-xlsx'}
                className="flex-1 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center"
              >
                .XLSX
              </button>
              <button
                onClick={() => handleExportModule('orders', 'csv')}
                disabled={exportingModule === 'orders-csv'}
                className="flex-1 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all text-center"
              >
                .CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sección 3: Asistente de Restauración y Recuperación */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm space-y-5">
        <div className="border-b border-gray-100 dark:border-gray-800/80 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-orange-500" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Restauración de Contingencia desde Copia de Seguridad
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              Formatos soportados: .json
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Carga un archivo de respaldo generado por Distribuidora Express para recuperar o sincronizar la información del negocio
          </p>
        </div>

        {/* Zona de Selección de Archivo */}
        {!previewPayload && !restoreResult && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer transition-all bg-gray-50/50 dark:bg-gray-800/30 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
              Arrastra tu archivo <span className="text-blue-600">.json</span> de respaldo o haz clic para explorar
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              El sistema validará la estructura y mostrará un resumen detallado antes de aplicar cambios
            </div>
          </div>
        )}

        {/* Error de validación */}
        {validationError && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
            <button
              onClick={handleResetRestore}
              className="underline font-bold text-red-900 dark:text-red-200 flex-shrink-0"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Previsualización del Respaldo antes de Restaurar */}
        {previewPayload && !restoreResult && (
          <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200 dark:border-blue-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    Archivo de Respaldo Verificado y Listo
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Generado el {new Date(previewPayload.timestamp).toLocaleDateString('es-AR')} a las {new Date(previewPayload.timestamp).toLocaleTimeString('es-AR')}
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-mono font-bold self-start sm:self-auto">
                Versión {previewPayload.version}
              </span>
            </div>

            {/* Badges de Contenido Detectado */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 text-center">
                <div className="text-lg font-black text-gray-900 dark:text-white font-mono">
                  {previewPayload.data.products?.length || 0}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Productos</div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 text-center">
                <div className="text-lg font-black text-gray-900 dark:text-white font-mono">
                  {previewPayload.data.customers?.length || 0}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Clientes</div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 text-center">
                <div className="text-lg font-black text-gray-900 dark:text-white font-mono">
                  {previewPayload.data.suppliers?.length || 0}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Proveedores</div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 text-center">
                <div className="text-lg font-black text-gray-900 dark:text-white font-mono">
                  {previewPayload.data.orders?.length || 0}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Ventas</div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 text-center col-span-2 sm:col-span-1">
                <div className="text-lg font-black text-gray-900 dark:text-white font-mono">
                  {previewPayload.data.returns?.length || 0}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Devoluciones</div>
              </div>
            </div>

            {/* Selector de Modo de Restauración */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Selecciona la modalidad de restauración:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label
                  onClick={() => setRestoreMode('upsert')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    restoreMode === 'upsert'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-950 dark:text-blue-100 font-medium shadow-sm'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'upsert'}
                    onChange={() => setRestoreMode('upsert')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <div className="font-bold">Fusionar y Actualizar (Recomendado)</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Actualiza precios y datos de artículos existentes y añade los que falten sin borrar nada.
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setRestoreMode('skip_existing')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    restoreMode === 'skip_existing'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-950 dark:text-blue-100 font-medium shadow-sm'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'skip_existing'}
                    onChange={() => setRestoreMode('skip_existing')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <div className="font-bold">Solo Agregar Faltantes</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      No modifica ningún dato ya existente. Solo importa artículos y clientes nuevos.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Acciones de Confirmación */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleResetRestore}
                disabled={restoring}
                className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={restoring}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {restoring ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{restoring ? 'Restaurando Base de Datos...' : 'Confirmar y Restaurar Datos'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Reporte de Resultados de Restauración */}
        {restoreResult && (
          <div className={`p-5 rounded-2xl border space-y-3 ${
            restoreResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/80'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {restoreResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {restoreResult.message}
                </div>
              </div>
              <button
                onClick={handleResetRestore}
                className="text-xs font-bold px-3 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                Listo / Cerrar
              </button>
            </div>

            {restoreResult.success && (
              <div className="flex flex-wrap gap-2 text-xs pt-1">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-semibold">
                  ✓ {restoreResult.stats.products} productos sincronizados
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-semibold">
                  ✓ {restoreResult.stats.customers} clientes actualizados
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-semibold">
                  ✓ {restoreResult.stats.suppliers} proveedores verificados
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-semibold">
                  ✓ {restoreResult.stats.orders} ventas restauradas
                </span>
              </div>
            )}

            {restoreResult.errors.length > 0 && (
              <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                <div className="font-semibold mb-1">Avisos durante la sincronización:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  {restoreResult.errors.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
