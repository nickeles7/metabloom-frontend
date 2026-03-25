import React from "react";
import notFoundImg from "@/public/images/not-found.png";
import Image from "next/image";
import GradientBackground from "@/components/ui/GradientBackground";
function NotFound() {
  return (
    <div className="flex flex-col justify-center items-center max-w-[640px] mx-auto py-12">
      <GradientBackground />
      <div>
        <Image src={notFoundImg} alt="" />
      </div>
      <div className="text-center pt-10 sm:pt-15">
        <p className="text-4xl font-semibold">Oops! Page Not Found</p>
        <p className="text-n500 pt-6 max-sm:text-sm dark:text-n30">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
      </div>
    </div>
  );
}

export default NotFound;
