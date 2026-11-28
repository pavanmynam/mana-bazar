# Play Store — listing text & checklist

## Store listing (copy-paste into Play Console → Grow → Store presence → Main store listing)

**App name** (max 30): `Mee Bazar – Local Shops`

**Short description** (max 80):
`Order from your nearby kirana, medical, bakery & more – home delivery, COD & UPI.`

**Full description** (English):

```
Mee Bazar brings all the shops in your town into one app.

Order groceries, medicines, bakery items, fruits & vegetables, food and more from
trusted local shops near you – and get them delivered to your door.

WHY MEE BAZAR
• All local shops in one place – kirana, medical, bakery, dairy, hotels, electrical, stationery and more
• Shops sorted by distance, with delivery time shown
• Pay with Cash on Delivery or UPI (GPay, PhonePe, Paytm)
• Live order tracking: Placed → Accepted → Packed → Out for delivery → Delivered
• Scan a product barcode to find which nearby shop sells it
• Scan a shop's QR poster to open that shop instantly

FOR SHOP OWNERS
• Put your shop online for free – small commission only on delivered orders
• Get new orders instantly with a sound alert
• Add products in seconds by scanning their barcode
• Mark items in or out of stock, open or close your shop with one tap
• See your daily orders and earnings
• Print your own "Scan to order" QR poster for your counter

Now serving Hyderabad and Guntur.

Support: pavan.mynam@gmail.com · +91 96661 83665
```

**Full description** (Telugu, add as a translation: Play Console → Store listing → Manage translations → Telugu):

```
మీ ఊరి అన్ని షాపులు – ఒకే యాప్ లో!

మీ దగ్గరలోని కిరాణా, మెడికల్, బేకరీ, పండ్లు & కూరగాయలు, హోటల్ ఇంకా ఎన్నో షాపుల నుండి
ఆర్డర్ చేయండి – ఇంటికే డెలివరీ.

• దూరం ప్రకారం షాపులు, డెలివరీ టైమ్ తో
• క్యాష్ ఆన్ డెలివరీ లేదా UPI (GPay, PhonePe, Paytm)
• ఆర్డర్ ఎక్కడ ఉందో లైవ్ గా చూడండి
• బార్‌కోడ్ స్కాన్ చేసి ఏ షాపులో దొరుకుతుందో తెలుసుకోండి

షాపు ఓనర్లకు:
• మీ షాపును ఉచితంగా ఆన్‌లైన్ లో పెట్టండి – డెలివరీ అయిన ఆర్డర్లపై చిన్న కమిషన్ మాత్రమే
• కొత్త ఆర్డర్ రాగానే సౌండ్ అలర్ట్
• బార్‌కోడ్ స్కాన్ చేసి ప్రొడక్ట్స్ యాడ్ చేయండి

ప్రస్తుతం హైదరాబాద్, గుంటూరు లో.
```

**Category:** Shopping  ·  **Tags:** Grocery, Delivery

**Contact details:** email `pavan.mynam@gmail.com`, phone `+91 9666183665`,
website `https://mana-bazar-rho.vercel.app`

**Graphics:**
- App icon 512×512: `docs/play/icon-512.png`
- Feature graphic 1024×500: `docs/play/feature-graphic.png`
- Phone screenshots (min 2): take them from the test APK on your phone (Power + Volume-down)

## App content forms (Play Console → Policy → App content)

| Form | Answer |
|---|---|
| Privacy policy | `https://mana-bazar-rho.vercel.app/privacy` |
| App access | "All or some functionality is restricted" → give a test customer login (phone + password) and a test shop-owner login |
| Ads | No ads |
| Content rating | Questionnaire → category "Shopping / Utility", answer No to violence etc. |
| Target audience | 18 and over |
| News app | No |
| Data safety | See below |
| Government app | No |
| Financial features | None |
| Health | None (medicines are sold by licensed shops; app is not a health app) |
| Account deletion URL | `https://mana-bazar-rho.vercel.app/delete-account` |

### Data safety answers
- Collects data: **Yes**. Encrypted in transit: **Yes**. Users can request deletion: **Yes**.
- Personal info: **Name, Phone number, Address** – collected, used for *App functionality, Account management*. Not shared for ads.
- Location: **Approximate & Precise location** – optional, *App functionality* (nearby shops, delivery).
- Financial info: **Purchase history** (orders) – *App functionality*.
- Photos/videos: **No** (camera is used only to scan codes on the phone; nothing uploaded).
- Shared with third parties: order details are shared with the shop and delivery partner handling the order (this is "App functionality", counts as sharing only to service providers).

## Closed test (personal accounts)
1. Testing → Closed testing → Create track → upload the `.aab`.
2. Testers → create an email list with **15–20** Gmail addresses of friends/family.
3. Send them the opt-in link; they must install from Play Store and keep it for **14 days**, opening it now and then.
4. After 14 days: Dashboard → **Apply for production**.

## Signing key (one time — Claude will guide you)
The workflow signs the `.aab` with an upload key stored as 4 GitHub secrets:
`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
Keep a backup of the `.jks` file and passwords (Google Drive + paper). Never put them in the code.
