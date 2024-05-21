// src/utils/withAuth.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "./axiosInstance";

const withAuth = (WrappedComponent: React.ComponentType) => {
  const Wrapper: React.FC = (props) => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          setLoading(true);
          await axiosInstance.get("/users/auth/check");
        } catch (error) {
          router.replace("/sign-in");
        } finally {
          setLoading(false);
        }
      };

      checkAuth();
    }, [router]);

    if (loading) {
      return <div>Loading...</div>;
    }

    return <WrappedComponent {...props} />;
  };

  return Wrapper;
};

export default withAuth;
