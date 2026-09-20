import { createContext, useContext, useState } from 'react';

interface User {
  name: string;
  email: string;
  avatar: string;
}

const DEMO_USER: User = {
  name: 'Alex Chen',
  email: 'alex@reach.app',
  avatar: 'AC',
};

interface UserContextValue {
  user: User;
}

const UserContext = createContext<UserContextValue>({ user: DEMO_USER });

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user] = useState<User>(DEMO_USER);
  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
}

export function useUser() { return useContext(UserContext); }
