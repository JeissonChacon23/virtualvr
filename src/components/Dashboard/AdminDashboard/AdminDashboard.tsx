/**
 * File: /src/components/Dashboard/AdminDashboard/AdminDashboard.tsx
 * VirtualVR - Administrator dashboard
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
    Filter,
    ChevronRight,
    Eye
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase.config';
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

type TabType = 'overview' | 'deliveries' | 'users';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [deliveries, setDeliveries] = useState<DeliveryPerson[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
    const [isLoading, setIsLoading] = useState(true);

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

    // Approve delivery person
    const handleApprove = async (id: string) => {
        try {
            await updateDoc(doc(db, 'deliveries', id), {
                isApproved: true,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error approving delivery:', error);
        }
    };

    // Reject delivery person
    const handleReject = async (id: string) => {
        try {
            await updateDoc(doc(db, 'deliveries', id), {
                isApproved: false,
                isActive: false,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error rejecting delivery:', error);
        }
    };

    // Stats calculations
    const stats = {
        totalUsers: users.length,
        totalDeliveries: deliveries.length,
        pendingApproval: deliveries.filter(d => !d.isApproved && d.isActive).length,
        activeDeliveries: deliveries.filter(d => d.isApproved && d.isActive).length
    };

    // Filter deliveries
    const filteredDeliveries = deliveries.filter(d => {
        const matchesSearch =
            d.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter =
            filterStatus === 'all' ||
            (filterStatus === 'pending' && !d.isApproved && d.isActive) ||
            (filterStatus === 'approved' && d.isApproved);

        return matchesSearch && matchesFilter;
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

                {/* Stats Cards */}
                <section className="admin-stats">
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon users">
                            <Users size={24} />
                        </div>
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{stats.totalUsers}</span>
                            <span className="admin-stat-label">Usuarios</span>
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
                            <Clock size={24} />
                        </div>
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{stats.pendingApproval}</span>
                            <span className="admin-stat-label">Por aprobar</span>
                        </div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon active">
                            <TrendingUp size={24} />
                        </div>
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{stats.activeDeliveries}</span>
                            <span className="admin-stat-label">Activos</span>
                        </div>
                    </div>
                </section>

                {/* Tabs */}
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <Package size={18} />
                        <span>Resumen</span>
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
                        <span>Usuarios</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="admin-content">
                    {activeTab === 'overview' && (
                        <div className="overview-content">
                            {/* Pending Approvals */}
                            {stats.pendingApproval > 0 && (
                                <div className="overview-section">
                                    <div className="section-header-admin">
                                        <h2>Solicitudes Pendientes</h2>
                                        <button
                                            className="see-all-link"
                                            onClick={() => {
                                                setActiveTab('deliveries');
                                                setFilterStatus('pending');
                                            }}
                                        >
                                            Ver todas <ChevronRight size={16} />
                                        </button>
                                    </div>
                                    <div className="pending-list">
                                        {deliveries
                                            .filter(d => !d.isApproved && d.isActive)
                                            .slice(0, 3)
                                            .map(delivery => (
                                                <div key={delivery.id} className="pending-card">
                                                    <div className="pending-info">
                            <span className="pending-name">
                              {delivery.firstName} {delivery.lastName}
                            </span>
                                                        <span className="pending-detail">
                              {delivery.vehicleType} • {delivery.vehiclePlate}
                            </span>
                                                    </div>
                                                    <div className="pending-actions">
                                                        <button
                                                            className="action-btn approve"
                                                            onClick={() => handleApprove(delivery.id)}
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            className="action-btn reject"
                                                            onClick={() => handleReject(delivery.id)}
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
                              {'vehicleType' in item ? 'domiciliario' : 'usuario'}
                          </span>
                                                    <span className="activity-date">{formatDate(item.registerDate)}</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}

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
                                        className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                                        onClick={() => setFilterStatus('all')}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
                                        onClick={() => setFilterStatus('pending')}
                                    >
                                        Pendientes
                                    </button>
                                    <button
                                        className={`filter-btn ${filterStatus === 'approved' ? 'active' : ''}`}
                                        onClick={() => setFilterStatus('approved')}
                                    >
                                        Aprobados
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
                                    filteredDeliveries.map(delivery => (
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
                                            <div className="table-cell">
                                                {delivery.isApproved ? (
                                                    <span className="status-badge approved">Aprobado</span>
                                                ) : delivery.isActive ? (
                                                    <span className="status-badge pending">Pendiente</span>
                                                ) : (
                                                    <span className="status-badge rejected">Rechazado</span>
                                                )}
                                            </div>
                                            <div className="table-cell actions-cell">
                                                {!delivery.isApproved && delivery.isActive && (
                                                    <>
                                                        <button
                                                            className="action-btn approve"
                                                            onClick={() => handleApprove(delivery.id)}
                                                            title="Aprobar"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            className="action-btn reject"
                                                            onClick={() => handleReject(delivery.id)}
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
                                    ))
                                ) : (
                                    <div className="table-empty">No se encontraron domiciliarios</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="list-content">
                            {/* Search */}
                            <div className="list-toolbar">
                                <div className="search-box">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar usuario..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Users List */}
                            <div className="data-table">
                                <div className="table-header">
                                    <span>Nombre</span>
                                    <span>Contacto</span>
                                    <span>Barrio</span>
                                    <span>Estado</span>
                                    <span>Acciones</span>
                                </div>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => (
                                        <div key={user.id} className="table-row">
                                            <div className="table-cell name-cell">
                                                <span className="cell-primary">{user.firstName} {user.lastName}</span>
                                                <span className="cell-secondary">{formatDate(user.registerDate)}</span>
                                            </div>
                                            <div className="table-cell">
                                                <span className="cell-primary">{user.email}</span>
                                                <span className="cell-secondary">{user.phone}</span>
                                            </div>
                                            <div className="table-cell">
                                                <span className="cell-primary">{user.neighborhood}</span>
                                            </div>
                                            <div className="table-cell">
                                                {user.isPreferential ? (
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
                                    <div className="table-empty">No se encontraron usuarios</div>
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