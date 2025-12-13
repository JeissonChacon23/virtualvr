/**
 * File: /src/context/AuthContext.tsx
 * VirtualVR - Authentication context for global auth state
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase.config';
import { authService } from '../services/auth.service';
import type { UserRole } from '../models';

// Extended user info with role-specific data
interface AuthUser {
    id: string;
    uid: string;
    email: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    isApproved?: boolean; // For delivery persons
    profileImageURL?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string, role: UserRole) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

const COLLECTIONS: Record<UserRole, string> = {
    user: 'users',
    delivery: 'deliveries',
    admin: 'admins'
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch user data from Firestore
    const fetchUserData = async (uid: string): Promise<AuthUser | null> => {
        // Check all collections to find the user
        for (const [role, collection] of Object.entries(COLLECTIONS)) {
            const docRef = doc(db, collection, uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    uid: data.uid || uid,
                    email: data.email,
                    role: role as UserRole,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    isActive: data.isActive ?? true,
                    isApproved: data.isApproved,
                    profileImageURL: data.profileImageURL
                };
            }
        }
        return null;
    };

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userData = await fetchUserData(firebaseUser.uid);
                setUser(userData);
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Login function
    const login = async (email: string, password: string, role: UserRole) => {
        setIsLoading(true);
        try {
            await authService.signIn({ email, password }, role);
            // The onAuthStateChanged listener will update the user state
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    // Logout function
    const logout = async () => {
        setIsLoading(true);
        try {
            await authService.signOut();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Refresh user data
    const refreshUser = async () => {
        if (auth.currentUser) {
            const userData = await fetchUserData(auth.currentUser.uid);
            setUser(userData);
        }
    };

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;