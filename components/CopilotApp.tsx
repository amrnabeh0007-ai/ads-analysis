'use client';

import { useMemo, useState } from 'react';
import { calculateFunnelMetrics, detectMissingMetrics, runDecisionEngine, runDiagnosisEngine } from '@/lib/diagnosis';
import { CsvMapping, DataMode, GroupedCampaignData } from '@/lib/types';
import { demoMetrics } from '@/data/mockData';

const requiredMetricFields: Array<keyof CsvMapping> = ['spend', 'purchases', 'linkClicks', 'landingPageViews', 'costPerResult'];
const groupingFields: Array<keyof CsvMapping> = ['campaignName', 'productName', 'creativeName'];

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseNum = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[$,%\s]/g, '').replace(/,/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

const autoMapColumns = (headers: string[]): CsvMapping => {
  const synonyms: Record<keyof CsvMapping, string[]> = {
    campaignName: ['campaignname', 'campaign'],
    productName: ['product', 'productname', 'itemname'],
    creativeName: ['adname', 'ad', 'creative', 'creativename'],
    spend: ['amountspentusd', 'amountspent', 'spend', 'cost'],
    purchases: ['purchases', 'purchase', 'websitepurchases'],
    linkClicks: ['linkclicks', 'clickslink', 'outboundclicks', 'uniquelinkclicks'],
    landingPageViews: ['landingpageviews', 'lpv', 'websitelandingpageviews'],
    costPerResult: ['costperresult', 'cppurchase', 'costperpurchase']
  };

  const normalized = headers.map((h) => ({ original: h, key: normalize(h) }));
  const mapping: CsvMapping = {};

  (Object.keys(synonyms) as Array<keyof CsvMapping>).forEach((field) => {
    const hit = normalized.find((col) => synonyms[field].some((s) => col.key.includes(s)));
    if (hit) mapping[field] = hit.original;
  });

  return mapping;
};

const parseProductFromCampaign = (campaign: string) => {
  if (!campaign) return 'Unlabeled Product';
  const cleaned = campaign.replace(/\s+/g, ' ').trim();
  const separators = ['|', ' - ', '_', ' / ', '>'];
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const candidate = cleaned.split(sep)[0].trim();
      if (candidate) return candidate;
    }
  }
  return cleaned;
};

export default function CopilotApp() {
  const [dataMode, setDataMode] = useState<DataMode>('uploaded');
  const [fileName, setFileName] = useState('');
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<CsvMapping>({});
  const [uploadError, setUploadError] = useState('');

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedCreative, setSelectedCreative] = useState('');

  const hasUploadedData = csvRows.length > 0;

  const groupedData = useMemo(() => {
    const sourceRows = dataMode === 'demo' ? [
      {
        Campaign: 'Demo Product | Testing Campaign',
        Creative: 'Demo Creative A',
        Spend: String(demoMetrics.spend),
        Purchases: String(demoMetrics.purchases),
        'Link Clicks': String(demoMetrics.linkClicks),
        'Landing Page Views': String(demoMetrics.landingPageViews),
        'Cost Per Result': String(demoMetrics.costPerResult)
      }
    ] : csvRows;

    const activeMapping = dataMode === 'demo'
      ? {
          campaignName: 'Campaign',
          creativeName: 'Creative',
          spend: 'Spend',
          purchases: 'Purchases',
          linkClicks: 'Link Clicks',
          landingPageViews: 'Landing Page Views',
          costPerResult: 'Cost Per Result'
        }
      : mapping;

    const groups: GroupedCampaignData[] = sourceRows.map((row) => {
      const campaign = activeMapping.campaignName ? row[activeMapping.campaignName] || 'Unknown Campaign' : 'Unknown Campaign';
      const product = activeMapping.productName ? row[activeMapping.productName] || 'Unlabeled Product' : parseProductFromCampaign(campaign);
      const creative = activeMapping.creativeName ? row[activeMapping.creativeName] || 'No Creative' : 'No Creative';
      return { product, campaign, creative, rows: [row] };
    });

    const merged = new Map<string, GroupedCampaignData>();
    groups.forEach((g) => {
      const key = `${g.product}__${g.campaign}__${g.creative}`;
      const existing = merged.get(key);
      if (existing) existing.rows.push(...g.rows);
      else merged.set(key, { ...g });
    });

    return Array.from(merged.values());
  }, [csvRows, dataMode, mapping]);

  const productOptions = useMemo(() => Array.from(new Set(groupedData.map((g) => g.product))), [groupedData]);
  const campaignOptions = useMemo(() => Array.from(new Set(groupedData.filter((g) => g.product === selectedProduct).map((g) => g.campaign))), [groupedData, selectedProduct]);
  const creativeOptions = useMemo(() => Array.from(new Set(groupedData.filter((g) => g.product === selectedProduct && g.campaign === selectedCampaign).map((g) => g.creative))), [groupedData, selectedProduct, selectedCampaign]);

  const selectedRows = useMemo(() => {
    const found = groupedData.filter((g) => g.product === selectedProduct && g.campaign === selectedCampaign && g.creative === selectedCreative);
    return found.flatMap((f) => f.rows);
  }, [groupedData, selectedProduct, selectedCampaign, selectedCreative]);

  const aggregated = useMemo(() => {
    const read = (field: keyof CsvMapping) => {
      const col = mapping[field];
      if (!col) return 0;
      return selectedRows.reduce((sum, row) => sum + parseNum(row[col]), 0);
    };

    if (dataMode === 'demo') return demoMetrics;

    const purchases = read('purchases');
    const spend = read('spend');
    const providedCostPerResult = read('costPerResult');

    return {
      purchases,
      spend,
      linkClicks: read('linkClicks'),
      landingPageViews: read('landingPageViews'),
      costPerResult: providedCostPerResult > 0 ? providedCostPerResult : purchases > 0 ? spend / purchases : 0
    };
  }, [dataMode, mapping, selectedRows]);

  const missingMetrics = useMemo(() => detectMissingMetrics(mapping), [mapping]);
  const funnelMetrics = useMemo(() => calculateFunnelMetrics(aggregated), [aggregated]);
  const diagnosis = useMemo(() => runDiagnosisEngine(funnelMetrics, missingMetrics.length), [funnelMetrics, missingMetrics.length]);
  const decision = useMemo(() => runDecisionEngine(funnelMetrics, diagnosis), [funnelMetrics, diagnosis]);

  const readyForAnalysis = dataMode === 'demo' || (hasUploadedData && selectedProduct && selectedCampaign && selectedCreative);

  const handleCsvUpload = async (file: File) => {
    setUploadError('');
    setFileName(file.name);
    const text = await file.text();
    const parsedRows = parseCsvText(text).filter((row) => Object.values(row).some((v) => String(v).trim()));
    if (!parsedRows.length) {
      setUploadError('CSV is empty. Please upload a valid Meta Ads export.');
      return;
    }
    const headers = Object.keys(parsedRows[0]);
    setCsvRows(parsedRows);
    setCsvColumns(headers);
    setMapping(autoMapColumns(headers));
    setDataMode('uploaded');
    setSelectedProduct('');
    setSelectedCampaign('');
    setSelectedCreative('');
  };

  const modeLabel = dataMode === 'demo' ? 'Demo Mode' : 'Uploaded Data';

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Ecommerce Funnel Analysis — Phase 1</h1>
        <p className="text-sm text-slate-300">Flow: Upload → Auto map → Select product → See diagnosis → Get decision.</p>
      </header>

      <section className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <strong>Data Source:</strong>
          <span className="rounded bg-slate-800 px-2 py-1">{modeLabel}</span>
          {fileName && dataMode === 'uploaded' && <span className="rounded bg-slate-800 px-2 py-1">{fileName}</span>}
          <button className="rounded bg-slate-700 px-3 py-1" onClick={() => setDataMode('demo')}>Use Demo Mode</button>
          <button className="rounded bg-slate-700 px-3 py-1" onClick={() => setDataMode('uploaded')}>Use Uploaded Data</button>
        </div>

        <div className="rounded-lg border border-dashed border-slate-600 p-4">
          <p className="mb-2 text-sm">Upload Meta Ads CSV:</p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCsvUpload(file);
            }}
          />
          {uploadError && <p className="mt-2 text-sm text-red-300">{uploadError}</p>}
        </div>
      </section>

      {!hasUploadedData && dataMode === 'uploaded' && (
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-6 text-sm text-slate-300">
          <p className="font-semibold">Empty state</p>
          <p>No metrics are shown until a valid CSV is uploaded and a product/campaign/creative is selected.</p>
        </section>
      )}

      {hasUploadedData && dataMode === 'uploaded' && (
        <section className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold">Auto-mapping (manual override supported)</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {[...groupingFields, ...requiredMetricFields].map((field) => (
              <label key={field} className="flex items-center justify-between gap-3 rounded bg-slate-800 p-2 text-sm">
                <span>{field}</span>
                <select
                  value={mapping[field] ?? ''}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))}
                  className="w-56 rounded bg-slate-900 p-1"
                >
                  <option value="">Not mapped</option>
                  {csvColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
      )}

      {(hasUploadedData || dataMode === 'demo') && (
        <section className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold">Product grouping and selection</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <select className="rounded bg-slate-800 p-2" value={selectedProduct} onChange={(e) => { setSelectedProduct(e.target.value); setSelectedCampaign(''); setSelectedCreative(''); }}>
              <option value="">Select product</option>
              {productOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="rounded bg-slate-800 p-2" value={selectedCampaign} onChange={(e) => { setSelectedCampaign(e.target.value); setSelectedCreative(''); }} disabled={!selectedProduct}>
              <option value="">Select campaign</option>
              {campaignOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="rounded bg-slate-800 p-2" value={selectedCreative} onChange={(e) => setSelectedCreative(e.target.value)} disabled={!selectedCampaign}>
              <option value="">Select creative</option>
              {creativeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </section>
      )}

      {readyForAnalysis && (
        <>
          <section className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 text-lg font-semibold">Real funnel diagnosis (no fake values)</h2>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>Purchases ÷ Link clicks: {funnelMetrics.purchasePerLinkClick !== undefined ? `${(funnelMetrics.purchasePerLinkClick * 100).toFixed(2)}%` : 'Missing data'}</p>
              <p>Purchases ÷ Landing page views: {funnelMetrics.purchasePerLandingPageView !== undefined ? `${(funnelMetrics.purchasePerLandingPageView * 100).toFixed(2)}%` : 'Missing data'}</p>
              <p>Landing page view rate: {funnelMetrics.landingPageViewRate !== undefined ? `${(funnelMetrics.landingPageViewRate * 100).toFixed(2)}%` : 'Missing data'}</p>
              <p>Cost per result: {funnelMetrics.costPerResult !== undefined ? `$${funnelMetrics.costPerResult.toFixed(2)}` : 'Missing data'}</p>
            </div>
            {missingMetrics.length > 0 && (
              <div className="mt-3 rounded bg-amber-500/10 p-3 text-sm text-amber-200">
                <p className="font-semibold">Missing data detected:</p>
                <ul className="list-disc pl-5">
                  {missingMetrics.map((item) => (
                    <li key={item.key}>{item.label}: missing {item.missingFields.join(', ')}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
            <h2 className="mb-3 text-lg font-semibold">Diagnosis engine output</h2>
            <p><strong>Main problem:</strong> {diagnosis.mainProblem}</p>
            <p><strong>Secondary problem:</strong> {diagnosis.secondaryProblem}</p>
            <p><strong>Confidence:</strong> {(diagnosis.confidence * 100).toFixed(0)}%</p>
            <p className="mt-2 font-semibold">Reasoning</p>
            <ul className="list-disc pl-5">{diagnosis.reasoning.map((r) => <li key={r}>{r}</li>)}</ul>
            <p className="mt-2 font-semibold">What to fix</p>
            <ul className="list-disc pl-5">{diagnosis.fixes.map((f) => <li key={f}>{f}</li>)}</ul>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
            <h2 className="mb-3 text-lg font-semibold">Final decision engine</h2>
            <p><strong>Decision:</strong> {decision.decision.toUpperCase()}</p>
            <p><strong>Main bottleneck:</strong> {decision.mainBottleneck}</p>
            <p className="mt-2 font-semibold">Next 3 actions</p>
            <ol className="list-decimal pl-5">{decision.nextActions.map((a) => <li key={a}>{a}</li>)}</ol>
          </section>
        </>
      )}
    </main>
  );
}
