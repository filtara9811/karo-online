# AI Voice + WhatsApp Interactive Lead Broadcast — Plan

यह plan हमारे existing **Ring-by-Ring Radar Broadcast** के ऊपर एक नया **Multi-Channel Delivery Layer** add करेगा: Push (existing) + WhatsApp Interactive + AI Voice Call (DialNexa)।

---

## 🎯 Goal

जब lead broadcast हो — vendor को एक साथ 3 channels पर pingआए:
1. **App Push** (already done 🟢)
2. **WhatsApp Interactive** (Accept/Reject buttons + image) 🆕
3. **AI Voice Call** via DialNexa (announce → ask → capture reason) 🆕

Vendor कहीं भी (कोई भी channel पर) Accept दबा दे — एक ही `accept_lead` RPC trigger हो, बाकी channels auto-cancel हो जाएँ।

---

## 1. Database Changes (Migration)

### 1a. New table: `communication_settings` (singleton config)
- `whatsapp_provider` (enum: `meta_cloud` | `gupshup` | `twilio`)
- `whatsapp_phone_number_id`, `whatsapp_token` (secret ref)
- `whatsapp_template_name`, `whatsapp_template_lang`
- `dialnexa_api_url`, `dialnexa_api_key` (secret ref)
- `dialnexa_agent_id`, `dialnexa_caller_id`
- `voice_enabled_globally` (bool)
- `whatsapp_enabled_globally` (bool)

### 1b. `catalog_groups` ko extend
- `voice_agent_enabled` (bool, default false) — per-group voice toggle (Plumbers ON, others OFF)
- `whatsapp_enabled` (bool, default true)

### 1c. New table: `voice_call_logs`
- `lead_id`, `vendor_id`, `dialnexa_call_id`
- `status` (queued/ringing/answered/no_answer/failed/completed)
- `outcome` (accepted/rejected/no_response)
- `rejection_reason` (text — captured by AI)
- `transcript` (jsonb)
- `duration_sec`, `started_at`, `ended_at`

### 1d. New table: `whatsapp_message_logs`
- `lead_id`, `vendor_id`, `wa_message_id`
- `status` (sent/delivered/read/replied/failed)
- `button_clicked` (accept/reject/null)
- `clicked_at`
- `error_payload` (jsonb)

### 1e. Trigger update: `lead_broadcast_dispatch`
मौजूदा broadcast trigger के अंदर, push notification के साथ-साथ दो नए jobs queue करे:
- `pg_net` HTTP POST → `/api/public/whatsapp/send-lead`
- `pg_net` HTTP POST → `/api/public/dialnexa/initiate-call`

(Per-group toggle check पहले।)

---

## 2. Backend — Server Routes (TanStack)

सभी public callbacks `src/routes/api/public/*` के नीचे, HMAC signature verify करके।

### 2a. `POST /api/public/whatsapp/send-lead`
Internal cron/trigger से call। Lead + vendor lookup → WhatsApp template message भेजे:
- Header: lead image (media)
- Body: "नया लीड: {category} • {city} • ₹{budget}"
- Buttons: `Accept_lead_{lead_id}`, `Reject_lead_{lead_id}` (quick-reply buttons)

### 2b. `POST /api/public/whatsapp/webhook`
Meta/Gupshup से inbound callback। Button click पर:
- `button_clicked = accept` → call `accept_lead(lead_id, vendor_id)` RPC
- `button_clicked = reject` → call `reject_lead(...)` और follow-up WA message भेजे: "कृपया reason बताएं: 1.Busy 2.Out of area 3.Price low" (list message)
- Log सब कुछ `whatsapp_message_logs` में

### 2c. `POST /api/public/dialnexa/initiate-call`
Internal trigger से। DialNexa API call:
```
POST {dialnexa_api_url}/calls/initiate
{
  agent_id, to: vendor.phone, caller_id,
  metadata: { lead_id, vendor_id, category, city, budget },
  webhook_url: ".../api/public/dialnexa/callback"
}
```

### 2d. `POST /api/public/dialnexa/callback`
DialNexa से events (call_started, call_ended, intent_captured):
- intent=`accept` → `accept_lead` RPC
- intent=`reject` → `reject_lead` RPC + `rejection_reason` save
- Update `voice_call_logs`
- Push transcript

### 2e. Race condition handling
`accept_lead` RPC पहले से idempotent है (unique vendor per lead)। पहला channel win, बाकी पर "Already accepted" message भेजे और pending call cancel हो (DialNexa `cancel_call` API)।

---

## 3. Admin Panel — Communication Settings

### Route: `/admin/communication`
3 tabs:

**Tab 1 — WhatsApp**
- Provider select + API credentials inputs (save → `add_secret` tool flow)
- Template name/language
- "Send Test Message" button
- Status indicator (last delivery success rate)

**Tab 2 — AI Voice (DialNexa)**
- API URL, API Key, Agent ID, Caller ID
- Global ON/OFF toggle
- Per-group toggle table:
  ```
  Group           | Voice | WhatsApp
  Plumbers        | [✓]   | [✓]
  Electricians    | [ ]   | [✓]
  ...
  ```
- "Test Call" button (admin का number डालके verify)

**Tab 3 — Voice Log (Report)**
Table view:
```
Time | Lead | Vendor | Called | Duration | Outcome | Reason | Transcript
```
Filters: date range, group, outcome। CSV export।

---

## 4. Secrets Setup

Following secrets `add_secret` से माँगने होंगे (user confirm करने पर):
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET` (signature verify)
- `DIALNEXA_API_KEY`
- `DIALNEXA_WEBHOOK_SECRET`

---

## 5. Roadmap / Phases

| Phase | Scope | ETA |
|---|---|---|
| **Phase A** | DB migrations + Communication Settings UI (without live calls — store config) | step 1 |
| **Phase B** | WhatsApp send + webhook + button handling | step 2 |
| **Phase C** | DialNexa initiate + callback + voice log report | step 3 |
| **Phase D** | Broadcast trigger hooks (all 3 channels parallel) + race-condition cancel | step 4 |
| **Phase E** | Per-group toggles + test buttons + admin polish | step 5 |

---

## ⚠️ Pre-requisites (आपको पहले देने होंगे)

1. **WhatsApp Business Account** — किस provider से? (Meta Cloud API सबसे सस्ता, Gupshup easy approval, Twilio premium)
2. **Approved Template** का नाम + language (Meta में template पहले approve होना ज़रूरी — मैं sample template content draft कर दूँगा, आप Meta पर submit करेंगे)
3. **DialNexa Account** — API docs link + sandbox credentials
4. **Public webhook URL** — हमारा `karoonline.in` already live है ✅

---

## ❓ Confirm करें start करने से पहले

- कौनसे **WhatsApp provider** से जाना है? (Meta Cloud recommended)
- **DialNexa** का API documentation link है? (मुझे exact endpoint shape चाहिए calls के लिए)
- क्या मैं **Phase A** (DB + Admin UI) से शुरू करूँ — ताकि आप keys आते-आते settings page तैयार रखें?
