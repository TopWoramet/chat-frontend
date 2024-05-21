"use client";

import { useEffect, useState } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import { useRouter } from "next/navigation";
import { connectSocket, disconnectSocket } from "@/utils/socket";
import OnlineUsersList from "@/components/UserList";
import PrivateChat from "@/components/PrivateChat";
import withAuth from "@/utils/withAuth";

export interface User {
  id: string;
  userId: string;
  email: string;
  username: string;
  unreadCount?: number;
  online?: boolean;
  latestTimestamp?: string;
}

interface UserFetch {
  onlineUsers: { users: User[]; isFetched: boolean };
  historyUsers: { users: User[]; isFetched: boolean };
}

const Home: React.FC = () => {
  const [storedToken, initialized] = useLocalStorage("token", "");
  const router = useRouter();
  const [userList, setUserList] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUser] = useLocalStorage("user", "");
  const [userFetchStatus, setUserFetchStatus] = useState<UserFetch>({
    onlineUsers: { users: [], isFetched: false },
    historyUsers: { users: [], isFetched: false },
  });

  useEffect(() => {
    if (!storedToken && initialized) {
      router.push("/sign-in");
    }
  }, [initialized, router, storedToken]);

  useEffect(() => {
    if (storedToken) {
      const socket = connectSocket(storedToken);

      socket.on("connect_error", (err) => {
        // Handle connection error if needed
      });

      socket.on("onlineUsers", (users: User[]) => {
        setUserFetchStatus((prev) => ({
          ...prev,
          onlineUsers: {
            users: users.map((user) => ({ ...user, online: true })),
            isFetched: true,
          },
        }));
      });

      socket.on("historyUsers", (users: User[]) => {
        setUserFetchStatus((prev) => ({
          ...prev,
          historyUsers: { users, isFetched: true },
        }));
      });

      return () => disconnectSocket();
    }
  }, [storedToken, currentUser]);

  useEffect(() => {
    if (
      userFetchStatus.historyUsers.isFetched &&
      userFetchStatus.onlineUsers.isFetched
    ) {
      const userMap = new Map<string, User>();

      userFetchStatus.historyUsers.users.forEach((user) => {
        userMap.set(user.userId, { ...user, online: false });
      });

      userFetchStatus.onlineUsers.users.forEach((user) => {
        if (user.email === currentUser) {
          return;
        }

        if (userMap.has(user.userId)) {
          userMap.set(user.userId, {
            ...userMap.get(user.userId)!,
            ...user,
            online: true,
          });
        } else {
          userMap.set(user.userId, { ...user, unreadCount: 0 });
        }
      });

      const newUserList = Array.from(userMap.values()).sort((a, b) => {
        const aTimestamp = a.latestTimestamp
          ? new Date(a.latestTimestamp)
          : null;
        const bTimestamp = b.latestTimestamp
          ? new Date(b.latestTimestamp)
          : null;
        if (aTimestamp && bTimestamp) {
          return bTimestamp.getTime() - aTimestamp.getTime(); // Sort in descending order
        }
        if (aTimestamp) {
          return -1;
        }
        if (bTimestamp) {
          return 1;
        }
        return 0;
      });

      setUserList(newUserList);
    }
  }, [
    currentUser,
    userFetchStatus.historyUsers.isFetched,
    userFetchStatus.historyUsers.users,
    userFetchStatus.onlineUsers.isFetched,
    userFetchStatus.onlineUsers.users,
  ]);

  const handleUserSelect = (user: User) => setSelectedUser(user);

  return (
    <div className="flex h-[95vh]">
      <div className="w-1/4 bg-gray-200">
        <OnlineUsersList
          onUserSelect={handleUserSelect}
          users={userList}
          selectedUser={selectedUser}
        />
      </div>
      <div className="w-3/4 bg-white">
        <PrivateChat selectedUser={selectedUser} onlineUsers={userList} />
      </div>
    </div>
  );
};

export default withAuth(Home);
