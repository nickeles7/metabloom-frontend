"use client";
import React from "react";
import Image from "next/image";
import { customBotsData } from "@/constants/data";
import { useMainModal } from "@/stores/modal";
function CustomBot() {
  const { modalOpen } = useMainModal();

  return (
    <div className="flex justify-center items-start w-full overflow-auto">
      <div className="flex flex-col justify-center items-center px-6 max-w-[1080px] w-full">
        <div className="text-center">
          <p className="text-2xl font-semibold text-n700 dark:text-n30 ">
            Connect your Account
          </p>
          <p className="pt-2 max-w-[800px]">
            Download hearthy. Hearthy accesses gameplay logs of your matches enabling 
            MetaBloom AI to gather valuable insights into your match data giving you a higher deeper level of personal analysis.
          </p>
        </div>

        <div className="pt-8 grid grid-cols-2 gap-4 sm:gap-6">
          {customBotsData.map(({ id, icon, desc, title, tag, color }) => (
            <div
              key={id}
              className="bg-primaryColor/5 border border-primaryColor/30 p-3 sm:p-5 rounded-lg flex justify-start items-start gap-3 sm:gap-5 cursor-pointer max-sm:col-span-2"
              onClick={() => modalOpen("Custom Bot Details")}
            >
              <div className=" size-14 md:size-20">
                <Image src={icon} alt="" className="" />
              </div>
              <div className=" flex-1 flex justify-start items-start flex-col">
                <p
                  className={`text-xs font-medium py-1 px-2 rounded-md  border `}
                  style={{
                    backgroundColor: `rgba(${color},.05)`,
                    borderColor: `rgba(${color},.30)`,
                    color: `rgba(${color},1)`,
                  }}
                >
                  {tag}
                </p>
                <p className="text-lg font-medium pt-2">{title}</p>
                <p className="text-sm pt-3">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CustomBot;
