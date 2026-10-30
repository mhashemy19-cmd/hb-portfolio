# hb-license worker: no patch needed

The deployed `hb-license` worker already supports everything the admin "Licenses" tab uses:

| Endpoint (Bearer `ADMIN_TOKEN`) | Purpose |
| --- | --- |
| `POST /admin/create` `{products:["sub","voice","sound"], type:"life"\|"sub", days|expires, name, contact, note}` | One key (`HBL-XXXX-XXXX-XXXX-XXXX`) per product. Bundle = all three products. |
| `GET /admin/list` | Last 500 licenses |
| `POST /admin/update` `{code, action: revoke\|restore\|reset\|extend\|delete, expires?}` | Manage a key |

Plans map to payloads: 1 month = `type:"sub", days:30`, 3 months = 90, 12 months = 365, lifetime = `type:"life"`.
Machine binding happens on first activation (`/v1/activate`), so it is left empty at creation.

Notes
- Subscription expiry is counted from the day the key is created, not from activation.
- The admin secret is typed in the admin panel per session (sessionStorage); the worker URL is stored in localStorage. Neither is committed.
- Automatic issuance after payment needs a payment gateway. When one exists, its webhook can call the same `POST /admin/create` with the same payload (see `HBLicense.generate` in `admin/index.html`).
