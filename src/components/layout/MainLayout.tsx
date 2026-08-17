import { Outlet } from "react-router-dom";
import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import StickyCart from "../common/StickyCart";

interface MainLayoutProps {
  children?: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        {children || <Outlet />}
      </main>
      <Footer />
      <StickyCart />
    </div>
  );
}
