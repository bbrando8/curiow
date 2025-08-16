// Script per controllare e correggere la struttura dei canali esistenti
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const debugChannels = async () => {
  try {
    console.log('=== DEBUG CANALI ===');

    const channelsCollection = collection(db, 'channels');
    const channelsSnapshot = await getDocs(channelsCollection);

    console.log(`Trovati ${channelsSnapshot.docs.length} canali nel database:`);

    channelsSnapshot.docs.forEach((channelDoc, index) => {
      const data = channelDoc.data();
      console.log(`\nCanale ${index + 1} (ID: ${channelDoc.id}):`);
      console.log('- Dati:', JSON.stringify(data, null, 2));
      console.log('- Ha isActive?', 'isActive' in data);
      console.log('- Ha createdAt?', 'createdAt' in data);
      console.log('- Ha name?', 'name' in data);
      console.log('- Ha description?', 'description' in data);
    });

  } catch (error) {
    console.error('Errore nel debug canali:', error);
  }
};

export const migrateChannels = async () => {
  try {
    console.log('=== MIGRAZIONE CANALI ===');

    const channelsCollection = collection(db, 'channels');
    const channelsSnapshot = await getDocs(channelsCollection);

    let updatedCount = 0;

    for (const channelDoc of channelsSnapshot.docs) {
      const data = channelDoc.data();
      const channelId = channelDoc.id;
      let needsUpdate = false;
      const updates: any = {};

      // Aggiungi isActive se mancante (default: true)
      if (!('isActive' in data)) {
        updates.isActive = true;
        needsUpdate = true;
        console.log(`Aggiungendo isActive: true al canale ${channelId}`);
      }

      // Aggiungi createdAt se mancante (default: now)
      if (!('createdAt' in data)) {
        updates.createdAt = new Date();
        needsUpdate = true;
        console.log(`Aggiungendo createdAt al canale ${channelId}`);
      }

      // Aggiungi description se mancante (default: stringa vuota)
      if (!('description' in data)) {
        updates.description = '';
        needsUpdate = true;
        console.log(`Aggiungendo description vuota al canale ${channelId}`);
      }

      // Aggiorna il documento se necessario
      if (needsUpdate) {
        await updateDoc(doc(db, 'channels', channelId), updates);
        updatedCount++;
        console.log(`✅ Aggiornato canale: ${data.name || channelId}`);
      } else {
        console.log(`✅ Canale già corretto: ${data.name || channelId}`);
      }
    }

    console.log(`\n🎉 Migrazione completata! Aggiornati ${updatedCount} canali.`);
    return updatedCount;

  } catch (error) {
    console.error('Errore nella migrazione canali:', error);
    throw error;
  }
};

// Rendi le funzioni disponibili globalmente
(window as any).debugChannels = debugChannels;
(window as any).migrateChannels = migrateChannels;
