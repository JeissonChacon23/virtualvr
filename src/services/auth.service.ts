// src/services/auth.service.ts
// Authentication Service for VirtualVR

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    reauthenticateWithCredential,
    EmailAuthProvider,
    updatePassword
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase.config';
import type {
    UserRole,
    BaseUser,
    LoginCredentials,
    UserRegistrationData,
    DeliveryRegistrationData
} from '../models';

// Collection names for each user type
const COLLECTIONS = {
    user: 'users',
    delivery: 'deliveries',
    admin: 'admins'
} as const;

class AuthService {
    // Sign in user with email and password
    async signIn(credentials: LoginCredentials, role: UserRole): Promise<BaseUser> {
        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                credentials.email,
                credentials.password
            );

            // Get user data from the corresponding collection
            const userData = await this.getUserByRole(userCredential.user.uid, role);

            if (!userData) {
                await signOut(auth);
                throw new Error('Usuario no encontrado en el sistema como ' + this.getRoleName(role));
            }

            return userData;
        } catch (error: unknown) {
            throw this.handleAuthError(error);
        }
    }

    // Sign out current user
    async signOut(): Promise<void> {
        try {
            await signOut(auth);
        } catch (error: unknown) {
            throw this.handleAuthError(error);
        }
    }

    // Change password for current user
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        try {
            const user = auth.currentUser;

            if (!user || !user.email) {
                throw new Error('No hay usuario autenticado');
            }

            // Re-authenticate user with current password
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);
        } catch (error: unknown) {
            throw this.handleAuthError(error);
        }
    }

    // Sign up user/client with full registration data
    async signUpUser(data: UserRegistrationData): Promise<BaseUser> {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                data.email,
                data.password
            );

            const uid = userCredential.user.uid;

            const userData = {
                uid,
                email: data.email,
                role: 'user',
                firstName: data.firstName,
                lastName: data.lastName,
                idCard: data.idCard,
                phone: data.phone,
                address: data.address,
                neighborhood: data.neighborhood,
                profileImageURL: null,
                registerDate: serverTimestamp(),
                isActive: true,
                isPreferential: false,
                rateTableId: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = doc(db, 'users', uid);
            await setDoc(docRef, userData);

            return {
                id: uid,
                email: data.email,
                role: 'user',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            } as BaseUser;
        } catch (error: unknown) {
            throw this.handleAuthError(error);
        }
    }

    // Sign up delivery person with full registration data
    async signUpDelivery(data: DeliveryRegistrationData): Promise<BaseUser> {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                data.email,
                data.password
            );

            const uid = userCredential.user.uid;

            const toTimestamp = (dateStr: string): Timestamp | null => {
                if (!dateStr) return null;
                return Timestamp.fromDate(new Date(dateStr));
            };

            const deliveryData = {
                uid,
                email: data.email,
                role: 'delivery',
                firstName: data.firstName,
                lastName: data.lastName,
                idCard: data.idCard,
                phone: data.phone,
                address: data.address,
                neighborhood: data.neighborhood,
                birthDate: toTimestamp(data.birthDate),
                bloodType: data.bloodType,
                emergencyContactName: data.emergencyContactName,
                emergencyContactPhone: data.emergencyContactPhone,
                vehicleType: data.vehicleType,
                vehiclePlate: data.vehiclePlate.toUpperCase(),
                vehicleBrand: data.vehicleBrand,
                vehicleModel: data.vehicleModel,
                vehicleColor: data.vehicleColor,
                soatExpiryDate: toTimestamp(data.soatExpiryDate),
                technicalReviewExpiryDate: toTimestamp(data.technicalReviewExpiryDate),
                drivingLicenseNumber: data.drivingLicenseNumber,
                drivingLicenseCategory: data.drivingLicenseCategory,
                drivingLicenseExpiry: toTimestamp(data.drivingLicenseExpiry),
                bankName: data.bankName,
                accountType: data.accountType,
                accountNumber: data.accountNumber,
                acceptsMessaging: data.acceptsMessaging,
                acceptsErrands: data.acceptsErrands,
                acceptsTransport: data.acceptsTransport,
                maxDeliveryDistance: data.maxDeliveryDistance,
                isProfileComplete: true,
                status: 'offline',
                currentOrderId: null,
                registerDate: serverTimestamp(),
                isActive: true,
                isApproved: false,
                totalDeliveries: 0,
                rating: 0,
                totalEarnings: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = doc(db, 'deliveries', uid);
            await setDoc(docRef, deliveryData);

            return {
                id: uid,
                email: data.email,
                role: 'delivery',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            } as BaseUser;
        } catch (error: unknown) {
            throw this.handleAuthError(error);
        }
    }

    // Get user data by role from the corresponding collection
    async getUserByRole(uid: string, role: UserRole): Promise<BaseUser | null> {
        const collection = COLLECTIONS[role];
        const docRef = doc(db, collection, uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
            } as BaseUser;
        }

        return null;
    }

    // Find user across all collections
    async findUserInAllCollections(uid: string): Promise<{ user: BaseUser; role: UserRole } | null> {
        for (const [role, collection] of Object.entries(COLLECTIONS)) {
            const docRef = doc(db, collection, uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    user: {
                        id: docSnap.id,
                        ...data,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        updatedAt: data.updatedAt?.toDate() || new Date()
                    } as BaseUser,
                    role: role as UserRole
                };
            }
        }

        return null;
    }

    // Listen to auth state changes
    onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void {
        return onAuthStateChanged(auth, callback);
    }

    // Get role display name in Spanish
    private getRoleName(role: UserRole): string {
        const names = {
            user: 'Usuario',
            delivery: 'Domiciliario',
            admin: 'Administrador'
        };
        return names[role];
    }

    // Handle authentication errors with Spanish messages
    private handleAuthError(error: unknown): Error {
        const firebaseError = error as { code?: string; message?: string };
        const errorCode = firebaseError.code || '';

        const errorMessages: Record<string, string> = {
            'auth/invalid-email': 'El correo electrónico no es válido',
            'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
            'auth/user-not-found': 'No existe una cuenta con este correo',
            'auth/wrong-password': 'La contraseña es incorrecta',
            'auth/email-already-in-use': 'Este correo ya está registrado',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
            'auth/invalid-credential': 'Las credenciales proporcionadas son inválidas'
        };

        return new Error(errorMessages[errorCode] || 'Ha ocurrido un error. Intenta nuevamente');
    }

    // Get current authenticated user with their data
    async getCurrentUser(): Promise<BaseUser | null> {
        const firebaseUser = auth.currentUser;

        if (!firebaseUser) {
            return null;
        }

        const result = await this.findUserInAllCollections(firebaseUser.uid);

        if (!result) {
            return null;
        }

        return result.user;
    }
}

export const authService = new AuthService();
export default authService;