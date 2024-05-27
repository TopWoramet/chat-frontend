"use client";

import { useEffect, useState } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import { useRouter } from "next/navigation";
import OnlineUsersList from "@/components/UserList";
import PrivateChat from "@/components/PrivateChat";
import withAuth from "@/utils/withAuth";
import TopBar from "@/components/TopBar";
import socket from "@/utils/socket";

export interface User {
  id: string;
  userId: string;
  email: string;
  username: string;
  unreadCount?: number;
  online?: boolean;
  latestTimestamp?: string;
}

const Home: React.FC = () => {
  const [storedToken, initialized] = useLocalStorage("token", "");
  const router = useRouter();
  const [userList, setUserList] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUser] = useLocalStorage("user", "");
  const [historyUsers, setHistoryUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!storedToken && initialized) {
      router.push("/sign-in");
    }
  }, [initialized, router, storedToken]);

  useEffect(() => {
    socket.connect();

    socket.on("connect_error", (err) => {
      // Handle connection error if needed
    });

    socket.on("onlineUsers", (users: User[]) => {
      setOnlineUsers(users);
    });

    socket.on("historyUsers", (users: User[]) => {
      setHistoryUsers(users);
    });

    return () => {
      socket.disconnect();
    };
    // }
  }, [storedToken, currentUser]);

  useEffect(() => {
    const mergedUsers = mergeUsers(historyUsers, onlineUsers);
    setUserList(mergedUsers);
  }, [onlineUsers, historyUsers]);

  const mergeUsers = (historyUsers: User[], onlineUsers: User[]): User[] => {
    const userMap = new Map<string, User>();

    historyUsers.forEach((user) => {
      userMap.set(user.userId, { ...user, online: false });
    });

    onlineUsers.forEach((user) => {
      if (user.email === JSON.parse(currentUser).email) return;
      if (userMap.has(user.userId)) {
        const existingUser = userMap.get(user.userId)!;
        userMap.set(user.userId, { ...existingUser, ...user, online: true });
      } else {
        userMap.set(user.userId, { ...user, unreadCount: 0, online: true });
      }
    });

    const sortedUsers = Array.from(userMap.values()).sort((a, b) => {
      const aTimestamp = a.latestTimestamp ? new Date(a.latestTimestamp) : null;
      const bTimestamp = b.latestTimestamp ? new Date(b.latestTimestamp) : null;
      if (aTimestamp && bTimestamp) {
        return bTimestamp.getTime() - aTimestamp.getTime();
      }
      if (aTimestamp) {
        return -1;
      }
      if (bTimestamp) {
        return 1;
      }
      return 0;
    });

    return sortedUsers;
  };

  const handleUserSelect = (user: User) => setSelectedUser(user);

  return (
    <>
      <TopBar />
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
    </>
  );
};

export default withAuth(Home);
