# InsightHub — IP Analytics & Visitor Intelligence Extension

## Context

The existing project is a Next.js + TypeScript + Tailwind CSS + shadcn/ui application originally called **PhoneCheck**.

The application currently provides phone-number validation using the Numverify API.

Now extend the same project into a broader application called:

# InsightHub

### Tagline

> Phone validation, visitor analytics and IP intelligence in one place.

Do NOT create a new project.

Continue working inside the existing Next.js project and preserve the existing PhoneCheck functionality.

---

# 1. New Product Structure

The application should now have two major areas:

```text
InsightHub
│
├── Public
│   └── Phone Number Analyzer
│
└── Admin
    └── Visitor Analytics
```

The public application allows users to analyze phone numbers.

The admin application allows the administrator to monitor website visitors and understand:

- Number of visitors
- Countries
- Cities
- Regions
- IP addresses
- ISPs
- Time zones
- Device/browser information when collected appropriately
- First seen
- Last seen
- Visit count
- Referrer
- Page visited
- Visitor activity over time

---

# 2. Rename the Application

Change the visible application branding from:

```text
PhoneCheck
```

to:

```text
InsightHub
```

Use:

```text
InsightHub
```

as the main logo/name.

Use:

```text
PhoneCheck
```

as the name of the phone-analysis module.

For example:

```text
InsightHub
├── Dashboard
├── Visitors
├── Geography
├── PhoneCheck
└── Settings
```

---

# 3. Technology Stack

Keep the existing stack.

Use:

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui
- Lucide React
- Zod
- React Hook Form where appropriate
- Database for persistent visitor analytics

Do not introduce unnecessary technologies.

---

# 4. Add IPstack Integration

Add IPstack to the project.

The IPstack API provides IP geolocation information including fields such as:

- IP
- IPv4/IPv6 type
- Country
- Country code
- Region
- City
- ZIP
- Latitude
- Longitude
- Time zone
- Currency
- ISP
- ASN
- Connection information

Some additional fields depend on the user's IPstack plan.

Use the API fields actually available from the configured account. Do not assume optional fields always exist.

IPstack's requester lookup can resolve the IP associated with the current API request, which is useful for visitor tracking.

---

# 5. Environment Variables

Add:

```env
IPSTACK_API_KEY=your_ipstack_key_here
```

The `.env.example` file must contain:

```env
NUMVERIFY_API_KEY=
IPSTACK_API_KEY=
```

IMPORTANT:

Never use:

```env
NEXT_PUBLIC_IPSTACK_API_KEY=
```

The IPstack API key must remain server-side.

Never expose it to the browser.

Never hardcode the key.

---

# 6. Database

Unlike the original PhoneCheck history, visitor analytics must be persistent.

Use the database technology already present in the project if one exists.

If there is no database yet, add MongoDB with Mongoose.

Do NOT create a complicated database architecture.

Create one main collection/model:

```text
Visitor
```

---

# 7. Visitor Data Model

Create:

```text
models/Visitor.ts
```

or an equivalent location according to the existing project architecture.

Suggested structure:

```ts
interface Visitor {
  ip: string;

  ipType?: string;

  countryCode?: string;
  countryName?: string;

  regionCode?: string;
  regionName?: string;

  city?: string;
  zip?: string;

  latitude?: number;
  longitude?: number;

  timezone?: string;

  currencyCode?: string;

  isp?: string;
  asn?: number | string;

  connectionType?: string;

  userAgent?: string;
  browser?: string;
  operatingSystem?: string;
  deviceType?: string;

  referrer?: string;

  page?: string;

  firstSeen: Date;
  lastSeen: Date;

  visitCount: number;
}
```

Add:

```text
createdAt
updatedAt
```

through the database schema.

Adapt this model to the exact response returned by IPstack.

---

# 8. Privacy / Data Minimization

This is an analytics demonstration project.

Do not collect unnecessary personal information.

Do NOT collect:

- Name
- Email
- Phone number
- Password
- Exact physical address
- Personal messages
- Form contents

Only collect the information required for visitor analytics.

Remember that IP addresses can constitute personal data in some jurisdictions.

Add a privacy-conscious architecture.

The dashboard should explain that location is **IP-based and approximate**.

Do not describe IP geolocation as exact physical tracking.

---

# 9. Visitor Tracking Architecture

The architecture should be:

```text
Visitor
   ↓
InsightHub website
   ↓
Next.js server
   ↓
Extract request IP
   ↓
IPstack lookup
   ↓
Normalize location/network data
   ↓
MongoDB
   ↓
Admin Dashboard
```

Do NOT call IPstack directly from the browser.

Correct:

```text
Browser
   ↓
Next.js
   ↓
IPstack
```

Incorrect:

```text
Browser
   ↓
IPstack
```

The API key must remain private.

---

# 10. Important Tracking Rule

Do not send an IPstack request on every single render.

Implement reasonable deduplication.

For example:

```text
Same visitor
      ↓
Existing recent visitor record
      ↓
Update lastSeen + visitCount
```

Only perform a new IP geolocation lookup when necessary.

You may use:

```text
IP + time window
```

as a basic deduplication strategy.

For example:

```text
If the same IP has been seen recently,
reuse the stored geolocation information.
```

Do not repeatedly consume IPstack API requests unnecessarily.

---

# 11. Visitor Tracking API

Create a server-side route such as:

```text
app/api/analytics/track/route.ts
```

It should:

1. Receive the current page information
2. Determine the request IP server-side
3. Read relevant headers
4. Check whether the visitor already exists
5. If necessary, query IPstack
6. Normalize the response
7. Save/update the visitor record
8. Return a minimal success response

Example:

```json
{
  "success": true
}
```

Do not return the full visitor record to the public browser.

---

# 12. Getting the Visitor IP

Implement a helper:

```text
lib/get-client-ip.ts
```

It should handle common deployment/proxy environments safely.

Check appropriate forwarding headers used by the hosting infrastructure.

Do not blindly trust arbitrary client-provided headers.

The implementation should be compatible with:

- Local development
- Reverse proxy
- VPS deployment
- Production hosting

Document the assumptions in the README.

---

# 13. IPstack Service

Create:

```text
lib/ipstack.ts
```

Implement a server-side function such as:

```ts
lookupIp(ip: string)
```

The service should:

1. Read `IPSTACK_API_KEY`
2. Validate configuration
3. Call IPstack
4. Parse JSON
5. Validate the response
6. Normalize fields
7. Handle API errors
8. Return typed data

Never return:

```text
IPSTACK_API_KEY
```

to the frontend.

---

# 14. IPstack Response Type

Create:

```text
types/ipstack.ts
```

Define types for the fields used by the application.

For example:

```ts
interface IpstackResponse {
  ip: string;
  type?: string;

  country_code?: string;
  country_name?: string;

  region_code?: string;
  region_name?: string;

  city?: string;
  zip?: string;

  latitude?: number;
  longitude?: number;

  location?: {
    country_flag_emoji?: string;
    calling_code?: string;
    is_eu?: boolean;
  };

  time_zone?: {
    id?: string;
    current_time?: string;
    gmt_offset?: number;
    code?: string;
  };

  currency?: {
    code?: string;
    name?: string;
    symbol?: string;
  };

  connection?: {
    asn?: number;
    isp?: string;
    connection_type?: string;
  };

  security?: {
    is_proxy?: boolean;
    proxy_type?: string;
    is_crawler?: boolean;
    is_tor?: boolean;
    threat_level?: string;
  };
}
```

Make optional fields optional because availability depends on the API plan.

---

# 15. Admin Section

Create:

```text
app/admin/
```

Main route:

```text
/admin
```

This should become the main analytics dashboard.

IMPORTANT:

The admin area must NOT be publicly exposed as an unrestricted dashboard.

Implement an authentication boundary.

If the project already has authentication, reuse it.

If there is no authentication yet, implement a simple admin authentication system appropriate for the existing project.

Do NOT create a fake frontend-only password check.

---

# 16. Admin Navigation

Create a professional sidebar.

Example:

```text
InsightHub
────────────────────

Dashboard

Analytics
  Overview
  Visitors
  Geography

Tools
  PhoneCheck

System
  Settings
```

On mobile, use a responsive sheet/sidebar.

---

# 17. Admin Dashboard

Create:

```text
/admin
```

with KPI cards.

Example:

```text
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Total Visitors │ │ Today          │ │ Countries      │
│ 12,481         │ │ 384            │ │ 42             │
└────────────────┘ └────────────────┘ └────────────────┘

┌────────────────┐ ┌────────────────┐
│ Cities         │ │ Returning      │
│ 317            │ │ 38%            │
└────────────────┘ └────────────────┘
```

Do not fabricate statistics.

Every number must come from the database.

---

# 18. Dashboard Charts

Add useful charts.

Use a lightweight chart library if one is not already installed.

Possible charts:

### Visitors over time

```text
Visitors
│
│        ╭──╮
│     ╭──╯  ╰──╮
│  ╭──╯        ╰──
└────────────────────
   Mon Tue Wed Thu Fri
```

### Visitors by country

Bar chart:

```text
Morocco       █████████████
France        ████████
Spain         █████
USA           ████
Canada        ██
```

### Visitors by city

Show top cities.

---

# 19. Date Filters

Add a date range selector.

Options:

```text
Today
Yesterday
Last 7 days
Last 30 days
This year
Custom
```

The dashboard must recalculate statistics based on the selected period.

Do not load all records unnecessarily.

Use server-side aggregation where possible.

---

# 20. Visitors Page

Create:

```text
/admin/visitors
```

Display a professional data table.

Columns:

```text
IP
Country
City
Region
ISP
Device
Browser
OS
Last Seen
Visits
```

Example:

```text
+212.xxx.xxx.xxx
🇲🇦 Morocco
Casablanca
Casablanca-Settat
Maroc Telecom
Desktop
Chrome
Windows
2 min ago
8
```

Use shadcn/ui Table.

---

# 21. Visitor Details

When clicking a visitor, open:

```text
/admin/visitors/[id]
```

or a Dialog/Sheet.

Display:

```text
Visitor Details

IP Address
Country
Region
City
Approximate Coordinates
Timezone
ISP
ASN
Connection Type
Device
Browser
Operating System
First Seen
Last Seen
Visit Count
```

Coordinates must be described as:

> Approximate IP-based location

Never imply exact physical position.

---

# 22. Search

Add visitor search.

Allow searching by:

```text
IP
Country
City
ISP
```

Example:

```text
Search visitors...
```

Use server-side filtering for large datasets.

---

# 23. Filters

Add filters:

```text
Country
City
Device
Browser
Operating System
Date
```

Example:

```text
Country: [All]
Device: [All]
Browser: [All]
Date: [Last 7 days]
```

---

# 24. Pagination

Do NOT load thousands of records at once.

Implement pagination.

Example:

```text
Showing 1–25 of 1,248

< Previous   1 2 3 4 5   Next >
```

Default:

```text
25 records
```

---

# 25. Countries Page

Create:

```text
/admin/geography
```

Display:

```text
Geography

Top Countries

🇲🇦 Morocco       482
🇫🇷 France        231
🇪🇸 Spain         174
🇺🇸 United States 142
```

Also display:

```text
Countries
Visitors
Percentage
```

Sort descending by visitor count.

---

# 26. Cities Statistics

Display:

```text
Top Cities

Casablanca      231
Rabat           184
Marrakesh       112
Paris           97
Madrid          73
```

Use database aggregation.

---

# 27. World Map

If practical, add a world map visualization.

Use visitor country/city information.

However:

Do NOT represent IP geolocation as exact coordinates of individuals.

A map should display aggregated geographic activity.

For example:

```text
Visitors by Country
```

rather than:

```text
Exact visitor locations
```

If implementing the map requires too many dependencies, prioritize the charts and tables.

---

# 28. Real-Time / Recent Visitors

Add a section:

```text
Recent Visitors
```

Display the latest activity:

```text
🇲🇦 Casablanca
Chrome · Windows
2 minutes ago

🇫🇷 Paris
Safari · macOS
5 minutes ago
```

Do not use fake real-time values.

Use actual database timestamps.

---

# 29. Online Visitors

For the first version, define:

```text
Active visitor
```

as a visitor with activity within a configurable recent window, such as 5 minutes.

Make this definition clear in the UI.

Example:

```text
Currently Active
24
```

This is an approximation based on recent tracking activity, not a guaranteed indication that someone is actively looking at the page.

---

# 30. Page Analytics

Track the page that generated the visit.

Example:

```text
Page
/
 /phonecheck
 /about
 /contact
```

Dashboard:

```text
Top Pages

/phonecheck     1,284
/              947
/about          421
/contact        183
```

---

# 31. Referrer Analytics

If available from the request headers, save the referrer.

Display:

```text
Traffic Sources

Direct       820
Google       430
LinkedIn     180
Other        95
```

Do not fabricate traffic sources.

If no referrer exists, classify it as:

```text
Direct / Unknown
```

---

# 32. Device Analytics

Parse the User-Agent server-side.

Store only useful high-level information:

```text
deviceType
browser
operatingSystem
```

Example:

```text
Desktop
Mobile
Tablet
```

Do not store the complete User-Agent if it isn't needed.

If you need the raw User-Agent for debugging, make it optional and document the privacy implications.

---

# 33. Dashboard Cards

Use shadcn Card.

Suggested cards:

```text
Total Visitors
Unique Visitors
Visits Today
Active Visitors
Countries
Cities
Top Country
Top City
```

Every card must use real database data.

---

# 34. Admin Dashboard Design

Make the admin dashboard visually similar to modern SaaS analytics platforms.

Use:

```text
Sidebar
Topbar
Cards
Charts
Tables
Filters
Badges
Dropdowns
Date picker
Dialogs
Sheets
```

Use:

```text
shadcn/ui
Lucide
Tailwind
```

Keep the UI clean.

Do not overuse gradients.

---

# 35. Public Website Tracking

Every public page that should be tracked must trigger visitor tracking.

Create a reusable client component:

```text
components/analytics/visitor-tracker.tsx
```

The component should send:

```text
page
referrer
```

to:

```text
/api/analytics/track
```

Do NOT send the IP from the client.

The server determines the IP.

---

# 36. Avoid Duplicate Tracking

Do not track every React render.

Track page visits based on:

```text
pathname
```

and navigation changes.

For example:

```text
User opens /
      ↓
Track /

User navigates /phonecheck
      ↓
Track /phonecheck

User re-renders component
      ↓
Do not track again
```

Use appropriate client-side navigation detection.

---

# 37. Database Aggregation

Create server-side analytics functions.

For example:

```text
lib/analytics.ts
```

Functions:

```ts
getDashboardStats();
getVisitors();
getVisitorById();
getVisitorsByCountry();
getVisitorsByCity();
getVisitorsByPage();
getVisitorsOverTime();
getRecentVisitors();
getActiveVisitors();
```

Use MongoDB aggregation pipelines where appropriate.

Do not fetch every visitor and calculate everything in JavaScript.

---

# 38. API Routes

Create appropriate server endpoints.

For example:

```text
/api/analytics/track
/api/admin/stats
/api/admin/visitors
/api/admin/visitors/[id]
/api/admin/geography
```

Protect all `/api/admin/*` endpoints with admin authentication.

The public tracking endpoint should only return a minimal response.

---

# 39. Security

Implement:

- Server-side API keys
- Authentication for admin
- Authorization checks
- Input validation
- Rate limiting where appropriate
- Safe database queries
- No API keys in client code
- No sensitive data in public API responses

Do not allow users to query arbitrary visitor records.

Do not allow unauthenticated access to:

```text
/api/admin/*
```

---

# 40. Rate Limiting / Abuse Protection

The tracking endpoint is public, so consider basic protection against abuse.

Do not allow a client to flood the database with thousands of tracking requests.

Implement a lightweight strategy such as:

```text
IP + short time window
```

or another appropriate server-side mechanism.

Keep it simple for this project.

---

# 41. IPstack Request Optimization

This is important because API requests can consume your IPstack quota.

Do not call IPstack every time a page changes.

Example:

```text
Visitor A
   ↓
First visit
   ↓
IPstack lookup
   ↓
Save geolocation
```

Then:

```text
Visitor A
   ↓
Second page
   ↓
Reuse existing geolocation
   ↓
Update visit statistics
```

Only refresh the geolocation periodically if necessary.

---

# 42. IPstack Plan Awareness

Some IPstack response fields may depend on the user's plan.

Therefore:

```text
country
city
region
coordinates
```

should work when available.

Optional modules such as:

```text
timezone
currency
connection
security
```

must be handled gracefully.

If a field is unavailable:

```text
N/A
```

or:

```text
Not available
```

Do not crash.

Do not assume that a missing optional field means the IP lookup failed.

---

# 43. Privacy UI

Add a small privacy notice to the public application.

Example:

> This website may collect limited technical information such as IP-based location, browser and device information for anonymous analytics and service improvement.

Adapt this text to the application's actual behavior.

Do not claim the analytics are anonymous if the application stores identifiable IP addresses.

A better wording can be:

> Visitor analytics may include technical information such as IP address, approximate IP-based location, browser and device type.

---

# 44. Data Retention

Add a simple retention setting.

For example:

```text
Visitor Data Retention

30 days
90 days
180 days
1 year
```

For the initial implementation, default to:

```text
90 days
```

Implement cleanup only if it can be done safely within the existing deployment architecture.

Otherwise:

- store the setting
- document that automated cleanup requires a scheduled job/cron

Do not pretend cleanup is automatic if it isn't.

---

# 45. Admin Settings

Create:

```text
/admin/settings
```

Sections:

### Analytics

```text
Visitor tracking: Enabled
Track page views: Enabled
Track referrer: Enabled
```

### Privacy

```text
Data retention: 90 days
```

### API Status

```text
Numverify
Connected

IPstack
Connected
```

Do not display API keys.

Only show:

```text
Connected
Not configured
Error
```

---

# 46. API Health Check

Add a simple admin-only health page or settings section.

Show:

```text
Services

Numverify
● Connected

IPstack
● Connected

Database
● Connected
```

Perform lightweight checks.

Do not consume API quota unnecessarily.

---

# 47. PhoneCheck Integration

Keep the existing PhoneCheck functionality.

Move it into:

```text
/phonecheck
```

The page should preserve the existing phone validation functionality.

Navigation:

```text
Dashboard
Visitors
Geography
PhoneCheck
Settings
```

---

# 48. New Home Page

The new homepage should introduce InsightHub.

Hero:

```text
InsightHub

Understand your visitors.
Validate phone numbers.
Build smarter experiences.

[ Explore Analytics ]
[ PhoneCheck ]
```

Below:

```text
Features

Visitor Analytics
Understand where your visitors come from.

IP Intelligence
Enrich visitor activity with location and network information.

PhoneCheck
Validate and analyze international phone numbers.
```

Keep the language factual.

Do not make unsupported claims.

---

# 49. Application Layout

Recommended structure:

```text
app/
│
├── page.tsx
│
├── phonecheck/
│   └── page.tsx
│
├── admin/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── visitors/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── geography/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
│
├── api/
│   ├── phone/
│   │   └── validate/
│   │       └── route.ts
│   │
│   └── analytics/
│       └── track/
│           └── route.ts
│
└── api/admin/
    ├── stats/
    │   └── route.ts
    ├── visitors/
    │   ├── route.ts
    │   └── [id]/
    │       └── route.ts
    └── geography/
        └── route.ts
```

Adapt to the existing architecture.

---

# 50. Recommended Project Structure

Final structure should approximately be:

```text
app/
components/
lib/
models/
types/
hooks/
public/
```

Example:

```text
lib/
├── numverify.ts
├── ipstack.ts
├── analytics.ts
├── get-client-ip.ts
├── validations.ts
└── utils.ts

models/
└── Visitor.ts

types/
├── phone.ts
├── ipstack.ts
└── analytics.ts

components/
├── analytics/
│   ├── visitor-tracker.tsx
│   ├── stats-card.tsx
│   ├── visitors-chart.tsx
│   ├── country-chart.tsx
│   └── recent-visitors.tsx
│
├── admin/
│   ├── admin-sidebar.tsx
│   ├── admin-header.tsx
│   └── ...
│
├── phone/
│   └── ...
│
└── ui/
    └── ...
```

---

# 51. Empty States

Every dashboard/table needs a useful empty state.

Example:

```text
No visitor data yet.

Once visitors start using your website,
their analytics will appear here.
```

Do not show fake demo visitors.

---

# 52. Error States

Create friendly states for:

```text
Database unavailable
IPstack unavailable
Authentication failure
No data
API limit reached
Invalid request
```

The admin UI must never crash because one optional API field is missing.

---

# 53. Loading States

Use:

```text
Skeleton
Spinner
Loading table
Loading charts
```

Do not block the entire dashboard if only one widget is loading.

---

# 54. Responsive Admin

Desktop:

```text
Sidebar + main content
```

Tablet:

```text
Collapsible sidebar
```

Mobile:

```text
Sheet navigation
Stacked cards
Scrollable table when necessary
```

Make sure tables remain usable on small screens.

---

# 55. Data Table Features

The visitor table should support:

- Pagination
- Search
- Sorting
- Filtering
- Row click
- Refresh
- Responsive layout

Add a refresh button:

```text
Refresh
```

---

# 56. Export

Add an optional:

```text
Export CSV
```

feature on the Visitors page.

Only allow authenticated admins to export.

Export useful fields:

```text
IP
Country
Region
City
ISP
Device
Browser
OS
First Seen
Last Seen
Visits
```

Do not export unnecessary data.

---

# 57. Dashboard Summary Example

The finished dashboard should look conceptually like:

```text
InsightHub
────────────────────────────────────────────

Good morning

Here's what's happening with your website.

┌───────────────┐ ┌───────────────┐
│ Visitors      │ │ Active        │
│ 12,481        │ │ 24            │
└───────────────┘ └───────────────┘

┌───────────────┐ ┌───────────────┐
│ Countries     │ │ Cities        │
│ 42            │ │ 317           │
└───────────────┘ └───────────────┘


Visitors over time
────────────────────────────────────────────
          ╭────╮
     ╭────╯    ╰────╮
─────╯              ╰────


Top Countries
────────────────────────────────────────────
🇲🇦 Morocco                  482
🇫🇷 France                   231
🇪🇸 Spain                    174


Recent Visitors
────────────────────────────────────────────
🇲🇦 Casablanca    Chrome     2 min ago
🇫🇷 Paris         Safari     5 min ago
🇺🇸 New York      Chrome     8 min ago
```

These values are examples only.

The actual implementation must use real database data.

---

# 58. Important Accuracy Rules

The UI must use careful language.

Use:

```text
Approximate location
IP-based location
Detected country
Detected city
```

Avoid:

```text
Exact location
User's address
Where the person physically is
Track this person
```

IP geolocation provides an estimate associated with an IP address, not an exact physical location.

---

# 59. No Fake Data

Do not generate fake visitors for the production dashboard.

If you need sample data for UI development, use a development-only seed script.

For example:

```text
scripts/seed.ts
```

But make sure:

```text
npm run seed
```

is clearly separate from production.

Do not automatically insert fake records when the application starts.

---

# 60. Testing

Test the following.

## Public visitor tracking

Open:

```text
/
```

Verify a visitor record is created.

Navigate to:

```text
/phonecheck
```

Verify the visit is updated/tracked appropriately.

---

## IPstack

Verify:

```text
Country
City
Region
IP
```

are correctly stored when available.

Verify optional fields do not crash the application.

---

## Admin

Open:

```text
/admin
```

Verify authentication is required.

Verify statistics are real.

---

## Visitors

Verify:

```text
Search
Filter
Pagination
Details
```

---

## Geography

Verify:

```text
Country aggregation
City aggregation
```

---

## PhoneCheck

Verify the existing Numverify feature still works.

---

# 61. Performance

Do not:

- Call IPstack repeatedly
- Query every visitor for every dashboard card
- Load thousands of visitors into the browser
- Recalculate all analytics client-side

Use:

```text
Database aggregation
Pagination
Caching where appropriate
Indexes
```

Create indexes for frequently queried fields such as:

```text
ip
countryCode
city
lastSeen
createdAt
```

---

# 62. MongoDB Indexes

Create appropriate indexes.

For example:

```text
ip
createdAt
lastSeen
countryCode
city
```

Avoid creating unnecessary indexes.

---

# 63. Admin API Response

Do not expose unnecessary data.

For dashboard:

```json
{
  "totalVisitors": 12481,
  "todayVisitors": 384,
  "activeVisitors": 24,
  "countries": 42,
  "cities": 317
}
```

For visitor list, return only fields required by the table.

---

# 64. README Update

Update the README to describe the complete product.

Title:

```text
InsightHub
```

Description:

> A Next.js analytics and API integration platform combining phone-number validation with IP-based visitor analytics.

Document:

```text
Features
Architecture
Installation
Environment Variables
Numverify
IPstack
MongoDB
Admin Dashboard
Visitor Tracking
Privacy
Development
Production
```

---

# 65. Environment Example

The final `.env.example` should look approximately like:

```env
NUMVERIFY_API_KEY=
IPSTACK_API_KEY=

MONGODB_URI=

ADMIN_SECRET=
```

Use the existing authentication environment variables if authentication is already implemented.

Do not expose any of these using:

```text
NEXT_PUBLIC_
```

unless a value is explicitly intended to be public.

---

# 66. Final Architecture

The final system should look like:

```text
                         InsightHub
                              │
              ┌───────────────┴───────────────┐
              │                               │
          Public App                       Admin
              │                               │
       ┌──────┴──────┐              ┌─────────┴─────────┐
       │             │              │                   │
   PhoneCheck    Visitor Tracker   Dashboard        Visitors
       │             │              │                   │
       ↓             ↓              ↓                   ↓
   Numverify       Next.js       MongoDB             MongoDB
                     │
                     ↓
                  IPstack
```

---

# 67. Final Quality Requirements

Before finishing:

Run:

```bash
npm run lint
```

Then:

```bash
npm run build
```

Fix every error.

Check TypeScript.

Check responsive behavior.

Check authentication.

Check API security.

Check database queries.

Check that API keys are not exposed.

Check that no fake production data exists.

Check that the existing PhoneCheck functionality still works.

---

# 68. Final Deliverable

The final project should provide:

### Public

- InsightHub homepage
- PhoneCheck
- Phone number validation
- Visitor tracking
- Responsive UI
- Privacy notice

### Admin

- Authentication
- Dashboard
- Visitor statistics
- Visitors table
- Visitor details
- Country analytics
- City analytics
- Page analytics
- Recent visitors
- Active visitors
- Search
- Filters
- Pagination
- CSV export
- Settings

### Backend

- Numverify integration
- IPstack integration
- MongoDB
- Visitor tracking
- Analytics aggregation
- Secure API routes
- Typed services
- Validation
- Error handling

### Engineering

- TypeScript
- Clean architecture
- shadcn/ui
- Tailwind
- Responsive design
- Dark mode
- Secure environment variables
- README
- `.env.example`
- Successful production build

Build this incrementally inside the existing project. Do not replace or break the existing PhoneCheck implementation.
