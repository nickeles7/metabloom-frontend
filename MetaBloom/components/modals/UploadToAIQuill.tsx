import SmallButtons from "@/components/ui/buttons/SmallButtons";
import InputFieldSecond from "@/components/ui/InputFieldSecond";
import React from "react";
import { PiCloudArrowUp } from "react-icons/pi";

function UploadToAIQuill() {
  return (
    <div className="pt-6">
      <p className="text-sm text-n500">Type of reference video</p>

      <div className="bg-primaryColor/5 border border-dashed border-primaryColor/30  rounded-xl mt-3 p-8 flex justify-center items-center flex-col">
        <PiCloudArrowUp />
        <p className="text-center text-lg font-medium pt-5">
          Choose a file drag & drop it here.
        </p>
        <p className="text-n300 text-sm pt-2">
          JPEG, PNG, PDF, and MP4 formats, up to 50 MB
        </p>
        <div className="pt-5">
          <label htmlFor="upload">
            <p className="text-xs py-2 px-4 border border-primaryColor rounded-full text-primaryColor font-medium">
              Browse File
            </p>
            <input type="file" id="upload" className="hidden" />
          </label>
        </div>
      </div>
      <div className="pt-4">
        <InputFieldSecond
          className=""
          placeholder="https://demo.com"
          title="Or reference url"
        />
      </div>
      <div className="flex justify-start items-center gap-2 pt-5 text-xs">
        <SmallButtons name="Upload Now" />
        <SmallButtons name="Cancel Now" secondary={true} />
      </div>
    </div>
  );
}

export default UploadToAIQuill;
