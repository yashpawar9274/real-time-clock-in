# Photo check-in and live admin alerts

## What will change
- Replace punch-in/punch-out with a single daily check-in that requires a freshly captured phone camera photo.
- Store attendance photos privately and allow only the staff member or an administrator to view them.
- Show staff photo, staff ID, date, and check-in time in the administrator attendance view.
- Add a live notification bell and unread count in the administrator phone header; new check-ins appear immediately.
- Remove check-out status, time, and actions from staff history and administration screens.

## Technical details
- Add a private attendance-photo storage bucket and an attendance photo path field with owner/admin access policies.
- Update the check-in database function to require a photo path, while keeping one attendance record per staff member per day.
- Keep Realtime subscription cleanup on unmount and enable attendance changes in the Realtime publication.
- Use the phone camera through a capture-enabled file input; no offline attendance or background push service is added.
