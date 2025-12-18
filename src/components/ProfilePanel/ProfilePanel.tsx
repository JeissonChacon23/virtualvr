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
    Bike,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase.config';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
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

    // Estados para cambio de contraseña
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

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

    // Funciones para cambio de contraseña
    const openPasswordModal = () => {
        setShowPasswordModal(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setPasswordError(null);
        setPasswordSuccess(false);
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    const closePasswordModal = () => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setPasswordError(null);
        setPasswordSuccess(false);
    };

    const handleChangePassword = async () => {
        setPasswordError(null);

        // Validaciones
        if (!currentPassword) {
            setPasswordError('Ingresa tu contraseña actual');
            return;
        }

        if (!newPassword) {
            setPasswordError('Ingresa la nueva contraseña');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setPasswordError('Las contraseñas no coinciden');
            return;
        }

        if (currentPassword === newPassword) {
            setPasswordError('La nueva contraseña debe ser diferente a la actual');
            return;
        }

        setIsChangingPassword(true);

        try {
            await authService.changePassword(currentPassword, newPassword);
            setPasswordSuccess(true);

            // Cerrar modal después de 2 segundos
            setTimeout(() => {
                closePasswordModal();
            }, 2000);
        } catch (error) {
            setPasswordError(error instanceof Error ? error.message : 'Error al cambiar la contraseña');
        } finally {
            setIsChangingPassword(false);
        }
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
                            <button className="profile-password-btn" onClick={openPasswordModal}>
                                <Lock size={18} />
                                <span>Cambiar contraseña</span>
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

            {/* Modal de cambio de contraseña */}
            {showPasswordModal && (
                <div className="password-modal-overlay" onClick={closePasswordModal}>
                    <div className="password-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="password-modal-close" onClick={closePasswordModal}>
                            <X size={20} />
                        </button>

                        <div className="password-modal-header">
                            <div className="password-modal-icon">
                                <Lock size={24} />
                            </div>
                            <h3>Cambiar contraseña</h3>
                            <p>Ingresa tu contraseña actual y la nueva contraseña</p>
                        </div>

                        {/* Mensaje de éxito */}
                        {passwordSuccess && (
                            <div className="password-success">
                                <CheckCircle size={18} />
                                <span>¡Contraseña actualizada correctamente!</span>
                            </div>
                        )}

                        {/* Mensaje de error */}
                        {passwordError && (
                            <div className="password-error">
                                <AlertCircle size={18} />
                                <span>{passwordError}</span>
                            </div>
                        )}

                        {!passwordSuccess && (
                            <>
                                <div className="password-form">
                                    {/* Contraseña actual */}
                                    <div className="password-field">
                                        <label>Contraseña actual</label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="Ingresa tu contraseña actual"
                                                disabled={isChangingPassword}
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            >
                                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Nueva contraseña */}
                                    <div className="password-field">
                                        <label>Nueva contraseña</label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Mínimo 6 caracteres"
                                                disabled={isChangingPassword}
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                            >
                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirmar nueva contraseña */}
                                    <div className="password-field">
                                        <label>Confirmar nueva contraseña</label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                placeholder="Repite tu nueva contraseña"
                                                disabled={isChangingPassword}
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="password-modal-actions">
                                    <button
                                        className="password-cancel-btn"
                                        onClick={closePasswordModal}
                                        disabled={isChangingPassword}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="password-submit-btn"
                                        onClick={handleChangePassword}
                                        disabled={isChangingPassword}
                                    >
                                        {isChangingPassword ? (
                                            <>
                                                <Loader2 size={18} className="spinning" />
                                                <span>Cambiando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check size={18} />
                                                <span>Cambiar contraseña</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ProfilePanel;