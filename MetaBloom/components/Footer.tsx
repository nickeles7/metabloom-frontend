import React from "react";
import { useMainModal } from "@/stores/modal";

function Footer() {
  const { modalOpen } = useMainModal();

  return (
    <footer className="w-full">
      <div className="container mx-auto">
        <p className="text-xs text-center pb-3">
          MetaForge can make mistakes. Please double-check the responses.
          {/* <button
            onClick={() => modalOpen("Support Modal", { initialTab: 2 })}
            className="text-primaryColor hover:text-primaryColor/80 underline transition-colors cursor-pointer"
          >
            Click Here
          </button> */}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
