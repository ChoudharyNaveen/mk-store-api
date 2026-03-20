1. Get Orders for rider  

```bash
curl 'http://localhost:4000/api/get-order' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "pageSize": 20,
    "pageNumber": 1,
    "filters": [
      { "key": "rider_id", "eq": "13" }
    ]
  }'
```

2. Get Orders for rider for **today** (based on `created_at`)  

```bash
curl 'http://localhost:4000/api/get-order' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "pageSize": 50,
    "pageNumber": 1,
    "filters": [
      { "key": "rider_id", "eq": "13" },
      {
        "key": "created_at",
        "gte": "2025-03-11T00:00:00.000Z",
        "lte": "2025-03-11T23:59:59.999Z"
      }
    ]
  }'
```

3. Get Orders for rider for a **custom date range**  

```bash
curl 'http://localhost:4000/api/get-order' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "pageSize": 50,
    "pageNumber": 1,
    "filters": [
      { "key": "rider_id", "eq": "13" },
      {
        "key": "created_at",
        "gte": "<START_ISO_DATETIME>",
        "lte": "<END_ISO_DATETIME>"
      }
    ]
  }'
```

4. Get Rider stats with revenue (all time)

```bash
curl 'http://localhost:4000/api/rider-stats?userId=13' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

Response (shape):

```json
{
  "success": true,
  "doc": {
    "id": 1,
    "user_id": 13,
    "vendor_id": 1,
    "total_orders": 120,
    "total_deliveries": 110,
    "completed_orders": 105,
    "cancelled_orders": 5,
    "rating": 4.7,
    "revenueStats": {
      "total_orders": 42,
      "total_revenue": 12345.67,
      "has_date_filter": false,
      "start_date": null,
      "end_date": null
    }
  }
}
```

5. Get Rider stats with revenue for a custom date range

```bash
curl 'http://localhost:4000/api/rider-stats?userId=13&startDate=2025-03-01&endDate=2025-03-11' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

In this case:
- `revenueStats.total_orders` / `total_revenue` are calculated only for **DELIVERED + PAID** orders for this rider between `startDate` and `endDate` (by `order.created_at`).
- `revenueStats.has_date_filter` will be `true`, and `start_date` / `end_date` will echo the filter values.

6. Update order status as Rider (PICKED_UP, ARRIVED, DELIVERED, CANCELLED)

> Note: You must pass the latest `concurrencyStamp` for the order (from a previous `/get-order` or `/get-order-details` response) both in the header `x-concurrencystamp` and in the JSON body.

6.1 Mark order as **PICKED_UP**

```bash
curl -X PATCH 'http://localhost:4000/api/update-order/ORDER_ID' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -H 'x-concurrencystamp: <CONCURRENCY_STAMP>' \
  --data-raw '{
    "id": ORDER_ID,
    "status": "PICKED_UP",
    "updatedBy": <RIDER_USER_ID>,
    "concurrencyStamp": "<CONCURRENCY_STAMP>"
  }'
```

6.2 Mark order as **ARRIVED**

```bash
curl -X PATCH 'http://localhost:4000/api/update-order/ORDER_ID' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -H 'x-concurrencystamp: <CONCURRENCY_STAMP>' \
  --data-raw '{
    "id": ORDER_ID,
    "status": "ARRIVED",
    "updatedBy": <RIDER_USER_ID>,
    "concurrencyStamp": "<CONCURRENCY_STAMP>"
  }'
```

6.3 Mark order as **DELIVERED**

```bash
curl -X PATCH 'http://localhost:4000/api/update-order/ORDER_ID' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -H 'x-concurrencystamp: <CONCURRENCY_STAMP>' \
  --data-raw '{
    "id": ORDER_ID,
    "status": "DELIVERED",
    "updatedBy": <RIDER_USER_ID>,
    "concurrencyStamp": "<CONCURRENCY_STAMP>"
  }'
```

6.4 Mark order as **CANCELLED** (by rider)

```bash
curl -X PATCH 'http://localhost:4000/api/update-order/ORDER_ID' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -H 'x-concurrencystamp: <CONCURRENCY_STAMP>' \
  --data-raw '{
    "id": ORDER_ID,
    "status": "CANCELLED",
    "updatedBy": <RIDER_USER_ID>,
    "concurrencyStamp": "<CONCURRENCY_STAMP>",
    "notes": "Cancelled by rider (reason here)"
  }'
```
