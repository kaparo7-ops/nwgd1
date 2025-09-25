import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Role, User } from "@/utils/types";
import { users as seedUsers } from "@/data/seed";

export type AuthContextValue = {
  user: User;
  setRole: (role: Role) => void;
  can: (allowed: Role[]) => boolean;
};

const defaultUser = seedUsers[0];

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(defaultUser);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    setRole: (role: Role) => setUser((prev) => ({ ...prev, role })),
    can: (allowed: Role[]) => allowed.includes(user.role)
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
