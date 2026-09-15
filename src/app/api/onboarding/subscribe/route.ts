import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { getOfficialDollarRate, convertUsdToArs } from '@/lib/dolar-service';
import { calculateEstimatedPrice } from '@/lib/license-service';
import { ERP_PLANS, ERP_MODULES, ErpModuleId, ErpPlanId } from '@/config/modules';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      organizationName,
      adminEmail,
      adminPassword,
      adminPhone,
      plan = 'enterprise',
      modules = [],
    } = body;

    // 1. Validaciones
    if (!organizationName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Por favor complete todos los datos del negocio y administrador.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'Formato de módulos inválido.' },
        { status: 400 }
      );
    }

    // 2. Calcular precio en USD
    const validPlan: ErpPlanId = plan in ERP_PLANS ? plan : 'custom';
    const validModules = modules.filter((m: string): m is ErpModuleId => m in ERP_MODULES);
    const amountUSD = calculateEstimatedPrice(validPlan, validModules);

    // 3. Consultar cotización del Dólar Oficial en vivo vía Dolar API
    const dollarRate = await getOfficialDollarRate();
    const amountARS = convertUsdToArs(amountUSD, dollarRate.venta);

    const planName = ERP_PLANS[validPlan]?.name || 'Plan Personalizado';
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const registrationId = `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 4. Conexión con Mercado Pago (API de Preapproval / Suscripciones)
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;

    if (mpAccessToken) {
      try {
        const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
        const preApproval = new PreApproval(client);

        const mpResponse = await preApproval.create({
          body: {
            auto_recurring: {
              frequency: 1,
              frequency_type: 'months',
              transaction_amount: amountARS,
              currency_id: 'ARS',
            },
            back_url: `${origin}/onboarding/success?ref=${registrationId}&plan=${validPlan}&modules=${encodeURIComponent(validModules.join(','))}&org=${encodeURIComponent(organizationName)}`,
            payer_email: adminEmail.trim(),
            reason: `Suscripción ERP Modular - ${planName} (US$ ${amountUSD}/mes)`,
            external_reference: registrationId,
            status: 'authorized',
          },
        });

        if (mpResponse && mpResponse.init_point) {
          return NextResponse.json({
            success: true,
            init_point: mpResponse.init_point,
            preapproval_id: mpResponse.id,
            amountUSD,
            amountARS,
            dollarRate: dollarRate.venta,
            registrationId,
          });
        }
      } catch (mpError: any) {
        console.error('[ONBOARDING_MP] Error llamando a Mercado Pago PreApproval:', mpError);
        // Si falla por credenciales de prueba o token no configurado, avisamos claramente
        return NextResponse.json(
          { 
            error: `Mercado Pago no pudo iniciar la suscripción: ${mpError.message || 'Error de pasarela'}. Verifique las credenciales MP_ACCESS_TOKEN.` 
          },
          { status: 502 }
        );
      }
    }

    // 5. Modo Simulación / Desarrollo (si aún no se configuró MP_ACCESS_TOKEN en el entorno)
    // Permite probar todo el onboarding y la activación inmediata sin trabas
    console.info('[ONBOARDING] MP_ACCESS_TOKEN no detectado en .env.local. Operando en modo simulación de suscripción.');

    return NextResponse.json({
      success: true,
      init_point: null,
      isSimulation: true,
      simulationMessage: 'Modo demostración: Se simulará la aprobación de Mercado Pago para activar el entorno.',
      redirectUrl: `/onboarding/success?demo=true&ref=${registrationId}&plan=${validPlan}&modules=${encodeURIComponent(validModules.join(','))}&org=${encodeURIComponent(organizationName)}&email=${encodeURIComponent(adminEmail)}`,
      amountUSD,
      amountARS,
      dollarRate: dollarRate.venta,
      registrationId,
    });
  } catch (err: any) {
    console.error('[ONBOARDING_SUBSCRIBE] Error inesperado:', err);
    return NextResponse.json(
      { error: err.message || 'Error interno al procesar la suscripción.' },
      { status: 500 }
    );
  }
}
