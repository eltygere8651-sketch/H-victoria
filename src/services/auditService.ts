import { db, auth } from '../firebaseConfig';
import { AuditLog, AuditAction, User } from '../types';
import { sanitizeData } from './storageService';

const AUDIT_LOGS_COLLECTION = 'hotel_victoria_audit_logs';

export const logAction = async (
  action: AuditAction,
  details: string,
  user: User | { id: string; name: string },
  metadata?: any
) => {
  try {
    const log: Omit<AuditLog, 'id'> = sanitizeData({
      action,
      details,
      userName: user.name,
      userId: user.id,
      timestamp: Date.now(),
      metadata: metadata || {}
    });
    await db.collection(AUDIT_LOGS_COLLECTION).add(log);
  } catch (error) {
    console.error('Error recording audit log:', error);
  }
};

export const subscribeToAuditLogs = (callback: (logs: AuditLog[]) => void) => {
  return db.collection(AUDIT_LOGS_COLLECTION)
    .orderBy('timestamp', 'desc')
    .limit(500)
    .onSnapshot(snapshot => {
      callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AuditLog)));
    }, error => {
      console.error('Firestore Error in get at hotel_victoria_audit_logs:', error);
    });
};

export const clearAuditLogs = async (adminId: string, adminName: string) => {
  try {
    const snapshot = await db.collection(AUDIT_LOGS_COLLECTION).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Log the clear action itself
    const clearLog: Omit<AuditLog, 'id'> = {
      action: AuditAction.LOGS_CLEARED,
      details: 'Historial de auditoría vaciado por el Super Admin',
      userName: adminName,
      userId: adminId,
      timestamp: Date.now()
    };
    const newLogRef = db.collection(AUDIT_LOGS_COLLECTION).doc();
    batch.set(newLogRef, clearLog);
    
    await batch.commit();
  } catch (error) {
    console.error('Error clearing audit logs:', error);
    throw error;
  }
};
