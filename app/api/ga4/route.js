import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function GET() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!propertyId || !clientEmail || !privateKey) {
    return NextResponse.json({ trafficRows: [], voucherRows: [], demo: true });
  }

  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });

    const [trafficRes] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'sessionCampaignName' },
        { name: 'sessionManualAdContent' },
        { name: 'landingPage' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'checkouts' },
        { name: 'ecommercePurchases' },
        { name: 'purchaseRevenue' },
      ],
      limit: 500,
    });

    const [voucherRes] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionCampaignName' },
        { name: 'sessionManualAdContent' },
        { name: 'orderCoupon' },
      ],
      metrics: [
        { name: 'ecommercePurchases' },
        { name: 'purchaseRevenue' },
      ],
      limit: 250,
    });

    return NextResponse.json({
      trafficRows: trafficRes.rows || [],
      voucherRows: voucherRes.rows || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
