/**
 * File: /src/components/RegisterForm/RegisterForm.tsx
 * VirtualVR - Multi-step registration form component
 */

import { useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    User,
    Mail,
    Lock,
    Phone,
    MapPin,
    Calendar,
    Heart,
    Truck,
    CreditCard,
    Settings,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { authService } from '../../services/auth.service';
import type {
    UserRole,
    UserRegistrationData,
    DeliveryRegistrationData,
    VehicleType,
    BankAccountType
} from '../../models';
import './RegisterForm.css';

interface RegisterFormProps {
    userType: UserRole;
    onBack: () => void;
    onSuccess: () => void;
}

// Steps for each user type
const USER_STEPS = [
    { id: 1, title: 'Cuenta', icon: Mail },
    { id: 2, title: 'Datos Personales', icon: User },
];

const DELIVERY_STEPS = [
    { id: 1, title: 'Cuenta', icon: Mail },
    { id: 2, title: 'Datos Personales', icon: User },
    { id: 3, title: 'Contacto Emergencia', icon: Heart },
    { id: 4, title: 'Vehículo', icon: Truck },
    { id: 5, title: 'Licencia', icon: CreditCard },
    { id: 6, title: 'Banco', icon: CreditCard },
    { id: 7, title: 'Preferencias', icon: Settings },
];

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const LICENSE_CATEGORIES = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
const BANKS = [
    'Bancolombia', 'Davivienda', 'BBVA', 'Banco de Bogotá',
    'Banco de Occidente', 'Banco Popular', 'Banco Caja Social',
    'Nequi', 'Daviplata', 'Banco Agrario', 'Scotiabank'
];

const RegisterForm = ({ userType, onBack, onSuccess }: RegisterFormProps) => {
    const steps = userType === 'delivery' ? DELIVERY_STEPS : USER_STEPS;
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form data state
    const [formData, setFormData] = useState({
        // Account
        email: '',
        password: '',
        confirmPassword: '',

        // Personal Info
        firstName: '',
        lastName: '',
        idCard: '',
        phone: '',
        address: '',
        neighborhood: '',

        // Delivery specific - Personal Data
        birthDate: '',
        bloodType: 'O+' as string,
        emergencyContactName: '',
        emergencyContactPhone: '',

        // Vehicle Info
        vehicleType: 'motorcycle' as VehicleType,
        vehiclePlate: '',
        vehicleBrand: '',
        vehicleModel: '',
        vehicleColor: '',
        soatExpiryDate: '',
        technicalReviewExpiryDate: '',

        // Driving License
        drivingLicenseNumber: '',
        drivingLicenseCategory: 'B1' as string,
        drivingLicenseExpiry: '',

        // Bank Info
        bankName: 'Bancolombia' as string,
        accountType: 'savings' as BankAccountType,
        accountNumber: '',

        // Work Preferences
        acceptsMessaging: true,
        acceptsErrands: true,
        acceptsTransport: false,
        maxDeliveryDistance: 15,
    });

    const updateFormData = (field: string, value: string | boolean | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const validateStep = (): boolean => {
        switch (currentStep) {
            case 1: // Account
                if (!formData.email || !formData.password || !formData.confirmPassword) {
                    setError('Todos los campos son obligatorios');
                    return false;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                    setError('El correo electrónico no es válido');
                    return false;
                }
                if (formData.password.length < 6) {
                    setError('La contraseña debe tener al menos 6 caracteres');
                    return false;
                }
                if (formData.password !== formData.confirmPassword) {
                    setError('Las contraseñas no coinciden');
                    return false;
                }
                return true;

            case 2: // Personal Info
                if (!formData.firstName || !formData.lastName || !formData.idCard ||
                    !formData.phone || !formData.address || !formData.neighborhood) {
                    setError('Todos los campos son obligatorios');
                    return false;
                }
                if (!/^\d{6,12}$/.test(formData.idCard)) {
                    setError('La cédula debe tener entre 6 y 12 dígitos');
                    return false;
                }
                if (!/^\d{10}$/.test(formData.phone)) {
                    setError('El teléfono debe tener 10 dígitos');
                    return false;
                }
                return true;

            case 3: // Emergency Contact (Delivery only)
                if (!formData.birthDate || !formData.emergencyContactName || !formData.emergencyContactPhone) {
                    setError('Todos los campos son obligatorios');
                    return false;
                }
                if (!/^\d{10}$/.test(formData.emergencyContactPhone)) {
                    setError('El teléfono de emergencia debe tener 10 dígitos');
                    return false;
                }
                return true;

            case 4: // Vehicle (Delivery only)
                if (!formData.vehiclePlate || !formData.vehicleBrand ||
                    !formData.vehicleModel || !formData.vehicleColor ||
                    !formData.soatExpiryDate || !formData.technicalReviewExpiryDate) {
                    setError('Todos los campos son obligatorios');
                    return false;
                }
                return true;

            case 5: // License (Delivery only)
                if (!formData.drivingLicenseNumber || !formData.drivingLicenseExpiry) {
                    setError('Todos los campos son obligatorios');
                    return false;
                }
                return true;

            case 6: // Bank (Delivery only)
                if (!formData.accountNumber) {
                    setError('El número de cuenta es obligatorio');
                    return false;
                }
                return true;

            case 7: // Preferences (Delivery only)
                if (!formData.acceptsMessaging && !formData.acceptsErrands && !formData.acceptsTransport) {
                    setError('Debes aceptar al menos un tipo de servicio');
                    return false;
                }
                return true;

            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep()) {
            if (currentStep < steps.length) {
                setCurrentStep(prev => prev + 1);
            } else {
                handleSubmit();
            }
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
            setError(null);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (userType === 'user') {
                const userData: UserRegistrationData = {
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    idCard: formData.idCard,
                    phone: formData.phone,
                    address: formData.address,
                    neighborhood: formData.neighborhood,
                };
                await authService.signUpUser(userData);
            } else if (userType === 'delivery') {
                const deliveryData: DeliveryRegistrationData = {
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    idCard: formData.idCard,
                    phone: formData.phone,
                    address: formData.address,
                    neighborhood: formData.neighborhood,
                    birthDate: formData.birthDate,
                    bloodType: formData.bloodType,
                    emergencyContactName: formData.emergencyContactName,
                    emergencyContactPhone: formData.emergencyContactPhone,
                    vehicleType: formData.vehicleType,
                    vehiclePlate: formData.vehiclePlate,
                    vehicleBrand: formData.vehicleBrand,
                    vehicleModel: formData.vehicleModel,
                    vehicleColor: formData.vehicleColor,
                    soatExpiryDate: formData.soatExpiryDate,
                    technicalReviewExpiryDate: formData.technicalReviewExpiryDate,
                    drivingLicenseNumber: formData.drivingLicenseNumber,
                    drivingLicenseCategory: formData.drivingLicenseCategory,
                    drivingLicenseExpiry: formData.drivingLicenseExpiry,
                    bankName: formData.bankName,
                    accountType: formData.accountType,
                    accountNumber: formData.accountNumber,
                    acceptsMessaging: formData.acceptsMessaging,
                    acceptsErrands: formData.acceptsErrands,
                    acceptsTransport: formData.acceptsTransport,
                    maxDeliveryDistance: formData.maxDeliveryDistance,
                };
                await authService.signUpDelivery(deliveryData);
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar');
        } finally {
            setIsLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // Account
                return (
                    <div className="register-step-content">
                        <div className="register-input-group">
                            <label className="register-label">
                                <Mail size={16} />
                                <span>Correo electrónico</span>
                            </label>
                            <input
                                type="email"
                                className="register-input"
                                placeholder="tucorreo@ejemplo.com"
                                value={formData.email}
                                onChange={(e) => updateFormData('email', e.target.value)}
                            />
                        </div>
                        <div className="register-input-group">
                            <label className="register-label">
                                <Lock size={16} />
                                <span>Contraseña</span>
                            </label>
                            <input
                                type="password"
                                className="register-input"
                                placeholder="Mínimo 6 caracteres"
                                value={formData.password}
                                onChange={(e) => updateFormData('password', e.target.value)}
                            />
                        </div>
                        <div className="register-input-group">
                            <label className="register-label">
                                <Lock size={16} />
                                <span>Confirmar contraseña</span>
                            </label>
                            <input
                                type="password"
                                className="register-input"
                                placeholder="Repite tu contraseña"
                                value={formData.confirmPassword}
                                onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 2: // Personal Info
                return (
                    <div className="register-step-content">
                        <div className="register-row">
                            <div className="register-input-group">
                                <label className="register-label">
                                    <User size={16} />
                                    <span>Nombres</span>
                                </label>
                                <input
                                    type="text"
                                    className="register-input"
                                    placeholder="Tu nombre"
                                    value={formData.firstName}
                                    onChange={(e) => updateFormData('firstName', e.target.value)}
                                />
                            </div>
                            <div className="register-input-group">
                                <label className="register-label">
                                    <User size={16} />
                                    <span>Apellidos</span>
                                </label>
                                <input
                                    type="text"
                                    className="register-input"
                                    placeholder="Tu apellido"
                                    value={formData.lastName}
                                    onChange={(e) => updateFormData('lastName', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="register-row">
                            <div className="register-input-group">
                                <label className="register-label">
                                    <CreditCard size={16} />
                                    <span>Cédula</span>
                                </label>
                                <input
                                    type="text"
                                    className="register-input"
                                    placeholder="Número de cédula"
                                    value={formData.idCard}
                                    onChange={(e) => updateFormData('idCard', e.target.value.replace(/\D/g, ''))}
                                    maxLength={12}
                                />
                            </div>
                            <div className="register-input-group">
                                <label className="register-label">
                                    <Phone size={16} />
                                    <span>Teléfono</span>
                                </label>
                                <input
                                    type="tel"
                                    className="register-input"
                                    placeholder="3001234567"
                                    value={formData.phone}
                                    onChange={(e) => updateFormData('phone', e.target.value.replace(/\D/g, ''))}
                                    maxLength={10}
                                />
                            </div>
                        </div>
                        <div className="register-input-group">
                            <label className="register-label">
                                <MapPin size={16} />
                                <span>Dirección</span>
                            </label>
                            <input
                                type="text"
                                className="register-input"
                                placeholder="Calle 10 # 5 - 20"
                                value={formData.address}
                                onChange={(e) => updateFormData('address', e.target.value)}
                            />
                        </div>
                        <div className="register-input-group">
                            <label className="register-label">
                                <MapPin size={16} />
                                <span>Barrio</span>
                            </label>
                            <input
                                type="text"
                                className="register-input"
                                placeholder="Nombre del barrio"
                                value={formData.neighborhood}
                                onChange={(e) => updateFormData('neighborhood', e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 3: // Emergency Contact (Delivery only)
                return (
                    <div className="register-step-content">
                        <div className="register-row">
                            <div className="register-input-group">
                                <label className="register-label">
                                    <Calendar size={16} />
                                    <span>Fecha de nacimiento</span>
                                </label>
                                <input
                                    type="date"
                                    className="register-input"
                                    value={formData.birthDate}
                                    onChange={(e) => updateFormData('birthDate', e.target.value)}
                                />
                            </div>
                            <div className="register-input-group">
                                <label className="register-label">
                                    <Heart size={16} />
                                    <span>Tipo de sangre</span>
                                </label>
                                <select
                                    className="register-input register-select"
                                    value={formData.bloodType}
                                    onChange={(e) => updateFormData('bloodType', e.target.value)}
                                >
                                    {BLOOD_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="register-input-group">
                            <label className="register-label">
                                <User size={16} />
                                <span>Nombre contacto de emergencia</span>
                            </label>
                            <input
                                type="text"
                                className="register-input"
                                placeholder="Nombre completo"
                                value={formData.emergencyContactName}
                                onChange={(e) => updateFormData('emergencyContactName', e.target.value)}
                            />
                        </div>
                        <div className="register-input-group">
                            <label className="register-label">
                                <Phone size={16} />
                                <span>Teléfono contacto de emergencia</span>
                            </label>
                            <input
                                type="tel"
                                className="register-input"
                                placeholder="3001234567"
                                value={formData.emergencyContactPhone}
                                onChange={(e) => updateFormData('emergencyContactPhone', e.target.value.replace(/\D/g, ''))}
                                maxLength={10}
                            />
                        </div>
                    </div>
                );

            case 4: // Vehicle (Delivery only)
                return (
                    <div className="register-step-content">
                        <div className="register-input-group">
                            <label className="register-label">
                                <Truck size={16} />
                                <span>Tipo de vehículo</span>
                            </label>
                            <select
                                className="register-input register-select"
                                value={formData.vehicleType}
                                onChange={(e) => updateFormData('vehicleType', e.target.value as VehicleType)}
                            >
                                <option value="motorcycle">Motocicleta</option>
                                <option value="bicycle">Bicicleta</option>
                                <option value="car">Automóvil</option>
                                <option value="scooter">Scooter</option>
                            </select>
                        </div>
                        <div className="register-row">
                            <div className="register-input-group">
                                <label className="register-label">Placa</label>
                                <input
                                    type="text"
                                    className="register-input"
                                    placeholder="ABC123"
                                    value={formData.vehiclePlate}
                                    onChange={(e) => updateFormData('vehiclePlate', e.target.value.toUpperCase())}
                                    maxLength={7}
                                />
                            </div>
                            <div className="register-input-group">
                                <label className="register-label">Marca</label>
                                <input
                                    type="text"
                                    className="register-input"
                                    placeholder="Yamaha, Honda..."
                                    value={formData.vehicleBrand}
                                    onChange={(e) => updateFormData('vehicleBrand', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="register-row">
                            <div className="register-input-group">
                                <label className="register-label">Modelo</label>
                                <input
                                    type="text"
                                    className="register-input"
                                    placeholder="FZ 2.0 2023"
                                    value={formData.vehicleModel}
                                    onChange={(e) => updateFormData('vehicleModel', e.target.value)}
                                />
                            </div>
                            <div className="register-input-group">
                                <label className="register-label">Color</label>
                                <input
                                    type="text"
                                    className="register-input"
                                    placeholder="Rojo, Azul..."
                                    value={formData.vehicleColor}
                                    onChange={(e) => updateFormData('vehicleColor', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="register-row">
                            <div className="register-input-group">
                                <label className="register-label">Vencimiento SOAT</label>
                                <input
                                    type="date"
                                    className="register-input"
                                    value={formData.soatExpiryDate}
                                    onChange={(e) => updateFormData('soatExpiryDate', e.target.value)}
                                />
                            </div>
                            <div className="register-input-group">
                                <label className="register-label">Vencimiento Técnico-mecánica</label>
                                <input
                                    type="date"
                                    className="register-input"
                                    value={formData.technicalReviewExpiryDate}
                                    onChange={(e) => updateFormData('technicalReviewExpiryDate', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 5: // License (Delivery only)
                return (
                    <div className="register-step-content">
                        <div className="register-input-group">
                            <label className="register-label">
                                <CreditCard size={16} />
                                <span>Número de licencia</span>
                            </label>
                            <input
                                type="text"
                                className="register-input"
                                placeholder="Número de licencia de conducir"
                                value={formData.drivingLicenseNumber}
                                onChange={(e) => updateFormData('drivingLicenseNumber', e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className="register-row">
                            <div className="register-input-group">
                                <label className="register-label">Categoría</label>
                                <select
                                    className="register-input register-select"
                                    value={formData.drivingLicenseCategory}
                                    onChange={(e) => updateFormData('drivingLicenseCategory', e.target.value)}
                                >
                                    {LICENSE_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="register-input-group">
                                <label className="register-label">Fecha de vencimiento</label>
                                <input
                                    type="date"
                                    className="register-input"
                                    value={formData.drivingLicenseExpiry}
                                    onChange={(e) => updateFormData('drivingLicenseExpiry', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 6: // Bank (Delivery only)
                return (
                    <div className="register-step-content">
                        <div className="register-input-group">
                            <label className="register-label">
                                <CreditCard size={16} />
                                <span>Banco</span>
                            </label>
                            <select
                                className="register-input register-select"
                                value={formData.bankName}
                                onChange={(e) => updateFormData('bankName', e.target.value)}
                            >
                                {BANKS.map(bank => (
                                    <option key={bank} value={bank}>{bank}</option>
                                ))}
                            </select>
                        </div>
                        <div className="register-row">
                            <div className="register-input-group">
                                <label className="register-label">Tipo de cuenta</label>
                                <select
                                    className="register-input register-select"
                                    value={formData.accountType}
                                    onChange={(e) => updateFormData('accountType', e.target.value as BankAccountType)}
                                >
                                    <option value="savings">Ahorros</option>
                                    <option value="checking">Corriente</option>
                                </select>
                            </div>
                            <div className="register-input-group">
                                <label className="register-label">Número de cuenta</label>
                                <input
                                    type="text"
                                    className="register-input"
                                    placeholder="Número de cuenta"
                                    value={formData.accountNumber}
                                    onChange={(e) => updateFormData('accountNumber', e.target.value.replace(/\D/g, ''))}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 7: // Preferences (Delivery only)
                return (
                    <div className="register-step-content">
                        <p className="register-preferences-info">
                            Selecciona los tipos de servicios que deseas realizar:
                        </p>
                        <div className="register-checkbox-group">
                            <label className="register-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.acceptsMessaging}
                                    onChange={(e) => updateFormData('acceptsMessaging', e.target.checked)}
                                />
                                <span className="register-checkbox-custom"></span>
                                <span>Mensajería y paquetería</span>
                            </label>
                            <label className="register-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.acceptsErrands}
                                    onChange={(e) => updateFormData('acceptsErrands', e.target.checked)}
                                />
                                <span className="register-checkbox-custom"></span>
                                <span>Mandados y compras</span>
                            </label>
                            <label className="register-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.acceptsTransport}
                                    onChange={(e) => updateFormData('acceptsTransport', e.target.checked)}
                                />
                                <span className="register-checkbox-custom"></span>
                                <span>Transporte de personas</span>
                            </label>
                        </div>
                        <div className="register-input-group">
                            <label className="register-label">
                                <MapPin size={16} />
                                <span>Distancia máxima de entrega: {formData.maxDeliveryDistance} km</span>
                            </label>
                            <input
                                type="range"
                                className="register-range"
                                min="5"
                                max="50"
                                value={formData.maxDeliveryDistance}
                                onChange={(e) => updateFormData('maxDeliveryDistance', parseInt(e.target.value))}
                            />
                            <div className="register-range-labels">
                                <span>5 km</span>
                                <span>50 km</span>
                            </div>
                        </div>

                        {userType === 'delivery' && (
                            <div className="register-notice">
                                <AlertCircle size={18} />
                                <span>Tu cuenta será revisada por un administrador antes de ser aprobada.</span>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="register-form">
            {/* Header */}
            <div className="register-header">
                <button className="register-back-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <h2 className="register-title">
                    Registro de {userType === 'user' ? 'Usuario' : 'Domiciliario'}
                </h2>
            </div>

            {/* Progress Steps */}
            <div className="register-progress">
                {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isCompleted = currentStep > step.id;
                    const isCurrent = currentStep === step.id;

                    return (
                        <div key={step.id} className="register-progress-item">
                            <div
                                className={`register-progress-circle ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                            >
                                {isCompleted ? <Check size={14} /> : <StepIcon size={14} />}
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`register-progress-line ${isCompleted ? 'completed' : ''}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step Title */}
            <div className="register-step-header">
                <span className="register-step-number">Paso {currentStep} de {steps.length}</span>
                <h3 className="register-step-title">{steps[currentStep - 1].title}</h3>
            </div>

            {/* Form Content */}
            {renderStepContent()}

            {/* Error Message */}
            {error && (
                <div className="register-error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="register-actions">
                {currentStep > 1 && (
                    <button
                        className="register-btn register-btn-secondary"
                        onClick={handlePrevious}
                        disabled={isLoading}
                    >
                        <ArrowLeft size={18} />
                        <span>Anterior</span>
                    </button>
                )}

                <button
                    className="register-btn register-btn-primary"
                    onClick={handleNext}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={18} className="spinning" />
                            <span>Procesando...</span>
                        </>
                    ) : currentStep === steps.length ? (
                        <>
                            <Check size={18} />
                            <span>Completar Registro</span>
                        </>
                    ) : (
                        <>
                            <span>Siguiente</span>
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default RegisterForm;