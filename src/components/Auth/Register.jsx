// eslint-disable-next-line no-unused-vars
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useUserRegisterMutation } from "../../features/auth/auth";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    Email: "",
    Password: "",
  });

  const [userRegister, { isLoading, isError, error }] =
    useUserRegisterMutation(); // Access loading and error states

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await userRegister(formData).unwrap(); // Unwrap response to handle success or error

      if (res.success === true) {
        toast.success("Registration Successfully");
        navigate("/");
      }
    } catch (err) {
      console.error("Registration failed", err.message); // Handle the error properly (e.g., show error messages)
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-[#182130]">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-black">
          Sign Up
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="Email"
              value={formData.Email}
              onChange={handleChange}
              className="w-full mt-1 p-2 border bg-white border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
              placeholder="Enter Email"
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="Password"
              value={formData.Password}
              onChange={handleChange}
              className="w-full mt-1 p-2 border bg-white border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
              placeholder="Enter Password"
              required
            />
          </div>

          {/* Error message */}
          {isError && (
            <p className="text-red-500 text-sm">
              {error?.data?.message || "Failed to Registration"}
            </p>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-700"
              }`}
              disabled={isLoading} // Disable button when loading
            >
              {isLoading ? "Signing up..." : "Sign Up"}
            </button>
          </div>
          <p className="mt-2 text-center">
            <span className="text-gray-700">Already have an account?</span>
            <span>
              <a className="text-blue-600" href="/login">
                {" "}
                Sign In
              </a>
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
