import { NextResponse } from 'next/server';
import { getOfficialDollarRate } from '@/lib/dolar-service';

export async function GET() {
  try {
    const rate = await getOfficialDollarRate();
    return NextResponse.json(rate);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error obteniendo cotización del dólar' },
      { status: 500 }
    );
  }
}
