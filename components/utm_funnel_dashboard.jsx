'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Link2,
  Copy,
  Check,
  Plus,
  BarChart3,
  GitBranch,
  Ticket,
  Code2,
  Upload,
  Smartphone,
  Wifi,
  Globe,
  Sparkles,
  RefreshCw,
  Calendar,
  Users,
  QrCode,
  Megaphone,
  Compass,
} from 'lucide-react';

const INITIAL_LINKS = [];

function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

function getPresetDates(preset) {
  const end = new Date();
  const start = new Date();
  if (preset === '7d') start.setDate(end.getDate() - 7);
  else if (preset === '90d') start.setDate(end.getDate() - 90);
  else start.setDate(end.getDate() - 30);
  return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
}

export default function UTMFunnelDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [brandFilter, setBrandFilter] = useState('All');
  const [pillarFilter, setPillarFilter] = useState('all');

  // Calendar state
  const [datePreset, setDatePreset] = useState('30d');
  const [startDate, setStartDate] = useState(() => getPresetDates('30d').startDate);
  const [endDate, setEndDate] = useState(() => getPresetDates('30d').endDate);

  const [links, setLinks] = useState(INITIAL_LINKS);
  const [journeyPaths, setJourneyPaths] = useState([]);
  const [audienceSegments, setAudienceSegments] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [socialContent, setSocialContent] = useState([]);

  const [isLiveMode, setIsLiveMode] = useState(false);
  const [loadingLive, setLoadingLive] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [saving, setSaving] = useState(false);

  // Builder form state targeting globa-ez.com
  const [formBrand, setFormBrand] = useState('EZ Mobile');
  const [formPlacement, setFormPlacement] = useState('profile');
  const [formSource, setFormSource] = useState('instagram');
  const [formMedium, setFormMedium] = useState('organic_social');
  const [formCampaign, setFormCampaign] = useState('ez_mobile_always_on');
  const [formContent, setFormContent] = useState('profile_ig_bio');
  const [formDestination, setFormDestination] = useState('https://globa-ez.com');
  const [formSlug, setFormSlug] = useState('ezm-ig-bio');

  const originHost =
    typeof window !== 'undefined' ? window.location.origin : 'https://ez-dash.netlify.app';

  const detectBrand = (campaign = '', landing = '') => {
    const text = `${campaign} ${landing}`.toLowerCase();
    if (text.includes('esim')) return 'EZ eSIM';
    if (text.includes('mobile')) return 'EZ Mobile';
    return 'Unassigned / General';
  };

  const classifyPillar = (channelGroup = '', medium = '', source = '', content = '') => {
    const ch = channelGroup.toLowerCase();
    const med = medium.toLowerCase();
    const src = source.toLowerCase();
    const cnt = content.toLowerCase();

    if (
      med === 'qr' ||
      med === 'offline' ||
      cnt.startsWith('offline_') ||
      src.includes('qr') ||
      src.includes('booth') ||
      src.includes('flyer')
    ) {
      return 'offline';
    }
    if (
      ch.includes('paid') ||
      med === 'cpc' ||
      med === 'ppc' ||
      med === 'paid' ||
      med === 'paid_social' ||
      cnt.startsWith('ad_')
    ) {
      return 'paid';
    }
    if (
      ch.includes('organic social') ||
      ch.includes('email') ||
      med === 'organic_social' ||
      med === 'email' ||
      med === 'social' ||
      cnt.startsWith('profile_') ||
      cnt.startsWith('content_')
    ) {
      return 'organic_social';
    }
    return 'baseline';
  };

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getPresetDates(preset);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  };

  const loadLiveData = useCallback(async () => {
    setLoadingLive(true);
    try {
      const [linksRes, ga4Res] = await Promise.all([
        fetch('/api/links', { cache: 'no-store' }),
        fetch(`/api/ga4?startDate=${startDate}&endDate=${endDate}`, { cache: 'no-store' }),
      ]);
      const linksData = await linksRes.json();
      const ga4Data = await ga4Res.json();

      const hasSupabase = Array.isArray(linksData.links) && linksData.links.length > 0;
      const hasGa4Traffic = Array.isArray(ga4Data.trafficRows) && ga4Data.trafficRows.length > 0;

      const parsedJourneys = (ga4Data.trafficRows || []).map((r, idx) => {
        const channelGroup = r.dimensionValues?.[0]?.value || 'Direct';
        const source = r.dimensionValues?.[1]?.value || '(direct)';
        const medium = r.dimensionValues?.[2]?.value || '(none)';
        const campaign = r.dimensionValues?.[3]?.value || '(not set)';
        const content = r.dimensionValues?.[4]?.value || '(not set)';
        const landingPage = r.dimensionValues?.[5]?.value || '/';

        const sessions = Number(r.metricValues?.[0]?.value || 0);
        const engaged = Number(r.metricValues?.[1]?.value || 0);
        const checkouts = Number(r.metricValues?.[2]?.value || 0);
        const purchases = Number(r.metricValues?.[3]?.value || 0);
        const revenue = Number(r.metricValues?.[4]?.value || 0);

        return {
          id: `ga4-${idx}`,
          pillar: classifyPillar(channelGroup, medium, source, content),
          channelGroup,
          brand: detectBrand(campaign, landingPage),
          utm_source: source,
          utm_medium: medium,
          utm_campaign: campaign,
          utm_content: content,
          landing_page: landingPage,
          sessions,
          engaged,
          checkouts,
          purchases,
          revenue,
        };
      });

      setJourneyPaths(parsedJourneys);

      const parsedAudience = (ga4Data.audienceRows || []).map((r, idx) => {
        const channelGroup = r.dimensionValues?.[0]?.value || 'Direct';
        const country = r.dimensionValues?.[1]?.value || '(not set)';
        const device = r.dimensionValues?.[2]?.value || 'mobile';
        const userType = r.dimensionValues?.[3]?.value || 'new';
        return {
          id: `aud-${idx}`,
          pillar: classifyPillar(channelGroup, '', '', ''),
          channelGroup,
          country,
          device,
          userType,
          sessions: Number(r.metricValues?.[0]?.value || 0),
          engaged: Number(r.metricValues?.[1]?.value || 0),
          purchases: Number(r.metricValues?.[2]?.value || 0),
          revenue: Number(r.metricValues?.[3]?.value || 0),
        };
      });
      setAudienceSegments(parsedAudience);

      if (hasSupabase || hasGa4Traffic) {
        setIsLiveMode(true);
        const mergedLinks = (linksData.links || []).map((link) => {
          const pillar = classifyPillar('', link.utm_medium, link.utm_source, link.utm_content);
          const matchingGa4 = parsedJourneys.filter(
            (j) =>
              j.utm_source.toLowerCase() === (link.utm_source || '').toLowerCase() &&
              j.utm_campaign.toLowerCase() === (link.utm_campaign || '').toLowerCase() &&
              (link.utm_content
                ? j.utm_content.toLowerCase() === link.utm_content.toLowerCase()
                : true)
          );

          const agg = matchingGa4.reduce(
            (acc, m) => ({
              sessions: acc.sessions + m.sessions,
              engaged: acc.engaged + m.engaged,
              checkouts: acc.checkouts + m.checkouts,
              purchases: acc.purchases + m.purchases,
              revenue: acc.revenue + m.revenue,
            }),
            { sessions: 0, engaged: 0, checkouts: 0, purchases: 0, revenue: 0 }
          );

          return {
            ...link,
            pillar,
            landing_page: matchingGa4[0]?.landing_page || link.destination_url,
            clicks: link.clicks || 0,
            sessions: agg.sessions,
            engaged: agg.engaged,
            checkouts: agg.checkouts,
            purchases: agg.purchases,
            revenue: agg.revenue,
          };
        });

        setLinks(mergedLinks);
      } else {
        setIsLiveMode(false);
        setLinks([]);
      }

      const parsedVouchers = (ga4Data.voucherRows || [])
        .filter((r) => r.dimensionValues?.[3]?.value && r.dimensionValues[3].value !== '(not set)')
        .map((r) => {
          const src = r.dimensionValues[0].value;
          const camp = r.dimensionValues[1].value;
          const content = r.dimensionValues[2].value;
          const code = r.dimensionValues[3].value;
          const purchases = Number(r.metricValues?.[0]?.value || 0);
          const revenue = Number(r.metricValues?.[1]?.value || 0);

          return {
            code,
            sourceBrand: detectBrand(camp, code),
            pillar: classifyPillar('', '', src, content),
            topUtm: `${src} / ${content}`,
            uses: purchases,
            revenue,
          };
        });
      setVouchers(parsedVouchers);
    } catch {
      // Keep current state on network error
    } finally {
      setLoadingLive(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

  const sanitize = (str) =>
    str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const handlePreset = (brand, placement, source, medium = 'organic_social') => {
    setFormBrand(brand);
    setFormPlacement(placement);
    setFormSource(source);
    setFormMedium(medium);
    const brandPrefix = brand === 'EZ Mobile' ? 'ez_mobile' : 'ez_esim';
    const shortPrefix = brand === 'EZ Mobile' ? 'ezm' : 'ezesim';
    setFormCampaign(
      placement === 'profile'
        ? `${brandPrefix}_always_on`
        : placement === 'offline'
        ? `${brandPrefix}_offline_qr`
        : `${brandPrefix}_campaign`
    );
    setFormContent(
      placement === 'profile'
        ? `profile_${source}_bio`
        : placement === 'offline'
        ? `offline_${source}_qr`
        : `content_${source}_post1`
    );
    setFormDestination('https://globa-ez.com');
    setFormSlug(`${shortPrefix}-${source.slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`);
  };

  const fullUtmUrl = useMemo(() => {
    try {
      const url = new URL(formDestination || 'https://globa-ez.com');
      url.searchParams.set('utm_source', sanitize(formSource));
      url.searchParams.set('utm_medium', sanitize(formMedium));
      url.searchParams.set('utm_campaign', sanitize(formCampaign));
      url.searchParams.set('utm_content', sanitize(formContent));
      return url.toString();
    } catch {
      return formDestination;
    }
  }, [formDestination, formSource, formMedium, formCampaign, formContent]);

  const shortUrl = `${originHost}/r/${sanitize(formSlug) || 'link'}`;

  const handleCreateLink = async (e) => {
    e.preventDefault();
    setSaving(true);
    const cleanSlug = sanitize(formSlug) || `link-${Date.now()}`;
    const cleanContent = formContent.startsWith(`${formPlacement}_`)
      ? sanitize(formContent)
      : `${formPlacement}_${sanitize(formContent)}`;

    const newLinkObj = {
      slug: cleanSlug,
      brand: formBrand,
      placement: formPlacement,
      destination_url: formDestination,
      utm_source: sanitize(formSource),
      utm_medium: sanitize(formMedium),
      utm_campaign: sanitize(formCampaign),
      utm_content: cleanContent,
    };

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLinkObj),
      });
      const data = await res.json();
      if (data.link) {
        await loadLiveData();
      }
    } finally {
      setSaving(false);
    }
  };

  // Filter GA4 journeys by Brand & Pillar
  const filteredJourneys = useMemo(() => {
    return journeyPaths.filter((j) => {
      const brandOk = brandFilter === 'All' || j.brand === brandFilter;
      const pillarOk = pillarFilter === 'all' || j.pillar === pillarFilter;
      return brandOk && pillarOk;
    });
  }, [journeyPaths, brandFilter, pillarFilter]);

  const filteredLinks = useMemo(() => {
    return links.filter((l) => {
      const brandOk = brandFilter === 'All' || l.brand === brandFilter;
      const pillarOk = pillarFilter === 'all' || l.pillar === pillarFilter;
      return brandOk && pillarOk;
    });
  }, [links, brandFilter, pillarFilter]);

  // 4-Pillar Comparison Summary (Paid vs Organic vs Offline QR vs Outside Consensus)
  const pillarComparison = useMemo(() => {
    const base = {
      paid: { label: '1. Paid Ads (Meta / TikTok / Google)', sessions: 0, engaged: 0, checkouts: 0, purchases: 0, revenue: 0 },
      organic_social: { label: '2. Organic Social & Email', sessions: 0, engaged: 0, checkouts: 0, purchases: 0, revenue: 0 },
      offline: { label: '3. Offline & QR Activations', sessions: 0, engaged: 0, checkouts: 0, purchases: 0, revenue: 0 },
      baseline: { label: '4. "Outside" Consensus (Direct & Search)', sessions: 0, engaged: 0, checkouts: 0, purchases: 0, revenue: 0 },
    };

    journeyPaths
      .filter((j) => brandFilter === 'All' || j.brand === brandFilter)
      .forEach((j) => {
        const bucket = base[j.pillar] || base.baseline;
        bucket.sessions += j.sessions;
        bucket.engaged += j.engaged;
        bucket.checkouts += j.checkouts;
        bucket.purchases += j.purchases;
        bucket.revenue += j.revenue;
      });

    return base;
  }, [journeyPaths, brandFilter]);

  const totals = useMemo(() => {
    const linkClicks = filteredLinks.reduce((sum, l) => sum + (l.clicks || 0), 0);
    const ga4Totals = filteredJourneys.reduce(
      (acc, j) => ({
        sessions: acc.sessions + j.sessions,
        engaged: acc.engaged + j.engaged,
        checkouts: acc.checkouts + j.checkouts,
        purchases: acc.purchases + j.purchases,
        revenue: acc.revenue + j.revenue,
      }),
      { sessions: 0, engaged: 0, checkouts: 0, purchases: 0, revenue: 0 }
    );
    return { clicks: linkClicks, ...ga4Totals };
  }, [filteredLinks, filteredJourneys]);

  // Audience Breakdown Aggregations
  const audienceBreakdown = useMemo(() => {
    const filtered = audienceSegments.filter(
      (a) => pillarFilter === 'all' || a.pillar === pillarFilter
    );
    const byCountry = {};
    const byDevice = {};
    const byUserType = {};

    filtered.forEach((a) => {
      if (!byCountry[a.country]) byCountry[a.country] = { sessions: 0, purchases: 0, revenue: 0 };
      byCountry[a.country].sessions += a.sessions;
      byCountry[a.country].purchases += a.purchases;
      byCountry[a.country].revenue += a.revenue;

      if (!byDevice[a.device]) byDevice[a.device] = { sessions: 0, purchases: 0, revenue: 0 };
      byDevice[a.device].sessions += a.sessions;
      byDevice[a.device].purchases += a.purchases;
      byDevice[a.device].revenue += a.revenue;

      if (!byUserType[a.userType]) byUserType[a.userType] = { sessions: 0, purchases: 0, revenue: 0 };
      byUserType[a.userType].sessions += a.sessions;
      byUserType[a.userType].purchases += a.purchases;
      byUserType[a.userType].revenue += a.revenue;
    });

    return {
      countries: Object.entries(byCountry).sort((a, b) => b[1].sessions - a[1].sessions).slice(0, 8),
      devices: Object.entries(byDevice).sort((a, b) => b[1].sessions - a[1].sessions),
      userTypes: Object.entries(byUserType).sort((a, b) => b[1].sessions - a[1].sessions),
    };
  }, [audienceSegments, pillarFilter]);

  const journeySummary = useMemo(() => {
    const bySource = {};
    const byLanding = {};

    filteredJourneys.forEach((j) => {
      bySource[j.utm_source] = (bySource[j.utm_source] || 0) + j.sessions;
      byLanding[j.landing_page] = (byLanding[j.landing_page] || 0) + j.sessions;
    });

    return {
      topSources: Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 6),
      topLandingPages: Object.entries(byLanding).sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [filteredJourneys]);

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // CSV Importer for Social Views, Reach, Saves & Shares
  const handleImportCsv = () => {
    if (!importText.trim()) return;
    const rows = importText.trim().split('\n').slice(1);
    const imported = rows
      .map((row, idx) => {
        const [brand, platform, postTitle, views, reach, savesShares, clicks] = row
          .split(',')
          .map((c) => c.trim());
        if (!platform) return null;
        const vNum = Number(views) || 0;
        const rNum = Number(reach) || 0;
        const eNum = Number(savesShares) || 0;
        const cNum = Number(clicks) || 0;
        return {
          id: `soc-${Date.now()}-${idx}`,
          brand: brand || 'EZ Mobile',
          platform,
          postTitle: postTitle || `Post #${idx + 1}`,
          views: vNum,
          reach: rNum,
          savesShares: eNum,
          clicks: cNum,
          resonanceRate: vNum > 0 ? ((eNum / vNum) * 100).toFixed(2) : '0.00',
          ctr: vNum > 0 ? ((cNum / vNum) * 100).toFixed(2) : '0.00',
        };
      })
      .filter(Boolean);

    if (imported.length > 0) {
      setSocialContent((prev) => [...imported, ...prev]);
      setActiveTab('audience');
    }
    setImportText('');
    setShowImportModal(false);
  };

  const baseVolume = Math.max(totals.sessions, totals.clicks, 1);
  const funnelStages = [
    { label: '1. Tracked Short Link / QR Clicks (Supabase)', value: totals.clicks, color: 'bg-indigo-600' },
    { label: '2. Website Landing Sessions on globa-ez.com (GA4)', value: totals.sessions, color: 'bg-blue-600' },
    { label: '3. Engaged Plan / Product Views (GA4)', value: totals.engaged, color: 'bg-cyan-600' },
    { label: '4. Checkout Started (`begin_checkout`)', value: totals.checkouts, color: 'bg-teal-600' },
    { label: '5. Completed Orders (`purchase`)', value: totals.purchases, color: 'bg-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg">
                EZ
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg tracking-tight">
                    Globa-EZ — Marketing & Audience Intelligence Hub
                  </h1>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isLiveMode
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isLiveMode ? 'Live Supabase + GA4' : 'Waiting for Data'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  EZ Mobile &bull; EZ eSIM &bull; Offline QR &bull; Outside Baseline &rarr; globa-ez.com
                </p>
              </div>
            </div>

            {/* Calendar & Date Range Controls */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700">
              <Calendar className="w-4 h-4 text-indigo-400 ml-1.5" />
              {[
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: '90d', label: '90D' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    datePreset === p.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setStartDate(e.target.value);
                }}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
              <span className="text-slate-500 text-xs">&rarr;</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setEndDate(e.target.value);
                }}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
              <button
                onClick={loadLiveData}
                className="px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-xs font-medium flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loadingLive ? 'animate-spin' : ''}`} />
                Sync
              </button>
            </div>
          </div>

          {/* Brand + 4-Pillar Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-slate-800 p-1 rounded-lg flex items-center text-xs font-medium">
                {['All', 'EZ Mobile', 'EZ eSIM'].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBrandFilter(b)}
                    className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                      brandFilter === b
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {b === 'EZ Mobile' && <Smartphone className="w-3.5 h-3.5" />}
                    {b === 'EZ eSIM' && <Wifi className="w-3.5 h-3.5" />}
                    {b === 'All' && <Globe className="w-3.5 h-3.5" />}
                    {b}
                  </button>
                ))}
              </div>

              <div className="bg-slate-800 p-1 rounded-lg flex flex-wrap items-center text-xs font-medium">
                {[
                  { id: 'all', label: 'All Traffic' },
                  { id: 'paid', label: 'Paid Ads' },
                  { id: 'organic_social', label: 'Organic Social' },
                  { id: 'offline', label: 'Offline QR' },
                  { id: 'baseline', label: 'Outside Baseline' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPillarFilter(p.id)}
                    className={`px-2.5 py-1 rounded-md transition ${
                      pillarFilter === p.id
                        ? 'bg-slate-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Social Reach CSV
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 text-sm font-medium border-t border-slate-800/80 overflow-x-auto">
          {[
            { id: 'overview', label: 'Marketing vs. Outside Funnel', icon: BarChart3 },
            { id: 'journey', label: 'Website Customer Journey', icon: GitBranch },
            { id: 'audience', label: 'Audience & Content Resonance', icon: Users },
            { id: 'builder', label: 'Links & Offline QR Builder', icon: Link2 },
            { id: 'vouchers', label: 'Checkout Vouchers', icon: Ticket },
            { id: 'setup', label: 'Tracking Setup', icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Short Link / QR Clicks</div>
            <div className="text-2xl font-bold mt-1">{totals.clicks.toLocaleString()}</div>
            <div className="text-xs text-indigo-600 mt-1">Supabase Redirect Logs</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">globa-ez.com Sessions</div>
            <div className="text-2xl font-bold mt-1">{totals.sessions.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">
              {startDate} to {endDate}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Checkouts Started</div>
            <div className="text-2xl font-bold mt-1">{totals.checkouts.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">
              {totals.sessions ? ((totals.checkouts / totals.sessions) * 100).toFixed(1) : 0}% of sessions
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Completed Orders</div>
            <div className="text-2xl font-bold mt-1">{totals.purchases.toLocaleString()}</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">
              {totals.sessions ? ((totals.purchases / totals.sessions) * 100).toFixed(2) : 0}% session CVR
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
            <div className="text-xs text-slate-500 font-medium">Attributed Revenue</div>
            <div className="text-2xl font-bold mt-1 text-emerald-700">
              ${totals.revenue.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Live GA4 ecommerce</div>
          </div>
        </div>

        {/* TAB 1: 4-PILLAR MARKETING VS OUTSIDE BASELINE + FULL FUNNEL */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 4-Pillar Scorecard */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="mb-4">
                <h2 className="font-bold text-base">
                  Marketing Activities vs. "Outside" Consensus Evaluation
                </h2>
                <p className="text-xs text-slate-500">
                  Compare Paid Ads, Organic Social, and Offline QR campaigns against baseline Direct & Search demand
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(pillarComparison).map(([key, item]) => {
                  const cvr = item.sessions ? ((item.purchases / item.sessions) * 100).toFixed(2) : '0.00';
                  const engRate = item.sessions ? Math.round((item.engaged / item.sessions) * 100) : 0;
                  return (
                    <div
                      key={key}
                      onClick={() => setPillarFilter(pillarFilter === key ? 'all' : key)}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        pillarFilter === key
                          ? 'border-indigo-600 bg-indigo-50/40'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-800">{item.label}</div>
                      <div className="text-2xl font-bold mt-2">{item.sessions.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-500">Sessions ({engRate}% engaged)</div>
                      <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between text-xs">
                        <span>
                          Orders: <strong>{item.purchases}</strong> ({cvr}%)
                        </span>
                        <span className="font-bold text-emerald-700">
                          ${item.revenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Full Website Conversion Funnel */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-base">Full Website Conversion Funnel (globa-ez.com)</h2>
                  <p className="text-xs text-slate-500">
                    Step-by-step progression for selected date range and traffic pillar
                  </p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                  {brandFilter} &bull; {pillarFilter.toUpperCase()}
                </span>
              </div>
              <div className="space-y-3">
                {funnelStages.map((stage) => {
                  const pct =
                    stage.value > 0 ? Math.max(3, Math.round((stage.value / baseVolume) * 100)) : 0;
                  return (
                    <div key={stage.label}>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span>{stage.label}</span>
                        <span>
                          {stage.value.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          className={`${stage.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Managed Links & Offline QR Performance Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base">Tracked Short Links & Offline QR Codes</h2>
                  <p className="text-xs text-slate-500">
                    Real click/scan counts from Supabase paired with GA4 conversions on globa-ez.com
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('builder')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Link / QR
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Brand & Pillar</th>
                      <th className="py-3 px-4">Short Link / QR</th>
                      <th className="py-3
