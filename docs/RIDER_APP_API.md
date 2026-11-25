# Rider app API: sign-in and partner registration

For the **Delivez Agent** Flutter app (`delivez_delivery_agent`) and for the ops console screens that review riders.
Base URL: `https://<api-host>/v1`. All bodies are JSON. Errors look like `{ "error": { "code": "...", "message": "...", "details": ... } }`;
`400 VALIDATION_FAILED` puts the message for each field in `details.fieldErrors.<field>[0]`. Show `error.message` as it is: it is written for the rider.

## 0. Connecting the app

The app already has the two contracts (`lib/features/authentication/data`). Implement them against these endpoints, return them from
`AuthEnvironment`, and turn `prototypeMode` off. No screen changes are needed.

| App contract | Endpoint |
|---|---|
| `AuthRepository.requestOtp(phone, purpose, channel)` | `POST /auth/otp/request` `{ phone, purpose: "LOGIN" \| "ONBOARDING", channel: "SMS" }` → `OtpChallenge(id: requestId, codeLength, resendAfter: retryAfter s, expiresAt)` |
| `AuthRepository.verifyOtp(challenge, code)` | `POST /auth/otp/verify` `{ requestId, code, app: "RIDER", device }` → store the tokens, then `GET /rider/me`: `next = REGISTER` → `OtpNeedsRegistration`; `HOME` → `OtpSignedIn(account)` |
| `RegistrationData.options` | `GET /rider/registration/options` (no login) |
| `RegistrationRepository.submit(data)` | `POST /rider/registration`, then `PUT /rider/registration/steps/:step` per screen, documents (§3), `POST /rider/registration/submit` → `applicationRecord` |
| `RegistrationRepository.fetchStatus(id)` | `GET /rider/registration/status` → `ApplicationRecord` |
| `AgentWorkProfile` (Punch-In) | `GET /rider/me` → `workProfile` |

Saving each step when the rider taps **Save & Continue** (instead of everything at the end) keeps the draft on the server, so it survives an app restart.

**Not available yet:** `OtpChannel.voice` (only `SMS`; `WHATSAPP` exists too). Hide the "phone call" option until a voice provider is added.

## 1. Sign-in (same endpoints as the other apps, with `app: "RIDER"`)

| Step | Call | Reply |
|---|---|---|
| Send code | `POST /auth/otp/request` `{ "phone": "<10-digit mobile>" }` | `{ requestId, codeLength: 6, expiresIn: 300, expiresAt, retryAfter: 30 }`. Max 5 codes per hour per phone; too soon → `429 OTP_RESEND_TOO_SOON` with `details.retryAfter`. |
| Verify | `POST /auth/otp/verify` `{ "requestId", "code", "app": "RIDER", "device": { "platform": "android", "model": "...", "os": "14" } }` | `{ accessToken, refreshToken, expiresIn: 900, user }`. Wrong code → `400 OTP_INCORRECT` (`AuthFailure.invalidCode`); used or unknown → `400 OTP_INVALID`; expired → `400 OTP_EXPIRED` (`expiredCode`); more than 5 codes an hour → `429 OTP_RATE_LIMITED`; 5 wrong tries → `429 OTP_TOO_MANY_ATTEMPTS`. |
| Which screen? | `GET /rider/me` | See below. |
| Stay signed in | `POST /auth/refresh` `{ "refreshToken" }` | A **new** pair; the old refresh token stops working. Access tokens last 15 min. |
| Sign out | `POST /auth/logout` · everywhere: `POST /auth/logout-all` | |

`GET /rider/me`:

| `next` | When | App |
|---|---|---|
| `REGISTER` | no application, a draft, or ops sent it back (`applicationRecord.status = actionRequired`, `message` says what to fix) | Registration welcome / the first unfinished step |
| `STATUS` | sent and waiting, or rejected | Application status |
| `HOME` | approved | Module home: `account.module` |
| `RESTRICTED` | suspended by ops | Account restricted: `account.holdReason` |

```json
{
  "next": "HOME",
  "applicationRecord": { "id": "…", "status": "approved", "submittedAt": "…", "message": "", "documentStatuses": { "gov_id": "Verified", "pan": "Verified" }, "assignedHub": "Indiranagar hub" },
  "account": {
    "module": "quickCommerce",
    "holdReason": "",
    "profile": { "id": "DZR-704586", "name": "…", "role": "Delivery partner - last-mile", "category": "Delivez Biz", "fleet": "My Own Vehicle", "hub": "Indiranagar hub", "vehicle": "Bike · KA03TT1234", "shift": "Evening (14:00 - 20:00)", "zone": "Bengaluru", "phone": "…", "email": "", "emergencyContact": "" }
  },
  "workProfile": { "vehicleProvider": "OWN_VEHICLE", "vehicleCategory": "BIKE", "workPreference": "PER_ORDER", "ownVehicle": { "type": "Motorcycle / Scooter", "makeModel": "…", "registration": "KA03TT1234" } }
}
```

`account.module` is an `AgentModule` name; `applicationRecord` is `ApplicationRecord` (status `underReview` · `actionRequired` · `approved` · `rejected`; `documentStatuses` keyed by the app's document ids); `workProfile` is `AgentWorkProfile.toJson()`.

## 2. Registration steps (rider token)

`GET /rider/registration/options` returns every choice as `{ value, label }` (labels are the app's own texts), plus `tiers[].services[]`,
`steps` (order) and `stepTitles`. **Send `value`, show `label`.**

| Call | What it does |
|---|---|
| `POST /rider/registration` | Starts (or returns) the application. Safe to call twice. |
| `GET /rider/registration` | `status`, `steps` (saved answers), `documents`, `missing` (`steps`, `documents`, `applicableSteps`, `problems` = the app's `missingRequirements`), `canSubmit`, `reviewNote`. |
| `PUT /rider/registration/steps/:step` | Saves one screen. Dates may be `DD/MM/YYYY` (as the app formats them) or `YYYY-MM-DD`. |
| `POST /rider/registration/submit` `{ "consent": true }` | Sends it to ops. `422 APPLICATION_INCOMPLETE`: `message` is the first missing item, `details` lists all. Locked afterwards (`409 APPLICATION_LOCKED`) until ops send it back. |

| `:step` (app screen) | Body |
|---|---|
| `personal-info` (1) | `fullName`, `dob` (18+), `pincode`, `email` (optional), `idType` (`AADHAAR` `PAN` `VOTER_ID` `PASSPORT`), `idLast4` |
| `work-tech` (2) | `tier` (`DELIVEZ_BIZ` `DELIVEZ_NOW` `DELIVEZ_ONE`), `services[]` (from that tier), `workingDays[]` (`MON`…`SUN`), `shift`, `workPreference` (`FULL_TIME` `PART_TIME` `PER_ORDER`), `experienceLevel`, `previousPlatforms` (optional), `sectors[]` (optional), `trainingNeeds`, `phoneType`, `navigationApp`, `mobileData`, `permissionConsent: true` |
| `legal-vehicle` (3) | `declarations: { VALID_LICENCE, VEHICLE_PAPERS (own vehicle only), NO_CRIMINAL_RECORD, TRANSPORT_NORMS: true }`, `licenceType`, `licenceNumber`, `licenceExpiry` (not expired), `vehicleProvider` (`COMPANY_PROVIDED` `OWN_VEHICLE`), `vehicleCategory` (`BIKE` `THREE_WHEELER` `FOUR_WHEELER` `TRUCK`); own vehicle also `vehicleType` (in the category), `vehicleMakeModel`, `vehicleRegNumber` (e.g. `KA 51 AB 1234`), `vehicleOwnership`, `operationalCondition` |
| `hyperlocal` (3b) | `jobTypes[]` — only when `services` has `HYPERLOCAL` (`missing.applicableSteps` says so) |
| `safety-compliance` (4) | `declarations: { PACKAGE_RULES, COD_RESPONSIBILITY, CHAIN_OF_CUSTODY, FRAGILE_GOODS, CONDUCT_POLICY: true }` |
| `training-role` (6) | `operationalRole` (`LAST_MILE` `HUB_ASSOCIATE`), `completedModules[]` (all 5) |

Rules the server checks (same as the app, plus a few the app leaves to the server):

* The licence must cover the vehicle: bike → `MCWG`; three-wheeler → commercial 3W, `LMV` or `HMV`; four-wheeler / truck → `LMV` or `HMV`; medium / heavy truck → `HMV`.
* **Company vehicle:** own-vehicle answers are dropped, the vehicle-papers declaration is not asked, RC / insurance are not needed (uploading them → `400 DOCUMENT_NOT_NEEDED`; ones already attached are removed when the step is saved, listed in `detachedDocuments`), and Hyperlocal job types must fit the category (e.g. a company bike cannot take *Tyre and battery*).
* **Own vehicle:** a job type that needs a bigger vehicle is allowed; it stays inactive until such a vehicle is approved.

## 3. Documents (step 5)

| Call | |
|---|---|
| `POST /rider/registration/documents/presign` `{ type, contentType, size }` | → `{ uploadUrl, fileKey, headers }`. `PUT uploadUrl` with the bytes and the same `content-type` (a relative `uploadUrl` is on the API host). JPG / PNG / WEBP / PDF, ≤ 10 MB. |
| `POST /rider/registration/documents` `{ type, fileKey }` | Attaches it. The same type again replaces it. |
| `DELETE /rider/registration/documents/:type` | Removes one. |

| `type` | App id | Needed |
|---|---|---|
| `GOV_ID` | `gov_id` | always |
| `PHOTO` | `photo` | always |
| `PAN` | `pan` | always |
| `BANK_PROOF` | `bank` | always |
| `DRIVING_LICENCE` | `dl` | always |
| `VEHICLE_RC` | `rc` | own vehicle |
| `VEHICLE_INSURANCE` | `insurance` | own vehicle |
| `ADDRESS_PROOF` | `address` | optional |

## 4. Review by ops (admin token)

Any admin can read; changing needs FOUNDER, HEAD_OF_OPS, REGIONAL_HEAD, CITY_OPS or COMPLIANCE. City-scoped admins see riders of their cities.

| Call | What it does |
|---|---|
| `GET /admin/riders/applications?status=&search=&page=&pageSize=` | Queue with `counts` per status. |
| `GET /admin/riders/applications/:id` | All answers, `summary` (tier, services, vehicle, job types the vehicle can't take, `suggestedModule`), documents with view links, what is missing. |
| `POST .../:id/start-review` | SUBMITTED → UNDER_REVIEW |
| `POST .../:id/documents/:docId/verify` · `.../reject` `{ reason }` | Per file; the rider sees `Rejected: <reason>`. |
| `POST .../:id/request-changes` `{ reason }` | Back to the rider: `actionRequired` with this message. |
| `POST .../:id/approve` `{ cityId?, module?, hub? }` | Every required file verified first. `module` = the app module (default: from their first service), `hub` is shown in the app. |
| `POST .../:id/reject` `{ reason }` | Final no. |
| `POST /admin/riders/:riderId/suspend` `{ reason }` · `/reinstate` | Suspend logs the rider out everywhere; refused while they carry an order. |

Every status change is written to the audit log.

## 5. Server settings

* Real SMS: `SMS_PROVIDER=MSG91`. Codes appear in the reply (`devCode`) only in development or with `OTP_SHOW_IN_RESPONSE=true`.
* The app needs no CORS entry (it is not a website). The web rider app (`agent.delivez.com`) does.
