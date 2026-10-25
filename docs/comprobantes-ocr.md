# Comprobantes y lectura automática (OCR): puesta en marcha

La app funciona sin esto (los gastos se registran a mano). Para adjuntar facturas hace falta **R2** (almacenamiento); para que además lea monto, fecha y proveedor hace falta una **clave de Anthropic**. Las claves van **solo** en las variables del servicio en Railway (nunca en el repositorio ni en el chat).

## 1. Cloudflare R2 (almacenamiento privado)
1. Cloudflare → **R2** → *Create bucket* → nombre `mibolsillo-receipts` (privado; no actives acceso público).
2. R2 → **Manage API tokens** → *Create API token* → permiso **Object Read & Write** limitado a ese bucket. Guarda *Access Key ID* y *Secret Access Key*; el *Account ID* aparece en la página de R2.
3. En el bucket → **Settings → CORS policy**, pega (cambia el dominio si el tuyo es otro):
```json
[
  {
    "AllowedOrigins": ["https://mibolsillo.up.railway.app"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```
4. Railway → servicio web → **Variables**:
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=mibolsillo-receipts`

## 2. Lectura automática (elige UN proveedor)

### Opción A: Gemini (Google)
1. aistudio.google.com → **Get API key** → crear clave.
2. Railway → Variables: `OCR_PROVIDER=gemini` y `GEMINI_API_KEY=<tu clave>`. El modelo por defecto es `gemini-flash-latest` (`OCR_MODEL` lo cambia).
3. Ojo: en el plan gratuito de la API de Gemini, Google puede usar los datos enviados para mejorar sus productos. Las facturas contienen datos de terceros; para producción usa un proyecto con facturación activa (plan de pago).

### Opción B: Claude (Anthropic)
1. console.anthropic.com → **API keys** → crear clave (y definir un límite de gasto mensual).
2. Railway → Variables: `ANTHROPIC_API_KEY` y, opcional, `OCR_MODEL` (por defecto `claude-haiku-5-5`, el más económico) y `OCR_MAX_FILE_MB` (8).

Railway redespliega solo al guardar variables.

## Cómo saber si quedó bien
- Sin R2: en *Nuevo movimiento* aparece «Adjuntar facturas aún no está disponible».
- Con R2 pero sin clave de Anthropic: se puede adjuntar; avisa que la lectura automática no está activada.
- Con ambos: al subir una foto o PDF se rellenan proveedor, fecha, monto y categoría sugerida; siempre quedan editables antes de guardar.

## Problemas frecuentes
- *«No se pudo subir el archivo»*: casi siempre el CORS del bucket (dominio exacto, métodos `PUT` y `GET`).
- *«No pudimos leer el comprobante»*: revisa la clave y el saldo/cuota del proveedor (`GEMINI_API_KEY` o `ANTHROPIC_API_KEY`); la foto debe ser nítida y completa.
- Costo: cada lectura es una llamada a un modelo pequeño con una imagen; el límite de gasto de la clave protege de abusos. La app limita a 15 lecturas por minuto y usuario.
