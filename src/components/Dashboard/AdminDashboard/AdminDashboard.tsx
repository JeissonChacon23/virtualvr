/**
 * File: /src/components/Dashboard/AdminDashboard/AdminDashboard.tsx
 * VirtualVR - Administrator dashboard with Services and Delivery management
 */

import { useState, useEffect } from 'react';
import {
    Users,
    Truck,
    Package,
    TrendingUp,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Eye,
    MapPin,
    Navigation,
    AlertCircle,
    Loader2,
    X,
    UserCheck,
    UserX,
    ListOrdered
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    where
} from 'firebase/firestore';
import { db } from '../../../config/firebase.config';
import serviceAssignmentService from '../../../services/serviceAssignment.service';
import { formatCostCOP, RequestStatusInfo } from '../../../models/DeliveryRequest.model';
import type { DeliveryRequest } from '../../../models/DeliveryRequest.model';
import type { DeliveryQueue } from '../../../models/DeliveryQueue.model';
import './AdminDashboard.css';

interface DeliveryPerson {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    vehicleType: string;
    vehiclePlate: string;
    isApproved: boolean;
    isActive: boolean;
    registerDate: Date;
    neighborhood: string;
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    neighborhood: string;
    isActive: boolean;
    isPreferential: boolean;
    registerDate: Date;
}

type TabType = 'overview' | 'services' | 'deliveries' | 'users';
type DeliveryFilterType = 'all' | 'active' | 'inactive' | 'in_queue' | 'pending_approval';
type ServiceFilterType = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'all';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Data states
    const [deliveries, setDeliveries] = useState<DeliveryPerson[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [serviceRequests, setServiceRequests] = useState<DeliveryRequest[]>([]);
    const [deliveryQueues, setDeliveryQueues] = useState<DeliveryQueue[]>([]);

    // UI states
    const [searchTerm, setSearchTerm] = useState('');
    const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilterType>('all');
    const [serviceFilter, setServiceFilter] = useState<ServiceFilterType>('pending');
    const [isLoading, setIsLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Subscribe to deliveries
    useEffect(() => {
        const q = query(collection(db, 'deliveries'), orderBy('registerDate', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                registerDate: doc.data().registerDate?.toDate() || new Date()
            })) as DeliveryPerson[];
            setDeliveries(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Subscribe to users
    useEffect(() => {
        const q = query(collection(db, 'users'), orderBy('registerDate', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                registerDate: doc.data().registerDate?.toDate() || new Date()
            })) as User[];
            setUsers(data);
        });
        return () => unsubscribe();
    }, []);

    // Subscribe to service requests
    useEffect(() => {
        const q = query(collection(db, 'deliveryRequests'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    createdAt: docData.createdAt?.toDate() || new Date(),
                    assignedAt: docData.assignedAt?.toDate(),
                    acceptedAt: docData.acceptedAt?.toDate(),
                    deliveredAt: docData.deliveredAt?.toDate(),
                    completedAt: docData.completedAt?.toDate(),
                } as DeliveryRequest;
            });
            setServiceRequests(data);
        });
        return () => unsubscribe();
    }, []);

    // Subscribe to delivery queues
    useEffect(() => {
        const q = query(
            collection(db, 'delivery_queues'),
            where('status', '==', 'waiting'),
            orderBy('position', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                deliveryPersonId: doc.data().delivery_person_id,
                deliveryPersonName: doc.data().delivery_person_name,
                deliveryPersonPhone: doc.data().delivery_person_phone,
                position: doc.data().position,
                joinedAt: doc.data().joined_at?.toDate() || new Date(),
                lastUpdated: doc.data().last_updated?.toDate() || new Date(),
                status: doc.data().status,
                vehicleType: doc.data().vehicle_type,
                vehiclePlate: doc.data().vehicle_plate,
            })) as DeliveryQueue[];
            setDeliveryQueues(data);
        });
        return () => unsubscribe();
    }, []);

    // Listen for navigation events from Navbar
    useEffect(() => {
        const handleNavigation = (e: CustomEvent) => {
            const view = e.detail.view;
            if (view === 'Resumen') setActiveTab('overview');
            else if (view === 'Servicios') setActiveTab('services');
            else if (view === 'Clientes') setActiveTab('users');
            else if (view === 'Domiciliarios') setActiveTab('deliveries');
        };

        window.addEventListener('user-navigate', handleNavigation as EventListener);
        return () => {
            window.removeEventListener('user-navigate', handleNavigation as EventListener);
        };
    }, []);

    // Approve delivery person
    const handleApproveDelivery = async (id: string) => {
        try {
            await updateDoc(doc(db, 'deliveries', id), {
                isApproved: true,
                updatedAt: serverTimestamp()
            });
            setSuccess('Domiciliario aprobado correctamente');
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error approving delivery:', error);
            setError('Error al aprobar domiciliario');
        }
    };

    // Reject delivery person
    const handleRejectDelivery = async (id: string) => {
        try {
            await updateDoc(doc(db, 'deliveries', id), {
                isApproved: false,
                isActive: false,
                updatedAt: serverTimestamp()
            });
            setSuccess('Domiciliario rechazado');
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error rejecting delivery:', error);
            setError('Error al rechazar domiciliario');
        }
    };

    // Assign service to first in queue
    const handleAssignService = async (requestId: string) => {
        setIsAssigning(requestId);
        setError(null);

        try {
            const result = await serviceAssignmentService.assignServiceToFirstInQueue(requestId);

            if (result.success) {
                setSuccess(result.message);
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error('Error assigning service:', err);
            setError(err instanceof Error ? err.message : 'Error al asignar servicio');
        }

        setIsAssigning(null);
    };

    // Stats calculations
    const stats = {
        totalUsers: users.length,
        totalDeliveries: deliveries.length,
        pendingApproval: deliveries.filter(d => !d.isApproved && d.isActive).length,
        activeDeliveries: deliveries.filter(d => d.isApproved && d.isActive).length,
        pendingServices: serviceRequests.filter(s => s.status === 'pending').length,
        inQueueCount: deliveryQueues.length,
    };

    // Filter deliveries
    const filteredDeliveries = deliveries.filter(d => {
        const matchesSearch =
            d.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.email.toLowerCase().includes(searchTerm.toLowerCase());

        const inQueueIds = deliveryQueues.map(q => q.deliveryPersonId);

        let matchesFilter = true;
        switch (deliveryFilter) {
            case 'active':
                matchesFilter = d.isApproved && d.isActive;
                break;
            case 'inactive':
                matchesFilter = !d.isActive;
                break;
            case 'in_queue':
                matchesFilter = inQueueIds.includes(d.id);
                break;
            case 'pending_approval':
                matchesFilter = !d.isApproved && d.isActive;
                break;
        }

        return matchesSearch && matchesFilter;
    });

    // Filter services
    const filteredServices = serviceRequests.filter(s => {
        switch (serviceFilter) {
            case 'pending':
                return s.status === 'pending';
            case 'assigned':
                return s.status === 'assigned';
            case 'in_progress':
                return ['accepted', 'picked_up', 'in_transit'].includes(s.status);
            case 'completed':
                return ['delivered', 'completed'].includes(s.status);
            default:
                return true;
        }
    });

    // Filter users
    const filteredUsers = users.filter(u =>
        u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (date: Date) => {
        return date.toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="admin-dashboard">
            <div className="admin-container">
                {/* Header */}
                <header className="admin-header">
                    <div className="admin-welcome">
                        <h1 className="admin-title">Panel de Administración</h1>
                        <p className="admin-subtitle">Bienvenido, {user?.email}</p>
                    </div>
                </header>

                {/* Alerts */}
                {error && (
                    <div className="admin-alert error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                        <button onClick={() => setError(null)}><X size={16} /></button>
                    </div>
                )}

                {success && (
                    <div className="admin-alert success">
                        <CheckCircle size={18} />
                        <span>{success}</span>
                    </div>
                )}

                {/* Stats Cards */}
                <section className="admin-stats">
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon users">
                            <Users size={24} />
                        </div>
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{stats.totalUsers}</span>
                            <span className="admin-stat-label">Clientes</span>
                        </div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon deliveries">
                            <Truck size={24} />
                        </div>
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{stats.totalDeliveries}</span>
                            <span className="admin-stat-label">Domiciliarios</span>
                        </div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon pending">
                            <Package size={24} />
                        </div>
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{stats.pendingServices}</span>
                            <span className="admin-stat-label">Servicios pendientes</span>
                        </div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon active">
                            <ListOrdered size={24} />
                        </div>
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{stats.inQueueCount}</span>
                            <span className="admin-stat-label">En cola</span>
                        </div>
                    </div>
                </section>

                {/* Tabs */}
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <TrendingUp size={18} />
                        <span>Resumen</span>
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'services' ? 'active' : ''}`}
                        onClick={() => setActiveTab('services')}
                    >
                        <Package size={18} />
                        <span>Servicios</span>
                        {stats.pendingServices > 0 && (
                            <span className="tab-badge">{stats.pendingServices}</span>
                        )}
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'deliveries' ? 'active' : ''}`}
                        onClick={() => setActiveTab('deliveries')}
                    >
                        <Truck size={18} />
                        <span>Domiciliarios</span>
                        {stats.pendingApproval > 0 && (
                            <span className="tab-badge">{stats.pendingApproval}</span>
                        )}
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={18} />
                        <span>Clientes</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="admin-content">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="overview-content">
                            {/* Queue Status */}
                            <div className="overview-section">
                                <h2>Cola de Domiciliarios</h2>
                                {deliveryQueues.length > 0 ? (
                                    <div className="queue-overview-list">
                                        {deliveryQueues.slice(0, 5).map((queue) => (
                                            <div key={queue.id} className="queue-overview-item">
                                                <span className="queue-position-badge">{queue.position}</span>
                                                <div className="queue-overview-info">
                                                    <span className="queue-overview-name">{queue.deliveryPersonName}</span>
                                                    <span className="queue-overview-vehicle">
                            {queue.vehicleType === 'motorcycle' ? '🏍️' : '🚗'} {queue.vehiclePlate}
                          </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-queue">
                                        <Clock size={32} />
                                        <p>No hay domiciliarios en cola</p>
                                    </div>
                                )}
                            </div>

                            {/* Pending Services */}
                            {stats.pendingServices > 0 && (
                                <div className="overview-section">
                                    <h2>Servicios Pendientes</h2>
                                    <div className="pending-services-overview">
                                        {serviceRequests.filter(s => s.status === 'pending').slice(0, 3).map(service => (
                                            <div key={service.id} className="pending-service-card">
                                                <div className="service-card-header">
                                                    <span className="service-time">{formatDateTime(service.createdAt)}</span>
                                                    <span className="service-cost">{formatCostCOP(service.estimatedCost)}</span>
                                                </div>
                                                <div className="service-card-route">
                                                    <span>{service.pickupNeighborhood} → {service.deliveryNeighborhood}</span>
                                                </div>
                                                <button
                                                    className="assign-btn-small"
                                                    onClick={() => handleAssignService(service.id!)}
                                                    disabled={isAssigning === service.id || deliveryQueues.length === 0}
                                                >
                                                    {isAssigning === service.id ? (
                                                        <Loader2 size={14} className="spinning" />
                                                    ) : (
                                                        'Asignar'
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pending Approvals */}
                            {stats.pendingApproval > 0 && (
                                <div className="overview-section">
                                    <h2>Pendientes de Aprobación</h2>
                                    <div className="pending-approvals">
                                        {deliveries.filter(d => !d.isApproved && d.isActive).slice(0, 3).map(delivery => (
                                            <div key={delivery.id} className="pending-approval-item">
                                                <div className="pending-info">
                                                    <span className="pending-name">{delivery.firstName} {delivery.lastName}</span>
                                                    <span className="pending-vehicle">{delivery.vehiclePlate}</span>
                                                </div>
                                                <div className="pending-actions">
                                                    <button
                                                        className="action-btn approve"
                                                        onClick={() => handleApproveDelivery(delivery.id)}
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button
                                                        className="action-btn reject"
                                                        onClick={() => handleRejectDelivery(delivery.id)}
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Activity */}
                            <div className="overview-section">
                                <h2>Actividad Reciente</h2>
                                <div className="activity-list">
                                    {[...deliveries, ...users]
                                        .sort((a, b) => b.registerDate.getTime() - a.registerDate.getTime())
                                        .slice(0, 5)
                                        .map((item, index) => (
                                            <div key={index} className="activity-item">
                                                <div className={`activity-icon ${'vehicleType' in item ? 'delivery' : 'user'}`}>
                                                    {'vehicleType' in item ? <Truck size={16} /> : <Users size={16} />}
                                                </div>
                                                <div className="activity-info">
                          <span className="activity-text">
                            <strong>{item.firstName} {item.lastName}</strong> se registró como{' '}
                              {'vehicleType' in item ? 'domiciliario' : 'cliente'}
                          </span>
                                                    <span className="activity-date">{formatDate(item.registerDate)}</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Services Tab */}
                    {activeTab === 'services' && (
                        <div className="list-content">
                            {/* Filter buttons */}
                            <div className="list-toolbar">
                                <div className="filter-buttons">
                                    <button
                                        className={`filter-btn ${serviceFilter === 'pending' ? 'active' : ''}`}
                                        onClick={() => setServiceFilter('pending')}
                                    >
                                        Pendientes
                                        {stats.pendingServices > 0 && <span className="filter-count">{stats.pendingServices}</span>}
                                    </button>
                                    <button
                                        className={`filter-btn ${serviceFilter === 'assigned' ? 'active' : ''}`}
                                        onClick={() => setServiceFilter('assigned')}
                                    >
                                        Asignados
                                    </button>
                                    <button
                                        className={`filter-btn ${serviceFilter === 'in_progress' ? 'active' : ''}`}
                                        onClick={() => setServiceFilter('in_progress')}
                                    >
                                        En progreso
                                    </button>
                                    <button
                                        className={`filter-btn ${serviceFilter === 'completed' ? 'active' : ''}`}
                                        onClick={() => setServiceFilter('completed')}
                                    >
                                        Completados
                                    </button>
                                    <button
                                        className={`filter-btn ${serviceFilter === 'all' ? 'active' : ''}`}
                                        onClick={() => setServiceFilter('all')}
                                    >
                                        Todos
                                    </button>
                                </div>
                            </div>

                            {/* Queue info */}
                            {serviceFilter === 'pending' && (
                                <div className="queue-info-bar">
                                    <ListOrdered size={18} />
                                    <span>
                    {deliveryQueues.length > 0
                        ? `${deliveryQueues.length} domiciliario(s) en cola - Primero: ${deliveryQueues[0].deliveryPersonName}`
                        : 'No hay domiciliarios en cola'}
                  </span>
                                </div>
                            )}

                            {/* Services List */}
                            <div className="services-list">
                                {filteredServices.length > 0 ? (
                                    filteredServices.map(service => (
                                        <div key={service.id} className="service-card-admin">
                                            <div className="service-card-top">
                                                <div className="service-status-info">
                          <span className={`status-badge ${service.status}`}>
                            {RequestStatusInfo[service.status]?.label || service.status}
                          </span>
                                                    <span className="service-date">{formatDateTime(service.createdAt)}</span>
                                                </div>
                                                <span className="service-amount">{formatCostCOP(service.estimatedCost)}</span>
                                            </div>

                                            <div className="service-route-admin">
                                                <div className="route-point-admin">
                                                    <MapPin size={16} className="pickup-icon" />
                                                    <div>
                                                        <span className="route-address">{service.pickupAddress}</span>
                                                        <span className="route-neighborhood">{service.pickupNeighborhood}</span>
                                                    </div>
                                                </div>
                                                <div className="route-arrow">→</div>
                                                <div className="route-point-admin">
                                                    <Navigation size={16} className="delivery-icon" />
                                                    <div>
                                                        <span className="route-address">{service.deliveryAddress}</span>
                                                        <span className="route-neighborhood">{service.deliveryNeighborhood}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="service-details-admin">
                                                <div className="detail-row">
                                                    <span className="detail-label">Cliente:</span>
                                                    <span>{service.clientName}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">Paquete:</span>
                                                    <span>{service.itemDescription}</span>
                                                </div>
                                                {service.deliveryPersonName && (
                                                    <div className="detail-row">
                                                        <span className="detail-label">Domiciliario:</span>
                                                        <span>{service.deliveryPersonName}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {service.status === 'pending' && (
                                                <div className="service-actions-admin">
                                                    <button
                                                        className="assign-btn"
                                                        onClick={() => handleAssignService(service.id!)}
                                                        disabled={isAssigning === service.id || deliveryQueues.length === 0}
                                                    >
                                                        {isAssigning === service.id ? (
                                                            <>
                                                                <Loader2 size={18} className="spinning" />
                                                                <span>Asignando...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserCheck size={18} />
                                                                <span>Asignar al primero en cola</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <Package size={48} />
                                        <p>No hay servicios en esta categoría</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Deliveries Tab */}
                    {activeTab === 'deliveries' && (
                        <div className="list-content">
                            {/* Search and Filter */}
                            <div className="list-toolbar">
                                <div className="search-box">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar domiciliario..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="filter-buttons">
                                    <button
                                        className={`filter-btn ${deliveryFilter === 'all' ? 'active' : ''}`}
                                        onClick={() => setDeliveryFilter('all')}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        className={`filter-btn ${deliveryFilter === 'active' ? 'active' : ''}`}
                                        onClick={() => setDeliveryFilter('active')}
                                    >
                                        <UserCheck size={14} />
                                        Activos
                                    </button>
                                    <button
                                        className={`filter-btn ${deliveryFilter === 'inactive' ? 'active' : ''}`}
                                        onClick={() => setDeliveryFilter('inactive')}
                                    >
                                        <UserX size={14} />
                                        Inactivos
                                    </button>
                                    <button
                                        className={`filter-btn ${deliveryFilter === 'in_queue' ? 'active' : ''}`}
                                        onClick={() => setDeliveryFilter('in_queue')}
                                    >
                                        <ListOrdered size={14} />
                                        En cola
                                    </button>
                                    <button
                                        className={`filter-btn ${deliveryFilter === 'pending_approval' ? 'active' : ''}`}
                                        onClick={() => setDeliveryFilter('pending_approval')}
                                    >
                                        <Clock size={14} />
                                        Pendientes
                                    </button>
                                </div>
                            </div>

                            {/* Deliveries List */}
                            <div className="data-table">
                                <div className="table-header">
                                    <span>Nombre</span>
                                    <span>Contacto</span>
                                    <span>Vehículo</span>
                                    <span>Estado</span>
                                    <span>Acciones</span>
                                </div>
                                {isLoading ? (
                                    <div className="table-loading">Cargando...</div>
                                ) : filteredDeliveries.length > 0 ? (
                                    filteredDeliveries.map(delivery => {
                                        const isInQueue = deliveryQueues.some(q => q.deliveryPersonId === delivery.id);
                                        const queuePosition = deliveryQueues.find(q => q.deliveryPersonId === delivery.id)?.position;

                                        return (
                                            <div key={delivery.id} className="table-row">
                                                <div className="table-cell name-cell">
                                                    <span className="cell-primary">{delivery.firstName} {delivery.lastName}</span>
                                                    <span className="cell-secondary">{formatDate(delivery.registerDate)}</span>
                                                </div>
                                                <div className="table-cell">
                                                    <span className="cell-primary">{delivery.email}</span>
                                                    <span className="cell-secondary">{delivery.phone}</span>
                                                </div>
                                                <div className="table-cell">
                                                    <span className="cell-primary">{delivery.vehiclePlate}</span>
                                                    <span className="cell-secondary">{delivery.vehicleType}</span>
                                                </div>
                                                <div className="table-cell status-cell">
                                                    {delivery.isApproved ? (
                                                        <span className="status-badge approved">Aprobado</span>
                                                    ) : delivery.isActive ? (
                                                        <span className="status-badge pending">Pendiente</span>
                                                    ) : (
                                                        <span className="status-badge rejected">Rechazado</span>
                                                    )}
                                                    {isInQueue && (
                                                        <span className="queue-badge">Cola #{queuePosition}</span>
                                                    )}
                                                </div>
                                                <div className="table-cell actions-cell">
                                                    {!delivery.isApproved && delivery.isActive && (
                                                        <>
                                                            <button
                                                                className="action-btn approve"
                                                                onClick={() => handleApproveDelivery(delivery.id)}
                                                                title="Aprobar"
                                                            >
                                                                <CheckCircle size={18} />
                                                            </button>
                                                            <button
                                                                className="action-btn reject"
                                                                onClick={() => handleRejectDelivery(delivery.id)}
                                                                title="Rechazar"
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button className="action-btn view" title="Ver detalles">
                                                        <Eye size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="table-empty">No se encontraron domiciliarios</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <div className="list-content">
                            {/* Search */}
                            <div className="list-toolbar">
                                <div className="search-box">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar cliente..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Clients List */}
                            <div className="data-table">
                                <div className="table-header">
                                    <span>Nombre</span>
                                    <span>Contacto</span>
                                    <span>Barrio</span>
                                    <span>Estado</span>
                                    <span>Acciones</span>
                                </div>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(userItem => (
                                        <div key={userItem.id} className="table-row">
                                            <div className="table-cell name-cell">
                                                <span className="cell-primary">{userItem.firstName} {userItem.lastName}</span>
                                                <span className="cell-secondary">{formatDate(userItem.registerDate)}</span>
                                            </div>
                                            <div className="table-cell">
                                                <span className="cell-primary">{userItem.email}</span>
                                                <span className="cell-secondary">{userItem.phone}</span>
                                            </div>
                                            <div className="table-cell">
                                                <span className="cell-primary">{userItem.neighborhood}</span>
                                            </div>
                                            <div className="table-cell">
                                                {userItem.isPreferential ? (
                                                    <span className="status-badge preferential">Preferencial</span>
                                                ) : (
                                                    <span className="status-badge regular">Regular</span>
                                                )}
                                            </div>
                                            <div className="table-cell actions-cell">
                                                <button className="action-btn view" title="Ver detalles">
                                                    <Eye size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="table-empty">No se encontraron clientes</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;