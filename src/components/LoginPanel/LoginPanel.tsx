/**
 * File: /src/components/LoginPanel/LoginPanel.tsx
 * VirtualVR - Login panel component
 */

import { useState } from 'react';
import { X, Mail, Lock } from 'lucide-react';
import './LoginPanel.css';

type UserType = 'usuario' | 'domiciliario' | 'administrador';

interface LoginPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginPanel = ({ isOpen, onClose }: LoginPanelProps) => {
    const [userType, setUserType] = useState<UserType>('usuario');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Login attempt:', { userType, email, password });
        // Aquí irá la lógica de autenticación
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className={`login-overlay ${isOpen ? 'login-overlay-active' : ''}`}
            onClick={handleOverlayClick}
        >
            <div className={`login-panel ${isOpen ? 'login-panel-active' : ''}`}>
                {/* Close Button */}
                <button className="login-close-btn" onClick={onClose} aria-label="Cerrar">
                    <X size={24} />
                </button>

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
                        onClick={() => setUserType('usuario')}
                    >
                        Usuario
                    </button>
                    <button
                        type="button"
                        className={`user-type-btn ${userType === 'domiciliario' ? 'user-type-btn-active' : ''}`}
                        onClick={() => setUserType('domiciliario')}
                    >
                        Domiciliario
                    </button>
                    <button
                        type="button"
                        className={`user-type-btn ${userType === 'administrador' ? 'user-type-btn-active' : ''}`}
                        onClick={() => setUserType('administrador')}
                    >
                        Administrador
                    </button>
                </div>

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
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Contraseña</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input
                                type="password"
                                id="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Forgot Password */}
                    <a href="#" className="forgot-password">
                        ¿Olvidaste tu contraseña?
                    </a>

                    {/* Submit Button */}
                    <button type="submit" className="login-submit-btn">
                        Iniciar sesión
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPanel;