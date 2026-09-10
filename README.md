# FLOWORA Admin Hub

Build and fully configure a secure Admin Authentication system for the FLOWORA Business Portfolio platform.

### ADMIN ACCOUNT

Create the initial Super Admin account using:

Email: [makolabdo@gmail.com](mailto:makolabdo@gmail.com)

The admin must authenticate using:

* Email
* Password

Do NOT implement Google Login, GitHub Login, Facebook Login, or any other social authentication.

### ADMIN PERMISSIONS

The Super Admin must have full control over the platform:

* View all registered users
* View pending users
* Approve users
* Reject users
* Suspend users
* Delete users
* Restore suspended users
* Edit any user's information
* Edit any business portfolio
* Create business portfolios
* Publish / unpublish portfolios
* Preview portfolios
* Manage logos, images, services, prices, contact information, social links, business hours, offers and locations
* Generate QR codes for portfolios
* View portfolio analytics
* Manage user status and permissions

### USER APPROVAL SYSTEM

Every new user must have a status:

* pending
* approved
* rejected
* suspended

New users start as `pending`.

A pending user must NOT have access to the business dashboard.

Only the Super Admin can change a user to `approved`.

If the user is rejected or suspended:

* Block dashboard access
* Do not allow them to edit their portfolio
* Show an appropriate access-denied message

### SECURITY REQUIREMENTS

Use Supabase Auth with email/password authentication.

Use PostgreSQL + Row Level Security (RLS).

IMPORTANT:

* Never store passwords in the database manually.
* Never expose the Admin password in frontend code.
* Never hardcode the Admin password in React/TypeScript source code.
* Never allow clients to modify their own role or approval status.
* The Admin role must be protected server-side/database-side.
* Only the Super Admin can approve, reject, suspend, or delete users.
* Clients can only modify their own portfolio.
* Public visitors can only see portfolios that are approved AND published.

### PASSWORD RESET

Implement a complete "Forgot Password?" flow using Supabase Auth.

The login page must contain:

Email
Password
Login button
Forgot Password?

Users must be able to securely reset their password through their email.

### LOGIN BEHAVIOR

After successful Admin login:
→ Redirect to `/admin`

After successful approved client login:
→ Redirect to `/dashboard`

Pending/rejected/suspended users:
→ Do not allow dashboard access.

### DATABASE STRUCTURE

Create the necessary tables and relationships, for example:

profiles:

* id
* email
* full_name
* role
* status
* created_at
* updated_at

business_profiles:

* id
* user_id
* business_name
* slug
* logo_url
* description
* phone
* whatsapp
* email
* website
* instagram
* facebook
* tiktok
* google_maps_url
* opening_hours
* published
* created_at
* updated_at

services:

* id
* business_id
* name
* description
* price
* image_url
* created_at

gallery:

* id
* business_id
* image_url
* created_at

offers:

* id
* business_id
* title
* description
* price
* valid_until
* created_at

analytics:

* id
* business_id
* event_type
* created_at

### PUBLIC PROFILE

Each approved business receives a permanent public URL such as:

`/p/business-name`

The URL must remain stable even when the business edits its information.

Generate a QR code pointing to this public URL.

The public profile must NOT require login.

Only approved + published profiles are publicly visible.

### IMPORTANT

Do not create a public self-service business dashboard before approval.

The platform is a managed-service platform operated by FLOWORA.

The Super Admin has complete control over which businesses are allowed to use the platform.

Build the system with clean architecture, responsive UI, strong authentication, proper authorization, secure RLS policies, and production-ready error handling.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://flowora-admin-guard.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b4347947-c0b1-4407-b098-473b508e5b90).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
