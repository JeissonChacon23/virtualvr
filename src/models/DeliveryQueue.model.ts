/**
 * File: /src/models/DeliveryQueue.model.ts
 * VirtualVR - Delivery Queue model for queue/stand system
 */

import type { VehicleType } from './User.model';

// Estados de la cola
export type QueueStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

// Re-exportar VehicleType para uso externo
export type { VehicleType };

// Información de estado para UI
export const QueueStatusInfo: Record<QueueStatus, { label: string; color: string }> = {
    waiting: { label: 'Esperando turno', color: '#FF9800' },
    active: { label: 'En servicio', color: '#2196F3' },
    completed: { label: 'Completado', color: '#4CAF50' },
    cancelled: { label: 'Cancelado', color: '#9E9E9E' },
};

// Información de vehículo para UI
export const VehicleTypeInfo: Record<VehicleType, { label: string; icon: string }> = {
    motorcycle: { label: 'Moto', icon: 'bike' },
    bicycle: { label: 'Bicicleta', icon: 'bicycle' },
    car: { label: 'Carro', icon: 'car' },
    scooter: { label: 'Scooter', icon: 'bike' },
};

// Interfaz principal de la cola
export interface DeliveryQueue {
    id?: string;
    deliveryPersonId: string;
    deliveryPersonName: string;
    deliveryPersonPhone: string;
    position: number;
    joinedAt: Date;
    lastUpdated: Date;
    status: QueueStatus;
    vehicleType: VehicleType;
    vehiclePlate: string;
}

// Función helper para crear una entrada de cola
export const createQueueEntry = (
    deliveryPersonId: string,
    deliveryPersonName: string,
    deliveryPersonPhone: string,
    position: number,
    vehicleType: VehicleType,
    vehiclePlate: string
): Omit<DeliveryQueue, 'id'> => ({
    deliveryPersonId,
    deliveryPersonName,
    deliveryPersonPhone,
    position,
    joinedAt: new Date(),
    lastUpdated: new Date(),
    status: 'waiting',
    vehicleType,
    vehiclePlate,
});

// Función para formatear tiempo en cola
export const formatTimeInQueue = (joinedAt: Date): string => {
    const minutes = Math.floor((Date.now() - joinedAt.getTime()) / 60000);
    if (minutes < 1) return 'Ahora';
    if (minutes === 1) return '1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
};