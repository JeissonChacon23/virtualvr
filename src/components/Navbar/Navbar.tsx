/**
 * File: /src/components/Navbar/Navbar.tsx
 * VirtualVR - Main navigation component
 */

import { useState, useEffect } from 'react';
import { User, MessageCircle, ChevronDown, Menu, X } from 'lucide-react';
import LoginPanel from '../LoginPanel';
import SearchBar from '../SearchBar';
import SupportPanel from '../SupportPanel';
import './Navbar.css';

interface NavItem {
    label: string;
    hasDropdown?: boolean;
    isHighlighted?: boolean;
    dropdownItems?: string[];
    sectionId?: string;
}

const navItems: NavItem[] = [
    { label: 'Inicio', sectionId: 'hero-section' },
    { label: 'Servicios', sectionId: 'features-section' },
    { label: 'Tarifas', sectionId: 'user-types-section' },
    { label: 'Cómo Funciona', sectionId: 'how-it-works-section' },
    { label: 'Sé Domiciliario', isHighlighted: true, sectionId: 'user-types-section' },
];

const Navbar = () => {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isHidden, setIsHidden] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);

    // Función para scroll suave a sección
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
                setIsMobileMenuOpen(false); // Cerrar menú móvil al hacer scroll
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

    // Bloquear scroll cuando el login, support o menú móvil está abierto
    useEffect(() => {
        if (isLoginOpen || isMobileMenuOpen || isSupportOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isLoginOpen, isMobileMenuOpen, isSupportOpen]);

    // Cerrar búsqueda al hacer scroll
    useEffect(() => {
        if (isSearchExpanded && lastScrollY > 50) {
            setIsSearchExpanded(false);
        }
    }, [lastScrollY]);

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
                            <span className="logo-tagline">Smarter by Design</span>
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
                                    onClick={() => item.sectionId && scrollToSection(item.sectionId)}
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
                        <SearchBar
                            isExpanded={isSearchExpanded}
                            onToggle={() => setIsSearchExpanded(true)}
                            onClose={() => setIsSearchExpanded(false)}
                        />
                        <button
                            className={`action-btn ${isLoginOpen ? 'action-btn-active' : ''}`}
                            aria-label="Account"
                            onClick={handleLoginOpen}
                        >
                            <User size={22} strokeWidth={1.5} />
                        </button>
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
            </div>

            {/* Login Panel */}
            <LoginPanel isOpen={isLoginOpen} onClose={handleLoginClose} />

            {/* Support Panel */}
            <SupportPanel isOpen={isSupportOpen} onClose={handleSupportClose} />
        </>
    );
};

export default Navbar;