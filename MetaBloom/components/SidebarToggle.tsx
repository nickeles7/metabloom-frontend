"use client";
import React from "react";
import { PiList, PiArrowUUpLeft } from "react-icons/pi";
import Image from "next/image";
import Link from "next/link";
import logo from "@/public/images/MetaBloom logo.png";

type SidebarToggleProps = {
  showSidebar: boolean;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
};

function SidebarToggle({ showSidebar, setShowSidebar }: SidebarToggleProps) {
  return (
    <div className="fixed left-6 z-50 flex items-center gap-2" style={{
      top: '18px', // Align with header content center (12px header padding + 6px to center with profile icon)
      transform: 'translateZ(0)', // Force hardware acceleration
    }}>
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="bg-white dark:bg-n0 p-2 rounded-full flex justify-center items-center border border-primaryColor/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
      >
        {showSidebar ? (
          <PiArrowUUpLeft className="text-lg text-n700 dark:text-n30" />
        ) : (
          <PiList className="text-lg text-n700 dark:text-n30" />
        )}
      </button>

      {/* Show logo next to toggle button when sidebar is closed */}
      {!showSidebar && (
        <Link href="/new-chat" className="flex justify-start items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity bg-white dark:bg-n0 px-2 py-1 rounded-full border border-primaryColor/20 shadow-lg">
          <Image src={logo} alt="MetaBloom Logo" width={20} height={20} />
          <span className="text-sm font-semibold text-n700 dark:text-n30">
            MetaBloom
          </span>
        </Link>
      )}
    </div>
  );
}

export default SidebarToggle;
