"use client";
import { aiGeneratorBrainstorm, aiGeneratorOptions } from "@/constants/data";
import React, { useState } from "react";
import { PiArrowRight, PiInfo } from "react-icons/pi";
import { useMainModal } from "@/stores/modal";
import ChatBox from "@/components/ChatBox";

function AiGenerator() {
  const [activeBrainStorm, setActiveBrainStorm] = useState(0);
  const { modalOpen } = useMainModal();
  return (
    <div className="  h-full flex-1 overflow-auto w-full z-20 flex justify-center items-center">
      <div className=" max-w-[1032px] w-full">
        <div className="flex flex-col justify-center items-center px-6 mb-10">
          <div className="text-center">
            <p className="text-2xl font-semibold text-n700 dark:text-n30 ">
              Harness the Power of AI
            </p>
            <p className="pt-2">
              Discover the core of our AI chat app that&apos;s transforming the
              way we communicate
            </p>
          </div>
          <div className="pt-10 flex justify-start items-start w-full max-w-[1080px] flex-col ">
            <div className="flex justify-between items-center w-full pb-3">
              <p className="text-sm ">AI Generator Brainstorm</p>
              <PiInfo />
            </div>
            <div className="p-2 border border-primaryColor/30 bg-primaryColor/5 rounded-xl min-[1400px]:rounded-full flex flex-row justify-centert items-center flex-wrap gap-2 w-full ">
              {aiGeneratorBrainstorm.map(({ id, name, icon }, idx) => (
                <div
                  key={id}
                  onClick={() => setActiveBrainStorm(idx)}
                  className={`flex justify-start items-center gap-2 xl:gap-2 py-2 pl-2 flex-1  border  rounded-full cursor-pointer ${
                    activeBrainStorm === idx
                      ? " border-primaryColor bg-primaryColor text-white"
                      : "border-primaryColor/30 bg-white dark:bg-n0"
                  }`}
                >
                  <div
                    className={`flex justify-center items-center border  rounded-full p-1.5 xl:p-2 text-primaryColor text-base xl:text-xl ${
                      activeBrainStorm === idx
                        ? "border-white bg-white "
                        : "border-primaryColor/30"
                    } `}
                  >
                    {React.createElement(icon)}
                  </div>
                  <p className="text-sm font-medium text-nowrap pr-4">{name}</p>
                </div>
              ))}
            </div>

            <div className=" grid grid-cols-12 gap-3 pt-6 w-full">
              {aiGeneratorOptions.map(({ id, name, icon, color }) => (
                <div
                  key={id}
                  className="flex justify-between items-center  border  rounded-xl p-2 sm:py-3 sm:pl-3 sm:pr-6 w-full group duration-300 col-span-6 md:col-span-4 hover:!border-primaryColor "
                  style={{
                    borderColor: `rgba(${color},.30)`,
                    backgroundColor: `rgba(${color},.05)`,
                  }}
                  onClick={() => modalOpen("Upload To Bot Ai")}
                >
                  <div className="flex justify-start items-center gap-3 sm:gap-5">
                    <div
                      className="flex justify-center items-center text-base sm:text-2xl md:text-[32px] text-white p-1.5  sm:p-2 md:p-3 rounded-lg"
                      style={{
                        backgroundColor: `rgb(${color})`,
                      }}
                    >
                      {React.createElement(icon)}
                    </div>
                    <p className=" max-[350px]:text-xs max-sm:text-sm font-semibold text-n700 dark:text-n30">
                      {name}
                    </p>
                  </div>
                  <div
                    className=" max-xl:hidden  text-2xl -translate-x-2 group-hover:translate-x-0 duration-300 opacity-0 group-hover:opacity-100"
                    style={{
                      color: `rgba(${color},1)`,
                    }}
                  >
                    <PiArrowRight />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ChatBox />
      </div>
    </div>
  );
}

export default AiGenerator;
