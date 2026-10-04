# Background admin check-in notifications

## What will change
- Add an administrator-only “Enable phone alerts” control near the existing notification bell.
- Register each administrator’s browser or installed phone app for push alerts after they grant notification permission.
- Send a push alert with the staff member’s name, staff ID, and check-in time after a successful photo check-in.
- Open the attendance dashboard when an administrator taps an alert.
- Keep the existing live in-dashboard bell alerts unchanged.

## Data and security
- Store push registration tokens in a protected table tied to the signed-in administrator.
- Verify every notification request against the signed-in staff member’s newly created attendance record.
- Deliver only to users with the administrator role, and remove expired device registrations.
- Prevent duplicate notifications for the same attendance record.

## Technical details
- Use the connected Firebase Cloud Messaging service for background web push.
- Add the Firebase messaging worker required for notifications while the dashboard is closed; it will not cache the app or add offline behavior.
- Add an authenticated server function for secure notification delivery through the connected service.
- Gracefully explain unsupported browsers, denied permission, missing web-push configuration, and Lovable’s embedded preview limitation.
