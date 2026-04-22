'use client';

import { useMemo, useState } from 'react';
import { buildDiagnosis, buildMetrics } from '@/lib/diagnosis';
import { CsvField, CsvMapping, MappingResult, NormalizedRow } from '@/lib/types';

type Lang = 'en' | 'ar';
type FileKind = 'campaign' | 'adset' | 'ad';

type Dataset = {
  fileName: string;
  rows: Record<string, string>[];
  headers: string[];
  mapping: CsvMapping;
  mappingSignals: Partial<Record<CsvField, MappingResult>>;
  kind: FileKind;
};

const text = {
  en: {
    title: 'Ecommerce Funnel Analysis — Phase 1',
    uploadCampaign: 'Upload Campaign-level CSV',
    uploadAd: 'Upload Ad-level CSV',
    onboarding: 'Upload your report / ارفع التقرير',
    mapping: 'Auto-mapping (editable)',
    confidence: 'Confidence',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    select: 'Selection flow',
    product: 'Product',
    campaign: 'Campaign',
    adset: 'Ad Set',
    creative: 'Creative / Ad',
    search: 'Type to filter | اكتب للبحث',
    adsetMissing: 'Ad set data not available in this file / بيانات الـ Ad Set غير موجودة في الملف',
    creativeMissing: 'Creative data not available in this file / بيانات الكريتف غير موجودة في الملف',
    available: 'Available Metrics / المؤشرات المتاحة',
    missing: 'Missing Metrics / المؤشرات غير المتاحة',
    unlock: 'How to unlock more analysis / ازاي تفتح تحليل أعمق',
    unavailable: 'Unavailable — missing required data / غير متاح — البيانات المطلوبة ناقصة',
    manual: 'Manual fallback values',
    diagnosis: 'Diagnosis',
    creativeBreakdown: 'Creative Performance Breakdown',
    noCreative: 'Creative analysis unavailable until ad-level file exists.',
    uploadedData: 'Uploaded Data / البيانات المرفوعة'
  },
  ar: {
    title: 'تحليل فانل الإيكوميرس — المرحلة الأولى',
    uploadCampaign: 'ارفع ملف CSV على مستوى الكامبين',
    uploadAd: 'ارفع ملف CSV على مستوى الإعلان',
    onboarding: 'ارفع التقرير / Upload your report',
    mapping: 'الربط التلقائي (قابل للتعديل)',
    confidence: 'الثقة',
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
    select: 'تسلسل الاختيار',
    product: 'المنتج',
    campaign: 'الحملة',
    adset: 'Ad Set',
    creative: 'الكريتف / الإعلان',
    search: 'اكتب للبحث | Type to filter',
    adsetMissing: 'بيانات الـ Ad Set غير موجودة في الملف / Ad set data not available in this file',
    creativeMissing: 'بيانات الكريتف غير موجودة في الملف / Creative data not available in this file',
    available: 'المؤشرات المتاحة / Available Metrics',
    missing: 'المؤشرات غير المتاحة / Missing Metrics',
    unlock: 'ازاي تفتح تحليل أعمق / How to unlock more analysis',
    unavailable: 'غير متاح — البيانات المطلوبة ناقصة / Unavailable — missing required data',
    manual: 'إدخال يدوي للقيم الناقصة',
    diagnosis: 'التشخيص',
    creativeBreakdown: 'تحليل أداء الكريتف',
    noCreative: 'تحليل الكريتف غير متاح إلا بعد رفع ملف على مستوى الإعلان.',
    uploadedData: 'البيانات المرفوعة / Uploaded Data'
  }
};

const fields: Array<{ key: CsvField; en: string; ar: string; numeric?: boolean }> = [
  { key: 'productName', en: 'Product Name', ar: 'اسم المنتج' },
  { key: 'campaignName', en: 'Campaign Name', ar: 'اسم الحملة' },
  { key: 'adSetName', en: 'Ad Set Name', ar: 'اسم مجموعة الإعلانات' },
  { key: 'adName', en: 'Ad Name', ar: 'اسم الإعلان' },
  { key: 'spend', en: 'Spend', ar: 'الإنفاق', numeric: true },
  { key: 'impressions', en: 'Impressions', ar: 'مرات الظهور', numeric: true },
  { key: 'linkClicks', en: 'Link Clicks', ar: 'نقرات الرابط', numeric: true },
  { key: 'landingPageViews', en: 'Landing Page Views', ar: 'زيارات اللاند', numeric: true },
  { key: 'purchases', en: 'Purchases', ar: 'المشتريات', numeric: true },
  { key: 'costPerResult', en: 'Cost per Result', ar: 'تكلفة النتيجة', numeric: true },
  { key: 'ctr', en: 'CTR', ar: 'CTR', numeric: true },
  { key: 'cpc', en: 'CPC', ar: 'CPC', numeric: true },
  { key: 'cpm', en: 'CPM', ar: 'CPM', numeric: true },
  { key: 'videoPlays', en: 'Video Plays', ar: 'مشاهدات الفيديو', numeric: true },
  { key: 'thruPlays', en: 'ThruPlays', ar: 'ThruPlays', numeric: true },
  { key: 'contentViews', en: 'Content Views', ar: 'مشاهدات المحتوى', numeric: true },
  { key: 'threeSecViews', en: '3-second Video Plays', ar: 'مشاهدات أول 3 ثواني', numeric: true },
  { key: 'checkoutsInitiated', en: 'Checkouts Initiated', ar: 'بدء الدفع', numeric: true },
  { key: 'uniqueOutboundClicks', en: 'Unique Outbound Clicks', ar: 'نقرات خارجية فريدة', numeric: true },
  { key: 'landingPageUrl', en: 'Landing Page URL', ar: 'رابط اللاند' },
  { key: 'productCost', en: 'Product Cost', ar: 'تكلفة المنتج', numeric: true },
  { key: 'shippingCost', en: 'Shipping Cost', ar: 'تكلفة الشحن', numeric: true },
  { key: 'operationsCost', en: 'Operations Cost', ar: 'تكلفة التشغيل', numeric: true }
];

const synonyms: Record<CsvField, string[]> = {
  productName: ['product name', 'product', 'item', 'sku'],
  campaignName: ['campaign name', 'campaign'],
  adSetName: ['ad set name', 'ad set', 'adset'],
  adName: ['ad name', 'ad', 'creative name', 'creative'],
  spend: ['amount spent', 'spend', 'amount spent egp', 'amount spent usd'],
  impressions: ['impressions'],
  linkClicks: ['link clicks', 'outbound clicks', 'clicks'],
  landingPageViews: ['landing page views', 'website landing page views', 'lpv'],
  purchases: ['purchases', 'website purchases', 'purchase'],
  costPerResult: ['cost per result', 'cost per purchase'],
  checkoutsInitiated: ['checkouts initiated', 'initiated checkout'],
  threeSecViews: ['3-second video plays', '3 second video plays'],
  thruPlays: ['thruplays', 'thru plays'],
  uniqueOutboundClicks: ['unique outbound clicks'],
  contentViews: ['content views', 'view content'],
  landingPageUrl: ['landing page url', 'destination url'],
  productCost: ['product cost'],
  shippingCost: ['shipping cost'],
  operationsCost: ['operations cost'],
  ctr: ['ctr', 'outbound ctr', 'link ctr'],
  cpc: ['cpc', 'cost per click'],
  cpm: ['cpm', 'cost per 1000'],
  videoPlays: ['video plays', 'video play']
};

const normalize = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const clean = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const toNumber = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s.replace(/[$,%\s]/g, '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

const splitCsvLine = (line: string) => {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else current += ch;
  }
  out.push(current);
  return out.map((x) => x.trim());
};

const parseCsvText = (raw: string): Record<string, string>[] => {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    return row;
  });
};

const detectFileKind = (headers: string[]): FileKind => {
  const normalized = headers.map((h) => normalize(h));
  if (normalized.some((h) => h.includes('ad name') || h === 'ad')) return 'ad';
  if (normalized.some((h) => h.includes('ad set'))) return 'adset';
  return 'campaign';
};

const scoreColumn = (field: CsvField, header: string): MappingResult => {
  let score = 0;
  const nHeader = normalize(header);
  for (const term of synonyms[field]) {
    const nTerm = normalize(term);
    if (nHeader === nTerm) score = Math.max(score, 1);
    else if (nHeader.includes(nTerm)) score = Math.max(score, 0.8);
    else if (clean(header).includes(clean(term))) score = Math.max(score, 0.6);
  }
  if (field === 'purchases' && nHeader.includes('results') && !nHeader.includes('purchase')) score = Math.min(score, 0.4);
  const isNumeric = Boolean(fields.find((f) => f.key === field)?.numeric);
  if (isNumeric && /(name|campaign|ad set|creative|url)/i.test(header)) score = 0;
  if (!isNumeric && /(spend|cost|amount|impressions|click|purchase|cpm|ctr|cpc)/i.test(header)) score = 0;

  if (score >= 0.9) return { column: header, confidence: 'high', reason: 'Exact/strong keyword match' };
  if (score >= 0.7) return { column: header, confidence: 'medium', reason: 'Partial keyword match' };
  if (score >= 0.55) return { column: header, confidence: 'low', reason: 'Weak keyword match' };
  return { confidence: 'low', reason: 'No reliable match' };
};

const autoMapColumns = (headers: string[]) => {
  const mapping: CsvMapping = {};
  const mappingSignals: Partial<Record<CsvField, MappingResult>> = {};
  (Object.keys(synonyms) as CsvField[]).forEach((field) => {
    const rank = { high: 3, medium: 2, low: 1 };
    const best = headers
      .map((h) => scoreColumn(field, h))
      .filter((r) => r.column)
      .sort((a, b) => rank[b.confidence] - rank[a.confidence])[0];
    mappingSignals[field] = best ?? { confidence: 'low', reason: 'No reliable match' };
    if (best?.column && best.confidence !== 'low') mapping[field] = best.column;
  });
  return { mapping, mappingSignals };
};

const inferProduct = (campaignName?: string) => {
  const source = campaignName || 'Unknown Product';
  const code = source.match(/([A-Za-z]{2,}\d{2,}|\d{3,})/)?.[1];
  const parts = source.split(/\||-|\/|_/).map((p) => p.trim()).filter(Boolean);
  const blocked = ['campaign', 'conversion', 'retarget', 'prospecting', 'sales', 'purchase'];
  const product = parts.find((p) => !blocked.some((b) => p.toLowerCase().includes(b))) || parts[0] || source;
  return { product, code };
};

const normalizeRows = (rows: Record<string, string>[], mapping: CsvMapping): NormalizedRow[] => rows.map((row) => {
  const campaignName = mapping.campaignName ? row[mapping.campaignName] : undefined;
  const inferred = inferProduct(campaignName);
  const num = (key: CsvField) => { const col = mapping[key]; return col ? toNumber(row[col]) : undefined; };
  return {
    campaignName,
    adSetName: mapping.adSetName ? row[mapping.adSetName] : undefined,
    adName: mapping.adName ? row[mapping.adName] : undefined,
    productName: mapping.productName ? row[mapping.productName] : undefined,
    inferredProduct: inferred.product,
    inferredCode: inferred.code,
    spend: num('spend'), impressions: num('impressions'), linkClicks: num('linkClicks'), landingPageViews: num('landingPageViews'), purchases: num('purchases'),
    costPerResult: num('costPerResult'), checkoutsInitiated: num('checkoutsInitiated'), threeSecViews: num('threeSecViews'), thruPlays: num('thruPlays'), uniqueOutboundClicks: num('uniqueOutboundClicks'),
    contentViews: num('contentViews'), ctr: num('ctr'), cpc: num('cpc'), cpm: num('cpm'), videoPlays: num('videoPlays'),
    landingPageUrl: mapping.landingPageUrl ? row[mapping.landingPageUrl] : undefined
  };
});

const SearchableSelect = ({ label, placeholder, options, value, disabled, onChange }: { label: string; placeholder: string; options: string[]; value: string; disabled?: boolean; onChange: (v: string) => void }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => options.filter((o) => normalize(o).includes(normalize(q))), [options, q]);
  return <div className="rounded bg-slate-800 p-2"><label className="mb-1 block text-xs">{label}</label><input className="mb-2 w-full rounded bg-slate-900 p-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} disabled={disabled} /><select className="w-full rounded bg-slate-900 p-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}><option value="">{placeholder}</option>{filtered.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>;
};

export default function CopilotApp() {
  const [lang, setLang] = useState<Lang>('en');
  const [campaignData, setCampaignData] = useState<Dataset | null>(null);
  const [adData, setAdData] = useState<Dataset | null>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedAdSet, setSelectedAdSet] = useState('');
  const [selectedAd, setSelectedAd] = useState('');
  const [manualValues, setManualValues] = useState<Partial<Record<CsvField, string>>>({});
  const t = text[lang];

  const onUpload = async (file: File, forcedType: 'campaign' | 'ad') => {
    const rows = parseCsvText(await file.text());
    const headers = Object.keys(rows[0] ?? {});
    const auto = autoMapColumns(headers);
    const dataset: Dataset = { fileName: file.name, rows, headers, mapping: auto.mapping, mappingSignals: auto.mappingSignals, kind: detectFileKind(headers) };
    if (forcedType === 'campaign') setCampaignData(dataset); else setAdData(dataset);
    setSelectedProduct(''); setSelectedCampaign(''); setSelectedAdSet(''); setSelectedAd('');
  };

  const campaignRows = useMemo(() => campaignData ? normalizeRows(campaignData.rows, campaignData.mapping) : [], [campaignData]);
  const adRows = useMemo(() => adData ? normalizeRows(adData.rows, adData.mapping) : [], [adData]);
  const baseRows = campaignRows.length ? campaignRows : adRows;

  const productLabel = (r: NormalizedRow) => `${r.inferredCode ? `[${r.inferredCode}] ` : ''}${r.productName || r.inferredProduct || 'Unknown'}`;
  const products = useMemo(() => Array.from(new Set(baseRows.map(productLabel))), [baseRows]);
  const campaigns = useMemo(() => Array.from(new Set(baseRows.filter((r) => productLabel(r) === selectedProduct).map((r) => r.campaignName).filter(Boolean) as string[])), [baseRows, selectedProduct]);
  const adSets = useMemo(() => Array.from(new Set(adRows.filter((r) => r.campaignName === selectedCampaign).map((r) => r.adSetName).filter(Boolean) as string[])), [adRows, selectedCampaign]);
  const creatives = useMemo(() => Array.from(new Set(adRows.filter((r) => r.campaignName === selectedCampaign && (!selectedAdSet || r.adSetName === selectedAdSet)).map((r) => r.adName).filter((v): v is string => Boolean(v && /[A-Za-z\u0600-\u06FF]/.test(v) && toNumber(v) === undefined)))), [adRows, selectedCampaign, selectedAdSet]);

  const selectedRows = useMemo(() => (campaignRows.length ? campaignRows : adRows).filter((r) => productLabel(r) === selectedProduct && r.campaignName === selectedCampaign && (!selectedAdSet || r.adSetName === selectedAdSet) && (!selectedAd || r.adName === selectedAd)), [campaignRows, adRows, selectedProduct, selectedCampaign, selectedAdSet, selectedAd]);

  const sum = (rows: NormalizedRow[], key: keyof NormalizedRow): number | undefined => { let total = 0; let has = false; rows.forEach((r) => { const n = r[key]; if (typeof n === 'number' && Number.isFinite(n)) { total += n; has = true; } }); return has ? total : undefined; };

  const numericInput = useMemo(() => {
    const read = (key: keyof NormalizedRow, manual: CsvField) => toNumber(manualValues[manual]) ?? sum(selectedRows, key);
    return { spend: read('spend', 'spend'), impressions: read('impressions', 'impressions'), linkClicks: read('linkClicks', 'linkClicks'), landingPageViews: read('landingPageViews', 'landingPageViews'), purchases: read('purchases', 'purchases'), uniqueOutboundClicks: read('uniqueOutboundClicks', 'uniqueOutboundClicks'), checkoutsInitiated: read('checkoutsInitiated', 'checkoutsInitiated'), threeSecViews: read('threeSecViews', 'threeSecViews'), thruPlays: read('thruPlays', 'thruPlays'), contentViews: read('contentViews', 'contentViews'), videoPlays: read('videoPlays', 'videoPlays') };
  }, [manualValues, selectedRows]);

  const metrics = useMemo(() => buildMetrics(numericInput), [numericInput]);
  const diagnosis = useMemo(() => buildDiagnosis(numericInput, metrics, { hasAdLevelData: adRows.length > 0, hasPurchases: numericInput.purchases !== undefined }), [numericInput, metrics, adRows.length]);

  const creativeMetrics = useMemo(() => {
    const entries = creatives.map((name) => {
      const rows = adRows.filter((r) => r.campaignName === selectedCampaign && (!selectedAdSet || r.adSetName === selectedAdSet) && r.adName === name);
      const m = buildMetrics({ spend: sum(rows, 'spend'), impressions: sum(rows, 'impressions'), linkClicks: sum(rows, 'linkClicks'), landingPageViews: sum(rows, 'landingPageViews'), purchases: sum(rows, 'purchases'), thruPlays: sum(rows, 'thruPlays'), videoPlays: sum(rows, 'videoPlays'), threeSecViews: sum(rows, 'threeSecViews') });
      return { name, m };
    });
    const score = (x: { m: ReturnType<typeof buildMetrics> }) => x.m.find((i) => i.key === 'landingCvr')?.value ?? -1;
    return { entries, best: entries.slice().sort((a, b) => score(b) - score(a))[0], worst: entries.slice().sort((a, b) => score(a) - score(b))[0] };
  }, [creatives, adRows, selectedCampaign, selectedAdSet]);

  const statusBanner = (dataset: Dataset | null) => {
    if (!dataset) return null;
    const msg = dataset.kind === 'campaign'
      ? 'This is a campaign-level file. Creative analysis is limited unless an ad-level file is also uploaded. / الملف ده على مستوى الكامبين — تحليل الكريتف محدود إلا لو تم رفع ملف على مستوى الإعلان'
      : dataset.kind === 'ad'
      ? 'This is an ad-level file. Creative analysis is available. / الملف ده على مستوى الإعلان — تحليل الكريتف متاح'
      : 'This is an ad set-level file. Creative analysis needs ad names. / الملف ده على مستوى الـ Ad Set — تحليل الكريتف يحتاج أسماء إعلانات';
    return <p className="mt-2 rounded bg-blue-950 p-2 text-xs text-blue-100">{msg}</p>;
  };

  const hasData = Boolean(campaignData || adData);
  const ready = hasData && selectedProduct && selectedCampaign;
  const availableMetrics = metrics.filter((m) => m.value !== undefined);
  const missingMetrics = metrics.filter((m) => m.value === undefined);

  return <main className="mx-auto min-h-screen max-w-6xl p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">{t.title}</h1><div className="flex gap-2"><button onClick={() => setLang('en')} className={`rounded px-3 py-1 ${lang === 'en' ? 'bg-blue-600' : 'bg-slate-700'}`}>EN</button><button onClick={() => setLang('ar')} className={`rounded px-3 py-1 ${lang === 'ar' ? 'bg-blue-600' : 'bg-slate-700'}`}>AR</button></div></div>

    <section className="mb-4 rounded border border-slate-700 bg-slate-900 p-4"><div className="grid gap-3 md:grid-cols-2"><div><label className="mb-1 block text-sm">{t.uploadCampaign}</label><input type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, 'campaign'); }} />{campaignData && <p className="mt-1 text-xs text-slate-300">{t.uploadedData}: {campaignData.fileName}</p>}{statusBanner(campaignData)}</div><div><label className="mb-1 block text-sm">{t.uploadAd}</label><input type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, 'ad'); }} />{adData && <p className="mt-1 text-xs text-slate-300">{t.uploadedData}: {adData.fileName}</p>}{statusBanner(adData)}</div></div>{!hasData && <p className="mt-3 text-sm text-slate-300">{t.onboarding}</p>}</section>

    {[campaignData, adData].filter(Boolean).map((d, idx) => {
      const dataset = d as Dataset;
      return <section key={`${dataset.fileName}-${idx}`} className="mb-4 rounded border border-slate-700 bg-slate-900 p-4"><h2 className="mb-2 text-lg font-semibold">{t.mapping} — {dataset.fileName}</h2><div className="grid gap-2 md:grid-cols-2">{fields.map((field) => { const sig = dataset.mappingSignals[field.key]; return <label key={`${dataset.fileName}-${field.key}`} className="rounded bg-slate-800 p-2 text-sm"><div className="mb-1 flex justify-between"><span>{field.en} / {field.ar}</span><span className="text-xs text-amber-300">{t.confidence}: {t[sig?.confidence ?? 'low']}</span></div><select value={dataset.mapping[field.key] ?? ''} className="w-full rounded bg-slate-900 p-2" onChange={(e) => { const value = e.target.value || undefined; if (dataset === campaignData) setCampaignData({ ...dataset, mapping: { ...dataset.mapping, [field.key]: value } }); if (dataset === adData) setAdData({ ...dataset, mapping: { ...dataset.mapping, [field.key]: value } }); }}><option value="">Not mapped / غير مربوط</option>{dataset.headers.map((h) => <option key={`${field.key}-${h}`} value={h}>{h}</option>)}</select></label>; })}</div></section>;
    })}

    {hasData && <section className="mb-4 rounded border border-slate-700 bg-slate-900 p-4"><h2 className="mb-2 text-lg font-semibold">{t.select}</h2><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"><SearchableSelect label={t.product} placeholder={t.search} options={products} value={selectedProduct} onChange={(v) => { setSelectedProduct(v); setSelectedCampaign(''); setSelectedAdSet(''); setSelectedAd(''); }} /><SearchableSelect label={t.campaign} placeholder={t.search} options={campaigns} value={selectedCampaign} onChange={(v) => { setSelectedCampaign(v); setSelectedAdSet(''); setSelectedAd(''); }} disabled={!selectedProduct} />{adSets.length ? <SearchableSelect label={t.adset} placeholder={t.search} options={adSets} value={selectedAdSet} onChange={(v) => { setSelectedAdSet(v); setSelectedAd(''); }} disabled={!selectedCampaign} /> : <p className="rounded bg-slate-800 p-2 text-sm text-amber-200">{t.adsetMissing}</p>}{creatives.length ? <SearchableSelect label={t.creative} placeholder={t.search} options={creatives} value={selectedAd} onChange={setSelectedAd} disabled={!selectedCampaign} /> : <p className="rounded bg-slate-800 p-2 text-sm text-amber-200">{t.creativeMissing}</p>}</div></section>}

    <section className="mb-4 rounded border border-slate-700 bg-slate-900 p-4"><h2 className="mb-2 text-lg font-semibold">{t.manual}</h2><div className="grid gap-2 md:grid-cols-3">{['purchases', 'checkoutsInitiated', 'uniqueOutboundClicks', 'threeSecViews', 'thruPlays', 'landingPageUrl', 'productCost', 'shippingCost', 'operationsCost'].map((k) => fields.find((f) => f.key === k as CsvField)!).map((f) => <label key={f.key} className="text-sm"><span className="mb-1 block">{f.en} / {f.ar}</span><input className="w-full rounded bg-slate-800 p-2" value={manualValues[f.key] ?? ''} onChange={(e) => setManualValues((prev) => ({ ...prev, [f.key]: e.target.value }))} /></label>)}</div></section>

    {ready && <section className="space-y-4"><div className="rounded border border-slate-700 bg-slate-900 p-4"><h3 className="mb-2 text-lg font-semibold">{t.available}</h3><div className="grid gap-2 md:grid-cols-2">{availableMetrics.map((m) => <div key={m.key} className="rounded bg-slate-800 p-2"><p className="font-semibold">{m.labelEn} — {m.labelAr}</p><p className="text-xs text-slate-300">{m.formula}</p><p className="text-lg">{m.percentage ? `${((m.value ?? 0) * 100).toFixed(2)}%` : (m.value ?? 0).toFixed(2)}</p><p className="text-xs text-slate-300">{m.tooltipAr}</p></div>)}</div></div>
      <div className="rounded border border-slate-700 bg-slate-900 p-4"><h3 className="mb-2 text-lg font-semibold">{t.missing}</h3><ul className="list-disc space-y-1 ps-5 text-sm text-amber-200">{missingMetrics.map((m) => <li key={m.key}>{m.labelEn}: {t.unavailable}</li>)}{numericInput.threeSecViews === undefined && <li>Hook Rate unavailable — missing 3-second video plays / الهُوك ريت غير متاح — بيانات أول 3 ثواني غير موجودة</li>}</ul><h4 className="mt-3 font-semibold">{t.unlock}</h4><ul className="list-disc space-y-1 ps-5 text-sm"><li>Add purchases to unlock Landing CVR and CPA / أضف المشتريات لفتح Landing CVR وCPA</li><li>Add 3-second video plays to unlock Hook Rate / أضف مشاهدات أول 3 ثواني لفتح Hook Rate</li><li>Add ThruPlays to unlock Hold Rate / أضف ThruPlays لفتح Hold Rate</li><li>Add landing page URL to unlock landing audit / أضف رابط اللاند لفتح مراجعة اللاند</li>{!adRows.length && <li>Upload ad-level file to unlock creative analysis / ارفع ملف مستوى الإعلان لفتح تحليل الكريتف</li>}</ul></div>
      <div className="rounded border border-slate-700 bg-slate-900 p-4"><h3 className="mb-2 text-lg font-semibold">{t.diagnosis}</h3><div className="space-y-3 text-sm">{diagnosis.issues.map((i) => <div key={i.titleEn} className="rounded bg-slate-800 p-3"><p className="font-semibold">{lang === 'ar' ? i.titleAr : i.titleEn}</p><p><strong>{lang === 'ar' ? 'الاختناق الأساسي' : 'Primary bottleneck'}:</strong> {lang === 'ar' ? i.primaryBottleneckAr : i.primaryBottleneckEn}</p><p><strong>{lang === 'ar' ? 'مشكلة ثانوية' : 'Secondary issue'}:</strong> {lang === 'ar' ? i.secondaryIssueAr : i.secondaryIssueEn}</p><p><strong>{lang === 'ar' ? 'الدليل' : 'Evidence'}:</strong> {lang === 'ar' ? i.evidenceAr : i.evidenceEn}</p><p><strong>{lang === 'ar' ? 'الثقة' : 'Confidence'}:</strong> {i.confidence}</p><p><strong>{lang === 'ar' ? 'الأسباب المحتملة' : 'Likely causes'}:</strong> {(lang === 'ar' ? i.likelyCausesAr : i.likelyCausesEn).join('، ')}</p><p><strong>{lang === 'ar' ? 'الإجراء التالي' : 'Next action'}:</strong> {lang === 'ar' ? i.nextActionAr : i.nextActionEn}</p></div>)}</div></div>
      <div className="rounded border border-slate-700 bg-slate-900 p-4"><h3 className="mb-2 text-lg font-semibold">{t.creativeBreakdown}</h3>{!adRows.length && <p className="text-sm text-amber-200">{t.noCreative}</p>}{Boolean(adRows.length) && <><p className="mb-2 text-sm">Best performing creative: {creativeMetrics.best?.name || 'N/A'} | Worst performing creative: {creativeMetrics.worst?.name || 'N/A'}</p><ul className="list-disc space-y-1 ps-5 text-sm">{creativeMetrics.entries.map(({ name, m }) => { const ctr = m.find((x) => x.key === 'ctr')?.value; const cpa = m.find((x) => x.key === 'cpa')?.value; const hold = m.find((x) => x.key === 'holdRate')?.value; return <li key={name}>{name}: CTR {ctr !== undefined ? `${(ctr * 100).toFixed(2)}%` : 'N/A'} | CPA {cpa !== undefined ? cpa.toFixed(2) : 'N/A'} | Hold {hold !== undefined ? `${(hold * 100).toFixed(2)}%` : 'N/A'}</li>; })}</ul></>}</div>
    </section>}
  </main>;
}
