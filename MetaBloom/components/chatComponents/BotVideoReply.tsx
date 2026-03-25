import Image from "next/image";
import React from "react";
import AnimateHeight from "react-animate-height";
import { PiCheck, PiDownloadSimple, PiPlayFill } from "react-icons/pi";
import videoPreviewImg from "@/public/images/video-preview-img.png";
import { useMainModal } from "@/stores/modal";

function BotVideoReply({ show }: { show: boolean }) {
  const { modalOpen } = useMainModal();
  return (
    <AnimateHeight height={show ? "auto" : 0}>
      <div className="flex justify-start mt-5">
        <div
          className=" rounded-xl overflow-hidden relative cursor-pointer"
          onClick={() => modalOpen("Share Video")}
        >
          <div className="bg-black/30 absolute inset-0 p-3 flex flex-col justify-between items-center">
            <div className="flex justify-end w-full">
              <div className="bg-successColor rounded-full p-1 text-white">
                <PiCheck />
              </div>
            </div>
            <div className="bg-errorColor rounded-full p-3 text-white flex justify-center items-center">
              <PiPlayFill className="text-2xl" />
            </div>
            <div className="flex justify-end items-center gap-2 w-full ">
              <div className="p-2 rounded-md bg-white font-medium dark:bg-n0">
                <p className="text-sm">20:05</p>
              </div>
              <div className="p-2 rounded-md bg-white dark:bg-n0">
                <PiDownloadSimple className="text-xl" />
              </div>
            </div>
          </div>
          <Image src={videoPreviewImg} alt="" />
        </div>
      </div>
    </AnimateHeight>
  );
}

export default BotVideoReply;
