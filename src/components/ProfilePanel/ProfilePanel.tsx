/**
 * File: /src/components/ProfilePanel/ProfilePanel.tsx
 * VirtualVR - User/Delivery profile panel component
 */

import { useState, useEffect } from 'react';
import {
    X,
    User,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    Calendar,
    Check,
    Camera,
    Shield,
    Save,
    Truck,
    Car,
    Bike
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase.config';
import { useAuth } from '../../context/AuthContext';
import './ProfilePanel.css';

interface ProfilePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface BaseProfile {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    neighborhood: string;
    idCard: string;
    registerDate: Date | null;
    isActive: boolean;
    profileImageURL?: string;
}

interface UserProfile extends BaseProfile {
    type: 'user';
    isPreferential: boolean;
}

interface DeliveryProfile extends BaseProfile {
    type: 'delivery';
    vehicleType: string;
    vehiclePlate: string;
    isApproved: boolean;
}

interface AdminProfile extends BaseProfile {
    type: 'admin';
}

type Profile = UserProfile | DeliveryProfile | AdminProfile;

const ProfilePanel = ({ isOpen, onClose }: ProfilePanelProps) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({
        phone: '',
        address: '',
        neighborhood: ''
    });

    // Determinar la colección según el rol
    const getCollectionName = (): string => {
        if (!user?.role) return 'users';
        switch (user.role) {
            case 'delivery': return 'deliveries';
            case 'admin': return 'admins';
            default: return 'users';
        }
    };

    // Cargar datos completos del usuario desde Firestore
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.uid || !user?.role) {
                console.log('ProfilePanel: No user uid or role', { uid: user?.uid, role: user?.role });
                setIsLoading(false);
                return;
            }

            // Determinar la colección según el rol
            let collectionName = 'users';
            if (user.role === 'delivery') {
                collectionName = 'deliveries';
            } else if (user.role === 'admin') {
                collectionName = 'admins';
            }

            console.log('ProfilePanel: Fetching from', collectionName, 'for uid:', user.uid);

            setIsLoading(true);
            try {
                const docRef = doc(db, collectionName, user.uid);
                const docSnap = await getDoc(docRef);

                console.log('ProfilePanel: Doc exists?', docSnap.exists());

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    console.log('ProfilePanel: Data retrieved', data);

                    const baseProfile = {
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        email: data.email || '',
                        phone: data.phone || '',
                        address: data.address || '',
                        neighborhood: data.neighborhood || '',
                        idCard: data.idCard || '',
                        registerDate: data.registerDate?.toDate() || null,
                        isActive: data.isActive ?? true,
                        profileImageURL: data.profileImageURL
                    };

                    let profileData: Profile;

                    if (user.role === 'delivery') {
                        profileData = {
                            ...baseProfile,
                            type: 'delivery',
                            vehicleType: data.vehicleType || '',
                            vehiclePlate: data.vehiclePlate || '',
                            isApproved: data.isApproved ?? false
                        };
                    } else if (user.role === 'admin') {
                        profileData = {
                            ...baseProfile,
                            type: 'admin'
                        };
                    } else {
                        profileData = {
                            ...baseProfile,
                            type: 'user',
                            isPreferential: data.isPreferential ?? false
                        };
                    }

                    setProfile(profileData);
                    setEditData({
                        phone: baseProfile.phone,
                        address: baseProfile.address,
                        neighborhood: baseProfile.neighborhood
                    });
                } else {
                    console.log('ProfilePanel: Document not found');
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen) {
            fetchProfile();
            setIsEditing(false);
        }
    }, [isOpen, user?.uid, user?.role]);

    const formatDate = (date: Date | null): string => {
        if (!date) return 'No disponible';
        return date.toLocaleDateString('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getInitials = (): string => {
        if (!profile) return 'U';
        return `${profile.firstName?.charAt(0) || ''}${profile.lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const getVehicleIcon = (vehicleType: string) => {
        switch (vehicleType) {
            case 'motorcycle': return <Bike size={18} />;
            case 'car': return <Car size={18} />;
            default: return <Truck size={18} />;
        }
    };

    const getVehicleLabel = (vehicleType: string): string => {
        switch (vehicleType) {
            case 'motorcycle': return 'Motocicleta';
            case 'car': return 'Automóvil';
            case 'bicycle': return 'Bicicleta';
            default: return vehicleType;
        }
    };

    const getRoleLabel = (): string => {
        if (!profile) return '';
        switch (profile.type) {
            case 'delivery': return 'Domiciliario';
            case 'admin': return 'Administrador';
            default: return 'Usuario';
        }
    };

    const handleSave = async () => {
        if (!user?.uid) return;

        setIsSaving(true);
        try {
            const collectionName = getCollectionName();
            const docRef = doc(db, collectionName, user.uid);
            await updateDoc(docRef, {
                phone: editData.phone,
                address: editData.address,
                neighborhood: editData.neighborhood
            });

            setProfile(prev => prev ? {
                ...prev,
                phone: editData.phone,
                address: editData.address,
                neighborhood: editData.neighborhood
            } : null);

            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error al guardar los cambios');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (profile) {
            setEditData({
                phone: profile.phone,
                address: profile.address,
                neighborhood: profile.neighborhood
            });
        }
        setIsEditing(false);
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`profile-overlay ${isOpen ? 'profile-overlay-visible' : ''}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`profile-panel ${isOpen ? 'profile-panel-open' : ''}`}>
                {/* Close Button */}
                <button className="profile-close-btn" onClick={onClose} aria-label="Cerrar">
                    <X size={24} />
                </button>

                {isLoading ? (
                    <div className="profile-loading">
                        <div className="profile-spinner"></div>
                        <span>Cargando perfil...</span>
                    </div>
                ) : profile ? (
                    <>
                        {/* Header with Avatar */}
                        <div className="profile-header">
                            <div className="profile-avatar-container">
                                <div className={`profile-avatar ${profile.type}`}>
                                    {profile.profileImageURL ? (
                                        <img src={profile.profileImageURL} alt="Avatar" />
                                    ) : (
                                        <span>{getInitials()}</span>
                                    )}
                                </div>
                                <button className="profile-avatar-edit" aria-label="Cambiar foto">
                                    <Camera size={16} />
                                </button>
                            </div>
                            <h2 className="profile-name">{profile.firstName} {profile.lastName}</h2>
                            <p className="profile-email">{profile.email}</p>
                            <div className="profile-badges">
                <span className={`profile-badge role ${profile.type}`}>
                  {profile.type === 'delivery' ? <Truck size={12} /> : <User size={12} />}
                    {getRoleLabel()}
                </span>
                                {profile.isActive && (
                                    <span className="profile-badge active">
                    <Check size={12} />
                    Activo
                  </span>
                                )}
                                {profile.type === 'user' && profile.isPreferential && (
                                    <span className="profile-badge preferential">
                    <Shield size={12} />
                    Preferencial
                  </span>
                                )}
                                {profile.type === 'delivery' && profile.isApproved && (
                                    <span className="profile-badge approved">
                    <Shield size={12} />
                    Aprobado
                  </span>
                                )}
                                {profile.type === 'delivery' && !profile.isApproved && (
                                    <span className="profile-badge pending">
                    <Shield size={12} />
                    Pendiente
                  </span>
                                )}
                            </div>
                        </div>

                        {/* Vehicle Info for Delivery */}
                        {profile.type === 'delivery' && (
                            <div className="profile-section">
                                <h3 className="profile-section-title">Información del vehículo</h3>
                                <div className="profile-info-list">
                                    <div className="profile-info-item">
                                        <div className="profile-info-icon vehicle">
                                            {getVehicleIcon(profile.vehicleType)}
                                        </div>
                                        <div className="profile-info-content">
                                            <span className="profile-info-label">Tipo de vehículo</span>
                                            <span className="profile-info-value">{getVehicleLabel(profile.vehicleType)}</span>
                                        </div>
                                    </div>

                                    <div className="profile-info-item">
                                        <div className="profile-info-icon vehicle">
                                            <CreditCard size={18} />
                                        </div>
                                        <div className="profile-info-content">
                                            <span className="profile-info-label">Placa</span>
                                            <span className="profile-info-value plate">{profile.vehiclePlate}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Personal Info Section */}
                        <div className="profile-section">
                            <h3 className="profile-section-title">Información personal</h3>

                            <div className="profile-info-list">
                                <div className="profile-info-item">
                                    <div className="profile-info-icon">
                                        <User size={18} />
                                    </div>
                                    <div className="profile-info-content">
                                        <span className="profile-info-label">Nombre completo</span>
                                        <span className="profile-info-value">{profile.firstName} {profile.lastName}</span>
                                    </div>
                                </div>

                                <div className="profile-info-item">
                                    <div className="profile-info-icon">
                                        <Mail size={18} />
                                    </div>
                                    <div className="profile-info-content">
                                        <span className="profile-info-label">Correo electrónico</span>
                                        <span className="profile-info-value">{profile.email}</span>
                                    </div>
                                </div>

                                <div className="profile-info-item">
                                    <div className="profile-info-icon">
                                        <CreditCard size={18} />
                                    </div>
                                    <div className="profile-info-content">
                                        <span className="profile-info-label">Cédula</span>
                                        <span className="profile-info-value">{profile.idCard || 'No registrada'}</span>
                                    </div>
                                </div>

                                <div className="profile-info-item">
                                    <div className="profile-info-icon">
                                        <Calendar size={18} />
                                    </div>
                                    <div className="profile-info-content">
                                        <span className="profile-info-label">Miembro desde</span>
                                        <span className="profile-info-value">{formatDate(profile.registerDate)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Editable Section */}
                        <div className="profile-section">
                            <div className="profile-section-header">
                                <h3 className="profile-section-title">Contacto y dirección</h3>
                                {!isEditing && (
                                    <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
                                        Editar
                                    </button>
                                )}
                            </div>

                            <div className="profile-info-list">
                                <div className="profile-info-item">
                                    <div className="profile-info-icon">
                                        <Phone size={18} />
                                    </div>
                                    <div className="profile-info-content">
                                        <span className="profile-info-label">Teléfono</span>
                                        {isEditing ? (
                                            <input
                                                type="tel"
                                                className="profile-input"
                                                value={editData.phone}
                                                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                                placeholder="Ingresa tu teléfono"
                                            />
                                        ) : (
                                            <span className="profile-info-value">{profile.phone || 'No registrado'}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="profile-info-item">
                                    <div className="profile-info-icon">
                                        <MapPin size={18} />
                                    </div>
                                    <div className="profile-info-content">
                                        <span className="profile-info-label">Dirección</span>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                className="profile-input"
                                                value={editData.address}
                                                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                                placeholder="Ingresa tu dirección"
                                            />
                                        ) : (
                                            <span className="profile-info-value">{profile.address || 'No registrada'}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="profile-info-item">
                                    <div className="profile-info-icon">
                                        <MapPin size={18} />
                                    </div>
                                    <div className="profile-info-content">
                                        <span className="profile-info-label">Barrio</span>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                className="profile-input"
                                                value={editData.neighborhood}
                                                onChange={(e) => setEditData({ ...editData, neighborhood: e.target.value })}
                                                placeholder="Ingresa tu barrio"
                                            />
                                        ) : (
                                            <span className="profile-info-value">{profile.neighborhood || 'No registrado'}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {isEditing && (
                                <div className="profile-edit-actions">
                                    <button className="profile-cancel-btn" onClick={handleCancel} disabled={isSaving}>
                                        Cancelar
                                    </button>
                                    <button className="profile-save-btn" onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <div className="btn-spinner"></div>
                                                <span>Guardando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                <span>Guardar</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Security Section */}
                        <div className="profile-section">
                            <h3 className="profile-section-title">Seguridad</h3>
                            <button className="profile-password-btn">
                                Cambiar contraseña
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="profile-error">
                        <User size={48} />
                        <p>No se pudo cargar el perfil</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default ProfilePanel;