/**
 * File: /src/components/SearchBar/SearchBar.tsx
 * VirtualVR - Expandable search bar component
 */

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import './SearchBar.css';

// Datos de búsqueda indexados
const searchableContent = [
    {
        id: 'hero',
        title: 'Entregas en Cúcuta',
        description: 'Entregas rápidas y seguras en Cúcuta. VirtualVR conecta usuarios, domiciliarios y negocios.',
        section: 'hero-section',
        keywords: ['entregas', 'cúcuta', 'rápidas', 'seguras', 'domiciliarios', 'negocios']
    },
    {
        id: 'feature-rastreo',
        title: 'Rastreo en tiempo real',
        description: 'Visualiza la ubicación exacta de tu pedido en el mapa mientras se dirige hacia ti.',
        section: 'features-section',
        keywords: ['rastreo', 'ubicación', 'mapa', 'tiempo real', 'gps']
    },
    {
        id: 'feature-express',
        title: 'Entregas express',
        description: 'Recibe tus paquetes en tiempo récord con nuestra red de domiciliarios optimizada.',
        section: 'features-section',
        keywords: ['express', 'rápido', 'paquetes', 'domiciliarios']
    },
    {
        id: 'feature-seguros',
        title: 'Envíos asegurados',
        description: 'Todos los envíos cuentan con cobertura de protección para tu tranquilidad.',
        section: 'features-section',
        keywords: ['seguros', 'asegurados', 'protección', 'cobertura']
    },
    {
        id: 'feature-app',
        title: 'App multiplataforma',
        description: 'Disponible en iOS, Android y Web. Gestiona desde cualquier dispositivo.',
        section: 'features-section',
        keywords: ['app', 'ios', 'android', 'web', 'multiplataforma', 'dispositivo']
    },
    {
        id: 'feature-historial',
        title: 'Historial completo',
        description: 'Accede al registro detallado de todos tus envíos y transacciones anteriores.',
        section: 'features-section',
        keywords: ['historial', 'registro', 'envíos', 'transacciones']
    },
    {
        id: 'feature-soporte',
        title: 'Soporte 24/7',
        description: 'Nuestro equipo está disponible para ayudarte en cualquier momento del día.',
        section: 'features-section',
        keywords: ['soporte', 'ayuda', '24/7', 'equipo']
    },
    {
        id: 'how-step1',
        title: 'Crea tu solicitud',
        description: 'Ingresa los detalles de tu envío: dirección de recogida, destino y descripción del paquete.',
        section: 'how-it-works-section',
        keywords: ['solicitud', 'crear', 'envío', 'dirección', 'recogida', 'destino', 'paquete']
    },
    {
        id: 'how-step2',
        title: 'Asignamos un domiciliario',
        description: 'Nuestro sistema conecta tu solicitud con el domiciliario más cercano disponible.',
        section: 'how-it-works-section',
        keywords: ['asignar', 'domiciliario', 'cercano', 'disponible']
    },
    {
        id: 'how-step3',
        title: 'Recibe tu paquete',
        description: 'Sigue el recorrido en tiempo real y recibe tu entrega de forma rápida y segura.',
        section: 'how-it-works-section',
        keywords: ['recibir', 'paquete', 'entrega', 'recorrido']
    },
    {
        id: 'user-usuario',
        title: 'Perfil Usuario',
        description: 'Solicita entregas de manera fácil y rápida. Crear solicitudes, rastrear pedidos, historial de entregas.',
        section: 'user-types-section',
        keywords: ['usuario', 'cliente', 'solicitar', 'pedidos', 'entregas']
    },
    {
        id: 'user-domiciliario',
        title: 'Perfil Domiciliario',
        description: 'Únete a nuestra red de repartidores. Recibir solicitudes, navegación GPS, control de ganancias.',
        section: 'user-types-section',
        keywords: ['domiciliario', 'repartidor', 'ganancias', 'gps', 'solicitudes']
    },
    {
        id: 'user-admin',
        title: 'Perfil Administrador',
        description: 'Gestiona toda la operación. Panel de control, gestión de usuarios, reportes y estadísticas.',
        section: 'user-types-section',
        keywords: ['administrador', 'admin', 'gestión', 'panel', 'control', 'reportes', 'estadísticas']
    },
    {
        id: 'testimonials',
        title: 'Testimonios',
        description: 'Lo que dicen nuestros usuarios sobre VirtualVR.',
        section: 'testimonials-section',
        keywords: ['testimonios', 'opiniones', 'usuarios', 'reseñas']
    }
];

interface SearchResult {
    id: string;
    title: string;
    description: string;
    section: string;
}

interface SearchBarProps {
    isExpanded: boolean;
    onToggle: () => void;
    onClose: () => void;
}

const SearchBar = ({ isExpanded, onToggle, onClose }: SearchBarProps) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus en el input cuando se expande
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isExpanded]);

    // Buscar cuando cambia el query
    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }

        const searchQuery = query.toLowerCase();
        const filtered = searchableContent.filter(item => {
            const matchTitle = item.title.toLowerCase().includes(searchQuery);
            const matchDescription = item.description.toLowerCase().includes(searchQuery);
            const matchKeywords = item.keywords.some(keyword => keyword.includes(searchQuery));
            return matchTitle || matchDescription || matchKeywords;
        });

        setResults(filtered);
    }, [query]);

    // Limpiar resaltado anterior
    const clearHighlight = () => {
        if (highlightedElement) {
            highlightedElement.classList.remove('search-highlight');
            setHighlightedElement(null);
        }
        // Limpiar cualquier otro resaltado
        document.querySelectorAll('.search-highlight').forEach(el => {
            el.classList.remove('search-highlight');
        });
    };

    // Manejar clic en resultado
    const handleResultClick = (result: SearchResult) => {
        clearHighlight();

        const section = document.querySelector(`.${result.section}`);
        if (section) {
            // Scroll suave a la sección
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Resaltar la sección
            setTimeout(() => {
                section.classList.add('search-highlight');
                setHighlightedElement(section);

                // Quitar resaltado después de 3 segundos
                setTimeout(() => {
                    section.classList.remove('search-highlight');
                }, 3000);
            }, 500);
        }

        // Cerrar búsqueda
        handleClose();
    };

    // Cerrar y limpiar
    const handleClose = () => {
        setQuery('');
        setResults([]);
        onClose();
    };

    // Manejar Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isExpanded) {
                handleClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isExpanded]);

    return (
        <div className={`search-bar ${isExpanded ? 'search-bar-expanded' : ''}`}>
            {!isExpanded ? (
                <button className="action-btn action-btn-search" aria-label="Search" onClick={onToggle}>
                    <Search size={22} strokeWidth={1.5} />
                </button>
            ) : (
                <div className="search-input-container">
                    <Search size={18} className="search-input-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="search-input"
                        placeholder="Buscar en VirtualVR..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button className="search-close-btn" onClick={handleClose} aria-label="Cerrar búsqueda">
                        <X size={18} />
                    </button>

                    {/* Resultados */}
                    {results.length > 0 && (
                        <div className="search-results">
                            {results.map((result) => (
                                <button
                                    key={result.id}
                                    className="search-result-item"
                                    onClick={() => handleResultClick(result)}
                                >
                                    <span className="search-result-title">{result.title}</span>
                                    <span className="search-result-description">{result.description}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Sin resultados */}
                    {query.trim().length >= 2 && results.length === 0 && (
                        <div className="search-results">
                            <div className="search-no-results">
                                No se encontraron resultados para "{query}"
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;