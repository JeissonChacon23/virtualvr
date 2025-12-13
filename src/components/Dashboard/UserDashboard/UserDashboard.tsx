/**
 * File: /src/components/Dashboard/UserDashboard/UserDashboard.tsx
 * VirtualVR - User/Client dashboard with real-time order tracking
 */

import { useState, useEffect } from 'react';
import {
    Package,
    Clock,
    MapPin,
    Star,
    Plus,
    XCircle,
    CheckCircle,
    Truck,
    Navigation,
    Phone,
    User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase.config';
import DeliveryMap from '../../DeliveryMap';
import { formatCostCOP, RequestStatusInfo } from '../../../models/DeliveryRequest.model';
import type { DeliveryRequest, RequestStatus } from '../../../models/DeliveryRequest.model';
import './UserDashboard.css';

type ViewType = 'inicio' | 'pedidos' | 'map' | 'tracking';
type OrderFilter = 'todos' | 'activos' | 'completados' | 'cancelados';

const UserDashboard = () => {
    const { user } = useAuth();
    const [currentView, setCurrentView] = useState<ViewType>('inicio');
    const [orderFilter, setOrderFilter] = useState<OrderFilter>('todos');
    const [orders, setOrders] = useState<DeliveryRequest[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<DeliveryRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Subscribe to user's orders in real-time
    useEffect(() => {
        if (!user?.uid) return;

        console.log('🎧 Iniciando listener de pedidos para:', user.uid);

        const q = query(
            collection(db, 'deliveryRequests'),
            where('clientId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    createdAt: docData.createdAt?.toDate() || new Date(),
                    assignedAt: docData.assignedAt?.toDate(),
                    acceptedAt: docData.acceptedAt?.toDate(),
                    pickedUpAt: docData.pickedUpAt?.toDate(),
                    inTransitAt: docData.inTransitAt?.toDate(),
                    deliveredAt: docData.deliveredAt?.toDate(),
                    completedAt: docData.completedAt?.toDate(),
                } as DeliveryRequest;
            });

            console.log('✅ Pedidos actualizados:', data.length);
            setOrders(data);
            setIsLoading(false);

            // Update selected order if it exists
            if (selectedOrder) {
                const updated = data.find(o => o.id === selectedOrder.id);
                if (updated) setSelectedOrder(updated);
            }
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Filter orders
    const getFilteredOrders = (): DeliveryRequest[] => {
        switch (orderFilter) {
            case 'activos':
                return orders.filter(o => ['pending', 'assigned', 'accepted', 'picked_up', 'in_transit'].includes(o.status));
            case 'completados':
                return orders.filter(o => ['delivered', 'completed'].includes(o.status));
            case 'cancelados':
                return orders.filter(o => ['cancelled', 'rejected'].includes(o.status));
            default:
                return orders;
        }
    };

    const filteredOrders = getFilteredOrders();

    // Count orders by filter
    const orderCounts = {
        todos: orders.length,
        activos: orders.filter(o => ['pending', 'assigned', 'accepted', 'picked_up', 'in_transit'].includes(o.status)).length,
        completados: orders.filter(o => ['delivered', 'completed'].includes(o.status)).length,
        cancelados: orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length,
    };

    // Stats calculation
    const stats = {
        totalOrders: orders.length,
        activeOrders: orderCounts.activos,
        completedOrders: orderCounts.completados,
    };

    // Get empty message
    const getEmptyMessage = (): string => {
        switch (orderFilter) {
            case 'activos': return 'No tienes pedidos activos';
            case 'completados': return 'No tienes pedidos completados';
            case 'cancelados': return 'No tienes pedidos cancelados';
            default: return 'No tienes pedidos aún';
        }
    };

    // Format date
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Listen for navigation events from Navbar
    useEffect(() => {
        const handleNavigation = (e: CustomEvent) => {
            const view = e.detail.view;
            if (view === 'Inicio') setCurrentView('inicio');
            else if (view === 'Pedidos') setCurrentView('pedidos');
        };

        window.addEventListener('user-navigate', handleNavigation as EventListener);
        return () => {
            window.removeEventListener('user-navigate', handleNavigation as EventListener);
        };
    }, []);

    // Open tracking view
    const openTracking = (order: DeliveryRequest) => {
        setSelectedOrder(order);
        setCurrentView('tracking');
    };

    // Get tracking steps based on status
    const getTrackingSteps = (status: RequestStatus) => {
        const steps = [
            { key: 'pending', label: 'Solicitado', icon: Package },
            { key: 'assigned', label: 'Asignado', icon: UserIcon },
            { key: 'accepted', label: 'Aceptado', icon: CheckCircle },
            { key: 'picked_up', label: 'Recogido', icon: Package },
            { key: 'in_transit', label: 'En camino', icon: Truck },
            { key: 'delivered', label: 'Entregado', icon: CheckCircle },
        ];

        const statusOrder = ['pending', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed'];
        const currentIndex = statusOrder.indexOf(status);

        return steps.map((step) => ({
            ...step,
            completed: statusOrder.indexOf(step.key) <= currentIndex,
            current: step.key === status || (status === 'completed' && step.key === 'delivered'),
        }));
    };

    // Tracking View
    if (currentView === 'tracking' && selectedOrder) {
        const steps = getTrackingSteps(selectedOrder.status);
        const isCancelled = ['cancelled', 'rejected'].includes(selectedOrder.status);

        return (
            <div className="user-dashboard">
                <div className="dashboard-container">
                    <div className="tracking-header">
                        <button className="back-btn" onClick={() => setCurrentView('pedidos')}>
                            ← Volver a pedidos
                        </button>
                        <h2>Seguimiento del Envío</h2>
                    </div>

                    {/* Status Card */}
                    <div className={`tracking-status-card ${selectedOrder.status}`}>
                        <div className="tracking-status-icon">
                            {isCancelled ? <XCircle size={40} /> : <Truck size={40} />}
                        </div>
                        <div className="tracking-status-info">
              <span className="tracking-status-label">
                {RequestStatusInfo[selectedOrder.status]?.label || selectedOrder.status}
              </span>
                            <span className="tracking-status-date">
                Actualizado: {formatDate(selectedOrder.createdAt)}
              </span>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    {!isCancelled && (
                        <div className="tracking-progress">
                            {steps.map((step, index) => (
                                <div
                                    key={step.key}
                                    className={`tracking-step ${step.completed ? 'completed' : ''} ${step.current ? 'current' : ''}`}
                                >
                                    <div className="step-indicator">
                                        <div className="step-icon">
                                            <step.icon size={18} />
                                        </div>
                                        {index < steps.length - 1 && <div className="step-line" />}
                                    </div>
                                    <span className="step-label">{step.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Route Info */}
                    <div className="tracking-route">
                        <div className="tracking-point pickup">
                            <MapPin size={20} />
                            <div className="tracking-point-info">
                                <span className="tracking-point-label">Recogida</span>
                                <span className="tracking-point-address">{selectedOrder.pickupAddress}</span>
                                <span className="tracking-point-neighborhood">{selectedOrder.pickupNeighborhood}</span>
                            </div>
                        </div>
                        <div className="tracking-route-line" />
                        <div className="tracking-point delivery">
                            <Navigation size={20} />
                            <div className="tracking-point-info">
                                <span className="tracking-point-label">Entrega</span>
                                <span className="tracking-point-address">{selectedOrder.deliveryAddress}</span>
                                <span className="tracking-point-neighborhood">{selectedOrder.deliveryNeighborhood}</span>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Person Info */}
                    {selectedOrder.deliveryPersonName && (
                        <div className="tracking-delivery-person">
                            <div className="delivery-person-avatar">
                                <Truck size={24} />
                            </div>
                            <div className="delivery-person-info">
                                <span className="delivery-person-name">{selectedOrder.deliveryPersonName}</span>
                                <span className="delivery-person-label">Tu domiciliario</span>
                            </div>
                            {selectedOrder.deliveryPersonPhone && (
                                <a href={`tel:${selectedOrder.deliveryPersonPhone}`} className="call-delivery-btn">
                                    <Phone size={18} />
                                    Llamar
                                </a>
                            )}
                        </div>
                    )}

                    {/* Order Details */}
                    <div className="tracking-details">
                        <div className="tracking-detail-row">
                            <span className="detail-label">Paquete</span>
                            <span className="detail-value">{selectedOrder.itemDescription}</span>
                        </div>
                        <div className="tracking-detail-row">
                            <span className="detail-label">Costo</span>
                            <span className="detail-value cost">{formatCostCOP(selectedOrder.estimatedCost)}</span>
                        </div>
                        <div className="tracking-detail-row">
                            <span className="detail-label">Método de pago</span>
                            <span className="detail-value">
                {selectedOrder.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
              </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Map View
    if (currentView === 'map') {
        return (
            <div className="user-dashboard">
                <div className="dashboard-map-header">
                    <button className="back-btn" onClick={() => setCurrentView('inicio')}>
                        ← Volver al inicio
                    </button>
                </div>
                <DeliveryMap />
            </div>
        );
    }

    // Orders View
    if (currentView === 'pedidos') {
        return (
            <div className="user-dashboard">
                <div className="dashboard-container">
                    <section className="dashboard-welcome">
                        <div className="welcome-content">
                            <h1 className="welcome-title">Mis Pedidos 📦</h1>
                            <p className="welcome-subtitle">
                                Historial de todas tus entregas
                            </p>
                        </div>
                        <button className="new-order-btn" onClick={() => setCurrentView('map')}>
                            <Plus size={20} />
                            <span>Solicitar Domicilio</span>
                        </button>
                    </section>

                    {/* Filters */}
                    <section className="orders-filters">
                        <button
                            className={`filter-btn ${orderFilter === 'todos' ? 'active' : ''}`}
                            onClick={() => setOrderFilter('todos')}
                        >
                            Todos
                            <span className="filter-count">{orderCounts.todos}</span>
                        </button>
                        <button
                            className={`filter-btn ${orderFilter === 'activos' ? 'active' : ''}`}
                            onClick={() => setOrderFilter('activos')}
                        >
                            Activos
                            <span className="filter-count">{orderCounts.activos}</span>
                        </button>
                        <button
                            className={`filter-btn ${orderFilter === 'completados' ? 'active' : ''}`}
                            onClick={() => setOrderFilter('completados')}
                        >
                            Completados
                            <span className="filter-count">{orderCounts.completados}</span>
                        </button>
                        <button
                            className={`filter-btn ${orderFilter === 'cancelados' ? 'active' : ''}`}
                            onClick={() => setOrderFilter('cancelados')}
                        >
                            Cancelados
                            <span className="filter-count">{orderCounts.cancelados}</span>
                        </button>
                    </section>

                    {/* Orders List */}
                    <section className="dashboard-section">
                        <div className="orders-list">
                            {isLoading ? (
                                <div className="loading-orders">
                                    <Clock size={32} className="spinning" />
                                    <p>Cargando pedidos...</p>
                                </div>
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map(order => (
                                    <div
                                        key={order.id}
                                        className={`order-card ${order.status}`}
                                        onClick={() => openTracking(order)}
                                    >
                                        <div className="order-status-indicator">
                      <span className={`status-badge-small ${order.status}`}>
                        {RequestStatusInfo[order.status]?.label || order.status}
                      </span>
                                        </div>
                                        <div className="order-info">
                                            <div className="order-route">
                                                <span className="order-from">{order.pickupNeighborhood}</span>
                                                <span className="order-arrow">→</span>
                                                <span className="order-to">{order.deliveryNeighborhood}</span>
                                            </div>
                                            <div className="order-meta">
                                                <span className="order-date">{formatDate(order.createdAt)}</span>
                                                <span className="order-package">{order.itemDescription}</span>
                                            </div>
                                        </div>
                                        <div className="order-cost">
                                            {formatCostCOP(order.estimatedCost)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-orders">
                                    {orderFilter === 'cancelados' ? (
                                        <XCircle size={48} />
                                    ) : (
                                        <Package size={48} />
                                    )}
                                    <p>{getEmptyMessage()}</p>
                                    {orderFilter === 'todos' && (
                                        <button className="first-order-btn" onClick={() => setCurrentView('map')}>
                                            Hacer mi primer envío
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    // Home View (default)
    return (
        <div className="user-dashboard">
            <div className="dashboard-container">
                {/* Welcome Section */}
                <section className="dashboard-welcome">
                    <div className="welcome-content">
                        <h1 className="welcome-title">
                            ¡Hola, {user?.firstName || 'Usuario'}! 👋
                        </h1>
                        <p className="welcome-subtitle">
                            ¿Qué necesitas enviar hoy?
                        </p>
                    </div>
                    <button className="new-order-btn" onClick={() => setCurrentView('map')}>
                        <Plus size={20} />
                        <span>Solicitar Domicilio</span>
                    </button>
                </section>

                {/* Active Orders Alert */}
                {orderCounts.activos > 0 && (
                    <section className="active-orders-alert" onClick={() => setCurrentView('pedidos')}>
                        <div className="alert-icon">
                            <Truck size={24} />
                        </div>
                        <div className="alert-info">
              <span className="alert-title">
                {orderCounts.activos === 1 ? 'Tienes 1 pedido activo' : `Tienes ${orderCounts.activos} pedidos activos`}
              </span>
                            <span className="alert-subtitle">Toca para ver el seguimiento</span>
                        </div>
                        <span className="alert-arrow">→</span>
                    </section>
                )}

                {/* Stats Cards */}
                <section className="dashboard-stats">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <Package size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.totalOrders}</span>
                            <span className="stat-label">Entregas totales</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon active">
                            <Clock size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.activeOrders}</span>
                            <span className="stat-label">En progreso</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon completed">
                            <CheckCircle size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.completedOrders}</span>
                            <span className="stat-label">Completados</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <Star size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">4.8</span>
                            <span className="stat-label">Calificación</span>
                        </div>
                    </div>
                </section>

                {/* Recent Orders */}
                {orders.length > 0 && (
                    <section className="recent-orders-section">
                        <div className="section-header">
                            <h2>Pedidos Recientes</h2>
                            <button className="see-all-btn" onClick={() => setCurrentView('pedidos')}>
                                Ver todos
                            </button>
                        </div>
                        <div className="orders-list">
                            {orders.slice(0, 3).map(order => (
                                <div
                                    key={order.id}
                                    className={`order-card ${order.status}`}
                                    onClick={() => openTracking(order)}
                                >
                                    <div className="order-status-indicator">
                    <span className={`status-badge-small ${order.status}`}>
                      {RequestStatusInfo[order.status]?.label || order.status}
                    </span>
                                    </div>
                                    <div className="order-info">
                                        <div className="order-route">
                                            <span className="order-from">{order.pickupNeighborhood}</span>
                                            <span className="order-arrow">→</span>
                                            <span className="order-to">{order.deliveryNeighborhood}</span>
                                        </div>
                                        <div className="order-meta">
                                            <span className="order-date">{formatDate(order.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div className="order-cost">
                                        {formatCostCOP(order.estimatedCost)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default UserDashboard;