/**
 * File: /src/services/serviceAssignment.service.ts
 * VirtualVR - Service assignment for delivery persons
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    Timestamp,
    type Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase.config';
import type { DeliveryRequest, RequestStatus } from '../models/DeliveryRequest.model';
import queueService from './queue.service';

const REQUESTS_COLLECTION = 'deliveryRequests';
const HISTORY_COLLECTION = 'assignmentHistory';

// Convertir Timestamp de Firestore a Date
const timestampToDate = (timestamp: unknown): Date | undefined => {
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
        return (timestamp as Timestamp).toDate();
    }
    return undefined;
};

// Convertir documento a DeliveryRequest
const convertDocToRequest = (doc: { id: string; data: () => Record<string, unknown> }): DeliveryRequest => {
    const data = doc.data();
    return {
        ...data,
        id: doc.id,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        acceptedAt: timestampToDate(data.acceptedAt),
        pickedUpAt: timestampToDate(data.pickedUpAt),
        inTransitAt: timestampToDate(data.inTransitAt),
        deliveredAt: timestampToDate(data.deliveredAt),
        completedAt: timestampToDate(data.completedAt),
        cancelledAt: timestampToDate(data.cancelledAt),
        rejectedAt: timestampToDate(data.rejectedAt),
        assignedAt: timestampToDate(data.assignedAt),
    } as DeliveryRequest;
};

export const serviceAssignmentService = {
    /**
     * Escuchar servicios asignados a un domiciliario en tiempo real
     */
    listenToAssignedServices(
        deliveryPersonId: string,
        callback: (requests: DeliveryRequest[]) => void
    ): Unsubscribe {
        console.log('🎧 Iniciando listener de servicios asignados para:', deliveryPersonId);

        const q = query(
            collection(db, REQUESTS_COLLECTION),
            where('deliveryPersonId', '==', deliveryPersonId),
            where('status', 'in', ['assigned', 'accepted', 'picked_up', 'in_transit'])
        );

        return onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => convertDocToRequest(doc));
            console.log('✅ Servicios asignados encontrados:', requests.length);
            callback(requests);
        }, (error) => {
            console.error('❌ Error en listener de servicios:', error);
            callback([]);
        });
    },

    /**
     * Obtener servicios asignados (sin listener)
     */
    async getAssignedServices(deliveryPersonId: string): Promise<DeliveryRequest[]> {
        console.log('📥 Obteniendo servicios asignados para:', deliveryPersonId);

        const q = query(
            collection(db, REQUESTS_COLLECTION),
            where('deliveryPersonId', '==', deliveryPersonId),
            where('status', 'in', ['assigned', 'accepted', 'picked_up', 'in_transit']),
            orderBy('assignedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => convertDocToRequest(doc));

        console.log('✅ Servicios encontrados:', requests.length);
        return requests;
    },

    /**
     * Aceptar un servicio asignado
     */
    async acceptService(requestId: string, deliveryPersonId: string): Promise<void> {
        console.log('🟢 Intentando aceptar servicio:', requestId);

        const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
        const document = await getDoc(requestRef);

        if (!document.exists()) {
            throw new Error('Servicio no encontrado');
        }

        const data = document.data();

        // Verificar que esté asignado a este domiciliario
        if (data.deliveryPersonId !== deliveryPersonId) {
            throw new Error('Este servicio no está asignado a ti');
        }

        // Verificar estado
        if (data.status !== 'assigned') {
            throw new Error('Este servicio no está disponible para aceptar');
        }

        // Actualizar a estado accepted
        await updateDoc(requestRef, {
            status: 'accepted',
            acceptedAt: Timestamp.now(),
        });

        // Registrar en historial
        await this.recordAssignmentHistory(requestId, deliveryPersonId, 'accepted');

        // ✅ IMPORTANTE: Eliminar de la cola al aceptar el servicio
        await queueService.deleteQueueEntry(deliveryPersonId);

        console.log('✅ Servicio aceptado exitosamente');
    },

    /**
     * Rechazar un servicio asignado
     */
    async rejectService(requestId: string, deliveryPersonId: string, reason?: string): Promise<void> {
        console.log('🔴 Intentando rechazar servicio:', requestId);

        const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
        const document = await getDoc(requestRef);

        if (!document.exists()) {
            throw new Error('Servicio no encontrado');
        }

        const data = document.data();

        // Verificar que esté asignado a este domiciliario
        if (data.deliveryPersonId !== deliveryPersonId) {
            throw new Error('Este servicio no está asignado a ti');
        }

        // Verificar estado
        if (data.status !== 'assigned') {
            throw new Error('Este servicio no está disponible para rechazar');
        }

        // Obtener lista de rechazos
        const rejectedBy = (data.rejectedBy as string[]) || [];
        rejectedBy.push(deliveryPersonId);

        // Actualizar estado a rejected y limpiar asignación
        await updateDoc(requestRef, {
            status: 'rejected',
            rejectedAt: Timestamp.now(),
            rejectedBy,
            rejectionCount: rejectedBy.length,
            deliveryPersonId: null,
            deliveryPersonName: null,
            deliveryPersonPhone: null,
        });

        // Registrar en historial
        await this.recordAssignmentHistory(requestId, deliveryPersonId, 'rejected', reason);

        // Devolver al domiciliario a la cola en estado waiting
        await this.returnToQueue(deliveryPersonId);

        console.log('✅ Servicio rechazado exitosamente');
    },

    /**
     * Actualizar estado del servicio
     */
    async updateServiceStatus(
        requestId: string,
        newStatus: RequestStatus,
        deliveryPersonId: string
    ): Promise<void> {
        console.log('🔄 Actualizando estado a:', newStatus);

        const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
        const document = await getDoc(requestRef);

        if (!document.exists()) {
            throw new Error('Servicio no encontrado');
        }

        const data = document.data();

        // Verificar permisos
        if (data.deliveryPersonId !== deliveryPersonId) {
            throw new Error('No tienes permiso para actualizar este servicio');
        }

        // Preparar datos de actualización
        const updateData: Record<string, unknown> = { status: newStatus };

        // Agregar timestamp según el estado
        switch (newStatus) {
            case 'picked_up':
                updateData.pickedUpAt = Timestamp.now();
                break;
            case 'in_transit':
                updateData.inTransitAt = Timestamp.now();
                break;
            case 'delivered':
                updateData.deliveredAt = Timestamp.now();
                break;
            case 'completed':
                updateData.completedAt = Timestamp.now();
                break;
            case 'cancelled':
                updateData.cancelledAt = Timestamp.now();
                break;
        }

        await updateDoc(requestRef, updateData);

        console.log('✅ Estado actualizado exitosamente');
    },

    /**
     * Registrar acción en historial
     */
    async recordAssignmentHistory(
        requestId: string,
        deliveryPersonId: string,
        action: string,
        reason?: string
    ): Promise<void> {
        const historyData: Record<string, unknown> = {
            deliveryRequestId: requestId,
            deliveryPersonId,
            action,
            timestamp: Timestamp.now(),
        };

        if (reason) {
            historyData.reason = reason;
        }

        await addDoc(collection(db, HISTORY_COLLECTION), historyData);
    },

    /**
     * Devolver domiciliario a la cola en estado waiting
     */
    async returnToQueue(deliveryPersonId: string): Promise<void> {
        const q = query(
            collection(db, 'delivery_queues'),
            where('delivery_person_id', '==', deliveryPersonId),
            where('status', '==', 'active')
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log('⚠️ No se encontró entrada de cola para devolver');
            return;
        }

        const queueDoc = snapshot.docs[0];
        await updateDoc(queueDoc.ref, {
            status: 'waiting',
            last_updated: Timestamp.now(),
        });

        console.log('✅ Domiciliario devuelto a la cola');
    },

    /**
     * Asignar servicio automáticamente al primer domiciliario en cola
     */
    async assignServiceToFirstInQueue(requestId: string): Promise<{ success: boolean; message: string; deliveryPersonName?: string }> {
        console.log('🔵 Asignando servicio automáticamente al primer domiciliario en cola...');

        const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
        const requestDoc = await getDoc(requestRef);

        if (!requestDoc.exists()) {
            return { success: false, message: 'Servicio no encontrado' };
        }

        const requestData = requestDoc.data();

        // Verificar que el servicio esté pendiente
        if (requestData.status !== 'pending') {
            return { success: false, message: 'Este servicio ya fue procesado' };
        }

        // Obtener el primer domiciliario en cola
        const queueQuery = query(
            collection(db, 'delivery_queues'),
            where('status', '==', 'waiting'),
            orderBy('position', 'asc'),
            limit(1)
        );

        const queueSnapshot = await getDocs(queueQuery);

        if (queueSnapshot.empty) {
            return { success: false, message: 'No hay domiciliarios disponibles en la cola' };
        }

        const firstInQueue = queueSnapshot.docs[0];
        const queueData = firstInQueue.data();

        // Asignar el servicio al domiciliario
        await updateDoc(requestRef, {
            status: 'assigned',
            deliveryPersonId: queueData.delivery_person_id,
            deliveryPersonName: queueData.delivery_person_name,
            deliveryPersonPhone: queueData.delivery_person_phone,
            assignedAt: Timestamp.now(),
        });

        // Actualizar estado de la cola a 'active'
        await updateDoc(firstInQueue.ref, {
            status: 'active',
            last_updated: Timestamp.now(),
        });

        // Registrar en historial
        await this.recordAssignmentHistory(
            requestId,
            queueData.delivery_person_id,
            'auto_assigned'
        );

        console.log('✅ Servicio asignado a:', queueData.delivery_person_name);

        return {
            success: true,
            message: `Servicio asignado a ${queueData.delivery_person_name}`,
            deliveryPersonName: queueData.delivery_person_name,
        };
    },
};

export default serviceAssignmentService;