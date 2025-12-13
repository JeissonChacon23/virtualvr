/**
 * File: /src/services/queue.service.ts
 * VirtualVR - Queue service for delivery stand system
 */

import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    Timestamp,
    writeBatch,
    type Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase.config';
import type { DeliveryQueue, QueueStatus, VehicleType } from '../models/DeliveryQueue.model';
import { createQueueEntry } from '../models/DeliveryQueue.model';

const COLLECTION_NAME = 'delivery_queues';

// Convertir Timestamp de Firestore a Date
const timestampToDate = (timestamp: unknown): Date => {
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
        return (timestamp as Timestamp).toDate();
    }
    return new Date();
};

// Convertir documento de Firestore a DeliveryQueue
const convertDocToQueue = (doc: { id: string; data: () => Record<string, unknown> }): DeliveryQueue => {
    const data = doc.data();
    return {
        id: doc.id,
        deliveryPersonId: data.delivery_person_id as string,
        deliveryPersonName: data.delivery_person_name as string,
        deliveryPersonPhone: data.delivery_person_phone as string,
        position: data.position as number,
        joinedAt: timestampToDate(data.joined_at),
        lastUpdated: timestampToDate(data.last_updated),
        status: data.status as QueueStatus,
        vehicleType: data.vehicle_type as VehicleType,
        vehiclePlate: data.vehicle_plate as string,
    };
};

// Convertir DeliveryQueue a formato Firestore
const queueToFirestore = (queue: Omit<DeliveryQueue, 'id'>) => ({
    delivery_person_id: queue.deliveryPersonId,
    delivery_person_name: queue.deliveryPersonName,
    delivery_person_phone: queue.deliveryPersonPhone,
    position: queue.position,
    joined_at: Timestamp.fromDate(queue.joinedAt),
    last_updated: Timestamp.fromDate(queue.lastUpdated),
    status: queue.status,
    vehicle_type: queue.vehicleType,
    vehicle_plate: queue.vehiclePlate,
});

export const queueService = {
    /**
     * RF15: Tomar turno en la cola
     */
    async joinQueue(
        deliveryPersonId: string,
        deliveryPersonName: string,
        deliveryPersonPhone: string,
        vehicleType: VehicleType,
        vehiclePlate: string
    ): Promise<DeliveryQueue> {
        console.log('🔵 [QueueService] Tomando turno en la cola...');
        console.log('🔵 [QueueService] Params:', {
            deliveryPersonId,
            deliveryPersonName,
            deliveryPersonPhone,
            vehicleType,
            vehiclePlate
        });

        // Verificar si ya está en cola
        console.log('🔵 [QueueService] Verificando si ya está en cola...');
        const existingQuery = query(
            collection(db, COLLECTION_NAME),
            where('delivery_person_id', '==', deliveryPersonId),
            where('status', 'in', ['waiting', 'active'])
        );
        const existingSnapshot = await getDocs(existingQuery);
        console.log('🔵 [QueueService] Documentos existentes:', existingSnapshot.size);

        if (!existingSnapshot.empty) {
            console.log('❌ [QueueService] Ya está en la fila activa');
            throw new Error('Ya estás en la fila activa');
        }

        // Obtener siguiente posición
        console.log('🔵 [QueueService] Obteniendo siguiente posición...');
        const nextPosition = await this.getNextPosition();
        console.log('🔵 [QueueService] Siguiente posición:', nextPosition);

        // Crear entrada de cola
        const queueEntry = createQueueEntry(
            deliveryPersonId,
            deliveryPersonName,
            deliveryPersonPhone,
            nextPosition,
            vehicleType,
            vehiclePlate
        );
        console.log('🔵 [QueueService] Entrada de cola creada:', queueEntry);

        // Guardar en Firestore
        console.log('🔵 [QueueService] Guardando en Firestore...');
        const firestoreData = queueToFirestore(queueEntry);
        console.log('🔵 [QueueService] Datos para Firestore:', firestoreData);

        const docRef = await addDoc(collection(db, COLLECTION_NAME), firestoreData);
        console.log('✅ [QueueService] Documento creado con ID:', docRef.id);

        console.log('✅ Turno tomado exitosamente. Posición:', nextPosition);

        return {
            ...queueEntry,
            id: docRef.id,
        };
    },

    /**
     * Salir de la cola
     */
    async leaveQueue(queueId: string): Promise<void> {
        console.log('🔵 Saliendo de la cola...');

        const queueRef = doc(db, COLLECTION_NAME, queueId);
        const snapshot = await getDoc(queueRef);

        if (!snapshot.exists()) {
            throw new Error('No se encontró el turno');
        }

        const queueData = convertDocToQueue(snapshot);

        // Actualizar estado a cancelado
        await updateDoc(queueRef, {
            status: 'cancelled',
            last_updated: Timestamp.now(),
        });

        // Reordenar posiciones
        await this.reorderQueuePositions(queueData.position);

        // Eliminar después de un momento
        setTimeout(async () => {
            try {
                await deleteDoc(queueRef);
            } catch (error) {
                console.error('Error eliminando entrada de cola:', error);
            }
        }, 5000);

        console.log('✅ Saliste del turno');
    },

    /**
     * RF16: Obtener cola actual del domiciliario
     */
    async getCurrentQueue(deliveryPersonId: string): Promise<DeliveryQueue | null> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('delivery_person_id', '==', deliveryPersonId),
            where('status', 'in', ['waiting', 'active']),
            orderBy('joined_at', 'desc'),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        return convertDocToQueue(snapshot.docs[0]);
    },

    /**
     * RF17: Obtener lista de la cola ordenada por posición
     */
    async getQueueList(): Promise<DeliveryQueue[]> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('status', '==', 'waiting'),
            orderBy('position', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => convertDocToQueue(doc));
    },

    /**
     * Escuchar cambios en la cola en tiempo real
     */
    listenToQueue(callback: (queues: DeliveryQueue[]) => void): Unsubscribe {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('status', '==', 'waiting'),
            orderBy('position', 'asc')
        );

        return onSnapshot(q, (snapshot) => {
            const queues = snapshot.docs.map(doc => convertDocToQueue(doc));
            callback(queues);
        }, (error) => {
            console.error('❌ Error en listener de cola:', error);
        });
    },

    /**
     * Obtener siguiente en la cola (para asignación automática)
     */
    async getNextInQueue(): Promise<DeliveryQueue | null> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('status', '==', 'waiting'),
            orderBy('position', 'asc'),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        return convertDocToQueue(snapshot.docs[0]);
    },

    /**
     * Actualizar estado de la cola
     */
    async updateQueueStatus(queueId: string, status: QueueStatus): Promise<void> {
        await updateDoc(doc(db, COLLECTION_NAME, queueId), {
            status,
            last_updated: Timestamp.now(),
        });

        // Si completó, reordenar cola
        if (status === 'completed') {
            const snapshot = await getDoc(doc(db, COLLECTION_NAME, queueId));
            if (snapshot.exists()) {
                const queueData = convertDocToQueue(snapshot);
                await this.reorderQueuePositions(queueData.position);
            }
        }
    },

    /**
     * Eliminar entrada de cola (cuando acepta servicio)
     */
    async deleteQueueEntry(deliveryPersonId: string): Promise<void> {
        console.log('🔵 Eliminando entrada de cola para:', deliveryPersonId);

        const q = query(
            collection(db, COLLECTION_NAME),
            where('delivery_person_id', '==', deliveryPersonId),
            where('status', 'in', ['waiting', 'active']),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log('⚠️ No se encontró entrada de cola activa');
            return;
        }

        const queueDoc = snapshot.docs[0];
        const queueData = convertDocToQueue(queueDoc);
        const position = queueData.position;

        // Eliminar el documento
        await deleteDoc(queueDoc.ref);

        // Reordenar posiciones de los demás
        if (position > 0) {
            await this.reorderQueuePositions(position);
        }

        console.log('✅ Entrada de cola eliminada - domiciliario puede tomar turno de nuevo');
    },

    /**
     * Obtener siguiente posición disponible
     */
    async getNextPosition(): Promise<number> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('status', '==', 'waiting'),
            orderBy('position', 'desc'),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return 1;
        }

        const lastQueue = convertDocToQueue(snapshot.docs[0]);
        return lastQueue.position + 1;
    },

    /**
     * Reordenar posiciones después de que alguien sale (FIFO)
     */
    async reorderQueuePositions(afterPosition: number): Promise<void> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('status', '==', 'waiting'),
            where('position', '>', afterPosition)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        const batch = writeBatch(db);

        snapshot.docs.forEach((docSnapshot) => {
            const currentPosition = docSnapshot.data().position as number;
            batch.update(docSnapshot.ref, {
                position: currentPosition - 1,
                last_updated: Timestamp.now(),
            });
        });

        await batch.commit();
        console.log('✅ Posiciones de cola reordenadas');
    },
};

export default queueService;