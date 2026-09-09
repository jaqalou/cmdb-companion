# Using CB Assets

## Signing in

Go to `/auth` and sign in with your email and password, or with Google. If you
have no account, ask an administrator to create one. Without signing in the
inventory pages stay empty.

## Finding things

The sidebar groups the console into Dashboard, Assets (Servers, SQL Instances,
Network Switches, Access Points) and Tools (Add Item, API, Users &
permissions).

The dashboard shows a count tile per asset class. Each asset page has:

- a search box and column filters over the full field set
- a **support** pie chart — how many items are out of support, expiring within
  six months, in support or missing an EOL date — filterable by Region,
  Environment and Application name
- a dense table; click a hostname (or **Open**) to see the full record

## Record pages

A record opens with its fields grouped into tabs (Identity, Location, Service,
Ownership, Hardware, Platform/Wireless, Lifecycle, Operations, and so on).
Administrators and editors see **Edit record**: change any field and save.
Every change is logged with who made it and what it was before.

## Snoozing

Each row has a **Snoozed** checkbox. It marks that someone has looked at the
item and accepted its state for now. It does not change the support status or
the pie chart — those always reflect the real EOL date.

## Adding and deleting

- **Add Item** in the sidebar creates a record: pick the asset class, fill in
  the fields, save. Available to editors and admins.
- Tick rows and use **Delete N selected** to remove records. Admins only.

## Downloading

Above every table, **Download** offers:

- scope: all records, the current filter, or just the selected rows
- format: CSV or JSON

The export contains the same columns as the table's field definition.

## Users & permissions

Administrators can, under Tools:

- create an account with an email, temporary password and role
- grant or revoke `admin`, `editor` and `viewer`
- rename (change the email of) an account
- delete an account — except their own

Roles: viewers read, editors also create and edit, admins additionally delete
records and manage accounts.
