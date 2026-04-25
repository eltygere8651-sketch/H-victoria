# Security Specification - Hotel Victoria

## Data Invariants
1. **Audit Logs**: Immutable once created. Only system or admins can create. No one can update or delete (except bulk clear by super-admin).
2. **Products**: Only admins can modify. Stock can be updated by staff during orders.
3. **Tasks**: Only assigned department or admins can update status. Creators can delete.
4. **Notifications**: Users can only mark as read.
5. **Users**: Super Admin handles all user management. Users can only see their own non-sensitive data (though in this app we often show all users for assignment).

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Attempt to create a log with someone else's `userId`.
2. **Action Forging**: Attempt to update a log's `action` to something else.
3. **Privilege Escalation**: Non-admin attempting to delete a product.
4. **Stock Injection**: Setting product quantity to a negative number or a massive value.
5. **Orphaned Request**: Creating a replenishment request for a product that doesn't exist.
6. **Bypassing Workflow**: Marking a task as COMPLETED without being in the assigned department.
7. **Resource Poisoning**: Document IDs with malicious characters.
8. **Shadow Update**: Adding an `isAdmin: true` field to a user profile.
9. **Timestamp Spoofing**: Setting `createdAt` to a future date instead of `request.time`.
10. **PII Leak**: A staff member reading private admin settings (if any).
11. **Bulk Deletion**: A regular user attempting to clear audit logs.
12. **Status Shortcutting**: Moving a task from PENDING to COMPLETED skipping IN_PROGRESS (if enforced).

## Test Cases
- `hotel_victoria_audit_logs`: Create must match `auth.uid`. Update/Delete: Denied.
- `hotel_victoria_products`: Update must be by Admin or through controlled increments.
- `hotel_victoria_users`: Only Super Admin can write.
