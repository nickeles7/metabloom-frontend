"use client";
import React, { useState } from "react";
import { PiMagnifyingGlass } from "react-icons/pi";
import Image from "next/image";
import { exploreBotTags, explorePageData } from "@/constants/data";
import { useMainModal } from "@/stores/modal";
import Link from "next/link";

function Explore() {
  const [activeTag, setActiveTag] = useState(0);
  const { modalOpen } = useMainModal();
  return (
    <div className="w-full overflow-auto flex justify-center items-start ">
      <div className="flex flex-col justify-center items-center px-6 max-w-[1080px] w-full">
        <div className="text-center">
          <p className="text-2xl font-semibold text-n700 dark:text-n30 ">
            Explore AIQuill
          </p>
          <p className="pt-2 max-w-[600px]">
            Discover and create custom versions of AIQuill that combine
            instructions, extra knowledge, and any combination of skills.
          </p>
        </div>
        <div className="mt-10 flex justify-between items-center gap-2 py-1 sm:py-2 pr-2 pl-5 rounded-xl bg-primaryColor/5 border border-primaryColor/30 w-full">
          <div className=" flex justify-start items-center gap-2 w-full">
            <PiMagnifyingGlass className="text-n100 text-2xl" />
            <input
              placeholder="Search here..."
              className=" placeholder:text-n100 bg-transparent outline-none w-full max-sm:text-sm"
            />
          </div>
          <button className="text-sm text-n100 bg-white py-2 sm:py-3.5 px-2 rounded-md text-nowrap dark:bg-n0 dark:text-n30">
            ⌘ K
          </button>
        </div>
        <ul className="flex justify-center items-center rounded-xl p-2 gap-2 bg-primaryColor/5 border border-primaryColor/30 mt-6 flex-wrap">
          {exploreBotTags.map((tag, idx) => (
            <li key={idx} onClick={() => setActiveTag(idx)}>
              <Link
                href={`#section-${idx}`}
                className={`text-xs sm:text-sm font-medium  py-1 sm:py-3 px-2 sm:px-5 border border-primaryColor/30 rounded-lg cursor-pointer hover:bg-primaryColor hover:text-white ${
                  activeTag === idx
                    ? " bg-primaryColor text-white"
                    : "bg-white dark:bg-n0 text-n700 dark:text-n30"
                } duration-300 text-nowrap block`}
              >
                {tag}
              </Link>
            </li>
          ))}
        </ul>
        <div className="pt-6 lg:pt-8 xl:pt-15 flex flex-col gap-6 lg:gap-8 xl:gap-[60px]">
          {explorePageData.map(({ id, title, desc, articles }, idx) => (
            <div key={id} className="" id={`section-${idx}`}>
              <div className="flex flex-col justify-center items-center text-center gap-3">
                <p className="text-xl text-n700 font-semibold dark:text-n30">
                  {title}
                </p>
                <p>{desc}</p>
              </div>
              <div className="pt-8 grid grid-cols-2 gap-3 sm:gap-6">
                {articles.map(({ id, title, desc, icon }, index) => (
                  <div
                    key={id}
                    className={` max-md:col-span-2 max-lg:col-span-1 max-xl:col-span-2 border  p-3 sm:p-5 rounded-lg flex justify-start items-start gap-5 ${
                      idx === 0
                        ? "bg-primaryColor/5 border-primaryColor/30"
                        : " border-transparent hover:bg-primaryColor/5 hover:border-primaryColor/30"
                    } duration-300 cursor-pointer`}
                    onClick={() => modalOpen("Bot Details Modal")}
                  >
                    <div className="flex justify-center items-center gap-3 sm:gap-5">
                      {idx !== 0 && (
                        <p className=" text-xl lg:text-2xl font-medium">
                          {index + 1}
                        </p>
                      )}
                      <div className=" size-16 sm:size-20">
                        <Image src={icon} alt="" className="" />
                      </div>
                    </div>
                    <div className=" flex-1">
                      <p className="text-lg font-medium">{title}</p>
                      <p className="text-sm pt-3">{desc}</p>
                      <p className="text-xs text-n700 pt-4 dark:text-n30">
                        By demo.com
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-full pt-8">
                <button className="border border-primaryColor rounded-full py-3 px-6 text-center text-primaryColor text-sm font-medium w-full">
                  See More
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Explore;
