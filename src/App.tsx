/**
 * File: /src/App.tsx
 * VirtualVR - Main App component
 */

import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import Footer from './components/Footer';
import UserDashboard from './components/Dashboard/UserDashboard';
import DeliveryDashboard from './components/Dashboard/DeliveryDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

// Main content component that uses auth context
const AppContent = () => {
    const { user, isAuthenticated, isLoading } = useAuth();

    // Loading state
    if (isLoading) {
        return (
            <div className="app">
                <Navbar />
                <div className="loading-screen">
                    <Loader2 size={48} className="loading-spinner" />
                    <span>Cargando...</span>
                </div>
            </div>
        );
    }

    // Render based on authentication state
    const renderContent = () => {
        if (!isAuthenticated || !user) {
            return (
                <>
                    <HomePage />
                    <Footer />
                </>
            );
        }

        switch (user.role) {
            case 'user':
                return <UserDashboard />;
            case 'delivery':
                return <DeliveryDashboard />;
            case 'admin':
                return <AdminDashboard />;
            default:
                return (
                    <>
                        <HomePage />
                        <Footer />
                    </>
                );
        }
    };

    return (
        <div className="app">
            <Navbar />
            {renderContent()}
        </div>
    );
};

// Main App wrapper with AuthProvider
function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;