"use client";

import React from "react";
import { FaSignOutAlt } from "react-icons/fa";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useRouter } from "next/navigation";

const TopBar: React.FC = () => {
  const [, , , removeToken] = useLocalStorage("token", "");
  const [user, , , removeUser] = useLocalStorage("user", "");
  const router = useRouter();

  const handleLogout = () => {
    removeToken();
    removeUser();
    router.push("/sign-in");
  };

  return (
    <div className="bg-gray-800 text-white p-4 flex h-[5vh] justify-between">
      <p className="text-sm flex items-center">User : {user}</p>
      <button onClick={handleLogout} className="flex items-center">
        <FaSignOutAlt className="mr-1" />
        Logout
      </button>
    </div>
  );
};

export default TopBar;
