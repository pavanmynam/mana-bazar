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

➡️ **Ivi nenu Phase 5 lo Mana Bazar website lo build chestanu.** Meeru
mee business name, address, support phone/email naaku ivvandi.

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
