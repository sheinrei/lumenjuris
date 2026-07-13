import { Link } from "react-router-dom";
import { LumenJurisLogo } from "../common/LumenJurisLogo";
import { Outlet } from "react-router-dom";

export function PublicLayout() {

return (
  <div className="min-h-screen flex flex-col bg-slate-50">
    <header className="h-16 px-4 flex items-center justify-between border-b border-line bg-white w-full">
      <Link to="/dashboard" className="flex items-center">
        <LumenJurisLogo variant="light" height={30} />
      </Link>
    </header>

    <main className="flex-1 p-4">
      <Outlet />
    </main>
  </div>
)};
