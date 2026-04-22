'use client';

import { useMemo, useState } from 'react';
import { buildDiagnosis, buildMetrics } from '@/lib/diagnosis';
import { CsvField, CsvMapping, GroupedCampaignData, MappingConfidence, MappingResult } from '@/lib/types';

type Lang = 'en' | 'ar';

type ManualValues = Partial<Record<CsvField, string>>;

const FIELDS: Array<{ key: CsvField; en: string; ar: string; numeric?: boolean }> = [
  { key: 'productName', en: 'Product Name', ar: 'اسم المنتج' },
  { key: 'campaignName', en: 'Campaign Name', ar: 'اسم الحملة' },
  { key: 'adSetName', en: 'Ad Set Name', ar: 'اسم مجموعة الإعلانات' },
  { key: 'creativeName', en: 'Ad / Creative Name', ar: 'اسم الإعلان / الكريتف' },
  { key: 'spend', en: 'Spend', ar: 'الإنفاق', numeric: true },
  { key: 'impressions', en: 'Impressions', ar: 'مرات الظهور', numeric: true },
  { key: 'linkClicks', en: 'Link Clicks', ar: 'نقرات الرابط', numeric: true },
  { key: 'landingPageViews', en: 'Landing Page Views', ar: 'زيارات صفحة الهبوط', numeric: true },
  { key: 'purchases', en: 'Purchases', ar: 'المشتريات', numeric: true },
  { key: 'costPerResult', en: 'Cost per Result', ar: 'تكلفة النتيجة', numeric: true },
  { key: 'checkoutsInitiated', en: 'Checkouts Initiated', ar: 'بدء إتمام الشراء', numeric: true },
  { key: 'threeSecViews', en: '3-second Video Plays', ar: 'مشاهدات 3 ثواني', numeric: true },
  { key: 'thruPlays', en: 'ThruPlays', ar: 'ThruPlays', numeric: true },
  { key: 'uniqueOutboundClicks', en: 'Unique Outbound Clicks', ar: 'نقرات خارجية فريدة', numeric: true },
  { key: 'contentViews', en: 'Content Views', ar: 'مشاهدات المحتوى', numeric: true },
  { key: 'landingPageUrl', en: 'Landing Page URL', ar: 'رابط صفحة الهبوط' },
  { key: 'productCost', en: 'Product Cost', ar: 'تكلفة المنتج', numeric: true },
  { key: 'shippingCost', en: 'Shipping Cost', ar: 'تكلفة الشحن', numeric: true },
  { key: 'operationsCost', en: 'Operations Cost', ar: 'تكلفة التشغيل', numeric: true }
];

const text = {
  en: {
    title: 'Ecommerce Funnel Analysis — Phase 1 Fix',
    mode: 'Input Mode',
    csv: 'Upload CSV',
    manual: 'Manual Entry',
    uploaded: 'Uploaded Data',
    empty: 'No data yet. Upload CSV or use manual entry.',
    map: 'Strict CSV mapping',
    confidence: 'Confidence',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    select: 'Selection flow',
    product: 'Product',
    campaign: 'Campaign',
    adset: 'Ad Set',
    creative: 'Creative / Ad',
    search: 'Type to search...',
    adsetMissing: 'Ad set data not available in this file',
    creativeMissing: 'Creative data not available in this file',
    available: 'Available metrics',
    missingInputs: 'Missing inputs',
    mainDiagnosis: 'Main diagnosis',
    secondaryDiagnosis: 'Secondary diagnosis',
    whatNext: 'What to do next',
    unavailable: 'unavailable',
    missingFields: 'missing required fields',
    understanding: 'Understanding Metrics / شرح الأرقام',
    language: 'Language'
  },
  ar: {
    title: 'تحليل الفانل — إصلاح المرحلة الأولى',
    mode: 'وضع الإدخال',
    csv: 'رفع CSV',
    manual: 'إدخال يدوي',
    uploaded: 'بيانات مرفوعة',
    empty: 'لا توجد بيانات بعد. ارفع CSV أو أدخل يدويًا.',
    map: 'ربط CSV بدقة',
    confidence: 'الثقة',
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
    select: 'تسلسل الاختيار',
    product: 'المنتج',
    campaign: 'الحملة',
    adset: 'مجموعة الإعلانات',
    creative: 'الإعلان / الكريتف',
    search: 'اكتب للبحث...',
    adsetMissing: 'Ad set data not available in this file',
    creativeMissing: 'Creative data not available in this file',
    available: 'المؤشرات المتاحة',
    missingInputs: 'المدخلات الناقصة',
    mainDiagnosis: 'التشخيص الأساسي',
    secondaryDiagnosis: 'التشخيص الثانوي',
    whatNext: 'ماذا تفعل الآن',
    unavailable: 'غير متاح',
    missingFields: 'بيانات مطلوبة ناقصة',
    understanding: 'شرح الأرقام (Understanding Metrics)',
    language: 'اللغة'
  }
};

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const toNum = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const numeric = Number(raw.replace(/[,$%\s]/g, '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : undefined;
};

const parseCsvText = (textValue: string): Record<string, string>[] => {
  const rows = textValue.split(/\r?\n/).filter(Boolean);
  if (!rows.length) return [];
  const headers = rows[0].split(',').map((h) => h.trim());
  return rows.slice(1).map((line) => {
    const values = line.split(',');
    const out: Record<string, string> = {};
    headers.forEach((header, index) => {
      out[header] = (values[index] ?? '').trim();
    });
    return out;
  });
};

const synonyms: Record<CsvField, string[]> = {
  productName: ['product name', 'product', 'item name', 'sku name'],
  campaignName: ['campaign name', 'campaign'],
  adSetName: ['ad set name', 'adset name', 'ad set'],
  creativeName: ['ad name', 'creative name', 'ad creative', 'ad'],
  spend: ['amount spent', 'spend', 'amount spent egp', 'cost'],
  impressions: ['impressions'],
  linkClicks: ['link clicks', 'clicks link', 'outbound clicks', 'unique link clicks'],
  landingPageViews: ['landing page views', 'website landing page views', 'lpv'],
  purchases: ['purchases', 'website purchases', 'results purchases', 'purchase'],
  costPerResult: ['cost per result', 'cost per purchase'],
  checkoutsInitiated: ['checkouts initiated', 'initiated checkout'],
  threeSecViews: ['3-second video plays', '3 second video plays'],
  thruPlays: ['thruplays', 'thru plays'],
  uniqueOutboundClicks: ['unique outbound clicks'],
  contentViews: ['content views', 'view content'],
  landingPageUrl: ['landing page url', 'website url'],
  productCost: ['product cost'],
  shippingCost: ['shipping cost'],
  operationsCost: ['operations cost']
};

const isNumericField = (field: CsvField) => Boolean(FIELDS.find((f) => f.key === field)?.numeric);

const scoreColumn = (field: CsvField, header: string): MappingResult => {
  const normalizedHeader = normalize(header);
  const collapsed = clean(header);
  const list = synonyms[field];
  let score = 0;
  for (const term of list) {
    const normalizedTerm = normalize(term);
    if (normalizedHeader === normalizedTerm) score = Math.max(score, 1);
    else if (normalizedHeader.includes(normalizedTerm)) score = Math.max(score, 0.75);
    else if (collapsed.includes(clean(term))) score = Math.max(score, 0.6);
  }

  if (isNumericField(field) && /(name|campaign|ad set|creative|product)/i.test(header)) score = 0;
  if (!isNumericField(field) && /(spend|cost|amount|impressions|click|purchase|result)/i.test(header) && !/(name|url)/i.test(header)) score = 0;

  if (score >= 0.9) return { column: header, confidence: 'high', reason: 'Exact match' };
  if (score >= 0.7) return { column: header, confidence: 'medium', reason: 'Close header match' };
  if (score >= 0.55) return { column: header, confidence: 'low', reason: 'Weak match' };
  return { confidence: 'low', reason: 'No reliable match' };
};

const autoMapColumns = (headers: string[]) => {
  const mapping: CsvMapping = {};
  const confidenceMap: Partial<Record<CsvField, MappingResult>> = {};

  (Object.keys(synonyms) as CsvField[]).forEach((field) => {
    const scored = headers.map((h) => scoreColumn(field, h)).filter((r) => r.column);
    const best = scored.sort((a, b) => {
      const rank = { high: 3, medium: 2, low: 1 };
      return rank[b.confidence] - rank[a.confidence];
    })[0];
    confidenceMap[field] = best ?? { confidence: 'low', reason: 'No reliable match' };
    if (best && best.confidence === 'high' && best.column) mapping[field] = best.column;
  });

  return { mapping, confidenceMap };
};

const parseProductInfo = (campaignName: string) => {
  const textValue = campaignName || 'Unknown Product';
  const code = textValue.match(/([A-Z]{2,}\d{2,}|\d{3,})/)?.[1];
  const product = textValue.split(/\||-|\//)[0]?.trim() || textValue;
  return { product, code };
};

const SearchableSelect = ({ label, placeholder, options, value, onChange, disabled }: { label: string; placeholder: string; options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean }) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => options.filter((o) => normalize(o).includes(normalize(query))), [options, query]);

  return (
    <div className="rounded bg-slate-800 p-2">
      <label className="mb-1 block text-xs text-slate-300">{label}</label>
      <input disabled={disabled} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="mb-2 w-full rounded bg-slate-900 p-2 text-sm" />
      <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded bg-slate-900 p-2 text-sm">
        <option value="">{placeholder}</option>
        {filtered.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
};

export default function CopilotApp() {
  const [lang, setLang] = useState<Lang>('en');
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('csv');
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CsvMapping>({});
  const [mappingSignals, setMappingSignals] = useState<Partial<Record<CsvField, MappingResult>>>({});
  const [manualValues, setManualValues] = useState<ManualValues>({});

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedAdSet, setSelectedAdSet] = useState('');
  const [selectedCreative, setSelectedCreative] = useState('');

  const t = text[lang];

  const grouped = useMemo(() => {
    if (!csvRows.length) return [] as GroupedCampaignData[];
    const campaignCol = mapping.campaignName;
    const adSetCol = mapping.adSetName;
    const creativeCol = mapping.creativeName;
    const productCol = mapping.productName;

    const bins = new Map<string, GroupedCampaignData>();
    csvRows.forEach((row) => {
      const campaign = campaignCol ? row[campaignCol] || 'Unknown Campaign' : 'Unknown Campaign';
      const parsed = parseProductInfo(campaign);
      const product = productCol ? row[productCol] || parsed.product : parsed.product;
      const adSet = adSetCol ? row[adSetCol] || undefined : undefined;
      const creative = creativeCol ? row[creativeCol] || undefined : undefined;
      const key = `${product}|${campaign}|${adSet ?? ''}|${creative ?? ''}`;
      const existing = bins.get(key);
      if (existing) existing.rows.push(row);
      else bins.set(key, { product, productCode: parsed.code, campaign, adSet, creative, rows: [row] });
    });
    return Array.from(bins.values());
  }, [csvRows, mapping]);

  const products = useMemo(() => Array.from(new Set(grouped.map((g) => `${g.productCode ? `[${g.productCode}] ` : ''}${g.product}`))), [grouped]);
  const campaigns = useMemo(() => Array.from(new Set(grouped.filter((g) => `${g.productCode ? `[${g.productCode}] ` : ''}${g.product}` === selectedProduct).map((g) => g.campaign))), [grouped, selectedProduct]);
  const adSets = useMemo(() => Array.from(new Set(grouped.filter((g) => `${g.productCode ? `[${g.productCode}] ` : ''}${g.product}` === selectedProduct && g.campaign === selectedCampaign).map((g) => g.adSet).filter(Boolean) as string[])), [grouped, selectedProduct, selectedCampaign]);
  const creatives = useMemo(() => Array.from(new Set(grouped.filter((g) => `${g.productCode ? `[${g.productCode}] ` : ''}${g.product}` === selectedProduct && g.campaign === selectedCampaign && (!mapping.adSetName || g.adSet === selectedAdSet)).map((g) => g.creative).filter(Boolean) as string[])), [grouped, mapping.adSetName, selectedProduct, selectedCampaign, selectedAdSet]);

  const selectedRows = useMemo(() => grouped.filter((g) => `${g.productCode ? `[${g.productCode}] ` : ''}${g.product}` === selectedProduct && g.campaign === selectedCampaign && (!mapping.adSetName || g.adSet === selectedAdSet) && (!mapping.creativeName || g.creative === selectedCreative)).flatMap((g) => g.rows), [grouped, mapping.adSetName, mapping.creativeName, selectedProduct, selectedCampaign, selectedAdSet, selectedCreative]);

  const numericInput = useMemo(() => {
    const read = (field: CsvField): number | undefined => {
      const manual = toNum(manualValues[field]);
      if (manual !== undefined) return manual;
      const col = mapping[field];
      if (!col || !selectedRows.length) return undefined;
      let sum = 0;
      let has = false;
      selectedRows.forEach((row) => {
        const value = toNum(row[col]);
        if (value !== undefined) {
          sum += value;
          has = true;
        }
      });
      return has ? sum : undefined;
    };

    return {
      spend: read('spend'),
      impressions: read('impressions'),
      linkClicks: read('linkClicks'),
      landingPageViews: read('landingPageViews'),
      purchases: read('purchases'),
      uniqueOutboundClicks: read('uniqueOutboundClicks'),
      checkoutsInitiated: read('checkoutsInitiated'),
      threeSecViews: read('threeSecViews'),
      thruPlays: read('thruPlays')
    };
  }, [mapping, manualValues, selectedRows]);

  const metrics = useMemo(() => buildMetrics(numericInput), [numericInput]);
  const diagnosis = useMemo(() => buildDiagnosis(numericInput, metrics), [numericInput, metrics]);

  const handleCsvUpload = async (file: File) => {
    const textValue = await file.text();
    const parsed = parseCsvText(textValue).filter((r) => Object.values(r).some((v) => v.trim()));
    const headers = Object.keys(parsed[0] ?? {});
    const auto = autoMapColumns(headers);
    setCsvRows(parsed);
    setCsvColumns(headers);
    setMapping(auto.mapping);
    setMappingSignals(auto.confidenceMap);
    setSelectedProduct('');
    setSelectedCampaign('');
    setSelectedAdSet('');
    setSelectedCreative('');
  };

  const ready = inputMode === 'manual' || (selectedRows.length > 0 && selectedProduct && selectedCampaign && (!mapping.adSetName || selectedAdSet) && (!mapping.creativeName || selectedCreative));

  const availableMetrics = metrics.filter((m) => m.value !== undefined);
  const missingMetrics = metrics.filter((m) => m.value === undefined);

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <div className="flex items-center gap-2 text-sm">
          <span>{t.language}</span>
          <button onClick={() => setLang('en')} className={`rounded px-3 py-1 ${lang === 'en' ? 'bg-blue-600' : 'bg-slate-700'}`}>EN</button>
          <button onClick={() => setLang('ar')} className={`rounded px-3 py-1 ${lang === 'ar' ? 'bg-blue-600' : 'bg-slate-700'}`}>AR</button>
        </div>
      </div>

      <section className="mb-4 rounded border border-slate-700 bg-slate-900 p-4">
        <p className="mb-2 text-sm font-semibold">{t.mode}</p>
        <div className="mb-3 flex gap-2">
          <button onClick={() => setInputMode('csv')} className={`rounded px-3 py-1 ${inputMode === 'csv' ? 'bg-blue-600' : 'bg-slate-700'}`}>{t.csv}</button>
          <button onClick={() => setInputMode('manual')} className={`rounded px-3 py-1 ${inputMode === 'manual' ? 'bg-blue-600' : 'bg-slate-700'}`}>{t.manual}</button>
        </div>

        {inputMode === 'csv' && (
          <input type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); }} />
        )}

        {!csvRows.length && inputMode === 'csv' && <p className="mt-2 text-sm text-slate-300">{t.empty}</p>}
      </section>

      {!!csvRows.length && inputMode === 'csv' && (
        <section className="mb-4 rounded border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-2 text-lg font-semibold">{t.map}</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {FIELDS.map((field) => {
              const sig = mappingSignals[field.key];
              const cLabel = sig?.confidence ? t[sig.confidence as keyof typeof t] : t.low;
              return (
                <label key={field.key} className="rounded bg-slate-800 p-2 text-sm">
                  <div className="mb-1 flex justify-between">
                    <span>{field.en} / {field.ar}</span>
                    <span className="text-xs text-amber-300">{t.confidence}: {cLabel}</span>
                  </div>
                  <select value={mapping[field.key] ?? ''} onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value || undefined }))} className="w-full rounded bg-slate-900 p-2">
                    <option value="">Not mapped / غير مربوط</option>
                    {csvColumns.map((col) => <option key={`${field.key}-${col}`} value={col}>{col}</option>)}
                  </select>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {!!csvRows.length && inputMode === 'csv' && (
        <section className="mb-4 rounded border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-2 text-lg font-semibold">{t.select}</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <SearchableSelect label={`${t.product}`} placeholder={t.search} options={products} value={selectedProduct} onChange={(v) => { setSelectedProduct(v); setSelectedCampaign(''); setSelectedAdSet(''); setSelectedCreative(''); }} />
            <SearchableSelect label={`${t.campaign}`} placeholder={t.search} options={campaigns} value={selectedCampaign} onChange={(v) => { setSelectedCampaign(v); setSelectedAdSet(''); setSelectedCreative(''); }} disabled={!selectedProduct} />
            {mapping.adSetName ? <SearchableSelect label={`${t.adset}`} placeholder={t.search} options={adSets} value={selectedAdSet} onChange={(v) => { setSelectedAdSet(v); setSelectedCreative(''); }} disabled={!selectedCampaign} /> : <p className="rounded bg-slate-800 p-3 text-sm text-amber-200">{t.adsetMissing}</p>}
            {mapping.creativeName ? <SearchableSelect label={`${t.creative}`} placeholder={t.search} options={creatives} value={selectedCreative} onChange={setSelectedCreative} disabled={!selectedCampaign || (Boolean(mapping.adSetName) && !selectedAdSet)} /> : <p className="rounded bg-slate-800 p-3 text-sm text-amber-200">{t.creativeMissing}</p>}
          </div>
        </section>
      )}

      <section className="mb-4 rounded border border-slate-700 bg-slate-900 p-4">
        <h2 className="mb-2 text-lg font-semibold">{t.manual}</h2>
        <div className="grid gap-2 md:grid-cols-3">
          {FIELDS.filter((f) => ['purchases', 'checkoutsInitiated', 'threeSecViews', 'thruPlays', 'uniqueOutboundClicks', 'contentViews', 'landingPageUrl', 'productCost', 'shippingCost', 'operationsCost'].includes(f.key)).map((field) => (
            <label key={`manual-${field.key}`} className="text-sm">
              <span className="mb-1 block">{field.en} / {field.ar}</span>
              <input value={manualValues[field.key] ?? ''} onChange={(e) => setManualValues((prev) => ({ ...prev, [field.key]: e.target.value }))} className="w-full rounded bg-slate-800 p-2" />
            </label>
          ))}
        </div>
      </section>

      {ready && (
        <section className="space-y-4">
          <div className="rounded border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 text-lg font-semibold">{t.available}</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {availableMetrics.map((metric) => (
                <div key={metric.key} className="rounded bg-slate-800 p-3 text-sm">
                  <p className="font-semibold">{metric.labelEn} — {metric.labelAr}</p>
                  <p className="text-xs text-slate-300">{metric.formula}</p>
                  <p className="mt-1 text-lg">{metric.percentage ? `${((metric.value ?? 0) * 100).toFixed(2)}%` : (metric.value ?? 0).toFixed(2)}</p>
                  <p className="text-xs text-slate-300">{metric.tooltipAr}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 text-lg font-semibold">{t.missingInputs}</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-200">
              {missingMetrics.map((metric) => (
                <li key={`missing-${metric.key}`}>
                  {metric.labelEn}: {t.unavailable} — {t.missingFields}: {metric.missingFields.join(', ')}
                </li>
              ))}
              {!mapping.threeSecViews && <li>Hook Rate unavailable: missing 3-second video plays / Hook Rate غير متاح: ينقص مشاهدات 3 ثواني</li>}
              {!mapping.thruPlays && <li>Hold Rate unavailable: missing ThruPlays / Hold Rate غير متاح: ينقص ThruPlays</li>}
              {!mapping.checkoutsInitiated && <li>Checkout analysis unavailable: missing checkouts initiated / تحليل الـ Checkout غير متاح: ينقص بدء الدفع</li>}
              {!mapping.creativeName && <li>Creative analysis unavailable: missing ad name / creative-level data / تحليل الكريتف غير متاح: ينقص اسم الإعلان</li>}
            </ul>
          </div>

          <div className="rounded border border-slate-700 bg-slate-900 p-4 text-sm">
            <h2 className="mb-2 text-lg font-semibold">{t.mainDiagnosis}</h2>
            <p>{diagnosis.mainDiagnosisEn}</p>
            <p className="text-slate-300">{diagnosis.mainDiagnosisAr}</p>
            <h3 className="mt-3 font-semibold">{t.secondaryDiagnosis}</h3>
            <p>{diagnosis.secondaryDiagnosisEn}</p>
            <p className="text-slate-300">{diagnosis.secondaryDiagnosisAr}</p>
            <p className="mt-2"><strong>{t.confidence}:</strong> {diagnosis.confidence}</p>
            <h3 className="mt-3 font-semibold">{t.whatNext}</h3>
            <ul className="list-disc pl-5">
              {(lang === 'ar' ? diagnosis.nextActionsAr : diagnosis.nextActionsEn).map((action) => <li key={action}>{action}</li>)}
            </ul>
          </div>

          <div className="rounded border border-slate-700 bg-slate-900 p-4 text-sm">
            <h2 className="mb-2 text-lg font-semibold">{t.understanding}</h2>
            <p>{lang === 'ar' ? 'مرّر على كل مؤشر واقرأ الشرح العربي لفهم معنى الرقم وتأثيره.' : 'Each metric includes formula + Arabic tooltip so beginners understand why it matters.'}</p>
          </div>
        </section>
      )}
    </main>
  );
}
