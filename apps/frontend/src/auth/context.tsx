import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

//Importa y reexporta UserDoc para evitar dependencias circulares
export type { UserDoc } from "@/lib/firebase";

export type AuthState = {
    user: User | null;
    userDoc: import("@/lib/firebase").UserDoc | null;
    loading: boolean;
};

const defaultValue: AuthState = {
    user: null,
    userDoc: null,
    loading: true,
};

export const AuthContext = createContext<AuthState>(defaultValue);

export function useAuth() {
    return useContext(AuthContext);
}
