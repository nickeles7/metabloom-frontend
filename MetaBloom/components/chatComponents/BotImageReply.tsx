import React from "react";
import AnimateHeight from "react-animate-height";
import img1 from "@/public/images/generate-photo-1.png";
import img2 from "@/public/images/generate-photo-2.png";
import img3 from "@/public/images/generate-photo-3.png";
import img4 from "@/public/images/generate-photo-4.png";
import Image from "next/image";
import { PiCheck, PiDownloadSimple } from "react-icons/pi";
import { useMainModal } from "@/stores/modal";

const images = [img1, img2, img3, img4];

function BotImageReply({ show }: { show: boolean }) {
  const { modalOpen } = useMainModal();
  return (
    <AnimateHeight height={show ? "auto" : 0} className=" w-full max-w-[656px]">
      <div className="grid grid-cols-2 gap-4 mt-5">
        {images.map((item, idx) => (
          <div key={idx} className=" relative ">
            <Image src={item} alt="" className="rounded-xl " />

            <div className="absolute inset-0 flex flex-col justify-between items-end p-2 ">
              <div className="bg-successColor rounded-full p-1 text-white ">
                <PiCheck />
              </div>
              <button
                onClick={() => modalOpen("Share Image")}
                className="p-2 rounded-md bg-white dark:bg-n0"
              >
                <PiDownloadSimple />
              </button>
            </div>
          </div>
        ))}
      </div>
    </AnimateHeight>
  );
}

export default BotImageReply;
