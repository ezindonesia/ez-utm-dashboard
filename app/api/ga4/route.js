import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate') || '30daysAgo';
  const endDate = searchParams.get('endDate') || 'today';

  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!propertyId || !clientEmail || !privateKey) {
    return NextResponse.json({
      trafficRows: [],
      audienceRows: [],
      voucherRows: [],
      demo: true,
    });
  }

  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });

    const dateRanges = [{ startDate, endDate }];

    const [trafficRes, audienceRes, voucherRes] = await Promise.all([
      // 1. 4-Pillar Attribution & Customer Journey Report
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [
          { name: 'sessionDefaultChannelGroup' },
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
      }),

      // 2. Audience Segmentation Report (Country, Device, New vs Returning)
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [
          { name: 'sessionDefaultChannelGroup' },
          { name: 'country' },
          { name: 'deviceCategory' },
          { name: 'newVsReturning' },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'engagedSessions' },
          { name: 'ecommercePurchases' },
          { name: 'purchaseRevenue' },
        ],
        limit: 300,
      }),

      // 3. Checkout Voucher Attribution Report
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
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
      }),
    ]);

    return NextResponse.json({
      dateRange: { startDate, endDate },
      trafficRows: trafficRes[0]?.rows || [],
      audienceRows: audienceRes[0]?.rows || [],
      voucherRows: voucherRes[0]?.rows || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
