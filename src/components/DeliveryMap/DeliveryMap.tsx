/**
 * File: /src/components/DeliveryMap/DeliveryMap.tsx
 * VirtualVR - Delivery map component with Leaflet + OpenStreetMap
 */

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Search, X, Package, Flag, RotateCcw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './DeliveryMap.css';

// Coordenadas de Cúcuta
const CUCUTA_CENTER: [number, number] = [7.8939, -72.5078];
const DEFAULT_ZOOM = 13;

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

const DeliveryMap = () => {
    const [pickupLocation, setPickupLocation] = useState<LocationPoint | null>(null);
    const [deliveryLocation, setDeliveryLocation] = useState<LocationPoint | null>(null);
    const [isSelectingPickup, setIsSelectingPickup] = useState(false);
    const [isSelectingDelivery, setIsSelectingDelivery] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeSearchField, setActiveSearchField] = useState<'pickup' | 'delivery' | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Calcular distancia entre dos puntos
    const calculateDistance = (point1: LocationPoint, point2: LocationPoint): number => {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLon = (point2.lng - point1.lng) * Math.PI / 180;
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    // Calcular distancia como valor derivado (useMemo evita el warning de setState en effect)
    const distance = pickupLocation && deliveryLocation
        ? calculateDistance(pickupLocation, deliveryLocation)
        : null;

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

    // Seleccionar resultado de búsqueda
    const selectSearchResult = (result: SearchResult) => {
        const location: LocationPoint = {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            address: result.display_name.split(',').slice(0, 3).join(', ')
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
        // Reverse geocoding para obtener la dirección
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            const address = data.display_name?.split(',').slice(0, 3).join(', ') || 'Ubicación seleccionada';

            const location: LocationPoint = { lat, lng, address };

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

    // Resetear todo
    const handleReset = () => {
        setPickupLocation(null);
        setDeliveryLocation(null);
        setIsSelectingPickup(false);
        setIsSelectingDelivery(false);
        setSearchQuery('');
        setSearchResults([]);
        setActiveSearchField(null);
    };

    // Obtener mi ubicación
    const handleGetMyLocation = (type: 'pickup' | 'delivery') => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    // Reverse geocoding
                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                        );
                        const data = await response.json();
                        const address = data.display_name?.split(',').slice(0, 3).join(', ') || 'Mi ubicación';

                        const location: LocationPoint = { lat: latitude, lng: longitude, address };

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
                    alert('No se pudo obtener tu ubicación. Por favor, permite el acceso a la ubicación.');
                }
            );
        }
    };

    return (
        <div className="delivery-map-container">
            {/* Panel de control */}
            <div className="map-control-panel">
                <div className="map-panel-header">
                    <h2 className="map-panel-title">Solicitar Entrega</h2>
                    <button className="map-reset-btn" onClick={handleReset} title="Reiniciar">
                        <RotateCcw size={18} />
                    </button>
                </div>

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
                            <button onClick={() => setPickupLocation(null)}>
                                <X size={14} />
                            </button>
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
                            <button onClick={() => setDeliveryLocation(null)}>
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Resultados de búsqueda */}
                {searchResults.length > 0 && (
                    <div className="map-search-results">
                        {searchResults.map((result, index) => (
                            <button
                                key={index}
                                className="map-search-result-item"
                                onClick={() => selectSearchResult(result)}
                            >
                                <Search size={16} />
                                <span>{result.display_name.split(',').slice(0, 3).join(', ')}</span>
                            </button>
                        ))}
                    </div>
                )}

                {isSearching && (
                    <div className="map-searching">
                        <span>Buscando...</span>
                    </div>
                )}

                {/* Información de distancia */}
                {distance !== null && (
                    <div className="map-distance-info">
                        <div className="map-distance-value">
                            <span className="distance-label">Distancia estimada</span>
                            <span className="distance-number">{distance.toFixed(2)} km</span>
                        </div>
                        <div className="map-distance-value">
                            <span className="distance-label">Costo estimado</span>
                            <span className="distance-number price">
                ${(5000 + distance * 1500).toLocaleString('es-CO')} COP
              </span>
                        </div>
                    </div>
                )}

                {/* Indicador de modo selección */}
                {(isSelectingPickup || isSelectingDelivery) && (
                    <div className="map-selection-indicator">
                        <MapPin size={18} />
                        <span>
              Haz clic en el mapa para seleccionar el punto de {isSelectingPickup ? 'recogida' : 'entrega'}
            </span>
                    </div>
                )}

                {/* Botón de confirmar */}
                {pickupLocation && deliveryLocation && (
                    <button className="map-confirm-btn">
                        Solicitar Domiciliario
                    </button>
                )}
            </div>

            {/* Mapa */}
            <div className="map-wrapper">
                <MapContainer
                    center={CUCUTA_CENTER}
                    zoom={DEFAULT_ZOOM}
                    className="leaflet-map"
                    zoomControl={false}
                >
                    {/* Tiles estilo Waze/moderno usando CartoDB Voyager */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    />

                    <MapClickHandler
                        onMapClick={handleMapClick}
                        isSelectingPickup={isSelectingPickup}
                        isSelectingDelivery={isSelectingDelivery}
                    />

                    <MapCenterHandler center={mapCenter} />

                    {/* Marcador de recogida */}
                    {pickupLocation && (
                        <Marker
                            position={[pickupLocation.lat, pickupLocation.lng]}
                            icon={pickupIcon}
                        >
                            <Popup>
                                <div className="marker-popup">
                                    <strong>📦 Punto de Recogida</strong>
                                    <p>{pickupLocation.address}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Marcador de entrega */}
                    {deliveryLocation && (
                        <Marker
                            position={[deliveryLocation.lat, deliveryLocation.lng]}
                            icon={deliveryIcon}
                        >
                            <Popup>
                                <div className="marker-popup">
                                    <strong>🏁 Punto de Entrega</strong>
                                    <p>{deliveryLocation.address}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>

                {/* Controles de zoom personalizados */}
                <div className="map-zoom-controls">
                    <button onClick={() => document.querySelector('.leaflet-map')?.dispatchEvent(new Event('zoomin'))}>+</button>
                    <button onClick={() => document.querySelector('.leaflet-map')?.dispatchEvent(new Event('zoomout'))}>−</button>
                </div>
            </div>
        </div>
    );
};

export default DeliveryMap;