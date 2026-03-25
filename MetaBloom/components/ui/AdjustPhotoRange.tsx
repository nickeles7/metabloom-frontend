import React, { useState } from "react";
import { Range } from "react-range";

type AdjustPhotoRangeProps = {
  min: number;
  max: number;
  title: string;
};

function AdjustPhotoRange({ min, max, title }: AdjustPhotoRangeProps) {
  const [values, setValues] = useState([50]);
  return (
    <div className="">
      <div className="flex justify-between items-center text-xs pb-3">
        <p className="font-medium">{title}</p>
        <p>{values}</p>
      </div>

      <Range
        label="Select your value"
        step={1}
        min={min}
        max={max}
        values={values}
        onChange={(values) => setValues(values)}
        renderTrack={({ props, children }) => (
          <div
            {...props}
            style={{
              ...props.style,
            }}
            className="h-1.5 w-full bg-primaryColor/30 rounded-full"
          >
            {children}
          </div>
        )}
        renderThumb={({ props }) => (
          <div
            {...props}
            key={props.key}
            style={{
              ...props.style,
            }}
            className="flex justify-center items-center size-5 bg-white rounded-full dark:bg-lightN30"
          >
            <div className=" size-3.5 bg-primaryColor rounded-full"></div>
          </div>
        )}
      />
    </div>
  );
}

export default AdjustPhotoRange;
