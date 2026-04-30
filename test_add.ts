
import * as storageService from './src/services/storageService';

async function test() {
  try {
    console.log('Starting test add...');
    
    // Authenticate as anonymous first (like the app does)
    await storageService.ensureAnonymousAuth();
    console.log('Auth confirmed');

    const hallId = await storageService.saveEventHall({
      name: 'Restaurante',
      capacity: '100',
      setupGuides: []
    });
    
    console.log('Hall added successfully with ID:', hallId);
    process.exit(0);
  } catch (error) {
    console.error('Error in test add:', error);
    process.exit(1);
  }
}

test();
