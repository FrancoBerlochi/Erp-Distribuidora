import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface CartRequestItem {
  id: string;
  quantity: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      address,
      city,
      deliveryMethod,
      paymentMethod = 'efectivo',
      items,
    } = body;

    // 1. Validaciones básicas de entrada
    if (!name || !email || !phone || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Datos incompletos para procesar el pedido.' },
        { status: 400 }
      );
    }

    const shippingAddress = deliveryMethod === 'pickup'
      ? 'Retiro en Local Central (Av. Principal 1234)'
      : `${address || ''}, ${city || ''}`;

    // 2. Obtener productos de la base de datos para validar precios y stock autoritativos
    const productIds = items.map((it: CartRequestItem) => it.id);
    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('id, name, price, stock, wholesale_price, wholesale_min_qty')
      .in('id', productIds);

    if (dbError || !dbProducts) {
      return NextResponse.json(
        { error: 'Error al consultar disponibilidad de productos en el servidor.' },
        { status: 500 }
      );
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // 3. Validar stock y calcular total seguro en el servidor
    let calculatedTotal = 0;
    const orderItemsToInsert: {
      product_id: string;
      quantity: number;
      price_at_purchase: number;
    }[] = [];

    const stockUpdates: { id: string; newStock: number; qty: number; currentStock: number }[] = [];

    for (const item of items) {
      const prod = productMap.get(item.id);
      if (!prod) {
        return NextResponse.json(
          { error: `El producto ID ${item.id} no existe en el catálogo.` },
          { status: 400 }
        );
      }

      const qty = Math.max(1, Number(item.quantity) || 1);
      if (prod.stock < qty) {
        return NextResponse.json(
          { error: `Stock insuficiente para "${prod.name}". Disponible: ${prod.stock}, Solicitado: ${qty}.` },
          { status: 400 }
        );
      }

      // Determinar precio autoritativo (considerando precio mayorista si califica)
      let unitPrice = Number(prod.price) || 0;
      const minQty = prod.wholesale_min_qty && prod.wholesale_min_qty > 0 ? prod.wholesale_min_qty : 6;
      if (prod.wholesale_price && Number(prod.wholesale_price) > 0 && qty >= minQty) {
        unitPrice = Number(prod.wholesale_price);
      }

      calculatedTotal += unitPrice * qty;
      orderItemsToInsert.push({
        product_id: prod.id,
        quantity: qty,
        price_at_purchase: unitPrice,
      });

      stockUpdates.push({
        id: prod.id,
        newStock: Math.max(0, prod.stock - qty),
        qty,
        currentStock: prod.stock,
      });
    }

    // 4. Crear la Orden en Supabase
    const orderCode = `WEB-${Date.now().toString().slice(-6)}`;
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim(),
          shipping_address: shippingAddress,
          total_amount: calculatedTotal,
          status: 'pending',
          mp_payment_id: orderCode,
          channel: 'web',
          payment_method: paymentMethod,
        },
      ])
      .select()
      .single();

    if (orderError || !orderData) {
      return NextResponse.json(
        { error: `Error creando la orden: ${orderError?.message || 'Fallo desconocido'}` },
        { status: 500 }
      );
    }

    // 5. Insertar los ítems de la orden
    const itemsPayload = orderItemsToInsert.map((it) => ({
      ...it,
      order_id: orderData.id,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
    if (itemsError) {
      console.warn('[CHECKOUT_API] Error guardando order_items:', itemsError.message);
    }

    // 6. Descontar stock y registrar Kardex de auditoría
    for (const update of stockUpdates) {
      try {
        await supabase.from('products').update({ stock: update.newStock }).eq('id', update.id);
        await supabase.from('stock_movements').insert([
          {
            product_id: update.id,
            type: 'sale_web',
            quantity: update.qty,
            previous_stock: update.currentStock,
            new_stock: update.newStock,
            reference_id: orderData.id,
          },
        ]);
      } catch (stockErr: any) {
        console.warn(`[CHECKOUT_API] Error en stock de producto ${update.id}:`, stockErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: orderData.id,
      orderCode,
      totalAmount: calculatedTotal,
      order: orderData,
    });
  } catch (err: any) {
    console.error('[CHECKOUT_API] Error inesperado:', err);
    return NextResponse.json(
      { error: err.message || 'Error interno al procesar el pedido.' },
      { status: 500 }
    );
  }
}
