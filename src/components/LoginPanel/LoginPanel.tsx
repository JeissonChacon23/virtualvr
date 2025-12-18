/**
 * File: /src/components/LoginPanel/LoginPanel.tsx
 * VirtualVR - Login panel component with registration
 */

import { useState } from 'react';
import { X, Mail, Lock, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import RegisterForm from '../RegisterForm';
import { authService } from '../../services/auth.service';
import type { UserRole } from '../../models';
import './LoginPanel.css';

type UserType = 'usuario' | 'domiciliario' | 'administrador';

interface LoginPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const USER_TYPE_TO_ROLE: Record<UserType, UserRole> = {
    'usuario': 'user',
    'domiciliario': 'delivery',
    'administrador': 'admin'
};

const LoginPanel = ({ isOpen, onClose }: LoginPanelProps) => {
    const [userType, setUserType] = useState<UserType>('usuario');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRegister, setShowRegister] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const role = USER_TYPE_TO_ROLE[userType];
            await authService.signIn({ email, password }, role);

            // Login exitoso
            setSuccessMessage('¡Bienvenido!');
            setTimeout(() => {
                onClose();
                setSuccessMessage(null);
                // Aquí podrías redirigir al dashboard según el rol
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleRegisterClick = () => {
        setShowRegister(true);
        setError(null);
    };

    const handleBackToLogin = () => {
        setShowRegister(false);
        setError(null);
    };

    const handleRegisterSuccess = () => {
        setShowRegister(false);
        setSuccessMessage(
            userType === 'domiciliario'
                ? '¡Registro exitoso! Tu cuenta está pendiente de aprobación.'
                : '¡Registro exitoso! Ya puedes iniciar sesión.'
        );
        setEmail('');
        setPassword('');

        setTimeout(() => {
            setSuccessMessage(null);
        }, 5000);
    };

    const handleUserTypeChange = (type: UserType) => {
        setUserType(type);
        setError(null);
        setShowRegister(false);
    };

    // No mostrar opción de registro para administrador
    const canRegister = userType !== 'administrador';

    return (
        <div
            className={`login-overlay ${isOpen ? 'login-overlay-active' : ''}`}
            onClick={handleOverlayClick}
        >
            <div className={`login-panel ${isOpen ? 'login-panel-active' : ''} ${showRegister ? 'login-panel-register' : ''}`}>
                {/* Close Button */}
                <button className="login-close-btn" onClick={onClose} aria-label="Cerrar">
                    <X size={24} />
                </button>

                {showRegister ? (
                    /* Register Form */
                    <RegisterForm
                        userType={USER_TYPE_TO_ROLE[userType]}
                        onBack={handleBackToLogin}
                        onSuccess={handleRegisterSuccess}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <div className="login-header">
                            <div className="login-logo">
                                <svg viewBox="0 0 24 24" fill="none" className="login-logo-svg">
                                    <circle cx="12" cy="12" r="10" fill="#4CAF50"/>
                                    <circle cx="12" cy="12" r="4" fill="white"/>
                                </svg>
                            </div>
                            <h1 className="login-title">Virtual VR</h1>
                            <p className="login-subtitle">Inicia sesión en tu cuenta</p>
                        </div>

                        {/* User Type Selector */}
                        <div className="user-type-selector">
                            <button
                                type="button"
                                className={`user-type-btn ${userType === 'usuario' ? 'user-type-btn-active' : ''}`}
                                onClick={() => handleUserTypeChange('usuario')}
                            >
                                Usuario
                            </button>
                            <button
                                type="button"
                                className={`user-type-btn ${userType === 'domiciliario' ? 'user-type-btn-active' : ''}`}
                                onClick={() => handleUserTypeChange('domiciliario')}
                            >
                                Domiciliario
                            </button>
                            <button
                                type="button"
                                className={`user-type-btn ${userType === 'administrador' ? 'user-type-btn-active' : ''}`}
                                onClick={() => handleUserTypeChange('administrador')}
                            >
                                Admin
                            </button>
                        </div>

                        {/* Success Message */}
                        {successMessage && (
                            <div className="login-success">
                                <CheckCircle size={18} />
                                <span>{successMessage}</span>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="login-error">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Login Form */}
                        <form className="login-form" onSubmit={handleSubmit}>
                            {/* Email Field */}
                            <div className="form-group">
                                <label htmlFor="email" className="form-label">Correo electrónico</label>
                                <div className="input-wrapper">
                                    <Mail size={18} className="input-icon" />
                                    <input
                                        type="email"
                                        id="email"
                                        className="form-input"
                                        placeholder="correo@ejemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="form-group">
                                <label htmlFor="password" className="form-label">Contraseña</label>
                                <div className="input-wrapper">
                                    <Lock size={18} className="input-icon" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        className="form-input form-input-password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Forgot Password */}
                            <a href="#" className="forgot-password">
                                ¿Olvidaste tu contraseña?
                            </a>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="login-submit-btn"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="spinning" />
                                        <span>Iniciando sesión...</span>
                                    </>
                                ) : (
                                    <span>Iniciar sesión</span>
                                )}
                            </button>
                        </form>

                        {/* Register Toggle - Solo para usuario y domiciliario */}
                        {canRegister && (
                            <div className="login-register-toggle">
                                <span>¿No tienes cuenta?</span>
                                <button
                                    type="button"
                                    className="register-link"
                                    onClick={handleRegisterClick}
                                >
                                    Regístrate
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default LoginPanel;