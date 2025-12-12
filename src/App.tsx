/**
 * File: /src/App.tsx
 * VirtualVR - Main App component
 */

import { useState } from 'react';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import Footer from './components/Footer';
import DeliveryMap from './components/DeliveryMap';

function App() {
    const [showMap, setShowMap] = useState(false);

    return (
        <div className="app">
            <Navbar />

            {showMap ? (
                <DeliveryMap />
            ) : (
                <>
                    <HomePage />
                    <Footer />
                </>
            )}

            {/* Botón flotante para demo del mapa - temporal */}
            <button
                className="demo-map-btn"
                onClick={() => setShowMap(!showMap)}
            >
                {showMap ? '← Volver' : '🗺️ Ver Mapa'}
            </button>
        </div>
    );
}

export default App;