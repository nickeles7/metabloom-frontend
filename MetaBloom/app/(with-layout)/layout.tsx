"use client";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MainSidebar from "@/components/MainSidebar";
import SidebarToggle from "@/components/SidebarToggle";
import MainModal from "@/components/modals/MainModal";
import GradientBackground from "@/components/ui/GradientBackground";

//import Banner from "@/components/ui/Banner";
import { useChatHandler } from "@/stores/chatList";
import { useAuth } from "@/stores/auth";
import { useMainModal } from "@/stores/modal";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { StreamingProvider } from "@/contexts/StreamingContext";


function Layout({ children }: { children: React.ReactNode }) {
  const [showSidebar, setShowSidebar] = useState(false);
  const { updateChatList } = useChatHandler();
  const { isAuthenticated } = useAuth();
  const { modalOpen } = useMainModal();
  const pathname = usePathname();

  useEffect(() => {
    updateChatList();
  }, []);

  // Reset sidebar state when authentication status changes
  useEffect(() => {
    if (!isAuthenticated) {
      setShowSidebar(false);
    }
  }, [isAuthenticated]);

  // Check if current page should hide sidebar
  const shouldHideSidebar = pathname === '/upgrade-plan' || pathname === '/affiliate';
  // Check if current page should allow scrolling
  const shouldAllowScrolling = pathname === '/affiliate';

  return (
    <div
      className={`text-n500 bg-white relative z-10 ${shouldAllowScrolling ? 'min-h-screen' : 'h-screen overflow-hidden'} dark:bg-n0 dark:text-n30 ${
        isAuthenticated && !shouldHideSidebar && showSidebar ? 'sidebar-open' : ''
      }`}
      style={{
        '--sidebar-width': showSidebar ? '290px' : '0px'
      } as React.CSSProperties}
    >
      <GradientBackground />
      <div className={`flex justify-start items-start ${shouldAllowScrolling ? 'min-h-full' : 'h-full'}`}>
        {/* Only render sidebar when user is authenticated and not on upgrade plan page */}
        {isAuthenticated && !shouldHideSidebar && (
          <MainSidebar
            showSidebar={showSidebar}
            setShowSidebar={setShowSidebar}
          />
        )}
        <div className={`flex-1 flex flex-col ${shouldAllowScrolling ? 'min-h-screen' : 'h-full'} pb-3 ${shouldAllowScrolling ? '' : 'overflow-hidden'}`}>
          <div className="w-full flex flex-col flex-shrink-0">
            <Header showSidebar={showSidebar} setShowSidebar={setShowSidebar} />

            {/* Only show banner when user is not authenticated */}
            {!isAuthenticated && (
              <div className="w-full" style={{ marginTop: '0', padding: '0' }}>
              </div>
            )}
          </div>
          <div className={`flex-1 flex flex-col ${shouldAllowScrolling ? '' : 'overflow-hidden'} justify-end`}>
            <StreamingProvider>
              {children}
            </StreamingProvider>
          </div>
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>



      {/* Fixed Sidebar Toggle - Only show when authenticated and not on upgrade plan */}
      {isAuthenticated && !shouldHideSidebar && (
        <SidebarToggle
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
        />
      )}

      {/* Modal */}
      <MainModal />


    </div>
  );
}

export default Layout;
