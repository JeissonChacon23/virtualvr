/**
 * File: /src/models/DeliveryRequest.model.ts
 * VirtualVR - Delivery Request model
 */

// Estados de la solicitud
export type RequestStatus =
    | 'pending'      // Pendiente de asignación
    | 'assigned'     // Asignado a domiciliario
    | 'accepted'     // Aceptado por domiciliario
    | 'picked_up'    // Recogido
    | 'in_transit'   // En camino
    | 'delivered'    // Entregado
    | 'completed'    // Completado
    | 'cancelled'    // Cancelado
    | 'rejected';    // Rechazado

// Métodos de pago
export type PaymentMethod = 'cash' | 'transfer';

// Información de estado para UI
export const RequestStatusInfo: Record<RequestStatus, { label: string; color: string; icon: string }> = {
    pending: { label: 'Pendiente', color: '#FF9800', icon: 'clock' },
    assigned: { label: 'Asignado', color: '#2196F3', icon: 'user-check' },
    accepted: { label: 'Aceptado', color: '#2196F3', icon: 'check-circle' },
    picked_up: { label: 'Recogido', color: '#9C27B0', icon: 'package' },
    in_transit: { label: 'En Camino', color: '#00BCD4', icon: 'truck' },
    delivered: { label: 'Entregado', color: '#4CAF50', icon: 'check' },
    completed: { label: 'Completado', color: '#607D8B', icon: 'check-circle' },
    cancelled: { label: 'Cancelado', color: '#F44336', icon: 'x-circle' },
    rejected: { label: 'Rechazado', color: '#F44336', icon: 'x' },
};

// Información de método de pago para UI
export const PaymentMethodInfo: Record<PaymentMethod, { label: string; icon: string }> = {
    cash: { label: 'Efectivo', icon: 'banknote' },
    transfer: { label: 'Transferencia', icon: 'arrow-left-right' },
};

// Denominaciones de billetes colombianos
export const BILL_DENOMINATIONS = [10000, 20000, 50000, 100000];

// Información bancaria para transferencias
export const BANK_ACCOUNT_INFO = {
    bankName: 'Bancolombia',
    accountType: 'Cuenta de Ahorros',
    accountNumber: '91aborrar700010548',
    accountHolderName: 'Virtual VR S.A.S',
    accountHolderID: '901234567',
    accountHolderIDType: 'NIT',
};

// Interfaz principal
export interface DeliveryRequest {
    id?: string;

    // Cliente que solicita
    clientId: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;

    // Punto de Recogida (Punto A)
    pickupAddress: string;
    pickupNeighborhood: string;
    pickupLatitude: number;
    pickupLongitude: number;
    pickupPhone: string;
    pickupContactName: string;
    pickupNotes?: string;

    // Punto de Entrega (Punto B)
    deliveryAddress: string;
    deliveryNeighborhood: string;
    deliveryLatitude: number;
    deliveryLongitude: number;
    deliveryPhone: string;
    deliveryContactName: string;
    deliveryNotes?: string;

    // Detalles del Envío
    itemDescription: string;
    additionalNotes?: string;

    // Cálculos
    distance: number;
    estimatedCost: number;
    finalCost?: number;

    // Estado
    status: RequestStatus;

    // Domiciliario Asignado
    deliveryPersonId?: string;
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
    deliveryPersonPhotoURL?: string;

    // Metadata de Asignación
    assignedAt?: Date;
    assignedBy?: string;
    assignedByName?: string;
    queuePosition?: number;
    rejectedBy?: string[];
    rejectionCount?: number;

    // Ubicación en Tiempo Real del Domiciliario
    currentLatitude?: number;
    currentLongitude?: number;
    lastLocationUpdate?: Date;

    // Pago
    paymentMethod: PaymentMethod;
    isPaid: boolean;
    paidAt?: Date;
    cashBillAmount?: number;      // Monto del billete con el que pagará
    cashChangeAmount?: number;    // Vueltas que necesita el domiciliario

    // Timestamps
    createdAt: Date;
    acceptedAt?: Date;
    pickedUpAt?: Date;
    inTransitAt?: Date;
    deliveredAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    rejectedAt?: Date;

    // Calificación
    rating?: number;
    review?: string;
    ratedAt?: Date;

    // Tarifa Aplicada
    rateTableId?: string;
    isPreferentialRate: boolean;

    // Ciudad
    city: string;
}

// Función helper para crear una solicitud vacía
export const createEmptyDeliveryRequest = (): Partial<DeliveryRequest> => ({
    clientId: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    pickupAddress: '',
    pickupNeighborhood: '',
    pickupLatitude: 0,
    pickupLongitude: 0,
    pickupPhone: '',
    pickupContactName: '',
    deliveryAddress: '',
    deliveryNeighborhood: '',
    deliveryLatitude: 0,
    deliveryLongitude: 0,
    deliveryPhone: '',
    deliveryContactName: '',
    itemDescription: '',
    distance: 0,
    estimatedCost: 0,
    status: 'pending',
    paymentMethod: 'cash',
    isPaid: false,
    createdAt: new Date(),
    isPreferentialRate: false,
    city: 'Cúcuta',
});

// Función para formatear costo en COP
export const formatCostCOP = (cost: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cost);
};

// Función para formatear distancia
export const formatDistance = (distance: number): string => {
    return `${distance.toFixed(2)} km`;
};

// Función para calcular tiempo estimado (minutos)
export const calculateEstimatedTime = (distance: number): number => {
    // Aproximación: 3 minutos por km
    return Math.ceil(distance * 3);
};

// Función para formatear tiempo
export const formatTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} h ${remainingMinutes} min`;
};