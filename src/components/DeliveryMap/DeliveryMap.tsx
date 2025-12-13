/**
 * File: /src/components/DeliveryMap/DeliveryMap.tsx
 * VirtualVR - Complete delivery request component with Leaflet + OpenStreetMap
 */

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import {
    MapPin, Navigation, Search, X, Package, Flag, RotateCcw,
    User, Phone, FileText, CreditCard, Banknote, ArrowLeftRight,
    Building2, Copy, Check, Clock, Send, ChevronDown, ChevronUp,
    AlertCircle
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase.config';
import { useAuth } from '../../context/AuthContext';
import deliveryRequestService from '../../services/deliveryRequest.service';
import {
    type PaymentMethod,
    BILL_DENOMINATIONS,
    BANK_ACCOUNT_INFO,
    formatCostCOP,
    formatDistance,
    calculateEstimatedTime,
    formatTime
} from '../../models/DeliveryRequest.model';
import 'leaflet/dist/leaflet.css';
import './DeliveryMap.css';

// Coordenadas de Cúcuta
const CUCUTA_CENTER: [number, number] = [7.8939, -72.5078];
const DEFAULT_ZOOM = 13;

// Tarifa base y por km
const BASE_RATE = 5000;
const RATE_PER_KM = 1500;
const PREFERENTIAL_DISCOUNT = 0.15;

// Íconos personalizados
const createCustomIcon = (color: string, type: 'pickup' | 'delivery') => {
    const svgIcon = type === 'pickup'
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" width="36" height="36">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3" fill="white"/>
      </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" width="36" height="36">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <path d="M9 10l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>
      </svg>`;

    return L.divIcon({
        html: svgIcon,
        className: 'custom-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
    });
};

const pickupIcon = createCustomIcon('#4CAF50', 'pickup');
const deliveryIcon = createCustomIcon('#E53935', 'delivery');

interface LocationPoint {
    lat: number;
    lng: number;
    address?: string;
    neighborhood?: string;
}

interface SearchResult {
    display_name: string;
    lat: string;
    lon: string;
}

// Componente para manejar clicks en el mapa
const MapClickHandler = ({
                             onMapClick,
                             isSelectingPickup,
                             isSelectingDelivery
                         }: {
    onMapClick: (lat: number, lng: number) => void;
    isSelectingPickup: boolean;
    isSelectingDelivery: boolean;
}) => {
    useMapEvents({
        click: (e) => {
            if (isSelectingPickup || isSelectingDelivery) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
};

// Componente para centrar el mapa
const MapCenterHandler = ({ center }: { center: [number, number] | null }) => {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.flyTo(center, 16, { duration: 1 });
        }
    }, [center, map]);

    return null;
};

// Componente para ajustar vista a ambos puntos
const FitBoundsHandler = ({
                              pickup,
                              delivery
                          }: {
    pickup: LocationPoint | null;
    delivery: LocationPoint | null;
}) => {
    const map = useMap();

    useEffect(() => {
        if (pickup && delivery) {
            const bounds = L.latLngBounds(
                [pickup.lat, pickup.lng],
                [delivery.lat, delivery.lng]
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [pickup, delivery, map]);

    return null;
};

const DeliveryMap = () => {
    const { user } = useAuth();

    // Estados de ubicación
    const [pickupLocation, setPickupLocation] = useState<LocationPoint | null>(null);
    const [deliveryLocation, setDeliveryLocation] = useState<LocationPoint | null>(null);
    const [isSelectingPickup, setIsSelectingPickup] = useState(false);
    const [isSelectingDelivery, setIsSelectingDelivery] = useState(false);

    // Estados de búsqueda
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeSearchField, setActiveSearchField] = useState<'pickup' | 'delivery' | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

    // Estados del formulario
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [packageDescription, setPackageDescription] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');

    // Estados de pago
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [selectedBill, setSelectedBill] = useState<number | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Estados de UI
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>('locations');
    const [isPreferential, setIsPreferential] = useState(false);

    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Verificar si el usuario es preferencial
    useEffect(() => {
        const checkPreferential = async () => {
            if (user?.uid) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        setIsPreferential(userDoc.data().isPreferential || false);
                    }
                } catch (error) {
                    console.error('Error checking preferential status:', error);
                }
            }
        };
        checkPreferential();
    }, [user?.uid]);

    // Calcular distancia entre dos puntos (Haversine)
    const calculateDistance = (point1: LocationPoint, point2: LocationPoint): number => {
        const R = 6371;
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLon = (point2.lng - point1.lng) * Math.PI / 180;
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    // Valores calculados
    const distance = pickupLocation && deliveryLocation
        ? calculateDistance(pickupLocation, deliveryLocation)
        : 0;

    const baseCost = BASE_RATE + (distance * RATE_PER_KM);
    const estimatedCost = isPreferential ? baseCost * (1 - PREFERENTIAL_DISCOUNT) : baseCost;
    const estimatedTime = calculateEstimatedTime(distance);

    const changeAmount = selectedBill ? selectedBill - estimatedCost : 0;
    const isBillSufficient = selectedBill ? selectedBill >= estimatedCost : false;

    // Validación del formulario
    const isFormValid =
        pickupLocation !== null &&
        deliveryLocation !== null &&
        recipientName.trim() !== '' &&
        recipientPhone.trim() !== '' &&
        packageDescription.trim() !== '' &&
        (paymentMethod === 'transfer' || (paymentMethod === 'cash' && isBillSufficient));

    // Buscar direcciones con Nominatim
    const searchAddress = async (query: string) => {
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Cúcuta, Colombia')}&limit=5&addressdetails=1`
            );
            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error('Error searching address:', error);
            setSearchResults([]);
        }
        setIsSearching(false);
    };

    // Debounce para la búsqueda
    const handleSearchInput = (query: string) => {
        setSearchQuery(query);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            searchAddress(query);
        }, 500);
    };

    // Extraer barrio de la dirección
    const extractNeighborhood = (displayName: string): string => {
        const parts = displayName.split(',');
        if (parts.length >= 2) {
            return parts[1].trim();
        }
        return '';
    };

    // Seleccionar resultado de búsqueda
    const selectSearchResult = (result: SearchResult) => {
        const location: LocationPoint = {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            address: result.display_name.split(',').slice(0, 2).join(', '),
            neighborhood: extractNeighborhood(result.display_name)
        };

        if (activeSearchField === 'pickup') {
            setPickupLocation(location);
            setIsSelectingPickup(false);
        } else if (activeSearchField === 'delivery') {
            setDeliveryLocation(location);
            setIsSelectingDelivery(false);
        }

        setMapCenter([location.lat, location.lng]);
        setSearchQuery('');
        setSearchResults([]);
        setActiveSearchField(null);
    };

    // Manejar click en el mapa
    const handleMapClick = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            const address = data.display_name?.split(',').slice(0, 2).join(', ') || 'Ubicación seleccionada';
            const neighborhood = extractNeighborhood(data.display_name || '');

            const location: LocationPoint = { lat, lng, address, neighborhood };

            if (isSelectingPickup) {
                setPickupLocation(location);
                setIsSelectingPickup(false);
            } else if (isSelectingDelivery) {
                setDeliveryLocation(location);
                setIsSelectingDelivery(false);
            }
        } catch {
            const location: LocationPoint = { lat, lng, address: 'Ubicación seleccionada' };

            if (isSelectingPickup) {
                setPickupLocation(location);
                setIsSelectingPickup(false);
            } else if (isSelectingDelivery) {
                setDeliveryLocation(location);
                setIsSelectingDelivery(false);
            }
        }
    };

    // Obtener mi ubicación
    const handleGetMyLocation = (type: 'pickup' | 'delivery') => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                        );
                        const data = await response.json();
                        const address = data.display_name?.split(',').slice(0, 2).join(', ') || 'Mi ubicación';
                        const neighborhood = extractNeighborhood(data.display_name || '');

                        const location: LocationPoint = { lat: latitude, lng: longitude, address, neighborhood };

                        if (type === 'pickup') {
                            setPickupLocation(location);
                        } else {
                            setDeliveryLocation(location);
                        }
                        setMapCenter([latitude, longitude]);
                    } catch {
                        const location: LocationPoint = { lat: latitude, lng: longitude, address: 'Mi ubicación' };
                        if (type === 'pickup') {
                            setPickupLocation(location);
                        } else {
                            setDeliveryLocation(location);
                        }
                        setMapCenter([latitude, longitude]);
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                    setErrorMessage('No se pudo obtener tu ubicación');
                }
            );
        }
    };

    // Copiar al portapapeles
    const copyToClipboard = (text: string, fieldName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Resetear formulario
    const handleReset = () => {
        setPickupLocation(null);
        setDeliveryLocation(null);
        setIsSelectingPickup(false);
        setIsSelectingDelivery(false);
        setSearchQuery('');
        setSearchResults([]);
        setActiveSearchField(null);
        setRecipientName('');
        setRecipientPhone('');
        setPackageDescription('');
        setSpecialInstructions('');
        setPaymentMethod('cash');
        setSelectedBill(null);
        setErrorMessage(null);
    };

    // Enviar solicitud
    const handleSubmit = async () => {
        if (!isFormValid || !user) return;

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();

            // Construir objeto base
            const request: Record<string, unknown> = {
                clientId: user.uid,
                clientName: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
                clientPhone: userData?.phone || '',
                clientEmail: user.email || '',

                pickupAddress: pickupLocation!.address || '',
                pickupNeighborhood: pickupLocation!.neighborhood || '',
                pickupLatitude: pickupLocation!.lat,
                pickupLongitude: pickupLocation!.lng,
                pickupPhone: userData?.phone || '',
                pickupContactName: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),

                deliveryAddress: deliveryLocation!.address || '',
                deliveryNeighborhood: deliveryLocation!.neighborhood || '',
                deliveryLatitude: deliveryLocation!.lat,
                deliveryLongitude: deliveryLocation!.lng,
                deliveryPhone: recipientPhone,
                deliveryContactName: recipientName,

                itemDescription: packageDescription,

                distance,
                estimatedCost,

                status: 'pending',

                paymentMethod,
                isPaid: false,

                createdAt: new Date(),
                isPreferentialRate: isPreferential,
                city: 'Cúcuta',
            };

            // Agregar campos opcionales solo si tienen valor
            if (specialInstructions) {
                request.deliveryNotes = specialInstructions;
                request.additionalNotes = specialInstructions;
            }

            if (paymentMethod === 'cash' && selectedBill) {
                request.cashBillAmount = selectedBill;
                request.cashChangeAmount = changeAmount;
            }

            await deliveryRequestService.createRequest(request as never);

            setShowSuccess(true);
            handleReset();

        } catch (error) {
            console.error('Error creating request:', error);
            setErrorMessage('Error al enviar la solicitud. Por favor intenta de nuevo.');
        }

        setIsLoading(false);
    };

    // Toggle sección
    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="delivery-map-container">
            {/* Panel de control */}
            <div className="map-control-panel">
                <div className="map-panel-header">
                    <h2 className="map-panel-title">Solicitar Domicilio</h2>
                    <button className="map-reset-btn" onClick={handleReset} title="Reiniciar">
                        <RotateCcw size={18} />
                    </button>
                </div>

                {/* Sección: Ubicaciones */}
                <div className="map-section">
                    <button className="map-section-header" onClick={() => toggleSection('locations')}>
                        <div className="map-section-title">
                            <MapPin size={18} />
                            <span>Ubicaciones</span>
                            {pickupLocation && deliveryLocation && <Check size={16} className="section-check" />}
                        </div>
                        {expandedSection === 'locations' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {expandedSection === 'locations' && (
                        <div className="map-section-content">
                            {/* Campo de recogida */}
                            <div className="map-input-group">
                                <label className="map-input-label">
                                    <Package size={16} />
                                    <span>Punto de Recogida</span>
                                </label>
                                <div className="map-input-wrapper">
                                    <input
                                        type="text"
                                        className="map-input"
                                        placeholder="Buscar dirección de recogida..."
                                        value={activeSearchField === 'pickup' ? searchQuery : (pickupLocation?.address || '')}
                                        onChange={(e) => {
                                            setActiveSearchField('pickup');
                                            handleSearchInput(e.target.value);
                                        }}
                                        onFocus={() => setActiveSearchField('pickup')}
                                    />
                                    <div className="map-input-actions">
                                        <button
                                            className={`map-input-btn ${isSelectingPickup ? 'active' : ''}`}
                                            onClick={() => {
                                                setIsSelectingPickup(!isSelectingPickup);
                                                setIsSelectingDelivery(false);
                                                setActiveSearchField(null);
                                                setSearchResults([]);
                                            }}
                                            title="Seleccionar en el mapa"
                                        >
                                            <MapPin size={18} />
                                        </button>
                                        <button
                                            className="map-input-btn"
                                            onClick={() => handleGetMyLocation('pickup')}
                                            title="Usar mi ubicación"
                                        >
                                            <Navigation size={18} />
                                        </button>
                                    </div>
                                </div>
                                {pickupLocation && (
                                    <div className="map-location-badge pickup">
                                        <MapPin size={14} />
                                        <span>{pickupLocation.address}</span>
                                        <button onClick={() => setPickupLocation(null)}><X size={14} /></button>
                                    </div>
                                )}
                            </div>

                            {/* Campo de entrega */}
                            <div className="map-input-group">
                                <label className="map-input-label">
                                    <Flag size={16} />
                                    <span>Punto de Entrega</span>
                                </label>
                                <div className="map-input-wrapper">
                                    <input
                                        type="text"
                                        className="map-input"
                                        placeholder="Buscar dirección de entrega..."
                                        value={activeSearchField === 'delivery' ? searchQuery : (deliveryLocation?.address || '')}
                                        onChange={(e) => {
                                            setActiveSearchField('delivery');
                                            handleSearchInput(e.target.value);
                                        }}
                                        onFocus={() => setActiveSearchField('delivery')}
                                    />
                                    <div className="map-input-actions">
                                        <button
                                            className={`map-input-btn ${isSelectingDelivery ? 'active' : ''}`}
                                            onClick={() => {
                                                setIsSelectingDelivery(!isSelectingDelivery);
                                                setIsSelectingPickup(false);
                                                setActiveSearchField(null);
                                                setSearchResults([]);
                                            }}
                                            title="Seleccionar en el mapa"
                                        >
                                            <MapPin size={18} />
                                        </button>
                                        <button
                                            className="map-input-btn"
                                            onClick={() => handleGetMyLocation('delivery')}
                                            title="Usar mi ubicación"
                                        >
                                            <Navigation size={18} />
                                        </button>
                                    </div>
                                </div>
                                {deliveryLocation && (
                                    <div className="map-location-badge delivery">
                                        <Flag size={14} />
                                        <span>{deliveryLocation.address}</span>
                                        <button onClick={() => setDeliveryLocation(null)}><X size={14} /></button>
                                    </div>
                                )}
                            </div>

                            {/* Resultados de búsqueda */}
                            {searchResults.length > 0 && (
                                <div className="map-search-results">
                                    {searchResults.map((result, index) => (
                                        <button key={index} className="map-search-result-item" onClick={() => selectSearchResult(result)}>
                                            <Search size={16} />
                                            <span>{result.display_name.split(',').slice(0, 3).join(', ')}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {isSearching && <div className="map-searching"><span>Buscando...</span></div>}
                        </div>
                    )}
                </div>

                {/* Sección: Destinatario */}
                <div className="map-section">
                    <button className="map-section-header" onClick={() => toggleSection('recipient')}>
                        <div className="map-section-title">
                            <User size={18} />
                            <span>Destinatario</span>
                            {recipientName && recipientPhone && <Check size={16} className="section-check" />}
                        </div>
                        {expandedSection === 'recipient' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {expandedSection === 'recipient' && (
                        <div className="map-section-content">
                            <div className="map-input-group">
                                <label className="map-input-label"><User size={16} /><span>Nombre del destinatario</span></label>
                                <input type="text" className="map-input" placeholder="¿Quién recibe el paquete?" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                            </div>
                            <div className="map-input-group">
                                <label className="map-input-label"><Phone size={16} /><span>Teléfono del destinatario</span></label>
                                <input type="tel" className="map-input" placeholder="Número de contacto" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sección: Detalles del envío */}
                <div className="map-section">
                    <button className="map-section-header" onClick={() => toggleSection('details')}>
                        <div className="map-section-title">
                            <FileText size={18} />
                            <span>Detalles del Envío</span>
                            {packageDescription && <Check size={16} className="section-check" />}
                        </div>
                        {expandedSection === 'details' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {expandedSection === 'details' && (
                        <div className="map-section-content">
                            <div className="map-input-group">
                                <label className="map-input-label"><Package size={16} /><span>¿Qué vas a enviar?</span></label>
                                <input type="text" className="map-input" placeholder="Descripción del paquete" value={packageDescription} onChange={(e) => setPackageDescription(e.target.value)} />
                            </div>
                            <div className="map-input-group">
                                <label className="map-input-label"><FileText size={16} /><span>Instrucciones especiales (opcional)</span></label>
                                <textarea className="map-textarea" placeholder="Ej: Tocar el timbre, dejar en portería..." value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sección: Método de pago */}
                <div className="map-section">
                    <button className="map-section-header" onClick={() => toggleSection('payment')}>
                        <div className="map-section-title">
                            <CreditCard size={18} />
                            <span>Método de Pago</span>
                            {(paymentMethod === 'transfer' || (paymentMethod === 'cash' && isBillSufficient)) && <Check size={16} className="section-check" />}
                        </div>
                        {expandedSection === 'payment' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {expandedSection === 'payment' && (
                        <div className="map-section-content">
                            <div className="payment-methods">
                                <button className={`payment-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`} onClick={() => { setPaymentMethod('cash'); setSelectedBill(null); }}>
                                    <Banknote size={24} /><span>Efectivo</span>
                                </button>
                                <button className={`payment-method-btn ${paymentMethod === 'transfer' ? 'active' : ''}`} onClick={() => setPaymentMethod('transfer')}>
                                    <ArrowLeftRight size={24} /><span>Transferencia</span>
                                </button>
                            </div>

                            {/* Selección de billete para efectivo */}
                            {paymentMethod === 'cash' && distance > 0 && (
                                <div className="cash-payment-section">
                                    <p className="cash-section-title"><Banknote size={16} />¿Con qué billete vas a pagar?</p>
                                    <div className="bill-options">
                                        {BILL_DENOMINATIONS.map((bill) => {
                                            const isDisabled = bill < estimatedCost;
                                            const isActive = selectedBill === bill;
                                            return (
                                                <button
                                                    key={bill}
                                                    className={`bill-btn ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                                                    onClick={() => !isDisabled && setSelectedBill(bill)}
                                                    disabled={isDisabled}
                                                    type="button"
                                                >
                                                    <Banknote size={16} />
                                                    <span>{formatCostCOP(bill)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {selectedBill && isBillSufficient && (
                                        <div className="change-info">
                                            <div className="change-row"><span>Pagas con</span><strong>{formatCostCOP(selectedBill)}</strong></div>
                                            <div className="change-row"><span>Costo del servicio</span><strong className="cost">{formatCostCOP(estimatedCost)}</strong></div>
                                            <div className="change-divider"></div>
                                            <div className="change-row highlight"><span>Vueltas</span><strong className="change">{formatCostCOP(changeAmount)}</strong></div>
                                            <p className="change-note">El domiciliario debe llevar estas vueltas</p>
                                        </div>
                                    )}

                                    {selectedBill && !isBillSufficient && (
                                        <div className="bill-warning"><AlertCircle size={16} />Este billete no es suficiente</div>
                                    )}
                                </div>
                            )}

                            {/* Información de transferencia */}
                            {paymentMethod === 'transfer' && distance > 0 && (
                                <div className="transfer-payment-section">
                                    <p className="transfer-section-title"><Building2 size={16} />Datos para Transferencia</p>
                                    <div className="transfer-info">
                                        <div className="transfer-row"><span className="transfer-label">Banco</span><span className="transfer-value">{BANK_ACCOUNT_INFO.bankName}</span></div>
                                        <div className="transfer-row"><span className="transfer-label">Tipo de Cuenta</span><span className="transfer-value">{BANK_ACCOUNT_INFO.accountType}</span></div>
                                        <div className="transfer-row copyable" onClick={() => copyToClipboard(BANK_ACCOUNT_INFO.accountNumber, 'account')}>
                                            <div><span className="transfer-label">Número de Cuenta</span><span className="transfer-value">{BANK_ACCOUNT_INFO.accountNumber}</span></div>
                                            <button className={`copy-btn ${copiedField === 'account' ? 'copied' : ''}`}>{copiedField === 'account' ? <Check size={16} /> : <Copy size={16} />}</button>
                                        </div>
                                        <div className="transfer-row"><span className="transfer-label">Titular</span><span className="transfer-value">{BANK_ACCOUNT_INFO.accountHolderName}</span></div>
                                        <div className="transfer-row copyable" onClick={() => copyToClipboard(BANK_ACCOUNT_INFO.accountHolderID, 'nit')}>
                                            <div><span className="transfer-label">{BANK_ACCOUNT_INFO.accountHolderIDType}</span><span className="transfer-value">{BANK_ACCOUNT_INFO.accountHolderID}</span></div>
                                            <button className={`copy-btn ${copiedField === 'nit' ? 'copied' : ''}`}>{copiedField === 'nit' ? <Check size={16} /> : <Copy size={16} />}</button>
                                        </div>
                                        <div className="transfer-row highlight copyable" onClick={() => copyToClipboard(Math.round(estimatedCost).toString(), 'amount')}>
                                            <div><span className="transfer-label">Monto a Transferir</span><span className="transfer-value amount">{formatCostCOP(estimatedCost)}</span></div>
                                            <button className={`copy-btn ${copiedField === 'amount' ? 'copied' : ''}`}>{copiedField === 'amount' ? <Check size={16} /> : <Copy size={16} />}</button>
                                        </div>
                                    </div>
                                    <p className="transfer-note"><AlertCircle size={14} />Realiza la transferencia antes de confirmar. El domiciliario verificará el pago.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Resumen de costo */}
                {distance > 0 && (
                    <div className="map-cost-summary">
                        <div className="cost-row"><span><MapPin size={14} /> Distancia</span><span>{formatDistance(distance)}</span></div>
                        <div className="cost-row"><span><Clock size={14} /> Tiempo estimado</span><span>{formatTime(estimatedTime)}</span></div>
                        <div className="cost-divider"></div>
                        <div className="cost-row total"><span>Costo del domicilio</span><span className="cost-value">{formatCostCOP(estimatedCost)}</span></div>
                        {isPreferential && <div className="preferential-badge">⭐ Descuento preferencial aplicado (15%)</div>}
                    </div>
                )}

                {/* Indicador de modo selección */}
                {(isSelectingPickup || isSelectingDelivery) && (
                    <div className="map-selection-indicator"><MapPin size={18} /><span>Haz clic en el mapa para seleccionar el punto de {isSelectingPickup ? 'recogida' : 'entrega'}</span></div>
                )}

                {/* Error message */}
                {errorMessage && (
                    <div className="map-error-message"><AlertCircle size={18} /><span>{errorMessage}</span><button onClick={() => setErrorMessage(null)}><X size={16} /></button></div>
                )}

                {/* Botón de confirmar */}
                <button className={`map-confirm-btn ${!isFormValid ? 'disabled' : ''}`} onClick={handleSubmit} disabled={!isFormValid || isLoading}>
                    {isLoading ? (<><div className="btn-spinner"></div><span>Enviando...</span></>) : (<><Send size={20} /><span>Solicitar Domiciliario</span></>)}
                </button>
            </div>

            {/* Mapa */}
            <div className="map-wrapper">
                <MapContainer center={CUCUTA_CENTER} zoom={DEFAULT_ZOOM} className="leaflet-map" zoomControl={false}>
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <MapClickHandler onMapClick={handleMapClick} isSelectingPickup={isSelectingPickup} isSelectingDelivery={isSelectingDelivery} />
                    <MapCenterHandler center={mapCenter} />
                    <FitBoundsHandler pickup={pickupLocation} delivery={deliveryLocation} />
                    {pickupLocation && deliveryLocation && (
                        <Polyline positions={[[pickupLocation.lat, pickupLocation.lng], [deliveryLocation.lat, deliveryLocation.lng]]} color="#2196F3" weight={4} dashArray="10, 10" opacity={0.8} />
                    )}
                    {pickupLocation && (
                        <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon}>
                            <Popup><div className="marker-popup"><strong>📦 Punto de Recogida</strong><p>{pickupLocation.address}</p></div></Popup>
                        </Marker>
                    )}
                    {deliveryLocation && (
                        <Marker position={[deliveryLocation.lat, deliveryLocation.lng]} icon={deliveryIcon}>
                            <Popup><div className="marker-popup"><strong>🏁 Punto de Entrega</strong><p>{deliveryLocation.address}</p></div></Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>

            {/* Modal de éxito */}
            {showSuccess && (
                <div className="success-overlay">
                    <div className="success-modal">
                        <div className="success-icon"><Check size={48} /></div>
                        <h3>¡Solicitud Enviada!</h3>
                        <p>Tu domicilio será asignado pronto. Puedes ver el estado en "Pedidos".</p>
                        <button onClick={() => setShowSuccess(false)}>Entendido</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryMap;