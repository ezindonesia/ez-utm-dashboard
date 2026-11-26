import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ links: [], demo: true });
  }

  const { data, error } = await supabase
    .from('utm_links')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ links: data || [] });
}

export async function POST(request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      slug,
      brand,
      placement,
      destination_url,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
    } = body;

    const { data, error } = await supabase
      .from('utm_links')
      .insert([
        {
          slug,
          brand,
          placement,
          destination_url,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          clicks: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ link: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
