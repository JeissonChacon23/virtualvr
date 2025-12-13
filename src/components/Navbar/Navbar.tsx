/**
 * File: /src/components/Navbar/Navbar.tsx
 * VirtualVR - Main navigation component with auth support
 */

import { useState, useEffect } from 'react';
import { User, MessageCircle, ChevronDown, Menu, X, LogOut, Settings, Truck } from 'lucide-react';
import LoginPanel from '../LoginPanel';
import SearchBar from '../SearchBar';
import SupportPanel from '../SupportPanel';
import ProfilePanel from '../ProfilePanel';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

interface NavItem {
    label: string;
    hasDropdown?: boolean;
    isHighlighted?: boolean;
    dropdownItems?: string[];
    sectionId?: string;
    onClick?: () => void;
}

// Nav items para visitantes (no logueados)
const publicNavItems: NavItem[] = [
    { label: 'Inicio', sectionId: 'hero-section' },
    { label: 'Servicios', sectionId: 'features-section' },
    { label: 'Tarifas', sectionId: 'user-types-section' },
    { label: 'Cómo Funciona', sectionId: 'how-it-works-section' },
    { label: 'Sé Domiciliario', isHighlighted: true, sectionId: 'user-types-section' },
];

// Nav items para usuarios
const userNavItems: NavItem[] = [
    { label: 'Inicio' },
    { label: 'Pedidos' },
];

// Nav items para domiciliarios
const deliveryNavItems: NavItem[] = [
    { label: 'Inicio' },
    { label: 'Mis Entregas' },
    { label: 'Ganancias' },
    { label: 'Mi Perfil' },
];

// Nav items para administradores
const adminNavItems: NavItem[] = [
    { label: 'Resumen' },
    { label: 'Domiciliarios' },
    { label: 'Usuarios' },
    { label: 'Configuración' },
];

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isHidden, setIsHidden] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Obtener items de navegación según el rol
    const getNavItems = (): NavItem[] => {
        if (!isAuthenticated || !user) return publicNavItems;

        switch (user.role) {
            case 'user':
                return userNavItems;
            case 'delivery':
                return deliveryNavItems;
            case 'admin':
                return adminNavItems;
            default:
                return publicNavItems;
        }
    };

    const navItems = getNavItems();

    // Función para scroll suave a sección (solo para visitantes)
    const scrollToSection = (sectionId: string) => {
        const section = document.querySelector(`.${sectionId}`);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setIsMobileMenuOpen(false);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY < 10) {
                setIsHidden(false);
            }
            else if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsHidden(true);
                setIsMobileMenuOpen(false);
                setIsUserMenuOpen(false);
            }
            else if (currentScrollY < lastScrollY) {
                setIsHidden(false);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [lastScrollY]);

    // Bloquear scroll cuando el login, support, profile o menú móvil está abierto
    useEffect(() => {
        if (isLoginOpen || isMobileMenuOpen || isSupportOpen || isProfileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isLoginOpen, isMobileMenuOpen, isSupportOpen, isProfileOpen]);

    // Cerrar búsqueda al hacer scroll
    useEffect(() => {
        if (isSearchExpanded && lastScrollY > 50) {
            setIsSearchExpanded(false);
        }
    }, [lastScrollY, isSearchExpanded]);

    // Cerrar menú de usuario al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.user-menu-container')) {
                setIsUserMenuOpen(false);
            }
        };

        if (isUserMenuOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isUserMenuOpen]);

    const handleMouseEnter = (label: string) => {
        setActiveDropdown(label);
    };

    const handleMouseLeave = () => {
        setActiveDropdown(null);
    };

    const handleLoginOpen = () => {
        setIsLoginOpen(true);
        setIsMobileMenuOpen(false);
        setIsSupportOpen(false);
    };

    const handleLoginClose = () => {
        setIsLoginOpen(false);
    };

    const handleSupportOpen = () => {
        setIsSupportOpen(true);
        setIsMobileMenuOpen(false);
        setIsLoginOpen(false);
    };

    const handleSupportClose = () => {
        setIsSupportOpen(false);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const toggleMobileDropdown = (label: string) => {
        setActiveDropdown(activeDropdown === label ? null : label);
    };

    const handleLogout = async () => {
        setIsUserMenuOpen(false);
        await logout();
    };

    const getRoleLabel = () => {
        if (!user) return '';
        switch (user.role) {
            case 'user': return 'Usuario';
            case 'delivery': return 'Domiciliario';
            case 'admin': return 'Administrador';
            default: return '';
        }
    };

    const getRoleIcon = () => {
        if (!user) return <User size={18} />;
        switch (user.role) {
            case 'user': return <User size={18} />;
            case 'delivery': return <Truck size={18} />;
            case 'admin': return <Settings size={18} />;
            default: return <User size={18} />;
        }
    };

    return (
        <>
            <header className={`navbar ${isHidden ? 'navbar-hidden' : ''}`}>
                <div className="navbar-container">
                    {/* Logo */}
                    <div className="navbar-logo">
                        <div className="logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" className="logo-svg">
                                <circle cx="12" cy="12" r="10" fill="#4CAF50"/>
                                <circle cx="12" cy="12" r="4" fill="white"/>
                            </svg>
                        </div>
                        <div className="logo-text">
                            <span className="logo-name">VirtualVR</span>
                            <span className="logo-tagline">
                {isAuthenticated ? getRoleLabel() : 'Smarter by Design'}
              </span>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="navbar-nav">
                        {navItems.map((item) => (
                            <div
                                key={item.label}
                                className="nav-item-wrapper"
                                onMouseEnter={() => item.hasDropdown && handleMouseEnter(item.label)}
                                onMouseLeave={handleMouseLeave}
                            >
                                <button
                                    className={`nav-item ${item.isHighlighted ? 'nav-item-highlighted' : ''} ${activeDropdown === item.label && item.hasDropdown ? 'nav-item-active' : ''}`}
                                    onClick={() => {
                                        if (item.sectionId) {
                                            scrollToSection(item.sectionId);
                                        } else if (item.onClick) {
                                            item.onClick();
                                        } else if (isAuthenticated) {
                                            // Emitir evento de navegación para dashboards
                                            window.dispatchEvent(new CustomEvent('user-navigate', {
                                                detail: { view: item.label }
                                            }));
                                        }
                                    }}
                                >
                                    {item.label}
                                    {item.hasDropdown && (
                                        <ChevronDown
                                            size={16}
                                            className={`dropdown-icon ${activeDropdown === item.label ? 'dropdown-icon-active' : ''}`}
                                        />
                                    )}
                                </button>

                                {item.hasDropdown && item.dropdownItems && (
                                    <div className={`dropdown-menu ${activeDropdown === item.label ? 'dropdown-menu-active' : ''}`}>
                                        {item.dropdownItems.map((dropdownItem) => (
                                            <a key={dropdownItem} href="#" className="dropdown-item">
                                                {dropdownItem}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* Actions */}
                    <div className="navbar-actions">
                        {!isAuthenticated && (
                            <SearchBar
                                isExpanded={isSearchExpanded}
                                onToggle={() => setIsSearchExpanded(true)}
                                onClose={() => setIsSearchExpanded(false)}
                            />
                        )}

                        {isAuthenticated ? (
                            /* User Menu for authenticated users */
                            <div className="user-menu-container">
                                <button
                                    className={`user-menu-btn ${isUserMenuOpen ? 'active' : ''}`}
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                >
                                    <div className="user-avatar">
                                        {user?.firstName?.charAt(0) || 'U'}
                                    </div>
                                    <span className="user-name">{user?.firstName || 'Usuario'}</span>
                                    <ChevronDown size={16} className={`user-menu-chevron ${isUserMenuOpen ? 'rotated' : ''}`} />
                                </button>

                                {isUserMenuOpen && (
                                    <div className="user-menu-dropdown">
                                        <div className="user-menu-header">
                                            <div className="user-menu-avatar">
                                                {user?.firstName?.charAt(0) || 'U'}
                                            </div>
                                            <div className="user-menu-info">
                                                <span className="user-menu-name">{user?.firstName} {user?.lastName}</span>
                                                <span className="user-menu-email">{user?.email}</span>
                                            </div>
                                        </div>
                                        <div className="user-menu-divider"></div>
                                        <button className="user-menu-item" onClick={() => {
                                            setIsUserMenuOpen(false);
                                            setIsProfileOpen(true);
                                        }}>
                                            {getRoleIcon()}
                                            <span>Mi Perfil</span>
                                        </button>
                                        <div className="user-menu-divider"></div>
                                        <button className="user-menu-item logout" onClick={handleLogout}>
                                            <LogOut size={18} />
                                            <span>Cerrar Sesión</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Login button for non-authenticated users */
                            <button
                                className={`action-btn ${isLoginOpen ? 'action-btn-active' : ''}`}
                                aria-label="Account"
                                onClick={handleLoginOpen}
                            >
                                <User size={22} strokeWidth={1.5} />
                            </button>
                        )}

                        <button
                            className={`action-btn action-btn-chat ${isSupportOpen ? 'action-btn-active' : ''}`}
                            aria-label="Soporte"
                            onClick={handleSupportOpen}
                        >
                            <MessageCircle size={22} strokeWidth={1.5} />
                        </button>

                        {/* Mobile Menu Button */}
                        <button
                            className={`action-btn mobile-menu-btn ${isMobileMenuOpen ? 'action-btn-active' : ''}`}
                            aria-label="Menu"
                            onClick={toggleMobileMenu}
                        >
                            {isMobileMenuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            <div
                className={`mobile-menu-overlay ${isMobileMenuOpen ? 'mobile-menu-overlay-active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu */}
            <div className={`mobile-menu ${isMobileMenuOpen ? 'mobile-menu-active' : ''}`}>
                {isAuthenticated && (
                    <div className="mobile-user-header">
                        <div className="mobile-user-avatar">
                            {user?.firstName?.charAt(0) || 'U'}
                        </div>
                        <div className="mobile-user-info">
                            <span className="mobile-user-name">{user?.firstName} {user?.lastName}</span>
                            <span className="mobile-user-role">{getRoleLabel()}</span>
                        </div>
                    </div>
                )}

                <nav className="mobile-nav">
                    {navItems.map((item) => (
                        <div key={item.label} className="mobile-nav-item-wrapper">
                            <button
                                className={`mobile-nav-item ${item.isHighlighted ? 'mobile-nav-item-highlighted' : ''}`}
                                onClick={() => {
                                    if (item.hasDropdown) {
                                        toggleMobileDropdown(item.label);
                                    } else if (item.sectionId) {
                                        scrollToSection(item.sectionId);
                                    } else if (isAuthenticated) {
                                        // Emitir evento de navegación para dashboards
                                        window.dispatchEvent(new CustomEvent('user-navigate', {
                                            detail: { view: item.label }
                                        }));
                                        setIsMobileMenuOpen(false);
                                    }
                                }}
                            >
                                {item.label}
                                {item.hasDropdown && (
                                    <ChevronDown
                                        size={20}
                                        className={`mobile-dropdown-icon ${activeDropdown === item.label ? 'mobile-dropdown-icon-active' : ''}`}
                                    />
                                )}
                            </button>

                            {item.hasDropdown && item.dropdownItems && (
                                <div className={`mobile-dropdown ${activeDropdown === item.label ? 'mobile-dropdown-active' : ''}`}>
                                    {item.dropdownItems.map((dropdownItem) => (
                                        <a key={dropdownItem} href="#" className="mobile-dropdown-item">
                                            {dropdownItem}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {isAuthenticated && (
                    <div className="mobile-menu-footer">
                        <button className="mobile-logout-btn" onClick={handleLogout}>
                            <LogOut size={20} />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Login Panel */}
            <LoginPanel isOpen={isLoginOpen} onClose={handleLoginClose} />

            {/* Support Panel */}
            <SupportPanel isOpen={isSupportOpen} onClose={handleSupportClose} />

            {/* Profile Panel */}
            <ProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </>
    );
};

export default Navbar;