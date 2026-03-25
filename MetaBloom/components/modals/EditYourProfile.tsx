import React from "react";
import user from "@/public/images/user.png";
import Image from "next/image";
import InputFieldSecond from "@/components/ui/InputFieldSecond";
import TextArea from "@/components/ui/TextArea";
import { PiCloudArrowUp } from "react-icons/pi";
import SelectDropdown from "@/components/ui/SelectDropdown";
import {
  countryOptions,
  emailPreferenceOptions,
  languageOptions,
} from "@/constants/data";
import SmallButtons from "@/components/ui/buttons/SmallButtons";

function EditProfileModal() {
  return (
    <div className="">
      <div className="flex justify-start items-center pb-6 gap-3">
        <div className="flex justify-center items-center relative border rounded-full border-primaryColor/30 p-1.5">
          <Image src={user} alt="" className="size-11 rounded-full" />
          <label
            htmlFor="photo-upload"
            className="bg-white dark:bg-n0 flex justify-center items-center absolute bottom-1 right-1 rounded-full p-0.5 cursor-pointer"
          >
            <PiCloudArrowUp />
            <input type="file" className="hidden" id="photo-upload" />
          </label>
        </div>
        <div className="">
          <p className="text-sm font-medium">Profile Picture</p>
          <p className="text-xs pt-1 ">
            Choose an avatar or image that represents you
          </p>
        </div>
      </div>

      <div className=" grid grid-cols-12 gap-4">
        <InputFieldSecond
          className="col-span-12 sm:col-span-6"
          placeholder="Theresa"
          title="First Name"
        />
        <InputFieldSecond
          className="col-span-12 sm:col-span-6"
          placeholder="Webb"
          title="Last Name"
        />
        <InputFieldSecond
          className="col-span-12 sm:col-span-6"
          placeholder="demo@mail.com"
          title="Email"
          type="email"
        />
        <InputFieldSecond
          className="col-span-12 sm:col-span-6"
          placeholder="(270) 555-0117"
          title="Mobile"
          type="tel"
        />
        <TextArea
          className="col-span-12"
          placeholder="8502 Preston Rd. Inglewood, Maine 98380"
          title="Address"
        />
        <InputFieldSecond
          className="col-span-12 sm:col-span-6"
          placeholder="Phoenix"
          title="City"
        />
        <InputFieldSecond
          className="col-span-12 sm:col-span-6"
          placeholder="Arizona"
          title="State"
        />
        <InputFieldSecond
          className="col-span-12 sm:col-span-6"
          placeholder="5648"
          title="Postal Code"
          type="number"
        />
        <div className={"col-span-12 sm:col-span-6"}>
          <SelectDropdown
            options={countryOptions}
            placeholder="Choose Country"
            title="Country"
          />
        </div>
        <div className={"col-span-12 sm:col-span-6"}>
          <SelectDropdown
            options={emailPreferenceOptions}
            placeholder="Choose Email Preference"
            title="Email Preference"
          />
        </div>
        <InputFieldSecond
          className="col-span-12 sm:col-span-6"
          placeholder="UI/UX Design"
          title="Designation"
        />
        <div className={"col-span-12"}>
          <SelectDropdown
            options={languageOptions}
            placeholder="Select your preferred language"
            title="Preferred Language"
          />
        </div>
      </div>
      <div className="flex justify-start items-center gap-2 pt-5 text-xs">
        <SmallButtons name="Update Now" />
        <SmallButtons name="Cancel Now" secondary={true} />
      </div>
    </div>
  );
}

export default EditProfileModal;
