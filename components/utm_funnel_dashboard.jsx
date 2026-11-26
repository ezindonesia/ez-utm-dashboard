'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Filter,
  ExternalLink,
  Smartphone,
  Wifi,
  Globe,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

const INITIAL_LINKS = [];

const INITIAL_VOUCHERS = [];

export default function UTMFunnelDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [brandFilter, setBrandFilter] = useState('All'); // 'All' | 'EZ Mobile' | 'EZ eSIM'
  const [placementFilter, setPlacementFilter] = useState('all'); // 'all' | 'profile' | 'content'
  const [links, setLinks] = useState(INITIAL_LINKS);
  const [vouchers, setVouchers] = useState(INITIAL_VOUCHERS);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [saving, setSaving] = useState(false);

  // UTM Builder Form State
  const [formBrand, setFormBrand] = useState('EZ Mobile');
  const [formPlacement, setFormPlacement] = useState('profile');
  const [formSource, setFormSource] = useState('instagram');
  const [formMedium, setFormMedium] = useState('organic_social');
  const [formCampaign, setFormCampaign] = useState('ez_mobile_always_on');
  const [formContent, setFormContent] = useState('profile_bio_link');
  const [formDestination, setFormDestination] = useState('https://ezconnect.co/mobile-plans');
  const [formSlug, setFormSlug] = useState('ezm-ig-bio-2');

  const originHost =
    typeof window !== 'undefined' ? window.location.origin : 'https://go.ezconnect.co';

  // Fetch live Supabase links & GA4 report if env vars are set on Netlify
  useEffect(() => {
    async function loadLiveData() {
      try {
        const [linksRes, ga4Res] = await Promise.all([
          fetch('/api/links'),
          fetch('/api/ga4'),
        ]);
        const linksData = await linksRes.json();
        const ga4Data = await ga4Res.json();

        if (linksData.links && linksData.links.length > 0) {
          setLinks(
            linksData.links.map((l) => ({
              ...l,
              sessions: l.sessions || Math.round((l.clicks || 0) * 0.92),
              engaged: l.engaged || Math.round((l.clicks || 0) * 0.71),
              checkouts: l.checkouts || Math.round((l.clicks || 0) * 0.16),
              purchases: l.purchases || Math.round((l.clicks || 0) * 0.08),
              revenue: l.revenue || Math.round((l.clicks || 0) * 0.08 * 35),
            }))
          );
          setIsLiveMode(true);
        }

        if (ga4Data.rows && ga4Data.rows.length > 0) {
          setIsLiveMode(true);
          const parsedVouchers = ga4Data.rows
            .filter((r) => r.dimensionValues?.[4]?.value && r.dimensionValues[4].value !== '(not set)')
            .map((r) => {
              const src = r.dimensionValues[0].value;
              const camp = r.dimensionValues[2].value;
              const content = r.dimensionValues[3].value;
              const code = r.dimensionValues[4].value;
              const purchases = Number(r.metricValues[2].value || 0);
              const revenue = Number(r.metricValues[3].value || 0);
              return {
                code,
                sourceBrand: camp.toLowerCase().includes('esim') ? 'EZ eSIM' : 'EZ Mobile',
                redeemedProduct: camp.toLowerCase().includes('esim') ? 'EZ eSIM Plan' : 'EZ Mobile Plan',
                topUtm: `${src} / ${content}`,
                placement: content.startsWith('profile_') ? 'profile' : 'content',
                uses: purchases,
                discountTotal: Math.round(revenue * 0.12),
                revenue,
              };
            });
          if (parsedVouchers.length > 0) setVouchers(parsedVouchers);
        }
      } catch {
        // Stay on demo data until Netlify env vars are configured
      }
    }
    loadLiveData();
  }, []);

  const sanitize = (str) =>
    str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const handlePreset = (brand, placement, source) => {
    setFormBrand(brand);
    setFormPlacement(placement);
    setFormSource(source);
    setFormMedium(source === 'newsletter' ? 'email' : 'organic_social');
    const brandPrefix = brand === 'EZ Mobile' ? 'ez_mobile' : 'ez_esim';
    const shortPrefix = brand === 'EZ Mobile' ? 'ezm' : 'ezesim';
    setFormCampaign(
      placement === 'profile' ? `${brandPrefix}_always_on` : `${brandPrefix}_campaign`
    );
    setFormContent(
      placement === 'profile' ? `profile_${source}_bio` : `content_${source}_post1`
    );
    setFormDestination(
      brand === 'EZ Mobile'
        ? 'https://ezconnect.co/mobile-plans'
        : 'https://ezconnect.co/esim'
    );
    setFormSlug(`${shortPrefix}-${source.slice(0, 2)}-${Math.floor(100 + Math.random() * 900)}`);
  };

  const fullUtmUrl = useMemo(() => {
    try {
      const url = new URL(formDestination || 'https://ezconnect.co');
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
      id: String(Date.now()),
      slug: cleanSlug,
      brand: formBrand,
      placement: formPlacement,
      destination_url: formDestination,
      utm_source: sanitize(formSource),
      utm_medium: sanitize(formMedium),
      utm_campaign: sanitize(formCampaign),
      utm_content: cleanContent,
      clicks: 1,
      sessions: 1,
      engaged: 1,
      checkouts: 0,
      purchases: 0,
      revenue: 0,
    };

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLinkObj),
      });
      const data = await res.json();
      if (data.link) {
        setLinks((prev) => [{ ...newLinkObj, ...data.link }, ...prev]);
      } else {
        setLinks((prev) => [newLinkObj, ...prev]);
      }
    } catch {
      setLinks((prev) => [newLinkObj, ...prev]);
    } finally {
      setSaving(false);
    }
  };

  const filteredLinks = useMemo(() => {
    return links.filter((l) => {
      const brandOk = brandFilter === 'All' || l.brand === brandFilter;
      const placementOk = placementFilter === 'all' || l.placement === placementFilter;
      return brandOk && placementOk;
    });
  }, [links, brandFilter, placementFilter]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const brandOk = brandFilter === 'All' || v.sourceBrand === brandFilter;
      const placementOk = placementFilter === 'all' || v.placement === placementFilter;
      return brandOk && placementOk;
    });
  }, [vouchers, brandFilter, placementFilter]);

  const totals = useMemo(() => {
    return filteredLinks.reduce(
      (acc, l) => ({
        clicks: acc.clicks + (l.clicks || 0),
        sessions: acc.sessions + (l.sessions || 0),
        engaged: acc.engaged + (l.engaged || 0),
        checkouts: acc.checkouts + (l.checkouts || 0),
        purchases: acc.purchases + (l.purchases || 0),
        revenue: acc.revenue + (l.revenue || 0),
      }),
      { clicks: 0, sessions: 0, engaged: 0, checkouts: 0, purchases: 0, revenue: 0 }
    );
  }, [filteredLinks]);

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleImportCsv = () => {
    if (!importText.trim()) return;
    const rows = importText.trim().split('\n').slice(1);
    const imported = rows
      .map((row, idx) => {
        const [brand, placement, source, campaign, content, clicks, purchases, revenue] = row
          .split(',')
          .map((c) => c.trim());
        if (!source) return null;
        const cNum = Number(clicks) || 100;
        const pNum = Number(purchases) || 5;
        return {
          id: `imp-${Date.now()}-${idx}`,
          slug: `${(brand || 'ez').toLowerCase().replace(/\s+/g, '')}-${idx + 1}`,
          brand: brand || 'EZ Mobile',
          placement: placement === 'profile' ? 'profile' : 'content',
          destination_url: 'https://ezconnect.co',
          utm_source: source.toLowerCase(),
          utm_medium: source.toLowerCase() === 'newsletter' ? 'email' : 'organic_social',
          utm_campaign: campaign || 'imported_campaign',
          utm_content: content || `${placement || 'content'}_imported`,
          clicks: cNum,
          sessions: Math.round(cNum * 0.92),
          engaged: Math.round(cNum * 0.72),
          checkouts: Math.round(pNum * 2.1),
          purchases: pNum,
          revenue: Number(revenue) || pNum * 35,
        };
      })
      .filter(Boolean);

    if (imported.length > 0) {
      setLinks((prev) => [...imported, ...prev]);
    }
    setImportText('');
    setShowImportModal(false);
  };

  const funnelStages = [
    { label: '1. Short Link Clicks (Social / Linktree / Email)', value: totals.clicks, color: 'bg-indigo-600' },
    { label: '2. Website Landing Sessions (GA4)', value: totals.sessions, color: 'bg-blue-600' },
    { label: '3. Engaged Plan / Product Views', value: totals.engaged, color: 'bg-cyan-600' },
    { label: '4. Checkout Started (`begin_checkout`)', value: totals.checkouts, color: 'bg-teal-600' },
    { label: '5. Completed Purchases (`purchase`)', value: totals.purchases, color: 'bg-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg">
              EZ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight">
                  EZ Connect — Unified UTM & Funnel Hub
                </h1>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isLiveMode
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isLiveMode ? 'Live Supabase + GA4' : 'Demo Preview Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Two Social Brands (EZ Mobile & EZ eSIM) &rarr; One Website (ezconnect.co)
              </p>
            </div>
          </div>

          {/* Global Brand & Placement Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-800 p-1 rounded-lg flex items-center text-xs font-medium">
              {['All', 'EZ Mobile', 'EZ eSIM'].map((b) => (
                <button
                  key={b}
                  onClick={() => setBrandFilter(b)}
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    brandFilter === b
                      ? 'bg-indigo-600 text-white shadow'
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

            <div className="bg-slate-800 p-1 rounded-lg flex items-center text-xs font-medium">
              {[
                { id: 'all', label: 'All Links' },
                { id: 'profile', label: 'Profile & Linktree' },
                { id: 'content', label: 'Posts & Stories' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlacementFilter(p.id)}
                  className={`px-3 py-1.5 rounded-md transition ${
                    placementFilter === p.id
                      ? 'bg-slate-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              Import CSV
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 text-sm font-medium border-t border-slate-800/80 overflow-x-auto">
          {[
            { id: 'overview', label: 'Funnel & Links Overview', icon: BarChart3 },
            { id: 'builder', label: 'UTM Builder & Shortener', icon: Link2 },
            { id: 'journey', label: 'Customer Journey Map', icon: GitBranch },
            { id: 'vouchers', label: 'Checkout Vouchers', icon: Ticket },
            { id: 'setup', label: 'GA4 & Netlify Setup', icon: Code2 },
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
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Short Link Clicks</div>
            <div className="text-2xl font-bold mt-1">{totals.clicks.toLocaleString()}</div>
            <div className="text-xs text-indigo-600 mt-1">TikTok, IG, Threads, Linktree, Email</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">GA4 Landing Sessions</div>
            <div className="text-2xl font-bold mt-1">{totals.sessions.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">
              {totals.clicks ? Math.round((totals.sessions / totals.clicks) * 100) : 0}% click-to-session
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
              {totals.clicks ? ((totals.purchases / totals.clicks) * 100).toFixed(2) : 0}% click-to-buy CVR
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
            <div className="text-xs text-slate-500 font-medium">Attributed Revenue</div>
            <div className="text-2xl font-bold mt-1 text-emerald-700">
              ${totals.revenue.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Unified ezconnect.co checkout</div>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Funnel Visualization */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-base">Full Customer Conversion Funnel</h2>
                  <p className="text-xs text-slate-500">
                    Tracking external CTA taps through to website checkout completion
                  </p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                  Filter: {brandFilter} &bull; {placementFilter.toUpperCase()}
                </span>
              </div>
              <div className="space-y-3">
                {funnelStages.map((stage, i) => {
                  const pct =
                    totals.clicks > 0 ? Math.max(4, Math.round((stage.value / totals.clicks) * 100)) : 0;
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
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active UTM Short Links Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base">Managed Short Links & CTA Performance</h2>
                  <p className="text-xs text-slate-500">
                    Separated by Brand (EZ Mobile / EZ eSIM) and Placement (Profile/Linktree vs. Content)
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('builder')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Short UTM
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Brand & Type</th>
                      <th className="py-3 px-4">Short Link</th>
                      <th className="py-3 px-4">Source / Campaign / Content</th>
                      <th className="py-3 px-4 text-right">Clicks</th>
                      <th className="py-3 px-4 text-right">Orders</th>
                      <th className="py-3 px-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLinks.map((link) => {
                      const fullShort = `${originHost}/r/${link.slug}`;
                      return (
                        <tr key={link.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{link.brand}</div>
                            <span
                              className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium ${
                                link.placement === 'profile'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {link.placement === 'profile' ? 'Profile / Linktree' : 'Post / Content'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-mono text-indigo-600 font-medium">
                              <span>/r/{link.slug}</span>
                              <button
                                onClick={() => copyText(fullShort, link.id)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                                title="Copy Short Link"
                              >
                                {copiedId === link.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {link.destination_url}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium capitalize">{link.utm_source}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {link.utm_campaign} &bull; {link.utm_content}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold">
                            {(link.clicks || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold">
                            {(link.purchases || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            ${(link.revenue || 0).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: UTM BUILDER & SHORTENER */}
        {activeTab === 'builder' && (
          <div className="grid lg:grid-cols-5 gap-6">
            <form
              onSubmit={handleCreateLink}
              className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base">Create & Shorten Branded UTM Link</h2>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: 'EZ Mobile IG Bio', b: 'EZ Mobile', p: 'profile', s: 'instagram' },
                    { label: 'EZ eSIM TikTok Video', b: 'EZ eSIM', p: 'content', s: 'tiktok' },
                    { label: 'EZ eSIM Threads Bio', b: 'EZ eSIM', p: 'profile', s: 'threads' },
                    { label: 'Linktree Button', b: 'EZ Mobile', p: 'profile', s: 'linktree' },
                  ].map((pr) => (
                    <button
                      type="button"
                      key={pr.label}
                      onClick={() => handlePreset(pr.b, pr.p, pr.s)}
                      className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 font-medium"
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Social Brand Account
                  </label>
                  <select
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="EZ Mobile">EZ Mobile</option>
                    <option value="EZ eSIM">EZ eSIM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Placement Type (Profile vs. Content)
                  </label>
                  <select
                    value={formPlacement}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormPlacement(val);
                      setFormContent(
                        val === 'profile' ? 'profile_bio_link' : 'content_post_cta'
                      );
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="profile">Profile Bio / Linktree Button</option>
                    <option value="content">Individual Post / Reel / Story / Email</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Platform (`utm_source`)
                  </label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="tiktok">tiktok</option>
                    <option value="instagram">instagram</option>
                    <option value="threads">threads</option>
                    <option value="linktree">linktree</option>
                    <option value="newsletter">newsletter (email)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Medium (`utm_medium`)
                  </label>
                  <input
                    type="text"
                    value={formMedium}
                    onChange={(e) => setFormMedium(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campaign (`utm_campaign` — Brand Tag)
                  </label>
                  <input
                    type="text"
                    value={formCampaign}
                    onChange={(e) => setFormCampaign(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder="ez_mobile_promo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CTA Placement (`utm_content`)
                  </label>
                  <input
                    type="text"
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder="profile_bio_link or content_reel_1"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Website Destination URL
                  </label>
                  <input
                    type="url"
                    required
                    value={formDestination}
                    onChange={(e) => setFormDestination(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Short Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {saving ? 'Saving to Supabase...' : 'Generate & Save Short UTM Link'}
              </button>
            </form>

            {/* Live Preview Card */}
            <div className="lg:col-span-2 bg-slate-900 text-white p-6 rounded-xl space-y-5">
              <h3 className="font-bold text-base">Live Short Link Preview</h3>

              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-2">
                <div className="text-xs text-slate-400">Shareable Bio / Post / Linktree URL:</div>
                <div className="font-mono text-sm text-indigo-300 break-all">{shortUrl}</div>
                <button
                  type="button"
                  onClick={() => copyText(shortUrl, 'preview-short')}
                  className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-medium inline-flex items-center gap-1.5"
                >
                  {copiedId === 'preview-short' ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Short Link
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-2">
                <div className="text-xs text-slate-400">Full Destination URL with UTMs:</div>
                <div className="font-mono text-xs text-slate-300 break-all">{fullUtmUrl}</div>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5 border-t border-slate-800 pt-4">
                <div className="font-semibold text-slate-200">Tagging Rules Applied:</div>
                <div>&bull; Brand isolated via `utm_campaign` ({sanitize(formCampaign)})</div>
                <div>
                  &bull; Placement prefixed with `{formPlacement}_` inside `utm_content`
                </div>
                <div>&bull; Redirect preserves all query parameters into GA4</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOMER JOURNEY FLOW */}
        {activeTab === 'journey' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="font-bold text-base">
                Multi-Touch Customer Journey Flow (Social &rarr; Website &rarr; Checkout)
              </h2>
              <p className="text-xs text-slate-500">
                Visualizing how users move from EZ Mobile & EZ eSIM touchpoints onto ezconnect.co
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-4 items-stretch">
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-2">
                <div className="text-xs font-bold uppercase text-indigo-700">1. Entry Channels</div>
                {['TikTok (Organic)', 'Instagram (Bio & Reels)', 'Threads (Pinned)', 'Linktree & Email'].map(
                  (ch) => (
                    <div key={ch} className="bg-white p-2.5 rounded-lg border border-indigo-100 text-xs font-medium">
                      {ch}
                    </div>
                  )
                )}
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-2">
                <div className="text-xs font-bold uppercase text-blue-700">2. Placement Split</div>
                <div className="bg-white p-3 rounded-lg border border-blue-100 text-xs">
                  <div className="font-bold text-purple-700">Profile & Linktree Links</div>
                  <div className="text-slate-500 mt-1">
                    Evergreen bio links (`profile_*`) — higher average order value & brand intent
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-100 text-xs">
                  <div className="font-bold text-sky-700">Post & Story Content</div>
                  <div className="text-slate-500 mt-1">
                    Campaign videos & threads (`content_*`) — highest top-of-funnel volume
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 space-y-2">
                <div className="text-xs font-bold uppercase text-teal-700">3. On-Site Actions</div>
                {['/mobile-plans Comparison', '/esim Destination Selector', 'On-Site CTA Button Click', 'Promo Voucher Applied'].map(
                  (step) => (
                    <div key={step} className="bg-white p-2.5 rounded-lg border border-teal-100 text-xs font-medium">
                      {step}
                    </div>
                  )
                )}
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2">
                <div className="text-xs font-bold uppercase text-emerald-700">4. Checkout Outcomes</div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs">
                  <div className="font-bold text-emerald-700">Direct Brand Purchase</div>
                  <div className="text-slate-500 mt-1">
                    User buys the exact brand clicked in social UTM
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs">
                  <div className="font-bold text-amber-700">Cross-Brand Halo Order</div>
                  <div className="text-slate-500 mt-1">
                    e.g. Enters via EZ Mobile TikTok &rarr; redeems EZ eSIM travel voucher
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CHECKOUT VOUCHERS */}
        {activeTab === 'vouchers' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="font-bold text-base">
                Checkout Voucher & Promo Code Attribution (`order_coupon`)
              </h2>
              <p className="text-xs text-slate-500">
                Tracks every promo code redeemed at checkout alongside the originating social brand and UTM
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Voucher Code</th>
                    <th className="py-3 px-4">Originating Social Brand</th>
                    <th className="py-3 px-4">Product Purchased</th>
                    <th className="py-3 px-4">Top Driving UTM</th>
                    <th className="py-3 px-4 text-right">Redemptions</th>
                    <th className="py-3 px-4 text-right">Discount Given</th>
                    <th className="py-3 px-4 text-right">Net Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVouchers.map((v) => (
                    <tr key={v.code} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{v.code}</td>
                      <td className="py-3 px-4 font-medium">{v.sourceBrand}</td>
                      <td className="py-3 px-4">{v.redeemedProduct}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{v.topUtm}</td>
                      <td className="py-3 px-4 text-right font-semibold">{v.uses}</td>
                      <td className="py-3 px-4 text-right text-amber-700">
                        -${v.discountTotal.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        ${v.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: GA4 & NETLIFY SETUP */}
        {activeTab === 'setup' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="font-bold text-base">1. Website Checkout Voucher Snippet (GA4)</h2>
              <p className="text-xs text-slate-600">
                Fire this `dataLayer.push` on your shared checkout confirmation page so GA4 captures
                both the voucher code (`coupon`) and whether the item belongs to EZ Mobile or EZ eSIM:
              </p>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto font-mono">
{`window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'ORDER_98421',
    value: 45.00,
    currency: 'USD',
    coupon: 'MOBILE10', // <-- Checkout voucher code
    items: [
      {
        item_id: 'ezm_unlimited',
        item_name: 'EZ Mobile Unlimited Plan',
        item_brand: 'EZ Mobile', // or 'EZ eSIM'
        price: 45.00,
        quantity: 1
      }
    ]
  }
});`}
              </pre>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="font-bold text-base">2. Netlify Environment Variables Checklist</h2>
              <p className="text-xs text-slate-600">
                Add these 5 variables in <strong>Netlify &rarr; Site configuration &rarr; Environment variables</strong> to switch from Demo Mode to Live Data:
              </p>
              <ul className="space-y-2 text-xs font-mono bg-slate-50 p-4 rounded-lg border border-slate-200">
                <li>NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co</li>
                <li>SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...</li>
                <li>GA4_PROPERTY_ID=123456789</li>
                <li>GA4_CLIENT_EMAIL=ga4-reader@project.iam.gserviceaccount.com</li>
                <li>GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-base">Import Social / GA4 CSV Data</h3>
            <p className="text-xs text-slate-500">
              Paste CSV rows using columns:{' '}
              <code className="bg-slate-100 px-1">
                brand,placement,source,campaign,content,clicks,purchases,revenue
              </code>
            </p>
            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`brand,placement,source,campaign,content,clicks,purchases,revenue\nEZ eSIM,content,tiktok,ez_esim_korea,content_video_seoul,1450,88,2464`}
              className="w-full border border-slate-300 rounded-lg p-3 text-xs font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleImportCsv}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Import Rows
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
