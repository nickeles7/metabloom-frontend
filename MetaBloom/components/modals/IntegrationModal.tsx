import SmallButtons from "@/components/ui/buttons/SmallButtons";
import ToggleButton from "@/components/ui/ToggleButton";
import { integrationItemsData } from "@/constants/data";
import Image from "next/image";
import React from "react";
import { PiMagnifyingGlass } from "react-icons/pi";

function IntegrationModal() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center gap-4 border dark:border-lightN30 rounded-xl py-3 px-5">
        <input
          type="text"
          placeholder="Search..."
          className=" outline-none bg-transparent flex-1 text-sm"
        />
        <PiMagnifyingGlass className="text-2xl text-n100" />
      </div>
      <div className="flex flex-col gap-3">
        {integrationItemsData.map(({ id, name, desc, icon }) => (
          <div
            key={id}
            className="flex justify-between items-center p-4 rounded-xl hover:bg-primaryColor/5 hover:border-primaryColor/30 border border-transparent duration-500  "
          >
            <div className="flex justify-start items-center gap-4">
              <div className="">
                <Image src={icon} alt="" />
              </div>
              <div className=" ">
                <p className="text-n700 font-medium text-sm dark:text-n30">
                  {name}
                </p>
                <p className="pt-2 text-xs">{desc}</p>
              </div>
            </div>
            <div className="">
              <ToggleButton />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-start items-center gap-2 text-xs">
        <SmallButtons name="Save Changes" />
        <SmallButtons name="Reset Here" secondary={true} />
      </div>
    </div>
  );
}

export default IntegrationModal;
