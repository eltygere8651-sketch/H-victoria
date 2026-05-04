# Security Specification - Hotel Victoria

## Data Invariants
1. **Identity Protection**: Users cannot modify their own `role` or `isAdmin` flags.
2. **Access Control**: Staff can only update operational fields of tasks (status, arrival). Core task details (title, date, location) are protected post-creation for non-admins.
3. **Data Integrity**: Every task creation is validated for title length, type correctness, and path safety.
4. **Product Stock**: Only staff/admins can modify stock. Staff is restricted to quantity updates only.
5. **System Verification**: Initialization phase is protected; only Super Admins or Admins can modify system configurations.

## The Dirty Dozen Payloads (Hardened)
1. **Identity Spoofing**: Attempting to set `authUid` to a value other than `request.auth.uid`.
2. **Privilege Escalation**: Non-admin attempting to set `role: 'ADMIN'` in their profile.
3. **Ghost Task**: Creating a task with an ID containing malicious characters (ID Poisoning).
4. **Value Poisoning**: Injecting a 1MB string into the `title` field.
5. **Shadow Update**: Attempting to change the `reservationDate` of an existing reservation as a Staff member.
6. **Status Shortcutting**: Attempting to delete a task as a non-admin.
7. **Bypassing Validation**: Creating a task with an invalid `type` (e.g., 'SYSTEM_BREACH').
8. **Inventory Manipulation**: Staff attempting to change a product's name or category (restricted to `quantity` ONLY).
9. **Notification Swipe**: Attempting to delete notifications as a regular user (if restricted).
10. **Cart Hijacking**: Reading or writing to a `draft_cart` that doesn't belong to the user's UID.
11. **Document Theft**: Accessing `hotel_victoria_documents` without an active session.
12. **Config Sabotage**: Modifying the `hotel_victoria_system/initialization` document as a non-admin.

## Security Architecture
- **Master Gate**: Access to specific features is gated by `getProfileData()` which looks up the user's role in the highly-trusted `hotel_victoria_users` collection.
- **Update Partitioning**: Staff permissions are strictly partitioned using `affectedKeys().hasOnly()` to prevent accidental or malicious modification of master data.
- **Size Enforcement**: All string inputs (titles, dates, locations) are bound by `.size()` checks to prevent resource exhaustion.

