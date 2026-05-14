// eslint-disable-next-line no-unused-vars
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  persistAuthSession,
  useUserLoginMutation,
} from "../../features/auth/auth";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { saveRolePermissionsForRole } from "../../utils/navigationPermissions";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    Email: "",
    Password: "",
  });

  const [userLogin, { isLoading, isError, error }] = useUserLoginMutation(); // Access loading and error states

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await userLogin(formData).unwrap(); // Unwrap response to handle success or error
      persistAuthSession(res.data);
      saveRolePermissionsForRole(
        res.data.user.role,
        res.data.menuPermissions || [],
      );
      // localStorage.setItem('image', res.data.user.image)
      // localStorage.setItem('address', res.data.user.Address)
      // localStorage.setItem('mobile', res.data.user.Mobile)
      // localStorage.setItem('companyName', res.data.user.Name)
      // localStorage.setItem('email', res.data.user.Email)

      if (res.success === true) {
        toast.success("Login Successfully");
        navigate("/");
      }
    } catch (err) {
      console.error("Login failed", err); // Handle the error properly (e.g., show error messages)
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-[#182130]">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-black">
          Sign In
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
              className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white"
              placeholder="Enter Email"
              required
            />
          </div>

          {/* Password Field */}
          {/* <div>
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
              className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
              placeholder="Enter Password"
              required
            />
          </div> */}

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="Password"
                value={formData.Password}
                onChange={handleChange}
                className="w-full p-2 pr-10 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                placeholder="Enter Password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {/* Error message */}
          {isError && (
            <p className="text-red-500 text-sm">
              {error?.data?.message || "Failed to login"}
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
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </div>
          <p className="mt-2 text-center">
            <span className="text-gray-700">Don't have account?</span>
            <span>
              <a className="text-blue-600" href="/register">
                {" "}
                Sign Up
              </a>
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
