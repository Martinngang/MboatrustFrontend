/**
 * Gemini AI API Client — Web (MboaTrustFrontend)
 *
 * Uses the Google Gemini 2.0 Flash multimodal model for:
 *  1. AI Construction Site Photo Inspector & Fraud Detector
 *  2. AI Cadastral Land Title Deed & Document Scanner
 *
 * Key is read from VITE_GEMINI_API_KEY env variable.
 * Falls back gracefully when the key is absent (sandbox / demo mode).
 */

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || ''

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface AIPhotoInspectionResult {
  score: number // 0-100 quality & authenticity confidence
  verdict: 'pass' | 'flag' | 'fail'
  summary: string
  findings: {
    label: string
    severity: 'ok' | 'warning' | 'critical'
    detail: string
  }[]
  fraudFlags: string[]
  gpsNote: string | null
}

export interface AIDeedScanResult {
  titleNumber: string | null
  conservationOffice: string | null
  ownerName: string | null
  plotAreaSqm: number | null
  beaconCoordinates: string | null
  registrationDate: string | null
  authenticityScore: number // 0-100
  alerts: {
    type: 'missing_stamp' | 'mismatch' | 'date_anomaly' | 'low_confidence' | 'ok'
    message: string
  }[]
}

// ── Internal helper ───────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // strip data:...;base64, prefix
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function callGemini(parts: object[]): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_MISSING')
  }

  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Gemini API error ${resp.status}: ${err}`)
  }

  const json = await resp.json()
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
    return JSON.parse(match?.[1] ?? text) as T
  } catch {
    return fallback
  }
}

// ── Feature 1: AI Construction Site Photo Inspector ───────────────────────────

const PHOTO_INSPECTOR_PROMPT = `You are an expert Cameroon civil engineering site inspector and AI fraud detection system.
Analyze this construction site photo and return a JSON analysis with this exact structure:
{
  "score": <integer 0-100, overall quality & authenticity confidence>,
  "verdict": <"pass" | "flag" | "fail">,
  "summary": <1-2 sentence plain-language summary in English>,
  "findings": [
    { "label": <finding name>, "severity": <"ok"|"warning"|"critical">, "detail": <explanation> }
  ],
  "fraudFlags": [<list of fraud indicator strings, empty array if none>],
  "gpsNote": <null or string if GPS metadata is detectable>
}

Evaluate:
1. Concrete quality (finish, mix consistency, voids, formwork marks)
2. Steel rebar placement (spacing, cover, bar diameter estimation)
3. Trench / foundation depth adequacy
4. Waterproofing or damp-proof course visibility
5. Material brand legibility (Cimencam, Dangote, ALUCAM etc.)
6. Fraud indicators: stock photo characteristics, image manipulation, indoor simulation, low resolution
7. Environmental plausibility for Cameroon (red laterite soil, tropical vegetation, typical materials)

Score guide: 90-100=excellent, 70-89=good, 50-69=acceptable with notes, below 50=flag/fail.
Return ONLY the JSON object, no extra text.`

export async function inspectConstructionPhoto(
  file: File
): Promise<AIPhotoInspectionResult> {
  const FALLBACK: AIPhotoInspectionResult = {
    score: 0,
    verdict: 'flag',
    summary: 'AI inspection unavailable — manual expert review required.',
    findings: [
      {
        label: 'AI Service Unavailable',
        severity: 'warning',
        detail: 'No Gemini API key configured. A human verifier must review this photo.',
      },
    ],
    fraudFlags: [],
    gpsNote: null,
  }

  try {
    const base64 = await fileToBase64(file)
    const parts = [
      { text: PHOTO_INSPECTOR_PROMPT },
      { inlineData: { mimeType: file.type || 'image/jpeg', data: base64 } },
    ]
    const raw = await callGemini(parts)
    return safeParseJSON<AIPhotoInspectionResult>(raw, FALLBACK)
  } catch (err) {
    if (err instanceof Error && err.message === 'GEMINI_API_KEY_MISSING') {
      return FALLBACK
    }
    throw err
  }
}

// ── Feature 2: AI Cadastral Land Title Deed Scanner ──────────────────────────

const DEED_SCANNER_PROMPT = `You are an expert in Cameroon real estate law and cadastral document analysis.
Analyze this document image (Titre Foncier / land title deed / cadastral survey plan) and return a JSON with this exact structure:
{
  "titleNumber": <string | null, e.g. "TF 8812/Oce">,
  "conservationOffice": <string | null, e.g. "Conservation Foncière de l'Océan, Kribi">,
  "ownerName": <string | null>,
  "plotAreaSqm": <number | null, numeric value only>,
  "beaconCoordinates": <string | null, e.g. "Bornes A(3.456°N, 9.123°E) B(3.457°N, 9.124°E)">,
  "registrationDate": <string | null, ISO date if parseable, else raw text>,
  "authenticityScore": <integer 0-100>,
  "alerts": [
    { "type": <"missing_stamp"|"mismatch"|"date_anomaly"|"low_confidence"|"ok">, "message": <string> }
  ]
}

Authenticity score guide: 90-100=high confidence authentic, 70-89=likely authentic minor gaps, 50-69=incomplete/illegible, below 50=suspect.
Check for: official MINDCAF / Conservation Foncière stamps, signature of Conservateur, cadastral plot number, legal description in French.
If fields are illegible or absent, set them to null and add an alert.
Return ONLY the JSON object, no extra text.`

export async function scanLandTitleDeed(
  file: File
): Promise<AIDeedScanResult> {
  const FALLBACK: AIDeedScanResult = {
    titleNumber: null,
    conservationOffice: null,
    ownerName: null,
    plotAreaSqm: null,
    beaconCoordinates: null,
    registrationDate: null,
    authenticityScore: 0,
    alerts: [
      {
        type: 'low_confidence',
        message: 'AI document scan unavailable — no Gemini API key configured. Please enter deed details manually.',
      },
    ],
  }

  try {
    const base64 = await fileToBase64(file)
    const parts = [
      { text: DEED_SCANNER_PROMPT },
      { inlineData: { mimeType: file.type || 'image/jpeg', data: base64 } },
    ]
    const raw = await callGemini(parts)
    return safeParseJSON<AIDeedScanResult>(raw, FALLBACK)
  } catch (err) {
    if (err instanceof Error && err.message === 'GEMINI_API_KEY_MISSING') {
      return FALLBACK
    }
    throw err
  }
}
