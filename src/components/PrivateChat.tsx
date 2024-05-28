import { User } from "@/app/page";
import useLocalStorage from "@/hooks/useLocalStorage";
import dayjs from "dayjs";
import React, {
  FormEvent,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { v4 as uuidv4 } from "uuid";
import isToday from "dayjs/plugin/isToday";
import socket from "@/utils/socket";

dayjs.extend(isToday);

interface MessageCreate {
  id: string;
  receiverId: string;
  content: string;
}

interface Message {
  id?: string;
  content: string;
  readTime?: string;
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

interface AlertMessage {
  visible: boolean;
  content: string;
  from: string;
}

const truncateContent = (content: string, limit: number = 100) =>
  content.length > limit ? content.slice(0, limit) + "..." : content;

const PAGE_SIZE = 10;

const PrivateChat: React.FC<PrivateChatProps> = ({ selectedUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [user] = useLocalStorage("user", "");
  const [callbackSendMessage, setCallbackSendMessage] =
    useState<CallbackSendMessage | null>(null);
  const [alertMessage, setAlertMessage] = useState<AlertMessage>({
    visible: false,
    content: "",
    from: "",
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (callbackSendMessage) {
      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          message.tempId === callbackSendMessage.tempId
            ? {
                ...message,
                id: callbackSendMessage.id,
                timestamp: callbackSendMessage.timestamp,
              }
            : message
        )
      );
      setCallbackSendMessage(null);
    }
  }, [callbackSendMessage]);

  const handlePrivateMessage = useCallback(
    (message: Message & { from: string }) => {
      if (selectedUser && selectedUser.email === message.from) {
        setMessages((prevMessages) => [...prevMessages, message]);
        updateReadMessages([message]);
      } else {
        setAlertMessage({
          visible: true,
          content: truncateContent(message.content),
          from: message.from,
        });
      }
      if (audioRef.current) {
        audioRef.current.src = "/message-alert.wav";
        audioRef.current.play();
      }
    },
    [selectedUser]
  );

  const handleMessagesHistorical = useCallback(
    (response: { messages: Message[]; nextPage: number | null }) => {
      const currentScrollHeight = messageListRef.current?.scrollHeight || 0;
      setIsLoading(false);
      setNextPage(response.nextPage);
      setMessages((prevMessages) => [...response.messages, ...prevMessages]);
      updateReadMessages(response.messages);
      requestAnimationFrame(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop =
            messageListRef.current.scrollHeight - currentScrollHeight + 60;
        }
      });
    },
    []
  );

  const fetchMessages = useCallback(
    (page: number | null) => {
      if (selectedUser && page) {
        setIsLoading(true);
        socket.emit(
          "messagesHistorical",
          selectedUser.userId,
          page,
          PAGE_SIZE,
          handleMessagesHistorical
        );
      }
    },
    [handleMessagesHistorical, selectedUser]
  );

  const handleMessagesRead = useCallback(
    ({
      messageIds,
      readTime,
      from,
    }: {
      messageIds: string[];
      readTime: string;
      from: string;
    }) => {
      if (from === selectedUser?.email || JSON.parse(user).email === from) {
        setMessages((prevMessages) =>
          prevMessages.map((message) =>
            messageIds.includes(message.id!)
              ? { ...message, readTime }
              : message
          )
        );
      }
    },
    [selectedUser, user]
  );

  useEffect(() => {
    socket.on("privateMessage", handlePrivateMessage);
    if (selectedUser) {
      setMessages([]);
      setNextPage(null);
      fetchMessages(1);
      socket.on("messagesRead", handleMessagesRead);
    }
    return () => {
      socket.off("messagesRead", handleMessagesRead);
      socket.off("privateMessage", handlePrivateMessage);
    };
  }, [selectedUser, handlePrivateMessage, handleMessagesRead]);

  useEffect(() => {
    if (messages.length <= PAGE_SIZE) {
      scrollToBottom();
    }
  }, [messages]);

  const updateReadMessages = (messages: Message[]) => {
    const unreadMessages = messages.filter(
      (message) => !message.readTime && !message.fromSelf
    );
    const unreadMessageIds = unreadMessages.map((message) => message.id!);
    if (unreadMessageIds.length) {
      socket.emit("messagesRead", unreadMessageIds);
    }
  };

  const handleMessageSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser || !newMessage) return;

    const message: MessageCreate = {
      receiverId: selectedUser.userId,
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

    setMessages((prevMessages) => [
      ...prevMessages,
      { ...message, fromSelf: true, tempId: message.id, id: undefined },
    ]);
    setNewMessage("");
  };

  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPage) {
          fetchMessages(nextPage);
        }
      },
      { root: messageListRef.current, threshold: 0.1 }
    );

    const target = targetRef.current;
    if (target) {
      observer.current.observe(target);
    }
    return () => {
      if (target) {
        observer.current?.unobserve(target);
      }
    };
  }, [nextPage]);

  return (
    <div className="p-4 mx-auto bg-white shadow-lg rounded-lg">
      <audio ref={audioRef} src="/message-alert.wav" preload="auto" />
      <h2 className="text-2xl font-bold mb-4 text-center">Private Chat</h2>
      {alertMessage.visible && (
        <div
          className="fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded flex flex-col"
          role="alert"
        >
          <span
            onClick={() =>
              setAlertMessage({ visible: false, content: "", from: "" })
            }
            className="absolute top-0 bottom-0 right-0 px-1 py-1"
          >
            <svg
              className="fill-current h-4 w-4 text-blue-500"
              role="button"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <title>Close</title>
              <path d="M14.348 5.652a1 1 0 011.415 0l.087.086a1 1 0 010 1.415L11.415 12l4.435 4.435a1 1 0 01-1.415 1.415l-4.435-4.435-4.435 4.435a1 1 0 01-1.415-1.415l4.435-4.435-4.435-4.435a1 1 0 011.415-1.415l4.435 4.435 4.435-4.435z" />
            </svg>
          </span>
          <strong className="font-bold">{alertMessage.from}</strong>
          <span className="block sm:inline">{alertMessage.content}</span>
        </div>
      )}
      {selectedUser ? (
        <div>
          <div className="mb-4 text-center">
            <strong>Chatting with:</strong>{" "}
            <span className="text-blue-500">{selectedUser.email}</span>
          </div>
          <div
            className="mb-4 h-[70vh] overflow-y-auto border p-4 rounded-lg bg-gray-50"
            ref={messageListRef}
          >
            {isLoading && (
              <div className="relative  flex justify-center items-center gap-2">
                <div className="animate-spin loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12" />
                <p>Loading...</p>
              </div>
            )}
            <div id="infinite-scroll-target" ref={targetRef}></div>
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
                  <p>{message.content}</p>
                  <div className="text-xs mt-1">
                    {message.timestamp ? (
                      <small className="text-black rounded-lg bg-green-100 py-0.5 px-1">
                        Sent at{" "}
                        {dayjs(message.timestamp).isToday()
                          ? dayjs(message.timestamp).format("HH:mm")
                          : dayjs(message.timestamp).format("HH:mm DD/MM/YYYY")}
                      </small>
                    ) : (
                      <small className="text-red-600">send failed</small>
                    )}
                    {message.readTime && (
                      <>
                        <span> - </span>
                        <small className="text-black rounded-lg bg-red-100 py-0.5 px-1">
                          Read at{" "}
                          {dayjs(message.readTime).isToday()
                            ? dayjs(message.readTime).format("HH:mm")
                            : dayjs(message.readTime).format(
                                "HH:mm DD/MM/YYYY"
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
