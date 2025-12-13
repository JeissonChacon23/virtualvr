/**
 * File: /src/services/deliveryRequest.service.ts
 * VirtualVR - Delivery Request service
 */

import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    type Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase.config';
import type { DeliveryRequest, RequestStatus } from '../models/DeliveryRequest.model';

const COLLECTION_NAME = 'deliveryRequests';

// Convertir Date a Timestamp de Firestore
const dateToTimestamp = (date: Date) => Timestamp.fromDate(date);

// Convertir Timestamp de Firestore a Date
const timestampToDate = (timestamp: unknown): Date | undefined => {
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
        return (timestamp as Timestamp).toDate();
    }
    return undefined;
};

// Convertir documento de Firestore a DeliveryRequest
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
        paidAt: timestampToDate(data.paidAt),
        ratedAt: timestampToDate(data.ratedAt),
        lastLocationUpdate: timestampToDate(data.lastLocationUpdate),
    } as DeliveryRequest;
};

export const deliveryRequestService = {
    /**
     * Crear una nueva solicitud de domicilio
     */
    async createRequest(request: Record<string, unknown>): Promise<string> {
        console.log('🔵 Creando solicitud de domicilio...');

        // Filtrar campos undefined (Firestore no los acepta)
        const cleanRequest: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(request)) {
            if (value !== undefined) {
                if (value instanceof Date) {
                    cleanRequest[key] = dateToTimestamp(value);
                } else {
                    cleanRequest[key] = value;
                }
            }
        }

        const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanRequest);
        console.log('✅ Solicitud creada con ID:', docRef.id);

        return docRef.id;
    },

    /**
     * Obtener solicitudes de un usuario
     */
    async getUserRequests(userId: string): Promise<DeliveryRequest[]> {
        console.log('🔵 Obteniendo solicitudes del usuario:', userId);

        const q = query(
            collection(db, COLLECTION_NAME),
            where('clientId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => convertDocToRequest(doc));

        console.log('✅', requests.length, 'solicitudes encontradas');
        return requests;
    },

    /**
     * Obtener una solicitud por ID
     */
    async getRequest(id: string): Promise<DeliveryRequest | null> {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return convertDocToRequest(docSnap);
    },

    /**
     * Actualizar estado de una solicitud
     */
    async updateStatus(requestId: string, status: RequestStatus): Promise<void> {
        console.log('🔵 Actualizando estado de solicitud', requestId, 'a:', status);

        const updateData: Record<string, unknown> = { status };

        switch (status) {
            case 'accepted':
                updateData.acceptedAt = Timestamp.now();
                break;
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
            case 'rejected':
                updateData.rejectedAt = Timestamp.now();
                break;
        }

        await updateDoc(doc(db, COLLECTION_NAME, requestId), updateData);
        console.log('✅ Estado actualizado');
    },

    /**
     * Cancelar una solicitud
     */
    async cancelRequest(requestId: string, reason?: string): Promise<void> {
        const updateData: Record<string, unknown> = {
            status: 'cancelled',
            cancelledAt: Timestamp.now(),
        };

        if (reason) {
            updateData.cancellationReason = reason;
        }

        await updateDoc(doc(db, COLLECTION_NAME, requestId), updateData);
        console.log('✅ Solicitud cancelada');
    },

    /**
     * Escuchar solicitudes del usuario en tiempo real
     */
    listenToUserRequests(
        userId: string,
        callback: (requests: DeliveryRequest[]) => void
    ): Unsubscribe {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('clientId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => convertDocToRequest(doc));
            callback(requests);
        }, (error) => {
            console.error('❌ Error en listener de solicitudes:', error);
        });
    },

    /**
     * Escuchar una solicitud específica en tiempo real
     */
    listenToRequest(
        requestId: string,
        callback: (request: DeliveryRequest | null) => void
    ): Unsubscribe {
        const docRef = doc(db, COLLECTION_NAME, requestId);

        return onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(convertDocToRequest(snapshot));
            } else {
                callback(null);
            }
        }, (error) => {
            console.error('❌ Error en listener de solicitud:', error);
        });
    },

    /**
     * Calificar una entrega
     */
    async rateDelivery(requestId: string, rating: number, review?: string): Promise<void> {
        const updateData: Record<string, unknown> = {
            rating,
            ratedAt: Timestamp.now(),
        };

        if (review) {
            updateData.review = review;
        }

        await updateDoc(doc(db, COLLECTION_NAME, requestId), updateData);
        console.log('✅ Calificación guardada');
    },
};

export default deliveryRequestService;