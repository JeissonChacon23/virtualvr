/**
 * File: /src/components/ProfilePanel/ProfilePanel.tsx
 * VirtualVR - User profile panel component
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
    Save
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase.config';
import { useAuth } from '../../context/AuthContext';
import './ProfilePanel.css';

interface ProfilePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UserProfile {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    neighborhood: string;
    idCard: string;
    registerDate: Date | null;
    isActive: boolean;
    isPreferential: boolean;
    profileImageURL?: string;
}

const ProfilePanel = ({ isOpen, onClose }: ProfilePanelProps) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({
        phone: '',
        address: '',
        neighborhood: ''
    });

    // Cargar datos completos del usuario desde Firestore
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.uid) return;

            setIsLoading(true);
            try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const profileData = {
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        email: data.email || '',
                        phone: data.phone || '',
                        address: data.address || '',
                        neighborhood: data.neighborhood || '',
                        idCard: data.idCard || '',
                        registerDate: data.registerDate?.toDate() || null,
                        isActive: data.isActive ?? true,
                        isPreferential: data.isPreferential ?? false,
                        profileImageURL: data.profileImageURL
                    };
                    setProfile(profileData);
                    setEditData({
                        phone: profileData.phone,
                        address: profileData.address,
                        neighborhood: profileData.neighborhood
                    });
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
    }, [isOpen, user?.uid]);

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

    const handleSave = async () => {
        if (!user?.uid) return;

        setIsSaving(true);
        try {
            const docRef = doc(db, 'users', user.uid);
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
                                <div className="profile-avatar">
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
                                {profile.isActive && (
                                    <span className="profile-badge active">
                    <Check size={12} />
                    Cuenta activa
                  </span>
                                )}
                                {profile.isPreferential && (
                                    <span className="profile-badge preferential">
                    <Shield size={12} />
                    Cliente preferencial
                  </span>
                                )}
                            </div>
                        </div>

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