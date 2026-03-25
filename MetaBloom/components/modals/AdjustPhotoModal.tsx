import React from "react";
import Image from "next/image";
import adjustPhotoModal from "@/public/images/adjust-photo-modal.png";
import AdjustPhotoRange from "@/components/ui/AdjustPhotoRange";

function AdjustPhotoModal() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className=" max-md:col-span-2 max-md:order-2 ">
        <div className="flex flex-col gap-5 p-5 rounded-xl bg-primaryColor/5 border border-primaryColor/30">
          <AdjustPhotoRange max={100} min={0} title="Exposure" />
          <AdjustPhotoRange max={100} min={0} title="Contrast" />
          <AdjustPhotoRange max={100} min={0} title="White" />
          <AdjustPhotoRange max={100} min={0} title="Blacks" />
        </div>
        <div className="flex flex-col gap-5 p-5 rounded-xl bg-primaryColor/5 border border-primaryColor/30 mt-3">
          <AdjustPhotoRange max={100} min={0} title="Highlights" />
          <AdjustPhotoRange max={100} min={0} title="Shadows" />
          <AdjustPhotoRange max={100} min={0} title="Tint" />
          <AdjustPhotoRange max={100} min={0} title="Temperature" />
        </div>
        <div className="flex justify-start items-center gap-2 pt-8 text-xs w-full">
          <button className="py-2 px-4 rounded-full bg-primaryColor text-white border border-primaryColor flex-1">
            Save Now
          </button>
          <button className="py-2 px-4 rounded-full border border-primaryColor text-primaryColor flex-1">
            Reset Here
          </button>
        </div>
      </div>
      <div className=" max-md:col-span-2 max-md:order-1">
        <Image src={adjustPhotoModal} alt="" />
      </div>
    </div>
  );
}

export default AdjustPhotoModal;
