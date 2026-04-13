import { Link, useLocation } from "react-router-dom";

// UI //
import { Scale } from "lucide-react";
import { Button } from "../ui/Button";

const MainHeader = () => {
  const { pathname } = useLocation();

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-8 flex gap-96 h-full">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lumenjuris">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-lumenjuris tracking-tight">
              LumenJuris
            </span>
            <span className="text-[10px] text-gray-400 leading-none">
              Conformité RH
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/inscription">
            <Button
              variant="ghost"
              size="lg"
              className={
                pathname === "/inscription"
                  ? " text-gray-500 tracking-wide font-semibold text-[16px] hover:cursor-default"
                  : "text-gray-400"
              }
            >
              Se connecter
            </Button>
          </Link>
          <Link to="/analyzer">
            <Button
              variant="ghost"
              size="lg"
              className={
                pathname === "/analyzer"
                  ? "bg-lumenjuris text-lumenjuris-background tracking-wide font-semibold"
                  : "text-gray-400"
              }
            >
              Analyse
            </Button>
          </Link>
          <Link to="/mon-compte">
            <Button
              variant="ghost"
              size="lg"
              className={
                pathname === "/mon-compte"
                  ? "bg-lumenjuris text-lumenjuris-background tracking-wide font-semibold"
                  : "text-gray-400"
              }
            >
              Mon compte
            </Button>
          </Link>
          <Link to="/sandbox">
            <Button
              variant="ghost"
              size="lg"
              className={
                pathname === "/mon-compte"
                  ? "bg-lumenjuris text-lumenjuris-background tracking-wide font-semibold"
                  : "text-gray-400"
              }
            >
              Sandbox
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default MainHeader;
