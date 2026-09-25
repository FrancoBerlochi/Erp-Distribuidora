/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Check, 
  Globe, 
  Store, 
  ExternalLink, 
  ShoppingBag, 
  X,
  Play
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { formatCurrency } from '@/lib/formatters';

export interface NotificationOrder {
  id: string;
  orderCode: string;
  customerName: string;
  channel: 'web' | 'pos';
  totalAmount: number;
  createdAt: string;
  isRead: boolean;
}

const READ_IDS_KEY = 'erp_bell_read_order_ids';
const SOUND_MUTED_KEY = 'erp_bell_sound_muted';
const SYNC_EVENT_NAME = 'erp_notifications_synced';
export const ORDERS_BROADCAST_CHANNEL = 'erp_orders_broadcast_channel';

// Singleton para prevenir doble sonido o doble toast si hay 2 campanas montadas (desktop + mobile)
let lastChimePlayedAt = 0;
let lastToastOrderCode = '';
let lastToastTime = 0;

/**
 * Sintetizador de audio nativo con Web Audio API (Chime de 2 tonos)
 */
function playChimeSound() {
  const now = Date.now();
  if (now - lastChimePlayedAt < 1000) return; // Debounce de 1s
  lastChimePlayedAt = now;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    // Primer tono (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, t);
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(0.25, t + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.35);

    // Segundo tono (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, t + 0.12);
    gain2.gain.setValueAtTime(0, t + 0.12);
    gain2.gain.linearRampToValueAtTime(0.3, t + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.12);
    osc2.stop(t + 0.6);
  } catch (err) {
    console.warn('[BELL_SOUND] No se pudo reproducir el timbre:', err);
  }
}

function getStoredReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function storeReadIds(set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    const arr = Array.from(set).slice(-150);
    localStorage.setItem(READ_IDS_KEY, JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
  } catch {}
}

export default function OrdersNotificationBell() {
  const [notifications, setNotifications] = useState<NotificationOrder[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Registro en memoria de órdenes ya conocidas para detectar nuevas llegadas
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);

  // Canal único por instancia para Supabase Realtime
  const channelNameRef = useRef<string>(`bell_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Desbloqueo del AudioContext en la primera interacción del usuario
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const dummy = new AudioCtx();
          dummy.resume().then(() => dummy.close());
        }
      } catch {}
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Función principal para sincronizar pedidos reales desde Supabase
  const syncOrdersWithSupabase = useCallback(async (isRealtimeTrigger = false) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, mp_payment_id, customer_name, channel, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(25);

      if (error || !data) return;

      const readIds = getStoredReadIds();

      // Mapear órdenes
      const mappedList: NotificationOrder[] = data.map((o) => {
        const orderCode = (o.mp_payment_id || o.id || '').slice(-6).toUpperCase();
        return {
          id: o.id,
          orderCode,
          customerName: o.customer_name || 'Consumidor',
          channel: o.channel === 'pos' ? 'pos' : 'web',
          totalAmount: Number(o.total_amount) || 0,
          createdAt: o.created_at || new Date().toISOString(),
          isRead: readIds.has(o.id),
        };
      });

      // Identificar si hay órdenes nuevas que no conocíamos en memoria
      const newOrders = data.filter((o) => !knownOrderIdsRef.current.has(o.id));

      if (isFirstFetchRef.current) {
        // En primera carga:
        data.forEach((o) => knownOrderIdsRef.current.add(o.id));

        // Si hay una orden reciente (< 5 minutos) y todavía no leída, avisar al usuario
        const recentUnread = mappedList.find((n) => {
          const ageMs = Date.now() - new Date(n.createdAt).getTime();
          return !n.isRead && ageMs < 5 * 60 * 1000;
        });

        if (recentUnread) {
          if (!isMutedRef.current) {
            playChimeSound();
          }
          toast.info(
            `🛎️ ¡Pedido ${recentUnread.channel === 'web' ? 'Web' : 'en Caja'} recibido! #${recentUnread.orderCode} (${formatCurrency(recentUnread.totalAmount)})`,
            { autoClose: 5000 }
          );
        }

        isFirstFetchRef.current = false;
      } else if (newOrders.length > 0 || isRealtimeTrigger) {
        // Orden nueva que acaba de llegar durante la sesión
        const newest = newOrders[0] || data[0];
        if (newest) {
          const code = (newest.mp_payment_id || newest.id || '').slice(-6).toUpperCase();
          const channelType = newest.channel === 'pos' ? 'en Caja' : 'Web';
          const amt = Number(newest.total_amount) || 0;

          if (!isMutedRef.current) {
            playChimeSound();
          }

          const now = Date.now();
          if (lastToastOrderCode !== code || now - lastToastTime > 2000) {
            lastToastOrderCode = code;
            lastToastTime = now;
            toast.info(
              `🛎️ ¡Nuevo pedido ${channelType} recibido! #${code} (${formatCurrency(amt)})`,
              { autoClose: 5000 }
            );
          }
        }

        data.forEach((o) => knownOrderIdsRef.current.add(o.id));
      }

      setNotifications(mappedList);
    } catch (err) {
      console.warn('[BELL] Error sincronizando pedidos:', err);
    }
  }, []);

  // 1. Cargar preferencias y escuchar sincronización entre campanas y BroadcastChannel
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const storedMuted = localStorage.getItem(SOUND_MUTED_KEY);
      if (storedMuted === 'true') {
        setIsMuted(true);
        isMutedRef.current = true;
      }

      const handleSync = () => {
        const readIds = getStoredReadIds();
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: readIds.has(n.id) }))
        );
      };

      window.addEventListener(SYNC_EVENT_NAME, handleSync);
      window.addEventListener('storage', handleSync);

      // Escuchar eventos entre pestañas
      let broadcast: BroadcastChannel | null = null;
      try {
        broadcast = new BroadcastChannel(ORDERS_BROADCAST_CHANNEL);
        broadcast.onmessage = () => {
          syncOrdersWithSupabase(true);
        };
      } catch {}

      return () => {
        window.removeEventListener(SYNC_EVENT_NAME, handleSync);
        window.removeEventListener('storage', handleSync);
        if (broadcast) broadcast.close();
      };
    }
  }, [syncOrdersWithSupabase]);

  // 2. Consulta inicial y Polling continuo cada 5 segundos + al cambiar de pestaña
  useEffect(() => {
    syncOrdersWithSupabase();

    const interval = setInterval(() => {
      syncOrdersWithSupabase();
    }, 5000);

    const handleFocus = () => syncOrdersWithSupabase();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [syncOrdersWithSupabase]);

  // 3. Suscripción en tiempo real a Supabase (Sub-segundo)
  useEffect(() => {
    const channelName = channelNameRef.current;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => {
          syncOrdersWithSupabase(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncOrdersWithSupabase]);

  // 4. Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMuted;
    setIsMuted(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SOUND_MUTED_KEY, String(next));
    }
    if (!next) {
      playChimeSound();
      toast.success('🔊 Sonido de campana activado');
    } else {
      toast.info('🔇 Sonido de campana silenciado');
    }
  };

  const handleTestSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    playChimeSound();
    toast.success('🛎️ Timbre de prueba reproducido');
  };

  const markAllAsRead = () => {
    const readIds = getStoredReadIds();
    notifications.forEach((n) => readIds.add(n.id));
    storeReadIds(readIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markSingleAsRead = (id: string) => {
    const readIds = getStoredReadIds();
    readIds.add(id);
    storeReadIds(readIds);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!mounted) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón Campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          unreadCount > 0
            ? 'bg-amber-500/10 border-amber-300 dark:border-amber-700/60 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        aria-label="Notificaciones de pedidos"
        title={unreadCount > 0 ? `${unreadCount} pedidos nuevos pendientes` : 'Sin pedidos pendientes'}
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />

        {/* Badge de contador rojo */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] text-[10px] font-black leading-none bg-red-600 text-white rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover / Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Cabecera del Dropdown */}
          <div className="p-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/40">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                Pedidos Recientes
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                  {unreadCount} nuevos
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Botón Probar Sonido */}
              <button
                onClick={handleTestSound}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                title="Probar sonido de campana"
              >
                <Play className="w-3.5 h-3.5" />
              </button>

              {/* Botón Silenciar / Activar Sonido */}
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                title={isMuted ? 'Activar sonido de campana' : 'Silenciar sonido'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
              </button>

              {/* Marcar todas como leídas */}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                  title="Marcar todas como leídas"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Listado de Notificaciones */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500 space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs font-medium">No hay notificaciones de pedidos recientes.</p>
                <p className="text-[10px]">Cuando ingrese una venta web o en caja, sonará y aparecerá aquí.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const timeAgo = formatTimeAgo(n.createdAt);
                return (
                  <div
                    key={n.id}
                    onClick={() => markSingleAsRead(n.id)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                      !n.isRead ? 'bg-amber-50/50 dark:bg-amber-950/25' : ''
                    }`}
                  >
                    {/* Badge Canal */}
                    <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${
                      n.channel === 'web'
                        ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400'
                        : 'bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400'
                    }`}>
                      {n.channel === 'web' ? <Globe className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold text-gray-900 dark:text-white truncate">
                          #{n.orderCode} &bull; {n.customerName}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                          {formatCurrency(n.totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          {n.channel === 'web' ? 'Pedido Tienda Online' : 'Venta Mostrador POS'}
                        </span>
                        <span>{timeAgo}</span>
                      </div>
                    </div>

                    {!n.isRead && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0 mt-2 shadow-xs animate-pulse" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pie de Popover con enlace al Dashboard */}
          <div className="p-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-center">
            <Link
              href="/dashboard"
              onClick={() => {
                setIsOpen(false);
                markAllAsRead();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
            >
              <span>Ver todos los pedidos en el Pipeline</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return 'Hace instantes';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} d`;
  } catch {
    return 'Reciente';
  }
}
