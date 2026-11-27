# Razorpay setup — your checklist

Meeru ee steps cheyyandi. Code side (checkout + webhook) nenu Phase 4 lo
connect chestanu. Test mode tho start chesi, KYC approve ayyaka live ki
marchukundam.

## Part A — Account create cheyyandi (10 min)

1. **razorpay.com** open chesi **Sign Up** click cheyyandi.
2. Mee mobile number / email tho sign up avvandi (OTP vastundi).
3. Business type adigite: GST lekapothe **Individual / Proprietorship**
   select cheyyandi. Company register chesi unte adi select cheyyandi.
4. Business category: **E-commerce / Marketplace** (hyperlocal delivery).

## Part B — KYC documents ready ga pettukondi

Razorpay mee business type batti documents adugutundi. Generally:

| Document | Notes |
|---|---|
| PAN card | Personal PAN (proprietor) or business PAN (company) |
| Aadhaar | One-page Aadhaar from UIDAI website works |
| Bank account | Account number + IFSC. Unregistered/proprietor ayithe personal account ok |
| GST certificate | GST unte ivvandi. Companies ki 2026 nunchi 2 business documents kavali |
| Video KYC | Original PAN chetilo pattukoni live video call (CKYC record unte skip avvochu) |

Account activation ki banking partners approval kavali, kabatti konni
working days padatayi.

## Part C — Website policy pages (Razorpay ivi lekapothe LIVE keys ivvadu)

Live mode ki mee website lo ee pages undali:
- Contact Us
- Terms & Conditions
- Privacy Policy
- Cancellation & Refund Policy
- Shipping / Delivery Policy
- Pricing details (delivery fee, commission vivaralu)

✅ **Ready:** /contact, /terms, /privacy, /refund, /shipping on
https://mana-bazar-rho.vercel.app (delivery fee & commission are in Terms and Shipping).

## Part D — Test keys teesukondi (KYC approve avvakamunde cheyyochu)

1. Razorpay Dashboard lo top lo **Test Mode** on cheyyandi.
2. **Account & Settings → API Keys → Generate Test Key**.
3. Rendu vastayi:
   - **Key ID** (`rzp_test_...`) → idi naaku chat lo ivvochu, public key.
   - **Key Secret** → ⚠️ **evarikee ivvakandi, chat lo kuda pettakandi.**
     Idi meeru direct ga **Vercel → Project → Settings → Environment
     Variables** lo `RAZORPAY_KEY_SECRET` ane peru tho pettali.

## Part E — Webhook (Phase 4 lo nenu cheppinappudu cheyyandi)

1. Dashboard → **Account & Settings → Webhooks → Add New Webhook**.
2. Webhook URL: `https://<mee-vercel-domain>/api/razorpay-webhook`
   (exact URL Phase 4 lo istanu).
3. Secret: oka strong password create cheyyandi. Daanni Vercel lo
   `RAZORPAY_WEBHOOK_SECRET` ga kuda pettandi.
4. Events select cheyyandi: `payment.captured`, `payment.failed`, `order.paid`.

Webhook enduku: customer phone lo payment success ani chupinchina,
**Razorpay server confirm chesthene** order "Paid" avutundi. Ee vidhanga
fake payment screenshots tho mosam cheyyalemu.

## Later — Shops ki direct payouts

Marketplace lo customer pay chesina dabbu shop ki automatic ga
pampalante **Razorpay Route** ane product kavali. Mundu normal payments
start chesi, orders perigaka Route activate cheddam.


## Part F — Keys ni Vercel lo pettandi (code already ready)

Vercel → mana-bazar project → **Settings → Environment Variables** → ee 5 add cheyyandi
(Environment: Production + Preview), tarvata **Deployments → latest → Redeploy**:

| Name | Value ekkada dorukutundi |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay → API Keys → Key ID (`rzp_test_…` / `rzp_live_…`) |
| `RAZORPAY_KEY_SECRET` | Razorpay → API Keys → Key Secret (⚠️ secret) |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook create chesetappudu meeru pettina secret (⚠️ secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → `service_role` / secret key (⚠️ secret) |
| `SUPABASE_URL` | `https://lnuptsingyembirjzjzr.supabase.co` |

Webhook URL: `https://mana-bazar-rho.vercel.app/api/razorpay-webhook`
Events: `payment.captured`, `order.paid`, `payment.failed`

Keys pettina ventane cart lo **"💳 Pay online (UPI / Card / Netbanking)"** option automatic ga vastundi.
Keys lekapothe ee option kanipinchadu, COD / direct UPI matrame untayi.

### Money flow
Customer online pay chesthe dabbu **Mana Bazar Razorpay account** ki vastundi
(Razorpay fee ~2% cut chesi T+2 days lo mee bank ki). Shops ki meeru settle cheyyali
(weekly, commission minus chesi). Taruvata Razorpay **Route** tho automatic split cheyyochu.
Cancel ayina paid orders ki refund: Razorpay Dashboard → Payments → payment open → **Refund**.
