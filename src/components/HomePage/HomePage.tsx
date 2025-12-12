/**
 * File: /src/components/HomePage/HomePage.tsx
 * VirtualVR - Home page content component
 */

import {
    Truck,
    MapPin,
    Clock,
    Shield,
    Smartphone,
    Users,
    Package,
    Star,
    Zap,
    HeadphonesIcon
} from 'lucide-react';
import './HomePage.css';

const HomePage = () => {
    return (
        <main className="home">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <span className="hero-badge">🚀 Nueva Plataforma</span>
                    <h1 className="hero-title">
                        Entregas rápidas y seguras en <span className="hero-highlight">Cúcuta</span>
                    </h1>
                    <p className="hero-description">
                        VirtualVR conecta usuarios, domiciliarios y negocios en una sola plataforma.
                        Gestiona tus envíos de manera inteligente con seguimiento en tiempo real.
                    </p>
                    <div className="hero-stats">
                        <div className="stat-item">
                            <span className="stat-number">500+</span>
                            <span className="stat-label">Entregas diarias</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-number">50+</span>
                            <span className="stat-label">Domiciliarios activos</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-number">4.9</span>
                            <span className="stat-label">Calificación promedio</span>
                        </div>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="hero-card hero-card-1">
                        <MapPin size={24} className="hero-card-icon" />
                        <span>Seguimiento GPS</span>
                    </div>
                    <div className="hero-card hero-card-2">
                        <Clock size={24} className="hero-card-icon" />
                        <span>Tiempo real</span>
                    </div>
                    <div className="hero-card hero-card-3">
                        <Shield size={24} className="hero-card-icon" />
                        <span>Envíos seguros</span>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="section-header">
                    <span className="section-tag">Características</span>
                    <h2 className="section-title">Todo lo que necesitas en una sola app</h2>
                    <p className="section-description">
                        Diseñada para hacer tus entregas más eficientes, seguras y fáciles de gestionar.
                    </p>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">
                            <MapPin size={28} />
                        </div>
                        <h3 className="feature-title">Rastreo en tiempo real</h3>
                        <p className="feature-description">
                            Visualiza la ubicación exacta de tu pedido en el mapa mientras se dirige hacia ti.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">
                            <Zap size={28} />
                        </div>
                        <h3 className="feature-title">Entregas express</h3>
                        <p className="feature-description">
                            Recibe tus paquetes en tiempo récord con nuestra red de domiciliarios optimizada.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">
                            <Shield size={28} />
                        </div>
                        <h3 className="feature-title">Envíos asegurados</h3>
                        <p className="feature-description">
                            Todos los envíos cuentan con cobertura de protección para tu tranquilidad.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">
                            <Smartphone size={28} />
                        </div>
                        <h3 className="feature-title">App multiplataforma</h3>
                        <p className="feature-description">
                            Disponible en iOS, Android y Web. Gestiona desde cualquier dispositivo.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">
                            <Clock size={28} />
                        </div>
                        <h3 className="feature-title">Historial completo</h3>
                        <p className="feature-description">
                            Accede al registro detallado de todos tus envíos y transacciones anteriores.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">
                            <HeadphonesIcon size={28} />
                        </div>
                        <h3 className="feature-title">Soporte 24/7</h3>
                        <p className="feature-description">
                            Nuestro equipo está disponible para ayudarte en cualquier momento del día.
                        </p>
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className="how-it-works-section">
                <div className="section-header">
                    <span className="section-tag">¿Cómo funciona?</span>
                    <h2 className="section-title">Solicita tu entrega en 3 simples pasos</h2>
                </div>

                <div className="steps-container">
                    <div className="step-card">
                        <div className="step-number">1</div>
                        <div className="step-icon">
                            <Package size={32} />
                        </div>
                        <h3 className="step-title">Crea tu solicitud</h3>
                        <p className="step-description">
                            Ingresa los detalles de tu envío: dirección de recogida, destino y descripción del paquete.
                        </p>
                    </div>

                    <div className="step-connector" />

                    <div className="step-card">
                        <div className="step-number">2</div>
                        <div className="step-icon">
                            <Users size={32} />
                        </div>
                        <h3 className="step-title">Asignamos un domiciliario</h3>
                        <p className="step-description">
                            Nuestro sistema conecta tu solicitud con el domiciliario más cercano disponible.
                        </p>
                    </div>

                    <div className="step-connector" />

                    <div className="step-card">
                        <div className="step-number">3</div>
                        <div className="step-icon">
                            <Truck size={32} />
                        </div>
                        <h3 className="step-title">Recibe tu paquete</h3>
                        <p className="step-description">
                            Sigue el recorrido en tiempo real y recibe tu entrega de forma rápida y segura.
                        </p>
                    </div>
                </div>
            </section>

            {/* User Types Section */}
            <section className="user-types-section">
                <div className="section-header">
                    <span className="section-tag">Perfiles de Usuario</span>
                    <h2 className="section-title">Una plataforma, múltiples soluciones</h2>
                    <p className="section-description">
                        VirtualVR se adapta a las necesidades de cada tipo de usuario.
                    </p>
                </div>

                <div className="user-types-grid">
                    <div className="user-type-card">
                        <div className="user-type-header user-type-cliente">
                            <div className="user-type-icon">
                                <Users size={36} />
                            </div>
                            <h3 className="user-type-title">Usuario</h3>
                        </div>
                        <div className="user-type-content">
                            <p className="user-type-description">
                                Solicita entregas de manera fácil y rápida desde cualquier lugar de Cúcuta.
                            </p>
                            <ul className="user-type-features">
                                <li>Crear solicitudes de envío</li>
                                <li>Rastrear pedidos en tiempo real</li>
                                <li>Historial de entregas</li>
                                <li>Calificar el servicio</li>
                            </ul>
                        </div>
                    </div>

                    <div className="user-type-card user-type-featured">
                        <div className="user-type-header user-type-domiciliario">
                            <div className="user-type-icon">
                                <Truck size={36} />
                            </div>
                            <h3 className="user-type-title">Domiciliario</h3>
                        </div>
                        <div className="user-type-content">
                            <p className="user-type-description">
                                Únete a nuestra red de repartidores y genera ingresos con flexibilidad horaria.
                            </p>
                            <ul className="user-type-features">
                                <li>Recibir solicitudes de entrega</li>
                                <li>Navegación GPS integrada</li>
                                <li>Control de ganancias</li>
                                <li>Horarios flexibles</li>
                            </ul>
                        </div>
                    </div>

                    <div className="user-type-card">
                        <div className="user-type-header user-type-admin">
                            <div className="user-type-icon">
                                <Shield size={36} />
                            </div>
                            <h3 className="user-type-title">Administrador</h3>
                        </div>
                        <div className="user-type-content">
                            <p className="user-type-description">
                                Gestiona toda la operación con herramientas avanzadas de administración.
                            </p>
                            <ul className="user-type-features">
                                <li>Panel de control completo</li>
                                <li>Gestión de usuarios</li>
                                <li>Reportes y estadísticas</li>
                                <li>Aprobación de domiciliarios</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="testimonials-section">
                <div className="section-header">
                    <span className="section-tag">Testimonios</span>
                    <h2 className="section-title">Lo que dicen nuestros usuarios</h2>
                </div>

                <div className="testimonials-grid">
                    <div className="testimonial-card">
                        <div className="testimonial-stars">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={18} fill="#4CAF50" color="#4CAF50" />
                            ))}
                        </div>
                        <p className="testimonial-text">
                            "Excelente servicio, mis paquetes siempre llegan a tiempo. La app es muy fácil de usar y el rastreo en tiempo real me da mucha tranquilidad."
                        </p>
                        <div className="testimonial-author">
                            <div className="testimonial-avatar">MC</div>
                            <div className="testimonial-info">
                                <span className="testimonial-name">María Castellanos</span>
                                <span className="testimonial-role">Usuario frecuente</span>
                            </div>
                        </div>
                    </div>

                    <div className="testimonial-card">
                        <div className="testimonial-stars">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={18} fill="#4CAF50" color="#4CAF50" />
                            ))}
                        </div>
                        <p className="testimonial-text">
                            "Como domiciliario, VirtualVR me ha permitido organizar mejor mi tiempo y aumentar mis ingresos. La navegación GPS es muy precisa."
                        </p>
                        <div className="testimonial-author">
                            <div className="testimonial-avatar">CR</div>
                            <div className="testimonial-info">
                                <span className="testimonial-name">Carlos Rodríguez</span>
                                <span className="testimonial-role">Domiciliario verificado</span>
                            </div>
                        </div>
                    </div>

                    <div className="testimonial-card">
                        <div className="testimonial-stars">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={18} fill="#4CAF50" color="#4CAF50" />
                            ))}
                        </div>
                        <p className="testimonial-text">
                            "El panel de administración es muy completo. Puedo monitorear todas las operaciones y generar reportes detallados fácilmente."
                        </p>
                        <div className="testimonial-author">
                            <div className="testimonial-avatar">LP</div>
                            <div className="testimonial-info">
                                <span className="testimonial-name">Laura Pérez</span>
                                <span className="testimonial-role">Administradora</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default HomePage;