import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function fetchInstagramBrand(brand, userId, token) {
  if (!userId || !token) return [];
  try {
    const mediaRes = await fetch(
      `https://graph.facebook.com/v21.0/${userId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,insights.metric(views,reach,saved,shares)&limit=25&access_token=${token}`,
      { cache: 'no-store' }
    );
    const json = await mediaRes.json();
    if (!Array.isArray(json.data)) return [];

    return json.data.map((m) => {
      const insightsMap = {};
      (m.insights?.data || []).forEach((i) => {
        insightsMap[i.name] = i.values?.[0]?.value || 0;
      });
      const views = Number(insightsMap.views || 0);
      const reach = Number(insightsMap.reach || views);
      const savesShares =
        Number(insightsMap.saved || 0) +
        Number(insightsMap.shares || 0) +
        Number(m.comments_count || 0);

      return {
        id: `ig-${brand}-${m.id}`,
        brand,
        platform: 'instagram',
        postTitle: (m.caption || 'Instagram Post').split('\n')[0].slice(0, 70),
        views,
        reach,
        savesShares,
        clicks: 0,
        resonanceRate: views > 0 ? ((savesShares / views) * 100).toFixed(2) : '0.00',
        ctr: '0.00',
      };
    });
  } catch {
    return [];
  }
}

async function fetchThreadsBrand(brand, userId, token) {
  if (!userId || !token) return [];
  try {
    const res = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads?fields=id,text,timestamp&limit=20&access_token=${token}`,
      { cache: 'no-store' }
    );
    const json = await res.json();
    if (!Array.isArray(json.data)) return [];

    const posts = await Promise.all(
      json.data.slice(0, 12).map(async (t) => {
        try {
          const insRes = await fetch(
            `https://graph.threads.net/v1.0/${t.id}/insights?metric=views,likes,replies,reposts,quotes&access_token=${token}`,
            { cache: 'no-store' }
          );
          const insJson = await insRes.json();
          const map = {};
          (insJson.data || []).forEach((d) => {
            map[d.name] = d.values?.[0]?.value || 0;
          });
          const views = Number(map.views || 0);
          const savesShares =
            Number(map.replies || 0) + Number(map.reposts || 0) + Number(map.quotes || 0);

          return {
            id: `th-${brand}-${t.id}`,
            brand,
            platform: 'threads',
            postTitle: (t.text || 'Threads Post').slice(0, 70),
            views,
            reach: views,
            savesShares,
            clicks: 0,
            resonanceRate: views > 0 ? ((savesShares / views) * 100).toFixed(2) : '0.00',
            ctr: '0.00',
          };
        } catch {
          return null;
        }
      })
    );
    return posts.filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchTikTokBrand(brand, token) {
  if (!token) return [];
  try {
    const res = await fetch(
      'https://open.tiktokapis.com/v2/video/list/?fields=id,title,view_count,like_count,comment_count,share_count',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ max_count: 20 }),
        cache: 'no-store',
      }
    );
    const json = await res.json();
    const videos = json.data?.videos || [];

    return videos.map((v) => {
      const views = Number(v.view_count || 0);
      const savesShares = Number(v.comment_count || 0) + Number(v.share_count || 0);
      return {
        id: `tt-${brand}-${v.id}`,
        brand,
        platform: 'tiktok',
        postTitle: (v.title || 'TikTok Video').slice(0, 70),
        views,
        reach: views,
        savesShares,
        clicks: 0,
        resonanceRate: views > 0 ? ((savesShares / views) * 100).toFixed(2) : '0.00',
        ctr: '0.00',
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  const results = await Promise.all([
    fetchInstagramBrand('EZ Mobile', process.env.IG_MOBILE_USER_ID, process.env.IG_MOBILE_TOKEN),
    fetchInstagramBrand('EZ eSIM', process.env.IG_ESIM_USER_ID, process.env.IG_ESIM_TOKEN),
    fetchThreadsBrand('EZ Mobile', process.env.THREADS_MOBILE_USER_ID, process.env.THREADS_MOBILE_TOKEN),
    fetchThreadsBrand('EZ eSIM', process.env.THREADS_ESIM_USER_ID, process.env.THREADS_ESIM_TOKEN),
    fetchTikTokBrand('EZ Mobile', process.env.TIKTOK_MOBILE_TOKEN),
    fetchTikTokBrand('EZ eSIM', process.env.TIKTOK_ESIM_TOKEN),
  ]);

  const items = results.flat().sort((a, b) => b.views - a.views);
  return NextResponse.json({
    items,
    connectedPlatforms: {
      igMobile: Boolean(process.env.IG_MOBILE_USER_ID && process.env.IG_MOBILE_TOKEN),
      igEsim: Boolean(process.env.IG_ESIM_USER_ID && process.env.IG_ESIM_TOKEN),
      threadsMobile: Boolean(process.env.THREADS_MOBILE_USER_ID && process.env.THREADS_MOBILE_TOKEN),
      threadsEsim: Boolean(process.env.THREADS_ESIM_USER_ID && process.env.THREADS_ESIM_TOKEN),
      tiktokMobile: Boolean(process.env.TIKTOK_MOBILE_TOKEN),
      tiktokEsim: Boolean(process.env.TIKTOK_ESIM_TOKEN),
    },
  });
}
