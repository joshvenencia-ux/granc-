import { useEffect, useState } from "react";
import { observeAuth, observeUserDoc, type UserDoc } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { AuthContext } from "./context";

/**
 *Firebase(user)
 *Firestore(userDoc)
 mantiene true hasta recibir el primer userDoc(o confirmar que no hay)
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeDoc: (() => void) | undefined;

        const unsubscribeAuth = observeAuth((u) => {
            setUser(u);

            
            if (unsubscribeDoc) {
                unsubscribeDoc();
                unsubscribeDoc = undefined;
            }
            setUserDoc(null);
            setLoading(true);

            if (u) {
                
                let first = true;
                unsubscribeDoc = observeUserDoc(u.uid, (doc) => {
                    setUserDoc(doc ?? null);
                    if (first) {
                        setLoading(false);
                        first = false;
                    }
                });
            } else {
                
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, userDoc, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
