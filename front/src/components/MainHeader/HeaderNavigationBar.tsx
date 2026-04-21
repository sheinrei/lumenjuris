// UI //
import {
  LogInIcon,
  FileCheckIcon,
  User,
  ScatterChartIcon,
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOutIcon,
} from "lucide-react";
import { Button } from "../ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/DropDownMenu";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { useAuth } from "../../context/AuthContext";
import { UserDataProfile } from "../../types/userData";

interface HeaderNavBarProps {
  onNavClick?: () => void;
}

const HeaderNavigationBar = ({ onNavClick }: HeaderNavBarProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const [isConnected, setIsConnected] = useState(false);
  const [userData, setUserData] = useState<UserDataProfile | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [userInfoError, setUserInfoError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/user/get", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const dataResponse = await response.json();
        console.log("USER DATA :", dataResponse);
        if (!dataResponse.success) {
          setUserInfoError(dataResponse.message);
        } else if (
          dataResponse.success &&
          dataResponse.data.profile.isVerified
        ) {
          setIsConnected(true);
          setUserData(dataResponse.data.profile);
          setUserAvatarUrl(dataResponse.data.provider.avatarUrl);
          login(
            dataResponse.data.profile.role,
            dataResponse.data.profile.isVerified,
            true,
          );
        }
      } catch (error) {
        console.error("🛑🛑🛑 ERREUR SERVEUR GET USER", error);
        setUserInfoError("Un problème est survenu, veuillez vous reconnecter.");
      }
    };
    fetchData();
  }, [isConnected]);

  const handleUserLogout = () => {
    const fetchLogout = async () => {
      try {
        const response = await fetch("/api/user/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const logoutResponse = await response.json();
        console.log("LOGOUT RES : ", logoutResponse);
        if (logoutResponse.success) {
          setIsConnected(false);
          setUserData(null);
          logout();
          setUserInfoError(logoutResponse.message);
          navigate("/inscription");
        } else {
          setUserInfoError(logoutResponse.message);
        }
      } catch (error) {
        setUserInfoError(
          "Une erreur s'est produite, vous n'avez pas été déconnecté...",
        );
        console.log(error);
      }
    };
    fetchLogout();
  };

  return (
    <div className="flex items-center gap-1 lg:pr-2">
      <nav className="flex items-center gap-1  pr-1 lg:gap-3 lg:pr-3 xl:gap-4 xl:pr-4 2xl:hidden">
        {isConnected && (
          <Link to="/dashboard">
            <Button
              variant="ghost"
              size="icon"
              data-slot="icon"
              onClick={onNavClick}
              className={
                pathname === "/dashboard" ||
                pathname === "/generateur" ||
                pathname === "/signature" ||
                pathname === "/chatjuridique" ||
                pathname === "/calculateur" ||
                pathname === "/veille" ||
                pathname === "/conformite"
                  ? " text-gray-800 xl:tracking-wide font-semibold xl:text-[16px] hover:cursor-default"
                  : "text-gray-400 hover:bg-lumenjuris-background"
              }
            >
              <LayoutDashboard className="size-5" />
            </Button>
          </Link>
        )}
        {isConnected && (
          <Link to="/analyzer">
            <Button
              variant="ghost"
              size="icon"
              data-slot="icon"
              className={
                pathname === "/analyzer"
                  ? " text-gray-800 xl:tracking-wide font-semibold xl:text-[16px] hover:cursor-default"
                  : "text-gray-400 hover:bg-lumenjuris-background"
              }
            >
              <FileCheckIcon className="size-5" />
            </Button>
          </Link>
        )}
        {isConnected && (
          <Link to="/mon-compte">
            <Button
              variant="ghost"
              size="icon"
              className={
                pathname === "/mon-compte"
                  ? " text-gray-800 xl:tracking-wide font-semibold xl:text-[16px] hover:cursor-default"
                  : "text-gray-400 hover:bg-lumenjuris-background"
              }
              onClick={onNavClick}
            >
              <User className="size-5" />
            </Button>
          </Link>
        )}
        {isConnected && userData?.role === "ADMIN" && (
          <Link to="/sandbox">
            <Button
              variant="ghost"
              size="icon"
              className={
                pathname === "/sandbox"
                  ? " text-gray-800 xl:tracking-wide font-semibold xl:text-[16px] hover:cursor-default"
                  : "text-gray-400 hover:bg-lumenjuris-background"
              }
              onClick={onNavClick}
            >
              <ScatterChartIcon />
            </Button>
          </Link>
        )}
      </nav>

      <nav className="hidden 2xl:flex items-center gap-1">
        {isConnected && (
          <Link to="/dashboard">
            <Button
              variant="ghost"
              size="lg"
              data-slot="icon"
              onClick={onNavClick}
              className={
                pathname === "/dashboard" ||
                pathname === "/generateur" ||
                pathname === "/signature" ||
                pathname === "/chatjuridique" ||
                pathname === "/calculateur" ||
                pathname === "/veille" ||
                pathname === "/conformite"
                  ? " text-gray-500 xl:tracking-wide font-semibold xl:text-[16px] hover:cursor-default"
                  : "text-gray-400 hover:bg-lumenjuris-background"
              }
            >
              <LayoutDashboard />
              Mon workspace
            </Button>
          </Link>
        )}
        {isConnected && (
          <Link to="/analyzer">
            <Button
              variant="ghost"
              size="lg"
              data-slot="icon"
              className={
                pathname === "/analyzer"
                  ? " text-gray-500 xl:tracking-wide font-semibold xl:text-[16px] hover:cursor-default"
                  : "text-gray-400 hover:bg-lumenjuris-background"
              }
            >
              <FileCheckIcon />
              Analyse
            </Button>
          </Link>
        )}
        {isConnected && (
          <Link to="/mon-compte">
            <Button
              variant="ghost"
              size="lg"
              className={
                pathname === "/mon-compte"
                  ? " text-gray-500 xl:tracking-wide font-semibold xl:text-[16px] hover:cursor-default"
                  : "text-gray-400 hover:bg-lumenjuris-background"
              }
              onClick={onNavClick}
            >
              <User />
              Mon compte
            </Button>
          </Link>
        )}
        {isConnected && userData?.role === "ADMIN" && (
          <Link to="/sandbox">
            <Button
              variant="ghost"
              size="lg"
              className={
                pathname === "/sandbox"
                  ? " text-gray-500 xl:tracking-wide font-semibold xl:text-[16px] hover:cursor-default"
                  : "text-gray-400 hover:bg-lumenjuris-background"
              }
              onClick={onNavClick}
            >
              <ScatterChartIcon />
              Sandbox
            </Button>
          </Link>
        )}
      </nav>

      {isConnected ? (
        <section className="flex items-center gap-3">
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5 text-gray-400" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-green-500" />
          </button>
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                className="h-8 w-8 rounded-full object-cover border border-lumenjuris/60"
              ></img>
            ) : (
              <div className="h-8 w-8 rounded-full bg-lumenjuris flex items-center justify-center text-white text-xs font-medium">
                {userData?.prenom
                  ? `${userData.prenom.slice(0, 1)}${userData.nom.slice(0, 1)}`
                  : `${userData?.nom.slice(0, 1)}`}
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="hidden md:flex items-center gap-1 cursor-pointer text-sm font-medium text-gray-800">
                    {userData?.prenom
                      ? `${userData.prenom} ${userData.nom.slice(0, 1)}.`
                      : `${userData?.nom.slice(0, 12)}.`}
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                }
              />
              <DropdownMenuContent
                sideOffset={12}
                className="min-w-28 bg-lumenjuris-background ring-lumenjuris/60 inline-flex justify-center font-medium text-sm"
              >
                <button
                  onClick={handleUserLogout}
                  className="cursor-pointer inline-flex justify-center items-center gap-1"
                >
                  Logout
                  <LogOutIcon size={14} />
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>
      ) : (
        <nav>
          <Link to="/inscription">
            <Button
              variant="ghost"
              size="lg"
              className={
                pathname === "/inscription"
                  ? " text-gray-500 tracking-wide font-semibold text-[16px] hover:cursor-default"
                  : "text-gray-400 hover:bg-lumenjuris-background"
              }
              onClick={onNavClick}
            >
              <LogInIcon />
              Se connecter
            </Button>
          </Link>
        </nav>
      )}
    </div>
  );
};

export default HeaderNavigationBar;
