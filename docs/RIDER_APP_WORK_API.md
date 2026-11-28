# Rider app API: attendance, Quick Commerce and Food deliveries

For the **Delivez Agent** Flutter app (`delivez_delivery_agent`), after sign-in and approval ([RIDER_APP_API.md](RIDER_APP_API.md)).
Base URL `https://<api-host>/v1`, rider token (`app: "RIDER"`), JSON. Errors are `{ "error": { "code", "message", "details" } }`; show `message` as it is.
Money is in **paise** (₹1 = 100). Times are ISO 8601 UTC. Only approved riders can use these; others get `403 RIDER_NOT_APPROVED` / `RIDER_RESTRICTED`.

## 0. Where it plugs into the app

| App code | Replace with |
|---|---|
| `features/attendance/data/attendance_store.dart` (device-only snapshot) | `GET /rider/attendance` is the source of truth; keep the device store only as an offline cache |
| `AttendanceController.punchIn / startBreak / endBreak / punchOut` | §1 calls below |
| `CompanyVehicleRepository.fetchAssignment` (`UnconfiguredCompanyVehicleRepository`) | `GET /rider/vehicle` → `vehicle` (null = none assigned) |
| `CompanyVehicleChecklist` | the server sends the same lists in `vehicle.checklist` / `vehicle.returnChecklist` (same ids) |
| `quick_commerce/data/qc_data_source.dart` (`DemoQcDataSource`) | `GET /rider/offers/current`, `GET /rider/tasks`, `GET /rider/tasks/history`, `GET /rider/earnings` (§3–§5) |
| QC on-device delivery-code check (`qc_delivery_actions.dart`) | send the code with `DELIVERED`; the server checks it and counts attempts |
| QC bag scan + item verification gate | `POST /rider/tasks/:id/items-check`, then show `handover.code` / `handover.qr` to the shop: the **shop** marks it picked up |
| `food_delivery/data/food_data_source.dart` (`DemoFoodDataSource`) | the same task calls; Food uses the extra fields in §4a (`prep`, `packaging`, `codModes`) |
| `FoodPackagingPolicy.blocker` / packaging photo | `POST /rider/tasks/:id/packaging-check` (§4a) |
| `FoodRules.prepDelayGrace` "report delay" | `task.prep.state == DELAYED` → `POST /rider/tasks/:id/prep-delay` |
| `food_cod_screen.dart` (cash / UPI + UTR) | `DELIVERED` with `codMode` and `codReference` (§4a) |
| `FoodFailurePolicy.customerStatuses` | `FAILED` with `customerStatus` (§4a) |

The data source methods are synchronous today; they need to become `Future`s.

## 1. Attendance (Punch In / breaks / Punch Out)

```
NOT_PUNCHED_IN ──punch-in──▶ SHIFT_ACTIVE ⇄ ON_BREAK
                              SHIFT_ACTIVE ──punch-out──▶ SHIFT_COMPLETED ──punch-in──▶ …
```

| Call | What it does |
|---|---|
| `GET /rider/attendance` | `{ status, online, shift, today{shifts, workedMinutes, breakMinutes}, companyVehicleRequired, vehicle, policy }`. `shift` is the open shift, or the last one. |
| `GET /rider/vehicle` | `{ required, vehicle }`. `vehicle` = `{ vehicleId, registration, category, description, hub, status, checklist{title, checks[{id,label}]}, returnChecklist{…} }` or `null`. |
| `POST /rider/attendance/photos/presign` `{ contentType, size }` | Upload link for a selfie or vehicle photo: `{ uploadUrl, fileKey, method: "PUT", headers }`. `PUT` the bytes with the same `content-type` (a relative `uploadUrl` is on the API host). JPG / PNG / WEBP, ≤ 10 MB, link valid 15 min. |
| `POST /rider/attendance/punch-in` | Body below. Puts you **online** for jobs (unless `goOnline: false`). → `{ shift, online }` |
| `POST /rider/attendance/breaks/start` | Takes you offline. Refused while you carry an order. |
| `POST /rider/attendance/breaks/end` | Back online. |
| `POST /rider/attendance/punch-out` | Body below. Ends the shift and takes you offline. Refused while you carry an order. |
| `GET /rider/attendance/shifts?from=&to=&limit=` | Past shifts, newest first. |

**Punch in**

```json
{
  "clientRef": "the app's shift id (optional; the same punch-in sent twice returns the same shift)",
  "selfie":   { "fileKey": "riders/…/attendance/….jpg", "capturedAt": "2026-11-26T03:30:05Z" },
  "location": { "lat": 12.97840, "lng": 77.64080, "accuracyM": 12, "address": "optional reverse-geocoded text" },
  "vehicle":  { "vehicleId": "<from GET /rider/vehicle>", "confirmedCheckIds": ["identity","condition","bag","gear","kit"],
                "photo": { "fileKey": "…", "capturedAt": "…" } },
  "goOnline": true
}
```

`vehicle` is required when `companyVehicleRequired` is true (the rider signed up with **Company-Provided Vehicle**), and every checklist id must be there.

**Punch out**

```json
{
  "selfie": { "fileKey": "…", "capturedAt": "…" },
  "location": { "lat": 12.9784, "lng": 77.6408, "accuracyM": 10 },
  "vehicleReturn": { "vehicleId": "…", "confirmedCheckIds": ["identity","condition","keys","bag","gear"],
                     "photo": { "fileKey": "…", "capturedAt": "…" },
                     "newDamage": false, "issueNote": "", "closingOdometerKm": 12045 }
}
```

`vehicleReturn` is required when the shift started with a company vehicle.

**Rules the server checks** (`policy` in `GET /rider/attendance`):

| Code | When |
|---|---|
| `422 LOCATION_NOT_ACCURATE` | `accuracyM` above 100 m |
| `422 PHOTO_NOT_FRESH` | a photo's `capturedAt` is more than 10 minutes from now |
| `400 FILE_NOT_UPLOADED` / `FILE_KEY_INVALID` | photo not uploaded, or not uploaded from this account |
| `409 NO_VEHICLE_ASSIGNED` · `VEHICLE_NOT_AVAILABLE` · `VEHICLE_NOT_ASSIGNED_TO_YOU` · `VEHICLE_IN_USE` | company vehicle problems: "contact your hub" |
| `422 VEHICLE_CHECK_REQUIRED` · `VEHICLE_CHECK_INCOMPLETE` | no vehicle check, or a line not confirmed (message names it) |
| `409 SHIFT_ALREADY_OPEN` · `NOT_PUNCHED_IN` · `ALREADY_ON_BREAK` · `NOT_ON_BREAK` | wrong state |
| `409 DELIVERIES_IN_PROGRESS` | break or punch-out while carrying an order |
| `422 VEHICLE_RETURN_REQUIRED` · `WRONG_VEHICLE` · `ISSUE_NOTE_REQUIRED` (10+ chars when `newDamage`) · `ODOMETER_BACKWARDS` | vehicle return |

`PUT /rider/duty { online: true }` is refused with `409 ON_BREAK` during a break. When the server sets `RIDER_PUNCH_IN_REQUIRED=true`,
it is also refused with `409 PUNCH_IN_REQUIRED` before punching in (`punchInRequiredToGoOnline` in `GET /rider/attendance`).

## 2. Being online

| Call | |
|---|---|
| `GET /rider/duty` | `{ online, paused, notReceivingJobsBecause, activeDeliveries, maxActiveDeliveries, offerSeconds, gpsEverySeconds, cash{ inHandToday, limit, overLimit }, offer }`. `cash` counts cash only (not UPI) collected today; `limit` is ₹5,000 by default (`RIDER_CASH_LIMIT_PAISE`). |
| `PUT /rider/duty` `{ online, lat?, lng? }` | Go online / offline (punch-in and punch-out do this for you). |
| `POST /rider/location` `{ lat, lng, accuracyM? }` | Every `gpsEverySeconds` while online. Returns the live offer, so one call covers both. Without pings you stop getting jobs. |

## 3. Job offers (Quick Commerce "Orders → offers")

| Call | |
|---|---|
| `GET /rider/offers/current` | `{ offer }` or `{ offer: null }`. One offer at a time, for `offerSeconds` (`secondsLeft`). Fields: `id, expiresAt, secondsLeft, distanceToPickupKm, etaToPickupMin, pickup{name, area, lat, lng}, drop{area}, tripKm, cashToCollect, items (count), readyAt, payoutEstimate, vertical, orderValue, promisedAt, priority`. |
| `POST /rider/offers/:id/accept` | → the full task (§4). `409 OFFER_EXPIRED` / `OFFER_GONE` / `RIDER_AT_CAPACITY`. |
| `POST /rider/offers/:id/decline` `{ reason }` | `TOO_FAR · VEHICLE_ISSUE · ON_BREAK · LOW_BATTERY · UNSAFE_AREA · OTHER`. Goes to the next rider. |

Offers also arrive on the socket as `rider.offer`.

## 4. The delivery (task)

`GET /rider/tasks` (on board now) and `GET /rider/tasks/:id` return:

| Field | Use in the app (`QcOrder`) |
|---|---|
| `id`, `orderNumber`, `status`, `next[]` | `next` = the steps allowed now (drives the big button) |
| `vertical` | `GROCERY`, `PHARMACY` → Quick Commerce; `EAT` → Food; `LOCAL_STORES` → Local Bazaar |
| `store{ id, name, vertical, line1, line2, landmark, pincode, phone, lat, lng }` | `QcStore` (use lat/lng instead of the schematic x/y) |
| `handover{ code, qr }` | show to the shop until picked up; the shop enters it → `PICKED_UP` |
| `drop{ name, address, line1, line2, landmark, pincode, phone, lat, lng }` | customer; `line1` already includes the flat / building |
| `items[{ lineId, productId, name, variant, qty, unitPrice, lineTotal, outOfStock }]` | `QcItem` (`productId` = sku, `unitPrice` = price) |
| `orderValue`, `payment{ mode, cod }`, `cashToCollect` | COD amount is `cashToCollect` (not qty × price) |
| `payout{ estimate, final }` | `final` set on delivery |
| `promisedAt`, `etaAt`, `readyAt`, `priority` | SLA clock |
| `proof{ handoverModes, deliveryCodeRequired, rules }` | which handover modes are allowed and what each needs |
| `itemCheck{ at, items, issues }` | last item check, or `null` |
| `prep{ state, readyAt, lateByMin, waitingSince, waitingMin, freeWaitMin, billedWaitMin, delayReportedAt }` | kitchen / shop readiness and your waiting time (§4a) |
| `packaging{ required, checks[], done }` | Food (`EAT`) only, else `null` (§4a) |
| `codModes` | `["CASH","UPI"]` when there is cash to collect, else `[]` |

**Steps** — `POST /rider/tasks/:id/status`:

| `status` | Body extras | Notes |
|---|---|---|
| `EN_ROUTE_TO_PICKUP` | | |
| `ARRIVED_AT_PICKUP` | `lat, lng` | must be within 500 m of the shop (`409 NOT_AT_PICKUP`). Not ready yet → task shows `WAITING_AT_PICKUP`. |
| *(picked up)* | — | the shop enters your handover code; you can't set it yourself |
| `EN_ROUTE_TO_DROP` | | |
| `ARRIVED_AT_DROP` | `lat, lng` | within 500 m of the customer (`409 NOT_AT_DROP`) |
| `DELIVERED` | `handoverMode, otp, proofPhotoKey, safeDropPlace, cashCollected, lat, lng` | see below |
| `FAILED` | `code, reason, customerStatus` | `code` from the fail reasons, e.g. `FAIL_CUSTOMER_UNAVAILABLE`; `customerStatus` optional (§4a) |

**At the shop: item check** — `POST /rider/tasks/:id/items-check`
`{ "items": [{ "lineId": "…", "status": "OK" | "MISSING" | "WRONG" | "DAMAGED", "note": "optional" }] }` — every line that is not `outOfStock`.
Problems appear on the shop's screen. Allowed until pickup. `422 ITEM_CHECK_INCOMPLETE` names the missing item.

**Delivering** — `handoverMode` (default `IN_PERSON`):

| Mode | Needs | Allowed |
|---|---|---|
| `IN_PERSON` | `otp` (the customer's delivery code, if `deliveryCodeRequired`) | always |
| `CONTACTLESS` | `otp` + `proofPhotoKey` | prepaid only |
| `SAFE_DROP` | `proofPhotoKey` + `safeDropPlace` ("with the security guard") | prepaid only |

Cash orders also need `cashCollected: true`. The photo: `POST /rider/tasks/:id/proof/presign { contentType, size }` → `PUT` → send `fileKey` as `proofPhotoKey`.
Errors: `422 OTP_INCORRECT` (`details.attemptsLeft`), `429 OTP_TOO_MANY_ATTEMPTS`, `422 PROOF_PHOTO_REQUIRED`, `422 SAFE_DROP_PLACE_REQUIRED`,
`422 HANDOVER_MODE_NOT_ALLOWED`, `422 CASH_NOT_CONFIRMED`, `422 UPI_REFERENCE_INVALID`.

## 4a. Food Delivery (`vertical: "EAT"`)

The Food module uses the same offers, task and steps as above, plus these.

**Kitchen readiness: `task.prep`**

| `prep.state` | Meaning |
|---|---|
| `NOT_STARTED` | the restaurant hasn't accepted yet |
| `PREPARING` | cooking; `readyAt` is the restaurant's quoted time |
| `DELAYED` | 5 min or more past `readyAt` (`lateByMin`); you may report it |
| `READY` | packed; ask at the counter |
| `PICKED_UP` | handed over |

If you tap `ARRIVED_AT_PICKUP` before the food is ready, the task shows `WAITING_AT_PICKUP` and `waitingSince` starts.
The first `freeWaitMin` (10) minutes are free. After that, every minute is paid at ₹1 (`payRule.waitPerMin`).
The paid minutes are fixed at handover in `billedWaitMin` and included in `payout`.

**Food is late: `POST /rider/tasks/:id/prep-delay`** `{ "note": "optional" }`
- Allowed only after `ARRIVED_AT_PICKUP`, and only while `prep.state` is `DELAYED`.
- The restaurant gets an urgent "Rider waiting" notification.
- Otherwise you get `409 PREP_NOT_LATE`, whose message says when you can report, e.g. "you can report it in 7 min". You can report again only after 5 min.

**Packaging check at the counter: `POST /rider/tasks/:id/packaging-check`**

```json
{ "sealIntact": true, "hotColdSeparated": true, "inThermalBag": true, "spillSafe": true,
  "photoKey": "<fileKey from POST /rider/tasks/:id/proof/presign>", "note": "needed when any check is false" }
```

- `task.packaging.checks` lists the 4 lines with `id`, `label` (checklist text) and `problem` (what the restaurant is told). Send `hotColdSeparated: true` when there are no cold items.
- A `false` check needs a `note` (`422 ISSUE_NOTE_REQUIRED`). It is saved, and the restaurant gets a "Packaging problem" notification.
- Allowed from assignment until you leave the counter. The latest check is in `task.packaging.done` (with `photoUrl`).
- With the server setting `RIDER_FOOD_PACKAGING_REQUIRED=true` (`packaging.required`), `EN_ROUTE_TO_DROP` is refused until the check is done (`409 PACKAGING_CHECK_REQUIRED`). It is off by default.

**Cash to collect: cash or UPI.** For `DELIVERED`, add `codMode`:
- `"CASH"`: the default.
- `"UPI"`: also send `codReference`, the 12-digit UTR from the customer's payment screen (`422 UPI_REFERENCE_INVALID`).

Still send `cashCollected: true`. UPI is not counted as cash in hand (`duty.cash`). Earnings show `cashCollected` (cash to hand in) and `upiCollected` separately.
Note: the customer app takes prepaid orders only today, so cash to collect currently comes from Delivez One tasks.

**Failed delivery:** with `FAILED`, add `customerStatus`, one of `NOT_ANSWERING`, `ASKED_TO_COME_LATER`, `REFUSED`, `ADDRESS_NOT_FOUND` or `REACHABLE_WAITING`. It is joined with `reason` in the failure text, e.g. "Customer not answering — 3 calls, gate closed".
When food was picked up and the order fails, it is settled the same way as any failed order: the restaurant is told, and the refund and compensation follow the cancellation rules.

## 5. History and earnings

| Call | |
|---|---|
| `GET /rider/tasks/history?date=YYYY-MM-DD` | Finished that day (India time, default today): `orderNumber, status, shop, dropArea, tripKm, deliveredAt, earned, cashCollected, codMode, proofType`. |
| `GET /rider/earnings?from=&to=` | Default the last 7 days: `{ total, today, days[{ date, deliveries, failed, earned, cashCollected, upiCollected }], payRule }`. |

Pay per delivery (server settings): ₹25 + ₹7 per km (shop → customer) + ₹1 per billed waiting minute, rounded to the rupee
(`RIDER_PAY_BASE_PAISE`, `RIDER_PAY_PER_KM_PAISE`, `RIDER_PAY_WAIT_PER_MIN_PAISE`). Payouts themselves are made by Delivez finance.

## 6. Ops (admin token, ops console → Attendance / Vehicles)

| Call | |
|---|---|
| `GET /admin/fleet/vehicles?status=&category=&cityId=&search=` | Company vehicles with rider and "out on a shift". |
| `POST /admin/fleet/vehicles` `{ registration, category, description?, cityId?, hubName? }` | `category` = `BIKE · THREE_WHEELER · FOUR_WHEELER · TRUCK` |
| `PATCH /admin/fleet/vehicles/:id` `{ description?, hubName?, cityId?, status? }` | `ACTIVE · IN_REPAIR · RETIRED` (retired = taken off the rider) |
| `POST /admin/fleet/vehicles/:id/assign` `{ riderId }` · `/unassign` | Only riders who chose a company vehicle of the same type; not while the vehicle is out. |
| `GET /admin/attendance?date=&cityId=&riderId=&open=true` | Shifts of the day plus every open shift; `overdue` = open since an earlier day. |
| `GET /admin/attendance/:shiftId` | Selfies, GPS, breaks, vehicle check and return photos (links valid 10 min). |
| `POST /admin/attendance/:shiftId/end` `{ note }` | Close a shift the rider forgot to punch out of. |

Reading: any admin. Changing: FOUNDER, HEAD_OF_OPS, REGIONAL_HEAD, CITY_OPS, COMPLIANCE.
