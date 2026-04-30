import { Hall, HallSetup, HallExecution, HallCommonError, HallSetupType, HallExecutionStatus } from '../types';
import { db, storage } from '../firebaseConfig';
import firebase from 'firebase/compat/app';

const KEYS = {
  HALLS: 'hotel_victoria_halls',
  SETUPS: 'hotel_victoria_hall_setups',
  EXECUTIONS: 'hotel_victoria_hall_executions',
};

const sanitizeData = (data: any) => {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  return sanitized;
};

export const subscribeToHalls = (callback: (data: Hall[]) => void) => {
  return db.collection(KEYS.HALLS).orderBy('name').onSnapshot(snapshot => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Hall)));
  });
};

export const saveHall = async (hall: Partial<Hall>) => {
  const docRef = hall.id ? db.collection(KEYS.HALLS).doc(hall.id) : db.collection(KEYS.HALLS).doc();
  const idValue = hall.id || docRef.id;
  await docRef.set(sanitizeData({ ...hall, id: idValue }), { merge: true });
  return idValue;
};

export const deleteHall = async (id: string) => {
  // Delete all setups for this hall
  const setupsQuery = db.collection(KEYS.SETUPS).where('hallId', '==', id);
  const setupsSnapshot = await setupsQuery.get();
  const batch = db.batch();
  setupsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  // Delete hall
  batch.delete(db.collection(KEYS.HALLS).doc(id));
  await batch.commit();
};

export const subscribeToHallSetups = (hallId: string, callback: (data: HallSetup[]) => void) => {
  return db.collection(KEYS.SETUPS).where('hallId', '==', hallId).onSnapshot(snapshot => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as HallSetup)));
  });
};

export const saveHallSetup = async (setup: Partial<HallSetup>) => {
  const docRef = setup.id ? db.collection(KEYS.SETUPS).doc(setup.id) : db.collection(KEYS.SETUPS).doc();
  const idValue = setup.id || docRef.id;
  await docRef.set(sanitizeData({ ...setup, id: idValue }), { merge: true });
  return idValue;
};

export const deleteHallSetup = async (id: string) => {
  await db.collection(KEYS.SETUPS).doc(id).delete();
};

export const subscribeToHallExecutions = (hallId: string, callback: (data: HallExecution[]) => void) => {
  return db.collection(KEYS.EXECUTIONS)
    .where('hallId', '==', hallId)
    .orderBy('completedAt', 'desc')
    .limit(20)
    .onSnapshot(snapshot => {
      callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as HallExecution)));
    });
};

export const submitHallExecution = async (execution: HallExecution) => {
  const docRef = db.collection(KEYS.EXECUTIONS).doc(execution.id || undefined);
  const idValue = execution.id || docRef.id;
  await docRef.set(sanitizeData({ ...execution, id: idValue, completedAt: Date.now() }));
  return idValue;
};

export const uploadHallMedia = async (file: File, folder: string = 'halls'): Promise<string> => {
  const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const snapshot = await storage.ref().child(path).put(file, { contentType: file.type || 'image/jpeg' });
  return await snapshot.ref.getDownloadURL();
};

export const seedInitialHalls = async () => {
  const hallsSnapshot = await db.collection(KEYS.HALLS).limit(1).get();
  if (!hallsSnapshot.empty) return;

  const victoriaHallId = 'hall-victoria';
  const data = {
    id: victoriaHallId,
    name: 'Salón Premium Victoria',
    description: 'Salón principal para banquetes y convenciones con vistas al jardín.',
    storageInfo: 'Material guardado en Almacén A (Pasillo lateral izquierdo).',
    rules: 'No arrastrar mesas (usar carros). Prohibido fumar. Limpieza de alfombra obligatoria al finalizar.',
    commonErrors: [
      { id: 'err1', title: 'Sillas Desalineadas', description: 'Las sillas deben estar a ras de mesa, no salidas.', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=400' },
      { id: 'err2', title: 'Mantelería Arrugada', description: 'Planchar o vaporizar si hay marcas de doblado visibles.', imageUrl: 'https://images.unsplash.com/photo-1544207612-23751e658572?auto=format&fit=crop&q=80&w=400' }
    ]
  };

  await db.collection(KEYS.HALLS).doc(victoriaHallId).set(data);

  const setupId = 'setup-banquete-1';
  const setupData = {
    id: setupId,
    hallId: victoriaHallId,
    setupType: HallSetupType.RESTAURANTE,
    finalImageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800',
    schemaUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=800',
    tablesCount: 12,
    chairsCount: 96,
    steps: [
      'Colocar mesas circulares según el esquema visual (3m de distancia).',
      'Distribuir 8 sillas por mesa, perfectamente centradas.',
      'Colocar muletón y mantel blanco (caída de 30cm).',
      'Montar cubertería básica y copas de agua/vino.',
      'Revisar que todos los centros de mesa estén alineados.'
    ],
    checklist: [
      'Mesas en posición correcta',
      'Sillas alineadas y limpias',
      'Mantelería sin manchas ni arrugas',
      'Cubertería completa y sin marcas',
      'Suelo aspirado y sin residuos'
    ]
  };

  await db.collection(KEYS.SETUPS).doc(setupId).set(setupData);
};
