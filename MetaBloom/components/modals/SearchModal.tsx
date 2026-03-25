import { useChatHandler } from "@/stores/chatList";
import Link from "next/link";
import React from "react";
import { PiAlignLeft } from "react-icons/pi";

export default function SearchModal() {
  const { chatList } = useChatHandler();
  return (
    <div>
      <div className="border border-primaryColor/20 rounded-lg bg-white">
        <input
          type="text"
          placeholder="Search here..."
          className=" outline-none p-3 bg-transparent text-sm"
        />
      </div>
      <div className="pt-3">
        <div className="flex flex-col gap-1 justify-start items-start w-full max-h-[300px] overflow-auto ">
          {chatList.map(({ id, title }) => (
            <div
              className="flex justify-between items-center gap-2 hover:text-primaryColor hover:bg-primaryColor/10 rounded-xl duration-500 py-3  relative w-full"
              key={id}
            >
              <Link
                href={`/chat/${id}`}
                className="flex justify-center items-center gap-2 px-3  "
              >
                <PiAlignLeft size={20} className="text-primaryColor" />
                <span className="text-sm ">
                  {title.split("").slice(0, 20).join("")}
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
