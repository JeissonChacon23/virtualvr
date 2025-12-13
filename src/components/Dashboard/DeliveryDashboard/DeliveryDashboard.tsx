/**
 * File: /src/components/Dashboard/DeliveryDashboard/DeliveryDashboard.tsx
 * VirtualVR - Delivery person dashboard with queue system
 */

import { useState, useEffect } from 'react';
import {
    Package,
    Clock,
    MapPin,
    AlertCircle,
    CheckCircle,
    Truck,
    Hand,
    X,
    Users,
    Navigation,
    Phone,
    Check,
    XCircle,
    ChevronRight,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase.config';
import queueService from '../../../services/queue.service';
import serviceAssignmentService from '../../../services/serviceAssignment.service';
import type { DeliveryQueue, VehicleType } from '../../../models/DeliveryQueue.model';
import type { DeliveryRequest, RequestStatus } from '../../../models/DeliveryRequest.model';
import { formatTimeInQueue } from '../../../models/DeliveryQueue.model';
import { formatCostCOP, RequestStatusInfo } from '../../../models/DeliveryRequest.model';
import './DeliveryDashboard.css';

const DeliveryDashboard = () => {
    const { user } = useAuth();

    // Estados de cola
    const [currentQueue, setCurrentQueue] = useState<DeliveryQueue | null>(null);
    const [queueList, setQueueList] = useState<DeliveryQueue[]>([]);
    const [isInQueue, setIsInQueue] = useState(false);

    // Estados de servicios asignados
    const [assignedServices, setAssignedServices] = useState<DeliveryRequest[]>([]);

    // Estados de UI
    const [isLoading, setIsLoading] = useState(true);
    const [isJoiningQueue, setIsJoiningQueue] = useState(false);
    const [isLeavingQueue, setIsLeavingQueue] = useState(false);
    const [isProcessingService, setIsProcessingService] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Datos del domiciliario
    const [deliveryData, setDeliveryData] = useState<{
        vehicleType: VehicleType;
        vehiclePlate: string;
        phone: string;
    } | null>(null);

    // Cargar datos iniciales
    useEffect(() => {
        if (!user?.uid) return;

        const loadData = async () => {
            setIsLoading(true);
            console.log('📦 Cargando datos para usuario:', user.uid);

            try {
                // Obtener datos del domiciliario desde la colección 'deliveries'
                const userDoc = await getDoc(doc(db, 'deliveries', user.uid));
                console.log('📄 Documento encontrado:', userDoc.exists());

                if (userDoc.exists()) {
                    const data = userDoc.data();
                    console.log('📋 Datos del documento:', data);
                    console.log('🏍️ vehicleType:', data.vehicleType);
                    console.log('🔢 vehiclePlate:', data.vehiclePlate);
                    console.log('📞 phone:', data.phone);

                    setDeliveryData({
                        vehicleType: data.vehicleType || 'motorcycle',
                        vehiclePlate: data.vehiclePlate || '',
                        phone: data.phone || '',
                    });
                } else {
                    console.error('❌ No se encontró el documento del usuario');
                }

                // Cargar cola actual
                const queue = await queueService.getCurrentQueue(user.uid);
                console.log('🔄 Cola actual:', queue);
                setCurrentQueue(queue);
                setIsInQueue(!!queue);

                // Cargar lista de cola
                const list = await queueService.getQueueList();
                console.log('📋 Lista de cola:', list);
                setQueueList(list);

            } catch (err) {
                console.error('❌ Error loading data:', err);
                setError('Error al cargar datos');
            }
            setIsLoading(false);
        };

        loadData();
    }, [user?.uid]);

    // Listener de cola en tiempo real
    useEffect(() => {
        if (!user?.uid || !isInQueue) return;

        const unsubscribe = queueService.listenToQueue((queues) => {
            setQueueList(queues);
            // Actualizar posición del usuario actual
            const myQueue = queues.find(q => q.deliveryPersonId === user.uid);
            if (myQueue) {
                setCurrentQueue(myQueue);
            }
        });

        return () => unsubscribe();
    }, [user?.uid, isInQueue]);

    // Listener de servicios asignados
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = serviceAssignmentService.listenToAssignedServices(
            user.uid,
            (services) => {
                setAssignedServices(services.sort((a, b) => {
                    // Priorizar 'assigned' sobre otros estados
                    if (a.status === 'assigned' && b.status !== 'assigned') return -1;
                    if (a.status !== 'assigned' && b.status === 'assigned') return 1;
                    return 0;
                }));
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    // Tomar turno
    const handleJoinQueue = async () => {
        console.log('🟢 Intentando tomar turno...');
        console.log('👤 user?.uid:', user?.uid);
        console.log('📦 deliveryData:', deliveryData);

        if (!user?.uid || !deliveryData) {
            console.error('❌ No se puede tomar turno - falta uid o deliveryData');
            setError('No se pudieron cargar los datos del domiciliario');
            return;
        }

        setIsJoiningQueue(true);
        setError(null);

        try {
            console.log('📤 Llamando a queueService.joinQueue con:', {
                uid: user.uid,
                name: `${user.firstName} ${user.lastName}`,
                phone: deliveryData.phone,
                vehicleType: deliveryData.vehicleType,
                vehiclePlate: deliveryData.vehiclePlate,
            });

            const queue = await queueService.joinQueue(
                user.uid,
                `${user.firstName} ${user.lastName}`,
                deliveryData.phone,
                deliveryData.vehicleType,
                deliveryData.vehiclePlate
            );

            console.log('✅ Turno tomado:', queue);
            setCurrentQueue(queue);
            setIsInQueue(true);
            setSuccess('¡Has tomado tu turno exitosamente!');
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            console.error('❌ Error al tomar turno:', err);
            setError(err instanceof Error ? err.message : 'Error al tomar turno');
        }

        setIsJoiningQueue(false);
    };

    // Salir del turno
    const handleLeaveQueue = async () => {
        if (!currentQueue?.id) return;

        setIsLeavingQueue(true);
        setError(null);

        try {
            await queueService.leaveQueue(currentQueue.id);
            setCurrentQueue(null);
            setIsInQueue(false);
            setSuccess('Has salido del turno');
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al salir del turno');
        }

        setIsLeavingQueue(false);
    };

    // Aceptar servicio
    const handleAcceptService = async (request: DeliveryRequest) => {
        if (!user?.uid || !request.id) return;

        setIsProcessingService(true);
        setError(null);

        try {
            await serviceAssignmentService.acceptService(request.id, user.uid);
            setSuccess('¡Servicio aceptado! Dirígete al punto de recogida.');
            setCurrentQueue(null);
            setIsInQueue(false);
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al aceptar servicio');
        }

        setIsProcessingService(false);
    };

    // Rechazar servicio
    const handleRejectService = async (request: DeliveryRequest) => {
        if (!user?.uid || !request.id) return;

        setIsProcessingService(true);
        setError(null);

        try {
            await serviceAssignmentService.rejectService(request.id, user.uid);
            setSuccess('Servicio rechazado. Sigues en la cola.');
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al rechazar servicio');
        }

        setIsProcessingService(false);
    };

    // Actualizar estado del servicio
    const handleUpdateStatus = async (request: DeliveryRequest, newStatus: RequestStatus) => {
        if (!user?.uid || !request.id) return;

        setIsProcessingService(true);
        setError(null);

        try {
            await serviceAssignmentService.updateServiceStatus(request.id, newStatus, user.uid);

            const statusLabels: Record<string, string> = {
                picked_up: 'Paquete recogido',
                in_transit: 'En camino al destino',
                delivered: '¡Entrega completada!',
            };

            setSuccess(statusLabels[newStatus] || 'Estado actualizado');
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar estado');
        }

        setIsProcessingService(false);
    };

    // Recargar datos
    const handleRefresh = async () => {
        if (!user?.uid) return;

        setIsLoading(true);
        try {
            const queue = await queueService.getCurrentQueue(user.uid);
            setCurrentQueue(queue);
            setIsInQueue(!!queue);

            const list = await queueService.getQueueList();
            setQueueList(list);
        } catch (err) {
            console.error('Error refreshing:', err);
        }
        setIsLoading(false);
    };

    // If not approved, show pending message
    if (user && user.isApproved === false) {
        return (
            <div className="delivery-dashboard">
                <div className="pending-approval-container">
                    <div className="pending-approval-card">
                        <div className="pending-icon">
                            <Clock size={64} />
                        </div>
                        <h1 className="pending-title">Cuenta Pendiente de Aprobación</h1>
                        <p className="pending-message">
                            ¡Gracias por registrarte como domiciliario en Virtual VR!
                        </p>
                        <p className="pending-description">
                            Tu solicitud está siendo revisada por nuestro equipo.
                            Este proceso puede tomar entre 24 a 48 horas hábiles.
                        </p>
                        <div className="pending-steps">
                            <div className="pending-step completed">
                                <CheckCircle size={20} />
                                <span>Registro completado</span>
                            </div>
                            <div className="pending-step active">
                                <Clock size={20} />
                                <span>En revisión</span>
                            </div>
                            <div className="pending-step">
                                <Truck size={20} />
                                <span>Listo para trabajar</span>
                            </div>
                        </div>
                        <div className="pending-info">
                            <AlertCircle size={18} />
                            <span>Te notificaremos por correo cuando tu cuenta sea aprobada.</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Servicios pendientes de aceptar (status === 'assigned')
    const pendingServices = assignedServices.filter(s => s.status === 'assigned');

    // Servicios activos (accepted, picked_up, in_transit)
    const activeServices = assignedServices.filter(s =>
        ['accepted', 'picked_up', 'in_transit'].includes(s.status)
    );

    return (
        <div className="delivery-dashboard">
            <div className="dashboard-container">
                {/* Header */}
                <section className="delivery-header">
                    <div className="delivery-welcome">
                        <h1 className="welcome-title">
                            ¡Hola, {user?.firstName || 'Domiciliario'}! 🏍️
                        </h1>
                        <p className="welcome-subtitle">
                            {isInQueue
                                ? `Estás en la posición #${currentQueue?.position || '-'} de la cola`
                                : 'Toma tu turno para recibir pedidos'}
                        </p>
                    </div>
                    <button className="refresh-btn" onClick={handleRefresh} disabled={isLoading}>
                        <RefreshCw size={20} className={isLoading ? 'spinning' : ''} />
                    </button>
                </section>

                {/* Mensajes de éxito/error */}
                {error && (
                    <div className="alert alert-error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                        <button onClick={() => setError(null)}><X size={16} /></button>
                    </div>
                )}

                {success && (
                    <div className="alert alert-success">
                        <CheckCircle size={18} />
                        <span>{success}</span>
                    </div>
                )}

                {/* Servicios pendientes de aceptar */}
                {pendingServices.length > 0 && (
                    <section className="pending-services-section">
                        <h2 className="section-title-delivery">
                            <Package size={20} />
                            Nuevo Servicio Asignado
                        </h2>
                        {pendingServices.map(service => (
                            <div key={service.id} className="service-card pending">
                                <div className="service-header">
                                    <span className="service-badge assigned">Nuevo Servicio</span>
                                    <span className="service-cost">{formatCostCOP(service.estimatedCost)}</span>
                                </div>

                                <div className="service-route">
                                    <div className="route-point pickup">
                                        <MapPin size={16} />
                                        <div className="route-info">
                                            <span className="route-label">Recoger en</span>
                                            <span className="route-address">{service.pickupAddress}</span>
                                            <span className="route-neighborhood">{service.pickupNeighborhood}</span>
                                        </div>
                                    </div>
                                    <div className="route-line"></div>
                                    <div className="route-point delivery">
                                        <Navigation size={16} />
                                        <div className="route-info">
                                            <span className="route-label">Entregar en</span>
                                            <span className="route-address">{service.deliveryAddress}</span>
                                            <span className="route-neighborhood">{service.deliveryNeighborhood}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="service-details">
                                    <div className="detail-item">
                                        <Package size={14} />
                                        <span>{service.itemDescription}</span>
                                    </div>
                                    <div className="detail-item">
                                        <Phone size={14} />
                                        <span>{service.deliveryContactName} - {service.deliveryPhone}</span>
                                    </div>
                                </div>

                                <div className="service-actions">
                                    <button
                                        className="action-btn reject"
                                        onClick={() => handleRejectService(service)}
                                        disabled={isProcessingService}
                                    >
                                        <XCircle size={18} />
                                        <span>Rechazar</span>
                                    </button>
                                    <button
                                        className="action-btn accept"
                                        onClick={() => handleAcceptService(service)}
                                        disabled={isProcessingService}
                                    >
                                        {isProcessingService ? <Loader2 size={18} className="spinning" /> : <Check size={18} />}
                                        <span>Aceptar</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* Servicios activos */}
                {activeServices.length > 0 && (
                    <section className="active-services-section">
                        <h2 className="section-title-delivery">
                            <Truck size={20} />
                            Servicio Activo
                        </h2>
                        {activeServices.map(service => (
                            <div key={service.id} className="service-card active">
                                <div className="service-header">
                  <span className={`service-badge ${service.status}`}>
                    {RequestStatusInfo[service.status]?.label || service.status}
                  </span>
                                    <span className="service-cost">{formatCostCOP(service.estimatedCost)}</span>
                                </div>

                                <div className="service-route">
                                    <div className={`route-point pickup ${service.status === 'accepted' ? 'active' : 'completed'}`}>
                                        <MapPin size={16} />
                                        <div className="route-info">
                                            <span className="route-label">Recoger en</span>
                                            <span className="route-address">{service.pickupAddress}</span>
                                        </div>
                                    </div>
                                    <div className="route-line"></div>
                                    <div className={`route-point delivery ${['in_transit', 'delivered'].includes(service.status) ? 'active' : ''}`}>
                                        <Navigation size={16} />
                                        <div className="route-info">
                                            <span className="route-label">Entregar en</span>
                                            <span className="route-address">{service.deliveryAddress}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="service-contact">
                                    <Phone size={16} />
                                    <span>{service.deliveryContactName}</span>
                                    <a href={`tel:${service.deliveryPhone}`} className="call-btn">
                                        Llamar
                                    </a>
                                </div>

                                {/* Botones de estado */}
                                <div className="status-actions">
                                    {service.status === 'accepted' && (
                                        <button
                                            className="status-btn"
                                            onClick={() => handleUpdateStatus(service, 'picked_up')}
                                            disabled={isProcessingService}
                                        >
                                            <Package size={18} />
                                            <span>Marcar como Recogido</span>
                                            <ChevronRight size={18} />
                                        </button>
                                    )}
                                    {service.status === 'picked_up' && (
                                        <button
                                            className="status-btn"
                                            onClick={() => handleUpdateStatus(service, 'in_transit')}
                                            disabled={isProcessingService}
                                        >
                                            <Truck size={18} />
                                            <span>En Camino</span>
                                            <ChevronRight size={18} />
                                        </button>
                                    )}
                                    {service.status === 'in_transit' && (
                                        <button
                                            className="status-btn success"
                                            onClick={() => handleUpdateStatus(service, 'delivered')}
                                            disabled={isProcessingService}
                                        >
                                            <Check size={18} />
                                            <span>Marcar como Entregado</span>
                                            <ChevronRight size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* Sistema de Cola */}
                {!activeServices.length && !pendingServices.length && (
                    <>
                        {/* Estado actual */}
                        <section className="queue-status-section">
                            <div className={`queue-status-card ${isInQueue ? 'in-queue' : 'not-in-queue'}`}>
                                <div className="queue-status-icon">
                                    {isInQueue ? <CheckCircle size={48} /> : <Hand size={48} />}
                                </div>
                                <h2>{isInQueue ? 'En Turno' : 'Sin Turno'}</h2>
                                <p>
                                    {isInQueue
                                        ? 'Estás en la fila del paradero'
                                        : 'Toma tu turno para recibir pedidos'}
                                </p>
                            </div>
                        </section>

                        {/* Botón tomar/salir turno */}
                        {!isInQueue ? (
                            <button
                                className="queue-action-btn join"
                                onClick={handleJoinQueue}
                                disabled={isJoiningQueue}
                            >
                                {isJoiningQueue ? (
                                    <Loader2 size={20} className="spinning" />
                                ) : (
                                    <Hand size={20} />
                                )}
                                <span>{isJoiningQueue ? 'Tomando turno...' : 'Tomar Turno'}</span>
                            </button>
                        ) : (
                            <>
                                {/* Mi posición */}
                                <section className="my-position-section">
                                    <h3 className="section-subtitle">
                                        <span className="position-icon">#</span>
                                        Tu Turno Asignado
                                    </h3>
                                    <div className="position-card">
                                        <div className="position-main">
                                            <span className="position-label">Posición</span>
                                            <span className="position-number">#{currentQueue?.position || '-'}</span>
                                        </div>
                                        <div className="position-divider"></div>
                                        <div className="position-info">
                                            <span className="position-label">Domiciliarios adelante</span>
                                            <span className="position-value">{Math.max(0, (currentQueue?.position || 1) - 1)}</span>
                                        </div>
                                        <div className="position-status">
                                            <span className="status-dot"></span>
                                            <span>{currentQueue?.position === 1 ? 'Eres el siguiente' : 'Esperando tu turno'}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Lista de la cola */}
                                <section className="queue-list-section">
                                    <div className="section-header-delivery">
                                        <h3 className="section-subtitle">
                                            <Users size={18} />
                                            Domiciliarios en el Paradero
                                        </h3>
                                        <span className="queue-count">{queueList.length}</span>
                                    </div>

                                    {queueList.length === 0 ? (
                                        <div className="queue-empty">
                                            <Truck size={40} />
                                            <p>Eres el único en el paradero</p>
                                        </div>
                                    ) : (
                                        <div className="queue-list">
                                            {queueList.map(queue => (
                                                <div
                                                    key={queue.id}
                                                    className={`queue-item ${queue.deliveryPersonId === user?.uid ? 'is-me' : ''}`}
                                                >
                                                    <div className="queue-position">
                                                        {queue.position}
                                                    </div>
                                                    <div className="queue-info">
                            <span className="queue-name">
                              {queue.deliveryPersonName}
                                {queue.deliveryPersonId === user?.uid && (
                                    <span className="you-badge">(Tú)</span>
                                )}
                            </span>
                                                        <span className="queue-vehicle">
                              {queue.vehicleType === 'motorcycle' ? '🏍️' : queue.vehicleType === 'bicycle' ? '🚲' : '🚗'}
                                                            {' '}{queue.vehiclePlate}
                            </span>
                                                    </div>
                                                    <div className="queue-time">
                                                        <span>{formatTimeInQueue(queue.joinedAt)}</span>
                                                        <span className="time-label">en turno</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                {/* Botón salir */}
                                <button
                                    className="queue-action-btn leave"
                                    onClick={handleLeaveQueue}
                                    disabled={isLeavingQueue}
                                >
                                    {isLeavingQueue ? (
                                        <Loader2 size={20} className="spinning" />
                                    ) : (
                                        <X size={20} />
                                    )}
                                    <span>{isLeavingQueue ? 'Saliendo...' : 'Salir del Turno'}</span>
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DeliveryDashboard;