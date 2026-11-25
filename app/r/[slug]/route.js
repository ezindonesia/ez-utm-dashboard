import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request, { params }) {
  const { slug } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: link, error } = await supabase
    .from('utm_links')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !link) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  await supabase
    .from('utm_links')
    .update({ clicks: (link.clicks || 0) + 1 })
    .eq('id', link.id);

  const target = new URL(link.destination_url);
  target.searchParams.set('utm_source', link.utm_source);
  target.searchParams.set('utm_medium', link.utm_medium);
  target.searchParams.set('utm_campaign', link.utm_campaign);
  target.searchParams.set('utm_content', link.utm_content);

  return NextResponse.redirect(target.toString(), 302);
}
