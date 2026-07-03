import { useState } from "react";
import { Link, useLocation } from "react-router";
import { BookOpenIcon, LayoutDashboardIcon, SparklesIcon, PaintbrushIcon } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";

const THEMES = [
  { id: "forest", name: "🌲 Forest", preview: ["#171212", "#1eb854"] },
  { id: "dark", name: "🕶️ Dark", preview: ["#1d232a", "#0984e3"] },
  { id: "light", name: "☀️ Light", preview: ["#ffffff", "#570df8"] },
  { id: "synthwave", name: "🌆 Synthwave", preview: ["#1a103c", "#f43f5e"] },
  { id: "cyberpunk", name: "🤖 Cyberpunk", preview: ["#ffee00", "#ff007f"] },
  { id: "valentine", name: "💖 Valentine", preview: ["#ffe4e6", "#e11d48"] },
  { id: "aqua", name: "💧 Aqua", preview: ["#0b1f3b", "#09d3ac"] },
  { id: "nord", name: "❄️ Nord", preview: ["#2e3440", "#88c0d0"] },
  { id: "dracula", name: "🧛 Dracula", preview: ["#282a36", "#50fa7b"] },
  { id: "retro", name: "📜 Retro", preview: ["#ece3ca", "#ef9fbc"] },
  { id: "coffee", name: "☕ Coffee", preview: ["#20161f", "#c0a0c0"] },
];

function Navbar() {
  const location = useLocation();
  const [currentTheme, setCurrentTheme] = useState(
    localStorage.getItem("talent-iq-theme") || "forest"
  );

  const handleThemeChange = (theme) => {
    setCurrentTheme(theme);
    localStorage.setItem("talent-iq-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  console.log(location);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-base-100/80 backdrop-blur-md border-b border-primary/20 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto p-4 flex items-center justify-between">
        {/* LOGO */}
        <Link
          to="/"
          className="group flex items-center gap-3 hover:scale-105 transition-transform duration-200"
        >
          <div className="size-10 rounded-xl bg-gradient-to-r from-primary via-secondary to-accent flex items-center justify-center shadow-lg ">
            <SparklesIcon className="size-6 text-white" />
          </div>

          <div className="flex flex-col">
            <span className="font-black text-xl bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent font-mono tracking-wider">
              Talent IQ
            </span>
            <span className="text-xs text-base-content/60 font-medium -mt-1">Code Together</span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {/* PROBLEMS PAGE LINK */}
          <Link
            to={"/problems"}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 
              ${
                isActive("/problems")
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
              }
              
              `}
          >
            <div className="flex items-center gap-x-2.5">
              <BookOpenIcon className="size-4" />
              <span className="font-medium hidden sm:inline">Problems</span>
            </div>
          </Link>

          {/* DASHBORD PAGE LINK */}
          <Link
            to={"/dashboard"}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 
              ${
                isActive("/dashboard")
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
              }
              
              `}
          >
            <div className="flex items-center gap-x-2.5">
              <LayoutDashboardIcon className="size-4" />
              <span className="font-medium hidden sm:inline">Dashbord</span>
            </div>
          </Link>

          {/* THEME SELECTOR */}
          <div className="dropdown dropdown-end ml-3 mt-1">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle hover:bg-base-200 hover:scale-105 transition-all duration-200"
              title="Change Theme"
            >
              <PaintbrushIcon className="size-5 text-primary animate-pulse" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu p-3 shadow-2xl bg-base-200/95 backdrop-blur-md rounded-2xl w-80 z-[100] border border-primary/20 mt-2 animate-scale-up"
            >
              <li className="menu-title text-[10px] uppercase tracking-wider font-extrabold text-primary/80 px-2 py-1.5 border-b border-base-content/10 mb-2">
                Select Theme
              </li>
              <div className="grid grid-cols-2 gap-1.5">
                {THEMES.map((t) => (
                  <li key={t.id} className="list-none">
                    <button
                      onClick={() => handleThemeChange(t.id)}
                      className={`flex items-center justify-between w-full px-2.5 py-2.5 rounded-xl text-xs transition-all duration-200 active:scale-95 ${
                        currentTheme === t.id
                          ? "bg-gradient-to-r from-primary to-secondary text-primary-content font-bold shadow-md shadow-primary/30 scale-102"
                          : "hover:bg-base-300 hover:text-base-content text-base-content/80 font-medium"
                      }`}
                    >
                      <span>{t.name}</span>
                      <span className="flex gap-0.5 shrink-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: t.preview[0] }}
                          title="Background"
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: t.preview[1] }}
                          title="Primary Color"
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </div>
            </ul>
          </div>

          <div className="ml-3 mt-2">
            <UserButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
export default Navbar;
