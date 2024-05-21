import { User } from "@/app/page";
import React from "react";

interface OnlineUsersListProps {
  users: User[];
  onUserSelect: (user: User) => void;
  selectedUser: User | null;
}

const UserList: React.FC<OnlineUsersListProps> = ({
  users,
  onUserSelect,
  selectedUser,
}) => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Users</h2>
      <ul className="space-y-2">
        {users.map((user) => (
          <li
            key={user.id}
            className={`flex items-center justify-between cursor-pointer px-4 py-2 rounded-lg hover:bg-gray-100 ${
              user.id === selectedUser?.id ? "bg-gray-100" : ""
            }`}
            onClick={() => onUserSelect(user)}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 mr-2 bg-gray-500 text-white rounded-full flex items-center justify-center">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{user.email}</p>
                {user.username && (
                  <p className="text-xs text-gray-600">{user.username}</p>
                )}
              </div>
            </div>
            <div className="flex items-center">
              {user.online && (
                <span
                  className="h-3 w-3 rounded-full bg-green-500 mr-2"
                  title="Online"
                ></span>
              )}
              {user.unreadCount !== undefined && user.unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {user.unreadCount}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
