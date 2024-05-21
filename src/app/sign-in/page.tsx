"use client";

import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";
import useLocalStorage from "@/hooks/useLocalStorage";
// import axiosInstance from "@/utils/axiosInstance";
import { useEffect } from "react";
import { JwtPayload, jwtDecode } from "jwt-decode";
import axios from "axios";
import axiosInstance from "@/utils/axiosInstance";

interface User {
  id: string;
  email: string;
  username: string;
}

interface SignInResponse {
  user: User;
  token: string;
}

interface SignInFormInputs {
  identifier: string;
  password: string;
}

const SignIn = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormInputs>();
  const router = useRouter();
  const [token, tokenInitialized, setToken] = useLocalStorage("token", "");
  const [user, userInitialized, setUser] = useLocalStorage("user", "");

  useEffect(() => {
    if (token && tokenInitialized) {
      router.push("/");
    }
  }, [tokenInitialized, router, token]);

  const onSubmit: SubmitHandler<SignInFormInputs> = async (data) => {
    try {
      const response = await axiosInstance.post<SignInResponse>(
        "/users/sign-in",
        {
          identifier: data.identifier,
          password: data.password,
        }
      );
      setToken(response.data.token);
      const decoded = jwtDecode(response.data.token) 
      setUser((decoded as any).email);
      router.push("/");
    } catch (error: any) {
      console.error("Sign in error", error);
    }
  };

  const handleSignUp = () => {
    router.push("/sign-up");
  };

  //generate by https://chatgpt.com/
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="identifier" className="sr-only">
                Username
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                {...register("identifier", {
                  required: "Username is required",
                })}
              />
              {errors.identifier && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.identifier.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                {...register("password", { required: "Password is required" })}
              />
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
        </form>
        <div className="mt-4 flex justify-center">
          <span className="text-sm text-gray-600">Don't have an account?</span>
          <button
            onClick={handleSignUp}
            type="button"
            className="ml-1 font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
