import React from "react";
import retouchImage from "@/public/images/retouch-image.png";
import Image from "next/image";
import AnimateHeight from "react-animate-height";
import { PiCheck, PiDownload, PiSlidersHorizontal } from "react-icons/pi";
import { useMainModal } from "@/stores/modal";

function BotRetouchImageReply({ show }: { show: boolean }) {
  const { modalOpen } = useMainModal();
  return (
    <AnimateHeight height={show ? "auto" : 0} className=" w-full max-w-[656px]">
      <div className=" mt-5">
        <div className=" relative ">
          <Image src={retouchImage} alt="" className="rounded-xl " />

          <div className="absolute inset-0 flex flex-col justify-between items-end p-2 ">
            <div className="bg-successColor rounded-full p-1 text-white ">
              <PiCheck />
            </div>
            <div className="flex justify-start items-center gap-2">
              <button
                onClick={() => modalOpen("Share Retouch Image")}
                className="p-2 rounded-md bg-white  text-xl dark:bg-n0"
              >
                <PiDownload />
              </button>
              <button
                onClick={() => modalOpen("Adjust Photo")}
                className="p-2 rounded-md bg-successColor text-white text-xl"
              >
                <PiSlidersHorizontal />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AnimateHeight>
  );
}

export default BotRetouchImageReply;
