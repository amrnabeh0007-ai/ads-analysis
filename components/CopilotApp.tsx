'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { defaultAudit, defaultBenchmarks, defaultBusiness, defaultMetrics, demoScenarios } from '@/data/mockData';
import { t, severityLabels } from '@/lib/i18n';
import { computeMetrics, landingPageScore, runDiagnosis } from '@/lib/diagnosis';
import { AdMetrics, BenchmarkSettings, BusinessInputs, DemoScenario, Lang, LandingPageAuditInput, Severity } from '@/lib/types';

const tabs = ['dashboard', 'funnel', 'creative', 'landing', 'product', 'strategy', 'report', 'inputs', 'settings'] as const;

const sevClass: Record<Severity, string> = {
  low: 'bg-emerald-500/15 text-emerald-300',
  medium: 'bg-amber-500/15 text-amber-300',
  high: 'bg-orange-500/15 text-orange-300',
  critical: 'bg-red-500/15 text-red-300'
};

const percent = (v: number) => `${(v * 100).toFixed(2)}%`;
const money = (v: number) => `$${v.toFixed(2)}`;

export default function CopilotApp() {
  const [lang, setLang] = useState<Lang>('en');
  const [tab, setTab] = useState<(typeof tabs)[number]>('dashboard');
  const [metrics, setMetrics] = useState<AdMetrics>(defaultMetrics);
  const [business, setBusiness] = useState<BusinessInputs>(defaultBusiness);
  const [benchmarks, setBenchmarks] = useState<BenchmarkSettings>(defaultBenchmarks);
  const [audit, setAudit] = useState<LandingPageAuditInput>(defaultAudit);

  const computed = useMemo(() => computeMetrics(metrics, business), [metrics, business]);
  const diagnoses = useMemo(() => runDiagnosis(metrics, benchmarks, computed), [metrics, benchmarks, computed]);

  const accountHealth = Math.max(0, Math.round(100 - diagnoses.length * 13 - Math.max(0, (business.breakEvenCPA - computed.cpa) * -1)));
  const creativeScore = Math.round((computed.hookRate / benchmarks.hookRateMin + computed.holdRate / benchmarks.holdRateMin + computed.outboundCtr / benchmarks.outboundCtrMin) * 33.3);
  const lpScore = landingPageScore(audit);
  const productScore = Math.max(0, Math.min(100, Math.round((computed.profitPerOrder + 40) * 1.2 + lpScore * 0.3)));

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const chartData = [
    { name: 'Impr', value: metrics.impressions },
    { name: '3s', value: metrics.threeSecViews },
    { name: 'Thru', value: metrics.thruPlays },
    { name: 'Clicks', value: metrics.linkClicks },
    { name: 'LPV', value: metrics.landingPageViews },
    { name: 'Checkout', value: metrics.checkoutsInitiated },
    { name: 'Purchases', value: metrics.purchases }
  ];

  const recommendation = computed.profitPerOrder > 0 && computed.roas >= business.targetROAS ? t(lang, 'scale') : computed.profitPerOrder > -5 ? t(lang, 'hold') : t(lang, 'kill');

  const onScenario = (scenario: DemoScenario) => {
    setMetrics(scenario.metrics);
    setAudit(scenario.audit);
  };

  const onCsv = (text: string) => {
    const [header, row] = text.trim().split('\n');
    if (!header || !row) return;
    const keys = header.split(',').map((s) => s.trim());
    const values = row.split(',').map((s) => Number(s.trim()));
    const parsed: Record<string, number> = {};
    keys.forEach((k, i) => (parsed[k] = values[i]));
    setMetrics((m) => ({ ...m, ...parsed }));
  };

  return (
    <main dir={dir} className={`min-h-screen p-6 ${lang === 'ar' ? 'font-arabic' : ''}`}>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t(lang, 'appTitle')}</h1>
          <p className="text-sm text-slate-300">{t(lang, 'appSubtitle')}</p>
        </div>
        <div className="card flex items-center gap-2 p-2">
          <span className="text-sm">{t(lang, 'language')}</span>
          <button className={`rounded px-3 py-1 ${lang === 'en' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setLang('en')}>{t(lang, 'english')}</button>
          <button className={`rounded px-3 py-1 ${lang === 'ar' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setLang('ar')}>{t(lang, 'arabic')}</button>
        </div>
      </header>

      <nav className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-5 lg:grid-cols-9">
        {tabs.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`rounded-lg border px-3 py-2 text-sm ${tab === tb ? 'border-blue-500 bg-blue-500/20' : 'border-slate-800 bg-slate-900'}`}>
            {t(lang, tb)}
          </button>
        ))}
      </nav>

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        {[{ k: 'accountHealthScore', v: accountHealth }, { k: 'creativeQualityScore', v: creativeScore }, { k: 'landingScore', v: lpScore }, { k: 'productPotential', v: productScore }].map((c) => (
          <div key={c.k} className="card">
            <p className="text-sm text-slate-400">{t(lang, c.k)}</p>
            <p className="text-3xl font-bold">{Math.max(0, Math.min(100, c.v))}</p>
          </div>
        ))}
      </section>

      {tab === 'dashboard' && (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="card lg:col-span-2 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card space-y-2 text-sm">
            <p>Spend: {money(metrics.spend)}</p><p>Purchases: {metrics.purchases}</p><p>CPA: {money(computed.cpa)}</p><p>ROAS: {computed.roas.toFixed(2)}</p>
            <p>Impressions: {metrics.impressions.toLocaleString()}</p><p>Link Clicks: {metrics.linkClicks}</p><p>Unique Outbound Clicks: {metrics.uniqueOutboundClicks}</p><p>Landing Page Views: {metrics.landingPageViews}</p><p>Checkouts Initiated: {metrics.checkoutsInitiated}</p><p>Outbound CTR: {percent(computed.outboundCtr)}</p><p>Cost/Result: {money(metrics.costPerResult)}</p><p>Cost/LPV: {money(computed.costPerLpv)}</p>
          </div>
        </section>
      )}

      {tab === 'funnel' && (
        <section className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-400"><th>Step</th><th>{t(lang, 'metricValue')}</th><th>{t(lang, 'conversionRate')}</th><th>{t(lang, 'benchmark')}</th><th>{t(lang, 'severity')}</th><th>{t(lang, 'diagnosis')}</th><th>{t(lang, 'action')}</th></tr></thead>
            <tbody>
              {diagnoses.map((d) => (
                <tr key={d.id} className="border-t border-slate-800 align-top"><td className="py-2">{t(lang, d.issueKey)}</td><td>{d.evidence.split(' vs ')[0]}</td><td>-</td><td>{d.evidence.split(' vs ')[1]}</td><td><span className={`rounded px-2 py-1 text-xs ${sevClass[d.severity]}`}>{severityLabels[lang][d.severity]}</span></td><td>{t(lang, d.reasonKey)}</td><td>{t(lang, d.actionKey)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'creative' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-2 text-sm">
            <p>Hook Rate = 3s views ÷ Impressions = {percent(computed.hookRate)}</p>
            <p>Hold Rate = ThruPlays ÷ Impressions = {percent(computed.holdRate)}</p>
            <p>Purchases ÷ Link Clicks = {percent(computed.purchasePerLinkClick)}</p>
            <p>Purchases ÷ Unique Outbound Clicks = {percent(computed.purchasePerOutboundClick)}</p>
            <p>Outbound CTR = {percent(computed.outboundCtr)}</p>
            <p>Cost per Result = {money(metrics.costPerResult)}</p>
          </div>
          <div className="card space-y-2">
            {diagnoses.slice(0, 3).map((d) => <div key={d.id} className="rounded bg-slate-800 p-3 text-sm"><p className="font-semibold">{t(lang, d.issueKey)}</p><p>{t(lang, d.actionKey)}</p></div>)}
          </div>
        </section>
      )}

      {tab === 'landing' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-2">
            <label className="text-sm">{t(lang, 'lpUrl')}</label>
            <input value={audit.url} onChange={(e) => setAudit({ ...audit, url: e.target.value })} className="w-full rounded bg-slate-800 p-2" />
            {(['pageSpeedScore', 'mobileUsabilityScore', 'headlineClarityScore', 'ctaVisibilityScore', 'trustElementsScore', 'offerClarityScore', 'structureFlowScore'] as const).map((k) => (
              <div key={k} className="flex items-center gap-2 text-sm"><span className="w-44">{k}</span><input type="range" min={0} max={100} value={audit[k]} onChange={(e) => setAudit({ ...audit, [k]: Number(e.target.value) })} className="flex-1" /><span>{audit[k]}</span></div>
            ))}
          </div>
          <div className="card"><p className="text-xl font-bold">{t(lang, 'landingScore')}: {lpScore}/100</p><p className="mt-2 text-sm text-slate-300">Likely issues: page speed friction, low trust blocks, weak offer framing.</p><p className="mt-2 text-sm">Suggested improvements: compress media, sticky CTA, add testimonials, clarify shipping and returns.</p></div>
        </section>
      )}

      {tab === 'product' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-2 text-sm">
            <p>Margin / order: {money(computed.marginPerOrder)}</p>
            <p>Profit / order after ads: {money(computed.profitPerOrder)}</p>
            <p>Total profit estimate: {money(computed.totalProfit)}</p>
            <p>Break-even CPA: {money(business.breakEvenCPA)}</p>
            <p className={computed.profitPerOrder > 0 ? 'text-emerald-300' : 'text-red-300'}>{computed.profitPerOrder > 0 ? t(lang, 'profitable') : t(lang, 'notProfitable')}</p>
          </div>
          <div className="card"><p className="font-semibold">Decision: {recommendation}</p><p className="text-sm text-slate-300 mt-2">If profitability is weak despite good conversion, treat as pricing/COGS issue and avoid scaling until economics improve.</p></div>
        </section>
      )}

      {tab === 'strategy' && (
        <section className="card space-y-2 text-sm">
          <p>- {computed.roas < business.targetROAS ? 'Use ABO for controlled testing until stable winners emerge.' : 'Move winning ad sets into CBO for scale.'}</p>
          <p>- {computed.hookRate < benchmarks.hookRateMin ? 'Prioritize new hooks before broad scaling.' : 'Rotate creatives to prevent fatigue every 5-7 days.'}</p>
          <p>- {computed.outboundCtr < benchmarks.outboundCtrMin ? 'Start with engagement/video-view campaigns to refine messaging signal.' : 'Go direct conversion with structured testing matrix.'}</p>
          <p>- {computed.lpvRate < benchmarks.lpvRateMin ? 'Improve landing page speed and mobile UX before spend increase.' : 'Landing page is acceptable for incrementally higher budgets.'}</p>
        </section>
      )}

      {tab === 'report' && (
        <section className="card space-y-3">
          <p><strong>{t(lang, 'mainBottleneck')}:</strong> {diagnoses[0] ? t(lang, diagnoses[0].issueKey) : 'No critical issues'}</p>
          <p><strong>{t(lang, 'secondaryBottleneck')}:</strong> {diagnoses[1] ? t(lang, diagnoses[1].issueKey) : 'N/A'}</p>
          <p><strong>{t(lang, 'rootCause')}:</strong> {diagnoses[0] ? t(lang, diagnoses[0].reasonKey) : 'Healthy conversion chain.'}</p>
          <p><strong>{t(lang, 'nextActions')}:</strong></p>
          <ol className="list-decimal ps-5">{diagnoses.slice(0, 3).map((d) => <li key={d.id}>{t(lang, d.actionKey)}</li>)}</ol>
          <p><strong>{t(lang, 'campaignStructure')}:</strong> {computed.roas > business.targetROAS ? 'CBO + controlled duplication of winners' : 'ABO testing pods with strict kill rules'}</p>
          <p><strong>{t(lang, 'landingPriority')}:</strong> Speed, trust, checkout clarity.</p>
          <p><strong>{t(lang, 'creativePriority')}:</strong> Hooks, pacing, offer communication.</p>
          <button onClick={() => window.print()} className="rounded bg-blue-600 px-4 py-2 text-sm">{t(lang, 'exportReport')}</button>
        </section>
      )}

      {tab === 'inputs' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-2 text-sm">
            <p className="font-semibold">{t(lang, 'scenariosTitle')}</p>
            {demoScenarios.map((s) => (
              <button key={s.id} onClick={() => onScenario(s)} className="block w-full rounded bg-slate-800 px-3 py-2 text-left">{t(lang, s.labelKey)} — {t(lang, s.descriptionKey)}</button>
            ))}
          </div>
          <div className="card space-y-3 text-sm">
            <a href="/sample-template.csv" className="underline">{t(lang, 'csvTemplate')}</a>
            <input type="file" accept=".csv" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const txt = await file.text();
              onCsv(txt);
            }} />
            <textarea className="h-28 w-full rounded bg-slate-800 p-2" placeholder='{"spend":5000,"purchases":80}' onBlur={(e) => {
              try { setMetrics((m) => ({ ...m, ...JSON.parse(e.target.value) })); } catch {}
            }} />
          </div>
        </section>
      )}

      {tab === 'settings' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-2">
            <p className="font-semibold">{t(lang, 'benchmarkSettings')}</p>
            {Object.entries(benchmarks).map(([k, v]) => <label key={k} className="flex items-center justify-between gap-3 text-sm"><span>{k}</span><input type="number" step="0.01" value={v} onChange={(e) => setBenchmarks({ ...benchmarks, [k]: Number(e.target.value) })} className="w-28 rounded bg-slate-800 p-1" /></label>)}
          </div>
          <div className="card space-y-2">
            <p className="font-semibold">{t(lang, 'businessInputs')}</p>
            {Object.entries(business).map(([k, v]) => <label key={k} className="flex items-center justify-between gap-3 text-sm"><span>{k}</span><input type="number" step="0.1" value={v} onChange={(e) => setBusiness({ ...business, [k]: Number(e.target.value) })} className="w-28 rounded bg-slate-800 p-1" /></label>)}
          </div>
        </section>
      )}

      <footer className="mt-6 card text-xs text-slate-400">
        <p>{t(lang, 'formulas')}: Hook Rate=3s/impressions, Hold Rate=ThruPlays/impressions, LPV Rate=LPV/link clicks, Purchases/LPV, LP-to-Checkout=checkouts/LPV.</p>
      </footer>
    </main>
  );
}
