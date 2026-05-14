import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light"); // "light" | "dark"

  // প্রথম লোডে localStorage থেকে theme নেবে
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const initial = saved || "light";
    setTheme(initial);

    if (initial === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);

    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="h-10 w-10 rounded-md flex items-center justify-center
                 bg-white border border-slate-200 hover:bg-slate-100
                 dark:bg-[#2f3133] dark:border-white/10 dark:hover:bg-white/5"
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? (
        <Sun size={18} className="text-white/80" />
      ) : (
        <Moon size={18} className="text-slate-700" />
      )}
    </button>
  );
}
