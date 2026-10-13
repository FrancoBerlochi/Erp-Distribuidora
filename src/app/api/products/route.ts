import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: 'Variables de entorno de Supabase no configuradas en el servidor.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all'; // 'all' | 'admin' | 'discounted'

  const serverClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    let query = serverClient.from('products').select('*');

    if (type === 'all') {
      query = query.gt('stock', 0).order('created_at', { ascending: false });
    } else if (type === 'discounted') {
      query = query
        .gt('stock', 0)
        .gt('discount_percentage', 0)
        .order('discount_percentage', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      // Reintento sin order por si no existe created_at
      const fallbackQuery = type === 'all'
        ? serverClient.from('products').select('*').gt('stock', 0)
        : type === 'discounted'
          ? serverClient.from('products').select('*').gt('stock', 0).gt('discount_percentage', 0)
          : serverClient.from('products').select('*');

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }
      return NextResponse.json(fallbackData || []);
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en el servidor' }, { status: 500 });
  }
}
