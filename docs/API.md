# SevaSetu API v1

Base path: `/api/v1`

Auth header: `Authorization: Bearer <token>`

## Public

- `GET /health`
- `GET /settings/public`
- `GET /impact`
- `GET /ngos` `GET /ngos/:slug`
- `GET /campaigns` `GET /campaigns/:slug`
- `GET /events/public`
- `GET /blog` `GET /blog/:slug`
- `GET /cms?slug=`
- `POST /auth/register` `POST /auth/login` `POST /auth/forgot` `POST /auth/reset`
- `POST /auth/otp/request` `POST /auth/otp/verify`
- `POST /donations/public`
- `POST /volunteers/apply`
- `POST /support/apply`
- `POST /contact`

## Authenticated modules

CRUD on: `users`, `ngos`, `beneficiaries`, `students`, `schools`, `classes`, `subjects`, `attendance`, `assignments`, `exams`, `results`, `certificates`, `donors`, `donations`, `campaigns`, `sponsorships`, `warehouses`, `inventory`, `inventory-transactions`, `requests`, `distributions`, `distribution-records`, `volunteers`, `events`, `scholarships`, `scholarship-applications`, `documents`, `expenses`, `vendors`, `purchase-orders`, `assets`, `blog-posts`, `cms-pages`, `audit-logs`

Query: `q`, `page`, `limit`, `sort`, `order`, `export=csv`, plus column filters.

## Workflows

- `POST /ngos/:id/approve` `{status, reason}`
- `POST /inventory/stock` `{item_id, type: in|out|reserve|distribute|return|adjust|damaged|lost|transfer, quantity}`
- `POST /requests/:id/workflow`
- `POST /scholarships/:id/workflow` (application id)
- `POST /expenses/:id/workflow`
- `POST /volunteers/:id/status`
- `POST /distributions/record`
- `POST /sync/offline`
- `POST /barcode/scan`
- `GET /qr/:kind/:id`
- `GET /reports/:type`
- `POST /import` `{kind, csv|rows}`
- `POST /backup` `GET /backups`
