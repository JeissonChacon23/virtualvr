/**
 * File: /src/components/Footer/Footer.tsx
 * VirtualVR - Footer component
 */

import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-brand">
                    <div className="footer-logo">
                        <svg viewBox="0 0 24 24" fill="none" className="footer-logo-svg">
                            <circle cx="12" cy="12" r="10" fill="#4CAF50"/>
                            <circle cx="12" cy="12" r="4" fill="white"/>
                        </svg>
                        <span className="footer-logo-text">VirtualVR</span>
                    </div>
                    <p className="footer-tagline">Smarter by Design</p>
                </div>

                <div className="footer-divider" />

                <div className="footer-bottom">
                    <p className="footer-copyright">
                        © 2026 <span className="footer-company">Robles Tecnología +</span>. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;