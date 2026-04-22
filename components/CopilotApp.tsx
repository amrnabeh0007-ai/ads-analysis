'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { defaultAudit, defaultBenchmarks, defaultBusiness, defaultMetrics, demoScenarios } from '@/data/mockData';
import { t, severityLabels } from '@/lib/i18n';
import { computeMetrics, landingPageScore, runDiagnosis } from '@/lib/diagnosis';
import { AdMetrics, BenchmarkSettings, BusinessInputs, DemoScenario, Lang, LandingPageAuditInput, Severity } from '@/lib/types';

const tabs = ['dashboard', 'funnel', 'creative', 'landing', 'product', 'strategy', 'report', 'inputs', 'settings'] as const;
const requiredMetricFields: (keyof AdMetrics)[] = [
  'spend',
  'purchases',
  'impressions',
  'threeSecViews',
  'thruPlays',
  'linkClicks',
  'uniqueOutboundClicks',
  'landingPageViews',
  'checkoutsInitiated',
  'contentViews',
  'costPerResult'
];

const sevClass: Record<Severity, string> = {
  low: 'bg-emerald-500/15 text-emerald-300',
  medium: 'bg-amber-500/15 text-amber-300',
  high: 'bg-orange-500/15 text-orange-300',
  critical: 'bg-red-500/15 text-red-300'
};

const percent = (v: number) => `${(v * 100).toFixed(2)}%`;
const money = (v: number) => `$${v.toFixed(2)}`;


const parseCsvText = (text: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      if (current.length > 0 || row.length > 0) {
        row.push(current.trim());
        rows.push(row);
      }
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0];
  return rows.slice(1).map((values) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] ?? '';
    });
    return obj;
  });
};

const parseNum = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[$,%\s]/g, '').replace(/,/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const aggregateMappedMetrics = (rows: Record<string, string>[], mapping: Partial<Record<keyof AdMetrics, string>>): AdMetrics => {
  const output: AdMetrics = { ...defaultMetrics };

  requiredMetricFields.forEach((field) => {
    const mappedCol = mapping[field];
    if (!mappedCol) {
      output[field] = field === 'costPerResult' ? parseNum(output.costPerResult) : 0;
      return;
    }

    const sum = rows.reduce((total, row) => total + parseNum(row[mappedCol]), 0);
    output[field] = sum;
  });

  if (output.costPerResult <= 0 && output.purchases > 0) {
    output.costPerResult = output.spend / output.purchases;
  }

  return output;
};

export default function CopilotApp() {
  const [lang, setLang] = useState<Lang>('en');
  const [tab, setTab] = useState<(typeof tabs)[number]>('dashboard');
  const [metrics, setMetrics] = useState<AdMetrics>(defaultMetrics);
  const [business, setBusiness] = useState<BusinessInputs>(defaultBusiness);
  const [benchmarks, setBenchmarks] = useState<BenchmarkSettings>(defaultBenchmarks);
  const [audit, setAudit] = useState<LandingPageAuditInput>(defaultAudit);

  const [dataMode, setDataMode] = useState<'demo' | 'upload'>('demo');
  const [entryMethod, setEntryMethod] = useState<'csv' | 'manual'>('csv');
  const [uploadStep, setUploadStep] = useState<'source' | 'mapping' | 'manual' | 'review'>('source');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [parseError, setParseError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<keyof AdMetrics, string>>>({});
  const [mappingWarning, setMappingWarning] = useState('');
  const [manualDraft, setManualDraft] = useState<AdMetrics>({ ...defaultMetrics, ...Object.fromEntries(requiredMetricFields.map((f) => [f, 0])) } as AdMetrics);

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

  const recommendation =
    computed.profitPerOrder > 0 && computed.roas >= business.targetROAS ? t(lang, 'scale') : computed.profitPerOrder > -5 ? t(lang, 'hold') : t(lang, 'kill');

  const topRecommendations = diagnoses.slice(0, 3);

  const onScenario = (scenario: DemoScenario) => {
    setMetrics(scenario.metrics);
    setAudit(scenario.audit);
    setDataMode('demo');
  };

  const resetUpload = () => {
    setUploadStep('source');
    setFileName('');
    setParseError('');
    setUploadSuccess('');
    setCsvColumns([]);
    setCsvRows([]);
    setMapping({});
    setMappingWarning('');
    setEntryMethod('csv');
  };

  const handleCsvFile = async (file: File) => {
    setParseError('');
    setUploadSuccess('');
    setMappingWarning('');
    setFileName(file.name);

    try {
      const text = await file.text();
      const rows = parseCsvText(text).filter((row) => Object.values(row).some((value) => String(value || '').trim().length > 0));

      if (!rows.length) {
        setParseError(t(lang, 'emptyCsv'));
        return;
      }

      const headers = Object.keys(rows[0]);
      setCsvRows(rows);
      setCsvColumns(headers);
      setUploadSuccess(t(lang, 'uploadSuccess'));

      const nextMapping: Partial<Record<keyof AdMetrics, string>> = {};
      requiredMetricFields.forEach((field) => {
        const found = headers.find((h) => h.toLowerCase().replace(/\s+/g, '') === field.toLowerCase().replace(/\s+/g, ''));
        if (found) nextMapping[field] = found;
      });
      setMapping(nextMapping);
      setUploadStep('mapping');
    } catch (error) {
      setParseError(error instanceof Error ? error.message : t(lang, 'csvParseError'));
    }
  };

  const applyMapping = () => {
    const missing = requiredMetricFields.filter((field) => !mapping[field]);
    if (missing.length) {
      setMappingWarning(`${t(lang, 'mappingIncomplete')}: ${missing.join(', ')}`);
      return;
    }

    const mappedMetrics = aggregateMappedMetrics(csvRows, mapping);
    setMetrics(mappedMetrics);
    setUploadStep('review');
    setMappingWarning('');
  };

  const submitManualEntry = () => {
    setMetrics({ ...manualDraft, costPerResult: manualDraft.costPerResult || (manualDraft.purchases > 0 ? manualDraft.spend / manualDraft.purchases : 0) });
    setUploadStep('review');
    setParseError('');
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
          <button className={`rounded px-3 py-1 ${lang === 'en' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setLang('en')}>
            {t(lang, 'english')}
          </button>
          <button className={`rounded px-3 py-1 ${lang === 'ar' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setLang('ar')}>
            {t(lang, 'arabic')}
          </button>
        </div>
      </header>

      <section className="mb-5 card flex flex-wrap items-center gap-3 text-sm">
        <span className="text-slate-300">{t(lang, 'mode')}:</span>
        <button
          className={`rounded px-3 py-1 ${dataMode === 'demo' ? 'bg-blue-600' : 'bg-slate-700'}`}
          onClick={() => {
            setDataMode('demo');
            setMetrics(defaultMetrics);
          }}
        >
          {t(lang, 'demoMode')}
        </button>
        <button
          className={`rounded px-3 py-1 ${dataMode === 'upload' ? 'bg-blue-600' : 'bg-slate-700'}`}
          onClick={() => {
            setDataMode('upload');
            setUploadStep('source');
          }}
        >
          {t(lang, 'uploadYourData')}
        </button>
        <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
          {dataMode === 'demo' ? t(lang, 'usingDemoData') : `${t(lang, 'usingUploadedData')}${fileName ? `: ${fileName}` : ''}`}
        </span>
      </section>

      {dataMode === 'upload' && (
        <section className="mb-5 card space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button className={`rounded px-3 py-1 ${entryMethod === 'csv' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => { setEntryMethod('csv'); setUploadStep('source'); }}>
              {t(lang, 'uploadCsv')}
            </button>
            <button className={`rounded px-3 py-1 ${entryMethod === 'manual' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => { setEntryMethod('manual'); setUploadStep('manual'); }}>
              {t(lang, 'manualEntry')}
            </button>
            <button onClick={resetUpload} className="rounded bg-slate-700 px-3 py-1">
              {t(lang, 'resetUpload')}
            </button>
          </div>

          {entryMethod === 'csv' && uploadStep === 'source' && (
            <>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragOver(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) handleCsvFile(file);
                }}
                className={`rounded-xl border-2 border-dashed p-6 text-center ${isDragOver ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 bg-slate-900'}`}
              >
                <p className="mb-2 text-sm text-slate-300">{t(lang, 'dragDropCsv')}</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleCsvFile(file);
                  }}
                  className="mx-auto block"
                />
              </div>
              {uploadSuccess && <p className="text-sm text-emerald-300">{uploadSuccess}</p>}
              {parseError && <p className="text-sm text-red-300">{t(lang, 'csvParseError')}: {parseError}</p>}
              <a href="/sample-template.csv" className="text-sm underline">
                {t(lang, 'csvTemplate')}
              </a>
            </>
          )}

          {entryMethod === 'csv' && uploadStep === 'mapping' && (
            <div className="space-y-3">
              <p className="font-semibold">{t(lang, 'mapColumns')}</p>
              <p className="text-sm text-slate-300">{t(lang, 'mapColumnsHint')}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {requiredMetricFields.map((field) => (
                  <label key={field} className="flex items-center justify-between gap-3 rounded bg-slate-800 p-2 text-sm">
                    <span>{field}</span>
                    <select
                      value={mapping[field] ?? ''}
                      onChange={(event) => setMapping((prev) => ({ ...prev, [field]: event.target.value || undefined }))}
                      className="w-52 rounded bg-slate-900 p-1"
                    >
                      <option value="">{t(lang, 'selectColumn')}</option>
                      {csvColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {mappingWarning && <p className="text-sm text-amber-300">{mappingWarning}</p>}
              <button onClick={applyMapping} className="rounded bg-blue-600 px-4 py-2 text-sm">
                {t(lang, 'applyMapping')}
              </button>
            </div>
          )}

          {entryMethod === 'manual' && uploadStep === 'manual' && (
            <div className="space-y-3">
              <p className="font-semibold">{t(lang, 'manualEntry')}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {requiredMetricFields.map((field) => (
                  <label key={field} className="flex items-center justify-between gap-3 rounded bg-slate-800 p-2 text-sm">
                    <span>{field}</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={manualDraft[field]}
                      onChange={(event) => setManualDraft((prev) => ({ ...prev, [field]: parseNum(event.target.value) }))}
                      className="w-44 rounded bg-slate-900 p-1"
                    />
                  </label>
                ))}
              </div>
              <button onClick={submitManualEntry} className="rounded bg-blue-600 px-4 py-2 text-sm">
                {t(lang, 'runAnalysis')}
              </button>
            </div>
          )}

          {uploadStep === 'review' && (
            <div className="rounded bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {t(lang, 'analysisReady')}
            </div>
          )}
        </section>
      )}

      <nav className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-5 lg:grid-cols-9">
        {tabs.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`rounded-lg border px-3 py-2 text-sm ${tab === tb ? 'border-blue-500 bg-blue-500/20' : 'border-slate-800 bg-slate-900'}`}>
            {t(lang, tb)}
          </button>
        ))}
      </nav>

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        {[
          { k: 'accountHealthScore', v: accountHealth },
          { k: 'creativeQualityScore', v: creativeScore },
          { k: 'landingScore', v: lpScore },
          { k: 'productPotential', v: productScore }
        ].map((c) => (
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
            <p>Spend: {money(metrics.spend)}</p>
            <p>Purchases: {metrics.purchases}</p>
            <p>CPA: {money(computed.cpa)}</p>
            <p>ROAS: {computed.roas.toFixed(2)}</p>
            <p>Impressions: {metrics.impressions.toLocaleString()}</p>
            <p>Link Clicks: {metrics.linkClicks}</p>
            <p>Unique Outbound Clicks: {metrics.uniqueOutboundClicks}</p>
            <p>Landing Page Views: {metrics.landingPageViews}</p>
            <p>Checkouts Initiated: {metrics.checkoutsInitiated}</p>
            <p>Cost/Result: {money(metrics.costPerResult)}</p>
            <p>Cost/LPV: {money(computed.costPerLpv)}</p>
            <p>LPV Rate: {percent(computed.lpvRate)}</p>
          </div>
          <div className="card lg:col-span-3 grid gap-3 md:grid-cols-3">
            {topRecommendations.length ? (
              topRecommendations.map((d) => (
                <div key={d.id} className="rounded bg-slate-800 p-3 text-sm">
                  <p className="mb-1 font-semibold">{t(lang, d.issueKey)}</p>
                  <p className="mb-1 text-xs text-slate-300">{d.evidence}</p>
                  <p className="mb-2 text-xs text-slate-400">{t(lang, d.reasonKey)}</p>
                  <p className="text-xs text-blue-300">{t(lang, d.actionKey)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-emerald-300">{t(lang, 'noCriticalIssues')}</p>
            )}
          </div>
        </section>
      )}

      {tab === 'funnel' && (
        <section className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th>Step</th>
                <th>{t(lang, 'metricValue')}</th>
                <th>{t(lang, 'conversionRate')}</th>
                <th>{t(lang, 'benchmark')}</th>
                <th>{t(lang, 'severity')}</th>
                <th>{t(lang, 'diagnosis')}</th>
                <th>{t(lang, 'action')}</th>
              </tr>
            </thead>
            <tbody>
              {diagnoses.map((d) => (
                <tr key={d.id} className="border-t border-slate-800 align-top">
                  <td className="py-2">{t(lang, d.issueKey)}</td>
                  <td>{d.evidence.split(' vs ')[0]}</td>
                  <td>-</td>
                  <td>{d.evidence.split(' vs ')[1]}</td>
                  <td>
                    <span className={`rounded px-2 py-1 text-xs ${sevClass[d.severity]}`}>{severityLabels[lang][d.severity]}</span>
                  </td>
                  <td>{t(lang, d.reasonKey)}</td>
                  <td>{t(lang, d.actionKey)}</td>
                </tr>
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
            <p>Landing Page View Rate = LPV ÷ Link Clicks = {percent(computed.lpvRate)}</p>
            <p>Purchases ÷ Link Clicks = {percent(computed.purchasePerLinkClick)}</p>
            <p>Purchases ÷ Unique Outbound Clicks = {percent(computed.purchasePerOutboundClick)}</p>
            <p>Purchases ÷ Landing Page Views = {percent(computed.purchasePerLpv)}</p>
            <p>LP to Checkout Rate = {percent(computed.lpToCheckoutRate)}</p>
            <p>Cost per Result = {money(metrics.costPerResult)}</p>
            <p>Cost per LPV = {money(computed.costPerLpv)}</p>
          </div>
          <div className="card space-y-2">
            {diagnoses.slice(0, 3).map((d) => (
              <div key={d.id} className="rounded bg-slate-800 p-3 text-sm">
                <p className="font-semibold">{t(lang, d.issueKey)}</p>
                <p>{t(lang, d.actionKey)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'landing' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-2">
            <label className="text-sm">{t(lang, 'lpUrl')}</label>
            <input value={audit.url} onChange={(e) => setAudit({ ...audit, url: e.target.value })} className="w-full rounded bg-slate-800 p-2" />
            {(
              [
                'pageSpeedScore',
                'mobileUsabilityScore',
                'headlineClarityScore',
                'ctaVisibilityScore',
                'trustElementsScore',
                'offerClarityScore',
                'structureFlowScore'
              ] as const
            ).map((k) => (
              <div key={k} className="flex items-center gap-2 text-sm">
                <span className="w-44">{k}</span>
                <input type="range" min={0} max={100} value={audit[k]} onChange={(e) => setAudit({ ...audit, [k]: Number(e.target.value) })} className="flex-1" />
                <span>{audit[k]}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <p className="text-xl font-bold">
              {t(lang, 'landingScore')}: {lpScore}/100
            </p>
            <p className="mt-2 text-sm text-slate-300">Likely issues: page speed friction, low trust blocks, weak offer framing.</p>
            <p className="mt-2 text-sm">Suggested improvements: compress media, sticky CTA, add testimonials, clarify shipping and returns.</p>
          </div>
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
          <div className="card">
            <p className="font-semibold">Decision: {recommendation}</p>
            <p className="text-sm text-slate-300 mt-2">
              If profitability is weak despite good conversion, treat as pricing/COGS issue and avoid scaling until economics improve.
            </p>
          </div>
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
          <p>
            <strong>{t(lang, 'mainBottleneck')}:</strong> {diagnoses[0] ? t(lang, diagnoses[0].issueKey) : t(lang, 'noCriticalIssues')}
          </p>
          <p>
            <strong>{t(lang, 'secondaryBottleneck')}:</strong> {diagnoses[1] ? t(lang, diagnoses[1].issueKey) : 'N/A'}
          </p>
          <p>
            <strong>{t(lang, 'rootCause')}:</strong> {diagnoses[0] ? t(lang, diagnoses[0].reasonKey) : 'Healthy conversion chain.'}
          </p>
          <p>
            <strong>{t(lang, 'nextActions')}:</strong>
          </p>
          <ol className="list-decimal ps-5">
            {diagnoses.slice(0, 3).map((d) => (
              <li key={d.id}>{t(lang, d.actionKey)}</li>
            ))}
          </ol>
          <p>
            <strong>{t(lang, 'campaignStructure')}:</strong> {computed.roas > business.targetROAS ? 'CBO + controlled duplication of winners' : 'ABO testing pods with strict kill rules'}
          </p>
          <p>
            <strong>{t(lang, 'landingPriority')}:</strong> Speed, trust, checkout clarity.
          </p>
          <p>
            <strong>{t(lang, 'creativePriority')}:</strong> Hooks, pacing, offer communication.
          </p>
          <button onClick={() => window.print()} className="rounded bg-blue-600 px-4 py-2 text-sm">
            {t(lang, 'exportReport')}
          </button>
        </section>
      )}

      {tab === 'inputs' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-2 text-sm">
            <p className="font-semibold">{t(lang, 'scenariosTitle')}</p>
            {demoScenarios.map((s) => (
              <button key={s.id} onClick={() => onScenario(s)} className="block w-full rounded bg-slate-800 px-3 py-2 text-left">
                {t(lang, s.labelKey)} — {t(lang, s.descriptionKey)}
              </button>
            ))}
          </div>
          <div className="card space-y-3 text-sm">
            <p>{t(lang, 'inputsHint')}</p>
            <button
              className="rounded bg-slate-700 px-3 py-2"
              onClick={() => {
                setDataMode('upload');
                setTab('dashboard');
              }}
            >
              {t(lang, 'goToUploadFlow')}
            </button>
          </div>
        </section>
      )}

      {tab === 'settings' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-2">
            <p className="font-semibold">{t(lang, 'benchmarkSettings')}</p>
            {Object.entries(benchmarks).map(([k, v]) => (
              <label key={k} className="flex items-center justify-between gap-3 text-sm">
                <span>{k}</span>
                <input type="number" step="0.01" value={v} onChange={(e) => setBenchmarks({ ...benchmarks, [k]: Number(e.target.value) })} className="w-28 rounded bg-slate-800 p-1" />
              </label>
            ))}
          </div>
          <div className="card space-y-2">
            <p className="font-semibold">{t(lang, 'businessInputs')}</p>
            {Object.entries(business).map(([k, v]) => (
              <label key={k} className="flex items-center justify-between gap-3 text-sm">
                <span>{k}</span>
                <input type="number" step="0.1" value={v} onChange={(e) => setBusiness({ ...business, [k]: Number(e.target.value) })} className="w-28 rounded bg-slate-800 p-1" />
              </label>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-6 card text-xs text-slate-400">
        <p>{t(lang, 'formulas')}: Hook Rate=3s/impressions, Hold Rate=ThruPlays/impressions, LPV Rate=LPV/link clicks, Purchases/LPV, LP-to-Checkout=checkouts/LPV.</p>
      </footer>
    </main>
  );
}
