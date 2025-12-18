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
    RefreshCw,
    Calendar,
    DollarSign,
    Filter,
    Route,
    TrendingUp,
    Banknote,
    ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase.config';
import queueService from '../../../services/queue.service';
import serviceAssignmentService from '../../../services/serviceAssignment.service';
import type { DeliveryQueue, VehicleType } from '../../../models/DeliveryQueue.model';
import type { DeliveryRequest, RequestStatus } from '../../../models/DeliveryRequest.model';
import { formatTimeInQueue } from '../../../models/DeliveryQueue.model';
import { formatCostCOP, RequestStatusInfo, formatDistance } from '../../../models/DeliveryRequest.model';
import './DeliveryDashboard.css';

type ViewType = 'inicio' | 'entregas' | 'ganancias';
type DeliveryFilterType = 'all' | 'completed' | 'cancelled';
type EarningsPeriodType = 'today' | 'week' | 'month' | 'all';

const DeliveryDashboard = () => {
    const { user } = useAuth();

    // Vista actual
    const [currentView, setCurrentView] = useState<ViewType>('inicio');

    // Estados de cola
    const [currentQueue, setCurrentQueue] = useState<DeliveryQueue | null>(null);
    const [queueList, setQueueList] = useState<DeliveryQueue[]>([]);
    const [isInQueue, setIsInQueue] = useState(false);

    // Estados de servicios asignados
    const [assignedServices, setAssignedServices] = useState<DeliveryRequest[]>([]);

    // Historial de entregas
    const [deliveryHistory, setDeliveryHistory] = useState<DeliveryRequest[]>([]);
    const [historyFilter, setHistoryFilter] = useState<DeliveryFilterType>('all');
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Estado para filtro de ganancias
    const [earningsPeriod, setEarningsPeriod] = useState<EarningsPeriodType>('month');

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

    // Escuchar eventos de navegación desde Navbar
    useEffect(() => {
        const handleNavigation = (e: CustomEvent) => {
            const view = e.detail.view;
            if (view === 'Inicio') setCurrentView('inicio');
            else if (view === 'Mis Entregas') setCurrentView('entregas');
            else if (view === 'Ganancias') setCurrentView('ganancias');
            // Mi Perfil se maneja desde la Navbar directamente
        };

        window.addEventListener('user-navigate', handleNavigation as EventListener);
        return () => {
            window.removeEventListener('user-navigate', handleNavigation as EventListener);
        };
    }, []);

    // Cargar datos iniciales
    useEffect(() => {
        if (!user?.uid) return;

        const loadData = async () => {
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

    // Listener del historial de entregas (completadas, entregadas, canceladas y rechazadas)
    useEffect(() => {
        if (!user?.uid) {
            return;
        }

        console.log('📜 Cargando historial para domiciliario:', user.uid);

        // Query simplificada - solo filtramos por deliveryPersonId
        // y luego filtramos los estados en el cliente
        const q = query(
            collection(db, 'deliveryRequests'),
            where('deliveryPersonId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('📦 Documentos encontrados:', snapshot.docs.length);

            const allRequests = snapshot.docs.map(doc => {
                const data = doc.data();
                console.log('📄 Doc:', doc.id, 'Status:', data.status);
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    assignedAt: data.assignedAt?.toDate(),
                    acceptedAt: data.acceptedAt?.toDate(),
                    deliveredAt: data.deliveredAt?.toDate(),
                    completedAt: data.completedAt?.toDate(),
                    cancelledAt: data.cancelledAt?.toDate(),
                } as DeliveryRequest;
            });

            // Filtrar solo los estados que son "historial" (no activos)
            const historyStatuses = ['completed', 'delivered', 'cancelled', 'rejected'];
            const history = allRequests
                .filter(r => historyStatuses.includes(r.status))
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            console.log('📜 Historial filtrado:', history.length, 'entregas');

            setDeliveryHistory(history);
            setIsLoadingHistory(false);
        }, (error) => {
            console.error('❌ Error loading delivery history:', error);
            setIsLoadingHistory(false);
        });

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

    // Filtrar historial
    const filteredHistory = deliveryHistory.filter(d => {
        if (historyFilter === 'all') return true;
        if (historyFilter === 'completed') return d.status === 'completed' || d.status === 'delivered';
        if (historyFilter === 'cancelled') return d.status === 'cancelled' || d.status === 'rejected';
        return true;
    });

    // Calcular estadísticas del historial
    const historyStats = {
        total: deliveryHistory.length,
        completed: deliveryHistory.filter(d => d.status === 'completed' || d.status === 'delivered').length,
        cancelled: deliveryHistory.filter(d => d.status === 'cancelled' || d.status === 'rejected').length,
        totalEarnings: deliveryHistory
            .filter(d => d.status === 'completed' || d.status === 'delivered')
            .reduce((sum, d) => sum + (d.estimatedCost || 0), 0)
    };

    // Formatear fecha
    const formatDate = (date: Date | undefined): string => {
        if (!date) return 'Sin fecha';
        return date.toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Vista de Mis Entregas
    const renderDeliveriesView = () => (
        <>
            {/* Header de entregas */}
            <section className="delivery-header">
                <div className="delivery-welcome">
                    <h1 className="welcome-title">Mis Entregas 📦</h1>
                    <p className="welcome-subtitle">Historial de todas tus entregas</p>
                </div>
            </section>

            {/* Estadísticas */}
            <section className="history-stats">
                <div className="stat-card">
                    <Package size={24} />
                    <div className="stat-info">
                        <span className="stat-value">{historyStats.total}</span>
                        <span className="stat-label">Total</span>
                    </div>
                </div>
                <div className="stat-card completed">
                    <CheckCircle size={24} />
                    <div className="stat-info">
                        <span className="stat-value">{historyStats.completed}</span>
                        <span className="stat-label">Completadas</span>
                    </div>
                </div>
                <div className="stat-card cancelled">
                    <XCircle size={24} />
                    <div className="stat-info">
                        <span className="stat-value">{historyStats.cancelled}</span>
                        <span className="stat-label">Canceladas</span>
                    </div>
                </div>
                <div className="stat-card earnings">
                    <DollarSign size={24} />
                    <div className="stat-info">
                        <span className="stat-value">{formatCostCOP(historyStats.totalEarnings)}</span>
                        <span className="stat-label">Ganancias</span>
                    </div>
                </div>
            </section>

            {/* Filtros */}
            <section className="history-filters">
                <button
                    className={`filter-btn ${historyFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setHistoryFilter('all')}
                >
                    <Filter size={16} />
                    Todas ({historyStats.total})
                </button>
                <button
                    className={`filter-btn ${historyFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => setHistoryFilter('completed')}
                >
                    <CheckCircle size={16} />
                    Completadas ({historyStats.completed})
                </button>
                <button
                    className={`filter-btn ${historyFilter === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setHistoryFilter('cancelled')}
                >
                    <XCircle size={16} />
                    Canceladas ({historyStats.cancelled})
                </button>
            </section>

            {/* Lista de entregas */}
            <section className="history-list">
                {isLoadingHistory ? (
                    <div className="history-loading">
                        <Loader2 size={32} className="spinning" />
                        <span>Cargando historial...</span>
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="history-empty">
                        <Package size={48} />
                        <h3>Sin entregas</h3>
                        <p>
                            {historyFilter === 'all'
                                ? 'Aún no has realizado ninguna entrega'
                                : historyFilter === 'completed'
                                    ? 'No tienes entregas completadas'
                                    : 'No tienes entregas canceladas'}
                        </p>
                    </div>
                ) : (
                    filteredHistory.map(delivery => (
                        <div key={delivery.id} className={`history-card ${delivery.status === 'rejected' ? 'cancelled' : delivery.status}`}>
                            <div className="history-card-header">
                <span className={`history-badge ${delivery.status === 'rejected' ? 'cancelled' : delivery.status}`}>
                  {delivery.status === 'completed' || delivery.status === 'delivered' ? (
                      <><CheckCircle size={14} /> Completada</>
                  ) : delivery.status === 'rejected' ? (
                      <><XCircle size={14} /> Rechazada</>
                  ) : (
                      <><XCircle size={14} /> Cancelada</>
                  )}
                </span>
                                <span className="history-cost">{formatCostCOP(delivery.estimatedCost)}</span>
                            </div>

                            <div className="history-route">
                                <div className="history-point">
                                    <MapPin size={14} />
                                    <span>{delivery.pickupNeighborhood}</span>
                                </div>
                                <ChevronRight size={14} className="history-arrow" />
                                <div className="history-point">
                                    <Navigation size={14} />
                                    <span>{delivery.deliveryNeighborhood}</span>
                                </div>
                            </div>

                            <div className="history-meta">
                                <div className="history-date">
                                    <Calendar size={14} />
                                    <span>{formatDate(delivery.deliveredAt || delivery.completedAt || delivery.cancelledAt || delivery.createdAt)}</span>
                                </div>
                                <div className="history-package">
                                    <Package size={14} />
                                    <span>{delivery.itemDescription}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </section>
        </>
    );

    // Vista de Ganancias
    const renderEarningsView = () => {
        // Filtrar entregas completadas para ganancias
        const completedDeliveries = deliveryHistory.filter(d =>
            d.status === 'completed' || d.status === 'delivered'
        );

        // Funciones de ayuda para fechas
        const isToday = (date: Date) => {
            const today = new Date();
            return date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        };

        const isThisWeek = (date: Date) => {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            return date >= startOfWeek;
        };

        const isThisMonth = (date: Date) => {
            const today = new Date();
            return date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        };

        // Filtrar según período seleccionado
        const filteredDeliveries = completedDeliveries.filter(d => {
            const deliveryDate = d.deliveredAt || d.completedAt || d.createdAt;
            switch (earningsPeriod) {
                case 'today': return isToday(deliveryDate);
                case 'week': return isThisWeek(deliveryDate);
                case 'month': return isThisMonth(deliveryDate);
                default: return true;
            }
        });

        // Calcular estadísticas
        const todayEarnings = completedDeliveries
            .filter(d => isToday(d.deliveredAt || d.completedAt || d.createdAt))
            .reduce((sum, d) => sum + (d.finalCost || d.estimatedCost), 0);

        const weekEarnings = completedDeliveries
            .filter(d => isThisWeek(d.deliveredAt || d.completedAt || d.createdAt))
            .reduce((sum, d) => sum + (d.finalCost || d.estimatedCost), 0);

        const monthEarnings = completedDeliveries
            .filter(d => isThisMonth(d.deliveredAt || d.completedAt || d.createdAt))
            .reduce((sum, d) => sum + (d.finalCost || d.estimatedCost), 0);

        const totalEarnings = completedDeliveries
            .reduce((sum, d) => sum + (d.finalCost || d.estimatedCost), 0);

        // Contadores de entregas
        const todayCount = completedDeliveries.filter(d => isToday(d.deliveredAt || d.completedAt || d.createdAt)).length;
        const weekCount = completedDeliveries.filter(d => isThisWeek(d.deliveredAt || d.completedAt || d.createdAt)).length;
        const monthCount = completedDeliveries.filter(d => isThisMonth(d.deliveredAt || d.completedAt || d.createdAt)).length;

        // Promedio por entrega del período seleccionado
        const avgPerDelivery = filteredDeliveries.length > 0
            ? filteredDeliveries.reduce((sum, d) => sum + (d.finalCost || d.estimatedCost), 0) / filteredDeliveries.length
            : 0;

        // Formatear fecha
        const formatDeliveryDate = (delivery: DeliveryRequest) => {
            const date = delivery.deliveredAt || delivery.completedAt || delivery.createdAt;
            return date.toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        // Obtener título del período
        const getPeriodTitle = () => {
            switch (earningsPeriod) {
                case 'today': return 'Hoy';
                case 'week': return 'Esta Semana';
                case 'month': return 'Este Mes';
                default: return 'Todo el Tiempo';
            }
        };

        return (
            <>
                <section className="delivery-header">
                    <div className="delivery-welcome">
                        <h1 className="welcome-title">Mis Ganancias 💰</h1>
                        <p className="welcome-subtitle">Resumen de tus ingresos por entregas</p>
                    </div>
                </section>

                {/* Estadísticas principales */}
                <section className="earnings-stats-grid">
                    <div className="earnings-stat-card highlight">
                        <div className="earnings-stat-icon">
                            <DollarSign size={24} />
                        </div>
                        <div className="earnings-stat-info">
                            <span className="earnings-stat-value">{formatCostCOP(monthEarnings)}</span>
                            <span className="earnings-stat-label">Este mes</span>
                        </div>
                        <div className="earnings-stat-badge">
                            <TrendingUp size={14} />
                            <span>{monthCount} entregas</span>
                        </div>
                    </div>

                    <div className="earnings-stat-card">
                        <div className="earnings-stat-icon today">
                            <Calendar size={24} />
                        </div>
                        <div className="earnings-stat-info">
                            <span className="earnings-stat-value">{formatCostCOP(todayEarnings)}</span>
                            <span className="earnings-stat-label">Hoy</span>
                        </div>
                        <span className="earnings-stat-count">{todayCount} entregas</span>
                    </div>

                    <div className="earnings-stat-card">
                        <div className="earnings-stat-icon week">
                            <TrendingUp size={24} />
                        </div>
                        <div className="earnings-stat-info">
                            <span className="earnings-stat-value">{formatCostCOP(weekEarnings)}</span>
                            <span className="earnings-stat-label">Esta semana</span>
                        </div>
                        <span className="earnings-stat-count">{weekCount} entregas</span>
                    </div>

                    <div className="earnings-stat-card">
                        <div className="earnings-stat-icon total">
                            <Banknote size={24} />
                        </div>
                        <div className="earnings-stat-info">
                            <span className="earnings-stat-value">{formatCostCOP(totalEarnings)}</span>
                            <span className="earnings-stat-label">Total histórico</span>
                        </div>
                        <span className="earnings-stat-count">{completedDeliveries.length} entregas</span>
                    </div>
                </section>

                {/* Resumen del período */}
                <section className="earnings-summary-card">
                    <div className="earnings-summary-header">
                        <h3>Resumen de {getPeriodTitle()}</h3>
                        <div className="earnings-period-selector">
                            <button
                                className={`period-btn ${earningsPeriod === 'today' ? 'active' : ''}`}
                                onClick={() => setEarningsPeriod('today')}
                            >
                                Hoy
                            </button>
                            <button
                                className={`period-btn ${earningsPeriod === 'week' ? 'active' : ''}`}
                                onClick={() => setEarningsPeriod('week')}
                            >
                                Semana
                            </button>
                            <button
                                className={`period-btn ${earningsPeriod === 'month' ? 'active' : ''}`}
                                onClick={() => setEarningsPeriod('month')}
                            >
                                Mes
                            </button>
                            <button
                                className={`period-btn ${earningsPeriod === 'all' ? 'active' : ''}`}
                                onClick={() => setEarningsPeriod('all')}
                            >
                                Todo
                            </button>
                        </div>
                    </div>

                    <div className="earnings-summary-stats">
                        <div className="summary-stat">
                            <span className="summary-stat-value">{filteredDeliveries.length}</span>
                            <span className="summary-stat-label">Entregas completadas</span>
                        </div>
                        <div className="summary-stat">
                            <span className="summary-stat-value">{formatCostCOP(avgPerDelivery)}</span>
                            <span className="summary-stat-label">Promedio por entrega</span>
                        </div>
                        <div className="summary-stat highlight">
              <span className="summary-stat-value">
                {formatCostCOP(filteredDeliveries.reduce((sum, d) => sum + (d.finalCost || d.estimatedCost), 0))}
              </span>
                            <span className="summary-stat-label">Total {getPeriodTitle().toLowerCase()}</span>
                        </div>
                    </div>
                </section>

                {/* Historial de ganancias */}
                <section className="earnings-history-section">
                    <h2 className="section-title-delivery">
                        <Banknote size={20} />
                        Detalle de Entregas - {getPeriodTitle()}
                    </h2>

                    {isLoadingHistory ? (
                        <div className="earnings-loading">
                            <Loader2 size={32} className="spinning" />
                            <p>Cargando historial...</p>
                        </div>
                    ) : filteredDeliveries.length === 0 ? (
                        <div className="earnings-empty">
                            <DollarSign size={48} />
                            <h3>Sin entregas en este período</h3>
                            <p>No tienes entregas completadas {earningsPeriod === 'today' ? 'hoy' : earningsPeriod === 'week' ? 'esta semana' : earningsPeriod === 'month' ? 'este mes' : ''}</p>
                        </div>
                    ) : (
                        <div className="earnings-list">
                            {filteredDeliveries.map(delivery => (
                                <div key={delivery.id} className="earnings-item">
                                    <div className="earnings-item-left">
                                        <div className="earnings-item-icon">
                                            <CheckCircle size={20} />
                                        </div>
                                        <div className="earnings-item-info">
                      <span className="earnings-item-route">
                        {delivery.pickupNeighborhood} → {delivery.deliveryNeighborhood}
                      </span>
                                            <span className="earnings-item-date">
                        <Calendar size={12} />
                                                {formatDeliveryDate(delivery)}
                      </span>
                                            <span className="earnings-item-distance">
                        <Route size={12} />
                                                {formatDistance(delivery.distance)}
                      </span>
                                        </div>
                                    </div>
                                    <div className="earnings-item-right">
                    <span className="earnings-item-amount">
                      +{formatCostCOP(delivery.finalCost || delivery.estimatedCost)}
                    </span>
                                        <span className="earnings-item-status">
                      <ArrowUpRight size={14} />
                      Completada
                    </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </>
        );
    };

    // Vista de Inicio (contenido existente)
    const renderHomeView = () => (
        <>
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
                                <div className="detail-item distance">
                                    <Route size={14} />
                                    <span>Distancia: <strong>{formatDistance(service.distance)}</strong></span>
                                </div>
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
                                    className="action-btn accept"
                                    onClick={() => handleAcceptService(service)}
                                    disabled={isProcessingService}
                                >
                                    {isProcessingService ? <Loader2 size={18} className="spinning" /> : <Check size={18} />}
                                    <span>Aceptar</span>
                                </button>
                                <button
                                    className="action-btn reject"
                                    onClick={() => handleRejectService(service)}
                                    disabled={isProcessingService}
                                >
                                    <XCircle size={18} />
                                    <span>Rechazar</span>
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

                            {/* Botón de estado */}
                            <div className="status-action-container">
                                {service.status === 'accepted' && (
                                    <button
                                        className="status-action-btn picked_up"
                                        onClick={() => handleUpdateStatus(service, 'picked_up')}
                                        disabled={isProcessingService}
                                    >
                                        {isProcessingService ? <Loader2 size={20} className="spinning" /> : <Package size={20} />}
                                        <span>Marcar como Recogido</span>
                                    </button>
                                )}
                                {service.status === 'picked_up' && (
                                    <button
                                        className="status-action-btn in_transit"
                                        onClick={() => handleUpdateStatus(service, 'in_transit')}
                                        disabled={isProcessingService}
                                    >
                                        {isProcessingService ? <Loader2 size={20} className="spinning" /> : <Truck size={20} />}
                                        <span>En Camino</span>
                                    </button>
                                )}
                                {service.status === 'in_transit' && (
                                    <button
                                        className="status-action-btn delivered"
                                        onClick={() => handleUpdateStatus(service, 'delivered')}
                                        disabled={isProcessingService}
                                    >
                                        {isProcessingService ? <Loader2 size={20} className="spinning" /> : <Check size={20} />}
                                        <span>Marcar como Entregado</span>
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
        </>
    );

    return (
        <div className="delivery-dashboard">
            <div className="dashboard-container">
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

                {/* Renderizar vista según currentView */}
                {currentView === 'inicio' && renderHomeView()}
                {currentView === 'entregas' && renderDeliveriesView()}
                {currentView === 'ganancias' && renderEarningsView()}
            </div>
        </div>
    );
};

export default DeliveryDashboard;