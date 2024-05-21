import { User } from "@/app/page";
import useLocalStorage from "@/hooks/useLocalStorage";
import { connectSocket } from "@/utils/socket";
import dayjs from "dayjs";
import React, { FormEvent, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import isToday from "dayjs/plugin/isToday";

dayjs.extend(isToday);

interface MessageCreate {
  id: string;
  to: string;
  receiverId: string;
  content: string;
}

interface Message {
  id?: string;
  content: string;
  readTime?: Date;
  timestamp?: Date;
  fromSelf: boolean;
  tempId?: string;
}

interface PrivateChatProps {
  selectedUser: User | null;
  onlineUsers: User[];
}

interface CallbackSendMessage {
  id: string;
  timestamp: Date;
  tempId: string;
}

const PrivateChat: React.FC<PrivateChatProps> = ({ selectedUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [token] = useLocalStorage("token", "");
  const [user] = useLocalStorage("user", "");
  const [callbackSendMessage, setCallbackSendMessage] =
    useState<CallbackSendMessage | null>(null);

  useEffect(() => {
    if (callbackSendMessage) {
      const messageSended = messages.find(
        (message) => message.tempId === callbackSendMessage.tempId
      );
      if (messageSended) {
        messageSended.id = callbackSendMessage.id;
        messageSended.timestamp = callbackSendMessage.timestamp;
        setMessages([...messages]);
        setCallbackSendMessage(null);
      }
    }
  }, [callbackSendMessage, messages]);

  useEffect(() => {
    if (selectedUser) {
      const socket = connectSocket(token);

      socket.emit(
        "messagesHistorical",
        selectedUser?.userId,
        (response: { messages: Message[] }) => {
          setMessages(response.messages);
          updateReadMessages(response.messages);
        }
      );

      socket.on("privateMessage", (message: Message & { from: string }) => {
        if (selectedUser?.email === message.from) {
          setMessages((prevMessages) => [...prevMessages, message]);
          updateReadMessages([message]);
        }
      });

      socket.on(
        "messagesRead",
        ({
          messageIds,
          readTime,
          from,
        }: {
          messageIds: string[];
          readTime: Date;
          from: string;
        }) => {
          if (from === selectedUser?.email || user === from) {
            setMessages((prevMessages) =>
              prevMessages.map((message) =>
                messageIds.includes(message.id!)
                  ? { ...message, readTime }
                  : message
              )
            );
          }
        }
      );

      return () => {
        socket.off("privateMessage");
        socket.off("messagesRead");
      };
    }
  }, [selectedUser, token, user]);

  const updateReadMessages = (messages: Message[]) => {
    const socket = connectSocket(token);

    const unreadMessages = messages.filter(
      (message) => !message.readTime && !message.fromSelf
    );
    const unreadMessageIds = unreadMessages.map((message) => message.id);
    if (unreadMessageIds.length) {
      socket.emit("messagesRead", unreadMessageIds);
    }
  };

  const handleMessageSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const socket = connectSocket(token);

    if (!selectedUser || !newMessage) return;
    const message: MessageCreate = {
      receiverId: selectedUser.userId,
      to: selectedUser.id,
      content: newMessage,
      id: uuidv4(),
    };

    socket.emit(
      "privateMessage",
      message,
      (response: { id: string; timestamp: Date }) => {
        setCallbackSendMessage({ ...response, tempId: message.id });
      }
    );

    setMessages([
      ...messages,
      {
        ...message,
        fromSelf: true,
        tempId: message.id,
        id: undefined,
      },
    ]);
    setNewMessage("");
  };

  return (
    <div className="p-4 mx-auto bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Private Chat</h2>
      {selectedUser ? (
        <div>
          <div className="mb-4 text-center">
            <strong>Chatting with:</strong>{" "}
            <span className="text-blue-500">{selectedUser.email}</span>
          </div>
          <div className="mb-4 h-[70vh] overflow-y-auto border p-4 rounded-lg bg-gray-50">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`mb-3 ${
                  message.fromSelf ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`inline-block p-2 rounded-lg ${
                    message.fromSelf
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-black"
                  }`}
                >
                  <p className="">{message.content}</p>
                  <div className="text-xs mt-1">
                    {message.timestamp ? (
                      <small className="text-white-500">
                        Sent at{" "}
                        {dayjs(message.readTime).isToday()
                          ? dayjs(message.timestamp).format("HH:mm:ss")
                          : dayjs(message.timestamp).format(
                              "HH:mm:ss DD/MM/YYYY"
                            )}
                      </small>
                    ) : (
                      <small className="text-red-600">send failed</small>
                    )}
                    {message.readTime && (
                      <>
                        <span> - </span>
                        <small className="text-white-500">
                          Read at{" "}
                          {dayjs(message.readTime).isToday()
                            ? dayjs(message.timestamp).format("HH:mm:ss")
                            : dayjs(message.timestamp).format(
                                "HH:mm:ss DD/MM/YYYY"
                              )}
                        </small>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleMessageSend} className="flex mt-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow border rounded-l px-4 py-2 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 focus:outline-none"
            >
              Send
            </button>
          </form>
        </div>
      ) : (
        <div className="text-center text-gray-500">
          Please select a user to start chatting
        </div>
      )}
    </div>
  );
};

export default PrivateChat;
