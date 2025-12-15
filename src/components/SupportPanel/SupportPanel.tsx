/**
 * File: /src/components/SupportPanel/SupportPanel.tsx
 * VirtualVR - Support/Chat panel component
 */

import { useState } from 'react';
import {
    X,
    MessageCircle,
    Mail,
    Phone,
    Clock,
    ChevronDown,
    MapPin,
    Send
} from 'lucide-react';
import './SupportPanel.css';

interface SupportPanelProps {
    isOpen: boolean;
    onClose: () => void;
    userRole?: 'user' | 'delivery' | 'admin' | null;
}

interface FAQItem {
    question: string;
    answer: string;
}

// FAQs para usuarios/clientes
const userFaqs: FAQItem[] = [
    {
        question: '¿Cómo solicito una entrega?',
        answer: 'Inicia sesión con tu cuenta de usuario, ve a "Nueva solicitud" e ingresa las direcciones de recogida y destino. Un domiciliario será asignado automáticamente.'
    },
    {
        question: '¿Cuánto cuesta el servicio?',
        answer: 'El costo varía según la distancia entre el punto de recogida y el destino. Verás el precio estimado antes de confirmar tu solicitud.'
    },
    {
        question: '¿Cómo me convierto en domiciliario?',
        answer: 'Regístrate seleccionando "Domiciliario" como tipo de perfil. Tu solicitud será revisada por un administrador y recibirás una notificación cuando sea aprobada.'
    },
    {
        question: '¿Qué zonas cubren en Cúcuta?',
        answer: 'Actualmente cubrimos toda el área metropolitana de Cúcuta, incluyendo Villa del Rosario, Los Patios y El Zulia.'
    }
];

// FAQs para domiciliarios
const deliveryFaqs: FAQItem[] = [
    {
        question: '¿Cómo recibo pedidos?',
        answer: 'Debes estar en la cola de espera. Cuando un administrador asigne un servicio, te aparecerá automáticamente en tu panel de "Servicios Activos". Asegúrate de tener la app abierta.'
    },
    {
        question: '¿Cómo me uno a la cola de espera?',
        answer: 'En tu panel principal, presiona el botón "Unirse a la cola". Serás agregado al final de la cola y recibirás servicios cuando llegue tu turno.'
    },
    {
        question: '¿Cómo se calculan mis ganancias?',
        answer: 'Recibes un porcentaje del costo total del servicio. Puedes ver el detalle de tus ganancias en la sección "Ganancias" de tu panel.'
    },
    {
        question: '¿Qué hago si el cliente no está disponible?',
        answer: 'Intenta contactar al cliente por teléfono. Si no responde después de 10 minutos, puedes marcar el servicio como "Cliente no disponible" y contactar a soporte.'
    },
    {
        question: '¿Cómo actualizo mi información de vehículo?',
        answer: 'Ve a tu perfil haciendo clic en el icono de persona. Allí podrás ver tu información de vehículo. Para cambios importantes como placa o tipo de vehículo, contacta a soporte.'
    },
    {
        question: '¿Cuándo recibo mis pagos?',
        answer: 'Los pagos se procesan semanalmente los días lunes. El monto se transfiere a la cuenta bancaria que registraste durante tu inscripción.'
    }
];

// FAQs para administradores
const adminFaqs: FAQItem[] = [
    {
        question: '¿Cómo apruebo un domiciliario?',
        answer: 'Ve a la sección "Domiciliarios", filtra por "Pendientes de aprobación" y revisa la información del solicitante. Puedes aprobar o rechazar desde ahí.'
    },
    {
        question: '¿Cómo asigno un servicio?',
        answer: 'En la sección "Servicios", los pedidos pendientes se asignan automáticamente al primer domiciliario en la cola cuando presionas "Asignar al primero en cola".'
    },
    {
        question: '¿Cómo gestiono las tarifas?',
        answer: 'Las tarifas se configuran en la sección de Configuración. Puedes establecer tarifas base, por distancia y descuentos para clientes preferenciales.'
    },
    {
        question: '¿Cómo veo los reportes?',
        answer: 'En el Resumen puedes ver estadísticas generales. Para reportes detallados, ve a la sección de Reportes (próximamente).'
    }
];

const SupportPanel = ({ isOpen, onClose, userRole }: SupportPanelProps) => {
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
    const [message, setMessage] = useState('');

    // Seleccionar FAQs según el rol
    const getFaqs = (): FAQItem[] => {
        switch (userRole) {
            case 'delivery':
                return deliveryFaqs;
            case 'admin':
                return adminFaqs;
            default:
                return userFaqs;
        }
    };

    const faqs = getFaqs();

    const toggleFAQ = (index: number) => {
        setExpandedFAQ(expandedFAQ === index ? null : index);
    };

    const handleSendMessage = () => {
        if (message.trim()) {
            // Aquí iría la lógica para enviar el mensaje
            alert(`Mensaje enviado: "${message}"\n\nEn una implementación real, esto se enviaría al equipo de soporte.`);
            setMessage('');
        }
    };

    const handleWhatsApp = () => {
        window.open('https://wa.me/573001234567?text=Hola, necesito ayuda con VirtualVR', '_blank');
    };

    const handleEmail = () => {
        window.location.href = 'mailto:soporte@virtualvr.com?subject=Consulta desde VirtualVR';
    };

    const handleCall = () => {
        window.location.href = 'tel:+573001234567';
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`support-overlay ${isOpen ? 'support-overlay-visible' : ''}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`support-panel ${isOpen ? 'support-panel-open' : ''}`}>
                {/* Close Button */}
                <button className="support-close-btn" onClick={onClose} aria-label="Cerrar">
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="support-header">
                    <div className="support-icon">
                        <MessageCircle size={28} />
                    </div>
                    <h2 className="support-title">¿Necesitas ayuda?</h2>
                    <p className="support-subtitle">Estamos aquí para asistirte</p>
                </div>

                {/* Quick Contact */}
                <div className="support-section">
                    <h3 className="support-section-title">Contacto rápido</h3>
                    <div className="support-contact-grid">
                        <button className="support-contact-btn support-contact-whatsapp" onClick={handleWhatsApp}>
                            <svg viewBox="0 0 24 24" fill="currentColor" className="whatsapp-icon">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            <span>WhatsApp</span>
                        </button>
                        <button className="support-contact-btn support-contact-email" onClick={handleEmail}>
                            <Mail size={20} />
                            <span>Email</span>
                        </button>
                        <button className="support-contact-btn support-contact-phone" onClick={handleCall}>
                            <Phone size={20} />
                            <span>Llamar</span>
                        </button>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="support-section">
                    <h3 className="support-section-title">Preguntas frecuentes</h3>
                    <div className="support-faq-list">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className={`support-faq-item ${expandedFAQ === index ? 'support-faq-expanded' : ''}`}
                            >
                                <button
                                    className="support-faq-question"
                                    onClick={() => toggleFAQ(index)}
                                >
                                    <span>{faq.question}</span>
                                    <ChevronDown size={18} className="support-faq-icon" />
                                </button>
                                <div className="support-faq-answer">
                                    <p>{faq.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Message */}
                <div className="support-section">
                    <h3 className="support-section-title">Envíanos un mensaje</h3>
                    <div className="support-message-box">
            <textarea
                className="support-textarea"
                placeholder="Escribe tu consulta aquí..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
            />
                        <button
                            className="support-send-btn"
                            onClick={handleSendMessage}
                            disabled={!message.trim()}
                        >
                            <Send size={18} />
                            <span>Enviar</span>
                        </button>
                    </div>
                </div>

                {/* Info Footer */}
                <div className="support-info">
                    <div className="support-info-item">
                        <Clock size={16} />
                        <span>Lun - Sáb: 7:00 AM - 9:00 PM</span>
                    </div>
                    <div className="support-info-item">
                        <MapPin size={16} />
                        <span>Cúcuta, Norte de Santander</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SupportPanel;